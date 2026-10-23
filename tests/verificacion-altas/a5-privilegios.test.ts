// Verificador independiente A5 (privilegios de las RPC). Escenarios derivados de
// docs/contrato-enmienda-2.md, docs/contrato.md y docs/revision-codex-2.md. Datos ficticios.
import { describe, it, expect, beforeAll } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  a5Cliente, a5Sesion, a5Rpc, a5Raw, a5Resumen, a5ArgsFicticios, A5_PERMITIDAS,
} from './a5-helper'

const sufijo = Math.random().toString(36).slice(2, 8)
const log = (...x: unknown[]) => console.log('[A5]', ...x)

// Enmienda 7 (E7.3): la simulación solo existe en espacios demo. El espacio de prueba de A (con su simulado)
// es el demo propio de la sesión A, y el espacio ajeno de B (con el suyo) es el demo propio de la sesión B.
let A: SupabaseClient // organizador del espacio de prueba (su demo propio)
let B: SupabaseClient // sesion ajena (no miembro)
let C: SupabaseClient // miembro comun del espacio de A
let tokA = ''
let tokB = ''
let espacio = ''
let codigo = ''
let miA = ''
let sim = ''
let propuesta = ''
let version = 1
let espacioB = ''
let simB = ''
const respuestasConSesion: Record<string, any> = {}

const FR = [{ inicio: '2026-12-10T14:00', fin: '2026-12-10T17:00' }, { inicio: '2026-12-11T14:00', fin: '2026-12-11T17:00' }]

async function okRpc(c: SupabaseClient, n: string, a: Record<string, unknown> = {}) {
  const r = await a5Rpc(c, n, a)
  respuestasConSesion[n] = respuestasConSesion[n] ?? r
  log(n, a5Resumen(r))
  return r
}

