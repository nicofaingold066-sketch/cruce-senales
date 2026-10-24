// Enmienda 4 (docs/contrato-enmienda-4.md): preferencias, catálogo y proponer_plan_borrador, más la
// sección 4.1 (candidatas y perfil_grupo). Pruebas 1 a 9 de la sección 7 y las de la 4.1, contra la base real.
// Demo propio de una sesión de prueba (nunca el demo real) y espacios "t-".
import { beforeAll, describe, expect, it } from 'vitest'
import {
  clienteSinSesion, crearEspacioPrueba, err, nuevaSesion, ok, PERMITIDAS, rpc, rpcCrudo, intento, type Json, type Sesion,
  TOTAL_PERMITIDAS,
} from './helpers'

type Pref = { presupuesto: string; energia: string; ambiente: string; lugar: string; me_gustaria: string[] }
// docs/agente-ia.md 7.1: Tomi y Luna cargan las suyas desde la app.
const TOMI: Pref = { presupuesto: 'da_igual', energia: 'algo_tranquilo', ambiente: 'tranquilo', lugar: 'da_igual', me_gustaria: ['asado', 'padel'] }
const LUNA: Pref = { presupuesto: 'da_igual', energia: 'algo_tranquilo', ambiente: 'da_igual', lugar: 'da_igual', me_gustaria: ['asado', 'parque'] }
const SECO = { sabado: 'seco', domingo: 'seco' }
const LLUVIA = { sabado: 'lluvia', domingo: 'lluvia' }
const NOMBRES = ['Tomi', 'Luna', 'Mati', 'Caro', 'Fede', 'Sofi']
// Dos sesiones más, compartidas por la prueba de #28 y la de "3 y 4" (tope de sesiones anónimas por hora).
let extrasP: Promise<Sesion[]> | null = null
const extras = () => (extrasP ??= Promise.all([nuevaSesion(), nuevaSesion()]))

const fecha = (d: Date) => d.toISOString().slice(0, 10)
const masDias = (iso: string, n: number) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return fecha(d) }

