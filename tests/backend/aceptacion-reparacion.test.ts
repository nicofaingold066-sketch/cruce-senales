// Pruebas críticas: confirmación solo con anfitrión, doble clic, último cupo con sesiones concurrentes,
// baja a revisión, reparación sin aceptaciones heredadas, versión vieja, sin alternativa,
// baja que conserva el acuerdo y plazo vencido. Espacios propios con prefijo "t-"; las pruebas con simulados
// usan el demo propio de la sesión O (enmienda 7, E7.3: la simulación solo existe en espacios demo).
import { beforeAll, describe, expect, it } from 'vitest'
import {
  crearEspacioPrueba, crearPropuesta, demoPrueba, err, esperar, FRANJAS, intento, nuevaSesion, ok, rpc, simulado,
  type Json, type Sesion,
} from './helpers'

describe('aceptación, baja y reparación', { timeout: 90_000 }, () => {
  let O: Sesion // organizador e imprescindible
  let U1: Sesion
  let U2: Sesion

  beforeAll(async () => {
    ;[O, U1, U2] = await Promise.all([nuevaSesion(), nuevaSesion(), nuevaSesion()])
  }, 60_000)

  it('confirmación solo con el imprescindible (mínimo 3) y doble clic sin duplicar', async () => {
    const esp = await demoPrueba(O) // E7.3: con simulados, el demo propio de O (anfitrión = organizador)
    const u1 = (await ok(U1, 'join_space', { p_codigo: esp.codigo, p_nombre_visible: 'Uno t' })).resultado.miembro_id
    const s = await Promise.all(['S1 t', 'S2 t', 'S3 t'].map((n) => simulado(O, esp.espacioId, n)))
    const prop = await crearPropuesta(O, esp.espacioId, esp.miembroId, { minimo: 3, maximo: 6 })
    await ok(O, 'save_my_conditions', { p_propuesta_id: prop, p_disponibilidad: { A: 'si', B: 'si' } })
    await ok(U1, 'save_my_conditions', { p_propuesta_id: prop, p_disponibilidad: { A: 'si', B: 'no' } })
    for (const id of s) {
      await ok(O, 'simulate_save_conditions', { p_propuesta_id: prop, p_miembro_id: id, p_disponibilidad: { A: 'si', B: 'si' } })
    }
    // Doble clic en evaluar: una sola versión.
    const ie = intento()
    const [e1, e2] = await Promise.all([
      rpc(O, 'evaluate_and_publish', { p_propuesta_id: prop, p_intento_id: ie }),
      rpc(O, 'evaluate_and_publish', { p_propuesta_id: prop, p_intento_id: ie }),
    ])
    expect(e1.ok && e2.ok).toBe(true)
    expect([e1.resultado.repetido, e2.resultado.repetido].sort()).toEqual([false, true])
    expect(e1.resultado.version).toBe(1)
    expect(e2.resultado.version).toBe(1)

    // Tres no imprescindibles aceptan: mínimo alcanzado, pero sigue esperando al anfitrión.
    let r: Json
    for (const id of s) r = await ok(O, 'simulate_accept', { p_propuesta_id: prop, p_miembro_id: id, p_version: 1, p_intento_id: intento() })
    expect(r.propuesta.estado).toBe('esperando_compromisos')
    expect(r.propuesta.opcion.cupos.faltan_para_minimo).toBe(0)
    expect(r.propuesta.opcion.cupos.imprescindible_acepto).toBe(false)
    // Enmienda 3: siguiente_accion es personal; el anfitrión (que puede aceptar) ve que le toca.
    expect(r.propuesta.siguiente_accion).toEqual({ codigo: 'te_toca_aceptar', texto: 'Te toca confirmar la versión 1.' })

    // Doble clic de U1 (mismo intento, concurrente): una sola aceptación.
    const iu = intento()
    const [a, b] = await Promise.all([
      rpc(U1, 'accept_version', { p_propuesta_id: prop, p_version: 1, p_intento_id: iu }),
      rpc(U1, 'accept_version', { p_propuesta_id: prop, p_version: 1, p_intento_id: iu }),
    ])
    expect(a.ok && b.ok).toBe(true)
    expect([a.resultado.repetido, b.resultado.repetido].sort()).toEqual([false, true])
    let st = (await ok(O, 'get_proposal_state', { p_propuesta_id: prop })).propuesta
    expect(st.confirmados).toBe(4)
    expect(st.estado).toBe('esperando_compromisos')
    const evU1 = st.historial.filter((e: Json) => e.tipo === 'aceptacion' && e.actor?.miembro_id === u1)
    expect(evU1).toHaveLength(1)
    // Tercer clic con intento nuevo: ok, repetido, sin cambios.
    const c = await ok(U1, 'accept_version', { p_propuesta_id: prop, p_version: 1, p_intento_id: intento() })
    expect(c.resultado.repetido).toBe(true)
    expect(c.propuesta.state_rev).toBe(st.state_rev)
    expect(c.propuesta.confirmados).toBe(4)
    // Mismo intento con otro contenido: rechazado.
    expect(err(await rpc(U1, 'accept_version', { p_propuesta_id: prop, p_version: 2, p_intento_id: iu })))
      .toBe('entrada_incompleta/intento_reutilizado')

    // Acepta el imprescindible: recién ahora grupo confirmado.
    const fin = await ok(O, 'accept_version', { p_propuesta_id: prop, p_version: 1, p_intento_id: intento() })
    expect(fin.resultado.grupo_confirmado).toBe(true)
    expect(fin.propuesta.estado).toBe('grupo_confirmado')
    st = (await ok(U1, 'get_proposal_state', { p_propuesta_id: prop })).propuesta
    expect(st.estado).toBe('grupo_confirmado')
    expect(st.opcion.cupos.imprescindible_acepto).toBe(true)
  })

  it('último cupo con dos sesiones concurrentes: un ok y un cupo_completo', async () => {
    const esp = await crearEspacioPrueba(O, 'ultimo-cupo', 'Org t')
    await ok(U1, 'join_space', { p_codigo: esp.codigo, p_nombre_visible: 'U1 t' })
    await ok(U2, 'join_space', { p_codigo: esp.codigo, p_nombre_visible: 'U2 t' })
    const prop = await crearPropuesta(O, esp.espacioId, esp.miembroId, { minimo: 2, maximo: 2 })
    for (const s of [O, U1, U2]) await ok(s, 'save_my_conditions', { p_propuesta_id: prop, p_disponibilidad: { A: 'si', B: 'si' } })
    const ev = await ok(O, 'evaluate_and_publish', { p_propuesta_id: prop, p_intento_id: intento() })
    expect(ev.propuesta.opcion.cupos.pendientes).toBe(3) // la foto puede superar el máximo
    await ok(O, 'accept_version', { p_propuesta_id: prop, p_version: 1, p_intento_id: intento() })

    const [r1, r2] = await Promise.all([
      rpc(U1, 'accept_version', { p_propuesta_id: prop, p_version: 1, p_intento_id: intento() }),
      rpc(U2, 'accept_version', { p_propuesta_id: prop, p_version: 1, p_intento_id: intento() }),
    ])
    const res = [err(r1), err(r2)].sort()
    expect(res).toEqual(['cupo_completo/sin_cupo', 'ok'])
    const st = (await ok(O, 'get_proposal_state', { p_propuesta_id: prop })).propuesta
    expect(st.confirmados).toBe(2)
    expect(st.opcion.cupos.disponibles).toBe(0)
    expect(st.estado).toBe('grupo_confirmado')
  })

  it('baja a revisión, reparación sin heredadas, versión vieja y baja que conserva el acuerdo', async () => {
    const esp = await demoPrueba(O) // E7.3
    const [luna, mati, caro, fede, sofi] = await Promise.all(
      ['Luna t', 'Mati t', 'Caro t', 'Fede t', 'Sofi t'].map((n) => simulado(O, esp.espacioId, n)),
    )
    const prop = await crearPropuesta(O, esp.espacioId, esp.miembroId, { minimo: 4, maximo: 6 })
    await ok(O, 'save_my_conditions', { p_propuesta_id: prop, p_disponibilidad: { A: 'si', B: 'si' } })
    const cond: [string, Json][] = [
      [luna, { A: 'si', B: 'si' }], [mati, { A: 'si', B: 'si' }], [caro, { A: 'si', B: 'no' }],
      [fede, { A: 'no', B: 'si' }], [sofi, { A: 'no', B: 'si' }],
    ]
    for (const [id, d] of cond) await ok(O, 'simulate_save_conditions', { p_propuesta_id: prop, p_miembro_id: id, p_disponibilidad: d })
    const ev = await ok(O, 'evaluate_and_publish', { p_propuesta_id: prop, p_intento_id: intento() })
    expect(ev.resultado).toMatchObject({ version: 1, franja: 'A' })
    expect(ev.propuesta.opcion.cupos.pendientes).toBe(4)
    for (const id of [luna, mati, caro]) await ok(O, 'simulate_accept', { p_propuesta_id: prop, p_miembro_id: id, p_version: 1, p_intento_id: intento() })
    const conf = await ok(O, 'accept_version', { p_propuesta_id: prop, p_version: 1, p_intento_id: intento() })
    expect(conf.propuesta.estado).toBe('grupo_confirmado')

    // Caro se baja: en revisión, baja registrada, Caro no vuelve a ser elegible. Enmienda 13 (c): ni el organizador
    // ve quién se bajó ni si había confirmado (solo el total).
    const ANON = { miembro_id: null, nombre: 'Una persona', simulado: false }
    const baja = await ok(O, 'simulate_withdraw', { p_propuesta_id: prop, p_miembro_id: caro })
    expect(baja.resultado).toMatchObject({ efecto: 'pasa_a_revision', simulado: true, repetido: false })
    expect(baja.propuesta.estado).toBe('en_revision')
    expect(baja.propuesta.confirmados).toBe(3)
    expect(baja.propuesta.bajas).toHaveLength(1)
    expect(baja.propuesta.bajas[0]).toMatchObject({ miembro: ANON, version: 1, habia_aceptado: null })
    expect(JSON.stringify(baja.propuesta)).not.toContain(caro)
    const evBaja = baja.propuesta.historial.at(-1)
    // 0047: la baja de otra persona tampoco dice si fue simulada ni quién la ejecutó, ni el cambio de estado.
    expect(evBaja).toMatchObject({ tipo: 'baja', actor_tipo: 'persona', actor: ANON, ejecutado_por: null, estado_nuevo: null })
    expect(evBaja.en.utc).toMatch(/Z$/)
    expect(err(await rpc(O, 'simulate_accept', { p_propuesta_id: prop, p_miembro_id: caro, p_version: 1, p_intento_id: intento() })))
      .toBe('no_autorizado/retirado')
    const otra = await ok(O, 'simulate_withdraw', { p_propuesta_id: prop, p_miembro_id: caro })
    expect(otra.resultado).toMatchObject({ repetido: true, efecto: 'sin_cambio_de_estado' })

    // Reparación: versión 2 en B, cero aceptaciones heredadas; mismo intento no crea otra versión.
    const ir = intento()
    const rep = await ok(O, 'propose_repair', { p_propuesta_id: prop, p_intento_id: ir })
    expect(rep.resultado).toMatchObject({ tipo: 'reparacion_publicada', version: 2, franja: 'B', repetido: false })
    expect(rep.propuesta.estado).toBe('esperando_compromisos')
    expect(rep.propuesta.opcion.aceptaron).toEqual([])
    expect(rep.propuesta.confirmados).toBe(0)
    expect(rep.propuesta.opcion.cupos.pendientes).toBe(5)
    expect(JSON.stringify(rep.propuesta)).not.toMatch(/[Rr]eparado/)
    const rep2 = await ok(O, 'propose_repair', { p_propuesta_id: prop, p_intento_id: ir })
    expect(rep2.resultado).toMatchObject({ version: 2, repetido: true })
    expect(rep2.propuesta.state_rev).toBe(rep.propuesta.state_rev)

    // Versión vieja rechazada con state_rev actual.
    const vieja = await rpc(O, 'accept_version', { p_propuesta_id: prop, p_version: 1, p_intento_id: intento() })
    expect(err(vieja)).toBe('opcion_desactualizada/version_no_vigente')
    expect(vieja.state_rev).toBe(rep.propuesta.state_rev)

    // Tres aceptaciones de v2 sin el anfitrión: sigue esperando.
    let r: Json
    for (const id of [luna, mati, fede]) r = await ok(O, 'simulate_accept', { p_propuesta_id: prop, p_miembro_id: id, p_version: 2, p_intento_id: intento() })
    expect(r.propuesta.estado).toBe('esperando_compromisos')
    expect(r.propuesta.confirmados).toBe(3)
    const v2 = await ok(O, 'accept_version', { p_propuesta_id: prop, p_version: 2, p_intento_id: intento() })
    expect(v2.propuesta.estado).toBe('grupo_confirmado')
    expect(v2.propuesta.siguiente_accion.texto).toBe('Grupo confirmado en la versión 2. Cupos disponibles: 2.')

    // Sofi acepta (quinto cupo) y se baja: el acuerdo se conserva.
    await ok(O, 'simulate_accept', { p_propuesta_id: prop, p_miembro_id: sofi, p_version: 2, p_intento_id: intento() })
    const bs = await ok(O, 'simulate_withdraw', { p_propuesta_id: prop, p_miembro_id: sofi })
    expect(bs.resultado.efecto).toBe('acuerdo_conservado')
    expect(bs.propuesta.estado).toBe('grupo_confirmado')
    expect(bs.propuesta.confirmados).toBe(4)
    expect(bs.propuesta.bajas.map((b: Json) => b.miembro.miembro_id)).toEqual([null, null]) // E13 (c): sin nombre
  })

  it('rama sin alternativa: el anfitrión deja de estar disponible', async () => {
    const esp = await demoPrueba(O) // E7.3; nombres distintos de los de la prueba anterior (mismo demo)
    const [luna, mati, caro] = await Promise.all(['Luna u', 'Mati u', 'Caro u'].map((n) => simulado(O, esp.espacioId, n)))
    const prop = await crearPropuesta(O, esp.espacioId, esp.miembroId, { minimo: 4, maximo: 6 })
    await ok(O, 'save_my_conditions', { p_propuesta_id: prop, p_disponibilidad: { A: 'si', B: 'si' } })
    for (const id of [luna, mati, caro]) await ok(O, 'simulate_save_conditions', { p_propuesta_id: prop, p_miembro_id: id, p_disponibilidad: { A: 'si', B: 'si' } })
    await ok(O, 'evaluate_and_publish', { p_propuesta_id: prop, p_intento_id: intento() })
    for (const id of [luna, mati, caro]) await ok(O, 'simulate_accept', { p_propuesta_id: prop, p_miembro_id: id, p_version: 1, p_intento_id: intento() })
    await ok(O, 'accept_version', { p_propuesta_id: prop, p_version: 1, p_intento_id: intento() })
    const b = await ok(O, 'simulate_withdraw', { p_propuesta_id: prop, p_miembro_id: caro })
    expect(b.propuesta.estado).toBe('en_revision')
    const g = await ok(O, 'save_my_conditions', { p_propuesta_id: prop, p_disponibilidad: { A: 'no', B: 'no' } })
    expect(g.propuesta.state_rev).toBe(b.propuesta.state_rev)
    const ir = intento()
    const sa = await rpc(O, 'propose_repair', { p_propuesta_id: prop, p_intento_id: ir })
    expect(err(sa)).toBe('sin_alternativa/sin_alternativa')
    expect(sa.state_rev).toBe(b.propuesta.state_rev + 1)
    const sa2 = await rpc(O, 'propose_repair', { p_propuesta_id: prop, p_intento_id: ir })
    expect(err(sa2)).toBe('sin_alternativa/sin_alternativa')
    expect(sa2.state_rev).toBe(sa.state_rev)
    const st = (await ok(O, 'get_proposal_state', { p_propuesta_id: prop })).propuesta
    expect(st.estado).toBe('en_revision')
    expect(st.minimo).toBe(4)
    expect(st.opcion.version).toBe(1)
    expect(st.ultima_evaluacion).toMatchObject({ resultado: 'sin_alternativa', version: null })
    expect(st.siguiente_accion.codigo).toBe('sin_alternativa')
  })

  it('aceptación fuera de plazo rechazada y vencimiento perezoso persistido', async () => {
    const esp = await crearEspacioPrueba(O, 'plazo', 'Org t')
    await ok(U1, 'join_space', { p_codigo: esp.codigo, p_nombre_visible: 'U1 t' })
    const info = await ok(O, 'server_info')
    const local = new Date(`${info.servidor_ahora.local}Z`) // aritmética de hora de pared
    const plazo = new Date(local.getTime() + 20_000).toISOString().slice(0, 19)
    const prop = await crearPropuesta(O, esp.espacioId, esp.miembroId, { minimo: 2, maximo: 3, plazo })
    await ok(O, 'save_my_conditions', { p_propuesta_id: prop, p_disponibilidad: { A: 'si', B: 'si' } })
    await ok(U1, 'save_my_conditions', { p_propuesta_id: prop, p_disponibilidad: { A: 'si', B: 'si' } })
    const ev = await ok(O, 'evaluate_and_publish', { p_propuesta_id: prop, p_intento_id: intento() })
    expect(ev.propuesta.estado).toBe('esperando_compromisos')
    expect(ev.propuesta.plazo_vencido).toBe(false)

    // Espera hasta que el servidor (no el cliente) diga que pasó el plazo.
    const limite = new Date(`${plazo}Z`).getTime()
    for (;;) {
      const ahora = new Date(`${(await ok(O, 'server_info')).servidor_ahora.local}Z`).getTime()
      if (ahora > limite) break
      await esperar(2_000)
    }
    const a = await rpc(U1, 'accept_version', { p_propuesta_id: prop, p_version: 1, p_intento_id: intento() })
    expect(err(a)).toBe('plazo_vencido/plazo_vencido')
    const st = (await ok(U1, 'get_proposal_state', { p_propuesta_id: prop })).propuesta
    expect(st.estado).toBe('expirado')
    expect(st.plazo_vencido).toBe(true)
    expect(st.confirmados).toBe(0)
    const exp = st.historial.filter((e: Json) => e.tipo === 'propuesta_expirada')
    expect(exp).toHaveLength(1)
    expect(exp[0]).toMatchObject({ actor_tipo: 'sistema', actor: null, ejecutado_por: null, estado_nuevo: 'expirado' })
    expect(a.state_rev).toBe(st.state_rev) // el vencimiento quedó guardado aunque la aceptación falló
    expect(st.siguiente_accion.codigo).toBe('expirado')
    // FRANJAS sigue en el futuro: el rechazo es por plazo, no por franjas.
    expect(FRANJAS[0].inicio > plazo).toBe(true)
  })
})