describe('A5 privilegios de las RPC', () => {
  beforeAll(async () => {
    ;({ c: A, token: tokA } = await a5Sesion())
    ;({ c: B, token: tokB } = await a5Sesion())
    ;({ c: C } = await a5Sesion())
  }, 30000)

  it('(a) sin sesion: las 25 RPC rechazadas por permisos (42501), ninguna se ejecuta', async () => {
    const anon = a5Cliente()
    const args = a5ArgsFicticios()
    const res = await Promise.all(A5_PERMITIDAS.map(async (n) => [n, await a5Rpc(anon, n, args[n])] as const))
    for (const [n, r] of res) {
      log('anon', n, a5Resumen(r))
      expect(r.data, `${n} devolvio datos sin sesion`).toBeNull()
      expect(r.error?.code, `${n} no fue 42501`).toBe('42501')
      expect([401, 403]).toContain(r.status)
    }
    // Ninguna fila creada: create_space anon con nombre unico no debe aparecer para nadie (se comprueba por catalogo en el reporte).
  }, 60000)

  it('(a2 adversarial) sin sesion por REST crudo: POST, GET y token falso; repetido 5 veces', async () => {
    const out: string[] = []
    for (let i = 0; i < 5; i++) {
      const p = await a5Raw('/rest/v1/rpc/server_info', { body: {} })
      out.push(`POST ${p.status} ${p.json?.code}`)
      expect(p.json?.ok).toBeUndefined()
      expect(p.json?.code).toBe('42501')
    }
    const g = await a5Raw('/rest/v1/rpc/list_my_spaces', { method: 'GET' })
    out.push(`GET list_my_spaces ${g.status} ${g.json?.code}`)
    expect(g.json?.code).toBe('42501')
    const g2 = await a5Raw('/rest/v1/rpc/server_info', { method: 'GET' })
    out.push(`GET server_info ${g2.status} ${g2.json?.code}`)
    expect(g2.json?.code).toBe('42501')
    // token falso con forma de JWT
    const falso = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYXV0aGVudGljYXRlZCIsInN1YiI6IjAwMDAwMDAwLTAwMDAtNDAwMC04MDAwLTAwMDAwMDAwMDBhNSJ9.firma-falsa'
    const f = await a5Raw('/rest/v1/rpc/list_my_spaces', { body: {}, token: falso })
    out.push(`token falso ${f.status} ${f.json?.code ?? f.text.slice(0, 60)}`)
    expect(f.status).toBeGreaterThanOrEqual(400)
    expect(f.json?.ok).toBeUndefined()
    log(out.join(' | '))
  }, 60000)

  it('(b) con sesion anonima: flujo real que cubre las 25 RPC; todas responden contrato:2', async () => {
    let r = await okRpc(A, 'server_info')
    expect(r.data.sesion?.autenticada).toBe(true)
    r = await okRpc(A, 'create_space', { p_nombre: `ver-A5-${sufijo}`, p_tipo: 'amigos', p_nombre_visible: 'Org A5' })
    expect(r.data.ok).toBe(true)
    // E7.3: fuera del demo no se crean simulados; el resto del flujo va en el demo propio de A.
    const fuera = await a5Rpc(A, 'add_simulated_member', { p_espacio_id: r.data.resultado.espacio_id, p_nombre_visible: 'Sim A5' })
    expect(fuera.data.ok).toBe(false)
    expect(`${fuera.data.error.codigo}/${fuera.data.error.detalle}`).toBe('no_autorizado/espacio_no_demo')
    r = await okRpc(A, 'seed_demo_space')
    expect(r.data.ok).toBe(true)
    espacio = r.data.resultado.espacio_id
    codigo = r.data.espacio.codigo_invitacion
    miA = r.data.espacio.mi_miembro_id
    r = await okRpc(A, 'add_simulated_member', { p_espacio_id: espacio, p_nombre_visible: 'Sim A5' })
    expect(r.data.ok).toBe(true)
    sim = r.data.resultado.miembro_id
    r = await okRpc(C, 'join_space', { p_codigo: codigo, p_nombre_visible: 'Miembro A5' })
    expect(r.data.ok).toBe(true)
    r = await okRpc(A, 'list_my_spaces')
    expect(r.data.ok).toBe(true)
    r = await okRpc(A, 'get_space', { p_espacio_id: espacio })
    expect(r.data.ok).toBe(true)
    r = await okRpc(A, 'create_proposal', {
      p_espacio_id: espacio, p_titulo: 'ver-A5 propuesta', p_franjas: FR, p_minimo: 2, p_maximo: 3,
      p_imprescindible_id: miA, p_plazo: '2026-12-05T20:00', p_zona_horaria: 'America/Santiago', p_intento_id: crypto.randomUUID(),
    })
    expect(r.data.ok).toBe(true)
    propuesta = r.data.resultado.propuesta_id
    expect((await okRpc(A, 'open_proposal', { p_propuesta_id: propuesta })).data.ok).toBe(true)
    expect((await okRpc(A, 'mark_interest', { p_propuesta_id: propuesta, p_interesado: true })).data.ok).toBe(true)
    expect((await okRpc(A, 'save_my_conditions', { p_propuesta_id: propuesta, p_disponibilidad: { A: 'si', B: 'no' } })).data.ok).toBe(true)
    expect((await okRpc(A, 'simulate_mark_interest', { p_propuesta_id: propuesta, p_miembro_id: sim, p_interesado: true })).data.ok).toBe(true)
    expect((await okRpc(A, 'simulate_save_conditions', { p_propuesta_id: propuesta, p_miembro_id: sim, p_disponibilidad: { A: 'si', B: 'si' } })).data.ok).toBe(true)
    // C carga sus condiciones (privadas) para la prueba de fuga
    await a5Rpc(C, 'save_my_conditions', { p_propuesta_id: propuesta, p_disponibilidad: { A: 'no', B: 'si' } })
    expect((await okRpc(A, 'get_my_conditions', { p_propuesta_id: propuesta })).data.ok).toBe(true)
    expect((await okRpc(A, 'get_simulation_panel', { p_propuesta_id: propuesta })).data.ok).toBe(true)
    r = await okRpc(A, 'evaluate_and_publish', { p_propuesta_id: propuesta, p_intento_id: crypto.randomUUID() })
    expect(r.data.contrato).toBe(2)
    version = r.data.propuesta?.opcion?.version ?? 1
    r = await okRpc(A, 'accept_version', { p_propuesta_id: propuesta, p_version: version, p_intento_id: crypto.randomUUID() })
    expect(r.data.contrato).toBe(2)
    r = await okRpc(A, 'get_proposal_state', { p_propuesta_id: propuesta })
    expect(r.data.ok).toBe(true)
    r = await okRpc(A, 'list_proposals', { p_espacio_id: espacio })
    expect(r.data.ok).toBe(true)
    // las restantes (simulate_accept/withdraw, withdraw, repair, cancel, seed, reset) se ejecutan al final, tras (e)
  }, 90000)

  it('(c) helpers de cruce no alcanzables por REST (public.*, cruce.*, perfiles)', async () => {
    const helpers = ['op_accept', 'ok', 'err', 'motor', 'verificar_privilegios', 'vista_propuesta', 'chequeo_simulacion', 'publicar_version', 'asiento_usado']
    const out: string[] = []
    for (const h of helpers) {
      const p = await a5Raw(`/rest/v1/rpc/${h}`, { body: {}, token: tokA })
      const q = await a5Raw(`/rest/v1/rpc/${h}`, { body: {}, token: tokA, headers: { 'Content-Profile': 'cruce' } })
      const d = await a5Raw(`/rest/v1/rpc/cruce.${h}`, { body: {}, token: tokA })
      out.push(`${h}: public=${p.status}/${p.json?.code} profile-cruce=${q.status}/${q.json?.code} punto=${d.status}/${d.json?.code}`)
      for (const x of [p, q, d]) {
        expect(x.status).toBeGreaterThanOrEqual(400)
        expect(x.json?.ok).toBeUndefined()
      }
    }
    // con supabase-js schema('cruce')
    const s = await A.schema('cruce').rpc('verificar_privilegios')
    out.push(`js schema(cruce).rpc: ${s.status} ${s.error?.code}`)
    expect(s.error).not.toBeNull()
    // sin sesion tambien
    const an = await a5Raw('/rest/v1/rpc/op_accept', { body: {}, headers: { 'Content-Profile': 'cruce' } })
    out.push(`anon cruce: ${an.status}/${an.json?.code}`)
    expect(an.status).toBeGreaterThanOrEqual(400)
    log(out.join('\n'))
  }, 60000)

  it('(d) tablas de cruce: lectura/escritura por PostgREST falla (con y sin sesion)', async () => {
    const tablas = ['espacios', 'miembros', 'propuestas', 'condiciones', 'aceptaciones', 'intentos', 'eventos', 'elegibles', 'versiones']
    const out: string[] = []
    for (const t of tablas) {
      const r1 = await A.schema('cruce').from(t).select('*').limit(1)
      const r2 = await A.from(t).select('*').limit(1)
      const r3 = await a5Raw(`/rest/v1/${t}`, { body: { id: crypto.randomUUID() }, token: tokA, headers: { 'Content-Profile': 'cruce' } })
      const r4 = await a5Raw(`/rest/v1/${t}?select=*`, { method: 'GET', headers: { 'Accept-Profile': 'cruce' } })
      out.push(`${t}: js-cruce=${r1.status}/${r1.error?.code} js-public=${r2.status}/${r2.error?.code} insert=${r3.status}/${r3.json?.code} anon-get=${r4.status}/${r4.json?.code}`)
      expect(r1.data ?? []).toHaveLength(0)
      expect(r1.error).not.toBeNull()
      expect(r2.error).not.toBeNull()
      expect(r3.status).toBeGreaterThanOrEqual(400)
      expect(r4.status).toBeGreaterThanOrEqual(400)
    }
    // GraphQL: sin tipos de cruce
    const g = await a5Raw('/graphql/v1', { body: { query: '{ __schema { queryType { fields { name } } } }' }, token: tokA })
    const campos = JSON.stringify(g.json ?? {})
    out.push(`graphql ${g.status} ${campos.slice(0, 200)}`)
    for (const t of tablas) expect(campos.toLowerCase()).not.toContain(`${t}collection`)
    log(out.join('\n'))
  }, 60000)

  it('(e) sesion ajena B: no lee ni opera sobre el espacio/propuesta de A', async () => {
    const antes = (await a5Rpc(A, 'get_proposal_state', { p_propuesta_id: propuesta })).data
    const panelAntes = (await a5Rpc(A, 'get_simulation_panel', { p_propuesta_id: propuesta })).data
    const miembrosAntes = (await a5Rpc(A, 'get_space', { p_espacio_id: espacio })).data.espacio.miembros.length
    const llamadas: [string, Record<string, unknown>][] = [
      ['get_space', { p_espacio_id: espacio }],
      ['list_proposals', { p_espacio_id: espacio }],
      ['get_proposal_state', { p_propuesta_id: propuesta }],
      ['get_my_conditions', { p_propuesta_id: propuesta }],
      ['get_simulation_panel', { p_propuesta_id: propuesta }],
      ['add_simulated_member', { p_espacio_id: espacio, p_nombre_visible: 'Intruso' }],
      ['reset_demo', { p_espacio_id: espacio, p_intento_id: crypto.randomUUID() }],
      ['create_proposal', { p_espacio_id: espacio, p_titulo: 'ver-A5 intrusa', p_franjas: FR, p_minimo: 2, p_maximo: 3, p_imprescindible_id: miA, p_plazo: '2026-12-05T20:00', p_zona_horaria: 'America/Santiago', p_intento_id: crypto.randomUUID() }],
      ['open_proposal', { p_propuesta_id: propuesta }],
      ['mark_interest', { p_propuesta_id: propuesta, p_interesado: true }],
      ['save_my_conditions', { p_propuesta_id: propuesta, p_disponibilidad: { A: 'si', B: 'si' } }],
      ['evaluate_and_publish', { p_propuesta_id: propuesta, p_intento_id: crypto.randomUUID() }],
      ['accept_version', { p_propuesta_id: propuesta, p_version: version, p_intento_id: crypto.randomUUID() }],
      ['withdraw_commitment', { p_propuesta_id: propuesta }],
      ['propose_repair', { p_propuesta_id: propuesta, p_intento_id: crypto.randomUUID() }],
      ['cancel_proposal', { p_propuesta_id: propuesta }],
      ['simulate_mark_interest', { p_propuesta_id: propuesta, p_miembro_id: sim, p_interesado: false }],
      ['simulate_save_conditions', { p_propuesta_id: propuesta, p_miembro_id: sim, p_disponibilidad: { A: 'no', B: 'no' } }],
      ['simulate_accept', { p_propuesta_id: propuesta, p_miembro_id: sim, p_version: version, p_intento_id: crypto.randomUUID() }],
      ['simulate_withdraw', { p_propuesta_id: propuesta, p_miembro_id: sim }],
    ]
    const out: string[] = []
    for (const [n, a] of llamadas) {
      const r = await a5Rpc(B, n, a)
      out.push(`B ${n}: ${a5Resumen(r)}`)
      expect(r.error).toBeNull()
      expect(r.data.ok, `B pudo ${n}`).toBe(false)
      expect(r.data.contrato).toBe(2)
      expect(r.data.error.codigo).toBe('fuera_de_audiencia')
      expect(r.data.error.detalle).toBe('no_miembro')
      expect(JSON.stringify(r.data)).not.toContain('disponibilidad')
      expect(JSON.stringify(r.data)).not.toContain(codigo)
    }
    const lm = await a5Rpc(B, 'list_my_spaces')
    expect(JSON.stringify(lm.data)).not.toContain(espacio)
    log(out.join('\n'))
    const despues = (await a5Rpc(A, 'get_proposal_state', { p_propuesta_id: propuesta })).data
    const panelDespues = (await a5Rpc(A, 'get_simulation_panel', { p_propuesta_id: propuesta })).data
    expect(despues.propuesta.state_rev).toBe(antes.propuesta.state_rev)
    expect(despues.propuesta.estado).toBe(antes.propuesta.estado)
    expect(JSON.stringify(panelDespues.simulacion)).toBe(JSON.stringify(panelAntes.simulacion))
    // Ningún miembro nuevo (el demo trae además sus 5 simulados de siempre): el "Intruso" de B no entró.
    const miembros = (await a5Rpc(A, 'get_space', { p_espacio_id: espacio })).data.espacio.miembros
    expect(miembros).toHaveLength(miembrosAntes)
    expect(miembros.some((m: any) => m.nombre === 'Intruso')).toBe(false)
  }, 90000)

  it('(e2) miembro comun C: no opera como organizador ni usa simulate_*/panel/reset; no ve condiciones ajenas', async () => {
    const out: string[] = []
    const esperado: Record<string, string> = {
      get_simulation_panel: 'no_es_organizador_espacio',
      simulate_mark_interest: 'no_es_organizador_espacio',
      simulate_save_conditions: 'no_es_organizador_espacio',
      simulate_accept: 'no_es_organizador_espacio',
      simulate_withdraw: 'no_es_organizador_espacio',
      add_simulated_member: 'no_es_organizador_espacio',
      reset_demo: 'no_es_organizador_espacio',
      open_proposal: 'no_es_organizador',
      evaluate_and_publish: 'no_es_organizador',
      propose_repair: 'no_es_organizador',
      cancel_proposal: 'no_es_organizador',
    }
    const args: Record<string, Record<string, unknown>> = {
      get_simulation_panel: { p_propuesta_id: propuesta },
      simulate_mark_interest: { p_propuesta_id: propuesta, p_miembro_id: sim, p_interesado: false },
      simulate_save_conditions: { p_propuesta_id: propuesta, p_miembro_id: sim, p_disponibilidad: { A: 'no', B: 'no' } },
      simulate_accept: { p_propuesta_id: propuesta, p_miembro_id: sim, p_version: version, p_intento_id: crypto.randomUUID() },
      simulate_withdraw: { p_propuesta_id: propuesta, p_miembro_id: sim },
      add_simulated_member: { p_espacio_id: espacio, p_nombre_visible: 'Intruso C' },
      reset_demo: { p_espacio_id: espacio, p_intento_id: crypto.randomUUID() },
      open_proposal: { p_propuesta_id: propuesta },
      evaluate_and_publish: { p_propuesta_id: propuesta, p_intento_id: crypto.randomUUID() },
      propose_repair: { p_propuesta_id: propuesta, p_intento_id: crypto.randomUUID() },
      cancel_proposal: { p_propuesta_id: propuesta },
    }
    const antes = (await a5Rpc(A, 'get_proposal_state', { p_propuesta_id: propuesta })).data.propuesta.state_rev
    for (const n of Object.keys(esperado)) {
      const r = await a5Rpc(C, n, args[n])
      out.push(`C ${n}: ${a5Resumen(r)}`)
      expect(r.data.ok, `C pudo ${n}`).toBe(false)
      expect(r.data.contrato).toBe(2)
      expect(r.data.error.codigo).toBe('no_autorizado')
      expect(r.data.error.detalle).toBe(esperado[n])
      expect(JSON.stringify(r.data)).not.toMatch(/"A":"si","B":"si"/)
    }
    const st = await a5Rpc(C, 'get_proposal_state', { p_propuesta_id: propuesta })
    const s = JSON.stringify(st.data)
    out.push(`C get_proposal_state contiene 'disponibilidad'? ${s.includes('disponibilidad')}`)
    expect(s).not.toContain('disponibilidad')
    const mc = await a5Rpc(C, 'get_my_conditions', { p_propuesta_id: propuesta })
    out.push(`C get_my_conditions: ${JSON.stringify(mc.data?.condiciones ?? mc.data).slice(0, 160)}`)
    expect(JSON.stringify(mc.data)).not.toContain(sim)
    expect(JSON.stringify(mc.data)).not.toContain(miA)
    const despues = (await a5Rpc(A, 'get_proposal_state', { p_propuesta_id: propuesta })).data.propuesta.state_rev
    expect(despues).toBe(antes)
    log(out.join('\n'))
  }, 90000)

  it('(adv1) concurrencia: B y C disparan en paralelo (Promise.all) todas las operaciones de organizador/simulacion x3', async () => {
    const antes = (await a5Rpc(A, 'get_simulation_panel', { p_propuesta_id: propuesta })).data
    const revAntes = (await a5Rpc(A, 'get_proposal_state', { p_propuesta_id: propuesta })).data.propuesta.state_rev
    const tareas: Promise<{ n: string; r: any }>[] = []
    for (let i = 0; i < 3; i++) {
      for (const c of [B, C]) {
        const ops: [string, Record<string, unknown>][] = [
          ['simulate_save_conditions', { p_propuesta_id: propuesta, p_miembro_id: sim, p_disponibilidad: { A: 'no', B: 'no' } }],
          ['simulate_withdraw', { p_propuesta_id: propuesta, p_miembro_id: sim }],
          ['simulate_accept', { p_propuesta_id: propuesta, p_miembro_id: sim, p_version: version, p_intento_id: crypto.randomUUID() }],
          ['cancel_proposal', { p_propuesta_id: propuesta }],
          ['propose_repair', { p_propuesta_id: propuesta, p_intento_id: crypto.randomUUID() }],
          ['evaluate_and_publish', { p_propuesta_id: propuesta, p_intento_id: crypto.randomUUID() }],
          ['get_simulation_panel', { p_propuesta_id: propuesta }],
        ]
        for (const [n, a] of ops) tareas.push(a5Rpc(c, n, a).then((r) => ({ n, r })))
      }
    }
    const res = await Promise.all(tareas)
    const oks = res.filter((x) => x.r.data?.ok === true)
    log(`concurrencia: ${res.length} llamadas, ok=${oks.length}, codigos=${[...new Set(res.map((x) => x.r.data?.error?.detalle ?? x.r.error?.code))].join(',')}`)
    expect(oks).toHaveLength(0)
    for (const x of res) expect(x.r.data?.contrato).toBe(2)
    const despues = (await a5Rpc(A, 'get_simulation_panel', { p_propuesta_id: propuesta })).data
    expect(JSON.stringify(despues.simulacion)).toBe(JSON.stringify(antes.simulacion))
    expect((await a5Rpc(A, 'get_proposal_state', { p_propuesta_id: propuesta })).data.propuesta.state_rev).toBe(revAntes)
  }, 90000)

  it('(adv2) confusion de espacios: organizador A simula sobre su propuesta con un simulado del espacio de B; B simula en su espacio con el simulado de A', async () => {
    // E7.3: los dos espacios son demos de sesiones distintas (el de A y el propio de B).
    let r = await a5Rpc(B, 'seed_demo_space')
    expect(r.data.ok).toBe(true)
    espacioB = r.data.resultado.espacio_id
    expect(espacioB).not.toBe(espacio)
    r = await a5Rpc(B, 'add_simulated_member', { p_espacio_id: espacioB, p_nombre_visible: 'Sim B' })
    expect(r.data.ok).toBe(true)
    simB = r.data.resultado.miembro_id
    const rB = await a5Rpc(B, 'create_proposal', { p_espacio_id: espacioB, p_titulo: 'ver-A5 B', p_franjas: FR, p_minimo: 2, p_maximo: 3, p_imprescindible_id: simB, p_plazo: '2026-12-05T20:00', p_zona_horaria: 'America/Santiago', p_intento_id: crypto.randomUUID() })
    const propB = rB.data.resultado.propuesta_id
    await a5Rpc(B, 'open_proposal', { p_propuesta_id: propB })
    const out: string[] = []
    const x1 = await a5Rpc(A, 'simulate_save_conditions', { p_propuesta_id: propuesta, p_miembro_id: simB, p_disponibilidad: { A: 'si', B: 'si' } })
    const x2 = await a5Rpc(B, 'simulate_save_conditions', { p_propuesta_id: propB, p_miembro_id: sim, p_disponibilidad: { A: 'no', B: 'no' } })
    const x3 = await a5Rpc(A, 'simulate_mark_interest', { p_propuesta_id: propuesta, p_miembro_id: simB, p_interesado: true })
    const x4 = await a5Rpc(B, 'simulate_accept', { p_propuesta_id: propB, p_miembro_id: sim, p_version: 1, p_intento_id: crypto.randomUUID() })
    // imprescindible de otro espacio
    const x5 = await a5Rpc(A, 'create_proposal', { p_espacio_id: espacio, p_titulo: 'ver-A5 cruz', p_franjas: FR, p_minimo: 2, p_maximo: 3, p_imprescindible_id: simB, p_plazo: '2026-12-05T20:00', p_zona_horaria: 'America/Santiago', p_intento_id: crypto.randomUUID() })
    // A usa el miembro real de A como destino de simulacion (no simulado)
    const x6 = await a5Rpc(A, 'simulate_save_conditions', { p_propuesta_id: propuesta, p_miembro_id: miA, p_disponibilidad: { A: 'no', B: 'no' } })
    for (const [k, x] of Object.entries({ x1, x2, x3, x4, x5, x6 })) {
      out.push(`${k}: ${a5Resumen(x)}`)
      expect(x.data.ok, k).toBe(false)
      expect(x.data.contrato).toBe(2)
    }
    // E7.3: simulación en un espacio no demo de B, con su propio miembro y con el simulado de su demo.
    const nd = await a5Rpc(B, 'create_space', { p_nombre: `ver-A5-ajeno-${sufijo}`, p_tipo: 'amigos', p_nombre_visible: 'Org B' })
    expect(nd.data.ok).toBe(true)
    const espND = nd.data.resultado.espacio_id
    const miB = nd.data.resultado.miembro_id
    const pND = await a5Rpc(B, 'create_proposal', { p_espacio_id: espND, p_titulo: 'ver-A5 no demo', p_franjas: FR, p_minimo: 2, p_maximo: 3, p_imprescindible_id: miB, p_plazo: '2026-12-05T20:00', p_zona_horaria: 'America/Santiago', p_intento_id: crypto.randomUUID() })
    const propND = pND.data.resultado.propuesta_id
    await a5Rpc(B, 'open_proposal', { p_propuesta_id: propND })
    const noDemo = {
      y1: await a5Rpc(B, 'add_simulated_member', { p_espacio_id: espND, p_nombre_visible: 'Sim B no demo' }),
      y2: await a5Rpc(B, 'simulate_mark_interest', { p_propuesta_id: propND, p_miembro_id: miB, p_interesado: true }),
      y3: await a5Rpc(B, 'simulate_save_conditions', { p_propuesta_id: propND, p_miembro_id: simB, p_disponibilidad: { A: 'si', B: 'si' } }),
      y4: await a5Rpc(B, 'simulate_accept', { p_propuesta_id: propND, p_miembro_id: simB, p_version: 1, p_intento_id: crypto.randomUUID() }),
      y5: await a5Rpc(B, 'simulate_withdraw', { p_propuesta_id: propND, p_miembro_id: simB }),
    }
    for (const [k, x] of Object.entries(noDemo)) {
      out.push(`${k}: ${a5Resumen(x)}`)
      expect(x.data.ok, k).toBe(false)
      expect(x.data.contrato).toBe(2)
      expect(`${x.data.error.codigo}/${x.data.error.detalle}`, k).toBe('no_autorizado/espacio_no_demo')
    }
    expect((await a5Rpc(B, 'get_space', { p_espacio_id: espND })).data.espacio.miembros.some((m: any) => m.simulado)).toBe(false)
    log(out.join('\n'))
    const panel = (await a5Rpc(A, 'get_simulation_panel', { p_propuesta_id: propuesta })).data
    expect(JSON.stringify(panel)).not.toContain(simB)
  }, 90000)

  it('(adv3) parametros de actor inyectados / sobrecargas: la RPC no acepta p_actor ni p_user_id', async () => {
    const r1 = await a5Rpc(B, 'get_space', { p_espacio_id: espacio, p_actor: miA })
    const r2 = await a5Rpc(B, 'list_my_spaces', { p_user_id: crypto.randomUUID() })
    const r3 = await a5Rpc(B, 'get_my_conditions', { p_propuesta_id: propuesta, p_miembro_id: miA })
    log(`inyeccion: ${a5Resumen(r1)} | ${a5Resumen(r2)} | ${a5Resumen(r3)}`)
    for (const r of [r1, r2, r3]) {
      expect(r.data?.ok === true).toBe(false)
      expect(r.error?.code).toBe('PGRST202')
    }
  }, 30000)

  it('(adv4) sesion cerrada: tras signOut el token revocado ya no ejecuta RPC', async () => {
    const { c: D, token } = await a5Sesion()
    const r0 = await a5Raw('/rest/v1/rpc/list_my_spaces', { body: {}, token })
    expect(r0.json?.contrato).toBe(2)
    await D.auth.signOut()
    const r1 = await a5Rpc(D, 'list_my_spaces')
    const r2 = await a5Raw('/rest/v1/rpc/list_my_spaces', { body: {}, token })
    log(`post signOut cliente: ${a5Resumen(r1)} | token viejo: ${r2.status} ${r2.json?.code ?? ''} ok=${r2.json?.ok}`)
    expect(r1.data?.ok === true).toBe(false)
    expect(r1.error?.code).toBe('42501')
    // El JWT ya emitido puede seguir siendo valido hasta expirar (comportamiento de Supabase); solo se registra.
  }, 30000)

  it('(b-cierre) resto de RPC con sesion: simulate_accept/withdraw, withdraw, repair, cancel, seed, reset; todas contrato:2', async () => {
    await okRpc(A, 'simulate_accept', { p_propuesta_id: propuesta, p_miembro_id: sim, p_version: version, p_intento_id: crypto.randomUUID() })
    await okRpc(A, 'simulate_withdraw', { p_propuesta_id: propuesta, p_miembro_id: sim })
    await okRpc(A, 'withdraw_commitment', { p_propuesta_id: propuesta })
    await okRpc(A, 'propose_repair', { p_propuesta_id: propuesta, p_intento_id: crypto.randomUUID() })
    await okRpc(A, 'cancel_proposal', { p_propuesta_id: propuesta })
    // B ya tiene su propio demo (espacio de su sesion efimera, NO el demo real; lo creo en adv2) y prueba aislamiento del reset
    const sd = await okRpc(B, 'seed_demo_space')
    const demoB = sd.data?.resultado?.espacio_id
    const ra = await a5Rpc(A, 'reset_demo', { p_espacio_id: demoB, p_intento_id: crypto.randomUUID() })
    log('A reset_demo sobre demo de B:', a5Resumen(ra))
    expect(ra.data.ok).toBe(false)
    expect(ra.data.error.detalle).toBe('no_miembro')
    await okRpc(B, 'reset_demo', { p_espacio_id: demoB, p_intento_id: crypto.randomUUID() })
    const faltan = A5_PERMITIDAS.filter((n) => !respuestasConSesion[n])
    expect(faltan).toEqual([])
    const malos = A5_PERMITIDAS.filter((n) => respuestasConSesion[n].error || respuestasConSesion[n].data?.contrato !== 2)
    log('cobertura con sesion:', A5_PERMITIDAS.map((n) => `${n}=${respuestasConSesion[n].data?.ok}`).join(' '))
    expect(malos).toEqual([])
  }, 90000)
})
