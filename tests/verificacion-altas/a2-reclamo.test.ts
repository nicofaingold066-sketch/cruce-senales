// Verificacion independiente del hallazgo A2 (reclamo de asiento simulado) contra la base viva.
// Escenarios derivados de docs/contrato-enmienda-2.md (A2) y docs/revision-codex-2.md.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  a2Sesion, a2Rpc, a2Cod, a2Esperar, a2Nombre, a2Organizador, a2Simulado, a2Propuesta, a2Uuid, a2Dormir,
  a2SesionesCreadas, type A2Org, type Env,
} from './a2-helper'

const T = 120_000
let org: A2Org
let intruso: SupabaseClient // sesion que solo recibe rechazos: se reutiliza
const MSG_EN_USO = 'Ese asiento ya tiene actividad simulada. Únete con otro nombre visible.'

async function join(c: SupabaseClient, nombre: string) {
  return a2Rpc(c, 'join_space', { p_codigo: org.codigo, p_nombre_visible: nombre })
}
async function miembroEnEspacio(id: string) {
  const r = a2Esperar(await a2Rpc(org.c, 'get_space', { p_espacio_id: org.espacioId }), 'get_space')
  return (r.espacio.miembros as any[]).find((m) => m.miembro_id === id)
}
async function intrusoNoEsMiembro() {
  const r = a2Esperar(await a2Rpc(intruso, 'list_my_spaces'), 'list_my_spaces')
  return !(r.espacios as any[]).some((e) => e.id === org.espacioId)
}
async function publicar(pid: string) {
  return a2Esperar(await a2Rpc(org.c, 'evaluate_and_publish', { p_propuesta_id: pid, p_intento_id: a2Uuid() }), 'evaluate_and_publish')
}
const SI = { A: 'si', B: 'si' }

beforeAll(async () => {
  org = await a2Organizador()
  intruso = await a2Sesion()
}, T)
afterAll(() => {
  console.log(`[A2] sesiones anonimas creadas: ${a2SesionesCreadas}; espacio demo propio ${org?.espacioId}`)
})

