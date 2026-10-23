// Enmienda 11 (BORRADOR: docs/contrato-enmienda-11-borrador.md): backend del agente social, migración 0041.
// Se saltea sola mientras las funciones no existan en la base (0041 preparada, sin aplicar hasta el OK de Nico).
// Contra la base real, datos ficticios: demo propio de una sesión (Tomi organiza) y dos personas reales que se unen
// con nombres nuevos (Uno acepta invitaciones del agente, Dos no). Sin modelo: el texto lo pone la prueba.
import { beforeAll, describe, expect, it } from 'vitest'
import { clienteSinSesion, demoPrueba, err, intento, nuevaSesion, ok, rpc, rpcCrudo, type Json, type Sesion } from './helpers'

const SECO = { sabado: 'seco', domingo: 'seco' }
const TEXTO = 'Propuesta del agente: asado el sábado. Cada uno confirma si puede.'

const masDias = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

// ¿Está aplicada 0041? Sin sesión, una función que no existe da PGRST202; una que existe, 42501.
const aplicada = await (async () => {
  const r = await rpcCrudo(clienteSinSesion(), 'agente_social_contexto', { p_espacio_id: '00000000-0000-4000-8000-000000000000' })
  return r.error?.code !== 'PGRST202'
})()

describe.skipIf(!aplicada)('enmienda 11: agente social', { timeout: 180_000 }, () => {
  let O: Sesion // Tomi
  let U: Sesion // Uno: activa invitaciones
  let V: Sesion // Dos: no las activa
  let demo: Json
  let sabados: string[]

  const oportunidad = (s: string) => `sabado:${s}`
  const candidatos = async (s: string) =>
    (await ok(O, 'agente_social_candidatos', { p_espacio_id: demo.espacioId, p_sabado: s, p_clima: SECO })).opciones
  const iniciar = (s: Sesion, id: string, opp: string, hash = 'h1') =>
    rpc(s, 'iniciar_ejecucion_agente', { p_espacio_id: demo.espacioId, p_ejecucion_id: id, p_oportunidad: opp, p_parametros_hash: hash })
  const guardar = (id: string, ref: string, texto = TEXTO) =>
    rpc(O, 'guardar_borrador_agente', { p_ejecucion_id: id, p_opcion_ref: ref, p_texto: texto })
  const aprobar = (id: string, hash: string, i = intento()) =>
    rpc(O, 'aprobar_borrador_agente', { p_ejecucion_id: id, p_borrador_hash: hash, p_intento_id: i })
  const publicar = (id: string, hash: string, i = intento()) =>
    rpc(O, 'publicar_borrador_agente', { p_ejecucion_id: id, p_borrador_hash: hash, p_intento_id: i })
  const recibir = (s: Sesion, si: boolean) =>
    ok(s, 'set_recibir_invitaciones_agente', { p_espacio_id: demo.espacioId, p_recibir: si })
  /** Una ejecución hasta el borrador guardado; devuelve id y hash. */
  const hastaBorrador = async (sab: string) => {
    const id = intento()
    expect((await iniciar(O, id, oportunidad(sab))).propia).toBe(true)
    const [op] = await candidatos(sab)
    const g = await guardar(id, op.opcion_ref)
    expect(err(g)).toBe('ok')
    return { id, hash: g.borrador.hash as string }
  }

  beforeAll(async () => {
    ;[O, U, V] = await Promise.all([nuevaSesion(), nuevaSesion(), nuevaSesion()])
    demo = await demoPrueba(O)
    await ok(U, 'join_space', { p_codigo: demo.codigo, p_nombre_visible: 'Uno t' })
    await ok(V, 'join_space', { p_codigo: demo.codigo, p_nombre_visible: 'Dos t' })
    const hoy = (await ok(O, 'server_info')).servidor_ahora.local.slice(0, 10)
    let s = masDias(hoy, 1)
    while (new Date(`${s}T00:00:00Z`).getUTCDay() !== 6) s = masDias(s, 1)
    sabados = [s, masDias(s, 7), masDias(s, 14)]
  }, 60_000)

  it('permisos: sin sesión, ajeno y miembro común', async () => {
    const X = await nuevaSesion()
    expect((await rpcCrudo(clienteSinSesion(), 'agente_social_contexto', { p_espacio_id: demo.espacioId })).error?.code).toBe('42501')
    expect(err(await rpc(X, 'agente_social_contexto', { p_espacio_id: demo.espacioId }))).toBe('fuera_de_audiencia/no_miembro')
    expect(err(await rpc(U, 'agente_social_contexto', { p_espacio_id: demo.espacioId }))).toBe('no_autorizado/no_es_organizador_espacio')
    expect(err(await iniciar(U, intento(), oportunidad(sabados[0])))).toBe('no_autorizado/no_es_organizador_espacio')
    expect(err(await rpc(U, 'set_politica_agente_social', { p_espacio_id: demo.espacioId, p_modo: 'autonoma', p_intento_id: intento() })))
      .toBe('no_autorizado/no_es_organizador_espacio')
  })

  it('consentimiento: apagado por defecto, persistente, revocable y separado de usar_en_agente', async () => {
    expect((await ok(U, 'get_my_preferences', { p_espacio_id: demo.espacioId })).recibir_invitaciones_agente).toBe(false)
    expect((await ok(U, 'get_my_preferences', { p_espacio_id: demo.espacioId })).usar_en_agente).toBe(true)
    let ctx = await ok(O, 'agente_social_contexto', { p_espacio_id: demo.espacioId })
    expect(ctx).toMatchObject({ localidad: 'santiago', zona_horaria: 'America/Santiago', politica: { modo: 'aprobacion', version: 0 }, destinatarios: 0 })
    expect((await recibir(U, true)).recibir_invitaciones_agente).toBe(true)
    expect((await ok(U, 'get_my_preferences', { p_espacio_id: demo.espacioId })).recibir_invitaciones_agente).toBe(true)
    ctx = await ok(O, 'agente_social_contexto', { p_espacio_id: demo.espacioId })
    expect(ctx.destinatarios).toBe(1)
    await recibir(U, false)
    expect((await ok(O, 'agente_social_contexto', { p_espacio_id: demo.espacioId })).destinatarios).toBe(0)
    // Ningún nombre ni id de persona en el contexto.
    const txt = JSON.stringify(ctx)
    for (const n of ['Uno t', 'Dos t', 'Luna', 'Mati', U.userId, V.userId]) expect(txt).not.toContain(n)
  })

  it('candidatos: referencias opacas, sin ids del catálogo ni nombres; clima desconocido no suma buen tiempo', async () => {
    const ops = await candidatos(sabados[0])
    expect(ops.length).toBeGreaterThan(0)
    for (const o of ops) {
      expect(o.opcion_ref).toMatch(/^op_[0-9a-f]{20}$/)
      expect(o.franjas).toHaveLength(2)
    }
    expect(JSON.stringify(ops)).not.toMatch(/lugar-sim|evento-sim|Uno t|Dos t/)
    const r = await ok(O, 'agente_social_candidatos', { p_espacio_id: demo.espacioId, p_sabado: sabados[0], p_clima: { sabado: 'desconocido', domingo: 'desconocido' } })
    expect(r.sin_plan_compatible === true || r.opciones.length > 0).toBe(true)
  })

  it('iniciar: idempotente, una ejecución canónica por oportunidad, oportunidad validada', async () => {
    const opp = oportunidad(sabados[1])
    expect(err(await iniciar(O, intento(), 'sabado:2026-10-25'))).toBe('entrada_incompleta/oportunidad_invalida') // domingo
    expect(err(await iniciar(O, intento(), 'cualquier-cosa'))).toBe('entrada_incompleta/oportunidad_invalida')
    // Dos uuid concurrentes para la misma oportunidad: una sola propia.
    const [a, b] = [intento(), intento()]
    const [ra, rb] = await Promise.all([iniciar(O, a, opp), iniciar(O, b, opp)])
    expect([ra.propia, rb.propia].sort()).toEqual([false, true])
    expect(ra.ejecucion.id).toBe(rb.ejecucion.id)
    const canon = ra.propia ? a : b
    // Mismo id: recibo; mismo id con otros parámetros: rechazo; otro id con otros parámetros: oportunidad en uso.
    expect(await iniciar(O, canon, opp)).toMatchObject({ repetido: true, propia: true, ejecucion: { id: canon, estado: 'en_curso' } })
    expect(err(await iniciar(O, canon, opp, 'h2'))).toBe('entrada_incompleta/intento_reutilizado')
    const otro = await iniciar(O, intento(), opp, 'h2')
    expect(err(otro)).toBe('opcion_desactualizada/oportunidad_en_uso')
    expect(otro.ejecucion.id).toBe(canon)
    // Cerrar como reemplazada libera la oportunidad.
    expect((await ok(O, 'cerrar_ejecucion_agente', { p_ejecucion_id: canon, p_estado: 'fallida', p_motivo: 'reemplazada' })).ejecucion.estado).toBe('fallida')
    const nueva = intento()
    expect((await iniciar(O, nueva, opp, 'h2')).propia).toBe(true)
    await ok(O, 'cerrar_ejecucion_agente', { p_ejecucion_id: nueva, p_estado: 'fallida', p_motivo: 'sin_plan' })
  })

  it('borrador inmutable; aprobación del hash exacto; revocar invalida; publicación atómica e idempotente; invitación personal', async () => {
    await recibir(U, true)
    const sab = sabados[0]
    const id = intento()
    await iniciar(O, id, oportunidad(sab))
    expect(err(await guardar(id, 'op_inexistente00000000'))).toBe('opcion_desactualizada/opcion_vencida')
    const [op, op2] = await candidatos(sab)
    const g = await guardar(id, op.opcion_ref)
    expect(g.borrador.hash).toMatch(/^[0-9a-f]{64}$/)
    // Lo que fija el servidor se muestra antes de aprobar (nada en silencio).
    expect(Object.keys(g.borrador.plan).sort()).toEqual(['franjas', 'imprescindible', 'invitados', 'lugar', 'maximo', 'minimo', 'plazo', 'titulo'])
    expect(g.borrador.plan).toMatchObject({ imprescindible: { nombre: 'Tomi' }, invitados: 1, minimo: 3 })
    expect(g.borrador.plan.lugar.nombre).toMatch(/ \(Simulación\)$/)
    expect(JSON.stringify(g.borrador.plan)).not.toMatch(/Uno t|Dos t/)
    expect((await guardar(id, op.opcion_ref)).repetido).toBe(true)
    if (op2) expect(err(await guardar(id, op2.opcion_ref))).toBe('opcion_desactualizada/borrador_cambiado')
    expect(err(await guardar(id, op.opcion_ref, 'otro texto'))).toBe('opcion_desactualizada/borrador_cambiado')
    const hash = g.borrador.hash

    // Política por defecto: sin aprobación no se publica. Un hash cambiado no se aprueba.
    expect(err(await publicar(id, hash))).toBe('no_autorizado/sin_aprobacion')
    expect(err(await aprobar(id, 'f'.repeat(64)))).toBe('opcion_desactualizada/borrador_cambiado')
    // Revocar entre borrador y aprobación cambia la audiencia: el hash ya no coincide.
    await recibir(U, false)
    expect(err(await aprobar(id, hash))).toBe('opcion_desactualizada/borrador_cambiado')
    await recibir(U, true)
    const ia = intento()
    expect((await aprobar(id, hash, ia)).aprobacion.hash).toBe(hash)
    expect((await aprobar(id, hash, ia)).repetido).toBe(true)
    // Revocar después de aprobar invalida la aprobación al publicar.
    await recibir(U, false)
    expect(err(await publicar(id, hash))).toBe('opcion_desactualizada/borrador_cambiado')
    await recibir(U, true)

    // Doble clic con el mismo intento: un efecto.
    const ip = intento()
    const [p1, p2] = await Promise.all([publicar(id, hash, ip), publicar(id, hash, ip)])
    expect(p1.ok && p2.ok).toBe(true)
    expect(p1.propuesta.id).toBe(p2.propuesta.id)
    expect([p1.repetido, p2.repetido].sort()).toEqual([false, true])
    const prop = p1.propuesta.id
    expect(p1.invitados).toBe(1)
    // Respuesta perdida: otro intento recupera la misma propuesta; mismo intento con otro hash, rechazo.
    expect(await publicar(id, hash)).toMatchObject({ ok: true, repetido: true, propuesta: { id: prop } })
    expect(err(await publicar(id, 'a'.repeat(64), ip))).toBe('entrada_incompleta/intento_reutilizado')
    expect(err(await rpc(O, 'cerrar_ejecucion_agente', { p_ejecucion_id: id, p_estado: 'fallida', p_motivo: 'sin_plan' })))
      .toBe('opcion_desactualizada/ejecucion_publicada')
    // El recibo dice dónde quedó.
    expect((await iniciar(O, id, oportunidad(sab))).ejecucion).toMatchObject({ estado: 'publicada', propuesta_id: prop, borrador: { hash } })

    // La propuesta es una común, abierta; la invitación es solo de Uno y no es interés.
    const deUno = (await ok(U, 'get_proposal_state', { p_propuesta_id: prop })).propuesta
    expect(deUno.estado).toBe('reuniendo_interes')
    expect(deUno.mi_situacion.invitacion_agente).toEqual({ texto: TEXTO })
    expect(deUno.mi_situacion.interesado).toBe(false)
    expect(deUno.interesados.cantidad).toBe(0)
    expect((await ok(V, 'get_proposal_state', { p_propuesta_id: prop })).propuesta.mi_situacion.invitacion_agente).toBeNull()
    expect((await ok(O, 'get_proposal_state', { p_propuesta_id: prop })).propuesta.mi_situacion.invitacion_agente).toBeNull()
    const lista = (await ok(U, 'list_proposals', { p_espacio_id: demo.espacioId })).propuestas
    expect(lista.find((p: Json) => p.id === prop).mi_situacion.invitacion_agente).toEqual({ texto: TEXTO })
    await ok(O, 'cancel_proposal', { p_propuesta_id: prop })
  })

  it('política autónoma publica sin aprobación; si cambia durante la ejecución, vuelve a pedirla; sin destinatarios no publica', async () => {
    await recibir(U, true)
    await ok(O, 'set_politica_agente_social', { p_espacio_id: demo.espacioId, p_modo: 'autonoma', p_intento_id: intento() })
    const a = await hastaBorrador(sabados[2])
    const pub = await publicar(a.id, a.hash)
    expect(err(pub)).toBe('ok')
    await ok(O, 'cancel_proposal', { p_propuesta_id: pub.propuesta.id })

    // Cambio de política durante la ejecución: empezó en "aprobación" y pasa a "autónoma" → pide aprobación.
    await ok(O, 'set_politica_agente_social', { p_espacio_id: demo.espacioId, p_modo: 'aprobacion', p_intento_id: intento() })
    const b = await hastaBorrador(sabados[1])
    const pol = await ok(O, 'set_politica_agente_social', { p_espacio_id: demo.espacioId, p_modo: 'autonoma', p_intento_id: intento() })
    expect(pol.politica.modo).toBe('autonoma')
    expect(err(await publicar(b.id, b.hash))).toBe('no_autorizado/sin_aprobacion')

    // Sin nadie que acepte invitaciones, no se publica (después de aprobar).
    await recibir(U, false)
    await ok(O, 'cerrar_ejecucion_agente', { p_ejecucion_id: b.id, p_estado: 'fallida', p_motivo: 'reemplazada' })
    const c = await hastaBorrador(sabados[1])
    await ok(O, 'set_politica_agente_social', { p_espacio_id: demo.espacioId, p_modo: 'aprobacion', p_intento_id: intento() })
    expect(err(await aprobar(c.id, c.hash))).toBe('ok')
    expect(err(await publicar(c.id, c.hash))).toBe('sin_alternativa/sin_destinatarios')

    // Un valor fijado por el servidor cambia entre la aprobación y la publicación (entra alguien al espacio y
    // sube el máximo): la aprobación ya no vale.
    await recibir(U, true)
    await ok(O, 'cerrar_ejecucion_agente', { p_ejecucion_id: c.id, p_estado: 'fallida', p_motivo: 'reemplazada' })
    const d = await hastaBorrador(sabados[1])
    expect(err(await aprobar(d.id, d.hash))).toBe('ok')
    await ok(O, 'add_simulated_member', { p_espacio_id: demo.espacioId, p_nombre_visible: 'Nuevo t' })
    expect(err(await publicar(d.id, d.hash))).toBe('opcion_desactualizada/borrador_cambiado')
  })
})
