// Verificación independiente del hallazgo A4 (atomicidad entre operaciones), contra la base viva.
// Escenarios derivados de docs/contrato-enmienda-2.md §A4, docs/contrato.md §0.5-0.8 y
// docs/revision-codex-1.md / revision-codex-2.md. Datos ficticios; espacios "ver-a4-*".
import { describe, it, expect, beforeAll } from 'vitest'
import {
  a4Sesion, a4Rpc, a4Dormir, a4Mezclar, a4SincronizarReloj, a4AhoraServidorMs, a4Seg,
  a4EsperarHastaServidor, a4CrearEspacio, a4EspacioDemo, a4ArgsCrear, a4Propuesta, a4CadenaEventos,
  a4LecturaCoherente, a4FormaError, a4Errores, a4Transporte, a4SesionesCreadas,
  type A4C, type A4R, type A4Espacio,
} from './a4-helper'

const LARGO = 240_000
const log = (titulo: string, x: unknown) => console.log(`[A4] ${titulo}: ${JSON.stringify(x)}`)

let T: A4C // organizador (Tomi ficticio)
let R: A4C // segundo miembro real, lector
// Enmienda 7 (E7.3): la simulación solo existe en espacios demo, así que el "motor" con 20 simulados es el
// demo propio de T, el mismo que usan las pruebas de reinicio. Las pruebas corren en serie y cada una crea
// sus propuestas; las de reinicio empiezan reiniciando, y el reinicio conserva a los simulados.
let motor: A4Espacio // demo propio de T con 20 simulados agregados
let lect: A4Espacio // espacio para lecturas que vencen
let demo: { id: string; codigo: string; yo: string }
const SIMS = Array.from({ length: 20 }, (_, i) => `ver-a4-s${String(i + 1).padStart(2, '0')}`)
const unidos: A4C[] = [] // sesiones que ya son miembros del demo (para reutilizar)
const inicio = new Date().toISOString()

beforeAll(async () => {
  T = await a4Sesion()
  await a4SincronizarReloj(T)
  motor = await a4EspacioDemo(T, SIMS)
  lect = await a4CrearEspacio(T, 'lecturas', [])
  R = await a4Sesion()
  const j = await a4Rpc(R, 'join_space', { p_codigo: lect.codigo, p_nombre_visible: 'Lector A4' })
  if (!j?.ok) throw new Error('join lect: ' + JSON.stringify(j?.error))
  const s = await a4Rpc(T, 'seed_demo_space', {})
  if (!s?.ok) throw new Error('seed T: ' + JSON.stringify(s?.error))
  demo = { id: s.resultado.espacio_id, codigo: s.espacio.codigo_invitacion, yo: s.espacio.mi_miembro_id }
  if (demo.id !== motor.id) throw new Error('el motor debería ser el demo propio de T')
  log('inicio', { inicio, servidorMenosCliente_ms: Math.round(a4AhoraServidorMs() - Date.now()) })
}, LARGO)

async function resetDemo(intento = crypto.randomUUID()): Promise<A4R> {
  return a4Rpc(T, 'reset_demo', { p_espacio_id: demo.id, p_intento_id: intento })
}
async function propuestasDe(c: A4C, esp: string): Promise<A4R[]> {
  const r = await a4Rpc(c, 'list_proposals', { p_espacio_id: esp })
  if (!r?.ok) throw new Error('list_proposals: ' + JSON.stringify(r?.error))
  return r.propuestas
}
async function estado(c: A4C, id: string): Promise<A4R> {
  const r = await a4Rpc(c, 'get_proposal_state', { p_propuesta_id: id })
  if (!r?.ok) throw new Error('get_proposal_state: ' + JSON.stringify(r?.error))
  return r.propuesta
}
const simAccept = (prop: string, nombre: string, version: number, intento = crypto.randomUUID()) =>
  a4Rpc(T, 'simulate_accept', { p_propuesta_id: prop, p_miembro_id: motor.sims[nombre], p_version: version, p_intento_id: intento })
const simWithdraw = (prop: string, nombre: string) =>
  a4Rpc(T, 'simulate_withdraw', { p_propuesta_id: prop, p_miembro_id: motor.sims[nombre] })

