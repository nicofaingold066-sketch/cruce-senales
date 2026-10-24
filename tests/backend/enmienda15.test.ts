// Enmienda 15 (docs/contrato-enmienda-15-borrador.md): ronda de opiniones con plazo (E-c, 0051). Contra la base
// real, datos ficticios: demo propio de una sesión (Tomi organiza y es el imprescindible) y dos personas reales que
// se unen con nombres nuevos. El cierre de una ronda (2 h como mínimo) no se puede esperar en la suite: se verifica a
// mano sobre una propuesta de prueba propia (ver la sección Implementación de la enmienda).
import { beforeAll, describe, expect, it } from 'vitest'
import { demoPrueba, err, FRANJAS, intento, nuevaSesion, ok, PLAZO, rpc, type Json, type Sesion } from './helpers'

const SI = { A: 'si', B: 'si' }
const REARMAR = 'Algunos no pueden así: puedes rearmar con lo nuevo.'

describe('enmienda 15 (E-c): ronda de opiniones con plazo', { timeout: 180_000 }, () => {
  let O: Sesion // Tomi
  let U: Sesion // Uno t
  let V: Sesion // Dos t
  let demo: Json

  const estado = async (s: Sesion, prop: string) => (await ok(s, 'get_proposal_state', { p_propuesta_id: prop })).propuesta
  const opinar = (s: Sesion, prop: string, version: number, opinion = 'asi_no_puedo') =>
    rpc(s, 'opinar_version', { p_propuesta_id: prop, p_version: version, p_opinion: opinion, p_intento_id: intento() })
  const crear = (extra: Record<string, unknown>, plazo = PLAZO, i = intento()) =>
    rpc(O, 'create_proposal', {
      p_espacio_id: demo.espacioId, p_titulo: 't-e15', p_franjas: FRANJAS, p_minimo: 3, p_maximo: 6,
      p_imprescindible_id: demo.miembroId, p_plazo: plazo, p_zona_horaria: 'America/Santiago', p_intento_id: i, ...extra,
    })
  /** Propuesta con O, U y V en Sí en las dos franjas, publicada (v1 en A, mínimo 3). */
  const publicada = async (extra: Record<string, unknown>, plazo = PLAZO) => {
    const r = await crear(extra, plazo)
    expect(r.ok, JSON.stringify(r.error)).toBe(true)
    const p = r.resultado.propuesta_id as string
    await ok(O, 'open_proposal', { p_propuesta_id: p })
    for (const s of [O, U, V]) await ok(s, 'save_my_conditions', { p_propuesta_id: p, p_disponibilidad: SI })
    const ev = await ok(O, 'evaluate_and_publish', { p_propuesta_id: p, p_intento_id: intento() })
    expect(ev.resultado.tipo).toBe('opcion_publicada')
    return { p, ev }
  }
  /** Hora de pared del servidor más `ms`, en el formato de los plazos ("YYYY-MM-DDTHH:MM"). */
  const relojMas = async (ms: number) => {
    const local = new Date(`${(await ok(O, 'server_info')).servidor_ahora.local}Z`)
    return new Date(local.getTime() + ms).toISOString().slice(0, 16)
  }

  beforeAll(async () => {
    ;[O, U, V] = await Promise.all([nuevaSesion(), nuevaSesion(), nuevaSesion()])
    demo = await demoPrueba(O)
    await ok(U, 'join_space', { p_codigo: demo.codigo, p_nombre_visible: 'Uno e15' })
    await ok(V, 'join_space', { p_codigo: demo.codigo, p_nombre_visible: 'Dos e15' })
  }, 60_000)

  it('1. sin los parámetros nuevos, todo como hoy: ronda null, regla temprana, rearmar como E13', async () => {
    const { p, ev } = await publicada({})
    expect(ev.propuesta).toMatchObject({ ronda: null, regla: 'temprana' })
    expect(ev.propuesta.opcion.franja.clave).toBe('A')
    expect((await opinar(U, p, 1)).ok).toBe(true)
    expect((await opinar(V, p, 1)).ok).toBe(true)
    const st = await estado(O, p)
    expect(st.mi_situacion.puede.proponer_reparacion).toBe(true)
    expect(st.siguiente_accion.texto).toBe(REARMAR)
    // Otra sesión ve lo mismo sobre la ronda (es pública) y nada de opiniones.
    expect(await estado(U, p)).toMatchObject({ ronda: null, regla: 'temprana', opiniones_totales: null })
  })

  it('2. forma: horas y regla fuera de la lista se rechazan; el intento guarda la ronda', async () => {
    expect(err(await crear({ p_ronda_horas: 5 }))).toBe('entrada_incompleta/formato_invalido')
    expect(err(await crear({ p_ronda_horas: 0 }))).toBe('entrada_incompleta/formato_invalido')
    expect(err(await crear({ p_regla: 'x' }))).toBe('entrada_incompleta/formato_invalido')
    const i = intento()
    expect((await crear({ p_ronda_horas: 2, p_regla: 'temprana' }, PLAZO, i)).ok).toBe(true)
    expect((await crear({ p_ronda_horas: 2, p_regla: 'temprana' }, PLAZO, i)).resultado.repetido).toBe(true)
    expect(err(await crear({ p_ronda_horas: 12, p_regla: 'temprana' }, PLAZO, i))).toBe('entrada_incompleta/intento_reutilizado')
  })

  it('3. ronda abierta: el servidor fija el cierre; se opina y se acepta, pero no se rearma', async () => {
    const { p, ev } = await publicada({ p_ronda_horas: 2 })
    const r = ev.propuesta.ronda
    expect(r).toMatchObject({ horas: 2, abierta: true })
    const ahora = new Date(ev.servidor_ahora.utc).getTime()
    const falta = new Date(r.cierra.utc).getTime() - ahora
    expect(falta).toBeGreaterThan(110 * 60_000)
    expect(falta).toBeLessThanOrEqual(120 * 60_000)

    expect((await opinar(U, p, 1)).ok).toBe(true)
    expect((await opinar(V, p, 1)).ok).toBe(true)
    const st = await estado(O, p)
    expect(st.opiniones_totales).toEqual({ asi_no_puedo: 2 })
    expect(st.mi_situacion.puede.proponer_reparacion).toBe(false)
    expect(st.siguiente_accion.texto).not.toBe(REARMAR)
    const rep = await rpc(O, 'propose_repair', { p_propuesta_id: p, p_intento_id: intento() })
    expect(err(rep)).toBe('opcion_desactualizada/ronda_abierta')
    expect(rep.error.mensaje).toBe('La ronda de opiniones sigue abierta. Cuando cierre vas a poder rearmar con lo nuevo.')
    // La versión sigue igual y aceptar no se bloquea.
    const acc = await ok(O, 'accept_version', { p_propuesta_id: p, p_version: 1, p_intento_id: intento() })
    expect(acc.propuesta.opcion.version).toBe(1)
    // Los demás ven la ronda (es pública) y la regla, pero no las opiniones.
    const deU = await estado(U, p)
    expect(deU.ronda).toEqual(r)
    expect(deU.opiniones_totales).toBeNull()
    expect(deU.mi_situacion.puede.opinar).toBe(true) // con la ronda abierta sigue pudiendo opinar o retirar la opinión
  })

  it('4. ronda que no cabe antes del cierre de aceptación: esa versión queda sin ronda y se rearma como hoy', async () => {
    const plazo = await relojMas(60 * 60_000) // cierre en 1 h, ronda de 2 h
    const { p, ev } = await publicada({ p_ronda_horas: 2 }, plazo)
    expect(ev.propuesta.ronda).toBeNull()
    expect((await opinar(U, p, 1)).ok).toBe(true)
    expect((await opinar(V, p, 1)).ok).toBe(true)
    expect((await estado(O, p)).mi_situacion.puede.proponer_reparacion).toBe(true)
  })
})
