// Enmienda 7 (docs/contrato-enmienda-7.md): menos inferencias sobre condiciones y preferencias.
// Un describe por punto, contra la base real. Espacios propios "t-e7-..." y el demo propio de una sesión
// de prueba (nunca el demo de otros). Tres sesiones compartidas por todo el archivo (tope de sesiones
// anónimas por hora): A organiza, B es un miembro común y W es quien se baja.
import { describe, expect, it } from 'vitest'
import { crearEspacioPrueba, crearPropuesta, err, intento, nuevaSesion, ok, rpc, type Json, type Sesion } from './helpers'

let compartidas: Promise<Sesion[]> | null = null
const sesiones = () => (compartidas ??= Promise.all([nuevaSesion(), nuevaSesion(), nuevaSesion()]))

const SECO = { sabado: 'seco', domingo: 'seco' }
type Pref = { presupuesto: string; energia: string; ambiente: string; lugar: string; me_gustaria: string[] }

const masDias = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
async function proximoSabado(s: Sesion): Promise<string> {
  let sab = masDias((await ok(s, 'server_info')).servidor_ahora.local.slice(0, 10), 1)
  while (new Date(`${sab}T00:00:00Z`).getUTCDay() !== 6) sab = masDias(sab, 1)
  return sab
}

describe('E7.1: el orden de las candidatas no delata gustos en grupos chicos', { timeout: 90_000 }, () => {
  it('grupo de 2 reales (fiesta y parque): ninguna trae el_mas_elegido y el orden es el de sin marcas', async () => {
    const [A, B] = await sesiones()
    const esp = await crearEspacioPrueba(A, 'e7-orden', 'Org t')
    await ok(B, 'join_space', { p_codigo: esp.codigo, p_nombre_visible: 'Dos t' })
    const sabado = await proximoSabado(A)
    const pref = (me_gustaria: string[]): Pref => ({ presupuesto: 'da_igual', energia: 'con_todo', ambiente: 'da_igual', lugar: 'da_igual', me_gustaria })
    const plan = async () =>
      (await ok(A, 'proponer_plan_borrador', { p_espacio_id: esp.espacioId, p_sabado: sabado, p_clima: SECO })).resultado

    await ok(A, 'save_my_preferences', { p_espacio_id: esp.espacioId, p_preferencias: pref(['fiesta']) })
    await ok(B, 'save_my_preferences', { p_espacio_id: esp.espacioId, p_preferencias: pref(['parque']) })
    const r1 = await plan()
    expect(r1.personas_consideradas).toBe(2)
    // Sin marcas (energía con_todo, ambiente sin mayoría, seco): Fútbol 2; Parque 1 (gratis) y Pádel 1 (medio).
    // Con el orden anterior, la marca de B ponía al Parque primero y con "el más elegido".
    expect(r1.candidatas.map((c: Json) => c.id)).toEqual(['lugar-sim-03', 'lugar-sim-04', 'lugar-sim-02'])
    for (const c of r1.candidatas) expect(c.frases_grupo).not.toContain('el_mas_elegido')

    // Otras marcas (las dos eligen asado, que antes sumaba 6): mismas candidatas, mismo orden, mismas frases.
    await ok(A, 'save_my_preferences', { p_espacio_id: esp.espacioId, p_preferencias: pref(['asado']) })
    await ok(B, 'save_my_preferences', { p_espacio_id: esp.espacioId, p_preferencias: pref(['asado']) })
    const r2 = await plan()
    expect(r2.candidatas).toEqual(r1.candidatas)
    expect(r2.frases_grupo).toEqual(r1.frases_grupo)
    expect(JSON.stringify(r2)).not.toContain('el_mas_elegido')
  })
})

