// Regresiones de la enmienda 2 (docs/contrato-enmienda-2.md), contra el proyecto real.
// A1 reserva de cupo del imprescindible · A2 reclamo de asiento simulado · A3 reinicio idempotente y
// tombstones · A4 carreras (seed/seed, create/create, reset/create, join/simulación) · A5 privilegios.
// Espacios de prueba con prefijo "t-"; los demos "Los del asado" son propios de cada sesión de prueba
// (sesiones anónimas nuevas) y nunca son el demo de los dispositivos reales.
import { beforeAll, describe, expect, it } from 'vitest'
import {
  clienteSinSesion, CONTRATO, crearEspacioPrueba, crearPropuesta, err, FRANJAS, intento, nuevaSesion, ok, PERMITIDAS,
  PLAZO, rpc, rpcCrudo, simulado, type Json, type Sesion,
} from './helpers'

const ids = (esp: Json, nombre: string): string => esp.miembros.find((m: Json) => m.nombre === nombre).miembro_id

describe('enmienda 2: regresiones A1 a A5', { timeout: 120_000 }, () => {
  let O: Sesion // organizador / anfitrión (tiene su propio demo)
  let U1: Sesion
  let U2: Sesion
  let demo: Json // espacio demo de O

  beforeAll(async () => {
    ;[O, U1, U2] = await Promise.all([nuevaSesion(), nuevaSesion(), nuevaSesion()])
    demo = (await ok(O, 'seed_demo_space')).espacio
  }, 60_000)

  // ---------------------------------------------------------------------------------------------
  it('A5: sin sesión ninguna de las 25 RPC se ejecuta; con sesión las 25 se ejecutan; helpers inaccesibles', async () => {
    const nombres = Object.keys(PERMITIDAS)
    expect(nombres).toHaveLength(25)
    const anon = clienteSinSesion()
    const sinSesion = await Promise.all(nombres.map(async (n) => [n, await rpcCrudo(anon, n, PERMITIDAS[n]())] as const))
    for (const [n, r] of sinSesion) {
      expect(r.data, n).toBeNull()
      expect(r.error?.code, n).toBe('42501') // permission denied for function
    }
    // Con sesión (rol authenticated): cada entrada se ejecuta y responde un sobre con contrato 2.
    const conSesion = await Promise.all(nombres.map(async (n) => [n, await rpcCrudo(O, n, PERMITIDAS[n]())] as const))
    for (const [n, r] of conSesion) {
      expect(r.error, n).toBeNull()
      expect(r.data?.contrato, n).toBe(CONTRATO)
    }
    // Helpers privados: no existen en public ni se exponen por el esquema cruce.
    for (const h of ['vista_propuesta', 'op_accept', 'situacion', 'verificar_privilegios', 'ok']) {
      const r = await rpcCrudo(O, h, {})
      expect(r.error?.code, h).toBe('PGRST202')
    }
    const viaEsquema = await O.c.schema('cruce').rpc('ok', { p_extra: {} })
    expect(viaEsquema.error?.code).toBe('PGRST106')
    // Tablas: ni el esquema público ni el privado responden filas.
    for (const c of [anon, U1.c]) {
      for (const t of ['espacios', 'miembros', 'condiciones', 'intentos']) {
        const a = await c.from(t).select('*')
        expect(a.error !== null || (a.data ?? []).length === 0, t).toBe(true)
      }
    }
  })

  it('A5: una sesión ajena no lee ni modifica el espacio de otro', async () => {
    const prop = await crearPropuesta(O, demo.id, demo.mi_miembro_id, { titulo: 't-ajena' })
    const antes = (await ok(O, 'get_proposal_state', { p_propuesta_id: prop })).propuesta
    const mati = ids(demo, 'Mati')
    const intentos: [string, Record<string, unknown>][] = [
      ['get_space', { p_espacio_id: demo.id }],
      ['list_proposals', { p_espacio_id: demo.id }],
      ['get_proposal_state', { p_propuesta_id: prop }],
      ['get_my_conditions', { p_propuesta_id: prop }],
      ['get_simulation_panel', { p_propuesta_id: prop }],
      ['mark_interest', { p_propuesta_id: prop, p_interesado: true }],
      ['save_my_conditions', { p_propuesta_id: prop, p_disponibilidad: { A: 'si', B: 'si' } }],
      ['simulate_save_conditions', { p_propuesta_id: prop, p_miembro_id: mati, p_disponibilidad: { A: 'si', B: 'si' } }],
      ['simulate_accept', { p_propuesta_id: prop, p_miembro_id: mati, p_version: 1, p_intento_id: intento() }],
      ['cancel_proposal', { p_propuesta_id: prop }],
      ['add_simulated_member', { p_espacio_id: demo.id, p_nombre_visible: 'Intruso' }],
      ['reset_demo', { p_espacio_id: demo.id, p_intento_id: intento() }],
    ]
    for (const [fn, args] of intentos) {
      const r = await rpc(U2, fn, args)
      expect(err(r), fn).toBe('fuera_de_audiencia/no_miembro')
      expect(r.state_rev, fn).toBeNull()
    }
    const despues = (await ok(O, 'get_proposal_state', { p_propuesta_id: prop })).propuesta
    expect(despues.state_rev).toBe(antes.state_rev)
    expect(despues.estado).toBe(antes.estado)
    await ok(O, 'cancel_proposal', { p_propuesta_id: prop })
  })

  // ---------------------------------------------------------------------------------------------
  it('A1: mínimo 2, máximo 2, tres elegibles; dos invitados compiten, el anfitrión acepta último y confirma', async () => {
    const esp = await crearEspacioPrueba(O, 'a1-reserva', 'Anfitrion t')
    await ok(U1, 'join_space', { p_codigo: esp.codigo, p_nombre_visible: 'Invitado uno t' })
    await ok(U2, 'join_space', { p_codigo: esp.codigo, p_nombre_visible: 'Invitado dos t' })
    const prop = await crearPropuesta(O, esp.espacioId, esp.miembroId, { minimo: 2, maximo: 2 })
    for (const s of [O, U1, U2]) await ok(s, 'save_my_conditions', { p_propuesta_id: prop, p_disponibilidad: { A: 'si', B: 'si' } })
    const ev = await ok(O, 'evaluate_and_publish', { p_propuesta_id: prop, p_intento_id: intento() })
    expect(ev.propuesta.opcion.cupos).toMatchObject({
      minimo: 2, maximo: 2, confirmados: 0, disponibles: 2, pendientes: 3,
      reservado_imprescindible: true, libres_para_otros: 1, imprescindible_acepto: false,
    })

    // Los dos invitados aceptan a la vez: solo uno ocupa el cupo libre.
    const [r1, r2] = await Promise.all([
      rpc(U1, 'accept_version', { p_propuesta_id: prop, p_version: 1, p_intento_id: intento() }),
      rpc(U2, 'accept_version', { p_propuesta_id: prop, p_version: 1, p_intento_id: intento() }),
    ])
    expect([err(r1), err(r2)].sort()).toEqual(['cupo_completo/reservado_imprescindible', 'ok'])
    const perdedor = err(r1) === 'ok' ? U2 : U1
    const rechazo = err(r1) === 'ok' ? r2 : r1
    expect(rechazo.error.mensaje).toBe('El cupo que queda está reservado para la persona imprescindible.')
    const vp = (await ok(perdedor, 'get_proposal_state', { p_propuesta_id: prop })).propuesta
    expect(vp.confirmados).toBe(1)
    expect(vp.opcion.cupos).toMatchObject({ disponibles: 1, libres_para_otros: 0, reservado_imprescindible: true })
    expect(vp.mi_situacion.puede.aceptar).toBe(false)
    expect(vp.mi_situacion.motivo_aceptar).toBe('cupo_reservado')
    expect(vp.estado).toBe('esperando_compromisos')
    // El anfitrión no recibe cupo_completo por culpa de los invitados.
    const vo = (await ok(O, 'get_proposal_state', { p_propuesta_id: prop })).propuesta
    expect(vo.mi_situacion.puede.aceptar).toBe(true)
    expect(vo.mi_situacion.motivo_aceptar).toBeNull()

    const fin = await ok(O, 'accept_version', { p_propuesta_id: prop, p_version: 1, p_intento_id: intento() })
    expect(fin.resultado).toMatchObject({ grupo_confirmado: true, repetido: false })
    expect(fin.propuesta.estado).toBe('grupo_confirmado')
    expect(fin.propuesta.opcion.cupos).toMatchObject({
      confirmados: 2, disponibles: 0, reservado_imprescindible: false, libres_para_otros: 0, imprescindible_acepto: true,
    })
    // Ya sin reserva, el cupo está completo de verdad.
    expect(err(await rpc(perdedor, 'accept_version', { p_propuesta_id: prop, p_version: 1, p_intento_id: intento() })))
      .toBe('cupo_completo/sin_cupo')
  })

  it('A1: si el imprescindible se retira, desaparece la reserva y la propuesta pasa a revisión', async () => {
    const esp = await crearEspacioPrueba(O, 'a1-retiro', 'Anfitrion t')
    const [s1, s2] = await Promise.all(['S1 t', 'S2 t'].map((n) => simulado(O, esp.espacioId, n)))
    const prop = await crearPropuesta(O, esp.espacioId, esp.miembroId, { minimo: 2, maximo: 3 })
    await ok(O, 'save_my_conditions', { p_propuesta_id: prop, p_disponibilidad: { A: 'si', B: 'si' } })
    for (const id of [s1, s2]) await ok(O, 'simulate_save_conditions', { p_propuesta_id: prop, p_miembro_id: id, p_disponibilidad: { A: 'si', B: 'si' } })
    await ok(O, 'evaluate_and_publish', { p_propuesta_id: prop, p_intento_id: intento() })
    await ok(O, 'simulate_accept', { p_propuesta_id: prop, p_miembro_id: s1, p_version: 1, p_intento_id: intento() })
    const b = await ok(O, 'withdraw_commitment', { p_propuesta_id: prop })
    expect(b.resultado.efecto).toBe('pasa_a_revision')
    expect(b.propuesta.estado).toBe('en_revision')
    expect(b.propuesta.opcion.cupos.reservado_imprescindible).toBe(false)
  })

  // ---------------------------------------------------------------------------------------------
  it('A2: reclamo tardío de un asiento usado se rechaza; entrar con otro nombre no hereda nada', async () => {
    const prop = await crearPropuesta(O, demo.id, demo.mi_miembro_id, { minimo: 2, maximo: 6, titulo: 't-a2' })
    const mati = ids(demo, 'Mati')
    await ok(O, 'save_my_conditions', { p_propuesta_id: prop, p_disponibilidad: { A: 'si', B: 'si' } })
    await ok(O, 'simulate_save_conditions', { p_propuesta_id: prop, p_miembro_id: mati, p_disponibilidad: { A: 'si', B: 'no' } })
    await ok(O, 'evaluate_and_publish', { p_propuesta_id: prop, p_intento_id: intento() })
    await ok(O, 'simulate_accept', { p_propuesta_id: prop, p_miembro_id: mati, p_version: 1, p_intento_id: intento() })

    const tarde = await rpc(U1, 'join_space', { p_codigo: demo.codigo_invitacion, p_nombre_visible: 'mati' })
    expect(err(tarde)).toBe('asiento_en_uso/asiento_en_uso')
    expect(tarde.error.mensaje).toBe('Ese asiento ya tiene actividad simulada. Únete con otro nombre visible.')
    // El asiento sigue simulado y su evento histórico conserva el origen simulación.
    const st = (await ok(O, 'get_proposal_state', { p_propuesta_id: prop })).propuesta
    const ev = st.historial.find((e: Json) => e.tipo === 'aceptacion' && e.actor.miembro_id === mati)
    expect(ev).toMatchObject({ actor_tipo: 'simulacion', origen: 'simulacion', actor: { simulado: true } })
    expect(err(await rpc(U1, 'get_space', { p_espacio_id: demo.id }))).toBe('fuera_de_audiencia/no_miembro')
    // Otro nombre: miembro real nuevo, sin condiciones ni aceptaciones heredadas.
    const nuevo = await ok(U1, 'join_space', { p_codigo: demo.codigo_invitacion, p_nombre_visible: 'Mati real t' })
    expect(nuevo.resultado).toMatchObject({ reclamo_asiento_simulado: false, ya_era_miembro: false })
    expect(nuevo.resultado.miembro_id).not.toBe(mati)
    const mias = await ok(U1, 'get_my_conditions', { p_propuesta_id: prop })
    expect(mias.condiciones.estado).toBe('sin_cargar')
    const su = (await ok(U1, 'get_proposal_state', { p_propuesta_id: prop })).propuesta.mi_situacion
    expect(su).toMatchObject({ acepte_version: false, elegible_en_version: false, condiciones: 'sin_cargar' })
    await ok(O, 'cancel_proposal', { p_propuesta_id: prop })
  })

  it('A2/A4: reclamo concurrente con simulate_save_conditions y con simulate_accept nunca hereda compromisos', async () => {
    const prop = await crearPropuesta(O, demo.id, demo.mi_miembro_id, { minimo: 2, maximo: 6, titulo: 't-a2-carrera' })
    const caro = ids(demo, 'Caro')
    const fede = ids(demo, 'Fede')
    const tercero = await nuevaSesion()

    // Carrera 1: reclamo de Caro (sin uso previo) contra simulate_save_conditions sobre Caro.
    const [j, s] = await Promise.all([
      rpc(tercero, 'join_space', { p_codigo: demo.codigo_invitacion, p_nombre_visible: 'Caro' }),
      rpc(O, 'simulate_save_conditions', { p_propuesta_id: prop, p_miembro_id: caro, p_disponibilidad: { A: 'si', B: 'no' } }),
    ])
    const r1 = [err(j), err(s)]
    if (j.ok) {
      expect(j.resultado.reclamo_asiento_simulado).toBe(true)
      expect(err(s)).toBe('no_autorizado/miembro_no_simulado')
      const mias = await ok(tercero, 'get_my_conditions', { p_propuesta_id: prop })
      expect(mias.condiciones.estado).toBe('sin_cargar') // no heredó nada
    } else {
      expect(err(j)).toBe('asiento_en_uso/asiento_en_uso')
      expect(s.ok).toBe(true)
      const e = (await ok(O, 'get_space', { p_espacio_id: demo.id })).espacio
      expect(e.miembros.find((m: Json) => m.miembro_id === caro).simulado).toBe(true)
    }

    // Carrera 2: Fede ya es elegible en la versión publicada; el reclamo pierde siempre.
    await ok(O, 'save_my_conditions', { p_propuesta_id: prop, p_disponibilidad: { A: 'no', B: 'si' } })
    await ok(O, 'simulate_save_conditions', { p_propuesta_id: prop, p_miembro_id: fede, p_disponibilidad: { A: 'no', B: 'si' } })
    await ok(O, 'evaluate_and_publish', { p_propuesta_id: prop, p_intento_id: intento() })
    const [j2, a2] = await Promise.all([
      rpc(U2, 'join_space', { p_codigo: demo.codigo_invitacion, p_nombre_visible: 'Fede' }),
      rpc(O, 'simulate_accept', { p_propuesta_id: prop, p_miembro_id: fede, p_version: 1, p_intento_id: intento() }),
    ])
    expect(err(j2)).toBe('asiento_en_uso/asiento_en_uso')
    expect(a2.ok).toBe(true)
    expect(j.ok && s.ok).toBe(false)
    console.log('A2 carreras:', JSON.stringify({ carrera1: r1, carrera2: [err(j2), err(a2)] }))
    await ok(O, 'cancel_proposal', { p_propuesta_id: prop })
  })

  // ---------------------------------------------------------------------------------------------
  it('A3: repetir el MISMO reinicio no borra la propuesta nueva; repetir una creación vieja da intento_obsoleto', async () => {
    const g0 = (await ok(O, 'get_space', { p_espacio_id: demo.id })).espacio.generacion as number

    // (1) reinicio -> propuesta nueva -> repetición del mismo reinicio
    const ir = intento()
    const r = await ok(O, 'reset_demo', { p_espacio_id: demo.id, p_intento_id: ir })
    expect(r.resultado).toMatchObject({ generacion: g0 + 1, repetido: false })
    expect(r.generacion).toBe(g0 + 1)
    const nueva = await crearPropuesta(O, demo.id, demo.mi_miembro_id, { titulo: 't-a3-nueva' })
    const rep = await ok(O, 'reset_demo', { p_espacio_id: demo.id, p_intento_id: ir })
    expect(rep.resultado).toMatchObject({ repetido: true, generacion: g0 + 1, propuestas_eliminadas: r.resultado.propuestas_eliminadas })
    expect(rep.espacio.generacion).toBe(g0 + 1)
    expect((await ok(O, 'get_proposal_state', { p_propuesta_id: nueva })).propuesta.id).toBe(nueva)
    // Mismo intento de reinicio con otro espacio: intento_reutilizado.
    const otro = await crearEspacioPrueba(O, 'a3-otro', 'Org t')
    expect(err(await rpc(O, 'reset_demo', { p_espacio_id: otro.espacioId, p_intento_id: ir }))).toBe('entrada_incompleta/intento_reutilizado')

    // (2) crear -> reiniciar -> repetir la creación vieja
    const ic = intento()
    const args = {
      p_espacio_id: demo.id, p_titulo: 't-a3-vieja', p_franjas: FRANJAS, p_minimo: 2, p_maximo: 6,
      p_imprescindible_id: demo.mi_miembro_id, p_plazo: PLAZO, p_zona_horaria: 'America/Santiago', p_intento_id: ic,
    }
    const vieja = await ok(O, 'create_proposal', args)
    await ok(O, 'reset_demo', { p_espacio_id: demo.id, p_intento_id: intento() })
    const obs = await rpc(O, 'create_proposal', args)
    expect(err(obs)).toBe('intento_obsoleto/intento_obsoleto')
    expect(obs.contrato).toBe(CONTRATO)
    expect(err(await rpc(O, 'get_proposal_state', { p_propuesta_id: vieja.resultado.propuesta_id }))).toBe('fuera_de_audiencia/no_miembro')
    expect((await ok(O, 'list_proposals', { p_espacio_id: demo.id })).propuestas).toEqual([])
    const lista = (await ok(O, 'list_my_spaces')).espacios.find((e: Json) => e.id === demo.id)
    expect(lista.generacion).toBe(g0 + 2)
  })

  // ---------------------------------------------------------------------------------------------
  it('A4: seed/seed concurrentes dejan un solo demo; create/create con el mismo intento, una sola propuesta', async () => {
    const [a, b] = await Promise.all([rpc(U2, 'seed_demo_space'), rpc(U2, 'seed_demo_space')])
    expect(a.ok && b.ok).toBe(true)
    expect(a.resultado.espacio_id).toBe(b.resultado.espacio_id)
    expect([a.resultado.creado, b.resultado.creado].sort()).toEqual([false, true])
    const demos = (await ok(U2, 'list_my_spaces')).espacios.filter((e: Json) => e.demo && e.mi_rol === 'organizador')
    expect(demos).toHaveLength(1)

    const esp = await crearEspacioPrueba(O, 'a4-create', 'Org t')
    const i = intento()
    const args = {
      p_espacio_id: esp.espacioId, p_titulo: 't-a4', p_franjas: FRANJAS, p_minimo: 2, p_maximo: 4,
      p_imprescindible_id: esp.miembroId, p_plazo: PLAZO, p_zona_horaria: 'America/Santiago', p_intento_id: i,
    }
    const [c1, c2] = await Promise.all([rpc(O, 'create_proposal', args), rpc(O, 'create_proposal', args)])
    expect(c1.ok && c2.ok).toBe(true)
    expect(c1.resultado.propuesta_id).toBe(c2.resultado.propuesta_id)
    expect([c1.resultado.repetido, c2.resultado.repetido].sort()).toEqual([false, true])
    expect((await ok(O, 'list_proposals', { p_espacio_id: esp.espacioId })).propuestas).toHaveLength(1)
  })

  it('A4: reset/create concurrentes terminan en un estado coherente', async () => {
    const g0 = (await ok(O, 'get_space', { p_espacio_id: demo.id })).espacio.generacion as number
    const ic = intento()
    const args = {
      p_espacio_id: demo.id, p_titulo: 't-a4-carrera', p_franjas: FRANJAS, p_minimo: 2, p_maximo: 6,
      p_imprescindible_id: demo.mi_miembro_id, p_plazo: PLAZO, p_zona_horaria: 'America/Santiago', p_intento_id: ic,
    }
    const [r, c] = await Promise.all([
      rpc(O, 'reset_demo', { p_espacio_id: demo.id, p_intento_id: intento() }),
      rpc(O, 'create_proposal', args),
    ])
    expect(r.ok && c.ok).toBe(true)
    expect(r.generacion).toBe(g0 + 1)
    const vivas = (await ok(O, 'list_proposals', { p_espacio_id: demo.id })).propuestas.map((p: Json) => p.id)
    const otra = await rpc(O, 'create_proposal', args)
    if (vivas.includes(c.resultado.propuesta_id)) {
      // El reinicio ocurrió primero: la propuesta es de la generación nueva y el reintento la recupera.
      expect(otra.resultado).toMatchObject({ propuesta_id: c.resultado.propuesta_id, repetido: true })
    } else {
      // La creación ocurrió primero y el reinicio la borró: el reintento no la resucita.
      expect(vivas).toEqual([])
      expect(err(otra)).toBe('intento_obsoleto/intento_obsoleto')
    }
    console.log('A4 reset/create:', vivas.includes(c.resultado.propuesta_id) ? 'reinicio primero' : 'creación primero')
  })
})