describe('A2 reclamos tardios (Codex)', () => {
  it('tras simulate_save_conditions sin publicar: asiento_en_uso y el asiento sigue simulado', async () => {
    const pid = await a2Propuesta(org, 'ver-A2 tardio condiciones')
    const nom = a2Nombre('cond')
    const sim = await a2Simulado(org, nom)
    a2Esperar(await a2Rpc(org.c, 'simulate_save_conditions', { p_propuesta_id: pid, p_miembro_id: sim, p_disponibilidad: { A: 'si' } }), 'sim save')
    const r = await join(intruso, nom)
    console.log('[A2 tardio cond] join ->', a2Cod(r), r.error?.mensaje, 'contrato', r.contrato)
    expect(a2Cod(r)).toBe('asiento_en_uso/asiento_en_uso')
    expect(r.error?.mensaje).toBe(MSG_EN_USO)
    expect(r.contrato).toBe(2)
    expect((await miembroEnEspacio(sim)).simulado).toBe(true)
    expect(await intrusoNoEsMiembro()).toBe(true)
  }, T)

  it('tras opcion publicada (elegible, sin aceptar): asiento_en_uso', async () => {
    const pid = await a2Propuesta(org, 'ver-A2 tardio publicada')
    const nom = a2Nombre('pub')
    const sim = await a2Simulado(org, nom)
    a2Esperar(await a2Rpc(org.c, 'save_my_conditions', { p_propuesta_id: pid, p_disponibilidad: SI }), 'org save')
    a2Esperar(await a2Rpc(org.c, 'simulate_save_conditions', { p_propuesta_id: pid, p_miembro_id: sim, p_disponibilidad: SI }), 'sim save')
    const pub = await publicar(pid)
    expect(pub.propuesta.opcion?.version).toBe(1)
    const r = await join(intruso, nom)
    console.log('[A2 tardio publicada] join ->', a2Cod(r))
    expect(a2Cod(r)).toBe('asiento_en_uso/asiento_en_uso')
    expect((await miembroEnEspacio(sim)).simulado).toBe(true)
  }, T)

  it('tras simulate_accept: asiento_en_uso y el historial conserva actor_tipo simulacion', async () => {
    const pid = await a2Propuesta(org, 'ver-A2 tardio aceptacion')
    const nom = a2Nombre('acc')
    const sim = await a2Simulado(org, nom)
    a2Esperar(await a2Rpc(org.c, 'save_my_conditions', { p_propuesta_id: pid, p_disponibilidad: SI }), 'org save')
    a2Esperar(await a2Rpc(org.c, 'simulate_save_conditions', { p_propuesta_id: pid, p_miembro_id: sim, p_disponibilidad: SI }), 'sim save')
    await publicar(pid)
    a2Esperar(await a2Rpc(org.c, 'simulate_accept', { p_propuesta_id: pid, p_miembro_id: sim, p_version: 1, p_intento_id: a2Uuid() }), 'sim accept')
    const r = await join(intruso, nom)
    console.log('[A2 tardio aceptacion] join ->', a2Cod(r))
    expect(a2Cod(r)).toBe('asiento_en_uso/asiento_en_uso')
    const st = a2Esperar(await a2Rpc(org.c, 'get_proposal_state', { p_propuesta_id: pid }), 'state')
    const ev = (st.propuesta.historial as any[]).filter((e) => e.actor?.miembro_id === sim)
    console.log('[A2 historial] eventos del simulado:', JSON.stringify(ev.map((e) => ({ tipo: e.tipo, actor_tipo: e.actor_tipo, sim: e.actor.simulado, por: e.ejecutado_por?.miembro_id === org.miMiembroId }))))
    expect(ev.length).toBeGreaterThan(0)
    for (const e of ev) {
      expect(e.actor_tipo).toBe('simulacion')
      expect(e.actor.simulado).toBe(true)
      expect(e.ejecutado_por?.miembro_id).toBe(org.miMiembroId)
    }
  }, T)

  it('tras aceptar y retirarse (simulate_withdraw): asiento_en_uso; baja conserva simulacion', async () => {
    const pid = await a2Propuesta(org, 'ver-A2 tardio retiro')
    const nom = a2Nombre('ret')
    const sim = await a2Simulado(org, nom)
    a2Esperar(await a2Rpc(org.c, 'save_my_conditions', { p_propuesta_id: pid, p_disponibilidad: SI }), 'org save')
    a2Esperar(await a2Rpc(org.c, 'simulate_save_conditions', { p_propuesta_id: pid, p_miembro_id: sim, p_disponibilidad: SI }), 'sim save')
    await publicar(pid)
    a2Esperar(await a2Rpc(org.c, 'simulate_accept', { p_propuesta_id: pid, p_miembro_id: sim, p_version: 1, p_intento_id: a2Uuid() }), 'sim accept')
    a2Esperar(await a2Rpc(org.c, 'simulate_withdraw', { p_propuesta_id: pid, p_miembro_id: sim }), 'sim withdraw')
    const r = await join(intruso, nom)
    console.log('[A2 tardio retiro] join ->', a2Cod(r))
    expect(a2Cod(r)).toBe('asiento_en_uso/asiento_en_uso')
    const st = a2Esperar(await a2Rpc(org.c, 'get_proposal_state', { p_propuesta_id: pid }), 'state')
    const tipos = (st.propuesta.historial as any[]).filter((e) => e.actor?.miembro_id === sim).map((e) => `${e.tipo}:${e.actor_tipo}`)
    console.log('[A2 historial retiro]', tipos.join(','))
    expect(tipos).toEqual(['aceptacion:simulacion', 'baja:simulacion'])
  }, T)

  it('entrar con otro nombre sobre asiento usado: miembro real nuevo sin heredar nada', async () => {
    const pid = await a2Propuesta(org, 'ver-A2 otro nombre')
    const nom = a2Nombre('usado')
    const sim = await a2Simulado(org, nom)
    a2Esperar(await a2Rpc(org.c, 'save_my_conditions', { p_propuesta_id: pid, p_disponibilidad: SI }), 'org save')
    a2Esperar(await a2Rpc(org.c, 'simulate_mark_interest', { p_propuesta_id: pid, p_miembro_id: sim, p_interesado: true }), 'sim interes')
    a2Esperar(await a2Rpc(org.c, 'simulate_save_conditions', { p_propuesta_id: pid, p_miembro_id: sim, p_disponibilidad: SI }), 'sim save')
    await publicar(pid)
    a2Esperar(await a2Rpc(org.c, 'simulate_accept', { p_propuesta_id: pid, p_miembro_id: sim, p_version: 1, p_intento_id: a2Uuid() }), 'sim accept')
    const nueva = await a2Sesion()
    expect(a2Cod(await join(nueva, nom))).toBe('asiento_en_uso/asiento_en_uso')
    const r = a2Esperar(await join(nueva, a2Nombre('nuevo')), 'join otro nombre')
    expect(r.resultado.reclamo_asiento_simulado).toBe(false)
    expect(r.resultado.miembro_id).not.toBe(sim)
    const cond = a2Esperar(await a2Rpc(nueva, 'get_my_conditions', { p_propuesta_id: pid }), 'get_my_conditions')
    const st = a2Esperar(await a2Rpc(nueva, 'get_proposal_state', { p_propuesta_id: pid }), 'state')
    const ms = st.propuesta.mi_situacion
    console.log('[A2 otro nombre] cond', cond.condiciones?.estado, 'mi_situacion', JSON.stringify({ i: ms.interesado, c: ms.condiciones, e: ms.elegible_en_version, a: ms.acepte_version, r: ms.retirado }))
    expect(cond.condiciones.estado).toBe('sin_cargar')
    expect(ms.interesado).toBe(false)
    expect(ms.condiciones).toBe('sin_cargar')
    expect(ms.elegible_en_version).toBe(false)
    expect(ms.acepte_version).toBe(false)
    expect((await miembroEnEspacio(sim)).simulado).toBe(true)
  }, T)
})

