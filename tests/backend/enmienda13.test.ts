// Enmienda 13 (docs/contrato-enmienda-13.md, aprobada por Nico 20:51): opinar sin bajarse (0042), rearmar con lo
// nuevo y bajas sin nombre (0043) y asado en lugar neutro (0044). Contra la base real, datos ficticios: demo propio
// de una sesión (Tomi organiza y es el imprescindible) y dos personas reales que se unen con nombres nuevos.
import { beforeAll, describe, expect, it } from 'vitest'
import {
  clienteSinSesion, demoPrueba, err, FRANJAS, intento, nuevaSesion, ok, PLAZO, rpc, rpcCrudo, TOTAL_PERMITIDAS, PERMITIDAS,
  type Json, type Sesion,
} from './helpers'

const SI = { A: 'si', B: 'si' }
const SOLO_B = { A: 'no', B: 'si' }
const REARMAR = { codigo: 'buscar_opcion', texto: 'Algunos no pueden así: puedes rearmar con lo nuevo.' }
const GRACIAS = 'Gracias por avisar. No hace falta contar por qué.'
const ANON = { miembro_id: null, nombre: 'Una persona', simulado: false }

describe('enmienda 13: opinar sin bajarse, rearmar, baja sin nombre y parrilla del parque', { timeout: 180_000 }, () => {
  let O: Sesion // Tomi
  let U: Sesion // Uno t
  let V: Sesion // Dos t
  let demo: Json
  let ids: Record<string, string>

  const estado = async (s: Sesion, prop: string) => (await ok(s, 'get_proposal_state', { p_propuesta_id: prop })).propuesta
  const opinar = (s: Sesion, prop: string, version: number, opinion = 'asi_no_puedo', i = intento()) =>
    rpc(s, 'opinar_version', { p_propuesta_id: prop, p_version: version, p_opinion: opinion, p_intento_id: i })
  const condiciones = (s: Sesion, prop: string, disp: Json) => rpc(s, 'save_my_conditions', { p_propuesta_id: prop, p_disponibilidad: disp })
  const simCond = (prop: string, nombre: string, disp: Json) =>
    ok(O, 'simulate_save_conditions', { p_propuesta_id: prop, p_miembro_id: ids[nombre], p_disponibilidad: disp })
  const aceptar = (s: Sesion, prop: string, version: number) =>
    ok(s, 'accept_version', { p_propuesta_id: prop, p_version: version, p_intento_id: intento() })
  const rearmar = (prop: string, i = intento()) => rpc(O, 'propose_repair', { p_propuesta_id: prop, p_intento_id: i })
  const nueva = async (titulo: string, minimo: number) => {
    const r = await ok(O, 'create_proposal', {
      p_espacio_id: demo.espacioId, p_titulo: titulo, p_franjas: FRANJAS, p_minimo: minimo, p_maximo: 6,
      p_imprescindible_id: demo.miembroId, p_plazo: PLAZO, p_zona_horaria: 'America/Santiago', p_intento_id: intento(),
    })
    const id = r.resultado.propuesta_id as string
    await ok(O, 'open_proposal', { p_propuesta_id: id })
    return id
  }
  const publicar = async (prop: string) => {
    const r = await ok(O, 'evaluate_and_publish', { p_propuesta_id: prop, p_intento_id: intento() })
    expect(r.resultado.tipo).toBe('opcion_publicada')
    return r
  }

  beforeAll(async () => {
    ;[O, U, V] = await Promise.all([nuevaSesion(), nuevaSesion(), nuevaSesion()])
    demo = await demoPrueba(O)
    await ok(U, 'join_space', { p_codigo: demo.codigo, p_nombre_visible: 'Uno t' })
    await ok(V, 'join_space', { p_codigo: demo.codigo, p_nombre_visible: 'Dos t' })
    ids = Object.fromEntries((await ok(O, 'get_space', { p_espacio_id: demo.espacioId })).espacio.miembros.map((m: Json) => [m.nombre, m.miembro_id]))
  }, 60_000)

  it('1. "así no puedo" no es baja, deja actualizar la disponibilidad y después se puede aceptar; idempotente y validado', async () => {
    const p = await nueva('t-e13-1', 3)
    await condiciones(O, p, SI)
    await condiciones(U, p, SI)
    await simCond(p, 'Mati', SI)
    await publicar(p) // v1 en A: Tomi, Uno y Mati (Dos sin condiciones)
    expect(err(await opinar(V, p, 1))).toBe('fuera_de_audiencia/no_elegible_en_version')
    expect(err(await opinar(U, p, 2))).toBe('opcion_desactualizada/version_no_vigente')
    expect(err(await opinar(U, p, 1, 'prefiero_otro'))).toBe('entrada_incompleta/opinion_invalida')
    // Antes de opinar, sus condiciones están congeladas (es elegible de la versión vigente).
    expect(err(await condiciones(U, p, SOLO_B))).toBe('no_autorizado/condiciones_congeladas')
    expect((await estado(U, p)).mi_situacion.puede).toMatchObject({ opinar: true, guardar_condiciones: false })

    const i1 = intento()
    const r = await opinar(U, p, 1, 'asi_no_puedo', i1)
    expect(r.resultado).toEqual({ opinion: 'asi_no_puedo', repetido: false })
    expect(r.propuesta.estado).toBe('esperando_compromisos')
    expect(r.propuesta.mi_situacion).toMatchObject({ mi_opinion: 'asi_no_puedo', retirado: false, puede: { guardar_condiciones: true } })
    expect(r.propuesta.bajas).toEqual([])
    // Mismo intento: repetido; mismo intento con otra opinión: rechazo.
    expect((await opinar(U, p, 1, 'asi_no_puedo', i1)).resultado.repetido).toBe(true)
    expect(err(await opinar(U, p, 1, 'retirar_opinion', i1))).toBe('entrada_incompleta/intento_reutilizado')
    // Retirar la opinión y volver a darla.
    expect((await opinar(U, p, 1, 'retirar_opinion')).resultado).toEqual({ opinion: null, repetido: false })
    expect((await estado(U, p)).mi_situacion).toMatchObject({ mi_opinion: null, puede: { guardar_condiciones: false } })
    expect((await opinar(U, p, 1, 'retirar_opinion')).resultado.repetido).toBe(true)
    await opinar(U, p, 1)
    // El organizador no ve totales con 1; nadie más los ve.
    expect((await estado(O, p)).opiniones_totales).toEqual({ asi_no_puedo: null })
    expect((await estado(V, p)).opiniones_totales).toBeNull()
    expect((await estado(U, p)).opiniones_totales).toBeNull()
    // Vuelve a poder actualizar su disponibilidad; la versión vigente no cambia.
    expect(err(await condiciones(U, p, SOLO_B))).toBe('ok')
    expect((await estado(U, p)).opcion.version).toBe(1)
    // Aceptar después funciona (sigue siendo elegible de esa versión) y la opinión deja de contar.
    await aceptar(U, p, 1)
    const despues = await estado(U, p)
    expect(despues.mi_situacion).toMatchObject({ acepte_version: true, mi_opinion: null })
    expect(err(await opinar(U, p, 1))).toBe('no_autorizado/ya_acepto')
    await aceptar(O, p, 1)
    await ok(O, 'cancel_proposal', { p_propuesta_id: p })
  })

  it('2 y 3. totales solo al organizador (null con 1, 2 con 2, sin nombres); rearmar desde esperando_compromisos; tope de 3 versiones', async () => {
    const p = await nueva('t-e13-2', 3)
    for (const s of [O, U, V]) await condiciones(s, p, SI)
    await simCond(p, 'Mati', SI)
    await publicar(p) // v1 en A: Tomi, Uno, Dos y Mati
    // Sin "así no puedo": no se puede rearmar desde esperando_compromisos.
    expect(err(await rearmar(p))).toBe('opcion_desactualizada/estado_no_admite')
    await aceptar(O, p, 1)
    await opinar(U, p, 1)
    let org = await estado(O, p)
    expect(org.opiniones_totales).toEqual({ asi_no_puedo: null })
    expect(org.mi_situacion.puede.proponer_reparacion).toBe(false)
    expect(org.siguiente_accion.codigo).toBe('ya_aceptaste')
    await opinar(V, p, 1)
    org = await estado(O, p)
    expect(org.opiniones_totales).toEqual({ asi_no_puedo: 2 })
    expect(org.siguiente_accion).toEqual(REARMAR)
    expect(org.mi_situacion.puede.proponer_reparacion).toBe(true)
    // Nadie más ve totales ni opiniones ajenas; ninguna respuesta compartida trae nombres de quienes opinaron.
    for (const s of [U, V]) expect((await estado(s, p)).opiniones_totales).toBeNull()
    for (const txt of [JSON.stringify(org), JSON.stringify(await ok(O, 'list_proposals', { p_espacio_id: demo.espacioId }))]) {
      expect(txt).not.toContain('Uno t')
      expect(txt).not.toContain('Dos t')
    }
    expect(JSON.stringify(await estado(U, p))).not.toContain('Dos t')

    // Rearmar con lo nuevo: Uno y Dos ya no pueden en A; con mínimo 3 la A no alcanza y sale la B.
    await condiciones(U, p, SOLO_B)
    await condiciones(V, p, SOLO_B)
    const ir = intento()
    const v2 = await rearmar(p, ir)
    expect(err(v2)).toBe('ok')
    expect(v2.resultado).toMatchObject({ tipo: 'reparacion_publicada', version: 2, franja: 'B' })
    expect(v2.propuesta.opcion.cupos.confirmados).toBe(0) // no hereda la aceptación de Tomi
    expect(v2.propuesta.opiniones_totales).toEqual({ asi_no_puedo: null })
    expect((await estado(U, p)).mi_situacion.mi_opinion).toBeNull() // no hereda opiniones
    expect((await rearmar(p, ir)).resultado.repetido).toBe(true)

    // v2 → v3 → tope.
    await opinar(U, p, 2)
    expect((await rearmar(p)).resultado.version).toBe(3)
    await opinar(U, p, 3)
    await opinar(V, p, 3)
    const v3 = await estado(O, p)
    expect(v3.opiniones_totales).toEqual({ asi_no_puedo: 2 })
    expect(v3.mi_situacion.puede.proponer_reparacion).toBe(false) // ya no quedan versiones
    expect(v3.siguiente_accion).not.toEqual(REARMAR)
    expect(err(await rearmar(p))).toBe('sin_alternativa/tope_versiones')
    // En revisión con la versión 3: no se ofrece rearmar y se dice el tope (0047).
    await ok(U, 'withdraw_commitment', { p_propuesta_id: p })
    await ok(V, 'withdraw_commitment', { p_propuesta_id: p })
    const rev = await estado(O, p)
    expect(rev.estado).toBe('en_revision')
    expect(rev.mi_situacion.puede.proponer_reparacion).toBe(false)
    expect(rev.siguiente_accion).toEqual({ codigo: 'sin_alternativa', texto: 'Esta propuesta ya tuvo tres versiones. El organizador puede cancelarla.' })
    await ok(O, 'cancel_proposal', { p_propuesta_id: p })
  })

  it('4. baja sin nombre: ninguna respuesta compartida trae quién se retiró; quien se retira recibe las gracias', async () => {
    const p = await nueva('t-e13-4', 2)
    for (const s of [O, U, V]) await condiciones(s, p, SI)
    await simCond(p, 'Mati', SI)
    await publicar(p)
    const baja = await ok(V, 'withdraw_commitment', { p_propuesta_id: p })
    // La propia, como hoy, y el agradecimiento sin pedir motivo.
    expect(baja.propuesta.bajas).toEqual([expect.objectContaining({ miembro: expect.objectContaining({ nombre: 'Dos t' }), habia_aceptado: false })])
    expect(baja.propuesta.siguiente_accion.texto).toBe(GRACIAS)
    expect(baja.propuesta.mi_situacion.retirado).toBe(true)
    // Para los demás (organizador incluido): "Una persona", sin decir si había confirmado.
    for (const s of [O, U]) {
      const e = await estado(s, p)
      expect(e.bajas).toEqual([{ miembro: ANON, en: expect.any(Object), version: 1, habia_aceptado: null }])
      const ev = e.historial.filter((x: Json) => x.tipo === 'baja')
      expect(ev).toHaveLength(1)
      expect(ev[0].actor).toEqual(ANON)
      const txt = JSON.stringify(e)
      expect(txt).not.toContain('Dos t')
      expect(txt).not.toContain(ids['Dos t'])
      expect(e.siguiente_accion.texto).not.toBe(GRACIAS)
    }
    // Una baja simulada que hace el organizador tampoco nombra a nadie en la propuesta.
    const sim = await ok(O, 'simulate_withdraw', { p_propuesta_id: p, p_miembro_id: ids.Mati })
    expect(JSON.stringify(sim.propuesta)).not.toContain(ids.Mati)
    expect(sim.propuesta.bajas).toHaveLength(2)
    // Quien confirmó y después se retiró: para los demás su aceptación ya no sale (0047; una aceptación anónima decía
    // que había confirmado) y la baja va sin cambio de estado ni rastro de simulación. Él sí ve lo suyo.
    await aceptar(U, p, 1)
    await ok(U, 'withdraw_commitment', { p_propuesta_id: p })
    const org = await estado(O, p)
    expect(JSON.stringify(org)).not.toContain('Uno t')
    expect(org.historial.filter((x: Json) => x.tipo === 'aceptacion' && x.actor?.miembro_id !== demo.miembroId)).toHaveLength(0)
    for (const b of org.historial.filter((x: Json) => x.tipo === 'baja')) {
      expect(b).toMatchObject({ actor: ANON, actor_tipo: 'persona', ejecutado_por: null, estado_previo: null, estado_nuevo: null })
    }
    expect(org.bajas.every((b: Json) => b.habia_aceptado === null && b.miembro.miembro_id === null)).toBe(true)
    const propia = await estado(U, p)
    expect(propia.historial.some((x: Json) => x.tipo === 'aceptacion' && x.actor?.nombre === 'Uno t')).toBe(true)
    expect(propia.bajas.find((b: Json) => b.miembro.nombre === 'Uno t')).toMatchObject({ habia_aceptado: true })
    await ok(O, 'cancel_proposal', { p_propuesta_id: p })
  })

  it('0047: el organizador no cuenta su propia opinión; aceptar no baja el total; si se retira el imprescindible, los cupos no lo dicen', async () => {
    const p = await nueva('t-e13-7', 3)
    for (const s of [O, U, V]) await condiciones(s, p, SI)
    await simCond(p, 'Mati', SI)
    await publicar(p)
    await opinar(O, p, 1) // el organizador también es elegible
    await opinar(U, p, 1)
    expect((await estado(O, p)).opiniones_totales).toEqual({ asi_no_puedo: null }) // solo 1 de los demás
    await opinar(V, p, 1)
    let org = await estado(O, p)
    expect(org.opiniones_totales).toEqual({ asi_no_puedo: 2 })
    expect(org.mi_situacion.puede.proponer_reparacion).toBe(true)
    // Uno acepta: el total que ve el organizador no cambia (si bajara, la aceptación con nombre delataría que opinó).
    await aceptar(U, p, 1)
    org = await estado(O, p)
    expect(org.opiniones_totales).toEqual({ asi_no_puedo: 2 })
    // El imprescindible (Tomi) se retira: los demás no lo ven en los cupos.
    await ok(O, 'withdraw_commitment', { p_propuesta_id: p })
    const deUno = await estado(U, p)
    expect(deUno.estado).toBe('en_revision')
    expect(deUno.opcion.cupos).toMatchObject({ imprescindible_acepto: false, reservado_imprescindible: true })
    expect(deUno.bajas).toEqual([{ miembro: ANON, en: expect.any(Object), version: 1, habia_aceptado: null }])
  })

  it('5. la parrilla del parque aparece como candidata del asado', async () => {
    const hoy = (await ok(O, 'server_info')).servidor_ahora.local.slice(0, 10)
    const d = new Date(`${hoy}T00:00:00Z`)
    do d.setUTCDate(d.getUTCDate() + 1)
    while (d.getUTCDay() !== 6)
    const r = (await ok(O, 'proponer_plan_borrador', {
      p_espacio_id: demo.espacioId, p_sabado: d.toISOString().slice(0, 10), p_clima: { sabado: 'seco', domingo: 'seco' },
    })).resultado
    const c = r.candidatas.find((x: Json) => x.id === 'lugar-sim-14')
    expect(c).toBeTruthy()
    expect(c).toMatchObject({ actividad: 'asado', lugar: { nombre: 'Parrilla del parque (Simulación)', simulado: true }, titulo: 'Asado en una parrilla del parque' })
  })

  it('6. catálogo 43/0: opinar_version sin sesión no se ejecuta', async () => {
    expect(Object.keys(PERMITIDAS)).toHaveLength(TOTAL_PERMITIDAS)
    expect(TOTAL_PERMITIDAS).toBe(43)
    const a = await rpcCrudo(clienteSinSesion(), 'opinar_version', PERMITIDAS.opinar_version())
    expect(a.error?.code).toBe('42501')
    expect(err(await rpc(O, 'opinar_version', PERMITIDAS.opinar_version()))).toBe('fuera_de_audiencia/no_miembro')
  })
})