describe('E7.3: simulación solo en espacios demo', { timeout: 90_000 }, () => {
  it('fuera del demo: add_simulated_member y todas las simulate_* responden no_autorizado/espacio_no_demo, sin efectos', async () => {
    const [A, B] = await sesiones()
    const esp = await crearEspacioPrueba(A, 'e7-no-demo', 'Org t')
    const b = (await ok(B, 'join_space', { p_codigo: esp.codigo, p_nombre_visible: 'Dos t' })).resultado.miembro_id as string
    const prop = await crearPropuesta(A, esp.espacioId, esp.miembroId, { minimo: 2, maximo: 4, titulo: 't-e7-no-demo' })
    const antes = (await ok(A, 'get_proposal_state', { p_propuesta_id: prop })).propuesta
    const pref: Pref = { presupuesto: 'da_igual', energia: 'con_todo', ambiente: 'da_igual', lugar: 'da_igual', me_gustaria: ['asado'] }

    // El destino es un miembro real: si la regla no existiera, la respuesta sería miembro_no_simulado.
    const llamadas: [string, Record<string, unknown>][] = [
      ['add_simulated_member', { p_espacio_id: esp.espacioId, p_nombre_visible: 'Simu t' }],
      ['simulate_mark_interest', { p_propuesta_id: prop, p_miembro_id: b, p_interesado: true }],
      ['simulate_save_conditions', { p_propuesta_id: prop, p_miembro_id: b, p_disponibilidad: { A: 'si' } }],
      ['simulate_accept', { p_propuesta_id: prop, p_miembro_id: b, p_version: 1, p_intento_id: intento() }],
      ['simulate_withdraw', { p_propuesta_id: prop, p_miembro_id: b }],
      ['simulate_load_case', { p_propuesta_id: prop, p_intento_id: intento() }],
      ['simulate_save_preferences', { p_espacio_id: esp.espacioId, p_miembro_id: b, p_preferencias: pref }],
    ]
    for (const [fn, args] of llamadas) {
      const r = await rpc(A, fn, args)
      expect(err(r), fn).toBe('no_autorizado/espacio_no_demo')
      expect(r.contrato, fn).toBe(2)
    }
    // Quien no organiza recibe el rechazo de siempre (el rol se mira antes que el tipo de espacio).
    expect(err(await rpc(B, 'add_simulated_member', { p_espacio_id: esp.espacioId, p_nombre_visible: 'Simu t' })))
      .toBe('no_autorizado/no_es_organizador_espacio')
    expect(err(await rpc(B, 'simulate_mark_interest', { p_propuesta_id: prop, p_miembro_id: b, p_interesado: true })))
      .toBe('no_autorizado/no_es_organizador_espacio')

    // Sin efectos: ningún simulado nuevo, la propuesta igual.
    const espacio = (await ok(A, 'get_space', { p_espacio_id: esp.espacioId })).espacio
    expect(espacio.miembros.map((m: Json) => [m.nombre, m.simulado])).toEqual([['Org t', false], ['Dos t', false]])
    const despues = (await ok(A, 'get_proposal_state', { p_propuesta_id: prop })).propuesta
    expect(despues.state_rev).toBe(antes.state_rev)
    expect(despues.interesados.cantidad).toBe(0)
    expect(despues.personas_con_condiciones).toBe(0)
    expect(despues.bajas).toEqual([])
    expect((await ok(B, 'get_my_preferences', { p_espacio_id: esp.espacioId })).preferencias).toBeNull()
  })

  it('en el demo propio la simulación sigue funcionando', async () => {
    const [A] = await sesiones()
    const demo = (await ok(A, 'seed_demo_space')).espacio
    const nuevo = (await ok(A, 'add_simulated_member', { p_espacio_id: demo.id, p_nombre_visible: 'Nuevo e7 t' })).resultado.miembro_id
    const prop = await crearPropuesta(A, demo.id, demo.mi_miembro_id, { minimo: 2, maximo: 4, titulo: 't-e7-demo' })
    const r = await ok(A, 'simulate_mark_interest', { p_propuesta_id: prop, p_miembro_id: nuevo, p_interesado: true })
    expect(r.resultado.simulado).toBe(true)
    expect(r.propuesta.interesados.cantidad).toBe(1)
    await ok(A, 'simulate_save_conditions', { p_propuesta_id: prop, p_miembro_id: nuevo, p_disponibilidad: { A: 'si' } })
    await ok(A, 'cancel_proposal', { p_propuesta_id: prop })
  })
})

