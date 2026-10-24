// 20261024124500: integración con Supabase LOCAL exclusivamente. Nunca sondea ni crea sesiones remotas.
// RUN_LOCAL_DEMO_MAKANA_TESTS=1 VITE_SUPABASE_URL=http://127.0.0.1:54321 ... vitest run tests/backend/demo-makana.test.ts
// Requiere las migraciones ya aplicadas por el operador autorizado. No usa modelo ni clima real.
import { describe, expect, it } from 'vitest'
import {
  clienteSinSesion, crearPropuesta, err, intento, nuevaSesion, ok, PERMITIDAS, rpc, rpcCrudo, TOTAL_PERMITIDAS,
  type Json, type Sesion,
} from './helpers'

const localAutorizado = (() => {
  if (process.env.RUN_LOCAL_DEMO_MAKANA_TESTS !== '1') return false
  try {
    const u = new URL(process.env.VITE_SUPABASE_URL ?? '')
    return ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname)
      && ['http:', 'https:'].includes(u.protocol)
      && Boolean(process.env.VITE_SUPABASE_PUBLISHABLE_KEY)
  } catch { return false }
})()

const NOMBRES = ['Ana', 'Bruno', 'Camila', 'Diego', 'Elena', 'Felipe', 'Gabriela']
const PREF = { presupuesto: 'da_igual', energia: 'algo_tranquilo', ambiente: 'tranquilo', lugar: 'da_igual', me_gustaria: ['parque'] }
const PREF_CAMILA = { ...PREF, presupuesto: 'ojala_gratis' }
const SI = { A: 'si', B: 'si' }
const SIN_CLIMA = { sabado: 'desconocido', domingo: 'desconocido' }

async function tresPerfiles() {
  const [ana, camila, felipe] = await Promise.all([nuevaSesion(), nuevaSesion(), nuevaSesion()])
  const espacio = (await ok(ana, 'seed_demo_makana')).espacio
  const ids = Object.fromEntries(espacio.miembros.map((m: Json) => [m.nombre, m.miembro_id])) as Record<string, string>
  // Se reclaman antes de cargar gustos o condiciones; el backend no permite heredar actividad simulada.
  for (const [s, nombre] of [[camila, 'Camila'], [felipe, 'Felipe']] as const) {
    const j = await ok(s, 'join_space', { p_codigo: espacio.codigo_invitacion, p_nombre_visible: '', p_miembro_id: ids[nombre] })
    expect(j.resultado).toMatchObject({ miembro_id: ids[nombre], reclamo_asiento_simulado: true })
  }
  return { ana, camila, felipe, espacio, ids }
}

const gustos = (s: Sesion, esp: string) => ok(s, 'get_my_preferences', { p_espacio_id: esp })
const contexto = (s: Sesion, esp: string) => ok(s, 'agente_social_contexto', { p_espacio_id: esp })
const estado = async (s: Sesion, p: string) => (await ok(s, 'get_proposal_state', { p_propuesta_id: p })).propuesta

async function proximoSabado(s: Sesion) {
  const hoy = (await ok(s, 'server_info')).servidor_ahora.local.slice(0, 10)
  const d = new Date(`${hoy}T00:00:00Z`)
  do d.setUTCDate(d.getUTCDate() + 1)
  while (d.getUTCDay() !== 6)
  return d.toISOString().slice(0, 10)
}

async function crearParque(s: Sesion, esp: string, imprescindible: string, titulo = 'Parque ficticio · datos de demostración') {
  const sabado = await proximoSabado(s)
  const fecha = new Date(`${sabado}T00:00:00Z`)
  fecha.setUTCDate(fecha.getUTCDate() + 1)
  const domingo = fecha.toISOString().slice(0, 10)
  const r = await ok(s, 'create_proposal', {
    p_espacio_id: esp, p_titulo: titulo, p_actividad: 'parque', p_minimo: 2, p_maximo: 7,
    p_imprescindible_id: imprescindible, p_zona_horaria: 'America/Santiago', p_intento_id: intento(),
    p_plazo: `${sabado}T09:00`,
    p_franjas: [
      { inicio: `${sabado}T12:00`, fin: `${sabado}T14:00` },
      { inicio: `${domingo}T12:00`, fin: `${domingo}T14:00` },
    ],
  })
  const id = r.resultado.propuesta_id as string
  await ok(s, 'open_proposal', { p_propuesta_id: id })
  return id
}

