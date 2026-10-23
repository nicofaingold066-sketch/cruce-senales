// Mejora #17: convierte docs/jurado-variantes.md en regresiones contra RPC reales.
// Helpers existentes, sin editar tests/backend/ ni instalar nada. No prueba la UI.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { CODIGOS_SIGUIENTE, intento, nuevaSesion, rpc, type Json, type Sesion } from '../backend/helpers'

describe('variantes del jurado · datos ficticios · dos sesiones propias', () => {
  let T: Sesion
  let L: Sesion
  let espacio: Json
  let ids: Record<string, string>
  const propuestas: string[] = []
  let llamadas = 0

  function sinPrivados(v: unknown, ruta = 'respuesta') {
    if (typeof v === 'string') {
      expect([T.userId, L.userId].includes(v), `${ruta}: Auth id expuesto`).toBe(false)
    } else if (v && typeof v === 'object') {
      for (const [k, x] of Object.entries(v)) {
        if (k === 'condiciones' && ruta.endsWith('.mi_situacion')) {
          expect(['sin_cargar', 'incompletas', 'completas']).toContain(x)
          continue
        }
        expect(['disponibilidad', 'condiciones', 'preferencias', 'elegibles', 'user_id', 'p_intento_id',
          'access_token', 'refresh_token'].includes(k), `${ruta}.${k}: campo privado`).toBe(false)
        sinPrivados(x, `${ruta}.${k}`)
      }
    }
  }

  async function llamar(s: Sesion, fn: string, args: Json = {}, exito = true): Promise<Json> {
    const r = await rpc(s, fn, args)
    expect(r.contrato, fn).toBe(2)
    expect(r.ok, `${fn}: ${r.error?.codigo ?? ''}/${r.error?.detalle ?? ''}`).toBe(exito)
    const publico = { ...r }
    // Excepciones privadas autorizadas: propias o el simulado editado por el organizador.
    if (fn === 'save_my_conditions' || fn === 'simulate_save_conditions') delete publico.condiciones
    sinPrivados(publico)
    if (r.propuesta) expect(CODIGOS_SIGUIENTE).toContain(r.propuesta.siguiente_accion.codigo)
    llamadas++
    return r
  }

  async function estado(s: Sesion, p: string) {
    return (await llamar(s, 'get_proposal_state', { p_propuesta_id: p })).propuesta as Json
  }

  async function preparar(minimo = 4, maximo = 6, anfitrionDisponible = true, caroNoPuede = false) {
    const c = await llamar(T, 'create_proposal', {
      p_espacio_id: espacio.id, p_titulo: 'Asado en casa de Tomi',
      p_franjas: [
        { inicio: '2026-10-31T14:00', fin: '2026-10-31T17:00' },
        { inicio: '2026-11-01T14:00', fin: '2026-11-01T17:00' },
      ],
      p_minimo: minimo, p_maximo: maximo, p_imprescindible_id: ids.Tomi,
      p_plazo: '2026-10-29T20:00', p_zona_horaria: 'America/Santiago', p_intento_id: intento(),
    })
    const p = c.resultado.propuesta_id as string
    propuestas.push(p)
    await llamar(T, 'open_proposal', { p_propuesta_id: p })
    await llamar(T, 'save_my_conditions', { p_propuesta_id: p, p_disponibilidad: anfitrionDisponible ? { A: 'si', B: 'si' } : { A: 'no', B: 'no' } })
    await llamar(L, 'save_my_conditions', { p_propuesta_id: p, p_disponibilidad: { A: 'si', B: 'si' } })
    await llamar(T, 'simulate_load_case', { p_propuesta_id: p, p_intento_id: intento() })
    if (caroNoPuede) await llamar(T, 'simulate_save_conditions', {
      p_propuesta_id: p, p_miembro_id: ids.Caro, p_disponibilidad: { A: 'no', B: 'no' },
    })
    return p
  }

  async function aceptar(p: string, persona: string, exito = true) {
    const s = persona === 'Luna' ? L : T
    return llamar(s, ['Tomi', 'Luna'].includes(persona) ? 'accept_version' : 'simulate_accept', {
      p_propuesta_id: p, p_version: 1, p_intento_id: intento(),
      ...(['Tomi', 'Luna'].includes(persona) ? {} : { p_miembro_id: ids[persona] }),
    }, exito)
  }

  beforeAll(async () => {
    ;[T, L] = await Promise.all([nuevaSesion(), nuevaSesion()])
    expect(T.userId).not.toBe(L.userId)
    espacio = (await llamar(T, 'seed_demo_space')).espacio
    ids = Object.fromEntries(espacio.miembros.map((m: Json) => [m.nombre, m.miembro_id]))
    const j = await llamar(L, 'join_space', { p_codigo: espacio.codigo_invitacion, p_nombre_visible: 'Luna' })
    expect(j.resultado.reclamo_asiento_simulado).toBe(true)
    console.log('Jurado: dos identidades nuevas; demo propio; Luna real, otros cuatro simulados.')
  }, 60_000)

  afterAll(async () => {
    for (const p of propuestas) await llamar(T, 'cancel_proposal', { p_propuesta_id: p })
    for (const s of [T, L]) if (s) await s.c.auth.signOut()
    console.log(`Jurado: ${llamadas} RPC comprobadas por contrato y privacidad.`)
  }, 60_000)

  it('V1: mínimo 5 elige B y necesita cinco aceptaciones, incluido Tomi', async () => {
    const p = await preparar(5)
    const ev = await llamar(T, 'evaluate_and_publish', { p_propuesta_id: p, p_intento_id: intento() })
    expect(ev.resultado).toMatchObject({ tipo: 'opcion_publicada', version: 1, franja: 'B' })
    expect(ev.propuesta.opcion.cupos.pendientes).toBe(5)
    for (const [i, nombre] of ['Luna', 'Mati', 'Fede', 'Sofi'].entries()) {
      const a = await aceptar(p, nombre)
      expect(a.propuesta.confirmados).toBe(i + 1)
      expect(a.propuesta.estado).toBe('esperando_compromisos')
    }
    const fin = (await aceptar(p, 'Tomi')).propuesta
    expect(fin).toMatchObject({ estado: 'grupo_confirmado', confirmados: 5, minimo: 5, maximo: 6 })
    expect((await estado(L, p)).opcion).toEqual(fin.opcion)
    console.log('PASÓ V1: mínimo 5 → B/v1; espera con cuatro; confirma al quinto con Tomi.')
  }, 120_000)

  it('V2a: Tomi no puede A/B antes de evaluar → sin opción sin alterar reglas', async () => {
    const p = await preparar(4, 6, false)
    const r = await llamar(T, 'evaluate_and_publish', { p_propuesta_id: p, p_intento_id: intento() })
    expect(r.resultado).toMatchObject({ tipo: 'sin_opcion', version: null, franja: null })
    const vista = await estado(L, p)
    expect(vista).toMatchObject({ estado: 'reuniendo_interes', minimo: 4, maximo: 6, opcion: null })
    expect(vista.imprescindible.miembro_id).toBe(ids.Tomi)
    expect(vista.siguiente_accion.codigo).toBe('sin_opcion')
    expect(JSON.stringify(vista)).not.toMatch(/"(si|no|pendiente)"/)
    console.log('PASÓ V2a: anfitrión no disponible → sin opción; mínimo y anfitrión intactos.')
  }, 120_000)

  it('V2b: Tomi no puede tras baja de Caro → sin alternativa, conserva En revisión', async () => {
    const p = await preparar()
    await llamar(T, 'evaluate_and_publish', { p_propuesta_id: p, p_intento_id: intento() })
    for (const n of ['Luna', 'Mati', 'Caro', 'Tomi']) await aceptar(p, n)
    const baja = await llamar(T, 'simulate_withdraw', { p_propuesta_id: p, p_miembro_id: ids.Caro })
    expect(baja.propuesta.estado).toBe('en_revision')
    await llamar(T, 'save_my_conditions', { p_propuesta_id: p, p_disponibilidad: { A: 'no', B: 'no' } })
    const r = await llamar(T, 'propose_repair', { p_propuesta_id: p, p_intento_id: intento() }, false)
    expect(r.error).toMatchObject({ codigo: 'sin_alternativa', detalle: 'sin_alternativa' })
    const vista = await estado(L, p)
    expect(vista).toMatchObject({ estado: 'en_revision', minimo: 4, maximo: 6 })
    expect(vista.imprescindible.miembro_id).toBe(ids.Tomi)
    expect(vista.opcion.version).toBe(1)
    expect(vista.siguiente_accion.codigo).toBe('sin_alternativa')
    expect(JSON.stringify(vista)).not.toMatch(/"(si|no|pendiente)"/)
    console.log('PASÓ V2b: tras baja no hay alternativa; sigue En revisión/v1 sin motivo privado.')
  }, 120_000)

  it('V3: máximo 4 reserva lugar al anfitrión aunque haya cinco elegibles', async () => {
    const p = await preparar(4, 4, true, true)
    const ev = await llamar(T, 'evaluate_and_publish', { p_propuesta_id: p, p_intento_id: intento() })
    expect(ev.resultado).toMatchObject({ tipo: 'opcion_publicada', version: 1, franja: 'B' })
    expect(ev.propuesta.opcion.cupos).toMatchObject({ pendientes: 5, reservado_imprescindible: true, libres_para_otros: 3 })
    for (const n of ['Luna', 'Mati', 'Fede']) await aceptar(p, n)
    const lleno = await aceptar(p, 'Sofi', false)
    expect(lleno.error).toMatchObject({ codigo: 'cupo_completo', detalle: 'reservado_imprescindible' })
    const antes = await estado(T, p)
    expect(antes.opcion.cupos).toMatchObject({ confirmados: 3, reservado_imprescindible: true, libres_para_otros: 0 })
    expect(antes.estado).toBe('esperando_compromisos')
    const fin = (await aceptar(p, 'Tomi')).propuesta
    expect(fin).toMatchObject({ estado: 'grupo_confirmado', minimo: 4, maximo: 4, confirmados: 4 })
    expect(fin.opcion.cupos.disponibles).toBe(0)
    expect((await estado(L, p)).opcion).toEqual(fin.opcion)
    console.log('PASÓ V3: cinco elegibles/máximo cuatro; Sofi rechazada por reserva; Tomi entra último.')
  }, 120_000)
})
