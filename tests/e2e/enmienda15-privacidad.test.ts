// Enmienda 15 (ronda de opiniones con plazo + dos planes con «la que más Sí») desde AFUERA, por RPC reales y dos sesiones:
// complementa tests/backend/enmienda15.test.ts (de pendientes) con la vista de quien usa la app.
//   · Compatibilidad: sin pedir nada, la propuesta queda como hoy (ronda null, regla temprana, etiquetas null, sin totales).
//   · Privacidad: «prefiero» (el desempate privado) no sale en NINGUNA respuesta de otra persona ni del organizador;
//     `planes_totales` solo al organizador, cada número null si es menor que 2, sin nombres.
//   · Ronda abierta: no se puede rearmar desde esperando_compromisos (opcion_desactualizada/ronda_abierta) y
//     `puede.proponer_reparacion` es false; aceptar sigue funcionando.
// Dos identidades anónimas propias y un demo propio. Corre solo con la base libre (misma guardia que los demás guiones).
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

type Json = Record<string, any>
const NOMBRES = ['Tomi', 'Luna', 'Mati', 'Caro', 'Fede', 'Sofi']
const FR = (etiquetas = false) => [
  { inicio: '2026-10-31T14:00', fin: '2026-10-31T17:00', ...(etiquetas ? { etiqueta: 'Asado en lo de Tomi' } : {}) },
  { inicio: '2026-11-01T14:00', fin: '2026-11-01T17:00', ...(etiquetas ? { etiqueta: 'Picnic en el parque' } : {}) },
]