describe('A2 reclamante legitimo y terceros (Codex)', () => {
  it('asiento limpio: reclamo ok, conserva miembro_id, nada heredado, organizador ya no puede simularlo; tercero rechazado', async () => {
    const pid = await a2Propuesta(org, 'ver-A2 legitimo')
    const nom = a2Nombre('limpio')
    const sim = await a2Simulado(org, nom)
    const legit = await a2Sesion()
    const r = a2Esperar(await join(legit, nom.toUpperCase()), 'join legitimo')
    console.log('[A2 legitimo] join ->', JSON.stringify(r.resultado))
    expect(r.resultado.reclamo_asiento_simulado).toBe(true)
    expect(r.resultado.miembro_id).toBe(sim)
    expect((await miembroEnEspacio(sim)).simulado).toBe(false)
    const cond = a2Esperar(await a2Rpc(legit, 'get_my_conditions', { p_propuesta_id: pid }), 'cond')
    expect(cond.condiciones.estado).toBe('sin_cargar')
    // repetir join del legitimo
    const rep = a2Esperar(await join(legit, nom), 'join repetido')
    expect(rep.resultado.ya_era_miembro).toBe(true)
    // organizador ya no puede simularlo
    const s = await a2Rpc(org.c, 'simulate_save_conditions', { p_propuesta_id: pid, p_miembro_id: sim, p_disponibilidad: SI })
    console.log('[A2 legitimo] simulate tras reclamo ->', a2Cod(s))
    expect(a2Cod(s)).toBe('no_autorizado/miembro_no_simulado')
    const panel = a2Esperar(await a2Rpc(org.c, 'get_simulation_panel', { p_propuesta_id: pid }), 'panel')
    expect((panel.simulacion.miembros as any[]).some((m) => m.miembro.miembro_id === sim)).toBe(false)
    // tercero intenta reclamar el asiento ya reclamado (mismo nombre y variante)
    const t1 = await join(intruso, nom)
    const t2 = await join(intruso, `  ${nom.toUpperCase()}  `)
    console.log('[A2 tercero] ->', a2Cod(t1), a2Cod(t2))
    expect(a2Cod(t1)).toBe('entrada_incompleta/nombre_en_uso')
    expect(a2Cod(t2)).toBe('entrada_incompleta/nombre_en_uso')
    expect(await intrusoNoEsMiembro()).toBe(true)
  }, T)
})

