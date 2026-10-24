// Propuesta publicada por el agente social (enmienda 11) a lo largo de todo el circuito humano: confirmación, baja,
// reparación con propose_repair, versión vieja rechazada e invitación que nunca cuenta como asistencia. Pedido del
// coordinador (01:4x) para cerrar el hueco del informe de la v13. Contra la base real, sin modelo (el texto lo pone la
// prueba), datos ficticios: demo propio de una sesión nueva (Tomi organiza y es el imprescindible del plan del
// agente), dos personas reales que se unen ("Uno" activa las invitaciones del agente, "Dos" no) y Luna simulada.
import { beforeAll, describe, expect, it } from 'vitest'
import { demoPrueba, err, intento, nuevaSesion, ok, rpc, type Json, type Sesion } from './helpers'

const SECO = { sabado: 'seco', domingo: 'seco' }
const SI = { A: 'si', B: 'si' }
const TEXTO = 'Propuesta del agente: un plan el sábado. Cada uno confirma si puede.'

describe('agente social: una propuesta del agente pasa por confirmación, baja y reparación humana', { timeout: 180_000 }, () => {
  let O: Sesion // Tomi
  let U: Sesion // Uno: activa invitaciones del agente
  let V: Sesion // Dos: no las activa
  let demo: Json
  let ids: Record<string, string>
  let sabado: string

  const estado = async (s: Sesion, p: string) => (await ok(s, 'get_proposal_state', { p_propuesta_id: p })).propuesta
  const aceptar = (s: Sesion, p: string, v: number) =>
    rpc(s, 'accept_version', { p_propuesta_id: p, p_version: v, p_intento_id: intento() })

  beforeAll(async () => {
    ;[O, U, V] = await Promise.all([nuevaSesion(), nuevaSesion(), nuevaSesion()])
    demo = await demoPrueba(O)
    await ok(U, 'join_space', { p_codigo: demo.codigo, p_nombre_visible: 'Uno ag' })
    await ok(V, 'join_space', { p_codigo: demo.codigo, p_nombre_visible: 'Dos ag' })
    ids = Object.fromEntries((await ok(O, 'get_space', { p_espacio_id: demo.espacioId })).espacio.miembros.map((m: Json) => [m.nombre, m.miembro_id]))
    const hoy = (await ok(O, 'server_info')).servidor_ahora.local.slice(0, 10)
    const d = new Date(`${hoy}T00:00:00Z`)
    do d.setUTCDate(d.getUTCDate() + 1)
    while (d.getUTCDay() !== 6)
    sabado = d.toISOString().slice(0, 10)
  }, 60_000)

  it('confirmada, baja, v2 con 0 heredadas, v1 vieja rechazada por versión y la invitación nunca suma', async () => {
    // Agente social sin modelo: iniciar → candidatos → borrador de texto fijo → aprobar el hash → publicar.
    await ok(U, 'set_recibir_invitaciones_agente', { p_espacio_id: demo.espacioId, p_recibir: true })
    const ej = intento()
    const ini = await ok(O, 'iniciar_ejecucion_agente', { p_espacio_id: demo.espacioId, p_ejecucion_id: ej, p_oportunidad: `sabado:${sabado}`, p_parametros_hash: 'h-rep' })
    expect(ini.propia).toBe(true)
    const [op] = (await ok(O, 'agente_social_candidatos', { p_espacio_id: demo.espacioId, p_sabado: sabado, p_clima: SECO })).opciones
    const g = await ok(O, 'guardar_borrador_agente', { p_ejecucion_id: ej, p_opcion_ref: op.opcion_ref, p_texto: TEXTO })
    const hash = g.borrador.hash as string
    await ok(O, 'aprobar_borrador_agente', { p_ejecucion_id: ej, p_borrador_hash: hash, p_intento_id: intento() })
    const pub = await ok(O, 'publicar_borrador_agente', { p_ejecucion_id: ej, p_borrador_hash: hash, p_intento_id: intento() })
    const p = pub.propuesta.id as string
    expect(pub.invitados).toBe(1)
    const minimo = g.borrador.plan.minimo as number
    expect(minimo).toBe(3)

    // La invitación no es interés ni asistencia.
    let deUno = await estado(U, p)
    expect(deUno).toMatchObject({ estado: 'reuniendo_interes', confirmados: 0, mi_situacion: { invitacion_agente: { texto: TEXTO }, interesado: false } })
    expect(deUno.interesados.cantidad).toBe(0)

    // (1) Hasta grupo_confirmado: Tomi, Uno, Dos y Luna (simulada) pueden en las dos franjas; v1 en A.
    for (const s of [O, U, V]) await ok(s, 'save_my_conditions', { p_propuesta_id: p, p_disponibilidad: SI })
    await ok(O, 'simulate_save_conditions', { p_propuesta_id: p, p_miembro_id: ids.Luna, p_disponibilidad: SI })
    const ev = await ok(O, 'evaluate_and_publish', { p_propuesta_id: p, p_intento_id: intento() })
    expect(ev.resultado.tipo).toBe('opcion_publicada')
    expect(ev.propuesta.opcion.version).toBe(1)
    for (const s of [O, U, V]) expect(err(await aceptar(s, p, 1))).toBe('ok')
    const conf = await estado(O, p)
    expect(conf).toMatchObject({ estado: 'grupo_confirmado', confirmados: 3 })

    // (2) Dos se baja: queda por debajo del mínimo → en revisión; Tomi repara a mano y la v2 nace con 0 aceptaciones.
    await ok(V, 'withdraw_commitment', { p_propuesta_id: p })
    expect(await estado(O, p)).toMatchObject({ estado: 'en_revision', confirmados: 2 })
    const rep = await ok(O, 'propose_repair', { p_propuesta_id: p, p_intento_id: intento() })
    expect(rep.resultado).toMatchObject({ tipo: 'reparacion_publicada', version: 2 })
    expect(rep.propuesta).toMatchObject({ estado: 'esperando_compromisos', confirmados: 0 })
    expect(rep.propuesta.opcion.version).toBe(2)
    expect(rep.propuesta.opcion.aceptaron).toEqual([])

    // (3) Aceptar la v1 ya no vale: versión vieja (no "retirado") para quien sigue; Dos, que se retiró, recibe retirado.
    expect(err(await aceptar(U, p, 1))).toBe('opcion_desactualizada/version_no_vigente')
    expect(err(await aceptar(O, p, 1))).toBe('opcion_desactualizada/version_no_vigente')
    expect(err(await aceptar(V, p, 2))).toBe('no_autorizado/retirado')

    // (4) En la v2 la invitación del agente sigue siendo solo de Uno y no cuenta: nadie confirmado hasta que acepta.
    deUno = await estado(U, p)
    expect(deUno).toMatchObject({ confirmados: 0, mi_situacion: { invitacion_agente: { texto: TEXTO }, acepte_version: false } })
    expect(deUno.mi_situacion.puede.aceptar).toBe(true)
    expect((await estado(V, p)).mi_situacion.invitacion_agente).toBeNull()
    expect((await estado(O, p)).mi_situacion.invitacion_agente).toBeNull()
    expect(err(await aceptar(U, p, 2))).toBe('ok')
    expect((await estado(O, p)).confirmados).toBe(1)

    await ok(O, 'cancel_proposal', { p_propuesta_id: p })
  })
})