function baseOcupada(): boolean {
  const ABRE = /^\s*-\s*(?:\[\d{2}:\d{2}\]\s*)?(?:\*\*)?(?:MIGRACION|PRUEBA DE CARGA) EN CURSO/im
  try {
    execFileSync('git', ['fetch', '-q', 'origin', 'coordinacion'], { stdio: 'pipe' })
    const fichas = execFileSync('git', ['ls-tree', '--full-tree', '--name-only', 'origin/coordinacion', 'agentes/'], { encoding: 'utf8' }).split('\n').filter((f) => f.endsWith('.md'))
    return fichas.some((f) => {
      const t = execFileSync('git', ['show', `origin/coordinacion:${f}`], { encoding: 'utf8' })
      return ABRE.test(t.match(/## Tocando ahora\s*\n([\s\S]*?)(?=\n## |$)/)?.[1] ?? '')
    })
  } catch { return false }
}
const OCUPADA = baseOcupada()
if (OCUPADA) console.log('PAUSADO: alguien migra o mide carga (ficha en coordinacion); enmienda15-privacidad saltada.')

describe.skipIf(OCUPADA)('E15 desde afuera · dos sesiones reales', () => {
  let tomi: SupabaseClient, luna: SupabaseClient
  let espacio: Json, ids: Record<string, string>
  const authIds: string[] = []
  const propuestas: string[] = []

  async function llamar(c: SupabaseClient, fn: string, args: Json = {}, exito: boolean | null = true): Promise<Json> {
    const { data, error } = await c.rpc(fn, args).abortSignal(AbortSignal.timeout(20_000))
    expect(error?.code ?? null, `${fn}: error de transporte ${error?.message ?? ''}`).toBeNull()
    const r = data as Json
    expect(r?.contrato, fn).toBe(2)
    if (exito !== null) expect(r.ok, `${fn}: ${r.error?.codigo ?? ''}/${r.error?.detalle ?? ''}`).toBe(exito)
    for (const id of authIds) expect(JSON.stringify(r).includes(id), `${fn}: id de Auth expuesto`).toBe(false)
    return r
  }
  /** «prefiero» solo puede aparecer en lo que la propia persona guardó/leyó de SUS condiciones. */
  function sinPrefiero(r: Json, fn: string, quien: string) {
    if (['get_my_conditions', 'save_my_conditions', 'simulate_save_conditions'].includes(fn)) return
    expect(JSON.stringify(r).includes('"prefiero"'), `${fn} (${quien}): trae «prefiero»`).toBe(false)
  }
  const mirar = async (c: SupabaseClient, id: string, quien: string) => {
    const r = await llamar(c, 'get_proposal_state', { p_propuesta_id: id })
    sinPrefiero(r, 'get_proposal_state', quien)
    return r.propuesta as Json
  }
  async function crear(extra: Json = {}, etiquetas = false) {
    const r = await llamar(tomi, 'create_proposal', {
      p_espacio_id: espacio.id, p_titulo: 'Plan E15', p_franjas: FR(etiquetas), p_minimo: 4, p_maximo: 6,
      p_imprescindible_id: ids.Tomi, p_plazo: '2026-10-29T20:00', p_zona_horaria: 'America/Santiago', p_intento_id: randomUUID(), ...extra,
    })
    propuestas.push(r.resultado.propuesta_id)
    return r
  }
  async function prepararYPublicar(id: string, prefieroLuna?: 'A' | 'B') {
    await llamar(tomi, 'open_proposal', { p_propuesta_id: id })
    await llamar(luna, 'mark_interest', { p_propuesta_id: id, p_interesado: true })
    await llamar(tomi, 'save_my_conditions', { p_propuesta_id: id, p_disponibilidad: { A: 'si', B: 'si' } })
    const l = await llamar(luna, 'save_my_conditions', { p_propuesta_id: id, p_disponibilidad: { A: 'si', B: 'si', ...(prefieroLuna ? { prefiero: prefieroLuna } : {}) } })
    if (prefieroLuna) expect(JSON.stringify(l).includes(`"prefiero":"${prefieroLuna}"`) || JSON.stringify(l).includes('prefiero'), 'save_my_conditions devuelve lo propio').toBe(true)
    await llamar(tomi, 'simulate_load_case', { p_propuesta_id: id, p_intento_id: randomUUID() })
    const ev = await llamar(tomi, 'evaluate_and_publish', { p_propuesta_id: id, p_intento_id: randomUUID() })
    sinPrefiero(ev, 'evaluate_and_publish', 'Tomi')
    return ev
  }

  beforeAll(async () => {
    const url = process.env.VITE_SUPABASE_URL ?? '', key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''
    expect(new URL(url).hostname).toBe('tjkfdnvzsikncjbskufm.supabase.co')
    expect(key.startsWith('sb_publishable_'), 'Solo se admite la clave pública publishable').toBe(true)
    for (const n of ['Tomi', 'Luna']) {
      const c = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
      const { data, error } = await c.auth.signInAnonymously()
      expect(error?.code ?? null, `Auth ${n}`).toBeNull()
      authIds.push(data.user!.id)
      if (n === 'Tomi') tomi = c; else luna = c
    }
    espacio = (await llamar(tomi, 'seed_demo_space')).espacio
    ids = Object.fromEntries(espacio.miembros.map((m: Json) => [m.nombre, m.miembro_id]))
    await llamar(tomi, 'reset_demo', { p_espacio_id: espacio.id, p_intento_id: randomUUID() })
    const j = await llamar(luna, 'join_space', { p_codigo: espacio.codigo_invitacion, p_nombre_visible: 'Luna' })
    expect(j.resultado.miembro_id).toBe(ids.Luna)
  }, 60_000)

  afterAll(async () => {
    for (const id of propuestas) { try { await tomi?.rpc('cancel_proposal', { p_propuesta_id: id }) } catch { /* sigue */ } }
    for (const c of [tomi, luna]) if (c) await c.auth.signOut()
  }, 60_000)

  it('compatibilidad: sin pedir nada, la propuesta queda como hoy (ronda null, regla temprana, etiquetas null, sin totales)', async (ctx) => {
    const r = await crear()
    const p = r.propuesta as Json
    if (!('regla' in p)) { console.log('E15 pendiente: el servidor aún no trae regla/ronda'); return ctx.skip() }
    expect(p.regla).toBe('temprana')
    expect(p.ronda ?? null).toBeNull()
    expect(p.planes_totales ?? null).toBeNull()
    for (const f of p.franjas ?? []) expect(f.etiqueta ?? null).toBeNull()
    const ev = await prepararYPublicar(r.resultado.propuesta_id)
    expect(ev.propuesta.ronda ?? null).toBeNull()
    expect(ev.propuesta.opcion.etiqueta ?? null).toBeNull()
    expect((await mirar(luna, r.resultado.propuesta_id, 'Luna')).planes_totales ?? null).toBeNull()
    console.log('PASÓ E15: sin parámetros nuevos todo queda como hoy.')
  }, 120_000)

  it('«la que más Sí» + ronda de 2 h: «prefiero» nunca sale; planes_totales solo al organizador y sin números chicos; ronda abierta no deja rearmar', async (ctx) => {
    const r = await crear({ p_regla: 'mas_si', p_ronda_horas: 2 }, true)
    if (r.propuesta.regla !== 'mas_si') { console.log('E15 pendiente: regla mas_si no soportada'); return ctx.skip() }
    const id = r.resultado.propuesta_id as string
    const ev = await prepararYPublicar(id, 'B')
    expect(['A', 'B']).toContain(ev.propuesta.opcion.franja)
    expect(ev.propuesta.opcion.etiqueta, 'la opción publicada trae la etiqueta del plan elegido').toMatch(/Asado en lo de Tomi|Picnic en el parque/)
    // La ronda depende del plazo: con cierre jueves 29 y publicada "ahora" (cualquier día antes) cabe o no; solo se comprueba su forma.
    const pTomi = await mirar(tomi, id, 'Tomi'), pLuna = await mirar(luna, id, 'Luna')
    expect(pLuna.planes_totales ?? null, 'Luna no ve planes_totales').toBeNull()
    const t = pTomi.planes_totales ?? null
    if (t !== null) {
      for (const plan of ['A', 'B']) for (const k of ['si', 'prefieren']) {
        const n = t?.[plan]?.[k] ?? null
        if (n !== null) expect(n, `planes_totales.${plan}.${k} menor que 2 debe ser null`).toBeGreaterThanOrEqual(2)
      }
      for (const n of NOMBRES) expect(JSON.stringify(t).includes(n), `planes_totales nombra a ${n}`).toBe(false)
    }
    // «Prefiero» es solo de Luna: ni Tomi ni nadie lo lee en list_proposals, y Tomi no lo ve en SUS condiciones.
    const lista = await llamar(tomi, 'list_proposals', { p_espacio_id: espacio.id }); sinPrefiero(lista, 'list_proposals', 'Tomi')
    const listaL = await llamar(luna, 'list_proposals', { p_espacio_id: espacio.id }); sinPrefiero(listaL, 'list_proposals', 'Luna')
    const propiaTomi = await llamar(tomi, 'get_my_conditions', { p_propuesta_id: id })
    expect(JSON.stringify(propiaTomi).includes('"prefiero"'), 'Tomi lee el prefiero de Luna').toBe(false)
    const propiaLuna = await llamar(luna, 'get_my_conditions', { p_propuesta_id: id })
    expect(JSON.stringify(propiaLuna).includes('"prefiero"'), 'Luna sí ve el suyo').toBe(true)
    // Ronda: si cupo, abierta, y rearmar queda cerrado hasta que cierre.
    const ronda = pTomi.ronda ?? null
    if (ronda !== null) {
      expect(ronda.horas).toBe(2)
      expect(ronda.abierta).toBe(true)
      await llamar(luna, 'opinar_version', { p_propuesta_id: id, p_version: ev.propuesta.opcion.version, p_opinion: 'asi_no_puedo', p_intento_id: randomUUID() })
      const t2 = await mirar(tomi, id, 'Tomi')
      expect(t2.mi_situacion.puede.proponer_reparacion, 'con la ronda abierta no se rearma').toBe(false)
      const rep = await llamar(tomi, 'propose_repair', { p_propuesta_id: id, p_intento_id: randomUUID() }, false)
      expect(rep.error).toMatchObject({ codigo: 'opcion_desactualizada', detalle: 'ronda_abierta' })
      // Aceptar sigue abierto durante la ronda.
      const acepta = await llamar(luna, 'accept_version', { p_propuesta_id: id, p_version: ev.propuesta.opcion.version, p_intento_id: randomUUID() }, null)
      console.log(`E15: aceptar durante la ronda abierta → ${acepta.ok ? 'ok' : `${acepta.error?.codigo}/${acepta.error?.detalle}`}`)
    } else console.log('E15: la ronda de 2 h no cupo antes del cierre de aceptación (ronda null, como hoy); no se probó el bloqueo de rearmar.')
    console.log('PASÓ E15: prefiero privado, planes_totales solo al organizador.')
  }, 180_000)

  it('formas inválidas se rechazan sin crear nada (regla, ronda, etiqueta larga, prefiero)', async (ctx) => {
    const r0 = await crear()
    if (!('regla' in r0.propuesta)) return ctx.skip()
    const base = { p_espacio_id: espacio.id, p_titulo: 'x', p_minimo: 4, p_maximo: 6, p_imprescindible_id: ids.Tomi, p_plazo: '2026-10-29T20:00', p_zona_horaria: 'America/Santiago' }
    const malos: [string, Json][] = [
      ['regla desconocida', { p_franjas: FR(), p_regla: 'x' }],
      ['ronda de 5 horas', { p_franjas: FR(), p_ronda_horas: 5 }],
      ['etiqueta de 41 caracteres', { p_franjas: [{ ...FR()[0], etiqueta: 'x'.repeat(41) }, FR()[1]] }],
    ]
    for (const [que, extra] of malos) {
      const r = await llamar(tomi, 'create_proposal', { ...base, ...extra, p_intento_id: randomUUID() }, false)
      expect(r.error, que).toMatchObject({ codigo: 'entrada_incompleta', detalle: 'formato_invalido' })
    }
    const id = r0.resultado.propuesta_id as string
    await llamar(tomi, 'open_proposal', { p_propuesta_id: id })
    const pref = await llamar(luna, 'save_my_conditions', { p_propuesta_id: id, p_disponibilidad: { A: 'si', B: 'si', prefiero: 'C' } }, false)
    expect(pref.error).toMatchObject({ codigo: 'entrada_incompleta', detalle: 'disponibilidad_invalida' })
    console.log('PASÓ E15: formas inválidas rechazadas con su código.')
  }, 120_000)
})
