// Verificacion independiente del hallazgo A3 (reinicio y reintentos tardios).
// Fuente: docs/contrato-enmienda-2.md §A3, docs/revision-codex-2.md (reproducciones 1 y 2).
import { describe, it, expect, beforeAll } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { a3Sesion, a3Rpc, a3Id, a3ArgsPropuesta, a3Propuestas, a3Generacion } from './a3-helper'

let O: SupabaseClient // organizador del demo
let B: SupabaseClient // miembro real del demo (no organizador)
let N: SupabaseClient // ajeno; organizador de un espacio NO demo
let E = '' // espacio demo de O
let yoO = '' // miembro_id de O
let yoB = ''
let simId = '' // un miembro simulado del demo
let EN = '' // espacio no demo de N
let yoN = ''

const log = (...a: unknown[]) => console.log('[A3]', ...a)
const ids = (ps: any[]) => ps.map((p) => p.id).sort()

async function crear(c: SupabaseClient, esp: string, impr: string, titulo: string, intento: string) {
  return a3Rpc(c, 'create_proposal', a3ArgsPropuesta(esp, impr, titulo, intento))
}

beforeAll(async () => {
  O = await a3Sesion()
  B = await a3Sesion()
  N = await a3Sesion()
  const s = await a3Rpc(O, 'seed_demo_space')
  expect(s.ok, JSON.stringify(s.error)).toBe(true)
  expect(s.contrato).toBe(2)
  E = s.resultado.espacio_id
  yoO = s.espacio.mi_miembro_id
  simId = s.espacio.miembros.find((m: any) => m.simulado && m.nombre === 'Luna').miembro_id
  const j = await a3Rpc(B, 'join_space', { p_codigo: s.espacio.codigo_invitacion, p_nombre_visible: 'ver-A3 Beto' })
  expect(j.ok, JSON.stringify(j.error)).toBe(true)
  expect(j.resultado.reclamo_asiento_simulado).toBe(false)
  yoB = j.resultado.miembro_id
  const n = await a3Rpc(N, 'create_space', { p_nombre: 'ver-A3 no demo', p_tipo: 'amigos', p_nombre_visible: 'ver-A3 Nora' })
  expect(n.ok, JSON.stringify(n.error)).toBe(true)
  EN = n.resultado.espacio_id
  yoN = n.resultado.miembro_id
  log('espacio demo de prueba', E, 'generacion inicial', s.espacio.generacion, '| espacio no demo', EN)
}, 60000)

describe('A3 reproducciones de Codex', () => {
  it('Codex 1: crear P, reset R, crear Q, repetir el MISMO reset -> Q sigue viva', async () => {
    const g0 = await a3Generacion(O, E)
    const p = await crear(O, E, yoO, 'ver-A3 P', a3Id())
    expect(p.ok, JSON.stringify(p.error)).toBe(true)
    const R = a3Id()
    const r1 = await a3Rpc(O, 'reset_demo', { p_espacio_id: E, p_intento_id: R })
    expect(r1.ok, JSON.stringify(r1.error)).toBe(true)
    expect(r1.resultado.propuestas_eliminadas).toBeGreaterThanOrEqual(1)
    expect(Number(r1.generacion)).toBe(g0 + 1)
    const q = await crear(O, E, yoO, 'ver-A3 Q', a3Id())
    expect(q.ok, JSON.stringify(q.error)).toBe(true)
    const Q = q.resultado.propuesta_id
    const r2 = await a3Rpc(O, 'reset_demo', { p_espacio_id: E, p_intento_id: R })
    log('reset repetido ->', JSON.stringify({ ok: r2.ok, resultado: r2.resultado, generacion: r2.generacion }))
    expect(r2.ok).toBe(true)
    expect(r2.resultado.repetido).toBe(true)
    expect(r2.resultado.propuestas_eliminadas).toBe(r1.resultado.propuestas_eliminadas)
    expect(Number(r2.generacion)).toBe(g0 + 1)
    expect(await a3Generacion(O, E)).toBe(g0 + 1)
    expect(ids(await a3Propuestas(O, E))).toEqual([Q])
    const st = await a3Rpc(O, 'get_proposal_state', { p_propuesta_id: Q })
    expect(st.ok).toBe(true)
  }, 60000)

  it('Codex 2: crear con X, reset, repetir creacion con X -> intento_obsoleto y cero propuestas nuevas', async () => {
    const X = a3Id()
    const args = a3ArgsPropuesta(E, yoO, 'ver-A3 X', X)
    const c1 = await a3Rpc(O, 'create_proposal', args)
    expect(c1.ok, JSON.stringify(c1.error)).toBe(true)
    const PX = c1.resultado.propuesta_id
    const r = await a3Rpc(O, 'reset_demo', { p_espacio_id: E, p_intento_id: a3Id() })
    expect(r.ok).toBe(true)
    expect(await a3Propuestas(O, E)).toEqual([])
    const c2 = await a3Rpc(O, 'create_proposal', args)
    log('creacion repetida tras reset ->', JSON.stringify({ ok: c2.ok, error: c2.error }))
    expect(c2.ok).toBe(false)
    expect(c2.error?.codigo).toBe('intento_obsoleto')
    expect(c2.error?.detalle).toBe('intento_obsoleto')
    expect(c2.contrato).toBe(2)
    expect(await a3Propuestas(O, E)).toEqual([])
    const st = await a3Rpc(O, 'get_proposal_state', { p_propuesta_id: PX })
    expect(st.ok).toBe(false)
    expect(st.error?.codigo).toBe('fuera_de_audiencia')
  }, 60000)
})

