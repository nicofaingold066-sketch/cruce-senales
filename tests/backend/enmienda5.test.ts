// Enmienda 5 (docs/contrato-enmienda-5.md): simulate_save_preferences para las variantes del jurado.
// Demo propio de una sesión de prueba (nunca el demo real) y espacios "t-".
import { beforeAll, describe, expect, it } from 'vitest'
import {
  clienteSinSesion, crearEspacioPrueba, err, intento, nuevaSesion, ok, PERMITIDAS, rpc, rpcCrudo,
  type Json, type Sesion,
} from './helpers'

const SECO = { sabado: 'seco', domingo: 'seco' }
const SOFI_GRATIS = { presupuesto: 'ojala_gratis', energia: 'algo_tranquilo', ambiente: 'da_igual', lugar: 'da_igual', me_gustaria: ['parque'] }
const VALORES = ['ojala_gratis', 'algo_barato', 'da_igual', 'con_todo', 'algo_tranquilo', 'bajo_techo', 'me_gustaria', 'presupuesto"']

const masDias = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

describe('enmienda 5: preferencias simuladas en vivo', { timeout: 90_000 }, () => {
  let O: Sesion // Tomi
  let L: Sesion // Luna (reclama su asiento)
  let X: Sesion // ajena
  let demo: Json
  let id: Record<string, string>
  let sabado: string

  const plan = async () =>
    (await ok(O, 'proponer_plan_borrador', { p_espacio_id: demo.id, p_sabado: sabado, p_clima: SECO })).resultado
  const sim = (s: Sesion, miembro: string, pref: Json, espacio = demo.id) =>
    rpc(s, 'simulate_save_preferences', { p_espacio_id: espacio, p_miembro_id: miembro, p_preferencias: pref })

  beforeAll(async () => {
    ;[O, L, X] = await Promise.all([nuevaSesion(), nuevaSesion(), nuevaSesion()])
    demo = (await ok(O, 'seed_demo_space')).espacio
    id = Object.fromEntries(demo.miembros.map((m: Json) => [m.nombre, m.miembro_id]))
    const hoy = (await ok(O, 'server_info')).servidor_ahora.local.slice(0, 10)
    sabado = masDias(hoy, 1)
    while (new Date(`${sabado}T00:00:00Z`).getUTCDay() !== 6) sabado = masDias(sabado, 1)
  }, 60_000)

  it('1. el organizador cambia a Sofi, el plan lo refleja, es idempotente y reset_demo restituye la semilla', async () => {
    expect((await plan()).actividad).toBe('asado') // semilla 7.1 (4 simulados)
    const a = await ok(O, 'simulate_save_preferences', { p_espacio_id: demo.id, p_miembro_id: id.Sofi, p_preferencias: SOFI_GRATIS })
    expect(a.resultado).toEqual({ repetido: false, simulado: true })
    expect(a.miembro).toMatchObject({ miembro_id: id.Sofi, nombre: 'Sofi', simulado: true })
    // E10: simulate conserva la semilla de viaje y momento de Sofi (las claves que no se mandan).
    expect(a.preferencias).toEqual({ ...SOFI_GRATIS, zona: 'santiago_centro', movilidad: 'me_llevan', tiempo_max: '45', momento: 'da_igual' })
    // Con Sofi en "ojalá gratis" solo queda el parque.
    const p = await plan()
    expect(p).toMatchObject({ actividad: 'parque', lugar: { id: 'lugar-sim-04' } })
    expect(p.candidatas.map((c: Json) => c.id)).toEqual(['lugar-sim-04'])
    // Repetir lo mismo: repetido, sin cambiar la fecha.
    const b = await ok(O, 'simulate_save_preferences', { p_espacio_id: demo.id, p_miembro_id: id.Sofi, p_preferencias: SOFI_GRATIS })
    expect(b.resultado.repetido).toBe(true)
    expect(b.actualizadas_en).toEqual(a.actualizadas_en)
    // No toca propuestas ni state_rev.
    const prop = (await ok(O, 'create_proposal', {
      p_espacio_id: demo.id, p_titulo: 't-e5', p_franjas: [{ inicio: '2026-12-05T14:00', fin: '2026-12-05T17:00' }, { inicio: '2026-12-06T14:00', fin: '2026-12-06T17:00' }],
      p_minimo: 2, p_maximo: 6, p_imprescindible_id: id.Tomi, p_plazo: '2026-12-01T20:00', p_zona_horaria: 'America/Santiago', p_intento_id: intento(),
    })).propuesta
    await ok(O, 'simulate_save_preferences', { p_espacio_id: demo.id, p_miembro_id: id.Mati, p_preferencias: { ...SOFI_GRATIS, me_gustaria: ['futbol'] } })
    expect((await ok(O, 'get_proposal_state', { p_propuesta_id: prop.id })).propuesta.state_rev).toBe(prop.state_rev)
    // reset_demo deshace los cambios en vivo.
    await ok(O, 'reset_demo', { p_espacio_id: demo.id, p_intento_id: intento() })
    const r = await plan()
    expect(r).toMatchObject({ actividad: 'asado', lugar: { id: 'lugar-sim-01' } })
    expect(r.candidatas.map((c: Json) => c.id)).toEqual(['lugar-sim-01', 'lugar-sim-03', 'lugar-sim-04'])
  })

  it('2. no organizador, espacio no demo, miembro real o de otro espacio, y sesión ajena: error y sin cambios', async () => {
    await ok(L, 'join_space', { p_codigo: demo.codigo_invitacion, p_nombre_visible: 'Luna' })
    const antes = await plan()
    const r1 = await sim(L, id.Sofi, SOFI_GRATIS)
    expect(err(r1)).toBe('no_autorizado/no_es_organizador_espacio')
    expect(err(await sim(O, id.Luna, SOFI_GRATIS))).toBe('no_autorizado/miembro_no_simulado') // Luna ya es real
    expect(err(await sim(O, id.Tomi, SOFI_GRATIS))).toBe('no_autorizado/miembro_no_simulado')
    expect(err(await sim(X, id.Sofi, SOFI_GRATIS))).toBe('fuera_de_audiencia/no_miembro')
    // Enmienda 7 (E7.3): fuera del demo ya no se crean simulados; espacio_no_demo llega antes de mirar al miembro.
    const esp = await crearEspacioPrueba(O, 'e5-no-demo', 'Org t')
    expect(err(await rpc(O, 'add_simulated_member', { p_espacio_id: esp.espacioId, p_nombre_visible: 'Simu t' })))
      .toBe('no_autorizado/espacio_no_demo')
    expect(err(await sim(O, esp.miembroId, SOFI_GRATIS, esp.espacioId))).toBe('no_autorizado/espacio_no_demo')
    // Simulado de otro espacio: Sofi del demo propio de X.
    const s = (await ok(X, 'seed_demo_space')).espacio.miembros.find((m: Json) => m.nombre === 'Sofi').miembro_id
    expect(err(await sim(O, s, SOFI_GRATIS))).toBe('no_autorizado/miembro_no_simulado') // simulado de otro espacio
    expect(err(await sim(O, id.Sofi, { ...SOFI_GRATIS, comentario: 'x' }))).toBe('entrada_incompleta/preferencias_invalidas')
    expect(err(await sim(O, id.Sofi, 'texto'))).toBe('entrada_incompleta/formato_invalido')
    expect(await plan()).toEqual(antes)
    // Un asiento simulado al que el organizador le cargó preferencias queda en uso (A2).
    await ok(O, 'add_simulated_member', { p_espacio_id: demo.id, p_nombre_visible: 'Nuevo t' })
    const nuevo = (await ok(O, 'get_space', { p_espacio_id: demo.id })).espacio.miembros.find((m: Json) => m.nombre === 'Nuevo t').miembro_id
    await ok(O, 'simulate_save_preferences', { p_espacio_id: demo.id, p_miembro_id: nuevo, p_preferencias: SOFI_GRATIS })
    expect(err(await rpc(X, 'join_space', { p_codigo: demo.codigo_invitacion, p_nombre_visible: 'Nuevo t' }))).toBe('asiento_en_uso/asiento_en_uso')
  })

  it('3. ninguna respuesta compartida expone preferencias individuales', async () => {
    await ok(O, 'simulate_save_preferences', { p_espacio_id: demo.id, p_miembro_id: id.Sofi, p_preferencias: SOFI_GRATIS })
    const vistas = [
      await ok(L, 'get_space', { p_espacio_id: demo.id }),
      await ok(L, 'list_my_spaces'),
      await ok(L, 'list_proposals', { p_espacio_id: demo.id }),
      await ok(L, 'get_my_preferences', { p_espacio_id: demo.id }),
      await rpc(L, 'simulate_save_preferences', { p_espacio_id: demo.id, p_miembro_id: id.Sofi, p_preferencias: SOFI_GRATIS }),
    ]
    expect(vistas[3].preferencias).toBeNull() // Luna no cargó las suyas y no ve las de Sofi
    for (const v of vistas) {
      const txt = JSON.stringify(v)
      for (const x of VALORES) expect(txt, x).not.toContain(x)
    }
  })

  it('reset_demo deshace también los cambios en vivo sobre asientos sin semilla: vuelven a poder reclamarse', async () => {
    // "Nuevo t" recibió preferencias en vivo en la prueba 2 y estaba en uso.
    await ok(O, 'reset_demo', { p_espacio_id: demo.id, p_intento_id: intento() })
    const j = await ok(X, 'join_space', { p_codigo: demo.codigo_invitacion, p_nombre_visible: 'Nuevo t' })
    expect(j.resultado.reclamo_asiento_simulado).toBe(true)
    expect((await ok(X, 'get_my_preferences', { p_espacio_id: demo.id })).preferencias).toBeNull()

    // Lo mismo con Luna en un demo nuevo: preferencias en vivo, reinicio, reclamo limpio.
    const [T2, L2] = await Promise.all([nuevaSesion(), nuevaSesion()])
    const d2 = (await ok(T2, 'seed_demo_space')).espacio
    const luna = d2.miembros.find((m: Json) => m.nombre === 'Luna').miembro_id
    await ok(T2, 'simulate_save_preferences', { p_espacio_id: d2.id, p_miembro_id: luna, p_preferencias: SOFI_GRATIS })
    expect(err(await rpc(L2, 'join_space', { p_codigo: d2.codigo_invitacion, p_nombre_visible: 'Luna' }))).toBe('asiento_en_uso/asiento_en_uso')
    await ok(T2, 'reset_demo', { p_espacio_id: d2.id, p_intento_id: intento() })
    const jl = await ok(L2, 'join_space', { p_codigo: d2.codigo_invitacion, p_nombre_visible: 'Luna' })
    expect(jl.resultado).toMatchObject({ reclamo_asiento_simulado: true, miembro_id: luna })
    expect((await ok(L2, 'get_my_preferences', { p_espacio_id: d2.id })).preferencias).toBeNull()
  })

  it('4. catálogo: 31 funciones para authenticated, 0 para anon', async () => {
    expect(Object.keys(PERMITIDAS)).toHaveLength(31)
    const a = await rpcCrudo(clienteSinSesion(), 'simulate_save_preferences', PERMITIDAS.simulate_save_preferences())
    expect(a.error?.code).toBe('42501')
    const b = await rpcCrudo(O, 'simulate_save_preferences', PERMITIDAS.simulate_save_preferences())
    expect(b.error).toBeNull()
    expect(err(b.data)).toBe('fuera_de_audiencia/no_miembro')
  })
})