describe('A2 carreras (Codex)', () => {
  it('join vs simulate_save_conditions x10 (asiento limpio): nunca ambos ok, nunca real con condiciones', async () => {
    const pid = await a2Propuesta(org, 'ver-A2 carrera condiciones')
    const N = 10
    const sesiones = await Promise.all(Array.from({ length: N }, () => a2Sesion()))
    const res: string[] = []
    let ganaJoin = 0, ganaSim = 0
    for (let i = 0; i < N; i++) {
      const nom = a2Nombre('rc')
      const sim = await a2Simulado(org, nom)
      const d = (i % 3) * 15
      const [j, s] = await Promise.all([
        (async () => { if (i % 2) await a2Dormir(d); return join(sesiones[i], nom) })(),
        (async () => { if (!(i % 2)) await a2Dormir(d); return a2Rpc(org.c, 'simulate_save_conditions', { p_propuesta_id: pid, p_miembro_id: sim, p_disponibilidad: SI }) })(),
      ])
      let condReal = '-'
      if (j.ok && j.resultado.reclamo_asiento_simulado) {
        ganaJoin++
        condReal = (await a2Rpc(sesiones[i], 'get_my_conditions', { p_propuesta_id: pid })).condiciones?.estado
        expect(a2Cod(s)).toBe('no_autorizado/miembro_no_simulado')
        expect(condReal).toBe('sin_cargar')
      } else {
        ganaSim++
        expect(s.ok).toBe(true)
        expect(a2Cod(j)).toBe('asiento_en_uso/asiento_en_uso')
        expect((await miembroEnEspacio(sim)).simulado).toBe(true)
      }
      res.push(`#${i} join=${a2Cod(j)} sim=${a2Cod(s)} condReal=${condReal}`)
    }
    console.log('[A2 carrera cond]\n' + res.join('\n') + `\n gana join=${ganaJoin} gana sim=${ganaSim}`)
  }, T)

  it('join vs simulate_accept x5 (asiento elegible): reclamo siempre asiento_en_uso, sin real con aceptacion', async () => {
    const pid = await a2Propuesta(org, 'ver-A2 carrera aceptacion')
    a2Esperar(await a2Rpc(org.c, 'save_my_conditions', { p_propuesta_id: pid, p_disponibilidad: SI }), 'org save')
    const N = 5
    const sims: { nom: string; id: string }[] = []
    for (let i = 0; i < N; i++) {
      const nom = a2Nombre('ra')
      const id = await a2Simulado(org, nom)
      a2Esperar(await a2Rpc(org.c, 'simulate_save_conditions', { p_propuesta_id: pid, p_miembro_id: id, p_disponibilidad: SI }), 'sim save')
      sims.push({ nom, id })
    }
    await publicar(pid)
    const sesiones = await Promise.all(Array.from({ length: N }, () => a2Sesion()))
    const res: string[] = []
    for (let i = 0; i < N; i++) {
      const [j, s] = await Promise.all([
        join(sesiones[i], sims[i].nom),
        a2Rpc(org.c, 'simulate_accept', { p_propuesta_id: pid, p_miembro_id: sims[i].id, p_version: 1, p_intento_id: a2Uuid() }),
      ])
      res.push(`#${i} join=${a2Cod(j)} accept=${a2Cod(s)}`)
      expect(a2Cod(j)).toBe('asiento_en_uso/asiento_en_uso')
      expect((await miembroEnEspacio(sims[i].id)).simulado).toBe(true)
    }
    console.log('[A2 carrera accept]\n' + res.join('\n'))
  }, T)
})

