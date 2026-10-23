// Enmienda 9 (docs/contrato-enmienda-9.md, mejora #70): entrada por lista de integrantes.
// Fase 1 (0032): preview_space_by_code y join_space con p_miembro_id. Fase 2 (0033): integrantes pendientes.
// Demo propio de una sesión de prueba (nunca el demo de otros) y espacios "t-e9-...". Pocas sesiones, reutilizadas.
import { beforeAll, describe, expect, it } from 'vitest'
import {
  clienteSinSesion, crearEspacioPrueba, crearPropuesta, demoPrueba, err, intento, nuevaSesion, ok, PERMITIDAS, rpc,
  rpcCrudo, type Json, type Sesion,
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
    expect(r.espacio).toEqual({ nombre: 'Los del asado', demo: true })
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
    expect(Object.keys(PERMITIDAS)).toHaveLength(31)
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
