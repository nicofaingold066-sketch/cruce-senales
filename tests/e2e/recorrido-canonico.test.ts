// Integración por RPC real: no maneja un navegador ni certifica el render de la UI.
// Cada ejecución crea SOLO dos identidades anónimas y su propio demo ficticio.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// JSON de frontera: las formas y valores importantes se verifican en ejecución.
type Json = Record<string, any>
// Enmienda 7 (E7.2): la opción sin `cupos.pendientes`, que solo recibe el organizador de la propuesta.
const sinPendientes = (o: Json) => ({ ...o, cupos: { ...o.cupos, pendientes: 'solo_organizador' } })
const CODIGOS = ['abrir_propuesta', 'reunir_condiciones', 'buscar_opcion', 'sin_opcion',
  'aceptar_version', 'te_toca_aceptar', 'ya_aceptaste', 'grupo_confirmado',
  'buscar_alternativa', 'sin_alternativa', 'expirado', 'cancelado']
const FRANJAS = [
  { inicio: '2026-10-31T14:00', fin: '2026-10-31T17:00' },
  { inicio: '2026-11-01T14:00', fin: '2026-11-01T17:00' },
]
const SI = { A: 'si', B: 'si' }
const NOMBRES = ['Tomi', 'Luna', 'Mati', 'Caro', 'Fede', 'Sofi']

