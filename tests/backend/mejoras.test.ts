// Mejoras de la bola de nieve (MEJORAS.md en la rama coordinacion), contra la base real.
import { beforeAll, describe, expect, it } from 'vitest'
import { err, nuevaSesion, ok, rpc, simulado, type Json, type Sesion } from './helpers'

describe('mejora #12: nombres y código normalizados', { timeout: 60_000 }, () => {
  let O: Sesion
  let U1: Sesion
  let U2: Sesion
  let demo: Json

  beforeAll(async () => {
    ;[O, U1, U2] = await Promise.all([nuevaSesion(), nuevaSesion(), nuevaSesion()])
    demo = (await ok(O, 'seed_demo_space')).espacio
  }, 60_000)

  it('tabulador o espacio no separable al inicio no esquivan nombre_en_uso', async () => {
    // "\tLuna" reclama el asiento limpio de Luna (no crea una segunda Luna).
    const j = await ok(U1, 'join_space', { p_codigo: demo.codigo_invitacion, p_nombre_visible: '\tLuna' })
    expect(j.resultado.reclamo_asiento_simulado).toBe(true)
    expect(j.espacio.miembros.filter((m: Json) => m.nombre.toLowerCase().includes('luna')).map((m: Json) => m.nombre)).toEqual(['Luna'])
    for (const variante of [' Luna', 'Luna ', '　luna', 'Lu​na', '﻿LUNA\t']) {
      const r = await rpc(U2, 'join_space', { p_codigo: demo.codigo_invitacion, p_nombre_visible: variante })
      expect(err(r), JSON.stringify(variante)).toBe('entrada_incompleta/nombre_en_uso')
    }
    // Un nombre que solo tiene espacios raros está vacío.
    expect(err(await rpc(U2, 'join_space', { p_codigo: demo.codigo_invitacion, p_nombre_visible: '\t ​' })))
      .toBe('entrada_incompleta/campo_faltante')
  })

  it('código de invitación pegado con espacios raros y nombre con espacios internos repetidos', async () => {
    const r = await ok(U2, 'join_space', {
      p_codigo: ` ${demo.codigo_invitacion.slice(0, 4)} ${demo.codigo_invitacion.slice(4).toLowerCase()}​`,
      p_nombre_visible: 'Invitado   doce\tt',
    })
    expect(r.resultado.ya_era_miembro).toBe(false)
    expect(r.espacio.miembros.find((m: Json) => m.es_yo).nombre).toBe('Invitado doce t')
  })

  it('forma Unicode: "José" compuesto y descompuesto es el mismo nombre; el espacio también se normaliza', async () => {
    const c = await ok(O, 'create_space', { p_nombre: '\t t-e12  normalizado　', p_tipo: 'amigos', p_nombre_visible: '\tOrg t' })
    const esp = { espacioId: c.resultado.espacio_id as string, codigo: c.resultado.codigo_invitacion as string }
    expect(c.espacio.nombre).toBe('t-e12 normalizado')
    expect(c.espacio.miembros[0].nombre).toBe('Org t')
    await simulado(O, esp.espacioId, 'José t') // NFC
    expect(err(await rpc(O, 'add_simulated_member', { p_espacio_id: esp.espacioId, p_nombre_visible: 'José t' })))
      .toBe('entrada_incompleta/nombre_en_uso')
    expect(err(await rpc(U1, 'join_space', { p_codigo: esp.codigo, p_nombre_visible: 'JOSÉ t' })))
      .toBe('entrada_incompleta/nombre_en_uso')
  })
})

