// Mejoras de la bola de nieve (MEJORAS.md en la rama coordinacion), contra la base real.
import { beforeAll, describe, expect, it } from 'vitest'
import { crearEspacioPrueba, crearPropuesta, err, intento, nuevaSesion, ok, rpc, simulado, type Json, type Sesion } from './helpers'

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

describe('mejora #22: opcion_anterior en EstadoPropuesta', { timeout: 90_000 }, () => {
  it('null en v1; tras baja y reparación, v2 trae la franja de v1, igual para todos y sin condiciones', async () => {
    const [O, U] = await Promise.all([nuevaSesion(), nuevaSesion()]) // O organiza y es imprescindible
    const respuestas: Json[] = []
    const guardar = <T>(r: T): T => (respuestas.push(r), r)

    const esp = await crearEspacioPrueba(O, 'e22-anterior', 'Org t')
    await ok(U, 'join_space', { p_codigo: esp.codigo, p_nombre_visible: 'Uno t' })
    const [s1, s2] = await Promise.all(['S1 t', 'S2 t'].map((n) => simulado(O, esp.espacioId, n)))
    const prop = await crearPropuesta(O, esp.espacioId, esp.miembroId, { minimo: 3, maximo: 6, titulo: 't-e22' })

    // Sin opción todavía: la clave existe y vale null.
    const g0 = guardar(await ok(O, 'get_proposal_state', { p_propuesta_id: prop })).propuesta
    expect(g0.opcion).toBeNull()
    expect(g0).toHaveProperty('opcion_anterior', null)

    // A: O, U, S1 (3, viable y más temprana) → v1 en A. B: O, U, S2.
    guardar(await ok(O, 'save_my_conditions', { p_propuesta_id: prop, p_disponibilidad: { A: 'si', B: 'si' } }))
    guardar(await ok(U, 'save_my_conditions', { p_propuesta_id: prop, p_disponibilidad: { A: 'si', B: 'si' } }))
    guardar(await ok(O, 'simulate_save_conditions', { p_propuesta_id: prop, p_miembro_id: s1, p_disponibilidad: { A: 'si', B: 'no' } }))
    guardar(await ok(O, 'simulate_save_conditions', { p_propuesta_id: prop, p_miembro_id: s2, p_disponibilidad: { A: 'no', B: 'si' } }))
    const ev = guardar(await ok(O, 'evaluate_and_publish', { p_propuesta_id: prop, p_intento_id: intento() }))
    expect(ev.resultado).toMatchObject({ tipo: 'opcion_publicada', version: 1, franja: 'A' })
    const franjaV1 = ev.propuesta.opcion.franja
    expect(ev.propuesta.opcion_anterior).toBeNull()

    // v1 publicada: opcion_anterior null en la respuesta completa.
    const g1 = guardar(await ok(O, 'get_proposal_state', { p_propuesta_id: prop }))
    expect(g1.propuesta.opcion.version).toBe(1)
    expect(g1.propuesta).toHaveProperty('opcion_anterior', null)

    // S1 se baja: A queda con 2 < 3 → en revisión. Todavía no hay versión anterior.
    const baja = guardar(await ok(O, 'simulate_withdraw', { p_propuesta_id: prop, p_miembro_id: s1 }))
    expect(baja.resultado.efecto).toBe('pasa_a_revision')
    expect(baja.propuesta.opcion_anterior).toBeNull()
    const g2 = guardar(await ok(O, 'get_proposal_state', { p_propuesta_id: prop }))
    expect(g2.propuesta.estado).toBe('en_revision')
    expect(g2.propuesta.opcion_anterior).toBeNull()

    // Reparación: v2 en B; opcion_anterior = la franja de v1, mismo formato y zona que opcion.franja.
    const rep = guardar(await ok(O, 'propose_repair', { p_propuesta_id: prop, p_intento_id: intento() }))
    expect(rep.resultado).toMatchObject({ tipo: 'reparacion_publicada', version: 2, franja: 'B' })
    const esperado = { version: 1, franja_clave: 'A', inicio: franjaV1.inicio, fin: franjaV1.fin }
    expect(rep.propuesta.opcion_anterior).toEqual(esperado)

    const g3 = guardar(await ok(O, 'get_proposal_state', { p_propuesta_id: prop, p_desde_rev: g2.rev_vista }))
    expect(g3.sin_cambios).toBe(false)
    expect(g3.rev_vista).not.toBe(g2.rev_vista)
    expect(g3.propuesta.opcion.version).toBe(2)
    expect(g3.propuesta.opcion.franja.clave).toBe('B')
    expect(g3.propuesta.opcion_anterior).toEqual(esperado)
    expect(Object.keys(g3.propuesta.opcion_anterior).sort()).toEqual(['fin', 'franja_clave', 'inicio', 'version'])
    expect(g3.propuesta.opcion_anterior.inicio).toEqual(g3.propuesta.franjas.find((f: Json) => f.clave === 'A').inicio)
    expect(g3.propuesta.opcion_anterior.inicio.local).toBe('2026-12-05T14:00:00')
    // Sondeo estable con la vista nueva.
    const g4 = await ok(O, 'get_proposal_state', { p_propuesta_id: prop, p_desde_rev: g3.rev_vista })
    expect(g4.sin_cambios).toBe(true)
    expect(g4.propuesta).toBeUndefined()

    // Un miembro común ve exactamente lo mismo.
    const gu = guardar(await ok(U, 'get_proposal_state', { p_propuesta_id: prop }))
    expect(gu.propuesta.opcion_anterior).toEqual(esperado)

    // PropuestaResumen no cambia.
    const lista = guardar(await ok(U, 'list_proposals', { p_espacio_id: esp.espacioId }))
    expect(lista.propuestas).toHaveLength(1)
    expect(lista.propuestas[0].version).toBe(2)
    expect(lista.propuestas[0]).not.toHaveProperty('opcion_anterior')

    // Ninguna respuesta compartida trae condiciones ni preferencias (save_my_conditions trae las propias
    // fuera de `propuesta`, en `condiciones`); opcion_anterior es solo plan: versión, franja y horas.
    expect(respuestas.length).toBe(13)
    for (const r of respuestas) {
      const vista = JSON.stringify(r.propuesta ?? r)
      expect(vista).not.toContain('"disponibilidad"')
      expect(vista).not.toContain('"preferencias"')
      const ant = r.propuesta?.opcion_anterior
      if (ant) {
        expect(Object.keys(ant).sort()).toEqual(['fin', 'franja_clave', 'inicio', 'version'])
        expect(Object.keys(ant.inicio).sort()).toEqual(['local', 'utc'])
        expect(Object.keys(ant.fin).sort()).toEqual(['local', 'utc'])
      }
    }
  })
})