describe('A4 · atomicidad entre operaciones (verificador independiente)', () => {
  // ---------------------------------------------------------------- seed/seed
  it('[codex] seed/seed: N seeds concurrentes por usuario dejan UN demo y todas devuelven el mismo', async () => {
    const filas: A4R[] = []
    for (let s = 0; s < 4; s++) {
      const c = await a4Sesion()
      for (let ronda = 0; ronda < 2; ronda++) {
        const rs = await Promise.all(Array.from({ length: 8 }, () => a4Rpc(c, 'seed_demo_space', {})))
        const lms = await a4Rpc(c, 'list_my_spaces', {})
        filas.push({
          sesion: s, ronda,
          oks: rs.filter((r) => r?.ok).length,
          ids: new Set(rs.map((r) => r?.resultado?.espacio_id)).size,
          creados: rs.filter((r) => r?.resultado?.creado === true).length,
          repetidos: rs.filter((r) => r?.resultado?.repetido === true).length,
          miembros: [...new Set(rs.map((r) => r?.espacio?.miembros?.length))],
          demos: lms.espacios.filter((e: A4R) => e.demo).length,
        })
      }
    }
    log('seed/seed', filas)
    for (const f of filas) {
      expect(f.oks).toBe(8)
      expect(f.ids).toBe(1)
      expect(f.creados).toBe(f.ronda === 0 ? 1 : 0)
      expect(f.repetidos).toBe(f.ronda === 0 ? 7 : 8)
      expect(f.miembros).toEqual([6])
      expect(f.demos).toBe(1)
    }
  }, LARGO)

  it('[adversarial] seed concurrente con create_space del mismo usuario (nivel 1 asesor): 1 demo + N espacios', async () => {
    const c = await a4Sesion()
    const ops = a4Mezclar([
      ...Array.from({ length: 4 }, () => () => a4Rpc(c, 'seed_demo_space', {})),
      ...Array.from({ length: 3 }, (_, i) => () => a4Rpc(c, 'create_space', { p_nombre: `ver-a4-mix-${i}`, p_tipo: 'amigos', p_nombre_visible: 'Mix A4' })),
    ])
    const rs = await Promise.all(ops.map((f) => f()))
    const lms = await a4Rpc(c, 'list_my_spaces', {})
    const r = {
      oks: rs.filter((x) => x?.ok).length,
      demos: lms.espacios.filter((e: A4R) => e.demo).length,
      noDemo: lms.espacios.filter((e: A4R) => !e.demo).length,
      seedIds: new Set(rs.filter((x) => x?.resultado?.creado !== undefined).map((x) => x.resultado.espacio_id)).size,
    }
    log('seed+create_space', r)
    expect(r).toEqual({ oks: 7, demos: 1, noDemo: 3, seedIds: 1 })
  }, LARGO)

  // ---------------------------------------------------------------- create/create
  it('[codex] create/create con el MISMO intento: una sola propuesta y respuestas iguales (10 rondas x 6)', async () => {
    const antes = (await propuestasDe(T, motor.id)).length
    const filas: A4R[] = []
    for (let ronda = 0; ronda < 10; ronda++) {
      const args = a4ArgsCrear(motor.id, motor.yo, crypto.randomUUID(), { titulo: `ver-a4 cc ${ronda}` })
      const rs = await Promise.all(Array.from({ length: 6 }, () => a4Rpc(T, 'create_proposal', args)))
      filas.push({
        ronda,
        oks: rs.filter((r) => r?.ok).length,
        ids: new Set(rs.map((r) => r?.resultado?.propuesta_id)).size,
        noRepetidos: rs.filter((r) => r?.resultado?.repetido === false).length,
        revs: [...new Set(rs.map((r) => r?.propuesta?.state_rev))],
        estados: [...new Set(rs.map((r) => r?.propuesta?.estado))],
      })
    }
    const despues = (await propuestasDe(T, motor.id)).length
    log('create/create', { filas, nuevas: despues - antes })
    for (const f of filas) {
      expect(f.oks).toBe(6)
      expect(f.ids).toBe(1)
      expect(f.noRepetidos).toBe(1)
      expect(f.revs).toEqual([1])
      expect(f.estados).toEqual(['borrador'])
    }
    expect(despues - antes).toBe(10)
  }, LARGO)

  it('[adversarial] mismo intento con parámetros distintos en paralelo: 1 propuesta, el resto intento_reutilizado', async () => {
    const antes = (await propuestasDe(T, motor.id)).length
    const filas: A4R[] = []
    for (let ronda = 0; ronda < 5; ronda++) {
      const intento = crypto.randomUUID()
      const A = a4ArgsCrear(motor.id, motor.yo, intento, { titulo: `ver-a4 X ${ronda}` })
      const B = { ...A, p_titulo: `ver-a4 Y ${ronda}` }
      const rs = await Promise.all([A, B, A, B, A, B].map((a) => a4Rpc(T, 'create_proposal', a)))
      const oks = rs.filter((r) => r?.ok)
      filas.push({
        ronda,
        oks: oks.length,
        ids: new Set(oks.map((r) => r.resultado.propuesta_id)).size,
        titulos: new Set(oks.map((r) => r.propuesta.titulo)).size,
        reutilizado: rs.filter((r) => r?.error?.detalle === 'intento_reutilizado').length,
      })
    }
    const despues = (await propuestasDe(T, motor.id)).length
    log('mismo intento, params distintos', { filas, nuevas: despues - antes })
    for (const f of filas) expect(f).toMatchObject({ oks: 3, ids: 1, titulos: 1, reutilizado: 3 })
    expect(despues - antes).toBe(5)
  }, LARGO)

  it('[codex] replay de create_proposal exitoso DESPUÉS de vencer su plazo (x4 en paralelo) devuelve el resultado guardado', async () => {
    const plazo = Math.floor((a4AhoraServidorMs() + 5000) / 1000) * 1000
    const args = a4ArgsCrear(motor.id, motor.yo, crypto.randomUUID(), { plazoUtcMs: plazo, titulo: 'ver-a4 replay vencido' })
    const c0 = await a4Rpc(T, 'create_proposal', args)
    expect(c0?.ok).toBe(true)
    await a4EsperarHastaServidor(plazo + 2500)
    const rs = await Promise.all(Array.from({ length: 4 }, () => a4Rpc(T, 'create_proposal', args)))
    const p = await estado(T, c0.resultado.propuesta_id)
    const r = {
      oks: rs.filter((x) => x?.ok).length,
      mismoId: rs.every((x) => x?.resultado?.propuesta_id === c0.resultado.propuesta_id),
      repetidos: rs.filter((x) => x?.resultado?.repetido === true).length,
      errores: rs.filter((x) => !x?.ok).map((x) => x?.error),
      estadoFinal: p.estado,
      expiradas: p.historial.filter((e: A4R) => e.tipo === 'propuesta_expirada').length,
      cadena: a4CadenaEventos(p),
    }
    log('replay tras plazo', r)
    expect(r).toMatchObject({ oks: 4, mismoId: true, repetidos: 4, estadoFinal: 'expirado', expiradas: 1, cadena: [] })
  }, LARGO)

  // ---------------------------------------------------------------- reset/create
  it('[codex] reset/create concurrentes: o la propuesta sobrevive (reset primero) o se borra y su replay da intento_obsoleto (8 rondas)', async () => {
    const filas: A4R[] = []
    for (let ronda = 0; ronda < 8; ronda++) {
      const r0 = await resetDemo()
      expect(r0?.ok).toBe(true)
      expect((await propuestasDe(T, demo.id)).length).toBe(0)
      const gen0 = r0.generacion
      const args = a4ArgsCrear(demo.id, demo.yo, crypto.randomUUID(), { titulo: `ver-a4 rc ${ronda}` })
      const intentoReset = crypto.randomUUID()
      const ops = a4Mezclar([
        { k: 'reset', f: () => resetDemo(intentoReset) },
        { k: 'create', f: () => a4Rpc(T, 'create_proposal', args) },
      ])
      const out = await Promise.all(ops.map(async (o, i) => { if (i === 1) await a4Dormir(Math.random() * 15); return [o.k, await o.f()] as const }))
      const rr = Object.fromEntries(out) as Record<string, A4R>
      const lista = await propuestasDe(T, demo.id)
      const replay = await a4Rpc(T, 'create_proposal', args)
      const replayReset = await resetDemo(intentoReset)
      filas.push({
        ronda,
        resetOk: rr.reset?.ok, createOk: rr.create?.ok,
        eliminadas: rr.reset?.resultado?.propuestas_eliminadas,
        existen: lista.length,
        gen: rr.reset?.generacion - gen0,
        replay: replay?.ok ? `ok repetido=${replay.resultado.repetido} mismoId=${replay.resultado.propuesta_id === rr.create?.resultado?.propuesta_id}` : replay?.error?.codigo,
        replayReset: replayReset?.ok ? `ok repetido=${replayReset.resultado.repetido} gen=${replayReset.generacion - gen0}` : replayReset?.error?.codigo,
        existenTrasReplayReset: (await propuestasDe(T, demo.id)).length,
      })
    }
    log('reset/create', filas)
    for (const f of filas) {
      expect(f.resetOk).toBe(true)
      expect(f.createOk).toBe(true)
      expect(f.gen).toBe(1)
      expect(f.eliminadas + f.existen).toBe(1)
      expect(f.replay).toBe(f.existen === 1 ? 'ok repetido=true mismoId=true' : 'intento_obsoleto')
      expect(f.replayReset).toBe('ok repetido=true gen=1')
      expect(f.existenTrasReplayReset).toBe(f.existen)
    }
  }, LARGO)

  it('[adversarial] repetición del MISMO reset (x3 concurrentes) junto a un create: la propuesta nueva sobrevive', async () => {
    const filas: A4R[] = []
    for (let ronda = 0; ronda < 3; ronda++) {
      const I = crypto.randomUUID()
      const r0 = await resetDemo(I)
      expect(r0?.ok).toBe(true)
      const args = a4ArgsCrear(demo.id, demo.yo, crypto.randomUUID(), { titulo: `ver-a4 rr ${ronda}` })
      const rs = await Promise.all(a4Mezclar([
        () => resetDemo(I), () => resetDemo(I), () => resetDemo(I), () => a4Rpc(T, 'create_proposal', args),
      ]).map((f) => f()))
      const resets = rs.filter((x) => x?.resultado && 'propuestas_eliminadas' in x.resultado)
      const lista = await propuestasDe(T, demo.id)
      filas.push({
        ronda,
        repetidos: resets.filter((x) => x.resultado.repetido === true).length,
        mismaGen: resets.every((x) => x.generacion === r0.generacion),
        existen: lista.length,
      })
    }
    log('reset repetido + create', filas)
    for (const f of filas) expect(f).toEqual({ ronda: f.ronda, repetidos: 3, mismaGen: true, existen: 1 })
  }, LARGO)

  it('[adversarial] dos resets distintos + create en paralelo: generación +2 y conteo coherente (4 rondas)', async () => {
    const filas: A4R[] = []
    for (let ronda = 0; ronda < 4; ronda++) {
      const r0 = await resetDemo()
      const args = a4ArgsCrear(demo.id, demo.yo, crypto.randomUUID(), { titulo: `ver-a4 2r ${ronda}` })
      const rs = await Promise.all(a4Mezclar([() => resetDemo(), () => resetDemo(), () => a4Rpc(T, 'create_proposal', args)]).map((f) => f()))
      const resets = rs.filter((x) => x?.resultado && 'propuestas_eliminadas' in x.resultado)
      const create = rs.find((x) => x?.resultado?.propuesta_id)
      const lista = await propuestasDe(T, demo.id)
      const sp = await a4Rpc(T, 'get_space', { p_espacio_id: demo.id })
      filas.push({
        ronda,
        oks: rs.filter((x) => x?.ok).length,
        gens: resets.map((x) => x.generacion - r0.generacion).sort(),
        genFinal: sp.espacio.generacion - r0.generacion,
        eliminadas: resets.reduce((a, x) => a + x.resultado.propuestas_eliminadas, 0),
        existen: lista.length,
        createOk: !!create?.ok,
      })
    }
    log('2 resets + create', filas)
    for (const f of filas) {
      expect(f.oks).toBe(3)
      expect(f.gens).toEqual([1, 2])
      expect(f.genFinal).toBe(2)
      expect(f.eliminadas + f.existen).toBe(1)
    }
  }, LARGO)

  // ---------------------------------------------------------------- join/simulación
  async function propuestaDemoAbierta(titulo: string): Promise<string> {
    const c = await a4Rpc(T, 'create_proposal', a4ArgsCrear(demo.id, demo.yo, crypto.randomUUID(), { titulo }))
    const o = await a4Rpc(T, 'open_proposal', { p_propuesta_id: c.resultado.propuesta_id })
    expect(o?.ok).toBe(true)
    return c.resultado.propuesta_id
  }
  async function asientoNuevo(nombre: string): Promise<string> {
    const r = await a4Rpc(T, 'add_simulated_member', { p_espacio_id: demo.id, p_nombre_visible: nombre })
    if (!r?.ok) throw new Error('add_simulated_member demo: ' + JSON.stringify(r?.error))
    return r.resultado.miembro_id
  }
  const tag = Math.random().toString(36).slice(2, 6)

  it('[codex] join/simulate_save_conditions concurrentes: gana exactamente uno, nunca un real con condiciones heredadas (8 rondas)', async () => {
    await resetDemo()
    const prop = await propuestaDemoAbierta('ver-a4 join-cond')
    const filas: A4R[] = []
    for (let i = 0; i < 8; i++) {
      const nombre = `ver-a4-j${tag}${i}`
      const mid = await asientoNuevo(nombre)
      const L = await a4Sesion()
      const ops = a4Mezclar([
        { k: 'join', f: () => a4Rpc(L, 'join_space', { p_codigo: demo.codigo, p_nombre_visible: nombre }) },
        { k: 'sim', f: () => a4Rpc(T, 'simulate_save_conditions', { p_propuesta_id: prop, p_miembro_id: mid, p_disponibilidad: { A: 'si', B: 'si' } }) },
      ])
      const out = await Promise.all(ops.map(async (o, j) => { if (j === 1) await a4Dormir(Math.random() * 20); return [o.k, await o.f()] as const }))
      const rr = Object.fromEntries(out) as Record<string, A4R>
      let condL: string | null = null
      if (rr.join?.ok) {
        unidos.push(L)
        const g = await a4Rpc(L, 'get_my_conditions', { p_propuesta_id: prop })
        condL = g?.condiciones?.estado ?? g?.error?.codigo
      }
      filas.push({
        i,
        join: rr.join?.ok ? `ok reclamo=${rr.join.resultado.reclamo_asiento_simulado} mismo=${rr.join.resultado.miembro_id === mid}` : rr.join?.error?.detalle,
        sim: rr.sim?.ok ? 'ok' : rr.sim?.error?.detalle,
        condicionesDelReal: condL,
      })
    }
    log('join vs simulate_save_conditions', filas)
    for (const f of filas) {
      const joinOk = f.join.startsWith('ok')
      expect(joinOk !== (f.sim === 'ok')).toBe(true) // exactamente uno gana
      if (joinOk) {
        expect(f.join).toBe('ok reclamo=true mismo=true')
        expect(f.sim).toBe('miembro_no_simulado')
        expect(f.condicionesDelReal).toBe('sin_cargar')
      } else expect(f.join).toBe('asiento_en_uso')
    }
  }, LARGO)

  it('[adversarial] join/simulate_withdraw concurrentes: exactamente uno gana (4 rondas)', async () => {
    const prop = await propuestaDemoAbierta('ver-a4 join-baja')
    const filas: A4R[] = []
    for (let i = 0; i < 4; i++) {
      const nombre = `ver-a4-w${tag}${i}`
      const mid = await asientoNuevo(nombre)
      const L = await a4Sesion()
      const rs = await Promise.all(a4Mezclar([
        async () => ['join', await a4Rpc(L, 'join_space', { p_codigo: demo.codigo, p_nombre_visible: nombre })] as const,
        async () => ['sim', await a4Rpc(T, 'simulate_withdraw', { p_propuesta_id: prop, p_miembro_id: mid })] as const,
      ]).map((f) => f()))
      const rr = Object.fromEntries(rs) as Record<string, A4R>
      if (rr.join?.ok) unidos.push(L)
      filas.push({ i, join: rr.join?.ok ? 'ok' : rr.join?.error?.detalle, sim: rr.sim?.ok ? 'ok' : rr.sim?.error?.detalle })
    }
    log('join vs simulate_withdraw', filas)
    for (const f of filas) {
      expect((f.join === 'ok') !== (f.sim === 'ok')).toBe(true)
      if (f.join === 'ok') expect(f.sim).toBe('miembro_no_simulado')
      else expect(f.join).toBe('asiento_en_uso')
    }
  }, LARGO)

  it('[adversarial] join/simulate_mark_interest concurrentes: si la simulación gana, ocurrió ANTES del reclamo (4 rondas)', async () => {
    const prop = await propuestaDemoAbierta('ver-a4 join-interes')
    const filas: A4R[] = []
    for (let i = 0; i < 4; i++) {
      const nombre = `ver-a4-k${tag}${i}`
      const mid = await asientoNuevo(nombre)
      const L = await a4Sesion()
      const rs = await Promise.all(a4Mezclar([
        async () => ['join', await a4Rpc(L, 'join_space', { p_codigo: demo.codigo, p_nombre_visible: nombre })] as const,
        async () => ['sim', await a4Rpc(T, 'simulate_mark_interest', { p_propuesta_id: prop, p_miembro_id: mid, p_interesado: true })] as const,
      ]).map((f) => f()))
      const rr = Object.fromEntries(rs) as Record<string, A4R>
      if (rr.join?.ok) unidos.push(L)
      const enSim = rr.sim?.ok ? rr.sim.propuesta.interesados.miembros.find((m: A4R) => m.miembro_id === mid) : null
      const vistaL = rr.join?.ok ? await estado(L, prop) : null
      filas.push({
        i,
        join: rr.join?.ok ? 'ok' : rr.join?.error?.detalle,
        sim: rr.sim?.ok ? 'ok' : rr.sim?.error?.detalle,
        simuladoEnRespuestaSim: enSim ? enSim.simulado : null,
        interesadoParaElReal: vistaL ? vistaL.mi_situacion.interesado : null,
      })
    }
    log('join vs simulate_mark_interest', filas)
    for (const f of filas) {
      expect(f.join).toBe('ok') // el interés no bloquea el reclamo (enmienda A2: solo condiciones/elegibilidad/aceptaciones)
      if (f.sim === 'ok') expect(f.simuladoEnRespuestaSim).toBe(true)
      else expect(f.sim).toBe('miembro_no_simulado')
      expect(f.interesadoParaElReal).toBe(f.sim === 'ok')
    }
  }, LARGO)

  it('[adversarial] dos sesiones reclaman el mismo asiento a la vez: un solo reclamo, la otra nombre_en_uso (3 rondas)', async () => {
    const filas: A4R[] = []
    for (let i = 0; i < 3; i++) {
      const nombre = `ver-a4-d${tag}${i}`
      const mid = await asientoNuevo(nombre)
      const [L1, L2] = [await a4Sesion(), await a4Sesion()]
      const rs = await Promise.all([L1, L2].map((L) => a4Rpc(L, 'join_space', { p_codigo: demo.codigo, p_nombre_visible: nombre })))
      rs.forEach((r, j) => { if (r?.ok) unidos.push([L1, L2][j]) })
      const sp = await a4Rpc(T, 'get_space', { p_espacio_id: demo.id })
      filas.push({
        i,
        reclamos: rs.filter((r) => r?.ok && r.resultado.reclamo_asiento_simulado && r.resultado.miembro_id === mid).length,
        otros: rs.filter((r) => !r?.ok).map((r) => r?.error?.detalle),
        conEseNombre: sp.espacio.miembros.filter((m: A4R) => m.nombre === nombre).length,
      })
    }
    log('doble reclamo', filas)
    for (const f of filas) expect(f).toEqual({ i: f.i, reclamos: 1, otros: ['nombre_en_uso'], conEseNombre: 1 })
  }, LARGO)

  // ---------------------------------------------------------------- aceptar / retiro
  it('[codex] aceptar concurrente con retiro de OTRO miembro: el resultado corresponde a un orden serial (6 rondas)', async () => {
    const filas: A4R[] = []
    for (let i = 0; i < 6; i++) {
      const p = await a4Propuesta(T, motor, { minimo: 3, maximo: 3, publicar: true, sims: [SIMS[0], SIMS[1], SIMS[2]], titulo: 'ver-a4 acc-ret' })
      const v = p.version!
      expect((await a4Rpc(T, 'accept_version', { p_propuesta_id: p.id, p_version: v, p_intento_id: crypto.randomUUID() }))?.ok).toBe(true)
      expect((await simAccept(p.id, SIMS[0], v))?.ok).toBe(true)
      const rs = await Promise.all(a4Mezclar([
        async () => ['acc', await simAccept(p.id, SIMS[1], v)] as const,
        async () => ['ret', await simWithdraw(p.id, SIMS[0])] as const,
      ]).map((f) => f()))
      const rr = Object.fromEntries(rs) as Record<string, A4R>
      const fin = await estado(T, p.id)
      const accPrimero = rr.acc?.propuesta?.state_rev < rr.ret?.propuesta?.state_rev
      filas.push({
        i, accPrimero,
        acc: rr.acc?.ok ? `ok confirma=${rr.acc.resultado.grupo_confirmado}` : rr.acc?.error?.detalle,
        ret: rr.ret?.ok ? rr.ret.resultado.efecto : rr.ret?.error?.detalle,
        final: `${fin.estado}/${fin.confirmados}`,
        cadena: a4CadenaEventos(fin),
      })
    }
    log('aceptar vs retiro de otro', filas)
    for (const f of filas) {
      expect(f.cadena).toEqual([])
      if (f.accPrimero) expect([f.acc, f.ret, f.final]).toEqual(['ok confirma=true', 'pasa_a_revision', 'en_revision/2'])
      else expect([f.acc, f.ret, f.final]).toEqual(['ok confirma=false', 'sin_cambio_de_estado', 'esperando_compromisos/2'])
    }
  }, LARGO)

  it('[adversarial] aceptar y retirarse el MISMO miembro a la vez: nunca queda retirado con aceptación vigente (6 rondas)', async () => {
    const filas: A4R[] = []
    for (let i = 0; i < 6; i++) {
      const p = await a4Propuesta(T, motor, { minimo: 3, maximo: 4, publicar: true, sims: [SIMS[0], SIMS[1], SIMS[2]], titulo: 'ver-a4 mismo' })
      const v = p.version!
      await a4Rpc(T, 'accept_version', { p_propuesta_id: p.id, p_version: v, p_intento_id: crypto.randomUUID() })
      const rs = await Promise.all(a4Mezclar([
        async () => ['acc', await simAccept(p.id, SIMS[1], v)] as const,
        async () => ['ret', await simWithdraw(p.id, SIMS[1])] as const,
      ]).map((f) => f()))
      const rr = Object.fromEntries(rs) as Record<string, A4R>
      const fin = await estado(T, p.id)
      const baja = fin.bajas.find((b: A4R) => b.miembro.miembro_id === motor.sims[SIMS[1]])
      filas.push({
        i,
        acc: rr.acc?.ok ? 'ok' : rr.acc?.error?.detalle,
        ret: rr.ret?.ok ? 'ok' : rr.ret?.error?.detalle,
        habiaAceptado: baja?.habia_aceptado,
        sigueAceptado: fin.opcion.aceptaron.some((a: A4R) => a.miembro.miembro_id === motor.sims[SIMS[1]]),
        cadena: a4CadenaEventos(fin),
      })
    }
    log('aceptar vs retiro del mismo', filas)
    for (const f of filas) {
      expect(f.ret).toBe('ok')
      expect(f.sigueAceptado).toBe(false)
      expect(f.cadena).toEqual([])
      if (f.acc === 'ok') expect(f.habiaAceptado).toBe(true)
      else { expect(f.acc).toBe('retirado'); expect(f.habiaAceptado).toBe(false) }
    }
  }, LARGO)

  it('[adversarial] 5 invitados + anfitrión compiten por 3 cupos a la vez: anfitrión siempre entra, nunca se excede (4 rondas)', async () => {
    const filas: A4R[] = []
    for (let i = 0; i < 4; i++) {
      const sims = SIMS.slice(0, 5)
      const p = await a4Propuesta(T, motor, { minimo: 3, maximo: 3, publicar: true, sims, titulo: 'ver-a4 cupos' })
      const v = p.version!
      const rs = await Promise.all(a4Mezclar([
        ...sims.map((n) => async () => ['sim', await simAccept(p.id, n, v)] as const),
        async () => ['host', await a4Rpc(T, 'accept_version', { p_propuesta_id: p.id, p_version: v, p_intento_id: crypto.randomUUID() })] as const,
      ]).map((f) => f()))
      const fin = await estado(T, p.id)
      filas.push({
        i,
        host: rs.find(([k]) => k === 'host')![1]?.ok,
        simOk: rs.filter(([k, r]) => k === 'sim' && r?.ok).length,
        simErr: [...new Set(rs.filter(([k, r]) => k === 'sim' && !r?.ok).map(([, r]) => `${r?.error?.codigo}/${r?.error?.detalle}`))],
        final: `${fin.estado}/${fin.confirmados}`,
        cadena: a4CadenaEventos(fin),
      })
    }
    log('carrera de cupos', filas)
    for (const f of filas) {
      expect(f.host).toBe(true)
      expect(f.simOk).toBe(2)
      for (const e of f.simErr) expect(['cupo_completo/reservado_imprescindible', 'cupo_completo/sin_cupo']).toContain(e)
      expect(f.final).toBe('grupo_confirmado/3')
      expect(f.cadena).toEqual([])
    }
  }, LARGO)

  it('[adversarial] doble clic: 5 aceptaciones concurrentes (intentos distintos) y 5 con el mismo intento -> una sola aceptación', async () => {
    const p = await a4Propuesta(T, motor, { minimo: 3, maximo: 4, publicar: true, sims: [SIMS[0], SIMS[1]], titulo: 'ver-a4 dobleclic' })
    const v = p.version!
    const a = await Promise.all(Array.from({ length: 5 }, () => a4Rpc(T, 'accept_version', { p_propuesta_id: p.id, p_version: v, p_intento_id: crypto.randomUUID() })))
    const I = crypto.randomUUID()
    const b = await Promise.all(Array.from({ length: 5 }, () => simAccept(p.id, SIMS[0], v, I)))
    const fin = await estado(T, p.id)
    const r = {
      aOk: a.filter((x) => x?.ok).length, aNuevas: a.filter((x) => x?.resultado?.repetido === false).length,
      bOk: b.filter((x) => x?.ok).length, bNuevas: b.filter((x) => x?.resultado?.repetido === false).length,
      confirmados: fin.confirmados,
      eventosAceptacion: fin.historial.filter((e: A4R) => e.tipo === 'aceptacion').length,
    }
    log('doble clic', r)
    expect(r).toEqual({ aOk: 5, aNuevas: 1, bOk: 5, bNuevas: 1, confirmados: 2, eventosAceptacion: 2 })
  }, LARGO)

  // ---------------------------------------------------------------- reloj de decisión
  it('[adversarial] instante de decisión posterior al bloqueo: servidor_ahora no decrece con el orden de serialización (10 ráfagas x 12)', async () => {
    const p = await a4Propuesta(T, motor, { minimo: 2, maximo: 6, titulo: 'ver-a4 reloj' })
    const inversiones: A4R[] = []
    let total = 0
    for (let rafaga = 0; rafaga < 10; rafaga++) {
      const val = rafaga % 2 === 0
      const rs = await Promise.all(SIMS.slice(0, 12).map((n) =>
        a4Rpc(T, 'simulate_mark_interest', { p_propuesta_id: p.id, p_miembro_id: motor.sims[n], p_interesado: val })))
      const oks = rs.filter((x) => x?.ok)
      total += oks.length
      expect(oks.length).toBe(12)
      expect(new Set(oks.map((x) => x.propuesta.state_rev)).size).toBe(12) // serializadas: cada una vio la anterior
      oks.sort((x, y) => x.propuesta.state_rev - y.propuesta.state_rev)
      for (let k = 1; k < oks.length; k++)
        if (Date.parse(oks[k].servidor_ahora.utc) < Date.parse(oks[k - 1].servidor_ahora.utc))
          inversiones.push({ rafaga, rev: oks[k].propuesta.state_rev, antes: oks[k - 1].servidor_ahora.utc, despues: oks[k].servidor_ahora.utc })
    }
    log('reloj de decisión', { total, inversiones })
    expect(inversiones).toEqual([])
  }, LARGO)

  // ---------------------------------------------------------------- aceptar vs vencimiento
  it('[codex] aceptar vs vencimiento bajo contención: ninguna aceptación con instante >= plazo; vencimiento registrado una vez', async () => {
    const sims = SIMS.slice(0, 20)
    const p = await a4Propuesta(T, motor, { minimo: 6, maximo: 20, plazoEnSeg: 25, publicar: true, sims, titulo: 'ver-a4 acc-vence' })
    const v = p.version!
    const plazoMs = p.plazoSeg * 1000
    await a4EsperarHastaServidor(plazoMs - 2600)
    const pend: Promise<readonly [string, number, A4R]>[] = []
    let k = 0
    while (a4AhoraServidorMs() < plazoMs + 2600) {
      const t = a4AhoraServidorMs()
      if (k < sims.length) { const n = sims[k++]; pend.push(simAccept(p.id, n, v).then((r) => ['acc', t, r] as const)) }
      for (const n of a4Mezclar(sims).slice(0, 4))
        pend.push(a4Rpc(T, 'simulate_mark_interest', { p_propuesta_id: p.id, p_miembro_id: motor.sims[n], p_interesado: Math.random() < 0.5 }).then((r) => ['int', t, r] as const))
      pend.push(a4Rpc(T, 'get_proposal_state', { p_propuesta_id: p.id }).then((r) => ['get', t, r] as const))
      await a4Dormir(250)
    }
    const out = await Promise.all(pend)
    const malos: A4R[] = []
    const res = { accOk: 0, accVencido: 0, accOtros: [] as A4R[], gets: 0, transporte: 0, temporales: 0 }
    for (const [tipo, , r] of out) {
      if (r?.transporte) { res.transporte++; continue }
      if (r?.error?.codigo === 'fallo_temporal') { res.temporales++; continue }
      const sa = a4Seg(r.servidor_ahora)
      if (tipo === 'acc') {
        if (r.ok) { res.accOk++; if (sa >= p.plazoSeg || r.propuesta.plazo_vencido) malos.push({ tipo, sa: r.servidor_ahora.utc }) }
        else if (r.error.codigo === 'plazo_vencido') { res.accVencido++; if (sa < p.plazoSeg) malos.push({ tipo: 'vencido antes de plazo', sa: r.servidor_ahora.utc }) }
        else res.accOtros.push(r.error)
      } else if (tipo === 'get') {
        res.gets++
        const m = a4LecturaCoherente(r, r.propuesta, p.plazoSeg)
        if (m) malos.push({ tipo, m })
      } else if (r.ok && sa >= p.plazoSeg) malos.push({ tipo: 'interés escrito tras plazo', sa: r.servidor_ahora.utc })
    }
    const fin = await estado(T, p.id)
    const tarde = fin.opcion.aceptaron.filter((a: A4R) => a4Seg(a.aceptado_en) >= p.plazoSeg)
    log('aceptar vs vencimiento', { plazo: new Date(plazoMs).toISOString(), ...res, malos, final: fin.estado, confirmados: fin.confirmados, tarde: tarde.length, cadena: a4CadenaEventos(fin) })
    expect(res.transporte + res.temporales).toBe(0)
    expect(res.accOtros).toEqual([])
    expect(res.accOk).toBeGreaterThan(0)
    expect(res.accVencido).toBeGreaterThan(0)
    expect(malos).toEqual([])
    expect(fin.estado).toBe('expirado')
    expect(tarde).toEqual([])
    expect(fin.historial.filter((e: A4R) => e.tipo === 'propuesta_expirada').length).toBe(1)
    expect(a4CadenaEventos(fin)).toEqual([])
  }, LARGO)

  it('[adversarial] cola de bloqueo que cruza el plazo: 30 escrituras + 10 aceptaciones disparadas a la vez justo antes del cierre (2 propuestas)', async () => {
    const sims = SIMS.slice(0, 20)
    const filas: A4R[] = []
    for (let i = 0; i < 2; i++) {
      const p = await a4Propuesta(T, motor, { minimo: 6, maximo: 20, plazoEnSeg: 20, publicar: true, sims, titulo: 'ver-a4 cola-plazo' })
      const v = p.version!
      await a4EsperarHastaServidor(p.plazoSeg * 1000 - 700 - i * 400)
      const ops = a4Mezclar([
        ...Array.from({ length: 30 }, (_, j) => async () => ['int', await a4Rpc(T, 'simulate_mark_interest', { p_propuesta_id: p.id, p_miembro_id: motor.sims[sims[j % 20]], p_interesado: j < 20 })] as const),
        ...sims.slice(0, 10).map((n) => async () => ['acc', await simAccept(p.id, n, v)] as const),
        ...Array.from({ length: 4 }, () => async () => ['get', await a4Rpc(T, 'get_proposal_state', { p_propuesta_id: p.id })] as const),
      ])
      const out = await Promise.all(ops.map((f) => f()))
      const malos: A4R[] = []
      const cuenta: Record<string, number> = {}
      for (const [k, r] of out) {
        const c = `${k}:${r?.ok ? 'ok' : `${r?.error?.codigo}`}`
        cuenta[c] = (cuenta[c] ?? 0) + 1
        if (r?.transporte || r?.error?.codigo === 'fallo_temporal') { malos.push({ k, e: r.error }); continue }
        const sa = a4Seg(r.servidor_ahora)
        if (k !== 'get' && r.ok && sa >= p.plazoSeg) malos.push({ k, escritoTrasPlazo: r.servidor_ahora.utc })
        if (k !== 'get' && !r.ok && r.error.codigo === 'plazo_vencido' && sa < p.plazoSeg) malos.push({ k, vencidoAntes: r.servidor_ahora.utc })
        if (k === 'get') { const m = a4LecturaCoherente(r, r.propuesta, p.plazoSeg); if (m) malos.push({ k, m }) }
      }
      const fin = await estado(T, p.id)
      filas.push({ i, cuenta, malos, final: fin.estado, expiradas: fin.historial.filter((e: A4R) => e.tipo === 'propuesta_expirada').length, cadena: a4CadenaEventos(fin) })
    }
    log('cola que cruza el plazo', filas)
    for (const f of filas) {
      expect(f.malos).toEqual([])
      expect(f.final).toBe('expirado')
      expect(f.expiradas).toBe(1)
      expect(f.cadena).toEqual([])
    }
  }, LARGO)

  // ---------------------------------------------------------------- lecturas que vencen
  it('[codex] dos lectores get_proposal_state concurrentes sobre una propuesta que vence: sin estados contradictorios ni doble vencimiento (3 propuestas)', async () => {
    const filas: A4R[] = []
    for (let i = 0; i < 3; i++) {
      const p = await a4Propuesta(T, lect, { minimo: 2, maximo: 4, plazoEnSeg: 6, titulo: 'ver-a4 lectura' })
      const plazoMs = p.plazoSeg * 1000
      await a4EsperarHastaServidor(plazoMs - 1500)
      const pend: Promise<A4R>[] = []
      while (a4AhoraServidorMs() < plazoMs + 1500) {
        for (const c of [T, R, T, R, T, R]) pend.push(a4Rpc(c, 'get_proposal_state', { p_propuesta_id: p.id }))
        await a4Dormir(100)
      }
      const rs = await Promise.all(pend)
      const malos: A4R[] = []
      const revs: Record<string, Set<number>> = { expirado: new Set(), otro: new Set() }
      let err = 0
      for (const r of rs) {
        if (!r?.ok) { err++; continue }
        const m = a4LecturaCoherente(r, r.propuesta, p.plazoSeg)
        if (m) malos.push(m)
        revs[r.propuesta.estado === 'expirado' ? 'expirado' : 'otro'].add(r.propuesta.state_rev)
      }
      const fin = await estado(R, p.id)
      filas.push({
        i, lecturas: rs.length, errores: err, malos,
        revsExpirado: [...revs.expirado], revsAntes: [...revs.otro],
        expiradas: fin.historial.filter((e: A4R) => e.tipo === 'propuesta_expirada').length,
        cadena: a4CadenaEventos(fin),
      })
    }
    log('lectores concurrentes al vencer', filas)
    for (const f of filas) {
      expect(f.errores).toBe(0)
      expect(f.malos).toEqual([])
      expect(f.revsAntes).toEqual([2])
      expect(f.revsExpirado).toEqual([3])
      expect(f.expiradas).toBe(1)
      expect(f.cadena).toEqual([])
    }
  }, LARGO)

  it('[adversarial] list_proposals + get_proposal_state + get_my_conditions concurrentes con 2 propuestas que vencen a la vez', async () => {
    const plazoEnSeg = 7
    const p1 = await a4Propuesta(T, lect, { minimo: 2, maximo: 4, plazoEnSeg, titulo: 'ver-a4 lista1' })
    const p2 = await a4Propuesta(T, lect, { minimo: 2, maximo: 4, plazoEnSeg, titulo: 'ver-a4 lista2' })
    const plazoMs = Math.max(p1.plazoSeg, p2.plazoSeg) * 1000
    await a4EsperarHastaServidor(plazoMs - 1500)
    const pend: Promise<readonly [string, A4R]>[] = []
    while (a4AhoraServidorMs() < plazoMs + 1500) {
      for (const c of a4Mezclar([T, R])) {
        pend.push(a4Rpc(c, 'list_proposals', { p_espacio_id: lect.id }).then((r) => ['list', r] as const))
        pend.push(a4Rpc(c, 'get_proposal_state', { p_propuesta_id: p2.id }).then((r) => ['get', r] as const))
        pend.push(a4Rpc(c, 'get_my_conditions', { p_propuesta_id: p1.id }).then((r) => ['cond', r] as const))
      }
      pend.push(a4Rpc(T, 'get_simulation_panel', { p_propuesta_id: p1.id }).then((r) => ['panel', r] as const))
      await a4Dormir(100)
    }
    const out = await Promise.all(pend)
    const malos: A4R[] = []
    let err = 0
    for (const [k, r] of out) {
      if (!r?.ok) { err++; continue }
      const sa = a4Seg(r.servidor_ahora)
      if (k === 'list') {
        for (const s of r.propuestas.filter((x: A4R) => x.id === p1.id || x.id === p2.id)) {
          const ps = s.id === p1.id ? p1.plazoSeg : p2.plazoSeg
          if (s.plazo_vencido !== (sa >= ps) || (s.estado === 'expirado') !== (sa >= ps)) malos.push({ k, estado: s.estado, pv: s.plazo_vencido, sa: r.servidor_ahora.utc })
        }
      } else if (k === 'get') {
        const m = a4LecturaCoherente(r, r.propuesta, p2.plazoSeg)
        if (m) malos.push({ k, m })
      }
    }
    const f1 = await estado(T, p1.id)
    const f2 = await estado(T, p2.id)
    const r = {
      llamadas: out.length, errores: err, malos,
      expiradas: [f1, f2].map((f) => f.historial.filter((e: A4R) => e.tipo === 'propuesta_expirada').length),
      revs: [f1.state_rev, f2.state_rev],
      cadenas: [...a4CadenaEventos(f1), ...a4CadenaEventos(f2)],
    }
    log('lista + lecturas al vencer', r)
    expect(r.errores).toBe(0)
    expect(r.malos).toEqual([])
    expect(r.expiradas).toEqual([1, 1])
    expect(r.revs).toEqual([3, 3])
    expect(r.cadenas).toEqual([])
  }, LARGO)

  // ---------------------------------------------------------------- deadlocks / timeouts
  it('[adversarial] ráfaga mixta de ~35 operaciones sobre el mismo espacio demo (reset, create, join, simulate_*, lecturas, vencimiento): sin 40P01/55P03 (3 rondas)', async () => {
    const filas: A4R[] = []
    for (let ronda = 0; ronda < 3; ronda++) {
      await resetDemo()
      const sp = await a4Rpc(T, 'get_space', { p_espacio_id: demo.id })
      const simsDemo = sp.espacio.miembros.filter((m: A4R) => m.simulado).map((m: A4R) => m.miembro_id)
      const plazoCaos = Math.floor((a4AhoraServidorMs() + 5000) / 1000) * 1000
      const pVence = await a4Rpc(T, 'create_proposal', a4ArgsCrear(demo.id, demo.yo, crypto.randomUUID(), { plazoUtcMs: plazoCaos, titulo: 'ver-a4 caos vence' }))
      const pOtra = await a4Rpc(T, 'create_proposal', a4ArgsCrear(demo.id, demo.yo, crypto.randomUUID(), { titulo: 'ver-a4 caos' }))
      const id1 = pVence.resultado.propuesta_id
      const id2 = pOtra.resultado.propuesta_id
      await a4Rpc(T, 'open_proposal', { p_propuesta_id: id1 })
      await a4Rpc(T, 'open_proposal', { p_propuesta_id: id2 })
      await a4EsperarHastaServidor(plazoCaos - 150)
      const otros = unidos.slice(0, 3)
      const ops: Array<() => Promise<A4R>> = [
        ...Array.from({ length: 4 }, () => () => a4Rpc(T, 'list_proposals', { p_espacio_id: demo.id })),
        ...Array.from({ length: 3 }, () => () => a4Rpc(T, 'get_proposal_state', { p_propuesta_id: id1 })),
        ...otros.map((c) => () => a4Rpc(c, 'get_proposal_state', { p_propuesta_id: id1 })),
        ...otros.map((c) => () => a4Rpc(c, 'list_proposals', { p_espacio_id: demo.id })),
        ...otros.map((c) => () => a4Rpc(c, 'mark_interest', { p_propuesta_id: id2, p_interesado: true })),
        ...otros.map((c) => () => a4Rpc(c, 'save_my_conditions', { p_propuesta_id: id2, p_disponibilidad: { A: 'si', B: 'no' } })),
        ...simsDemo.slice(0, 4).map((m: string) => () => a4Rpc(T, 'simulate_mark_interest', { p_propuesta_id: id2, p_miembro_id: m, p_interesado: true })),
        ...simsDemo.slice(0, 4).map((m: string) => () => a4Rpc(T, 'simulate_save_conditions', { p_propuesta_id: id1, p_miembro_id: m, p_disponibilidad: { A: 'si', B: 'si' } })),
        ...Array.from({ length: 2 }, (_, i) => () => a4Rpc(T, 'add_simulated_member', { p_espacio_id: demo.id, p_nombre_visible: `ver-a4-c${tag}${ronda}${i}` })),
        ...Array.from({ length: 2 }, () => () => a4Rpc(T, 'create_proposal', a4ArgsCrear(demo.id, demo.yo, crypto.randomUUID(), { titulo: 'ver-a4 caos nueva' }))),
        () => a4Rpc(T, 'get_simulation_panel', { p_propuesta_id: id2 }),
        () => a4Rpc(T, 'cancel_proposal', { p_propuesta_id: id2 }),
        () => a4Rpc(T, 'evaluate_and_publish', { p_propuesta_id: id1, p_intento_id: crypto.randomUUID() }),
        () => resetDemo(),
        ...otros.map((c) => () => a4Rpc(c, 'join_space', { p_codigo: demo.codigo, p_nombre_visible: 'cualquiera' })),
      ]
      const t0 = Date.now()
      const rs = await Promise.all(a4Mezclar(ops).map((f) => f()))
      const ms = Date.now() - t0
      const codigos: Record<string, number> = {}
      for (const r of rs) { const c = r?.ok ? 'ok' : `${r?.error?.codigo}/${r?.error?.detalle}`; codigos[c] = (codigos[c] ?? 0) + 1 }
      filas.push({ ronda, ops: rs.length, ms, codigos })
    }
    log('ráfaga mixta', filas)
    for (const f of filas) {
      expect(f.codigos['fallo_temporal/reintentar'] ?? 0).toBe(0)
      expect(Object.keys(f.codigos).some((c) => c.startsWith('transporte'))).toBe(false)
    }
  }, LARGO)

  it('[adversarial] ninguna respuesta de error filtra datos internos ni sale del sobre del contrato', () => {
    const malos = a4Errores.map((e) => ({ op: e.op, m: a4FormaError(e.r) })).filter((x) => x.m)
    const pares: Record<string, number> = {}
    for (const e of a4Errores) { const k = `${e.op}:${e.r?.error?.codigo}/${e.r?.error?.detalle}`; pares[k] = (pares[k] ?? 0) + 1 }
    log('errores observados', { total: a4Errores.length, pares, malos: malos.slice(0, 10), transporte: a4Transporte.slice(0, 10), sesiones: a4SesionesCreadas, inicio })
    expect(a4Transporte).toEqual([])
    expect(malos).toEqual([])
  })
})
