// Enmienda 9 (docs/contrato-enmienda-9.md, mejora #70): entrada por lista de integrantes.
// Fase 1 (0032): preview_space_by_code y join_space con p_miembro_id. Fase 2 (0033): integrantes pendientes.
// Demo propio de una sesión de prueba (nunca el demo de otros) y espacios "t-e9-...". Pocas sesiones, reutilizadas.
import { beforeAll, describe, expect, it } from 'vitest'
import {
  clienteSinSesion, crearEspacioPrueba, crearPropuesta, demoPrueba, err, intento, nuevaSesion, ok, PERMITIDAS, rpc,
  rpcCrudo, type Json, type Sesion,
  TOTAL_PERMITIDAS,
} from './helpers'

describe('enmienda 9, fase 1: ¿quién eres? (preview y reclamo por integrante)', { timeout: 120_000 }, () => {
  let O: Sesion // organizador del demo
  let A: Sesion // reclama a Luna por id
  let B: Sesion // compite con A por el mismo lugar
  let demo: { espacioId: string; codigo: string; miembroId: string }
  let ids: Record<string, string>

  const preview = (s: Sesion, codigo: string) => rpc(s, 'preview_space_by_code', { p_codigo: codigo })

  beforeAll(async () => {
    ;[O, A, B] = await Promise.all([nuevaSesion(), nuevaSesion(), nuevaSesion()])
    demo = await demoPrueba(O)
    ids = Object.fromEntries((await ok(O, 'get_space', { p_espacio_id: demo.espacioId })).espacio.miembros.map((m: Json) => [m.nombre, m.miembro_id]))
  }, 60_000)

  it('1. preview sin ser miembro: nombre del espacio y lista con libre, y nada más; código inexistente o vacío → error', async () => {
    const r = await preview(A, demo.codigo.toLowerCase()) // el código se normaliza como en join_space
    expect(r.ok).toBe(true)
    expect(Object.keys(r).sort()).toEqual(['contrato', 'espacio', 'miembros', 'ok', 'servidor_ahora'])
    expect(r.espacio).toEqual({ nombre: expect.stringMatching(/^Los del (asado|finde)$/), demo: true, proposito: 'libre', familia: 'libre' }) // E14 (0048); 0054: "Los del finde"
    for (const m of r.miembros) expect(Object.keys(m).sort()).toEqual(['libre', 'miembro_id', 'nombre'])
    const porNombre = Object.fromEntries(r.miembros.map((m: Json) => [m.nombre, m.libre]))
    // Luna no tiene semilla (libre); Mati, Caro, Fede y Sofi la tienen (asiento en uso); Tomi es real.
    expect(porNombre).toEqual({ Tomi: false, Luna: true, Mati: false, Caro: false, Fede: false, Sofi: false })
    expect(r.miembros.map((m: Json) => m.miembro_id)).toEqual(Object.values(ids))
    const txt = JSON.stringify(r)
    for (const x of ['rol', 'user_id', 'propuesta', 'disponibilidad', 'preferencias', 'codigo_invitacion', O.userId, A.userId]) {
      expect(txt).not.toContain(x)
    }
    // Sigue sin ser miembro: la vista no inscribe.
    expect(err(await rpc(A, 'get_space', { p_espacio_id: demo.espacioId }))).toBe('fuera_de_audiencia/no_miembro')
    expect(err(await preview(A, 'ZZZZZZZZ'))).toBe('fuera_de_audiencia/codigo_inexistente')
    expect((await preview(A, 'ZZZZZZZZ')).error.mensaje).toBe('El código de invitación no existe.')
    expect(err(await preview(A, ''))).toBe('entrada_incompleta/formato_invalido')
    expect(err(await preview(A, '  '))).toBe('entrada_incompleta/formato_invalido')
    // Sin sesión no se ejecuta (A5).
    expect((await rpcCrudo(clienteSinSesion(), 'preview_space_by_code', { p_codigo: demo.codigo })).error?.code).toBe('42501')
  })

  it('3 y 2. dos sesiones reclaman a Luna a la vez: una gana con el mismo miembro_id, la otra miembro_ya_reclamado; el panel ya no la lista; libre pasa a false', async () => {
    const [ra, rb] = await Promise.all([
      rpc(A, 'join_space', { p_codigo: demo.codigo, p_nombre_visible: 'lo que sea', p_miembro_id: ids.Luna }),
      rpc(B, 'join_space', { p_codigo: demo.codigo, p_nombre_visible: 'otro', p_miembro_id: ids.Luna }),
    ])
    const gano = ra.ok ? ra : rb
    const perdio = ra.ok ? rb : ra
    const G = ra.ok ? A : B
    const P = ra.ok ? B : A
    expect(gano.ok && !perdio.ok).toBe(true)
    expect(gano.resultado).toEqual({
      espacio_id: demo.espacioId, miembro_id: ids.Luna, reclamo_asiento_simulado: true, reclamo_pendiente: false,
      ya_era_miembro: false, repetido: false,
    })
    expect(gano.espacio.mi_miembro_id).toBe(ids.Luna)
    const luna = gano.espacio.miembros.find((m: Json) => m.miembro_id === ids.Luna)
    expect(luna).toMatchObject({ nombre: 'Luna', simulado: false, es_yo: true, rol: 'miembro' }) // conserva el nombre, no "lo que sea"
    expect(err(perdio)).toBe('no_autorizado/miembro_ya_reclamado')
    expect(perdio.error.mensaje).toBe('Ese lugar ya lo tomó otra persona.')
    expect(err(await rpc(P, 'get_space', { p_espacio_id: demo.espacioId }))).toBe('fuera_de_audiencia/no_miembro')

    // La sesión queda ligada: repetir el reclamo o entrar con otro nombre devuelve ya_era_miembro con el mismo id.
    const otra = await ok(G, 'join_space', { p_codigo: demo.codigo, p_nombre_visible: 'Otro nombre', p_miembro_id: ids.Luna })
    expect(otra.resultado).toMatchObject({ miembro_id: ids.Luna, ya_era_miembro: true, repetido: true })
    expect((await ok(G, 'join_space', { p_codigo: demo.codigo, p_nombre_visible: 'Otro nombre' })).resultado.miembro_id).toBe(ids.Luna)

    // libre pasa a false y el panel de simulación ya no la lista.
    const pv = await ok(P, 'preview_space_by_code', { p_codigo: demo.codigo })
    expect(pv.miembros.find((m: Json) => m.miembro_id === ids.Luna).libre).toBe(false)
    const prop = await crearPropuesta(O, demo.espacioId, demo.miembroId, { minimo: 2, maximo: 6, titulo: 't-e9-panel' })
    const panel = await ok(O, 'get_simulation_panel', { p_propuesta_id: prop })
    expect(panel.simulacion.miembros.map((m: Json) => m.miembro.nombre)).toEqual(['Mati', 'Caro', 'Fede', 'Sofi'])
    expect(err(await rpc(O, 'simulate_mark_interest', { p_propuesta_id: prop, p_miembro_id: ids.Luna, p_interesado: true })))
      .toBe('no_autorizado/miembro_no_simulado')
    // Y Luna real opera como persona.
    const mi = await ok(G, 'mark_interest', { p_propuesta_id: prop, p_interesado: true })
    expect(mi.propuesta.interesados.miembros[0]).toMatchObject({ miembro_id: ids.Luna, nombre: 'Luna', simulado: false })
    await ok(O, 'cancel_proposal', { p_propuesta_id: prop })
  })

  it('reclamos que no proceden: un real, un simulado con actividad, un id ajeno; sin p_miembro_id todo sigue igual', async () => {
    const P = (await ok(A, 'list_my_spaces')).espacios.some((e: Json) => e.id === demo.espacioId) ? B : A
    expect(err(await rpc(P, 'join_space', { p_codigo: demo.codigo, p_nombre_visible: 'x', p_miembro_id: ids.Tomi })))
      .toBe('no_autorizado/miembro_ya_reclamado')
    expect(err(await rpc(P, 'join_space', { p_codigo: demo.codigo, p_nombre_visible: 'x', p_miembro_id: ids.Mati })))
      .toBe('asiento_en_uso/asiento_en_uso') // semilla de preferencias: el asiento está en uso, como por nombre
    expect(err(await rpc(P, 'join_space', { p_codigo: demo.codigo, p_nombre_visible: 'x', p_miembro_id: intento() })))
      .toBe('entrada_incompleta/miembro_inexistente')
    // Un miembro de OTRO espacio tampoco existe en este.
    const otro = await crearEspacioPrueba(O, 'e9-otro', 'Org t')
    expect(err(await rpc(P, 'join_space', { p_codigo: demo.codigo, p_nombre_visible: 'x', p_miembro_id: otro.miembroId })))
      .toBe('entrada_incompleta/miembro_inexistente')
    expect(err(await rpc(P, 'join_space', { p_codigo: 'ZZZZZZZZ', p_nombre_visible: 'x', p_miembro_id: ids.Luna })))
      .toBe('fuera_de_audiencia/codigo_inexistente')
    expect(err(await rpc(P, 'get_space', { p_espacio_id: demo.espacioId }))).toBe('fuera_de_audiencia/no_miembro') // nada lo inscribió
    // "No estoy en la lista": el camino de siempre, con la respuesta de siempre más reclamo_pendiente false.
    expect(err(await rpc(P, 'join_space', { p_codigo: demo.codigo, p_nombre_visible: 'luna' }))).toBe('entrada_incompleta/nombre_en_uso')
    expect(err(await rpc(P, 'join_space', { p_codigo: demo.codigo, p_nombre_visible: '' }))).toBe('entrada_incompleta/campo_faltante')
    const nuevo = await ok(P, 'join_space', { p_codigo: demo.codigo, p_nombre_visible: 'Nueva t' })
    expect(nuevo.resultado).toMatchObject({ reclamo_asiento_simulado: false, reclamo_pendiente: false, ya_era_miembro: false, repetido: false })
    expect(Object.keys(nuevo.resultado).sort()).toEqual(['espacio_id', 'miembro_id', 'reclamo_asiento_simulado', 'reclamo_pendiente', 'repetido', 'ya_era_miembro'])
  })

  it('5. catálogo: 31 para authenticated, 0 para anon, una sola firma de join_space', async () => {
    expect(Object.keys(PERMITIDAS)).toHaveLength(TOTAL_PERMITIDAS) // E11: 40; E13: 41
    for (const fn of ['preview_space_by_code', 'join_space']) {
      expect((await rpcCrudo(clienteSinSesion(), fn, PERMITIDAS[fn]())).error?.code, fn).toBe('42501')
      const b = await rpcCrudo(O, fn, PERMITIDAS[fn]())
      expect(b.error, fn).toBeNull()
      expect(b.data.contrato).toBe(2)
    }
    // Con y sin p_miembro_id es la misma función (PostgREST no encuentra una sobrecarga aparte).
    const con = await rpcCrudo(O, 'join_space', { p_codigo: 'ZZZZZZZZ', p_nombre_visible: 'x', p_miembro_id: intento() })
    expect(con.error).toBeNull()
    expect(err(con.data)).toBe('fuera_de_audiencia/codigo_inexistente')
  })
})