// Misma guardia que tests/e2e/base-libre.mjs: si backend está migrando, la suite se salta en vez de escribir en la base.
function baseOcupada(): boolean {
  try {
    execFileSync('git', ['fetch', '-q', 'origin', 'coordinacion'], { stdio: 'pipe' })
    const ficha = execFileSync('git', ['show', 'origin/coordinacion:agentes/backend.md'], { encoding: 'utf8' })
    const tocando = ficha.match(/## Tocando ahora\s*\n([\s\S]*?)(?=\n## |$)/)?.[1] ?? ''
    return /MIGRACION EN CURSO|PRUEBA DE CARGA EN CURSO/i.test(tocando)
  } catch {
    return false // sin acceso a la coordinación se corre igual, como hasta hoy
  }
}
const BASE_OCUPADA = baseOcupada()
if (BASE_OCUPADA) console.log('PAUSADO: backend migrando o midiendo carga (agentes/backend.md); recorrido canónico saltado.')

/** Enmienda 13 todavía sin aplicar en el servidor: la prueba se marca saltada (vuelve a correr sola cuando llegue). */
function pendienteE13(ctx: { skip?: (nota?: string) => void }) {
  console.log('E13 pendiente: el servidor no trae mi_opinion/opiniones_totales; comprobación saltada.')
  ctx.skip?.('E13 pendiente en el servidor')
}

describe.skipIf(BASE_OCUPADA)('recorrido canónico real · dos sesiones · contrato 2/enmiendas 3 y 13', () => {
  let tomi: SupabaseClient
  let luna: SupabaseClient
  let espacio: Json
  let ids: Record<string, string>
  const authIds: string[] = []
  const propuestas: string[] = []
  let llamadas = 0
  // Enmienda 13: se detecta en la primera propuesta por sus claves nuevas. Hasta que backend la aplique, sus
  // comprobaciones se saltan y se avisa; después corren siempre.
  let e13: boolean | null = null
  function detectarE13(p: Json) {
    if (e13 === null && p?.mi_situacion) e13 = 'mi_opinion' in p.mi_situacion || 'opiniones_totales' in p
  }
  /** E13 (a): `opiniones_totales` llega como `{ asi_no_puedo: n }` con n null si hay menos de 2 (o nada para quien no organiza). */
  const totalAsiNoPuedo = (p: Json): number | null => p?.opiniones_totales?.asi_no_puedo ?? null
  /** E13 (c): la baja no trae nombre ni si había confirmado, en ninguna respuesta compartida (tampoco al organizador). */
  function bajaSinNombre(p: Json, quien: string, ruta: string) {
    if (!e13) return
    // `ejecutado_por` es quien corrió la simulación (el organizador): público.
    const eventos = (p.historial ?? []).filter((e: Json) => e.tipo === 'baja').map(({ ejecutado_por: _simula, ...e }: Json) => e)
    const baja = JSON.stringify({ bajas: p.bajas ?? null, eventos })
    for (const n of NOMBRES) expect(baja.includes(`"${n}"`), `${ruta}: la baja nombra a ${n}`).toBe(false)
    // Backend deja la clave con null (no la quita): lo que no puede haber es true/false.
    for (const b of Array.isArray(p.bajas) ? p.bajas : []) expect(b?.habia_aceptado ?? null, `${ruta}: la baja dice si había confirmado`).toBeNull()
    // "Sin decir si había confirmado": la aceptación vieja de quien se retiró también sale sin actor.
    for (const e of (p.historial ?? []).filter((e: Json) => e.tipo === 'aceptacion')) expect(e.actor?.nombre ?? null, `${ruta}: la aceptación de ${quien} (que se retiró) conserva el nombre`).not.toBe(quien)
    expect(JSON.stringify(p.siguiente_accion ?? null).includes(quien), `${ruta}: siguiente_accion nombra a ${quien}`).toBe(false)
  }

  function privadaAusente(valor: unknown, ruta = 'respuesta'): void {
    if (typeof valor === 'string') {
      expect(authIds.includes(valor), `${ruta}: id de Auth expuesto`).toBe(false)
      return
    }
    if (!valor || typeof valor !== 'object') return
    for (const [k, v] of Object.entries(valor)) {
      // El estado de MIS condiciones está autorizado; nunca un mapa de disponibilidad.
      if (k === 'condiciones' && ruta.endsWith('.mi_situacion')) {
        expect(['sin_cargar', 'incompletas', 'completas']).toContain(v)
        continue
      }
      expect(['disponibilidad', 'condiciones', 'preferencias', 'elegibles', 'user_id', 'p_intento_id',
        'access_token', 'refresh_token'].includes(k), `${ruta}.${k}: campo privado expuesto`).toBe(false)
      privadaAusente(v, `${ruta}.${k}`)
    }
  }

  /** `exito` null: se acepta ok o error (para ramas que el contrato deja abiertas). */
  async function llamar(c: SupabaseClient, fn: string, args: Json = {}, exito: boolean | null = true): Promise<Json> {
    const { data, error } = await c.rpc(fn, args).abortSignal(AbortSignal.timeout(20_000))
    // No volcar el cliente, argumentos privados ni JWT a la salida de pruebas.
    expect(error?.code ?? null, `${fn}: error de transporte`).toBeNull()
    expect(data, `${fn}: sobre ausente`).toBeTruthy()
    const r = data as Json
    expect(r.contrato, fn).toBe(2)
    if (exito !== null) expect(r.ok, `${fn}: ${r.error?.codigo ?? ''}/${r.error?.detalle ?? ''}`).toBe(exito)
    // Solo save/get propios pueden devolver condiciones en la raíz al llamador.
    const compartido = { ...r }
    if (fn === 'save_my_conditions' || fn === 'get_my_conditions') delete compartido.condiciones
    privadaAusente(compartido)
    if (r.propuesta) detectarE13(r.propuesta)
    if (r.propuesta) expect(CODIGOS).toContain(r.propuesta.siguiente_accion.codigo)
    if (r.propuestas) for (const p of r.propuestas) expect(CODIGOS).toContain(p.siguiente_accion.codigo)
    llamadas++
    return r
  }

  function paso(p: Json, estado: string, codigo: string, confirmados = 0) {
    expect(p.estado).toBe(estado)
    expect(p.siguiente_accion.codigo).toBe(codigo)
    expect(p.confirmados).toBe(confirmados)
    expect(p.minimo).toBe(4)
    expect(p.maximo).toBe(6)
  }

  async function mirar(c: SupabaseClient, id: string) {
    return (await llamar(c, 'get_proposal_state', { p_propuesta_id: id })).propuesta as Json
  }

  async function preparar(tomiDisponible = true): Promise<string> {
    const r = await llamar(tomi, 'create_proposal', {
      p_espacio_id: espacio.id, p_titulo: 'Asado en casa de Tomi', p_franjas: FRANJAS,
      p_minimo: 4, p_maximo: 6, p_imprescindible_id: ids.Tomi,
      p_plazo: '2026-10-29T20:00', p_zona_horaria: 'America/Santiago', p_intento_id: randomUUID(),
    })
    const id = r.resultado.propuesta_id as string
    propuestas.push(id)
    paso(r.propuesta, 'borrador', 'abrir_propuesta')
    paso((await llamar(tomi, 'open_proposal', { p_propuesta_id: id })).propuesta, 'reuniendo_interes', 'reunir_condiciones')
    paso((await llamar(luna, 'mark_interest', { p_propuesta_id: id, p_interesado: true })).propuesta, 'reuniendo_interes', 'reunir_condiciones')
    const interes = await llamar(tomi, 'simulate_mark_interest', { p_propuesta_id: id, p_miembro_id: ids.Mati, p_interesado: true })
    paso(interes.propuesta, 'reuniendo_interes', 'reunir_condiciones')
    expect(interes.propuesta.interesados.cantidad).toBe(2)
    expect(interes.propuesta.opcion).toBeNull()
    await llamar(tomi, 'save_my_conditions', { p_propuesta_id: id, p_disponibilidad: tomiDisponible ? SI : { A: 'no', B: 'no' } })
    await llamar(luna, 'save_my_conditions', { p_propuesta_id: id, p_disponibilidad: SI })
    const carga = await llamar(tomi, 'simulate_load_case', { p_propuesta_id: id, p_intento_id: randomUUID() })
    expect(carga.resultado.cargados.map((m: Json) => m.nombre)).toEqual(['Mati', 'Caro', 'Fede', 'Sofi'])
    paso(carga.propuesta, 'reuniendo_interes', 'buscar_opcion')
    const propia = await llamar(luna, 'get_my_conditions', { p_propuesta_id: id })
    expect(propia.condiciones.disponibilidad).toEqual(SI)
    const prohibida = await llamar(luna, 'get_simulation_panel', { p_propuesta_id: id }, false)
    expect(prohibida.error).toMatchObject({ codigo: 'no_autorizado', detalle: 'no_es_organizador_espacio' })
    return id
  }

  async function aceptar(c: SupabaseClient, id: string, version: number, nombre?: string) {
    return llamar(c, nombre ? 'simulate_accept' : 'accept_version', {
      p_propuesta_id: id, p_version: version, p_intento_id: randomUUID(),
      ...(nombre ? { p_miembro_id: ids[nombre] } : {}),
    })
  }

  async function confirmarV1(id: string) {
    const ev = await llamar(tomi, 'evaluate_and_publish', { p_propuesta_id: id, p_intento_id: randomUUID() })
    expect(ev.resultado).toMatchObject({ tipo: 'opcion_publicada', version: 1, franja: 'A' })
    paso(ev.propuesta, 'esperando_compromisos', 'te_toca_aceptar')
    paso((await aceptar(luna, id, 1)).propuesta, 'esperando_compromisos', 'ya_aceptaste', 1)
    paso((await aceptar(tomi, id, 1, 'Mati')).propuesta, 'esperando_compromisos', 'te_toca_aceptar', 2)
    paso((await aceptar(tomi, id, 1, 'Caro')).propuesta, 'esperando_compromisos', 'te_toca_aceptar', 3)
    paso((await aceptar(tomi, id, 1)).propuesta, 'grupo_confirmado', 'grupo_confirmado', 4)
    paso(await mirar(luna, id), 'grupo_confirmado', 'grupo_confirmado', 4)
  }

  async function bajarCaro(id: string) {
    const r = await llamar(tomi, 'simulate_withdraw', { p_propuesta_id: id, p_miembro_id: ids.Caro })
    expect(r.resultado.efecto).toBe('pasa_a_revision')
    paso(r.propuesta, 'en_revision', 'buscar_alternativa', 3)
    bajaSinNombre(r.propuesta, 'Caro', 'Tomi (organizador)')
    const deLuna = await mirar(luna, id)
    paso(deLuna, 'en_revision', 'buscar_alternativa', 3)
    bajaSinNombre(deLuna, 'Caro', 'Luna')
  }

  beforeAll(async () => {
    const url = process.env.VITE_SUPABASE_URL ?? ''
    const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''
    expect(new URL(url).hostname).toBe('tjkfdnvzsikncjbskufm.supabase.co')
    expect(key.startsWith('sb_publishable_'), 'Solo se admite la clave pública publishable').toBe(true)
    for (const nombre of ['Tomi', 'Luna']) {
      const c = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
      const { data, error } = await c.auth.signInAnonymously()
      expect(error?.code ?? null, `Auth ${nombre}`).toBeNull()
      expect(data.user).toBeTruthy()
      authIds.push(data.user!.id)
      if (nombre === 'Tomi') tomi = c
      else luna = c
    }
    expect(authIds[0]).not.toBe(authIds[1])
    espacio = (await llamar(tomi, 'seed_demo_space')).espacio
    expect(espacio.nombre).toBe('Los del asado')
    expect(espacio.demo).toBe(true)
    ids = Object.fromEntries(espacio.miembros.map((m: Json) => [m.nombre, m.miembro_id]))
    // Solo se reinicia el demo recién creado por ESTA identidad, nunca la demo humana.
    const reset = await llamar(tomi, 'reset_demo', { p_espacio_id: espacio.id, p_intento_id: randomUUID() })
    expect(reset.resultado.propuestas_eliminadas).toBe(0)
    const j = await llamar(luna, 'join_space', { p_codigo: espacio.codigo_invitacion, p_nombre_visible: 'Luna' })
    expect(j.resultado.reclamo_asiento_simulado).toBe(true)
    expect(j.resultado.miembro_id).toBe(ids.Luna)
    console.log('Dos sesiones independientes; demo propio reiniciado; Luna reclama asiento limpio.')
  }, 60_000)

  afterAll(async () => {
    // Conservar la evidencia en stdout, pero no propuestas abiertas de prueba.
    for (const id of propuestas) await llamar(tomi, 'cancel_proposal', { p_propuesta_id: id })
    for (const c of [tomi, luna]) if (c) await c.auth.signOut()
    console.log(`RPC verificadas: ${llamadas} (cada respuesta se comprobó por privacidad y contrato).`)
  }, 60_000)

  it('A/v1 → 4 aceptaciones → baja → B/v2 con cero heredadas → 4 nuevas aceptaciones', async () => {
    const id = await preparar()
    await confirmarV1(id)
    await bajarCaro(id)
    const rep = await llamar(tomi, 'propose_repair', { p_propuesta_id: id, p_intento_id: randomUUID() })
    expect(rep.resultado).toMatchObject({ tipo: 'reparacion_publicada', version: 2, franja: 'B' })
    paso(rep.propuesta, 'esperando_compromisos', 'te_toca_aceptar')
    expect(rep.propuesta.opcion.aceptaron).toEqual([])
    expect(rep.propuesta.opcion.cupos.confirmados).toBe(0)
    expect(rep.propuesta.opcion.cupos.pendientes).toBe(5) // Sofi también es elegible, no obligatoria.
    expect(rep.propuesta.siguiente_accion.texto).not.toMatch(/reparado|grupo confirmado/i)
    const vieja = await llamar(luna, 'accept_version', { p_propuesta_id: id, p_version: 1, p_intento_id: randomUUID() }, false)
    expect(vieja.error).toMatchObject({ codigo: 'opcion_desactualizada', detalle: 'version_no_vigente' })
    paso(await mirar(luna, id), 'esperando_compromisos', 'te_toca_aceptar')
    paso((await aceptar(luna, id, 2)).propuesta, 'esperando_compromisos', 'ya_aceptaste', 1)
    paso((await aceptar(tomi, id, 2, 'Mati')).propuesta, 'esperando_compromisos', 'te_toca_aceptar', 2)
    paso((await aceptar(tomi, id, 2, 'Fede')).propuesta, 'esperando_compromisos', 'te_toca_aceptar', 3)
    const fin = (await aceptar(tomi, id, 2)).propuesta
    paso(fin, 'grupo_confirmado', 'grupo_confirmado', 4)
    const segundaSesion = await mirar(luna, id)
    paso(segundaSesion, 'grupo_confirmado', 'grupo_confirmado', 4)
    expect(segundaSesion.state_rev).toBe(fin.state_rev)
    // Enmienda 7 (E7.2): `cupos.pendientes` solo lo ve el organizador (Tomi); Luna recibe null y el resto de la
    // opción es idéntico en las dos sesiones.
    expect(segundaSesion.opcion.cupos.pendientes).toBeNull()
    expect(fin.opcion.cupos.pendientes).toEqual(expect.any(Number))
    expect(sinPendientes(segundaSesion.opcion)).toEqual(sinPendientes(fin.opcion))
    expect(fin.opcion.aceptaron.map((a: Json) => a.miembro.nombre).sort()).toEqual(['Fede', 'Luna', 'Mati', 'Tomi'])
    await llamar(luna, 'list_proposals', { p_espacio_id: espacio.id })
    console.log('PASÓ: A/v1 confirmada en ambas sesiones; baja; B/v2 cero heredadas; v1 rechazada; v2 confirmada.')
  }, 120_000)

  it('sin opción inicial: imprescindible no disponible, mínimo intacto, sin versión inventada', async () => {
    const id = await preparar(false)
    const r = await llamar(tomi, 'evaluate_and_publish', { p_propuesta_id: id, p_intento_id: randomUUID() })
    expect(r.resultado).toMatchObject({ tipo: 'sin_opcion', version: null, franja: null })
    paso(r.propuesta, 'reuniendo_interes', 'sin_opcion')
    expect(r.propuesta.opcion).toBeNull()
    paso(await mirar(luna, id), 'reuniendo_interes', 'sin_opcion')
    console.log('PASÓ: sin opción inicial; mínimo 4 y máximo 6; sin publicar versión ni motivo privado.')
  }, 90_000)

  it('sin alternativa tras la baja: sigue En revisión y conserva v1, sin fingir reparación', async () => {
    const id = await preparar()
    await confirmarV1(id)
    await bajarCaro(id)
    await llamar(tomi, 'save_my_conditions', { p_propuesta_id: id, p_disponibilidad: { A: 'no', B: 'no' } })
    const r = await llamar(tomi, 'propose_repair', { p_propuesta_id: id, p_intento_id: randomUUID() }, false)
    expect(r.error).toMatchObject({ codigo: 'sin_alternativa', detalle: 'sin_alternativa' })
    const p = await mirar(luna, id)
    paso(p, 'en_revision', 'sin_alternativa', 3)
    expect(p.opcion.version).toBe(1)
    expect(p.ultima_evaluacion.resultado).toBe('sin_alternativa')
    console.log('PASÓ: sin alternativa tras baja; En revisión; v1 conservada; mínimo intacto.')
  }, 120_000)

  // Enmienda 13 (docs/contrato-enmienda-13.md). Solo dos identidades reales: Luna y Tomi son las dos opiniones.
  it('E13: opinar sin bajarse; totales null con 1 y solo al organizador; rearmar desde esperando_compromisos con cero heredadas', async (ctx) => {
    const id = await preparar()
    if (!e13) return pendienteE13(ctx)
    const ev = await llamar(tomi, 'evaluate_and_publish', { p_propuesta_id: id, p_intento_id: randomUUID() })
    expect(ev.resultado).toMatchObject({ tipo: 'opcion_publicada', version: 1 })
    paso(ev.propuesta, 'esperando_compromisos', 'te_toca_aceptar')
    expect(totalAsiNoPuedo(ev.propuesta), 'cero opiniones: null también para el organizador').toBeNull()
    // (a) Luna opina sin bajarse. El mismo intento dos veces es UNA opinión.
    const intento = randomUUID()
    const op = await llamar(luna, 'opinar_version', { p_propuesta_id: id, p_version: 1, p_opinion: 'asi_no_puedo', p_intento_id: intento })
    const repetida = await llamar(luna, 'opinar_version', { p_propuesta_id: id, p_version: 1, p_opinion: 'asi_no_puedo', p_intento_id: intento })
    for (const p of [op.propuesta, repetida.propuesta]) {
      expect(p.estado).toBe('esperando_compromisos')
      expect(p.confirmados, 'opinar no es aceptar').toBe(0)
      expect(p.mi_situacion.mi_opinion).toBe('asi_no_puedo')
      expect(p.mi_situacion.retirado, 'opinar no es bajarse').toBe(false)
      expect(p.mi_situacion.puede.guardar_condiciones, 'vuelve a poder actualizar su disponibilidad').toBe(true)
      expect(totalAsiNoPuedo(p), 'Luna no es organizadora: nunca ve totales').toBeNull()
      expect(p.bajas ?? null).toEqual(ev.propuesta.bajas ?? null)
    }
    // Totales: el organizador ve null con 1.
    const t1 = await mirar(tomi, id)
    expect(totalAsiNoPuedo(t1), 'una sola opinión: el total sigue en null').toBeNull()
    expect(t1.mi_situacion.mi_opinion ?? null).toBeNull()
    // Segunda opinión (Tomi): el organizador ve 2, sin nombres; Luna sigue sin verlo; su siguiente acción es rearmar.
    const op2 = await llamar(tomi, 'opinar_version', { p_propuesta_id: id, p_version: 1, p_opinion: 'asi_no_puedo', p_intento_id: randomUUID() })
    expect(op2.propuesta.opiniones_totales).toEqual({ asi_no_puedo: 2 })
    expect(Object.keys(op2.propuesta.opiniones_totales), 'solo el total, ninguna otra clave').toEqual(['asi_no_puedo'])
    for (const n of NOMBRES) expect(JSON.stringify(op2.propuesta.opiniones_totales)).not.toContain(n)
    expect(op2.propuesta.siguiente_accion.codigo).toBe('buscar_opcion')
    expect(op2.propuesta.siguiente_accion.texto).toMatch(/rearmar/i)
    const l2 = await mirar(luna, id)
    expect(totalAsiNoPuedo(l2)).toBeNull()
    expect(l2.mi_situacion.mi_opinion).toBe('asi_no_puedo')
    // Versión no vigente: mismo rechazo que al aceptar.
    const noVigente = await llamar(luna, 'opinar_version', { p_propuesta_id: id, p_version: 2, p_opinion: 'asi_no_puedo', p_intento_id: randomUUID() }, false)
    expect(noVigente.error).toMatchObject({ codigo: 'opcion_desactualizada', detalle: 'version_no_vigente' })
    // (b) Luna actualiza su disponibilidad (A ya no) y el organizador rearma desde esperando_compromisos: v2 nace
    // con cero aceptaciones y cero opiniones, con la disponibilidad de ahora.
    await llamar(luna, 'save_my_conditions', { p_propuesta_id: id, p_disponibilidad: { A: 'no', B: 'si' } })
    const rep = await llamar(tomi, 'propose_repair', { p_propuesta_id: id, p_intento_id: randomUUID() })
    expect(rep.resultado).toMatchObject({ tipo: 'reparacion_publicada', version: 2 })
    paso(rep.propuesta, 'esperando_compromisos', 'te_toca_aceptar')
    expect(rep.propuesta.opcion.version).toBe(2)
    expect(rep.propuesta.opcion.aceptaron).toEqual([])
    expect(rep.propuesta.opcion.cupos.confirmados).toBe(0)
    expect(totalAsiNoPuedo(rep.propuesta), 'v2 no hereda opiniones').toBeNull()
    expect(rep.propuesta.mi_situacion.mi_opinion ?? null).toBeNull()
    expect(rep.propuesta.bajas ?? null, 'nadie se fue: opinar no reincorpora ni retira').toEqual(ev.propuesta.bajas ?? null)
    const l3 = await mirar(luna, id)
    expect(l3.opcion.version).toBe(2)
    expect(l3.mi_situacion.mi_opinion ?? null).toBeNull()
    expect(l3.mi_situacion.puede.aceptar).toBe(true)
    // Quien ya aceptó ESA versión no opina: primero se retira, como hoy.
    paso((await aceptar(luna, id, 2)).propuesta, 'esperando_compromisos', 'ya_aceptaste', 1)
    const yaAcepto = await llamar(luna, 'opinar_version', { p_propuesta_id: id, p_version: 2, p_opinion: 'asi_no_puedo', p_intento_id: randomUUID() }, false)
    expect(yaAcepto.error).toMatchObject({ codigo: 'no_autorizado', detalle: 'ya_acepto' })
    console.log('PASÓ E13: opinión sin baja; totales null con 1 y 2 con 2, solo al organizador; v2 desde esperando_compromisos con cero aceptaciones y opiniones.')
  }, 180_000)

  it('E13: rearmar sin ninguna opinión se rechaza; tope de 3 versiones', async (ctx) => {
    const id = await preparar()
    if (!e13) return pendienteE13(ctx)
    await llamar(tomi, 'evaluate_and_publish', { p_propuesta_id: id, p_intento_id: randomUUID() })
    // Sin "así no puedo" no hay nada que rearmar: rechazo tipado (backend, 21:22) y v1 sigue vigente.
    const sinMotivo = await llamar(tomi, 'propose_repair', { p_propuesta_id: id, p_intento_id: randomUUID() }, false)
    expect(sinMotivo.error).toMatchObject({ codigo: 'opcion_desactualizada', detalle: 'estado_no_admite' })
    expect((await mirar(luna, id)).opcion.version).toBe(1)
    // Con una opinión por versión: v2 y v3; la cuarta → sin_alternativa/tope_versiones. Si con dos franjas el servidor
    // no encuentra alternativa antes del tope, se anota (el tope lo cubre tests/backend/enmienda13.test.ts).
    for (const version of [1, 2, 3]) {
      await llamar(luna, 'opinar_version', { p_propuesta_id: id, p_version: version, p_opinion: 'asi_no_puedo', p_intento_id: randomUUID() })
      const r = await llamar(tomi, 'propose_repair', { p_propuesta_id: id, p_intento_id: randomUUID() }, version === 3 ? false : null)
      if (version === 3) {
        expect(r.error).toMatchObject({ codigo: 'sin_alternativa', detalle: 'tope_versiones' })
        expect((await mirar(luna, id)).opcion.version).toBe(3)
        break
      }
      if (!r.ok) {
        expect(r.error.codigo).toBe('sin_alternativa')
        console.log(`E13: sin alternativa al rearmar la versión ${version + 1} con dos franjas; el tope de versiones no se alcanzó en este recorrido.`)
        break
      }
      expect(r.resultado).toMatchObject({ tipo: 'reparacion_publicada', version: version + 1 })
      expect(r.propuesta.opcion.aceptaron).toEqual([])
      expect(totalAsiNoPuedo(r.propuesta)).toBeNull()
    }
    console.log('PASÓ E13: sin opiniones no se rearma; cada versión nueva nace sin aceptaciones ni opiniones.')
  }, 180_000)
})