describe('A3 variantes adversariales', () => {
  it('V1 reset con id nuevo sube generacion; get_space y list_my_spaces la devuelven', async () => {
    const g0 = await a3Generacion(O, E)
    for (let k = 1; k <= 3; k++) {
      const r = await a3Rpc(O, 'reset_demo', { p_espacio_id: E, p_intento_id: a3Id() })
      expect(r.ok).toBe(true)
      expect(r.resultado.repetido).toBe(false)
      expect(Number(r.generacion)).toBe(g0 + k)
      expect(Number(r.espacio.generacion)).toBe(g0 + k)
    }
    const l = await a3Rpc(O, 'list_my_spaces')
    expect(l.ok).toBe(true)
    const fila = l.espacios.find((e: any) => e.id === E)
    log('list_my_spaces fila demo generacion =', fila?.generacion, '| get_space =', await a3Generacion(O, E))
    expect(Number(fila.generacion)).toBe(g0 + 3)
  }, 60000)

  it('V2 reset concurrente con el MISMO id (x5): una sola ejecucion real, generacion +1; replay concurrente posterior no borra T', async () => {
    const S = await crear(O, E, yoO, 'ver-A3 S', a3Id())
    expect(S.ok).toBe(true)
    const g0 = await a3Generacion(O, E)
    const R = a3Id()
    const rs = await Promise.all(Array.from({ length: 5 }, () => a3Rpc(O, 'reset_demo', { p_espacio_id: E, p_intento_id: R })))
    log('5 resets concurrentes mismo id ->', JSON.stringify(rs.map((r) => ({ ok: r.ok, rep: r.resultado?.repetido, gen: r.generacion, err: r.error?.codigo }))))
    expect(rs.every((r) => r.ok)).toBe(true)
    expect(rs.filter((r) => r.resultado.repetido === false).length).toBe(1)
    expect(new Set(rs.map((r) => Number(r.generacion)))).toEqual(new Set([g0 + 1]))
    expect(new Set(rs.map((r) => r.resultado.propuestas_eliminadas))).toEqual(new Set([1]))
    expect(await a3Generacion(O, E)).toBe(g0 + 1)
    const T = await crear(O, E, yoO, 'ver-A3 T', a3Id())
    expect(T.ok).toBe(true)
    const rs2 = await Promise.all(Array.from({ length: 3 }, () => a3Rpc(O, 'reset_demo', { p_espacio_id: E, p_intento_id: R })))
    expect(rs2.every((r) => r.ok && r.resultado.repetido === true)).toBe(true)
    expect(ids(await a3Propuestas(O, E))).toEqual([T.resultado.propuesta_id])
    expect(await a3Generacion(O, E)).toBe(g0 + 1)
  }, 60000)

  it('V3 resets concurrentes con ids DISTINTOS (x3): generacion +3, generaciones distintas', async () => {
    const g0 = await a3Generacion(O, E)
    const rs = await Promise.all([a3Id(), a3Id(), a3Id()].map((R) => a3Rpc(O, 'reset_demo', { p_espacio_id: E, p_intento_id: R })))
    log('3 resets concurrentes ids distintos ->', JSON.stringify(rs.map((r) => ({ ok: r.ok, gen: r.generacion, err: r.error?.codigo }))))
    expect(rs.every((r) => r.ok)).toBe(true)
    expect(rs.map((r) => Number(r.generacion)).sort((a, b) => a - b)).toEqual([g0 + 1, g0 + 2, g0 + 3])
    expect(await a3Generacion(O, E)).toBe(g0 + 3)
  }, 60000)

  it('V4 reset por no organizador (miembro) y por ajeno se rechaza; no sube generacion ni borra', async () => {
    const V = await crear(O, E, yoO, 'ver-A3 V', a3Id())
    expect(V.ok).toBe(true)
    const g0 = await a3Generacion(O, E)
    const R = a3Id()
    const okO = await a3Rpc(O, 'reset_demo', { p_espacio_id: E, p_intento_id: R }) // O usa R
    expect(okO.ok).toBe(true)
    const V2 = await crear(O, E, yoO, 'ver-A3 V2', a3Id())
    expect(V2.ok).toBe(true)
    // B intenta con un id nuevo y con el MISMO id que uso O (no debe recibir la respuesta guardada de O)
    const b1 = await a3Rpc(B, 'reset_demo', { p_espacio_id: E, p_intento_id: a3Id() })
    const b2 = await a3Rpc(B, 'reset_demo', { p_espacio_id: E, p_intento_id: R })
    const n1 = await a3Rpc(N, 'reset_demo', { p_espacio_id: E, p_intento_id: R })
    log('B nuevo ->', b1.error?.codigo, b1.error?.detalle, '| B con id de O ->', b2.error?.codigo, b2.error?.detalle, '| ajeno ->', n1.error?.codigo, n1.error?.detalle)
    expect(b1.ok).toBe(false)
    expect(b1.error?.detalle).toBe('no_es_organizador_espacio')
    expect(b2.ok).toBe(false)
    expect(b2.error?.detalle).toBe('no_es_organizador_espacio')
    expect(n1.ok).toBe(false)
    expect(n1.error?.codigo).toBe('fuera_de_audiencia')
    // repetir el rechazo no cambia nada (repeticion de intentos)
    const b3 = await a3Rpc(B, 'reset_demo', { p_espacio_id: E, p_intento_id: R })
    expect(b3.ok).toBe(false)
    expect(await a3Generacion(O, E)).toBe(g0 + 1)
    expect(ids(await a3Propuestas(O, E))).toEqual([V2.resultado.propuesta_id])
  }, 60000)

  it('V5 reset en espacio NO demo se rechaza (espacio_no_demo) y la propuesta sigue', async () => {
    const pn = await crear(N, EN, yoN, 'ver-A3 nodemo', a3Id())
    expect(pn.ok, JSON.stringify(pn.error)).toBe(true)
    const g0 = await a3Generacion(N, EN)
    const rs = await Promise.all([a3Id(), a3Id()].map((R) => a3Rpc(N, 'reset_demo', { p_espacio_id: EN, p_intento_id: R })))
    log('reset no demo ->', JSON.stringify(rs.map((r) => r.error)))
    expect(rs.every((r) => !r.ok && r.error?.detalle === 'espacio_no_demo')).toBe(true)
    expect(await a3Generacion(N, EN)).toBe(g0)
    expect(ids(await a3Propuestas(N, EN))).toEqual([pn.resultado.propuesta_id])
  }, 60000)

  it('V6+V7 reintentos de OTRAS operaciones (evaluar, aceptar, simular aceptar) de antes del reset y acciones sobre propuesta borrada no resucitan nada', async () => {
    const c = await crear(O, E, yoO, 'ver-A3 W', a3Id())
    expect(c.ok).toBe(true)
    const P = c.resultado.propuesta_id
    expect((await a3Rpc(O, 'open_proposal', { p_propuesta_id: P })).ok).toBe(true)
    expect((await a3Rpc(O, 'mark_interest', { p_propuesta_id: P, p_interesado: true })).ok).toBe(true)
    expect((await a3Rpc(O, 'save_my_conditions', { p_propuesta_id: P, p_disponibilidad: { A: 'si', B: 'si' } })).ok).toBe(true)
    expect((await a3Rpc(O, 'simulate_mark_interest', { p_propuesta_id: P, p_miembro_id: simId, p_interesado: true })).ok).toBe(true)
    expect((await a3Rpc(O, 'simulate_save_conditions', { p_propuesta_id: P, p_miembro_id: simId, p_disponibilidad: { A: 'si', B: 'si' } })).ok).toBe(true)
    const Y = a3Id(), W = a3Id(), Z = a3Id()
    const ev = await a3Rpc(O, 'evaluate_and_publish', { p_propuesta_id: P, p_intento_id: Y })
    expect(ev.ok, JSON.stringify(ev.error)).toBe(true)
    const ver = ev.propuesta.opcion.version
    const acc = await a3Rpc(O, 'accept_version', { p_propuesta_id: P, p_version: ver, p_intento_id: W })
    expect(acc.ok, JSON.stringify(acc.error)).toBe(true)
    const sacc = await a3Rpc(O, 'simulate_accept', { p_propuesta_id: P, p_miembro_id: simId, p_version: ver, p_intento_id: Z })
    expect(sacc.ok, JSON.stringify(sacc.error)).toBe(true)
    const rr = await a3Rpc(O, 'reset_demo', { p_espacio_id: E, p_intento_id: a3Id() })
    expect(rr.ok).toBe(true)
    // reintentos tardios, cada uno 2 veces, y ademas en paralelo
    const tardios = await Promise.all([
      a3Rpc(O, 'evaluate_and_publish', { p_propuesta_id: P, p_intento_id: Y }),
      a3Rpc(O, 'accept_version', { p_propuesta_id: P, p_version: ver, p_intento_id: W }),
      a3Rpc(O, 'simulate_accept', { p_propuesta_id: P, p_miembro_id: simId, p_version: ver, p_intento_id: Z }),
      a3Rpc(O, 'evaluate_and_publish', { p_propuesta_id: P, p_intento_id: Y }),
      a3Rpc(O, 'accept_version', { p_propuesta_id: P, p_version: ver, p_intento_id: W }),
      a3Rpc(O, 'accept_version', { p_propuesta_id: P, p_version: ver, p_intento_id: a3Id() }),
      a3Rpc(O, 'open_proposal', { p_propuesta_id: P }),
      a3Rpc(O, 'mark_interest', { p_propuesta_id: P, p_interesado: true }),
      a3Rpc(O, 'save_my_conditions', { p_propuesta_id: P, p_disponibilidad: { A: 'si', B: 'si' } }),
      a3Rpc(O, 'cancel_proposal', { p_propuesta_id: P }),
      a3Rpc(O, 'withdraw_commitment', { p_propuesta_id: P }),
      a3Rpc(O, 'propose_repair', { p_propuesta_id: P, p_intento_id: a3Id() }),
      a3Rpc(O, 'get_proposal_state', { p_propuesta_id: P }),
    ])
    log('tardios sobre propuesta borrada ->', JSON.stringify(tardios.map((r) => r.ok ? 'OK' : `${r.error?.codigo}/${r.error?.detalle}`)))
    expect(tardios.every((r) => r.ok === false)).toBe(true)
    expect(tardios.every((r) => ['fuera_de_audiencia', 'intento_obsoleto'].includes(r.error!.codigo))).toBe(true)
    expect(await a3Propuestas(O, E)).toEqual([])
  }, 90000)

  it('V8 tombstone de otro miembro: B crea con XB, O reinicia, B repite XB (x3 en paralelo) -> intento_obsoleto', async () => {
    const XB = a3Id()
    const args = a3ArgsPropuesta(E, yoB, 'ver-A3 de Beto', XB)
    const c = await a3Rpc(B, 'create_proposal', args)
    expect(c.ok, JSON.stringify(c.error)).toBe(true)
    const rep = await a3Rpc(B, 'create_proposal', args) // antes del reset: replay valido
    expect(rep.ok).toBe(true)
    expect(rep.resultado.repetido).toBe(true)
    expect(rep.resultado.propuesta_id).toBe(c.resultado.propuesta_id)
    expect((await a3Rpc(O, 'reset_demo', { p_espacio_id: E, p_intento_id: a3Id() })).ok).toBe(true)
    const rs = await Promise.all([1, 2, 3].map(() => a3Rpc(B, 'create_proposal', args)))
    log('B repite XB tras reset ->', JSON.stringify(rs.map((r) => r.ok ? 'OK' : r.error?.codigo)))
    expect(rs.every((r) => !r.ok && r.error?.codigo === 'intento_obsoleto')).toBe(true)
    // mismo X con parametros cambiados tampoco crea
    const otro = await a3Rpc(B, 'create_proposal', { ...args, p_titulo: 'ver-A3 de Beto bis' })
    expect(otro.ok).toBe(false)
    expect(await a3Propuestas(O, E)).toEqual([])
  }, 60000)

  it('V9 carrera create (intento nuevo) vs reset: los replays posteriores no cambian el conjunto vivo', async () => {
    const out: string[] = []
    for (let k = 0; k < 4; k++) {
      const C = a3Id(), R = a3Id()
      const args = a3ArgsPropuesta(E, yoO, `ver-A3 carrera ${k}`, C)
      const [c, r] = await Promise.all([a3Rpc(O, 'create_proposal', args), a3Rpc(O, 'reset_demo', { p_espacio_id: E, p_intento_id: R })])
      expect(c.ok, JSON.stringify(c.error)).toBe(true)
      expect(r.ok).toBe(true)
      const vivo1 = ids(await a3Propuestas(O, E))
      const [c2, r2] = await Promise.all([a3Rpc(O, 'create_proposal', args), a3Rpc(O, 'reset_demo', { p_espacio_id: E, p_intento_id: R })])
      const vivo2 = ids(await a3Propuestas(O, E))
      const sobrevivio = vivo1.includes(c.resultado.propuesta_id)
      out.push(`${k}:${sobrevivio ? 'create-despues' : 'create-antes'} c2=${c2.ok ? 'repetido' : c2.error?.codigo} r2rep=${r2.resultado?.repetido}`)
      expect(r2.ok && r2.resultado.repetido).toBe(true)
      expect(vivo2).toEqual(vivo1)
      if (sobrevivio) {
        expect(c2.ok && c2.resultado.repetido && c2.resultado.propuesta_id === c.resultado.propuesta_id).toBe(true)
      } else {
        expect(c2.ok).toBe(false)
        expect(c2.error?.codigo).toBe('intento_obsoleto')
      }
    }
    log('carreras ->', out.join(' | '))
  }, 120000)

  it('V10 reutilizar ids cruzados: id de reset como intento de create y reset con mismo id en otro espacio no ejecutan nada', async () => {
    const R = a3Id()
    expect((await a3Rpc(O, 'reset_demo', { p_espacio_id: E, p_intento_id: R })).ok).toBe(true)
    const g = await a3Generacion(O, E)
    const c = await crear(O, E, yoO, 'ver-A3 cruzado', R)
    expect(c.ok).toBe(false)
    expect(c.error?.detalle).toBe('intento_reutilizado')
    const ok2 = await crear(O, E, yoO, 'ver-A3 viva', a3Id())
    expect(ok2.ok).toBe(true)
    // O crea un espacio no demo y usa el mismo R alli
    const n = await a3Rpc(O, 'create_space', { p_nombre: 'ver-A3 no demo O', p_tipo: 'amigos', p_nombre_visible: 'ver-A3 Oscar' })
    expect(n.ok).toBe(true)
    const r2 = await a3Rpc(O, 'reset_demo', { p_espacio_id: n.resultado.espacio_id, p_intento_id: R })
    log('mismo id de reset en otro espacio ->', r2.error?.codigo, r2.error?.detalle)
    expect(r2.ok).toBe(false)
    expect(await a3Generacion(O, E)).toBe(g)
    expect(ids(await a3Propuestas(O, E))).toEqual([ok2.resultado.propuesta_id])
  }, 60000)

  it('V11 idempotencia normal sigue funcionando en la generacion nueva: create concurrente mismo intento -> una propuesta', async () => {
    expect((await a3Rpc(O, 'reset_demo', { p_espacio_id: E, p_intento_id: a3Id() })).ok).toBe(true)
    const Zc = a3Id()
    const args = a3ArgsPropuesta(E, yoO, 'ver-A3 doble clic', Zc)
    const rs = await Promise.all([1, 2, 3, 4].map(() => a3Rpc(O, 'create_proposal', args)))
    log('4 creates concurrentes mismo intento ->', JSON.stringify(rs.map((r) => r.ok ? `${r.resultado.propuesta_id.slice(0, 8)} rep=${r.resultado.repetido}` : r.error?.codigo)))
    expect(rs.every((r) => r.ok)).toBe(true)
    expect(new Set(rs.map((r) => r.resultado.propuesta_id)).size).toBe(1)
    expect(rs.filter((r) => r.resultado.repetido === false).length).toBe(1)
    expect((await a3Propuestas(O, E)).length).toBe(1)
    log('espacio demo final', E, 'generacion', await a3Generacion(O, E))
  }, 60000)
})
