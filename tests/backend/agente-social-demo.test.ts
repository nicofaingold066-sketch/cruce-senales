// 0055: en las demos, los amigos simulados reciben invitaciones del agente; fuera de las demos, nadie nace con el
// permiso y los pendientes nunca son destinatarios. Contra la base real, sin modelo (texto fijo), datos ficticios:
// una sesión nueva con su demo propio ("Los del finde") y un espacio "t-" que no es demo con dos personas reales y
// una pendiente.
import { beforeAll, describe, expect, it } from 'vitest'
import { demoPrueba, err, intento, nuevaSesion, ok, rpc, sufijo, type Json, type Sesion } from './helpers'

const SECO = { sabado: 'seco', domingo: 'seco' }
const TEXTO = 'Propuesta del agente: un plan el sábado. Cada uno confirma si puede.'
const PREF = { presupuesto: 'da_igual', energia: 'con_todo', ambiente: 'da_igual', lugar: 'da_igual', me_gustaria: ['asado', 'cena'] }

describe('0055: invitaciones del agente a los simulados de la demo, y a nadie más por defecto', { timeout: 180_000 }, () => {
  let O: Sesion
  let U: Sesion
  let sabado: string

  const contexto = async (esp: string) => (await ok(O, 'agente_social_contexto', { p_espacio_id: esp })).destinatarios as number
  /** Agente sin modelo hasta el borrador aprobado; devuelve el id de la ejecución, el hash y el plan visible. */
  const hastaAprobado = async (esp: string) => {
    const ej = intento()
    const ini = await ok(O, 'iniciar_ejecucion_agente', { p_espacio_id: esp, p_ejecucion_id: ej, p_oportunidad: `sabado:${sabado}`, p_parametros_hash: 'h-demo' })
    expect(ini.propia).toBe(true)
    const [op] = (await ok(O, 'agente_social_candidatos', { p_espacio_id: esp, p_sabado: sabado, p_clima: SECO })).opciones
    const g = await ok(O, 'guardar_borrador_agente', { p_ejecucion_id: ej, p_opcion_ref: op.opcion_ref, p_texto: TEXTO })
    await ok(O, 'aprobar_borrador_agente', { p_ejecucion_id: ej, p_borrador_hash: g.borrador.hash, p_intento_id: intento() })
    return { ej, hash: g.borrador.hash as string, plan: g.borrador.plan as Json }
  }

  beforeAll(async () => {
    ;[O, U] = await Promise.all([nuevaSesion(), nuevaSesion()])
    const hoy = (await ok(O, 'server_info')).servidor_ahora.local.slice(0, 10)
    const d = new Date(`${hoy}T00:00:00Z`)
    do d.setUTCDate(d.getUTCDate() + 1)
    while (d.getUTCDay() !== 6)
    sabado = d.toISOString().slice(0, 10)
  }, 60_000)

  it('demo: los 5 simulados nacen como destinatarios; el ciclo publica 5 invitaciones; un simulado nuevo también nace con permiso', async () => {
    const demo = await demoPrueba(O)
    // Solo Tomi (organizador, nunca destinatario) y los 5 simulados: 5. El organizador no cambia su propio permiso.
    expect(await contexto(demo.espacioId)).toBe(5)
    expect((await ok(O, 'get_my_preferences', { p_espacio_id: demo.espacioId })).recibir_invitaciones_agente).toBe(false)

    const a = await hastaAprobado(demo.espacioId)
    expect(a.plan.invitados).toBe(5)
    const pub = await ok(O, 'publicar_borrador_agente', { p_ejecucion_id: a.ej, p_borrador_hash: a.hash, p_intento_id: intento() })
    expect(pub.invitados).toBe(5)
    // La invitación no es interés ni asistencia, y el organizador no recibe ninguna.
    const st = (await ok(O, 'get_proposal_state', { p_propuesta_id: pub.propuesta.id })).propuesta
    expect(st).toMatchObject({ estado: 'reuniendo_interes', confirmados: 0, mi_situacion: { invitacion_agente: null } })
    expect(st.interesados.cantidad).toBe(0)
    expect(JSON.stringify(st)).not.toContain(TEXTO)
    await ok(O, 'cancel_proposal', { p_propuesta_id: pub.propuesta.id })

    // Un simulado agregado después también nace con el permiso (add_simulated_member solo corre en demos).
    await ok(O, 'add_simulated_member', { p_espacio_id: demo.espacioId, p_nombre_visible: 'Nuevo d' })
    expect(await contexto(demo.espacioId)).toBe(6)
  })

  it('fuera de la demo: nadie nace con el permiso, la pendiente no cuenta, y sin destinatarios no se publica', async () => {
    const r = await ok(O, 'create_space', { p_nombre: `t-0055-${sufijo()}`, p_tipo: 'amigos', p_nombre_visible: 'Org d', p_integrantes: ['Pend d'] })
    const esp = r.resultado.espacio_id as string
    await ok(U, 'join_space', { p_codigo: r.resultado.codigo_invitacion, p_nombre_visible: 'Uno d' })
    expect((await ok(U, 'get_my_preferences', { p_espacio_id: esp })).recibir_invitaciones_agente).toBe(false)
    expect(await contexto(esp)).toBe(0)

    for (const s of [O, U]) await ok(s, 'save_my_preferences', { p_espacio_id: esp, p_preferencias: PREF })
    const a = await hastaAprobado(esp)
    expect(a.plan.invitados).toBe(0)
    const pub = await rpc(O, 'publicar_borrador_agente', { p_ejecucion_id: a.ej, p_borrador_hash: a.hash, p_intento_id: intento() })
    expect(err(pub)).toBe('sin_alternativa/sin_destinatarios')
    expect(pub.error.mensaje).toBe('Nadie del grupo activó las invitaciones del agente.')

    // Con el permiso de Uno, cuenta Uno y solo Uno (la pendiente sigue afuera).
    await ok(U, 'set_recibir_invitaciones_agente', { p_espacio_id: esp, p_recibir: true })
    expect(await contexto(esp)).toBe(1)
    await ok(O, 'cerrar_ejecucion_agente', { p_ejecucion_id: a.ej, p_estado: 'fallida', p_motivo: 'reemplazada' })
  })
})