describe('mejora #15: sondeo liviano de get_proposal_state', { timeout: 60_000 }, () => {
  it('sin_cambios con el mismo rev_vista; respuesta completa ante cualquier cambio visible, aunque no suba state_rev', async () => {
    const [O, U] = await Promise.all([nuevaSesion(), nuevaSesion()])
    const c = await ok(O, 'create_space', { p_nombre: 't-e15-sondeo', p_tipo: 'amigos', p_nombre_visible: 'Org t' })
    const esp = c.resultado.espacio_id as string
    await ok(U, 'join_space', { p_codigo: c.resultado.codigo_invitacion, p_nombre_visible: 'Uno t' })
    const cp = await ok(O, 'create_proposal', {
      p_espacio_id: esp, p_titulo: 't-sondeo',
      p_franjas: [{ inicio: '2026-12-05T14:00', fin: '2026-12-05T17:00' }, { inicio: '2026-12-06T14:00', fin: '2026-12-06T17:00' }],
      p_minimo: 2, p_maximo: 4, p_imprescindible_id: c.resultado.miembro_id, p_plazo: '2026-12-01T20:00',
      p_zona_horaria: 'America/Santiago', p_intento_id: crypto.randomUUID(),
    })
    const prop = cp.resultado.propuesta_id as string
    await ok(O, 'open_proposal', { p_propuesta_id: prop })

    // Llamada de siempre (sin p_desde_rev): respuesta completa con rev_vista.
    const a = await ok(O, 'get_proposal_state', { p_propuesta_id: prop })
    expect(a.sin_cambios).toBe(false)
    expect(Number.isInteger(a.rev_vista)).toBe(true)
    expect(a.propuesta.id).toBe(prop)

    // Mismo rev_vista: respuesta corta, sin la propuesta.
    const b = await ok(O, 'get_proposal_state', { p_propuesta_id: prop, p_desde_rev: a.rev_vista })
    expect(b).toMatchObject({ ok: true, contrato: 2, sin_cambios: true, state_rev: a.propuesta.state_rev, rev_vista: a.rev_vista })
    expect(b.propuesta).toBeUndefined()
    expect(JSON.stringify(b).length).toBeLessThan(JSON.stringify(a).length / 5)

    // Otra persona guarda condiciones: state_rev NO sube, pero el organizador ve el conteo nuevo.
    await ok(U, 'save_my_conditions', { p_propuesta_id: prop, p_disponibilidad: { A: 'si', B: 'si' } })
    const d = await ok(O, 'get_proposal_state', { p_propuesta_id: prop, p_desde_rev: a.rev_vista })
    expect(d.sin_cambios).toBe(false)
    expect(d.propuesta.state_rev).toBe(a.propuesta.state_rev)
    expect(d.propuesta.personas_con_condiciones).toBe(1)
    expect(d.rev_vista).not.toBe(a.rev_vista)

    // Un cambio que sube state_rev también llega completo.
    await ok(U, 'mark_interest', { p_propuesta_id: prop, p_interesado: true })
    const e = await ok(O, 'get_proposal_state', { p_propuesta_id: prop, p_desde_rev: d.rev_vista })
    expect(e.sin_cambios).toBe(false)
    expect(e.propuesta.state_rev).toBe(d.propuesta.state_rev + 1)

    // Mandar por error el state_rev no deja la pantalla vieja: llega la respuesta completa.
    const f = await ok(O, 'get_proposal_state', { p_propuesta_id: prop, p_desde_rev: e.propuesta.state_rev })
    expect(f.sin_cambios).toBe(false)

    // rev_vista es por persona: lo que ve U (su situación) no coincide con lo que ve O.
    const u = await ok(U, 'get_proposal_state', { p_propuesta_id: prop })
    expect(u.rev_vista).not.toBe(e.rev_vista)
    expect((await ok(U, 'get_proposal_state', { p_propuesta_id: prop, p_desde_rev: u.rev_vista })).sin_cambios).toBe(true)

    // Errores de siempre, también con p_desde_rev.
    const x = await nuevaSesion()
    expect(err(await rpc(x, 'get_proposal_state', { p_propuesta_id: prop, p_desde_rev: e.rev_vista }))).toBe('fuera_de_audiencia/no_miembro')
  })
})