describe('enmienda 9, fase 2: integrantes pendientes', { timeout: 120_000 }, () => {
  let O: Sesion // organizador
  let E: Sesion // entra por "No estoy en la lista"
  let R: Sesion // reclama a Ana
  let esp: Json
  let ids: Record<string, string>
  const SI = { A: 'si', B: 'si' }

  beforeAll(async () => {
    ;[O, E, R] = await Promise.all([nuevaSesion(), nuevaSesion(), nuevaSesion()])
  }, 60_000)

  it('4. espacio con 3 pendientes: no cuentan en nada; simulate_* los rechaza; reclamarlo lo vuelve real', async () => {
    const c = await ok(O, 'create_space', { p_nombre: `t-e9-pend-${intento().slice(0, 6)}`, p_tipo: 'amigos', p_nombre_visible: 'Org t', p_integrantes: ['Ana t', ' beto  T ', 'Cata t'] })
    esp = c.resultado
    expect(esp.pendientes.map((p: Json) => p.nombre)).toEqual(['Ana t', 'beto T', 'Cata t']) // normalizados, en orden
    ids = Object.fromEntries(c.espacio.miembros.map((m: Json) => [m.nombre, m.miembro_id]))
    expect(c.espacio.miembros.map((m: Json) => [m.nombre, m.pendiente, m.simulado, m.rol])).toEqual([
      ['Org t', false, false, 'organizador'], ['Ana t', true, false, 'miembro'], ['beto T', true, false, 'miembro'], ['Cata t', true, false, 'miembro'],
    ])
    expect(esp.pendientes.map((p: Json) => p.miembro_id)).toEqual([ids['Ana t'], ids['beto T'], ids['Cata t']])
    // Vista previa: los tres libres, el organizador no.
    const pv = await ok(R, 'preview_space_by_code', { p_codigo: esp.codigo_invitacion })
    expect(pv.espacio).toEqual({ nombre: c.espacio.nombre, demo: false, proposito: 'libre', familia: 'libre' }) // E14 (0048)
    expect(pv.miembros.map((m: Json) => [m.nombre, m.libre])).toEqual([['Org t', false], ['Ana t', true], ['beto T', true], ['Cata t', true]])

    // E entra por nombre; escribir el nombre de un pendiente no lo reclama (nombre_en_uso).
    expect(err(await rpc(E, 'join_space', { p_codigo: esp.codigo_invitacion, p_nombre_visible: 'ana T' }))).toBe('entrada_incompleta/nombre_en_uso')
    await ok(E, 'join_space', { p_codigo: esp.codigo_invitacion, p_nombre_visible: 'Dos t' })
    const prop = await crearPropuesta(O, esp.espacio_id, esp.miembro_id, { minimo: 2, maximo: 6, titulo: 't-e9-pendientes' })
    for (const s of [O, E]) await ok(s, 'save_my_conditions', { p_propuesta_id: prop, p_disponibilidad: SI })
    // Nunca cuentan: ni interés, ni condiciones, ni elegibles, ni cupos.
    for (const n of ['Ana t', 'beto T', 'Cata t']) {
      const r = await rpc(O, 'simulate_mark_interest', { p_propuesta_id: prop, p_miembro_id: ids[n], p_interesado: true })
      expect(['no_autorizado/espacio_no_demo', 'no_autorizado/miembro_no_simulado']).toContain(err(r)) // E7.3 rechaza antes, fuera del demo
      expect(err(await rpc(O, 'simulate_save_conditions', { p_propuesta_id: prop, p_miembro_id: ids[n], p_disponibilidad: SI }))).toMatch(/^no_autorizado\//)
    }
    const ev = await ok(O, 'evaluate_and_publish', { p_propuesta_id: prop, p_intento_id: intento() })
    expect(ev.resultado).toMatchObject({ tipo: 'opcion_publicada', version: 1 })
    const st = ev.propuesta
    expect(st.personas_con_condiciones).toBe(2)
    expect(st.interesados.cantidad).toBe(0)
    expect(st.opcion.cupos).toMatchObject({ confirmados: 0, pendientes: 2, disponibles: 6 }) // solo O y E son elegibles
    expect(JSON.stringify(st)).not.toContain(ids['Ana t'])
    const panel = await ok(O, 'get_simulation_panel', { p_propuesta_id: prop })
    expect(panel.simulacion.miembros).toEqual([]) // los pendientes no son simulados: el panel no los lista
    // Confirmación con O y E: el quórum no espera a los pendientes.
    await ok(E, 'accept_version', { p_propuesta_id: prop, p_version: 1, p_intento_id: intento() })
    const fin = await ok(O, 'accept_version', { p_propuesta_id: prop, p_version: 1, p_intento_id: intento() })
    expect(fin.propuesta.estado).toBe('grupo_confirmado')
    expect(fin.propuesta.opcion.cupos.pendientes).toBe(0)

    // R reclama a Ana: pasa a real con la sesión de R, mismo miembro_id, y ya no está libre ni pendiente.
    const j = await ok(R, 'join_space', { p_codigo: esp.codigo_invitacion, p_nombre_visible: '', p_miembro_id: ids['Ana t'] })
    expect(j.resultado).toMatchObject({ miembro_id: ids['Ana t'], reclamo_pendiente: true, reclamo_asiento_simulado: false, ya_era_miembro: false })
    expect(j.espacio.mi_miembro_id).toBe(ids['Ana t'])
    expect(j.espacio.miembros.find((m: Json) => m.miembro_id === ids['Ana t'])).toMatchObject({ nombre: 'Ana t', pendiente: false, simulado: false, es_yo: true })
    const pv2 = await ok(E, 'preview_space_by_code', { p_codigo: esp.codigo_invitacion })
    expect(pv2.miembros.map((m: Json) => [m.nombre, m.libre])).toEqual([['Org t', false], ['Ana t', false], ['beto T', true], ['Cata t', true], ['Dos t', false]])
    // Otra sesión nueva que intente a Ana ahora: ya reclamada.
    expect(err(await rpc(await nuevaSesion(), 'join_space', { p_codigo: esp.codigo_invitacion, p_nombre_visible: '', p_miembro_id: ids['Ana t'] }))).toBe('no_autorizado/miembro_ya_reclamado')
    // Ana real opera como persona: nueva propuesta, sus condiciones cuentan.
    const p2 = await crearPropuesta(O, esp.espacio_id, esp.miembro_id, { minimo: 2, maximo: 6, titulo: 't-e9-ana' })
    await ok(R, 'save_my_conditions', { p_propuesta_id: p2, p_disponibilidad: SI })
    expect((await ok(O, 'get_proposal_state', { p_propuesta_id: p2 })).propuesta.personas_con_condiciones).toBe(1)
    for (const p of [prop, p2]) await ok(O, 'cancel_proposal', { p_propuesta_id: p })
  })

  it('validación de p_integrantes: tope 12, nombres, repetidos y choque con el organizador; sin el parámetro, igual que antes', async () => {
    const base = { p_tipo: 'amigos', p_nombre_visible: 'Org t' }
    const nombre = () => `t-e9-val-${intento().slice(0, 6)}`
    const trece = Array.from({ length: 13 }, (_, i) => `Int ${i}`)
    expect(err(await rpc(O, 'create_space', { ...base, p_nombre: nombre(), p_integrantes: trece }))).toBe('entrada_incompleta/formato_invalido')
    expect(err(await rpc(O, 'create_space', { ...base, p_nombre: nombre(), p_integrantes: ['Ana t', ' '] }))).toBe('entrada_incompleta/campo_faltante')
    expect(err(await rpc(O, 'create_space', { ...base, p_nombre: nombre(), p_integrantes: ['x'.repeat(31)] }))).toBe('entrada_incompleta/formato_invalido')
    expect(err(await rpc(O, 'create_space', { ...base, p_nombre: nombre(), p_integrantes: ['Ana t', 'ANA  t'] }))).toBe('entrada_incompleta/nombre_en_uso')
    expect(err(await rpc(O, 'create_space', { ...base, p_nombre: nombre(), p_integrantes: ['org T'] }))).toBe('entrada_incompleta/nombre_en_uso')
    // Ninguno de los rechazos creó un espacio.
    const mios = (await ok(O, 'list_my_spaces')).espacios.filter((e: Json) => String(e.nombre).startsWith('t-e9-val-'))
    expect(mios).toEqual([])
    // Doce justos pasan; sin p_integrantes, la respuesta de siempre más `pendientes: []`.
    const doce = await ok(O, 'create_space', { ...base, p_nombre: nombre(), p_integrantes: trece.slice(0, 12) })
    expect(doce.resultado.pendientes).toHaveLength(12)
    const sin = await ok(O, 'create_space', { ...base, p_nombre: nombre() })
    expect(sin.resultado.pendientes).toEqual([])
    expect(Object.keys(sin.resultado).sort()).toEqual(['codigo_invitacion', 'espacio_id', 'miembro_id', 'pendientes'])
    expect(sin.espacio.miembros).toHaveLength(1)
  })
})