describe('enmienda 4: el agente del círculo', { timeout: 90_000 }, () => {
  let O: Sesion // Tomi, organizador del demo
  let L: Sesion // Luna (reclama su asiento limpio)
  let X: Sesion // sesión ajena
  let demo: Json
  let hoy: string // fecha local de Santiago según el servidor
  let sabado: string // próximo sábado posterior a hoy

  const plan = (s: Sesion, espacio: string, clima: Json, sab = sabado) =>
    rpc(s, 'proponer_plan_borrador', { p_espacio_id: espacio, p_sabado: sab, p_clima: clima })

  beforeAll(async () => {
    ;[O, L, X] = await Promise.all([nuevaSesion(), nuevaSesion(), nuevaSesion()])
    demo = (await ok(O, 'seed_demo_space')).espacio
    hoy = (await ok(O, 'server_info')).servidor_ahora.local.slice(0, 10)
    sabado = masDias(hoy, 1)
    while (new Date(`${sabado}T00:00:00Z`).getUTCDay() !== 6) sabado = masDias(sabado, 1)
  }, 60_000)

  it('9. A2 con preferencias: un asiento simulado con semilla está en uso; el limpio se reclama sin heredar nada', async () => {
    const mati = await rpc(X, 'join_space', { p_codigo: demo.codigo_invitacion, p_nombre_visible: 'Mati' })
    expect(err(mati)).toBe('asiento_en_uso/asiento_en_uso')
    const luna = await ok(L, 'join_space', { p_codigo: demo.codigo_invitacion, p_nombre_visible: 'Luna' })
    expect(luna.resultado.reclamo_asiento_simulado).toBe(true)
    const p = await ok(L, 'get_my_preferences', { p_espacio_id: demo.id })
    expect(p.preferencias).toBeNull()
    expect(p.actualizadas_en).toBeNull()
    expect(p.personas_con_preferencias).toBe(4) // semillas de Mati, Caro, Fede y Sofi
    expect(p.opciones.actividades.slice(0, 5)).toEqual([ // E10 Parte B (0038): siguen las 8 nuevas; E14 (0049): familia
      { clave: 'asado', etiqueta: 'Asado', familia: 'comida' }, { clave: 'padel', etiqueta: 'Pádel', familia: 'deporte' },
      { clave: 'futbol', etiqueta: 'Fútbol', familia: 'deporte' }, { clave: 'parque', etiqueta: 'Parque', familia: 'aire_libre' },
      { clave: 'fiesta', etiqueta: 'Fiesta', familia: 'salida_noche' },
    ])
  })

  it('save_my_preferences: validación, idempotencia y respuesta', async () => {
    const base = { p_espacio_id: demo.id }
    const malas: [unknown, string][] = [
      ['texto', 'entrada_incompleta/formato_invalido'],
      [{ ...TOMI, presupuesto: undefined }, 'entrada_incompleta/preferencias_invalidas'],
      [{ ...TOMI, energia: 'a_medias' }, 'entrada_incompleta/preferencias_invalidas'],
      [{ ...TOMI, me_gustaria: [] }, 'entrada_incompleta/preferencias_invalidas'],
      [{ ...TOMI, me_gustaria: ['asado', 'asado'] }, 'entrada_incompleta/preferencias_invalidas'],
      [{ ...TOMI, me_gustaria: ['bowling'] }, 'entrada_incompleta/preferencias_invalidas'],
      [{ ...TOMI, comentario: 'texto libre' }, 'entrada_incompleta/preferencias_invalidas'],
    ]
    for (const [p, e] of malas) expect(err(await rpc(O, 'save_my_preferences', { ...base, p_preferencias: p })), JSON.stringify(p)).toBe(e)
    expect(err(await rpc(X, 'save_my_preferences', { ...base, p_preferencias: TOMI }))).toBe('fuera_de_audiencia/no_miembro')

    const a = await ok(O, 'save_my_preferences', { ...base, p_preferencias: TOMI })
    expect(a.resultado.repetido).toBe(false)
    expect(a.preferencias).toEqual(TOMI)
    const b = await ok(O, 'save_my_preferences', { ...base, p_preferencias: TOMI })
    expect(b.resultado.repetido).toBe(true)
    expect(b.actualizadas_en).toEqual(a.actualizadas_en)
    await ok(L, 'save_my_preferences', { ...base, p_preferencias: LUNA })
  })

  it('1. privacidad: cada quien ve solo lo suyo; el plan no trae nombres, ids ni valores individuales; tabla inaccesible', async () => {
    const l = await ok(L, 'get_my_preferences', { p_espacio_id: demo.id })
    expect(l.preferencias).toEqual(LUNA)
    expect(l.personas_con_preferencias).toBe(6)
    expect(JSON.stringify(l)).not.toContain('padel"]') // nada de las de Tomi
    const t = await ok(O, 'get_my_preferences', { p_espacio_id: demo.id })
    expect(t.preferencias).toEqual(TOMI)

    for (const clima of [SECO, LLUVIA]) {
      const r = await ok(O, 'proponer_plan_borrador', { p_espacio_id: demo.id, p_sabado: sabado, p_clima: clima })
      let txt = JSON.stringify(r)
      // Los textos fijos del catálogo ("Quincho de Tomi", "Asado en casa de Tomi") no son datos de nadie.
      txt = txt.replaceAll('Quincho de Tomi (Simulación)', '').replaceAll('Asado en casa de Tomi', '')
      for (const n of NOMBRES) expect(txt).not.toContain(n)
      for (const m of demo.miembros) expect(txt).not.toContain(m.miembro_id)
      for (const s of [O, L]) expect(txt).not.toContain(s.userId)
      for (const v of ['algo_barato', 'ojala_gratis', 'da_igual', 'con_todo', 'me_gustaria', 'presupuesto"', 'puntaje', 'miembro']) {
        expect(txt).not.toContain(v)
      }
    }
    // Consulta directa desde el cliente: error o 0 filas.
    for (const c of [clienteSinSesion(), L.c]) {
      const a = await c.from('preferencias').select('*')
      expect(a.error !== null || (a.data ?? []).length === 0).toBe(true)
      const b = await c.schema('cruce').from('preferencias').select('*')
      expect(b.error !== null || (b.data ?? []).length === 0).toBe(true)
    }
  })

  it('2. semilla 7.1: con seco y con lluvia sale el asado, sábado y domingo 14:00 a 17:00 (E13: en la parrilla del parque)', async () => {
    const domingo = masDias(sabado, 1)
    for (const clima of [SECO, LLUVIA]) {
      const r = (await ok(O, 'proponer_plan_borrador', { p_espacio_id: demo.id, p_sabado: sabado, p_clima: clima })).resultado
      expect(r).toMatchObject({
        // E13 (d): a igual puntaje, la parrilla (Providencia, viaje máximo 20) le gana al quincho (Ñuñoa, 25).
        tipo: 'borrador', actividad: 'asado', actividad_etiqueta: 'Asado', titulo: 'Asado en una parrilla del parque',
        lugar: { id: 'lugar-sim-14', nombre: 'Parrilla del parque (Simulación)', simulado: true },
        clima, personas_consideradas: 6,
      })
      expect(r.franjas).toEqual([
        { inicio: `${sabado}T14:00`, fin: `${sabado}T17:00` },
        { inicio: `${domingo}T14:00`, fin: `${domingo}T17:00` },
      ])
      // Mejora #54: ritmo_del_grupo usa la mayoría sin quien pide (como el perfil, E7.4). Sin Tomi el ambiente
      // empata (Caro tranquilo, Fede fiesta), así que la frase ya no sale; antes la ponía el voto de Tomi.
      expect(r.frases_grupo).toEqual(['presupuesto_todos', 'bajo_techo', 'el_mas_elegido'])
    }
  })

  it('4.1: candidatas sin puntajes ni descartadas, la primera es la elección; perfil_grupo agregado', async () => {
    const seco = (await ok(O, 'proponer_plan_borrador', { p_espacio_id: demo.id, p_sabado: sabado, p_clima: SECO })).resultado
    // Pádel y la fiesta (precio medio) quedan descartados por "algo barato"; la fiesta además no abre el domingo.
    // E13 (d): los dos asados (parrilla primero por viaje) y el parque.
    expect(seco.candidatas.map((c: Json) => c.id)).toEqual(['lugar-sim-14', 'lugar-sim-01', 'lugar-sim-04'])
    const [primera] = seco.candidatas
    expect(primera).toEqual({
      id: seco.lugar.id, actividad: seco.actividad, actividad_etiqueta: seco.actividad_etiqueta, lugar: seco.lugar,
      titulo: seco.titulo, franjas: seco.franjas, frases_grupo: seco.frases_grupo, viaje: seco.viaje, // E10: viaje en cada candidata
      familia: 'comida', personas: { min: 4, max: 12 }, // E14 (0049)
    })
    expect(seco.quorum).toBeNull() // E14: el demo es libre
    expect(seco.candidatas.find((c: Json) => c.id === 'lugar-sim-04').frases_grupo).toEqual(['presupuesto_todos', 'al_aire_libre_con_buen_tiempo']) // #54: sin ritmo_del_grupo
    for (const c of seco.candidatas) expect(Object.keys(c).sort()).toEqual(['actividad', 'actividad_etiqueta', 'familia', 'franjas', 'frases_grupo', 'id', 'lugar', 'personas', 'titulo', 'viaje'])
    expect(JSON.stringify(seco)).not.toMatch(/lugar-sim-02|evento-sim-01|puntaje/)
    // Mejora #28: Fiesta (1 persona) no sale en gustos. Enmienda 7 (E7.4): el perfil no cuenta a quien lo pide
    // (Tomi): 5 personas, Asado 4, Pádel 0 (solo Tomi); ambiente sin mayoría (Caro tranquilo, Fede fiesta);
    // sin presupuesto_grupo.
    expect(seco.perfil_grupo).toEqual({
      personas: 5,
      gustos: [
        { actividad_etiqueta: 'Asado', cuantos: 4 }, { actividad_etiqueta: 'Fútbol', cuantos: 2 },
        { actividad_etiqueta: 'Parque', cuantos: 2 },
      ],
      energia_mayoritaria: 'algo_tranquilo', ambiente_mayoritario: null,
    })
    // Con lluvia, Caro pidió techo: la cancha y el parque quedan fuera.
    const lluvia = (await ok(O, 'proponer_plan_borrador', { p_espacio_id: demo.id, p_sabado: sabado, p_clima: LLUVIA })).resultado
    // E10 Parte B (0038): entran también el cine (barato) y la cultura (gratis), bajo techo.
    // E13 (d): los dos asados bajo techo (parrilla primero por viaje) y el cine.
    expect(lluvia.candidatas.map((c: Json) => c.id)).toEqual(['lugar-sim-14', 'lugar-sim-01', 'lugar-sim-09'])
  })

  it('mejora #28: con 4 personas (sin contar a quien pide), una actividad elegida por una sola no aparece en perfil_grupo.gustos', async () => {
    const Y = await nuevaSesion()
    const [Z] = await extras()
    const esp = await crearEspacioPrueba(O, 'e28-gustos', 'Org t')
    await ok(L, 'join_space', { p_codigo: esp.codigo, p_nombre_visible: 'Uno t' })
    await ok(X, 'join_space', { p_codigo: esp.codigo, p_nombre_visible: 'Dos t' })
    await ok(Y, 'join_space', { p_codigo: esp.codigo, p_nombre_visible: 'Tres t' })
    await ok(Z, 'join_space', { p_codigo: esp.codigo, p_nombre_visible: 'Cuatro t' })
    const pref = (me_gustaria: string[]) => ({ presupuesto: 'da_igual', energia: 'algo_tranquilo', ambiente: 'tranquilo', lugar: 'da_igual', me_gustaria })
    // Sin contar a O (enmienda 7, E7.4): Asado 3, Parque 2; Fútbol solo Y; Pádel solo O, que no cuenta.
    await ok(O, 'save_my_preferences', { p_espacio_id: esp.espacioId, p_preferencias: pref(['asado', 'padel']) })
    await ok(L, 'save_my_preferences', { p_espacio_id: esp.espacioId, p_preferencias: pref(['asado', 'parque']) })
    await ok(X, 'save_my_preferences', { p_espacio_id: esp.espacioId, p_preferencias: pref(['asado', 'parque']) })
    await ok(Y, 'save_my_preferences', { p_espacio_id: esp.espacioId, p_preferencias: pref(['futbol']) })
    await ok(Z, 'save_my_preferences', { p_espacio_id: esp.espacioId, p_preferencias: pref(['asado']) })

    const r = await ok(O, 'proponer_plan_borrador', { p_espacio_id: esp.espacioId, p_sabado: sabado, p_clima: SECO })
    expect(r.resultado.personas_consideradas).toBe(5)
    expect(r.resultado.perfil_grupo).toEqual({
      personas: 4,
      gustos: [{ actividad_etiqueta: 'Asado', cuantos: 3 }, { actividad_etiqueta: 'Parque', cuantos: 2 }],
      energia_mayoritaria: 'algo_tranquilo', ambiente_mayoritario: 'tranquilo',
    })
    const perfil = JSON.stringify(r.resultado.perfil_grupo)
    expect(perfil).not.toMatch(/Pádel|Fútbol|padel|futbol|"cuantos":1\b/)

    // Y suma Pádel: con el voto de O serían 2, pero O no cuenta (E7.4) y sigue fuera.
    await ok(Y, 'save_my_preferences', { p_espacio_id: esp.espacioId, p_preferencias: pref(['futbol', 'padel']) })
    const r2 = await ok(O, 'proponer_plan_borrador', { p_espacio_id: esp.espacioId, p_sabado: sabado, p_clima: SECO })
    expect(r2.resultado.perfil_grupo).toEqual(r.resultado.perfil_grupo)
    // Con una segunda persona además de O, Pádel aparece (2, antes que Parque por orden del catálogo); Fútbol sigue fuera.
    await ok(Z, 'save_my_preferences', { p_espacio_id: esp.espacioId, p_preferencias: pref(['asado', 'padel']) })
    const r3 = await ok(O, 'proponer_plan_borrador', { p_espacio_id: esp.espacioId, p_sabado: sabado, p_clima: SECO })
    expect(r3.resultado.perfil_grupo.gustos).toEqual([
      { actividad_etiqueta: 'Asado', cuantos: 3 }, { actividad_etiqueta: 'Pádel', cuantos: 2 },
      { actividad_etiqueta: 'Parque', cuantos: 2 },
    ])
    for (const g of r3.resultado.perfil_grupo.gustos) expect(g.cuantos).toBeGreaterThanOrEqual(2)
  })

  it('5. rol y fecha: solo el organizador; sábado futuro dentro de 16 días; clima con formato', async () => {
    expect(err(await plan(L, demo.id, SECO))).toBe('no_autorizado/no_es_organizador_espacio')
    expect(err(await plan(X, demo.id, SECO))).toBe('fuera_de_audiencia/no_miembro')
    expect(err(await plan(O, demo.id, SECO, masDias(sabado, 1)))).toBe('entrada_incompleta/fecha_invalida') // domingo
    expect(err(await plan(O, demo.id, SECO, masDias(sabado, -7)))).toBe('entrada_incompleta/fecha_invalida') // sábado pasado u hoy
    let lejos = masDias(hoy, 17)
    while (new Date(`${lejos}T00:00:00Z`).getUTCDay() !== 6) lejos = masDias(lejos, 1)
    expect(err(await plan(O, demo.id, SECO, lejos))).toBe('entrada_incompleta/fecha_invalida')
    expect(err(await plan(O, demo.id, { sabado: 'nublado', domingo: 'seco' }))).toBe('entrada_incompleta/formato_invalido')
    expect(err(await plan(O, demo.id, { sabado: 'seco' }))).toBe('entrada_incompleta/formato_invalido')
  })

  it('3 y 4. presupuesto ojalá gratis: solo entradas gratis; con todo descartado, sin_plan_compatible sin motivo; 4.1 con 3 personas', async () => {
    const [U1, U2] = await extras()
    const esp = await crearEspacioPrueba(O, 'e4-gratis', 'Org t')
    await ok(U1, 'join_space', { p_codigo: esp.codigo, p_nombre_visible: 'Uno t' })
    await ok(U2, 'join_space', { p_codigo: esp.codigo, p_nombre_visible: 'Dos t' })
    // 6. con menos de 2 personas con preferencias
    expect(err(await plan(O, esp.espacioId, SECO))).toBe('entrada_incompleta/pocas_preferencias')
    await ok(O, 'save_my_preferences', { p_espacio_id: esp.espacioId, p_preferencias: { presupuesto: 'ojala_gratis', energia: 'algo_tranquilo', ambiente: 'tranquilo', lugar: 'da_igual', me_gustaria: ['asado', 'padel'] } })
    const pocas = await plan(O, esp.espacioId, SECO)
    expect(err(pocas)).toBe('entrada_incompleta/pocas_preferencias')
    expect(pocas.error.mensaje).toBe('Todavía no hay suficientes personas con preferencias cargadas.')
    await ok(U1, 'save_my_preferences', { p_espacio_id: esp.espacioId, p_preferencias: { presupuesto: 'da_igual', energia: 'con_todo', ambiente: 'fiesta', lugar: 'da_igual', me_gustaria: ['asado'] } })
    await ok(U2, 'save_my_preferences', { p_espacio_id: esp.espacioId, p_preferencias: { presupuesto: 'da_igual', energia: 'algo_tranquilo', ambiente: 'da_igual', lugar: 'bajo_techo', me_gustaria: ['futbol'] } })

    // 3. Aunque el asado es lo más elegido, es "barato": solo quedan entradas gratis (parque; con la Parte B de
    // la enmienda 10, también cultura y cerro).
    const r = (await ok(O, 'proponer_plan_borrador', { p_espacio_id: esp.espacioId, p_sabado: sabado, p_clima: SECO })).resultado
    expect(r).toMatchObject({ tipo: 'borrador', actividad: 'parque', lugar: { id: 'lugar-sim-04' }, personas_consideradas: 3 })
    expect(r.candidatas.map((c: Json) => c.id)).toEqual(['lugar-sim-04', 'lugar-sim-10', 'lugar-sim-12'])
    // Con 3 personas o menos: sin presupuesto_todos ni ritmo_del_grupo, y perfil_grupo solo con personas
    // (enmienda 7, E7.4: sin contar a quien pide, 2).
    expect(r.frases_grupo).toEqual(['al_aire_libre_con_buen_tiempo'])
    expect(r.perfil_grupo).toEqual({ personas: 2 })

    // 4. Lluvia (o clima desconocido) y alguien pidió techo: el parque y el cerro caen. Antes no quedaba nada
    // (sin_plan_compatible sin motivo); con la Parte B de la enmienda 10 queda la cultura, gratis y bajo techo.
    for (const clima of [LLUVIA, { sabado: 'seco', domingo: 'desconocido' }]) {
      const s = await ok(O, 'proponer_plan_borrador', { p_espacio_id: esp.espacioId, p_sabado: sabado, p_clima: clima })
      expect(s.resultado.candidatas.map((c: Json) => c.id)).toEqual(['lugar-sim-10'])
    }
  })

  it('7. lista permitida: 31 para authenticated (29 de la enmienda 4 + 1 de la 5 + 1 de la 9), 0 para anon, agente_insumos no existe', async () => {
    expect(Object.keys(PERMITIDAS)).toHaveLength(TOTAL_PERMITIDAS) // E11: 40; E13: 41
    for (const fn of ['save_my_preferences', 'get_my_preferences', 'proponer_plan_borrador']) {
      const a = await rpcCrudo(clienteSinSesion(), fn, PERMITIDAS[fn]())
      expect(a.error?.code, fn).toBe('42501')
      const b = await rpcCrudo(O, fn, PERMITIDAS[fn]())
      expect(b.error, fn).toBeNull()
    }
    const ins = await rpcCrudo(O, 'agente_insumos', { p_user_id: O.userId, p_espacio_id: demo.id, p_sabado: sabado, p_clima: SECO })
    expect(ins.error?.code).toBe('PGRST202')
    expect((await O.c.schema('cruce').rpc('agente_insumos', {})).error?.code).toBe('PGRST106')
  })

  it('8. reinicio: conserva las preferencias de Tomi y Luna y recarga las semillas', async () => {
    const [t0, l0] = await Promise.all([
      ok(O, 'get_my_preferences', { p_espacio_id: demo.id }), ok(L, 'get_my_preferences', { p_espacio_id: demo.id }),
    ])
    await ok(O, 'reset_demo', { p_espacio_id: demo.id, p_intento_id: intento() })
    const [t1, l1] = await Promise.all([
      ok(O, 'get_my_preferences', { p_espacio_id: demo.id }), ok(L, 'get_my_preferences', { p_espacio_id: demo.id }),
    ])
    expect(t1.preferencias).toEqual(TOMI)
    expect(t1.actualizadas_en).toEqual(t0.actualizadas_en)
    expect(l1.preferencias).toEqual(LUNA)
    expect(l1.actualizadas_en).toEqual(l0.actualizadas_en)
    expect(l1.personas_con_preferencias).toBe(6)
    // Los simulados siguen con semilla (su asiento sigue en uso) y el plan sigue siendo el mismo.
    expect(err(await rpc(X, 'join_space', { p_codigo: demo.codigo_invitacion, p_nombre_visible: 'Sofi' }))).toBe('asiento_en_uso/asiento_en_uso')
    const r = (await ok(O, 'proponer_plan_borrador', { p_espacio_id: demo.id, p_sabado: sabado, p_clima: SECO })).resultado
    expect(r).toMatchObject({ actividad: 'asado', personas_consideradas: 6 })
  })
})