describe('E7.4: el perfil del grupo no cuenta a quien lo pide', { timeout: 90_000 }, () => {
  it('demo: Tomi pide y quedan los 5 simulados; su voto no hace visible a Pádel con una sola persona más; sin presupuesto_grupo', async () => {
    const [A] = await sesiones()
    const demo = (await ok(A, 'seed_demo_space')).espacio
    const id: Record<string, string> = Object.fromEntries(demo.miembros.map((m: Json) => [m.nombre, m.miembro_id]))
    const sabado = await proximoSabado(A)
    const plan = async () =>
      (await ok(A, 'proponer_plan_borrador', { p_espacio_id: demo.id, p_sabado: sabado, p_clima: SECO })).resultado
    const simular = (nombre: string, p: Pref) =>
      ok(A, 'simulate_save_preferences', { p_espacio_id: demo.id, p_miembro_id: id[nombre], p_preferencias: p })
    const TOMI: Pref = { presupuesto: 'da_igual', energia: 'algo_tranquilo', ambiente: 'tranquilo', lugar: 'da_igual', me_gustaria: ['asado', 'padel'] }

    // Tomi carga las suyas y Luna (simulada) recibe preferencias: 6 con preferencias, 5 sin contar a Tomi.
    await ok(A, 'save_my_preferences', { p_espacio_id: demo.id, p_preferencias: TOMI })
    await simular('Luna', { presupuesto: 'da_igual', energia: 'algo_tranquilo', ambiente: 'da_igual', lugar: 'da_igual', me_gustaria: ['asado', 'parque'] })
    const r1 = await plan()
    expect(r1.personas_consideradas).toBe(6)
    // Semillas: Mati asado+fútbol, Caro asado+parque, Fede fútbol+fiesta, Sofi asado; Luna asado+parque.
    // Energía de los demás: 3 algo tranquilo contra 2 con todo. Ambiente: Caro tranquilo y Fede fiesta, sin mayoría.
    const PERFIL = {
      personas: 5,
      gustos: [
        { actividad_etiqueta: 'Asado', cuantos: 4 }, { actividad_etiqueta: 'Fútbol', cuantos: 2 },
        { actividad_etiqueta: 'Parque', cuantos: 2 },
      ],
      energia_mayoritaria: 'algo_tranquilo', ambiente_mayoritario: null,
    }
    expect(r1.perfil_grupo).toEqual(PERFIL)
    expect(JSON.stringify(r1)).not.toContain('presupuesto_grupo')
    expect(r1.candidatas[0].actividad).toBe('asado')
    expect(r1.candidatas[0].frases_grupo).toContain('el_mas_elegido') // 4 de los demás

    // Lo propio no mueve el perfil: Tomi marca todo y cambia energía y ambiente.
    await ok(A, 'save_my_preferences', {
      p_espacio_id: demo.id,
      p_preferencias: { ...TOMI, energia: 'con_todo', ambiente: 'fiesta', me_gustaria: ['asado', 'padel', 'futbol', 'parque', 'fiesta'] },
    })
    expect((await plan()).perfil_grupo).toEqual(PERFIL)

    // Fede suma Pádel: con el voto de Tomi serían 2, pero de los demás es 1 y no aparece.
    await ok(A, 'save_my_preferences', { p_espacio_id: demo.id, p_preferencias: TOMI })
    await simular('Fede', { presupuesto: 'da_igual', energia: 'con_todo', ambiente: 'fiesta', lugar: 'da_igual', me_gustaria: ['futbol', 'padel'] })
    const r2 = await plan()
    expect(r2.perfil_grupo).toEqual(PERFIL)
    expect(JSON.stringify(r2)).not.toMatch(/Pádel|presupuesto_grupo/)

    // Con una segunda persona además de Tomi (Sofi), Pádel aparece y cuenta 2, no 3.
    await simular('Sofi', { presupuesto: 'algo_barato', energia: 'algo_tranquilo', ambiente: 'da_igual', lugar: 'da_igual', me_gustaria: ['asado', 'padel'] })
    const r3 = await plan()
    expect(r3.perfil_grupo).toEqual({
      ...PERFIL,
      gustos: [
        { actividad_etiqueta: 'Asado', cuantos: 4 }, { actividad_etiqueta: 'Pádel', cuantos: 2 },
        { actividad_etiqueta: 'Fútbol', cuantos: 2 }, { actividad_etiqueta: 'Parque', cuantos: 2 },
      ],
    })
  })
})
