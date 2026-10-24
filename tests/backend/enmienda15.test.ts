// Enmienda 15 (docs/contrato-enmienda-15-borrador.md): ronda de opiniones con plazo (E-c, 0052). Contra la base
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
    // Mientras el organizador no aceptó, "te toca confirmar" va primero (E13); después, el texto de rearmar.
    await ok(O, 'accept_version', { p_propuesta_id: p, p_version: 1, p_intento_id: intento() })
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
    // Ajuste 1: con la ronda abierta, ni antes ni después de aceptar se invita a rearmar.
    expect(acc.propuesta.siguiente_accion.texto).not.toBe(REARMAR)
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

describe('enmienda 15 (E-d): dos planes con etiqueta y la que más Sí', { timeout: 180_000 }, () => {
  let O: Sesion // Tomi
  let U: Sesion
  let V: Sesion
  let demo: Json
  let ids: Record<string, string>
  const NO_A = { A: 'no', B: 'si' }

  const crear = (extra: Record<string, unknown>, franjas: Json = FRANJAS) =>
    rpc(O, 'create_proposal', {
      p_espacio_id: demo.espacioId, p_titulo: 't-e15d', p_franjas: franjas, p_minimo: 3, p_maximo: 6,
      p_imprescindible_id: demo.miembroId, p_plazo: PLAZO, p_zona_horaria: 'America/Santiago', p_intento_id: intento(), ...extra,
    })
  const cond = (s: Sesion, p: string, d: Json) => rpc(s, 'save_my_conditions', { p_propuesta_id: p, p_disponibilidad: d })
  const sim = (p: string, nombre: string, d: Json) =>
    ok(O, 'simulate_save_conditions', { p_propuesta_id: p, p_miembro_id: ids[nombre], p_disponibilidad: d })
  /** Crea, abre, carga condiciones (O siempre en las dos) y publica; devuelve la franja ganadora y el estado. */
  const caso = async (regla: string | null, reales: Json[], simulados: Record<string, Json>) => {
    const r = await crear(regla ? { p_regla: regla } : {})
    expect(r.ok, JSON.stringify(r.error)).toBe(true)
    const p = r.resultado.propuesta_id as string
    await ok(O, 'open_proposal', { p_propuesta_id: p })
    await ok(O, 'save_my_conditions', { p_propuesta_id: p, p_disponibilidad: SI })
    await ok(U, 'save_my_conditions', { p_propuesta_id: p, p_disponibilidad: reales[0] })
    await ok(V, 'save_my_conditions', { p_propuesta_id: p, p_disponibilidad: reales[1] })
    for (const [n, d] of Object.entries(simulados)) await sim(p, n, d)
    const ev = await ok(O, 'evaluate_and_publish', { p_propuesta_id: p, p_intento_id: intento() })
    return { p, clave: ev.propuesta.opcion.franja.clave as string, st: ev.propuesta }
  }

  beforeAll(async () => {
    ;[O, U, V] = await Promise.all([nuevaSesion(), nuevaSesion(), nuevaSesion()])
    demo = await demoPrueba(O)
    await ok(U, 'join_space', { p_codigo: demo.codigo, p_nombre_visible: 'Uno e15d' })
    await ok(V, 'join_space', { p_codigo: demo.codigo, p_nombre_visible: 'Dos e15d' })
    ids = Object.fromEntries((await ok(O, 'get_space', { p_espacio_id: demo.espacioId })).espacio.miembros.map((m: Json) => [m.nombre, m.miembro_id]))
  }, 60_000)

  it('5. etiquetas y preferencia: forma, privacidad de la propia y disponibilidad que sigue siendo {A, B}', async () => {
    const larga = 'x'.repeat(41)
    expect(err(await crear({}, [{ ...FRANJAS[0], etiqueta: larga }, FRANJAS[1]]))).toBe('entrada_incompleta/formato_invalido')
    expect(err(await crear({}, [{ ...FRANJAS[0], etiqueta: 7 }, FRANJAS[1]]))).toBe('entrada_incompleta/formato_invalido')
    const r = await crear({ p_regla: 'mas_si' }, [{ ...FRANJAS[0], etiqueta: '  Asado en lo de Tomi  ' }, { ...FRANJAS[1], etiqueta: '   ' }])
    expect(r.ok).toBe(true)
    expect(r.propuesta.regla).toBe('mas_si')
    expect(r.propuesta.franjas.map((f: Json) => f.etiqueta)).toEqual(['Asado en lo de Tomi', null])
    const p = r.resultado.propuesta_id
    await ok(O, 'open_proposal', { p_propuesta_id: p })
    expect(err(await cond(U, p, { A: 'si', B: 'si', prefiero: 'C' }))).toBe('entrada_incompleta/disponibilidad_invalida')
    expect(err(await cond(U, p, { A: 'si', B: 'si', otra: 'si' }))).toBe('entrada_incompleta/disponibilidad_invalida')
    const g = await cond(U, p, { A: 'si', B: 'si', prefiero: 'B' })
    expect(g.condiciones).toMatchObject({ disponibilidad: { A: 'si', B: 'si' }, prefiero: 'B', estado: 'completas' })
    expect(Object.keys(g.condiciones.disponibilidad).sort()).toEqual(['A', 'B'])
    const mias = await ok(U, 'get_my_conditions', { p_propuesta_id: p })
    expect(mias.condiciones).toMatchObject({ disponibilidad: { A: 'si', B: 'si' }, prefiero: 'B' })
    // Sin regla nueva ni etiquetas: igual que hoy.
    const viejo = await crear({})
    expect(viejo.propuesta).toMatchObject({ regla: 'temprana', planes_totales: null })
    expect(viejo.propuesta.franjas.map((f: Json) => f.etiqueta)).toEqual([null, null])
  })

  it('6. mas_si: gana la de más Sí; empate por preferencia; empate total, la más temprana; temprana no cambia', async () => {
    // A: Tomi, Uno, Dos, Luna (4). B: Tomi, Uno, Dos, Luna, Mati (5).
    const masSi = await caso('mas_si', [SI, SI], { Luna: SI, Mati: NO_A })
    expect(masSi.clave).toBe('B')
    expect(masSi.st.opcion.franja).toHaveProperty('etiqueta', null)
    expect((await caso(null, [SI, SI], { Luna: SI, Mati: NO_A })).clave).toBe('A')
    // Empate 4/4; Uno y Dos prefieren B, Luna prefiere A.
    const pref = await caso('mas_si', [{ ...SI, prefiero: 'B' }, { ...SI, prefiero: 'B' }], { Luna: { ...SI, prefiero: 'A' } })
    expect(pref.clave).toBe('B')
    // Empate total: la más temprana.
    expect((await caso('mas_si', [SI, SI], { Luna: SI })).clave).toBe('A')
    // La preferencia de quien no puede en las dos no cuenta: A = Tomi, Uno, Dos, Luna; B = Tomi, Uno, Dos, Mati (4/4);
    // Mati (solo B) prefiere B: no desempata, gana la más temprana.
    expect((await caso('mas_si', [SI, SI], { Luna: { A: 'si', B: 'no' }, Mati: { ...NO_A, prefiero: 'B' } })).clave).toBe('A')
  })

  it('7. totales por plan: solo el organizador, sin contarlo, null con menos de 2; nunca prefiero ajeno', async () => {
    const { p } = await caso('mas_si', [{ ...SI, prefiero: 'B' }, { ...SI, prefiero: 'B' }], { Luna: { ...SI, prefiero: 'A' }, Mati: NO_A })
    const deO = (await ok(O, 'get_proposal_state', { p_propuesta_id: p })).propuesta
    // Los demás: A = Uno, Dos, Luna (3); B = Uno, Dos, Luna, Mati (4). Prefieren B: 2; A: 1 → null.
    expect(deO.planes_totales).toEqual({ A: { si: 3, prefieren: null }, B: { si: 4, prefieren: 2 } })
    for (const s of [U, V]) {
      const st = await ok(s, 'get_proposal_state', { p_propuesta_id: p })
      expect(st.propuesta.planes_totales).toBeNull()
      expect(JSON.stringify(st)).not.toContain('prefiero')
      const lista = await ok(s, 'list_proposals', { p_espacio_id: demo.espacioId })
      expect(JSON.stringify(lista)).not.toContain('prefiero')
      expect(JSON.stringify(lista)).not.toContain('planes_totales')
    }
    expect(JSON.stringify(await ok(O, 'get_proposal_state', { p_propuesta_id: p }))).not.toContain('prefiero')
  })
})
