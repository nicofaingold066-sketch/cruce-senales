// Verificacion independiente del hallazgo A1 (cupo del imprescindible), contra la base viva.
// Escenarios derivados de docs/contrato-enmienda-2.md (A1 + aclaraciones) y docs/revision-codex-1/2.md.
import { beforeAll, describe, expect, it } from 'vitest'
import {
  type A1Espacio,
  type A1Sesion,
  a1Aceptar,
  a1Cupos,
  a1CrearEspacio,
  a1Err,
  a1Estado,
  a1Incoherencias,
  a1Ok,
  a1Propuesta,
  a1Rpc,
  a1SimAceptar,
  a1Uuid,
  A1_FRANJAS,
  A1_PLAZO,
} from './a1-helper'

let T: A1Sesion // organizador del espacio
let U: A1Sesion
let V: A1Sesion
let W: A1Sesion
let esp: A1Espacio
const SIMS = ['S1', 'S2', 'S3']

const log = (...a: unknown[]) => console.log('[A1]', ...a)

function coherente(p: any, ctx: string, impRet = false) {
  const inc = a1Incoherencias(p, impRet)
  if (inc.length) log(ctx, 'INCOHERENCIAS', inc)
  expect(inc, ctx).toEqual([])
}

beforeAll(async () => {
  const { a1Sesion } = await import('./a1-helper')
  T = await a1Sesion('Tano')
  U = await a1Sesion('Uma')
  V = await a1Sesion('Vito')
  W = await a1Sesion('Wally')
  esp = await a1CrearEspacio(T, [U, V, W], SIMS, 'cupo')
  log('espacio de prueba creado (nombre con prefijo ver-A1-)')
}, 60_000)