// Sin opt-in explícito + URL loopback este archivo no hace NINGUNA llamada, ni siquiera un chequeo de RPC.
describe.skipIf(!localAutorizado)('20261024124500: demo Makana aislada (solo Supabase local autorizado)', { timeout: 180_000 }, () => {
  it('una sola semilla por caso bajo concurrencia, sin sustituir la demo legacy del mismo usuario', async () => {
    const a = await nuevaSesion()
    const legacy = (await ok(a, 'seed_demo_space')).espacio
    const rs = await Promise.all(Array.from({ length: 5 }, () => ok(a, 'seed_demo_makana')))
    const makana = rs[0].espacio
    expect(rs.filter((r) => r.resultado.creado)).toHaveLength(1)
    expect(new Set(rs.map((r) => r.espacio.id)).size).toBe(1)
    expect(makana.id).not.toBe(legacy.id)
    expect(makana).toMatchObject({ demo: true, demo_caso: 'makana', mi_rol: 'organizador' })
    expect(makana.miembros.map((m: Json) => m.nombre)).toEqual(NOMBRES)
    expect(makana.miembros.map((m: Json) => m.simulado)).toEqual([false, true, true, true, true, true, true])
    expect((await ok(a, 'seed_demo_space')).espacio.id).toBe(legacy.id)
    expect(legacy.miembros.map((m: Json) => m.nombre)).toEqual(['Tomi', 'Luna', 'Mati', 'Caro', 'Fede', 'Sofi'])
    const lista = (await ok(a, 'list_my_spaces')).espacios
    expect(lista.map((e: Json) => [e.id, e.demo_caso])).toEqual(expect.arrayContaining([[legacy.id, 'legacy'], [makana.id, 'makana']]))
    expect((await contexto(a, legacy.id)).destinatarios).toBe(5)
    expect((await contexto(a, makana.id))).toMatchObject({ personas_autorizadas: 0, destinatarios: 0 })
    const libres = (await ok(a, 'preview_space_by_code', { p_codigo: makana.codigo_invitacion })).miembros
    expect(libres.filter((m: Json) => m.libre).map((m: Json) => m.nombre)).toEqual(NOMBRES.slice(1))
  })

  it('dos opt-ins separados y dato propio privado después de reclamar Camila y Felipe', async () => {
    const { ana, camila, felipe, espacio, ids } = await tresPerfiles()
    for (const s of [ana, camila, felipe]) {
      expect(await gustos(s, espacio.id)).toMatchObject({ preferencias: null, usar_en_agente: false, recibir_invitaciones_agente: false })
    }
    await ok(camila, 'save_my_preferences', { p_espacio_id: espacio.id, p_preferencias: PREF_CAMILA })
    expect(await gustos(camila, espacio.id)).toMatchObject({ usar_en_agente: false, recibir_invitaciones_agente: false, preferencias: PREF_CAMILA })
    await ok(camila, 'set_recibir_invitaciones_agente', { p_espacio_id: espacio.id, p_recibir: true })
    expect(await contexto(ana, espacio.id)).toMatchObject({ personas_autorizadas: 0, destinatarios: 1 })
    await ok(camila, 'save_my_preferences', { p_espacio_id: espacio.id, p_preferencias: { ...PREF_CAMILA, usar_en_agente: true } })
    expect(await contexto(ana, espacio.id)).toMatchObject({ personas_autorizadas: 1, destinatarios: 1 })
    // Ana accede a sus propios gustos y al espacio compartido, sin payload individual de Camila.
    expect((await gustos(ana, espacio.id)).preferencias).toBeNull()
    const compartido = await ok(ana, 'get_space', { p_espacio_id: espacio.id })
    expect(JSON.stringify(compartido)).not.toMatch(/ojala_gratis|presupuesto|usar_en_agente|recibir_invitaciones_agente/)
    const p = await crearParque(ana, espacio.id, ids.Ana)
    expect((await estado(ana, p)).demo_caso).toBe('makana')
    const panel = await ok(ana, 'get_simulation_panel', { p_propuesta_id: p })
    expect(panel.simulacion.miembros.map((m: Json) => m.miembro.nombre)).toEqual(['Bruno', 'Diego', 'Elena', 'Gabriela'])
    expect(JSON.stringify(await estado(ana, p))).not.toMatch(/ojala_gratis|presupuesto/)
    expect(err(await rpc(ana, 'simulate_save_preferences', { p_espacio_id: espacio.id, p_miembro_id: ids.Camila, p_preferencias: PREF })))
      .toBe('no_autorizado/miembro_no_simulado')
    expect(err(await rpc(ana, 'simulate_load_case', { p_propuesta_id: p, p_intento_id: intento() })))
      .toBe('no_autorizado/caso_no_disponible')
    // Una edición explícita simulada tampoco activa el uso por el agente.
    await ok(ana, 'simulate_save_preferences', { p_espacio_id: espacio.id, p_miembro_id: ids.Bruno, p_preferencias: PREF })
    expect((await contexto(ana, espacio.id)).personas_autorizadas).toBe(1)
    await ok(ana, 'add_simulated_member', { p_espacio_id: espacio.id, p_nombre_visible: 'Extra ficticio' })
    expect((await contexto(ana, espacio.id)).destinatarios).toBe(1)
    await ok(camila, 'set_recibir_invitaciones_agente', { p_espacio_id: espacio.id, p_recibir: false })
    expect(await contexto(ana, espacio.id)).toMatchObject({ personas_autorizadas: 1, destinatarios: 0 })
  })

  it('parque mínimo 2: baja de Felipe, rearmado humano en B y v2 sin aceptaciones heredadas', async () => {
    const { ana, camila, felipe, espacio, ids } = await tresPerfiles()
    const p = await crearParque(ana, espacio.id, ids.Ana)
    // Son respuestas explícitas a ESTA propuesta de prueba, no disponibilidad inferida del perfil.
    for (const [s, disponibilidad] of [
      [ana, { A: 'si', B: 'si' }], [felipe, { A: 'si', B: 'no' }], [camila, { A: 'no', B: 'si' }],
    ] as const) await ok(s, 'save_my_conditions', { p_propuesta_id: p, p_disponibilidad: disponibilidad })
    const ev = await ok(ana, 'evaluate_and_publish', { p_propuesta_id: p, p_intento_id: intento() })
    expect(ev.resultado).toMatchObject({ tipo: 'opcion_publicada', franja: 'A', version: 1 })
    for (const s of [ana, felipe]) await ok(s, 'accept_version', { p_propuesta_id: p, p_version: 1, p_intento_id: intento() })
    expect(await estado(ana, p)).toMatchObject({ estado: 'grupo_confirmado', confirmados: 2, minimo: 2 })
    await ok(felipe, 'withdraw_commitment', { p_propuesta_id: p })
    expect(await estado(ana, p)).toMatchObject({ estado: 'en_revision', confirmados: 1 })
    const rep = await ok(ana, 'propose_repair', { p_propuesta_id: p, p_intento_id: intento() })
    expect(rep.resultado).toMatchObject({ tipo: 'reparacion_publicada', franja: 'B', version: 2 })
    expect(rep.propuesta).toMatchObject({ estado: 'esperando_compromisos', confirmados: 0, opcion: { version: 2 } })
    expect(err(await rpc(ana, 'accept_version', { p_propuesta_id: p, p_version: 1, p_intento_id: intento() })))
      .toBe('opcion_desactualizada/version_no_vigente')
    for (const s of [ana, camila]) await ok(s, 'accept_version', { p_propuesta_id: p, p_version: 2, p_intento_id: intento() })
    expect(await estado(ana, p)).toMatchObject({ estado: 'grupo_confirmado', confirmados: 2, opcion: { version: 2 } })
    const panel = await ok(ana, 'get_simulation_panel', { p_propuesta_id: p })
    expect(panel.simulacion.miembros.find((m: Json) => m.miembro.nombre === 'Gabriela')).toMatchObject({ acepte_version: false, elegible_en_version: false })
  })

  it('parque mínimo 2: tres aceptaciones, Gabriela pendiente y baja conserva 2', async () => {
    const { ana, camila, felipe, espacio, ids } = await tresPerfiles()
    const p = await crearParque(ana, espacio.id, ids.Ana)
    for (const s of [ana, camila, felipe]) await ok(s, 'save_my_conditions', { p_propuesta_id: p, p_disponibilidad: SI })
    const ev = await ok(ana, 'evaluate_and_publish', { p_propuesta_id: p, p_intento_id: intento() })
    expect(ev.propuesta).toMatchObject({ confirmados: 0, actividad: { clave: 'parque' }, opcion: { version: 1 } })
    for (const s of [ana, camila, felipe]) await ok(s, 'accept_version', { p_propuesta_id: p, p_version: 1, p_intento_id: intento() })
    expect(await estado(ana, p)).toMatchObject({ estado: 'grupo_confirmado', confirmados: 3 })
    const panel = await ok(ana, 'get_simulation_panel', { p_propuesta_id: p })
    expect(panel.simulacion.miembros.find((m: Json) => m.miembro.nombre === 'Gabriela')).toMatchObject({ acepte_version: false, elegible_en_version: false })
    await ok(felipe, 'withdraw_commitment', { p_propuesta_id: p })
    expect(await estado(ana, p)).toMatchObject({ estado: 'grupo_confirmado', confirmados: 2 })

  })

  it('reinicio autorizado, idempotente y aislado: conserva sesiones/opt-ins reclamados y libera recibos publicados', async () => {
    const { ana, camila, felipe, espacio, ids } = await tresPerfiles()
    const legacy = (await ok(ana, 'seed_demo_space')).espacio
    const ajeno = await nuevaSesion()
    const otro = (await ok(ajeno, 'seed_demo_makana')).espacio
    const pLegacy = await crearPropuesta(ana, legacy.id, legacy.mi_miembro_id)
    const pOtro = await crearParque(ajeno, otro.id, otro.mi_miembro_id)
    for (const s of [ana, camila]) {
      await ok(s, 'save_my_preferences', { p_espacio_id: espacio.id, p_preferencias: { ...PREF, usar_en_agente: true } })
    }
    await ok(camila, 'set_recibir_invitaciones_agente', { p_espacio_id: espacio.id, p_recibir: true })
    await ok(ana, 'simulate_save_preferences', { p_espacio_id: espacio.id, p_miembro_id: ids.Bruno, p_preferencias: PREF })
    const sabado = await proximoSabado(ana)
    const ej = intento()
    const iniciar = (id: string) => ok(ana, 'iniciar_ejecucion_agente', {
      p_espacio_id: espacio.id, p_ejecucion_id: id, p_oportunidad: `sabado:${sabado}`, p_parametros_hash: 'prueba-local-sin-modelo',
    })
    await iniciar(ej)
    const [op] = (await ok(ana, 'agente_social_candidatos', { p_espacio_id: espacio.id, p_sabado: sabado, p_clima: SIN_CLIMA })).opciones
    expect(op).toBeDefined()
    const g = await ok(ana, 'guardar_borrador_agente', { p_ejecucion_id: ej, p_opcion_ref: op.opcion_ref, p_texto: 'Texto fijo de prueba local; cada persona acepta por sí misma.' })
    await ok(ana, 'aprobar_borrador_agente', { p_ejecucion_id: ej, p_borrador_hash: g.borrador.hash, p_intento_id: intento() })
    const pub = await ok(ana, 'publicar_borrador_agente', { p_ejecucion_id: ej, p_borrador_hash: g.borrador.hash, p_intento_id: intento() })
    expect(pub.invitados).toBe(1)
    expect((await iniciar(ej)).ejecucion.estado).toBe('publicada')
    expect(err(await rpc(camila, 'reset_demo', { p_espacio_id: espacio.id, p_intento_id: intento() }))).toBe('no_autorizado/no_es_organizador_espacio')
    expect(err(await rpc(ajeno, 'reset_demo', { p_espacio_id: espacio.id, p_intento_id: intento() }))).toBe('fuera_de_audiencia/no_miembro')
    const resetId = intento()
    const r = await ok(ana, 'reset_demo', { p_espacio_id: espacio.id, p_intento_id: resetId })
    expect(r.resultado).toMatchObject({ generacion: 2, propuestas_eliminadas: 1, repetido: false })
    expect((await ok(ana, 'reset_demo', { p_espacio_id: espacio.id, p_intento_id: resetId })).resultado).toMatchObject({ generacion: 2, repetido: true })
    expect(await gustos(camila, espacio.id)).toMatchObject({ usar_en_agente: true, recibir_invitaciones_agente: true, preferencias: PREF })
    expect(await gustos(felipe, espacio.id)).toMatchObject({ usar_en_agente: false, recibir_invitaciones_agente: false, preferencias: null })
    expect(await contexto(ana, espacio.id)).toMatchObject({ personas_autorizadas: 2, destinatarios: 1 })
    expect((await estado(ana, pLegacy)).id).toBe(pLegacy)
    expect((await estado(ajeno, pOtro)).id).toBe(pOtro)
    expect((await ok(ana, 'get_space', { p_espacio_id: legacy.id })).espacio.generacion).toBe(1)
    const nuevo = await iniciar(intento())
    expect(nuevo).toMatchObject({ propia: true, repetido: false, ejecucion: { estado: 'en_curso' } })
    // El recibo ya borrado no se puede usar para publicar otra vez.
    expect(err(await rpc(ana, 'publicar_borrador_agente', { p_ejecucion_id: ej, p_borrador_hash: g.borrador.hash, p_intento_id: intento() }))).not.toBe('ok')
  })

  it('preserva actividad, salida privada y propiedad del asiento al reiniciar y reingresar', async () => {
    const { ana, camila, felipe, espacio, ids } = await tresPerfiles()
    await ok(camila, 'save_my_preferences', { p_espacio_id: espacio.id, p_preferencias: { ...PREF_CAMILA, usar_en_agente: true } })
    await ok(camila, 'set_recibir_invitaciones_agente', { p_espacio_id: espacio.id, p_recibir: true })
    const antes = (await ok(ana, 'get_space', { p_espacio_id: espacio.id })).espacio
    expect(antes.actividad).toEqual(expect.arrayContaining([
      expect.objectContaining({ tipo: 'miembro_unido', miembro: expect.objectContaining({ nombre: 'Camila' }) }),
      expect.objectContaining({ tipo: 'miembro_unido', miembro: expect.objectContaining({ nombre: 'Felipe' }) }),
    ]))
    await ok(camila, 'leave_space', { p_espacio_id: espacio.id, p_intento_id: intento() })
    expect(err(await rpc(camila, 'get_space', { p_espacio_id: espacio.id }))).toBe('fuera_de_audiencia/no_miembro')
    expect(err(await rpc(camila, 'get_my_preferences', { p_espacio_id: espacio.id }))).toBe('fuera_de_audiencia/no_miembro')
    expect((await ok(camila, 'list_my_spaces')).espacios).toEqual([])
    let deAna = (await ok(ana, 'get_space', { p_espacio_id: espacio.id })).espacio
    expect(deAna.miembros.map((m: Json) => m.nombre)).not.toContain('Camila')
    expect(deAna.actividad).toEqual(expect.arrayContaining([
      expect.objectContaining({ tipo: 'miembro_salio', miembro: expect.objectContaining({ nombre: 'Camila' }) }),
    ]))
    expect(JSON.stringify(deAna)).not.toMatch(/ojala_gratis|presupuesto|usuario_original_id|salio_en/)
    await ok(ana, 'reset_demo', { p_espacio_id: espacio.id, p_intento_id: intento() })
    deAna = (await ok(ana, 'get_space', { p_espacio_id: espacio.id })).espacio
    expect(deAna.miembros.map((m: Json) => m.nombre)).not.toContain('Camila')
    expect(deAna.actividad).toEqual(expect.arrayContaining([
      expect.objectContaining({ tipo: 'miembro_salio', miembro: expect.objectContaining({ nombre: 'Camila' }) }),
    ]))
    const preview = await ok(felipe, 'preview_space_by_code', { p_codigo: espacio.codigo_invitacion })
    expect(preview.miembros.map((m: Json) => m.nombre)).not.toContain('Camila')
    const ajeno = await nuevaSesion()
    expect(err(await rpc(ajeno, 'join_space', { p_codigo: espacio.codigo_invitacion, p_nombre_visible: '', p_miembro_id: ids.Camila })))
      .toBe('no_autorizado/miembro_ya_reclamado')
    const reingreso = await ok(camila, 'join_space', { p_codigo: espacio.codigo_invitacion, p_nombre_visible: '', p_miembro_id: ids.Camila })
    expect(reingreso.resultado).toMatchObject({ miembro_id: ids.Camila, reingreso: true })
    expect(await gustos(camila, espacio.id)).toMatchObject({ preferencias: PREF_CAMILA, usar_en_agente: false, recibir_invitaciones_agente: false })
    const lista = (await ok(ana, 'list_my_spaces')).espacios
    expect(lista.find((e: Json) => e.id === espacio.id)).toMatchObject({ cantidad_miembros: 7, demo_caso: 'makana' })
  })

  it('catálogo 43/0: incluye salida del grupo y la RPC nueva no es ejecutable por anon', async () => {
    expect(TOTAL_PERMITIDAS).toBe(43)
    expect(Object.keys(PERMITIDAS)).toHaveLength(43)
    expect(PERMITIDAS.leave_space).toBeTypeOf('function')
    expect((await rpcCrudo(clienteSinSesion(), 'seed_demo_makana')).error?.code).toBe('42501')
  })
})
