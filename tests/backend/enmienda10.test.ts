// Enmienda 10, Parte A (docs/contrato-enmienda-10.md, mejora #85): zona, movilidad, tiempo máximo y momento del
// día, migración 0035. Pruebas mínimas 1 a 7 de la enmienda, contra la base real. Demo propio de una sesión de
// prueba (Tomi y sus 5 simulados, todos con preferencias controladas por la prueba) y un espacio "t-e10-...".
// Tres sesiones para todo el archivo (tope de sesiones anónimas por hora).
import { beforeAll, describe, expect, it } from 'vitest'
import {
  clienteSinSesion, crearEspacioPrueba, demoPrueba, err, intento, nuevaSesion, ok, rpc, rpcCrudo,
  type Json, type Sesion,
} from './helpers'

type Pref = Record<string, unknown>
const SECO = { sabado: 'seco', domingo: 'seco' }
const DESCONOCIDO = { sabado: 'desconocido', domingo: 'desconocido' }
const LLUVIA = { sabado: 'lluvia', domingo: 'lluvia' }
// Base neutra: sin marcas en candidatas (la fiesta nunca es candidata), con_todo para todos y momento da_igual.
// Con da_igual en presupuesto entran asado (01), pádel (02), fútbol (03) y parque (04); solo el fútbol y el pádel
// suman por energía.
const BASE: Pref = { presupuesto: 'da_igual', energia: 'con_todo', ambiente: 'da_igual', lugar: 'da_igual', me_gustaria: ['fiesta'] }
const SIMULADOS = ['Luna', 'Mati', 'Caro', 'Fede', 'Sofi']
const ZONAS = ['providencia', 'nunoa', 'las_condes', 'santiago_centro', 'maipu', 'la_florida', 'puente_alto', 'vitacura']
const MODOS = ['auto_con_lugar', 'auto_sin_lugar', 'transporte_publico', 'bici_o_pie', 'me_llevan']

const masDias = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Ninguna clave ni valor de viaje o momento por persona en una respuesta compartida. */
function sinDatosDeViaje(r: Json) {
  const txt = JSON.stringify(r)
  for (const k of ['"zona"', '"movilidad"', '"tiempo_max"', '"momento"', '"minutos"', '"modo"']) expect(txt).not.toContain(k)
  for (const v of [...ZONAS, ...MODOS, 'manana', 'tarde', 'noche', 'da_igual']) expect(txt).not.toContain(`"${v}"`)
}

