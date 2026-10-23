// Enmienda 12 (docs/contrato-enmienda-12.md): avisos personales de "siguiente acción", migración 0039.
// Sin códigos nuevos: (a) el organizador imprescindible sin condiciones y (b) quien tiene condiciones incompletas
// con una opción publicada reciben `reunir_condiciones` con su texto; nadie más ve un cambio.
// Demo propio de una sesión de prueba (Tomi y sus simulados) y una sesión real que se une con nombre nuevo.
import { beforeAll, describe, expect, it } from 'vitest'
import {
  CODIGOS_SIGUIENTE, crearPropuesta, demoPrueba, intento, nuevaSesion, ok, PERMITIDAS, type Json, type Sesion,
  TOTAL_PERMITIDAS,
} from './helpers'

const SI = { A: 'si', B: 'si' }
const PRIMERO = { codigo: 'reunir_condiciones', texto: 'Primero marca tu disponibilidad: eres quien no puede faltar.' }
// 0040: el texto no promete entrar en la versión ya publicada (los elegibles se fijan al publicar).
const COMPLETA = { codigo: 'reunir_condiciones', texto: 'Tu disponibilidad está incompleta: no entraste en esta versión. Si la completas, cuenta si el plan se rearma.' }
const GENERAL = { codigo: 'reunir_condiciones', texto: 'Cada persona marca su disponibilidad en privado. Luego el organizador busca una opción.' }

describe('enmienda 12: avisos personales de siguiente acción', { timeout: 120_000 }, () => {
  let O: Sesion // Tomi: organizador del demo y de las propuestas, e imprescindible
  let U: Sesion // persona real que se une al demo
  let demo: Json
  let ids: Record<string, string>

  const sig = async (s: Sesion, prop: string) => {
    const a = (await ok(s, 'get_proposal_state', { p_propuesta_id: prop })).propuesta.siguiente_accion
    expect(CODIGOS_SIGUIENTE).toContain(a.codigo)
    return a
  }
  const simCond = (prop: string, nombre: string, disp: Json) =>
    ok(O, 'simulate_save_conditions', { p_propuesta_id: prop, p_miembro_id: ids[nombre], p_disponibilidad: disp })

  beforeAll(async () => {
    ;[O, U] = await Promise.all([nuevaSesion(), nuevaSesion()])
    demo = await demoPrueba(O)
    await ok(U, 'join_space', { p_codigo: demo.codigo, p_nombre_visible: 'Pepa t' })
    ids = Object.fromEntries((await ok(O, 'get_space', { p_espacio_id: demo.espacioId })).espacio.miembros.map((m: Json) => [m.nombre, m.miembro_id]))
  }, 60_000)

  it('(a) organizador imprescindible sin condiciones: primero su disponibilidad; con ellas, buscar_opcion como antes', async () => {
    const prop = await crearPropuesta(O, demo.espacioId, demo.miembroId, { titulo: 't-e12-a', minimo: 2, maximo: 6 })
    // Nadie con condiciones: Tomi ve el aviso personal; Pepa, el texto general.
    expect(await sig(O, prop)).toEqual(PRIMERO)
    expect(await sig(U, prop)).toEqual(GENERAL)
    // Dos simulados completos (alcanzan el mínimo) y Tomi a medias: antes era buscar_opcion; ahora, primero lo suyo.
    await simCond(prop, 'Luna', SI)
    await simCond(prop, 'Mati', SI)
    await ok(O, 'save_my_conditions', { p_propuesta_id: prop, p_disponibilidad: { A: 'si' } })
    expect(await sig(O, prop)).toEqual(PRIMERO)
    expect(await sig(U, prop)).toEqual(GENERAL)
    // Con sus condiciones completas, buscar_opcion como antes (3 con condiciones).
    await ok(O, 'save_my_conditions', { p_propuesta_id: prop, p_disponibilidad: SI })
    expect(await sig(O, prop)).toEqual({ codigo: 'buscar_opcion', texto: 'Ya hay 3 personas con condiciones. Busca una opción compatible.' })
    expect(await sig(U, prop)).toEqual(GENERAL)
    await ok(O, 'cancel_proposal', { p_propuesta_id: prop })
  })

  it('(b) con una opción publicada, quien tiene una sola franja respondida ve que tiene que completarla; los demás, sin cambios', async () => {
    const prop = await crearPropuesta(O, demo.espacioId, demo.miembroId, { titulo: 't-e12-b', minimo: 2, maximo: 6 })
    await ok(O, 'save_my_conditions', { p_propuesta_id: prop, p_disponibilidad: SI })
    await simCond(prop, 'Luna', SI)
    await ok(U, 'save_my_conditions', { p_propuesta_id: prop, p_disponibilidad: { A: 'si' } }) // solo una franja
    const ev = await ok(O, 'evaluate_and_publish', { p_propuesta_id: prop, p_intento_id: intento() })
    expect(ev.resultado.tipo).toBe('opcion_publicada')
    const pepa = (await ok(U, 'get_proposal_state', { p_propuesta_id: prop })).propuesta
    expect(pepa.estado).toBe('esperando_compromisos')
    expect(pepa.mi_situacion.condiciones).toBe('incompletas')
    expect(pepa.siguiente_accion).toEqual(COMPLETA)
    // No cambia elegibilidad, cupos ni conteos: Pepa no puede aceptar y los cupos son los del cálculo.
    expect(pepa.mi_situacion.puede.aceptar).toBe(false)
    expect(pepa.opcion.cupos.confirmados).toBe(0)
    // Tomi (elegible) sigue con te_toca_aceptar; en la lista de propuestas Pepa ve el mismo aviso.
    expect((await sig(O, prop)).codigo).toBe('te_toca_aceptar')
    const lista = (await ok(U, 'list_proposals', { p_espacio_id: demo.espacioId })).propuestas
    expect(lista.find((p: Json) => p.id === prop).siguiente_accion).toEqual(COMPLETA)
    // Tomi acepta y queda en ya_aceptaste, como antes.
    await ok(O, 'accept_version', { p_propuesta_id: prop, p_version: 1, p_intento_id: intento() })
    expect((await sig(O, prop)).codigo).toBe('ya_aceptaste')
    expect(await sig(U, prop)).toEqual(COMPLETA)
    await ok(O, 'cancel_proposal', { p_propuesta_id: prop })
  })

  it('la lista cerrada de códigos y el catálogo no cambian', async () => {
    expect(CODIGOS_SIGUIENTE).toHaveLength(12)
    expect(Object.keys(PERMITIDAS)).toHaveLength(TOTAL_PERMITIDAS) // E11: 40
  })
})