describe('A1 cupo del imprescindible (verificacion independiente)', () => {
  it('C1 [Codex] min2 max2, tres elegibles, anfitrion acepta ULTIMO', async () => {
    const pid = await a1Propuesta(T, esp, { minimo: 2, maximo: 2, imprescindible: 'Tano', reales: [T, U, V], sims: [], titulo: 'ver-A1 C1' })
    let p = await a1Estado(T, pid)
    log('C1 inicial', a1Cupos(p))
    expect(p.opcion.cupos.reservado_imprescindible).toBe(true)
    expect(p.opcion.cupos.libres_para_otros).toBe(1)
    coherente(p, 'C1 inicial')

    const ru = await a1Aceptar(U, pid)
    log('C1 U acepta ->', a1Err(ru))
    expect(ru.ok).toBe(true)
    expect(ru.contrato).toBe(2)
    p = ru.propuesta
    log('C1 tras U', a1Cupos(p))
    coherente(p, 'C1 tras U')
    expect(p.opcion.cupos.libres_para_otros).toBe(0)
    expect(p.opcion.cupos.reservado_imprescindible).toBe(true)

    // mi_situacion de V (no imprescindible) y de T (imprescindible)
    const pv = await a1Estado(V, pid)
    log('C1 V mi_situacion', { aceptar: pv.mi_situacion.puede.aceptar, motivo: pv.mi_situacion.motivo_aceptar })
    expect(pv.mi_situacion.puede.aceptar).toBe(false)
    expect(pv.mi_situacion.motivo_aceptar).toBe('cupo_reservado')
    expect(pv.mi_situacion.puede).not.toHaveProperty('motivo')
    const pt = await a1Estado(T, pid)
    log('C1 T mi_situacion', { aceptar: pt.mi_situacion.puede.aceptar, motivo: pt.mi_situacion.motivo_aceptar })
    expect(pt.mi_situacion.puede.aceptar).toBe(true)
    expect(pt.mi_situacion.motivo_aceptar ?? null).toBeNull()

    const rv = await a1Aceptar(V, pid)
    log('C1 V acepta ->', a1Err(rv), rv.error?.mensaje)
    expect(rv.ok).toBe(false)
    expect(rv.contrato).toBe(2)
    expect(rv.error.codigo).toBe('cupo_completo')
    expect(rv.error.detalle).toBe('reservado_imprescindible')
    p = await a1Estado(T, pid)
    expect(p.opcion.cupos.confirmados).toBe(1)
    coherente(p, 'C1 tras V rechazado')

    const rt = await a1Aceptar(T, pid)
    log('C1 T acepta ->', a1Err(rt), rt.resultado)
    expect(rt.ok).toBe(true)
    expect(rt.resultado.grupo_confirmado).toBe(true)
    p = rt.propuesta
    log('C1 final', a1Cupos(p))
    expect(p.estado).toBe('grupo_confirmado')
    expect(p.opcion.cupos.reservado_imprescindible).toBe(false)
    expect(p.opcion.cupos.libres_para_otros).toBe(0)
    coherente(p, 'C1 final')

    const rv2 = await a1Aceptar(V, pid)
    log('C1 V reintenta tras confirmacion ->', a1Err(rv2))
    expect(a1Err(rv2)).toBe('cupo_completo/sin_cupo')
    const ev = p.historial.filter((e: any) => e.tipo === 'aceptacion')
    expect(ev.length).toBe(2)
  }, 60_000)

  it('C2 max3 min2, cuatro elegibles, libres_para_otros paso a paso; anfitrion ultimo', async () => {
    const pid = await a1Propuesta(T, esp, { minimo: 2, maximo: 3, imprescindible: 'Tano', reales: [T, U, V, W], sims: [], titulo: 'ver-A1 C2' })
    const pasos: any[] = []
    let p = await a1Estado(U, pid)
    pasos.push(['inicio', a1Cupos(p)])
    expect(p.opcion.cupos.libres_para_otros).toBe(2)
    coherente(p, 'C2 inicio')
    const ru = await a1Aceptar(U, pid)
    expect(ru.ok).toBe(true)
    pasos.push(['U', a1Cupos(ru.propuesta)])
    expect(ru.propuesta.opcion.cupos.libres_para_otros).toBe(1)
    coherente(ru.propuesta, 'C2 U')
    const rv = await a1Aceptar(V, pid)
    expect(rv.ok).toBe(true)
    // min 2 alcanzado pero sin anfitrion: no debe confirmar
    expect(rv.propuesta.estado).toBe('esperando_compromisos')
    expect(rv.resultado.grupo_confirmado).toBe(false)
    pasos.push(['V', a1Cupos(rv.propuesta)])
    expect(rv.propuesta.opcion.cupos.libres_para_otros).toBe(0)
    coherente(rv.propuesta, 'C2 V')
    const pw = await a1Estado(W, pid)
    expect(pw.mi_situacion.puede.aceptar).toBe(false)
    expect(pw.mi_situacion.motivo_aceptar).toBe('cupo_reservado')
    const intentoW = a1Uuid()
    const rw = await a1Aceptar(W, pid, 1, intentoW)
    pasos.push(['W', a1Err(rw)])
    expect(a1Err(rw)).toBe('cupo_completo/reservado_imprescindible')
    const rt = await a1Aceptar(T, pid)
    expect(rt.ok).toBe(true)
    expect(rt.propuesta.estado).toBe('grupo_confirmado')
    pasos.push(['T', a1Cupos(rt.propuesta)])
    coherente(rt.propuesta, 'C2 T')
    // W reintenta con el MISMO intento: el error no se guardo, re-ejecuta y ahora es sin_cupo
    const rw2 = await a1Aceptar(W, pid, 1, intentoW)
    pasos.push(['W reintento mismo intento', a1Err(rw2)])
    expect(a1Err(rw2)).toBe('cupo_completo/sin_cupo')
    // Baja de U con acuerdo conservado (3-1=2 >= min, anfitrion sigue): se libera un cupo
    const wd = a1Ok(await a1Rpc(U, 'withdraw_commitment', { p_propuesta_id: pid }), 'U withdraw')
    pasos.push(['U se baja', wd.resultado.efecto, a1Cupos(wd.propuesta)])
    expect(wd.resultado.efecto).toBe('acuerdo_conservado')
    coherente(wd.propuesta, 'C2 tras baja U')
    expect(wd.propuesta.opcion.cupos.libres_para_otros).toBe(1)
    const rw3 = await a1Aceptar(W, pid, 1, intentoW)
    pasos.push(['W reintento mismo intento tras baja', a1Err(rw3), rw3.resultado])
    expect(rw3.ok).toBe(true)
    coherente(rw3.propuesta, 'C2 final')
    expect(rw3.propuesta.opcion.cupos.confirmados).toBe(3)
    log('C2 pasos', JSON.stringify(pasos))
  }, 60_000)

  it('C3 max4 min3, seis elegibles, 5 invitados concurrentes (Promise.all) y anfitrion despues', async () => {
    const pid = await a1Propuesta(T, esp, {
      minimo: 3,
      maximo: 4,
      imprescindible: 'Tano',
      reales: [T, U, V, W],
      sims: ['S1', 'S2'],
      titulo: 'ver-A1 C3',
    })
    const rs = await Promise.all([
      a1Aceptar(U, pid),
      a1Aceptar(V, pid),
      a1Aceptar(W, pid),
      a1SimAceptar(T, pid, esp.miembros['S1']),
      a1SimAceptar(T, pid, esp.miembros['S2']),
    ])
    const res = rs.map(a1Err)
    log('C3 resultados concurrentes', res)
    expect(res.filter((x) => x === 'ok').length).toBe(3)
    expect(res.filter((x) => x === 'cupo_completo/reservado_imprescindible').length).toBe(2)
    let p = await a1Estado(T, pid)
    log('C3 tras concurrencia', a1Cupos(p))
    expect(p.estado).toBe('esperando_compromisos')
    expect(p.opcion.cupos.confirmados).toBe(3)
    expect(p.opcion.cupos.libres_para_otros).toBe(0)
    coherente(p, 'C3 tras concurrencia')
    // panel de simulacion: el simulado rechazado debe ver motivo cupo_reservado
    const panel = a1Ok(await a1Rpc(T, 'get_simulation_panel', { p_propuesta_id: pid }), 'panel')
    const sinAceptar = panel.simulacion.miembros.filter((m: any) => ['S1', 'S2'].includes(m.miembro.nombre) && !m.acepte_version)
    log('C3 panel simulados sin aceptar', sinAceptar.map((m: any) => ({ n: m.miembro.nombre, aceptar: m.puede.aceptar, motivo: m.motivo_aceptar })))
    for (const m of sinAceptar) {
      expect(m.puede.aceptar).toBe(false)
      expect(m.motivo_aceptar).toBe('cupo_reservado')
    }
    const rt = await a1Aceptar(T, pid)
    log('C3 T acepta ->', a1Err(rt))
    expect(rt.ok).toBe(true)
    p = rt.propuesta
    expect(p.estado).toBe('grupo_confirmado')
    expect(p.opcion.cupos.confirmados).toBe(4)
    coherente(p, 'C3 final')
  }, 60_000)

  it('C4 max2 min2, anfitrion + 3 invitados concurrentes, 3 rondas: anfitrion nunca recibe cupo_completo', async () => {
    for (let ronda = 1; ronda <= 3; ronda++) {
      const pid = await a1Propuesta(T, esp, {
        minimo: 2,
        maximo: 2,
        imprescindible: 'Tano',
        reales: [T, U, V, W],
        sims: [],
        titulo: `ver-A1 C4 r${ronda}`,
      })
      // orden de envio rotado por ronda
      const quienes = [
        ['T', () => a1Aceptar(T, pid)],
        ['U', () => a1Aceptar(U, pid)],
        ['V', () => a1Aceptar(V, pid)],
        ['W', () => a1Aceptar(W, pid)],
      ] as const
      const orden = [...quienes.slice(ronda % 4), ...quienes.slice(0, ronda % 4)]
      const rs = await Promise.all(orden.map(([, f]) => f()))
      const res = Object.fromEntries(orden.map(([n], i) => [n, a1Err(rs[i])]))
      const p = await a1Estado(T, pid)
      log(`C4 ronda ${ronda} orden ${orden.map(([n]) => n).join('')}`, res, a1Cupos(p))
      expect(res['T']).toBe('ok')
      const otrosOk = ['U', 'V', 'W'].filter((n) => res[n] === 'ok')
      expect(otrosOk.length).toBe(1)
      for (const n of ['U', 'V', 'W'].filter((n) => res[n] !== 'ok')) {
        expect(['cupo_completo/reservado_imprescindible', 'cupo_completo/sin_cupo']).toContain(res[n])
      }
      expect(p.estado).toBe('grupo_confirmado')
      expect(p.opcion.cupos.confirmados).toBe(2)
      coherente(p, `C4 r${ronda}`)
    }
  }, 120_000)

  it('C5 anfitrion acepta PRIMERO: reserva consumida, el siguiente invitado entra y el otro recibe sin_cupo', async () => {
    const pid = await a1Propuesta(T, esp, { minimo: 2, maximo: 2, imprescindible: 'Tano', reales: [T, U, V], sims: [], titulo: 'ver-A1 C5' })
    const rt = await a1Aceptar(T, pid)
    expect(rt.ok).toBe(true)
    log('C5 tras T', a1Cupos(rt.propuesta))
    expect(rt.propuesta.opcion.cupos.reservado_imprescindible).toBe(false)
    expect(rt.propuesta.opcion.cupos.libres_para_otros).toBe(1)
    coherente(rt.propuesta, 'C5 T')
    const pv = await a1Estado(V, pid)
    expect(pv.mi_situacion.puede.aceptar).toBe(true)
    expect(pv.mi_situacion.motivo_aceptar ?? null).toBeNull()
    const ru = await a1Aceptar(U, pid)
    expect(ru.ok).toBe(true)
    expect(ru.propuesta.estado).toBe('grupo_confirmado')
    const rv = await a1Aceptar(V, pid)
    log('C5 V ->', a1Err(rv))
    expect(a1Err(rv)).toBe('cupo_completo/sin_cupo')
    const pv2 = await a1Estado(V, pid)
    expect(pv2.mi_situacion.puede.aceptar).toBe(false)
    expect(pv2.mi_situacion.motivo_aceptar ?? null).toBeNull()
    coherente(pv2, 'C5 final')
  }, 60_000)

  it('C6 anfitrion se retira ANTES de confirmar: reserva desaparece y pasa a en_revision', async () => {
    const pid = await a1Propuesta(T, esp, { minimo: 2, maximo: 3, imprescindible: 'Tano', reales: [T, U, V, W], sims: [], titulo: 'ver-A1 C6' })
    a1Ok(await a1Aceptar(U, pid), 'U')
    a1Ok(await a1Aceptar(V, pid), 'V')
    const wd = a1Ok(await a1Rpc(T, 'withdraw_commitment', { p_propuesta_id: pid }), 'T withdraw')
    const p = wd.propuesta
    log('C6 T se retira ->', wd.resultado.efecto, a1Cupos(p))
    expect(wd.resultado.efecto).toBe('pasa_a_revision')
    expect(p.estado).toBe('en_revision')
    expect(p.opcion.cupos.reservado_imprescindible).toBe(false)
    expect(p.opcion.cupos.libres_para_otros).toBe(1)
    coherente(p, 'C6', true)
    const rw = await a1Aceptar(W, pid)
    log('C6 W acepta en revision ->', a1Err(rw))
    expect(a1Err(rw)).toBe('opcion_desactualizada/estado_no_admite')
    const pw = await a1Estado(W, pid)
    expect(pw.mi_situacion.puede.aceptar).toBe(false)
    expect(pw.mi_situacion.motivo_aceptar ?? null).toBeNull()
  }, 60_000)

  it('C7 anfitrion se retira DESPUES de confirmar: en_revision, reserva no reaparece', async () => {
    const pid = await a1Propuesta(T, esp, { minimo: 2, maximo: 3, imprescindible: 'Tano', reales: [T, U, V, W], sims: [], titulo: 'ver-A1 C7' })
    a1Ok(await a1Aceptar(U, pid), 'U')
    const rt = a1Ok(await a1Aceptar(T, pid), 'T')
    expect(rt.propuesta.estado).toBe('grupo_confirmado')
    const wd = a1Ok(await a1Rpc(T, 'withdraw_commitment', { p_propuesta_id: pid }), 'T withdraw')
    const p = wd.propuesta
    log('C7 T se retira tras confirmar ->', wd.resultado.efecto, a1Cupos(p))
    expect(wd.resultado.efecto).toBe('pasa_a_revision')
    expect(p.estado).toBe('en_revision')
    expect(p.opcion.cupos.reservado_imprescindible).toBe(false)
    expect(p.opcion.cupos.imprescindible_acepto).toBe(false)
    expect(p.opcion.cupos.confirmados).toBe(1)
    expect(p.opcion.cupos.libres_para_otros).toBe(2)
    coherente(p, 'C7', true)
    expect(a1Err(await a1Aceptar(V, pid))).toBe('opcion_desactualizada/estado_no_admite')
  }, 60_000)

  it('C8 reintentos con el mismo intento_id: doble envio concurrente del anfitrion y del invitado', async () => {
    const pid = await a1Propuesta(T, esp, { minimo: 2, maximo: 2, imprescindible: 'Tano', reales: [T, U, V], sims: [], titulo: 'ver-A1 C8' })
    const iu = a1Uuid()
    const [u1, u2] = await Promise.all([a1Aceptar(U, pid, 1, iu), a1Aceptar(U, pid, 1, iu)])
    log('C8 U doble mismo intento ->', a1Err(u1), u1.resultado, a1Err(u2), u2.resultado)
    expect(u1.ok && u2.ok).toBe(true)
    expect([u1.resultado.repetido, u2.resultado.repetido].sort()).toEqual([false, true])
    // V con mismo intento dos veces (concurrente) -> ambas reservado, nada ocupado
    const iv = a1Uuid()
    const [v1, v2] = await Promise.all([a1Aceptar(V, pid, 1, iv), a1Aceptar(V, pid, 1, iv)])
    log('C8 V doble mismo intento ->', a1Err(v1), a1Err(v2))
    expect(a1Err(v1)).toBe('cupo_completo/reservado_imprescindible')
    expect(a1Err(v2)).toBe('cupo_completo/reservado_imprescindible')
    let p = await a1Estado(T, pid)
    expect(p.opcion.cupos.confirmados).toBe(1)
    coherente(p, 'C8 medio')
    // U reintenta su intento ya exitoso: repetido, no cambia nada
    const u3 = await a1Aceptar(U, pid, 1, iu)
    expect(u3.ok).toBe(true)
    expect(u3.resultado.repetido).toBe(true)
    expect(u3.propuesta.opcion.cupos.confirmados).toBe(1)
    // Anfitrion: doble envio concurrente del mismo intento + V con intento nuevo en paralelo
    const it_ = a1Uuid()
    const [t1, v3, t2] = await Promise.all([a1Aceptar(T, pid, 1, it_), a1Aceptar(V, pid), a1Aceptar(T, pid, 1, it_)])
    log('C8 T doble + V ->', a1Err(t1), t1.resultado, a1Err(t2), a1Err(v3), t2.resultado)
    expect(t1.ok && t2.ok ? 'ok' : 'falla').toBe('ok')
    expect([t1.resultado.repetido, t2.resultado.repetido].sort()).toEqual([false, true])
    expect(['cupo_completo/reservado_imprescindible', 'cupo_completo/sin_cupo']).toContain(a1Err(v3))
    p = await a1Estado(T, pid)
    log('C8 final', a1Cupos(p))
    expect(p.estado).toBe('grupo_confirmado')
    expect(p.opcion.cupos.confirmados).toBe(2)
    expect(p.historial.filter((e: any) => e.tipo === 'aceptacion').length).toBe(2)
    coherente(p, 'C8 final')
  }, 60_000)

  it('C9 imprescindible que NO es organizador (Uma) y el organizador compite como invitado', async () => {
    const pid = await a1Propuesta(T, esp, { minimo: 2, maximo: 2, imprescindible: 'Uma', reales: [T, U, V], sims: [], titulo: 'ver-A1 C9' })
    const rt = await a1Aceptar(T, pid)
    expect(rt.ok).toBe(true)
    const rv = await a1Aceptar(V, pid)
    log('C9 T ok, V ->', a1Err(rv))
    expect(a1Err(rv)).toBe('cupo_completo/reservado_imprescindible')
    const pt = await a1Estado(T, pid)
    expect(pt.mi_situacion.puede.aceptar).toBe(false) // ya acepto
    const pv = await a1Estado(V, pid)
    expect(pv.mi_situacion.motivo_aceptar).toBe('cupo_reservado')
    const pu = await a1Estado(U, pid)
    expect(pu.mi_situacion.puede.aceptar).toBe(true)
    const ru = await a1Aceptar(U, pid)
    log('C9 U (imprescindible) ->', a1Err(ru))
    expect(ru.ok).toBe(true)
    expect(ru.propuesta.estado).toBe('grupo_confirmado')
    coherente(ru.propuesta, 'C9 final')
  }, 60_000)

  it('C10 imprescindible SIMULADO (S3), aceptaciones via simulate_accept concurrentes con reales', async () => {
    const pid = await a1Propuesta(T, esp, { minimo: 2, maximo: 2, imprescindible: 'S3', reales: [U, V], sims: ['S1', 'S3'], titulo: 'ver-A1 C10' })
    const rs = await Promise.all([a1Aceptar(U, pid), a1Aceptar(V, pid), a1SimAceptar(T, pid, esp.miembros['S1'])])
    const res = rs.map(a1Err)
    log('C10 U,V,S1 concurrentes ->', res)
    expect(res.filter((x) => x === 'ok').length).toBe(1)
    expect(res.filter((x) => x === 'cupo_completo/reservado_imprescindible').length).toBe(2)
    const r3 = await a1SimAceptar(T, pid, esp.miembros['S3'])
    log('C10 S3 (imprescindible simulado) ->', a1Err(r3))
    expect(r3.ok).toBe(true)
    expect(r3.propuesta.estado).toBe('grupo_confirmado')
    coherente(r3.propuesta, 'C10 final')
  }, 60_000)

  it('C12 list_proposals.puede_aceptar coincide con la reserva; baja de invitado libera cupo reservado-aware', async () => {
    const pid = await a1Propuesta(T, esp, { minimo: 2, maximo: 3, imprescindible: 'Tano', reales: [T, U, V, W], sims: [], titulo: 'ver-A1 C12' })
    a1Ok(await a1Aceptar(U, pid), 'U')
    a1Ok(await a1Aceptar(V, pid), 'V')
    const lw = a1Ok(await a1Rpc(W, 'list_proposals', { p_espacio_id: esp.espacioId }), 'list W').propuestas.find((x: any) => x.id === pid)
    const lt = a1Ok(await a1Rpc(T, 'list_proposals', { p_espacio_id: esp.espacioId }), 'list T').propuestas.find((x: any) => x.id === pid)
    log('C12 list puede_aceptar W/T', lw.mi_situacion.puede_aceptar, lt.mi_situacion.puede_aceptar)
    expect(lw.mi_situacion.puede_aceptar).toBe(false)
    expect(lt.mi_situacion.puede_aceptar).toBe(true)
    // V se baja en esperando_compromisos (potencial 3 >= min 2): sigue esperando, libres sube a 1
    const wd = a1Ok(await a1Rpc(V, 'withdraw_commitment', { p_propuesta_id: pid }), 'V withdraw')
    log('C12 V se baja ->', wd.resultado.efecto, a1Cupos(wd.propuesta))
    expect(wd.propuesta.estado).toBe('esperando_compromisos')
    expect(wd.propuesta.opcion.cupos.libres_para_otros).toBe(1)
    expect(wd.propuesta.opcion.cupos.reservado_imprescindible).toBe(true)
    coherente(wd.propuesta, 'C12 tras baja V')
    const pw = await a1Estado(W, pid)
    expect(pw.mi_situacion.puede.aceptar).toBe(true)
    const rw = await a1Aceptar(W, pid)
    expect(rw.ok).toBe(true)
    coherente(rw.propuesta, 'C12 W')
    const rt = await a1Aceptar(T, pid)
    expect(rt.propuesta.estado).toBe('grupo_confirmado')
    coherente(rt.propuesta, 'C12 final')
  }, 60_000)

  it('C13 rafaga: max3, seis elegibles, TODOS (anfitrion incluido) aceptan a la vez dos veces cada uno', async () => {
    const pid = await a1Propuesta(T, esp, {
      minimo: 3,
      maximo: 3,
      imprescindible: 'Tano',
      reales: [T, U, V, W],
      sims: ['S1', 'S2'],
      titulo: 'ver-A1 C13',
    })
    const tareas: Array<[string, () => Promise<any>]> = []
    for (let k = 0; k < 2; k++) {
      tareas.push(['T', () => a1Aceptar(T, pid)])
      tareas.push(['U', () => a1Aceptar(U, pid)])
      tareas.push(['V', () => a1Aceptar(V, pid)])
      tareas.push(['W', () => a1Aceptar(W, pid)])
      tareas.push(['S1', () => a1SimAceptar(T, pid, esp.miembros['S1'])])
      tareas.push(['S2', () => a1SimAceptar(T, pid, esp.miembros['S2'])])
    }
    const rs = await Promise.all(tareas.map(([, f]) => f()))
    const res = tareas.map(([n], i) => `${n}:${a1Err(rs[i])}${rs[i].ok ? (rs[i].resultado.repetido ? '(rep)' : '(nuevo)') : ''}`)
    log('C13', res.join(' '))
    const tRes = rs.filter((_, i) => tareas[i][0] === 'T')
    expect(tRes.every((r) => r.ok)).toBe(true)
    expect(rs.some((r) => !r.ok && r.error.codigo === 'fallo_temporal')).toBe(false)
    const p = await a1Estado(T, pid)
    log('C13 final', a1Cupos(p))
    expect(p.estado).toBe('grupo_confirmado')
    expect(p.opcion.cupos.confirmados).toBe(3)
    expect(p.historial.filter((e: any) => e.tipo === 'aceptacion').length).toBe(3)
    coherente(p, 'C13 final')
  }, 60_000)

  it('C11 create_proposal valida minimo>=2, maximo>=2, minimo<=maximo (y maximo<=20)', async () => {
    const casos: Array<[number, number, string]> = [
      [1, 2, 'cupos_invalidos'],
      [2, 1, 'cupos_invalidos'],
      [1, 1, 'cupos_invalidos'],
      [3, 2, 'cupos_invalidos'],
      [0, 0, 'cupos_invalidos'],
      [-1, 5, 'cupos_invalidos'],
      [2, 21, 'cupos_invalidos'],
      [2, 2, 'ok'],
    ]
    const obs: string[] = []
    for (const [mi, ma, esperado] of casos) {
      const r = await a1Rpc(T, 'create_proposal', {
        p_espacio_id: esp.espacioId,
        p_titulo: `ver-A1 C11 ${mi}-${ma}`,
        p_franjas: A1_FRANJAS,
        p_minimo: mi,
        p_maximo: ma,
        p_imprescindible_id: esp.miembros['Tano'],
        p_plazo: A1_PLAZO,
        p_zona_horaria: 'America/Santiago',
        p_intento_id: a1Uuid(),
      })
      const got = r.ok ? 'ok' : r.error.detalle
      obs.push(`${mi}/${ma}->${r.ok ? 'ok' : r.error.codigo + '/' + r.error.detalle}`)
      expect(got, `min ${mi} max ${ma}`).toBe(esperado)
      if (!r.ok) expect(r.error.codigo).toBe('entrada_incompleta')
    }
    log('C11', obs.join(' | '))
  }, 60_000)
})