describe('enmienda 10: zona, movilidad, tiempo máximo y momento del día', { timeout: 180_000 }, () => {
  let O: Sesion // Tomi, organizador del demo y del espacio t-
  let E: Sesion
  let F: Sesion
  let demo: Json
  let ids: Record<string, string>
  let sabado: string

  const plan = async (clima: Json = SECO, espacio = demo.espacioId, s = O) => {
    const r = await rpc(s, 'proponer_plan_borrador', { p_espacio_id: espacio, p_sabado: sabado, p_clima: clima })
    return r.ok ? r.resultado : r.error
  }
  const guardar = (s: Sesion, espacio: string, p: Pref) => ok(s, 'save_my_preferences', { p_espacio_id: espacio, p_preferencias: p })
  const sim = (nombre: string, p: Pref) =>
    ok(O, 'simulate_save_preferences', { p_espacio_id: demo.espacioId, p_miembro_id: ids[nombre], p_preferencias: p })
  /** Tomi y los 5 simulados con las mismas preferencias (cada uno con sus cuatro claves explícitas). */
  const todos = async (p: Pref) => {
    await guardar(O, demo.espacioId, p)
    for (const n of SIMULADOS) await sim(n, p)
  }
  const idsDe = (r: Json) => r.candidatas.map((c: Json) => c.id)

  beforeAll(async () => {
    ;[O, E, F] = await Promise.all([nuevaSesion(), nuevaSesion(), nuevaSesion()])
    demo = await demoPrueba(O)
    ids = Object.fromEntries((await ok(O, 'get_space', { p_espacio_id: demo.espacioId })).espacio.miembros.map((m: Json) => [m.nombre, m.miembro_id]))
    const hoy = (await ok(O, 'server_info')).servidor_ahora.local.slice(0, 10)
    sabado = masDias(hoy, 1)
    while (new Date(`${sabado}T00:00:00Z`).getUTCDay() !== 6) sabado = masDias(sabado, 1)
  }, 90_000)

  it('0. claves opcionales: se validan, se guardan, get_my_preferences las devuelve solo a la persona; simulate conserva lo que falta', async () => {
    const VIAJE = { zona: 'nunoa', movilidad: 'bici_o_pie', tiempo_max: '30', momento: 'noche' }
    for (const malo of [
      { ...BASE, tiempo_max: 15 }, { ...BASE, tiempo_max: '20' }, { ...BASE, zona: 'mendoza' }, { ...BASE, zona: null },
      { ...BASE, movilidad: 'auto' }, { ...BASE, momento: 'madrugada' }, { ...BASE, direccion: 'x' },
      {}, { zona: 'nunoa' }, // 0037: sin las claves obligatorias
    ]) {
      expect(err(await rpc(O, 'save_my_preferences', { p_espacio_id: demo.espacioId, p_preferencias: malo }))).toBe('entrada_incompleta/preferencias_invalidas')
      expect(err(await rpc(O, 'simulate_save_preferences', { p_espacio_id: demo.espacioId, p_miembro_id: ids.Mati, p_preferencias: malo }))).toBe('entrada_incompleta/preferencias_invalidas')
    }
    const g = await guardar(O, demo.espacioId, { ...BASE, ...VIAJE })
    expect(g.preferencias).toEqual({ ...BASE, ...VIAJE })
    expect(g.resultado.repetido).toBe(false)
    expect((await guardar(O, demo.espacioId, { ...BASE, ...VIAJE })).resultado.repetido).toBe(true)
    expect((await ok(O, 'get_my_preferences', { p_espacio_id: demo.espacioId })).preferencias).toEqual({ ...BASE, ...VIAJE })
    // Sin las claves: se borran (guardar es reemplazar) y la respuesta vuelve a la forma de antes (0036).
    const h = await guardar(O, demo.espacioId, BASE)
    expect(h.resultado.repetido).toBe(false)
    expect(h.preferencias).toEqual(BASE)
    expect((await ok(O, 'get_my_preferences', { p_espacio_id: demo.espacioId })).preferencias).toEqual(BASE)
    // simulate: la clave que falta conserva lo guardado (la semilla de Mati).
    const s = await sim('Mati', { ...BASE, zona: 'vitacura' })
    expect(s.preferencias).toMatchObject({ zona: 'vitacura', movilidad: 'auto_con_lugar', tiempo_max: '45', momento: 'tarde' })
    // reset_demo repone las semillas.
    await ok(O, 'reset_demo', { p_espacio_id: demo.espacioId, p_intento_id: intento() })
  })

  it('1. tiempo_max: 15 descarta lo lejano, 60 no; todo lejos da sin_lugar_cerca_para_todos sin decir para quién', async () => {
    // Las 6 personas marcan fútbol, pádel y parque: esas tres dominan el puntaje (3 por marca) frente al resto del
    // catálogo. Todos en Ñuñoa en transporte público: fútbol 10 min, parque 25, pádel 40 (sin castigo: 40 - 30 < 15).
    const CERCA = { zona: 'nunoa', movilidad: 'transporte_publico', tiempo_max: '60', momento: 'da_igual' }
    const TRES = { ...BASE, me_gustaria: ['futbol', 'padel', 'parque'] }
    await todos({ ...TRES, ...CERCA })
    const largo = await plan(DESCONOCIDO)
    expect(idsDe(largo)).toEqual(['lugar-sim-03', 'lugar-sim-02', 'lugar-sim-04'])
    // Tomi con 15: el pádel (40) y el parque (25) quedan fuera; todo lo que queda está a 15 o menos.
    await guardar(O, demo.espacioId, { ...TRES, ...CERCA, tiempo_max: '15' })
    const corto = await plan(DESCONOCIDO)
    expect(idsDe(corto)[0]).toBe('lugar-sim-03')
    expect(idsDe(corto)).not.toContain('lugar-sim-02')
    expect(idsDe(corto)).not.toContain('lugar-sim-04')
    for (const c of corto.candidatas) expect(c.viaje.max_minutos).toBeLessThanOrEqual(15)
    // Tomi en Maipú con 15 y "algo barato" (el único lugar de Maipú es de precio medio): todo le queda lejos.
    const MAIPU = { ...TRES, presupuesto: 'algo_barato', zona: 'maipu', movilidad: 'auto_sin_lugar', momento: 'da_igual' }
    await guardar(O, demo.espacioId, { ...MAIPU, tiempo_max: '15' })
    const lejos = await rpc(O, 'proponer_plan_borrador', { p_espacio_id: demo.espacioId, p_sabado: sabado, p_clima: DESCONOCIDO })
    expect(lejos.resultado).toEqual({ tipo: 'sin_plan_compatible', motivo: 'sin_lugar_cerca_para_todos' })
    sinDatosDeViaje(lejos)
    for (const n of ['Tomi', ...SIMULADOS]) expect(JSON.stringify(lejos)).not.toContain(n)
    // Con 60 no descarta nunca.
    await guardar(O, demo.espacioId, { ...MAIPU, tiempo_max: '60' })
    expect((await plan(DESCONOCIDO)).tipo).toBe('borrador')
  })

  it('2. me_llevan: sin autos con lugar va en transporte público y puede descartar; con uno va en auto', async () => {
    const AUTO = { zona: 'nunoa', movilidad: 'auto_sin_lugar', tiempo_max: '60', momento: 'da_igual' }
    await todos({ ...BASE, ...AUTO })
    // Tomi en Maipú necesita que lo lleven, hasta 45, con "algo barato": en transporte público todo lo que entra
    // por precio le queda a 55 o más.
    await guardar(O, demo.espacioId, { ...BASE, presupuesto: 'algo_barato', zona: 'maipu', movilidad: 'me_llevan', tiempo_max: '45', momento: 'da_igual' })
    expect(await plan(DESCONOCIDO)).toEqual({ tipo: 'sin_plan_compatible', motivo: 'sin_lugar_cerca_para_todos' })
    // Mati tiene auto con lugar: Tomi va en auto (Santiago centro 35; Ñuñoa, Providencia y La Florida 45; Las Condes,
    // Vitacura y Puente Alto 55 siguen fuera).
    await sim('Mati', { ...BASE, ...AUTO, movilidad: 'auto_con_lugar' })
    const r = await plan(DESCONOCIDO)
    expect(r.tipo).toBe('borrador')
    for (const id of idsDe(r)) expect(['lugar-sim-01', 'lugar-sim-03', 'lugar-sim-04', 'lugar-sim-08', 'lugar-sim-10']).toContain(id)
    sinDatosDeViaje({ ...r, candidatas: r.candidatas.map((c: Json) => ({ ...c, viaje: null })), viaje: null })
  })

  it('3. equidad: a igual puntaje gana la de menor viaje máximo', async () => {
    // Todos marcan fútbol y pádel, que empatan (marcas y energía). Sin viaje desempataba el precio (fútbol, barato).
    // Todos en Las Condes: pádel a 10, fútbol a 25 → gana el pádel aunque sea más caro.
    const DOS = { ...BASE, me_gustaria: ['futbol', 'padel'] }
    await todos({ ...DOS, zona: 'las_condes', movilidad: 'auto_sin_lugar', tiempo_max: '60', momento: 'da_igual' })
    const lc = await plan(DESCONOCIDO)
    expect(idsDe(lc).slice(0, 2)).toEqual(['lugar-sim-02', 'lugar-sim-03'])
    expect(lc.viaje).toEqual({ max_minutos: 10, estimado: true })
    expect(lc.candidatas[1].viaje).toEqual({ max_minutos: 25, estimado: true })
    // Todos en Ñuñoa: fútbol a 10, pádel a 25 → gana el fútbol.
    await todos({ ...DOS, zona: 'nunoa', movilidad: 'auto_sin_lugar', tiempo_max: '60', momento: 'da_igual' })
    expect(idsDe(await plan(DESCONOCIDO)).slice(0, 2)).toEqual(['lugar-sim-03', 'lugar-sim-02'])
  })

  it('4. viaje es null con 3 personas con zona y aparece con 4; ninguna respuesta compartida trae zona, modo ni minutos por persona', async () => {
    // Espacio t- con 3 personas reales con zona y movilidad.
    const esp = await crearEspacioPrueba(O, 'e10-tres', 'Org t')
    await ok(E, 'join_space', { p_codigo: esp.codigo, p_nombre_visible: 'Uno t' })
    await ok(F, 'join_space', { p_codigo: esp.codigo, p_nombre_visible: 'Dos t' })
    const V = { zona: 'providencia', movilidad: 'me_llevan', tiempo_max: '45', momento: 'tarde' }
    for (const s of [O, E, F]) await guardar(s, esp.espacioId, { ...BASE, ...V })
    const tres = await rpc(O, 'proponer_plan_borrador', { p_espacio_id: esp.espacioId, p_sabado: sabado, p_clima: SECO })
    expect(tres.resultado.tipo).toBe('borrador')
    expect(tres.resultado.viaje).toBeNull()
    for (const c of tres.resultado.candidatas) expect(c.viaje).toBeNull()
    sinDatosDeViaje(tres)
    // Demo con las semillas: 4 simulados con zona y movilidad (Tomi sin zona; Luna sin semilla).
    await guardar(O, demo.espacioId, BASE)
    await ok(O, 'reset_demo', { p_espacio_id: demo.espacioId, p_intento_id: intento() })
    const cuatro = await rpc(O, 'proponer_plan_borrador', { p_espacio_id: demo.espacioId, p_sabado: sabado, p_clima: SECO })
    const r = cuatro.resultado
    expect(r.tipo).toBe('borrador')
    expect(r.viaje).toEqual(r.candidatas[0].viaje)
    for (const c of r.candidatas) {
      expect(Object.keys(c.viaje).sort()).toEqual(['estimado', 'max_minutos'])
      expect(c.viaje.estimado).toBe(true)
      expect(Number.isInteger(c.viaje.max_minutos)).toBe(true)
    }
    const sinNumeros = { ...cuatro, resultado: { ...r, viaje: null, candidatas: r.candidatas.map((c: Json) => ({ ...c, viaje: null })) } }
    sinDatosDeViaje(sinNumeros)
    // Otras respuestas compartidas: el espacio (para el organizador y para otro miembro) y el error de validación.
    sinDatosDeViaje(await ok(O, 'get_space', { p_espacio_id: demo.espacioId }))
    sinDatosDeViaje(await ok(E, 'get_space', { p_espacio_id: esp.espacioId }))
    sinDatosDeViaje(await ok(O, 'list_my_spaces'))
    sinDatosDeViaje(await rpc(E, 'save_my_preferences', { p_espacio_id: esp.espacioId, p_preferencias: { ...BASE, zona: 'mendoza' } }))
    // Cada persona ve solo lo suyo.
    expect((await ok(E, 'get_my_preferences', { p_espacio_id: esp.espacioId })).preferencias).toMatchObject(V)
    expect(err(await rpc(E, 'get_my_preferences', { p_espacio_id: demo.espacioId }))).toBe('fuera_de_audiencia/no_miembro')
  })

  it('5. momento suma pero no descarta', async () => {
    // Todos marcan asado (14:00, tarde), fútbol (11:00) y parque (12:00), que dominan el puntaje. Con "algo barato"
    // no entra nada de precio medio (las salidas de noche).
    const P = { ...BASE, presupuesto: 'algo_barato', me_gustaria: ['asado', 'futbol', 'parque'], zona: 'nunoa', movilidad: 'auto_sin_lugar', tiempo_max: '60' }
    await todos({ ...P, momento: 'tarde' })
    const tarde = await plan(DESCONOCIDO)
    expect(idsDe(tarde)[0]).toBe('lugar-sim-01')
    await todos({ ...P, momento: 'manana' })
    const manana = await plan(DESCONOCIDO)
    expect(idsDe(manana)[2]).toBe('lugar-sim-01')
    // Las mismas tres en los dos casos: el momento ordena, no descarta.
    expect([...idsDe(tarde)].sort()).toEqual(['lugar-sim-01', 'lugar-sim-03', 'lugar-sim-04'])
    expect([...idsDe(manana)].sort()).toEqual(['lugar-sim-01', 'lugar-sim-03', 'lugar-sim-04'])
    // "Noche" no coincide con ninguna que entre por precio: igual que da_igual.
    await todos({ ...P, momento: 'noche' })
    const noche = await plan(DESCONOCIDO)
    await todos({ ...P, momento: 'da_igual' })
    expect(await plan(DESCONOCIDO)).toEqual(noche)
  })

  it('6. opt-out: con usar_en_agente false, el viaje y el momento de esa persona no cuentan', async () => {
    const CERCA = { zona: 'nunoa', movilidad: 'auto_sin_lugar', tiempo_max: '60', momento: 'da_igual' }
    await todos({ ...BASE, ...CERCA })
    await guardar(O, demo.espacioId, { ...BASE, usar_en_agente: false })
    const sinTomi = await plan(DESCONOCIDO)
    // Tomi lejísimos (Maipú, necesita que lo lleven y nadie tiene auto con lugar), con 15, "algo barato" y de tarde,
    // pero sin dejar usar sus preferencias: el mismo plan.
    const LEJOS = { presupuesto: 'algo_barato', zona: 'maipu', movilidad: 'me_llevan', tiempo_max: '15', momento: 'tarde' }
    await guardar(O, demo.espacioId, { ...BASE, ...LEJOS, usar_en_agente: false })
    expect(await plan(DESCONOCIDO)).toEqual(sinTomi)
    // Con la casilla marcada sí cuenta: todo le queda lejos.
    await guardar(O, demo.espacioId, { ...BASE, ...LEJOS })
    expect(await plan(DESCONOCIDO)).toEqual({ tipo: 'sin_plan_compatible', motivo: 'sin_lugar_cerca_para_todos' })
    await ok(O, 'reset_demo', { p_espacio_id: demo.espacioId, p_intento_id: intento() })
  })

  it('8. (Parte B, 0038) las actividades nuevas se pueden marcar y aparecen como candidatas', async () => {
    const NUEVAS = ['cena', 'bar', 'juegos_casa', 'cine', 'cultura', 'juegos_salida', 'cerro', 'cafe']
    const opciones = (await ok(O, 'get_my_preferences', { p_espacio_id: demo.espacioId })).opciones.actividades
    expect(opciones.map((a: Json) => a.clave)).toEqual(['asado', 'padel', 'futbol', 'parque', 'fiesta', ...NUEVAS])
    for (const a of opciones) expect(a.etiqueta).toBeTruthy()
    // Sin descartes por viaje (60 para todos): con 6 personas que la marcan, la actividad sale primera.
    const V = { zona: 'santiago_centro', movilidad: 'auto_sin_lugar', tiempo_max: '60', momento: 'da_igual' }
    for (const act of NUEVAS) {
      await todos({ ...BASE, me_gustaria: [act], ...V })
      const r = await plan(SECO)
      expect(r.tipo, act).toBe('borrador')
      expect(r.candidatas[0].actividad, act).toBe(act)
      expect(r.candidatas[0].lugar.nombre).toMatch(/ \(Simulación\)$/)
      expect(r.perfil_grupo.gustos).toEqual([{ actividad_etiqueta: opciones.find((o: Json) => o.clave === act).etiqueta, cuantos: 5 }]) // sin Tomi
    }
    // El presupuesto sigue descartando: con "ojalá gratis" la cena no entra.
    await todos({ ...BASE, presupuesto: 'ojala_gratis', me_gustaria: ['cena'], ...V })
    expect(idsDe(await plan(SECO))).not.toContain('lugar-sim-06')
    await ok(O, 'reset_demo', { p_espacio_id: demo.espacioId, p_intento_id: intento() })
  })

  it('7. permisos: sin sesión no se ejecuta; la tabla de tiempos y las preferencias no se leen desde el cliente', async () => {
    const anon = clienteSinSesion()
    for (const fn of ['save_my_preferences', 'get_my_preferences', 'proponer_plan_borrador', 'simulate_save_preferences']) {
      const r = await rpcCrudo(anon, fn, { p_espacio_id: demo.espacioId })
      expect(r.error !== null || r.data?.ok === false).toBe(true)
    }
    for (const c of [anon, E.c]) {
      for (const t of ['tiempos_zona', 'preferencias', 'catalogo_agente']) {
        const a = await c.schema('cruce').from(t).select('*')
        expect(a.error !== null || (a.data ?? []).length === 0).toBe(true)
        const b = await c.from(t).select('*')
        expect(b.error !== null || (b.data ?? []).length === 0).toBe(true)
      }
    }
  })
})
