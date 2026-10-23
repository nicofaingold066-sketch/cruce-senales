// Integración por RPC real: no maneja un navegador ni certifica el render de la UI.
// Cada ejecución crea SOLO dos identidades anónimas y su propio demo ficticio.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// JSON de frontera: las formas y valores importantes se verifican en ejecución.
type Json = Record<string, any>
const CODIGOS = ['abrir_propuesta', 'reunir_condiciones', 'buscar_opcion', 'sin_opcion',
  'aceptar_version', 'te_toca_aceptar', 'ya_aceptaste', 'grupo_confirmado',
  'buscar_alternativa', 'sin_alternativa', 'expirado', 'cancelado']
const FRANJAS = [
  { inicio: '2026-10-31T14:00', fin: '2026-10-31T17:00' },
  { inicio: '2026-11-01T14:00', fin: '2026-11-01T17:00' },
]
const SI = { A: 'si', B: 'si' }

describe('recorrido canónico real · dos sesiones · contrato 2/enmienda 3', () => {
  let tomi: SupabaseClient
  let luna: SupabaseClient
  let espacio: Json
  let ids: Record<string, string>
  const authIds: string[] = []
  const propuestas: string[] = []
  let llamadas = 0

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

  async function llamar(c: SupabaseClient, fn: string, args: Json = {}, exito = true): Promise<Json> {
    const { data, error } = await c.rpc(fn, args).abortSignal(AbortSignal.timeout(20_000))
    // No volcar el cliente, argumentos privados ni JWT a la salida de pruebas.
    expect(error?.code ?? null, `${fn}: error de transporte`).toBeNull()
    expect(data, `${fn}: sobre ausente`).toBeTruthy()
    const r = data as Json
    expect(r.contrato, fn).toBe(2)
    expect(r.ok, `${fn}: ${r.error?.codigo ?? ''}/${r.error?.detalle ?? ''}`).toBe(exito)
    // Solo save/get propios pueden devolver condiciones en la raíz al llamador.
    const compartido = { ...r }
    if (fn === 'save_my_conditions' || fn === 'get_my_conditions') delete compartido.condiciones
    privadaAusente(compartido)
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
    paso(await mirar(luna, id), 'en_revision', 'buscar_alternativa', 3)
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
    expect(segundaSesion.opcion).toEqual(fin.opcion)
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
})