describe('A2 variantes adversariales propias', () => {
  it('nombre con mayusculas/espacios sobre asiento usado: asiento_en_uso; con tabulador no hereda nada', async () => {
    const pid = await a2Propuesta(org, 'ver-A2 variante nombre')
    const nom = a2Nombre('var')
    const sim = await a2Simulado(org, nom)
    a2Esperar(await a2Rpc(org.c, 'simulate_save_conditions', { p_propuesta_id: pid, p_miembro_id: sim, p_disponibilidad: { A: 'no', B: 'no' } }), 'sim save')
    const variantes = [nom.toUpperCase(), `   ${nom}   `]
    const cods = []
    for (const v of variantes) cods.push(a2Cod(await join(intruso, v)))
    console.log('[A2 variantes espacios/mayus]', cods.join(' | '))
    for (const c of cods) expect(c).toBe('asiento_en_uso/asiento_en_uso')
    expect(await intrusoNoEsMiembro()).toBe(true)
    // variante con tabulador/nbsp: sesion propia (si entra, queda como miembro)
    for (const v of [`\t${nom.toLowerCase()} `, `\u00a0${nom}`]) {
      const s = await a2Sesion()
      const r = await join(s, v)
      const info = r.ok ? JSON.stringify({ reclamo: r.resultado.reclamo_asiento_simulado, mismo_id: r.resultado.miembro_id === sim }) : ''
      let cond = '-'
      if (r.ok) cond = (await a2Rpc(s, 'get_my_conditions', { p_propuesta_id: pid })).condiciones?.estado
      console.log('[A2 variante ' + JSON.stringify(v.slice(0, 2)) + '...] join ->', a2Cod(r), info, 'cond', cond)
      if (r.ok) {
        expect(r.resultado.reclamo_asiento_simulado).toBe(false)
        expect(r.resultado.miembro_id).not.toBe(sim)
        expect(cond).toBe('sin_cargar')
      }
    }
    expect((await miembroEnEspacio(sim)).simulado).toBe(true)
  }, T)

  it('rafaga de 8 reclamos paralelos del mismo intruso sobre asiento usado: todos asiento_en_uso', async () => {
    const pid = await a2Propuesta(org, 'ver-A2 rafaga')
    const nom = a2Nombre('raf')
    const sim = await a2Simulado(org, nom)
    a2Esperar(await a2Rpc(org.c, 'simulate_save_conditions', { p_propuesta_id: pid, p_miembro_id: sim, p_disponibilidad: { A: 'si' } }), 'sim save')
    const fresca = await a2Sesion()
    const rs = await Promise.all(Array.from({ length: 8 }, () => join(fresca, nom)))
    const cods = rs.map(a2Cod)
    console.log('[A2 rafaga]', cods.join(','))
    for (const c of cods) expect(c).toBe('asiento_en_uso/asiento_en_uso')
    const l = a2Esperar(await a2Rpc(fresca, 'list_my_spaces'), 'list')
    expect((l.espacios as any[]).some((e) => e.id === org.espacioId)).toBe(false)
  }, T)

  it('carrera triple: dos reclamantes + simulate_save_conditions x5: a lo sumo un reclamo y sin herencia', async () => {
    const pid = await a2Propuesta(org, 'ver-A2 carrera triple')
    const N = 5
    const ses = await Promise.all(Array.from({ length: 2 * N }, () => a2Sesion()))
    const res: string[] = []
    for (let i = 0; i < N; i++) {
      const nom = a2Nombre('tri')
      const sim = await a2Simulado(org, nom)
      const [j1, s, j2] = await Promise.all([
        join(ses[2 * i], nom),
        a2Rpc(org.c, 'simulate_save_conditions', { p_propuesta_id: pid, p_miembro_id: sim, p_disponibilidad: SI }),
        join(ses[2 * i + 1], nom),
      ])
      const reclamos = [j1, j2].filter((j) => j.ok && j.resultado.reclamo_asiento_simulado)
      expect(reclamos.length).toBeLessThanOrEqual(1)
      // nadie mas pudo quedar como miembro nuevo con ese nombre
      for (const j of [j1, j2]) if (j.ok) expect(j.resultado.reclamo_asiento_simulado).toBe(true)
      if (reclamos.length === 1) {
        expect(s.ok).toBe(false)
        const ganador = j1.ok ? ses[2 * i] : ses[2 * i + 1]
        const c = await a2Rpc(ganador, 'get_my_conditions', { p_propuesta_id: pid })
        expect(c.condiciones.estado).toBe('sin_cargar')
      } else {
        expect(s.ok).toBe(true)
      }
      res.push(`#${i} j1=${a2Cod(j1)} sim=${a2Cod(s)} j2=${a2Cod(j2)}`)
    }
    console.log('[A2 carrera triple]\n' + res.join('\n'))
  }, T)

  it('join vs simulate_withdraw x5 (asiento limpio): o reclamo y retiro rechazado, o retiro y asiento_en_uso', async () => {
    const pid = await a2Propuesta(org, 'ver-A2 carrera retiro')
    const N = 5
    const ses = await Promise.all(Array.from({ length: N }, () => a2Sesion()))
    const res: string[] = []
    for (let i = 0; i < N; i++) {
      const nom = a2Nombre('rw')
      const sim = await a2Simulado(org, nom)
      const [j, w] = await Promise.all([
        join(ses[i], nom),
        a2Rpc(org.c, 'simulate_withdraw', { p_propuesta_id: pid, p_miembro_id: sim }),
      ])
      if (j.ok && j.resultado.reclamo_asiento_simulado) {
        expect(a2Cod(w)).toBe('no_autorizado/miembro_no_simulado')
        const st = a2Esperar(await a2Rpc(ses[i], 'get_proposal_state', { p_propuesta_id: pid }), 'state')
        expect(st.propuesta.mi_situacion.retirado).toBe(false)
      } else {
        expect(w.ok).toBe(true)
        expect(a2Cod(j)).toBe('asiento_en_uso/asiento_en_uso')
      }
      res.push(`#${i} join=${a2Cod(j)} withdraw=${a2Cod(w)}`)
    }
    console.log('[A2 carrera retiro]\n' + res.join('\n'))
  }, T)

  it('propuesta cancelada con condiciones simuladas: el asiento sigue en uso', async () => {
    const pid = await a2Propuesta(org, 'ver-A2 cancelada')
    const nom = a2Nombre('can')
    const sim = await a2Simulado(org, nom)
    a2Esperar(await a2Rpc(org.c, 'simulate_save_conditions', { p_propuesta_id: pid, p_miembro_id: sim, p_disponibilidad: SI }), 'sim save')
    a2Esperar(await a2Rpc(org.c, 'cancel_proposal', { p_propuesta_id: pid }), 'cancel')
    const r = await join(await a2Sesion(), nom)
    console.log('[A2 cancelada] join ->', a2Cod(r))
    expect(a2Cod(r)).toBe('asiento_en_uso/asiento_en_uso')
  }, T)

  // Enmienda 7 (E7.3): en un espacio no demo ya no se puede crear un simulado, así que no hay asiento que
  // reclamar. La guarda de join_space para simulados viejos en espacios no demo (nombre_en_uso) sigue en la
  // base, pero desde la API ya no se puede preparar ese caso.
  it('espacio NO demo: no se crean simulados (espacio_no_demo) y entrar con ese nombre no reclama nada', async () => {
    const e = a2Esperar(await a2Rpc(org.c, 'create_space', { p_nombre: 'ver-A2 espacio no demo', p_tipo: 'amigos', p_nombre_visible: 'ver-A2 org' }), 'create_space')
    const nom = a2Nombre('nd')
    const add = await a2Rpc(org.c, 'add_simulated_member', { p_espacio_id: e.resultado.espacio_id, p_nombre_visible: nom })
    console.log('[A2 no demo] add_simulated_member ->', a2Cod(add))
    expect(a2Cod(add)).toBe('no_autorizado/espacio_no_demo')
    const r = await a2Rpc(intruso, 'join_space', { p_codigo: e.resultado.codigo_invitacion, p_nombre_visible: nom })
    console.log('[A2 no demo] join ->', a2Cod(r))
    expect(a2Cod(r)).toBe('ok')
    expect(r.resultado.reclamo_asiento_simulado).toBe(false)
    expect((r.espacio.miembros as any[]).some((m) => m.simulado)).toBe(false)
  }, T)

  it('observacion: reclamo tras solo simulate_mark_interest (fuera de las 3 prohibiciones)', async () => {
    const pid = await a2Propuesta(org, 'ver-A2 solo interes')
    const nom = a2Nombre('int')
    const sim = await a2Simulado(org, nom)
    a2Esperar(await a2Rpc(org.c, 'simulate_mark_interest', { p_propuesta_id: pid, p_miembro_id: sim, p_interesado: true }), 'sim interes')
    const s = await a2Sesion()
    const r = await join(s, nom)
    let interes: any = '-'
    if (r.ok) interes = (await a2Rpc(s, 'get_proposal_state', { p_propuesta_id: pid })).propuesta?.mi_situacion?.interesado
    console.log('[A2 solo interes] join ->', a2Cod(r), 'reclamo', r.resultado?.reclamo_asiento_simulado, 'interesado heredado', interes)
    expect(['ok', 'asiento_en_uso/asiento_en_uso']).toContain(a2Cod(r))
  }, T)
})
