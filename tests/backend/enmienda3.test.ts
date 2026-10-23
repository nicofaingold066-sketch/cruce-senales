// Enmienda 3 (docs/contrato-enmienda-3.md): siguiente_accion personal, lista cerrada de códigos y
// simulate_load_case atómico. Demo propio de una sesión de prueba (nunca el demo real) y espacios "t-".
import { beforeAll, describe, expect, it } from 'vitest'
import {
  CODIGOS_SIGUIENTE, crearEspacioPrueba, crearPropuesta, err, intento, nuevaSesion, ok, rpc, type Json, type Sesion,
} from './helpers'

const NOMBRES_CASO = ['Luna', 'Mati', 'Caro', 'Fede', 'Sofi']

describe('enmienda 3', { timeout: 90_000 }, () => {
  let O: Sesion // Tomi, organizador del demo
  let U: Sesion // invitado real
  let demo: Json
  let codigos: Set<string>

  const estado = async (s: Sesion, prop: string) => (await ok(s, 'get_proposal_state', { p_propuesta_id: prop })).propuesta
  const mirar = (p: Json) => {
    codigos.add(p.siguiente_accion.codigo)
    expect(CODIGOS_SIGUIENTE).toContain(p.siguiente_accion.codigo)
    return p.siguiente_accion
  }

  beforeAll(async () => {
    ;[O, U] = await Promise.all([nuevaSesion(), nuevaSesion()])
    demo = (await ok(O, 'seed_demo_space')).espacio
    codigos = new Set()
  }, 60_000)

  it('simulate_load_case: carga el caso canónico en una transacción, un solo state_rev, idempotente', async () => {
    const prop = await crearPropuesta(O, demo.id, demo.mi_miembro_id, { titulo: 't-e3-carga' })
    const antes = await estado(O, prop)
    expect(mirar(antes).codigo).toBe('reunir_condiciones')

    // Doble clic concurrente con el mismo intento: una sola carga.
    const i = intento()
    const [a, b] = await Promise.all([
      rpc(O, 'simulate_load_case', { p_propuesta_id: prop, p_intento_id: i }),
      rpc(O, 'simulate_load_case', { p_propuesta_id: prop, p_intento_id: i }),
    ])
    expect(a.ok && b.ok).toBe(true)
    expect([a.resultado.repetido, b.resultado.repetido].sort()).toEqual([false, true])
    const r = a.resultado.repetido ? b : a
    expect(r.resultado.cargados.map((m: Json) => m.nombre)).toEqual(NOMBRES_CASO)
    expect(r.resultado.omitidos).toEqual([])
    expect(r.propuesta.state_rev).toBe(antes.state_rev + 1)
    expect(r.propuesta.personas_con_condiciones).toBe(5)
    const despues = await estado(O, prop)
    expect(despues.state_rev).toBe(antes.state_rev + 1) // la repetición no sumó otro incremento

    // El panel del organizador muestra las condiciones del caso a cada simulado.
    const panel = await ok(O, 'get_simulation_panel', { p_propuesta_id: prop })
    const disp = Object.fromEntries(panel.simulacion.miembros.map((m: Json) => [m.miembro.nombre, m.condiciones.disponibilidad]))
    expect(disp).toEqual({
      Luna: { A: 'si', B: 'si' }, Mati: { A: 'si', B: 'si' }, Caro: { A: 'si', B: 'no' },
      Fede: { A: 'no', B: 'si' }, Sofi: { A: 'no', B: 'si' },
    })
    // El organizador ya puede buscar opción (5 con condiciones, mínimo 4).
    expect(mirar(despues)).toEqual({ codigo: 'buscar_opcion', texto: 'Ya hay 5 personas con condiciones. Busca una opción compatible.' })

    // Mismo intento con otra propuesta: intento_reutilizado.
    const otra = await crearPropuesta(O, demo.id, demo.mi_miembro_id, { titulo: 't-e3-otra' })
    expect(err(await rpc(O, 'simulate_load_case', { p_propuesta_id: otra, p_intento_id: i }))).toBe('entrada_incompleta/intento_reutilizado')
    await ok(O, 'cancel_proposal', { p_propuesta_id: otra })

    // Con versión publicada, los elegibles quedan congelados y se informan como omitidos.
    await ok(O, 'save_my_conditions', { p_propuesta_id: prop, p_disponibilidad: { A: 'si', B: 'si' } })
    const ev = await ok(O, 'evaluate_and_publish', { p_propuesta_id: prop, p_intento_id: intento() })
    expect(ev.resultado).toMatchObject({ version: 1, franja: 'A' })
    const r2 = await ok(O, 'simulate_load_case', { p_propuesta_id: prop, p_intento_id: intento() })
    expect(r2.resultado.cargados.map((m: Json) => m.nombre)).toEqual(['Fede', 'Sofi'])
    expect(r2.resultado.omitidos.map((o: Json) => [o.miembro.nombre, o.motivo])).toEqual([
      ['Luna', 'condiciones_congeladas'], ['Mati', 'condiciones_congeladas'], ['Caro', 'condiciones_congeladas'],
    ])
    expect(r2.propuesta.state_rev).toBe(ev.propuesta.state_rev + 1)
    await ok(O, 'cancel_proposal', { p_propuesta_id: prop })
  })

  it('simulate_load_case: solo el organizador y solo en demo', async () => {
    const prop = await crearPropuesta(O, demo.id, demo.mi_miembro_id, { titulo: 't-e3-permisos' })
    await ok(U, 'join_space', { p_codigo: demo.codigo_invitacion, p_nombre_visible: 'Invitado e3 t' })
    const noOrg = await rpc(U, 'simulate_load_case', { p_propuesta_id: prop, p_intento_id: intento() })
    expect(err(noOrg)).toBe('no_autorizado/no_es_organizador_espacio')
    const ajeno = await rpc(await nuevaSesion(), 'simulate_load_case', { p_propuesta_id: prop, p_intento_id: intento() })
    expect(err(ajeno)).toBe('fuera_de_audiencia/no_miembro')
    expect(ajeno.state_rev).toBeNull()
    const esp = await crearEspacioPrueba(O, 'e3-no-demo', 'Org t')
    const p2 = await crearPropuesta(O, esp.espacioId, esp.miembroId, { titulo: 't-e3-no-demo' })
    expect(err(await rpc(O, 'simulate_load_case', { p_propuesta_id: p2, p_intento_id: intento() }))).toBe('no_autorizado/espacio_no_demo')
    // Ningún rechazo cambió la propuesta.
    expect((await estado(O, prop)).personas_con_condiciones).toBe(0)
    await ok(O, 'cancel_proposal', { p_propuesta_id: prop })
  })

  it('siguiente_accion personal: te_toca_aceptar, ya_aceptaste y grupo_confirmado; nada privado', async () => {
    const prop = await crearPropuesta(O, demo.id, demo.mi_miembro_id, { titulo: 't-e3-personal', minimo: 4, maximo: 6 })
    await ok(O, 'simulate_load_case', { p_propuesta_id: prop, p_intento_id: intento() })
    await ok(O, 'save_my_conditions', { p_propuesta_id: prop, p_disponibilidad: { A: 'si', B: 'si' } })
    await ok(U, 'save_my_conditions', { p_propuesta_id: prop, p_disponibilidad: { A: 'si', B: 'no' } })
    await ok(O, 'evaluate_and_publish', { p_propuesta_id: prop, p_intento_id: intento() })

    // Quien no es elegible (Fede, Sofi: solo B) no está en la sesión; un elegible real ve que le toca.
    expect(mirar(await estado(U, prop))).toEqual({ codigo: 'te_toca_aceptar', texto: 'Te toca confirmar la versión 1.' })
    const a = await ok(U, 'accept_version', { p_propuesta_id: prop, p_version: 1, p_intento_id: intento() })
    expect(mirar(a.propuesta)).toEqual({ codigo: 'ya_aceptaste', texto: 'Ya confirmaste la versión 1. Faltan 3 para el mínimo.' })

    const ids = Object.fromEntries(demo.miembros.map((m: Json) => [m.nombre, m.miembro_id]))
    for (const n of ['Luna', 'Mati', 'Caro']) {
      await ok(O, 'simulate_accept', { p_propuesta_id: prop, p_miembro_id: ids[n], p_version: 1, p_intento_id: intento() })
    }
    // Mínimo alcanzado pero falta el anfitrión.
    const u = await estado(U, prop)
    expect(u.estado).toBe('esperando_compromisos')
    expect(mirar(u)).toEqual({ codigo: 'ya_aceptaste', texto: 'Ya confirmaste la versión 1. Falta la aceptación de Tomi.' })
    expect(mirar(await estado(O, prop)).codigo).toBe('te_toca_aceptar')

    const fin = await ok(O, 'accept_version', { p_propuesta_id: prop, p_version: 1, p_intento_id: intento() })
    expect(mirar(fin.propuesta).codigo).toBe('grupo_confirmado')
    const vu = await estado(U, prop)
    expect(mirar(vu).codigo).toBe('grupo_confirmado')
    // list_proposals usa la misma siguiente_accion personal.
    const lista = (await ok(U, 'list_proposals', { p_espacio_id: demo.id })).propuestas.find((p: Json) => p.id === prop)
    expect(lista.siguiente_accion).toEqual(vu.siguiente_accion)
    // Nada privado en la vista de U.
    expect(JSON.stringify(vu)).not.toContain('"disponibilidad":')
    expect(JSON.stringify(vu)).not.toMatch(/"(si|no|pendiente)"/)

    // Baja que rompe el mínimo: buscar_alternativa; cancelar: cancelado.
    const b = await ok(O, 'simulate_withdraw', { p_propuesta_id: prop, p_miembro_id: ids.Caro })
    expect(b.propuesta.estado).toBe('grupo_confirmado') // quedan 4 con el anfitrión: acuerdo conservado
    await ok(O, 'simulate_withdraw', { p_propuesta_id: prop, p_miembro_id: ids.Mati })
    await ok(U, 'withdraw_commitment', { p_propuesta_id: prop })
    const rev = await estado(O, prop)
    expect(rev.estado).toBe('en_revision')
    expect(mirar(rev).codigo).toBe('buscar_alternativa')
    const c = await ok(O, 'cancel_proposal', { p_propuesta_id: prop })
    expect(mirar(c.propuesta).codigo).toBe('cancelado')
  })

  it('códigos observados pertenecen a la lista cerrada', () => {
    for (const c of codigos) expect(CODIGOS_SIGUIENTE).toContain(c)
    console.log('códigos observados:', [...codigos].sort().join(', '))
  })
})
