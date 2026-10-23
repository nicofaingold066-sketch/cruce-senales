// Pruebas críticas: seed idempotente, reclamo de asiento simulado y reinicio de demo aislado.
// Nota: seed_demo_space crea por contrato un espacio demo "Los del asado" PROPIO de cada sesión de prueba
// (sesiones anónimas nuevas); nunca toca el espacio demo de los dispositivos reales de la demo.
import { beforeAll, describe, expect, it } from 'vitest'
import { crearEspacioPrueba, crearPropuesta, err, intento, nuevaSesion, ok, rpc, type Json, type Sesion } from './helpers'

describe('seed y reinicio de demo', { timeout: 60_000 }, () => {
  let T1: Sesion
  let T2: Sesion
  let L: Sesion
  let esp1: Json
  let esp2: Json

  beforeAll(async () => {
    ;[T1, T2, L] = await Promise.all([nuevaSesion(), nuevaSesion(), nuevaSesion()])
  }, 60_000)

  it('seed idempotente y reclamo de asiento simulado', async () => {
    const a = await ok(T1, 'seed_demo_space')
    const b = await ok(T1, 'seed_demo_space')
    expect(a.resultado).toMatchObject({ creado: true, repetido: false })
    expect(b.resultado).toMatchObject({ creado: false, repetido: true, espacio_id: a.resultado.espacio_id })
    esp1 = b.espacio
    expect(esp1.demo).toBe(true)
    expect(esp1.nombre).toBe('Los del asado')
    expect(esp1.mi_rol).toBe('organizador')
    expect(esp1.codigo_invitacion).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/)
    expect(esp1.miembros.map((m: Json) => [m.nombre, m.simulado])).toEqual([
      ['Tomi', false], ['Luna', true], ['Mati', true], ['Caro', true], ['Fede', true], ['Sofi', true],
    ])
    const lunaSim = esp1.miembros.find((m: Json) => m.nombre === 'Luna').miembro_id

    const j = await ok(L, 'join_space', { p_codigo: ` ${esp1.codigo_invitacion.toLowerCase()} `, p_nombre_visible: 'luna' })
    expect(j.resultado).toMatchObject({ reclamo_asiento_simulado: true, ya_era_miembro: false, miembro_id: lunaSim })
    expect(j.espacio.miembros.find((m: Json) => m.nombre === 'Luna')).toMatchObject({ simulado: false, es_yo: true })
    const j2 = await ok(L, 'join_space', { p_codigo: esp1.codigo_invitacion, p_nombre_visible: 'Otro' })
    expect(j2.resultado).toMatchObject({ ya_era_miembro: true, repetido: true })
    // Una tercera sesión no puede volver a usar "Luna".
    expect(err(await rpc(T2, 'join_space', { p_codigo: esp1.codigo_invitacion, p_nombre_visible: 'Luna' })))
      .toBe('entrada_incompleta/nombre_en_uso')

    const lista = await ok(L, 'list_my_spaces')
    expect(lista.espacios).toHaveLength(1)
    expect(lista.espacios[0]).toMatchObject({ id: esp1.id, mi_rol: 'miembro', cantidad_miembros: 6, demo: true })

    // Sesión distinta = espacio demo distinto y aislado.
    esp2 = (await ok(T2, 'seed_demo_space')).espacio
    expect(esp2.id).not.toBe(esp1.id)
  })

  it('el asiento reclamado sale del panel de simulación', async () => {
    const tomi = esp1.mi_miembro_id
    const prop = await crearPropuesta(T1, esp1.id, tomi)
    const panel = await ok(T1, 'get_simulation_panel', { p_propuesta_id: prop })
    expect(panel.simulacion.miembros.map((m: Json) => m.miembro.nombre)).toEqual(['Mati', 'Caro', 'Fede', 'Sofi'])
    const luna = esp1.miembros.find((m: Json) => m.nombre === 'Luna').miembro_id
    const r = await rpc(T1, 'simulate_save_conditions', { p_propuesta_id: prop, p_miembro_id: luna, p_disponibilidad: { A: 'si', B: 'si' } })
    expect(err(r)).toBe('no_autorizado/miembro_no_simulado')
  })

  it('reinicio aislado: solo el organizador, solo demo, sin tocar otros espacios', async () => {
    // Propuesta en el demo de T2 (no debe cambiar).
    const p2 = await crearPropuesta(T2, esp2.id, esp2.mi_miembro_id)
    await ok(T2, 'mark_interest', { p_propuesta_id: p2, p_interesado: true })
    const antes2 = (await ok(T2, 'get_proposal_state', { p_propuesta_id: p2 })).propuesta

    const listado1 = await ok(T1, 'list_proposals', { p_espacio_id: esp1.id })
    expect(listado1.propuestas.length).toBe(1)
    const p1 = listado1.propuestas[0].id

    // Luna no es organizadora: rechazado y sin efectos.
    const rl = await rpc(L, 'reset_demo', { p_espacio_id: esp1.id })
    expect(err(rl)).toBe('no_autorizado/no_es_organizador_espacio')
    expect(rl.state_rev).toBeNull()
    // Espacio no demo: rechazado.
    const noDemo = await crearEspacioPrueba(T1, 'no-demo', 'Org t')
    expect(err(await rpc(T1, 'reset_demo', { p_espacio_id: noDemo.espacioId }))).toBe('no_autorizado/espacio_no_demo')
    // T2 sobre el demo de T1: no es miembro.
    expect(err(await rpc(T2, 'reset_demo', { p_espacio_id: esp1.id }))).toBe('fuera_de_audiencia/no_miembro')

    const r = await ok(T1, 'reset_demo', { p_espacio_id: esp1.id })
    expect(r.resultado.propuestas_eliminadas).toBe(1)
    expect(r.espacio.ultimo_reinicio).not.toBeNull()
    expect(r.espacio.codigo_invitacion).toBe(esp1.codigo_invitacion)
    expect(r.espacio.miembros.map((m: Json) => [m.miembro_id, m.simulado])).toEqual(
      esp1.miembros.map((m: Json) => [m.miembro_id, m.nombre === 'Luna' ? false : m.simulado]),
    )
    expect((await ok(T1, 'list_proposals', { p_espacio_id: esp1.id })).propuestas).toEqual([])
    expect(err(await rpc(L, 'get_proposal_state', { p_propuesta_id: p1 }))).toBe('fuera_de_audiencia/no_miembro')

    // El demo de T2 sigue igual.
    const despues2 = (await ok(T2, 'get_proposal_state', { p_propuesta_id: p2 })).propuesta
    expect(despues2.state_rev).toBe(antes2.state_rev)
    expect(despues2.interesados.cantidad).toBe(1)
    expect((await ok(T2, 'get_space', { p_espacio_id: esp2.id })).espacio.ultimo_reinicio).toBeNull()

    // Después del reinicio se puede volver a crear la propuesta (intento nuevo).
    const again = await ok(T1, 'create_proposal', {
      p_espacio_id: esp1.id, p_titulo: 'Asado en casa de Tomi',
      p_franjas: [{ inicio: '2026-12-05T14:00', fin: '2026-12-05T17:00' }, { inicio: '2026-12-06T14:00', fin: '2026-12-06T17:00' }],
      p_minimo: 4, p_maximo: 6, p_imprescindible_id: esp1.mi_miembro_id, p_plazo: '2026-12-01T20:00',
      p_zona_horaria: 'America/Santiago', p_intento_id: intento(),
    })
    expect(again.propuesta.state_rev).toBe(1)
    expect(again.propuesta.estado).toBe('borrador')
  })
})
