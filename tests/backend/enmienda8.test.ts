// Enmienda 8 (docs/contrato-enmienda-8.md, mejora #62): opt-out del agente (usar_en_agente), migración 0031.
// Pruebas mínimas 1 a 5 de la enmienda, contra la base real. Demo propio de una sesión de prueba (nunca el
// demo de otros) y espacios "t-e8-...". Tres sesiones para todo el archivo (tope de sesiones anónimas por hora).
import { beforeAll, describe, expect, it } from 'vitest'
import {
  clienteSinSesion, crearEspacioPrueba, crearPropuesta, demoPrueba, err, intento, nuevaSesion, ok, PERMITIDAS, rpc, rpcCrudo,
  type Json, type Sesion,
  TOTAL_PERMITIDAS,
} from './helpers'

type Pref = { presupuesto: string; energia: string; ambiente: string; lugar: string; me_gustaria: string[] }
const SECO = { sabado: 'seco', domingo: 'seco' }
// Tomi (organizador) y la persona que se baja del agente (Luna, que reclama su asiento del demo).
const TOMI: Pref = { presupuesto: 'da_igual', energia: 'algo_tranquilo', ambiente: 'tranquilo', lugar: 'da_igual', me_gustaria: ['asado', 'padel'] }
const GRATIS: Pref = { presupuesto: 'ojala_gratis', energia: 'con_todo', ambiente: 'fiesta', lugar: 'bajo_techo', me_gustaria: ['fiesta', 'padel'] }

const masDias = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

describe('enmienda 8: el agente solo usa las preferencias de quien lo permite', { timeout: 120_000 }, () => {
  let O: Sesion // Tomi, organizador del demo y de un espacio no demo
  let E: Sesion // Luna: reclama su asiento del demo y entra al espacio no demo
  let demo: Json
  let ids: Record<string, string> // miembros del demo por nombre
  let sabado: string

  const planR = (s: Sesion, espacio: string) =>
    rpc(s, 'proponer_plan_borrador', { p_espacio_id: espacio, p_sabado: sabado, p_clima: SECO })
  // Lo comparable de la respuesta (sin servidor_ahora, que cambia en cada llamada): el resultado o el error.
  const plan = async (s: Sesion, espacio: string) => {
    const r = await planR(s, espacio)
    return r.ok ? r.resultado : r.error
  }
  const guardar = (s: Sesion, espacio: string, p: Pref, usar?: boolean) =>
    ok(s, 'save_my_preferences', { p_espacio_id: espacio, p_preferencias: usar === undefined ? p : { ...p, usar_en_agente: usar } })
  const mias = async (s: Sesion, espacio: string) => ok(s, 'get_my_preferences', { p_espacio_id: espacio })

  beforeAll(async () => {
    ;[O, E] = await Promise.all([nuevaSesion(), nuevaSesion()])
    demo = await demoPrueba(O)
    ids = Object.fromEntries((await ok(O, 'get_space', { p_espacio_id: demo.espacioId })).espacio.miembros.map((m: Json) => [m.nombre, m.miembro_id]))
    const hoy = (await ok(O, 'server_info')).servidor_ahora.local.slice(0, 10)
    sabado = masDias(hoy, 1)
    while (new Date(`${sabado}T00:00:00Z`).getUTCDay() !== 6) sabado = masDias(sabado, 1)
    const j = await ok(E, 'join_space', { p_codigo: demo.codigo, p_nombre_visible: 'Luna' })
    expect(j.resultado.reclamo_asiento_simulado).toBe(true)
    await guardar(O, demo.espacioId, TOMI)
  }, 60_000)

  it('1 y 2. con opt-out, el plan, perfil_grupo y personas_con_preferencias son idénticos a los de "no guardó"', async () => {
    // "No guardó": Luna sin preferencias. Tomi más las 4 semillas de los simulados con preferencias.
    const antes = await plan(O, demo.espacioId)
    const cuentaAntes = (await mias(O, demo.espacioId)).personas_con_preferencias
    expect(antes.tipo).toBe('borrador')
    expect(antes.personas_consideradas).toBe(5)
    expect(antes.perfil_grupo.personas).toBe(4) // los demás, sin Tomi
    expect(antes.candidatas.length).toBeGreaterThan(1)
    expect(cuentaAntes).toBe(5)

    // Luna exige "ojalá gratis" pero desmarca el agente: es como si no hubiera guardado.
    const g = await guardar(E, demo.espacioId, GRATIS, false)
    expect(g.usar_en_agente).toBe(false)
    expect(g.resultado.repetido).toBe(false)
    const optOut = await plan(O, demo.espacioId)
    expect(optOut).toEqual(antes) // candidatas, frases, perfil_grupo y personas_consideradas
    expect((await mias(O, demo.espacioId)).personas_con_preferencias).toBe(cuentaAntes)

    // Con la casilla marcada sus preferencias vuelven a contar: solo queda la entrada gratis y suma una persona.
    await guardar(E, demo.espacioId, GRATIS, true)
    const conLuna = await plan(O, demo.espacioId)
    expect(conLuna.candidatas.map((c: Json) => c.id)).toEqual(['lugar-sim-04', 'lugar-sim-10', 'lugar-sim-12']) // E10 Parte B: también cultura y cerro
    expect(conLuna.personas_consideradas).toBe(6)
    expect(conLuna.perfil_grupo.personas).toBe(5)
    expect((await mias(O, demo.espacioId)).personas_con_preferencias).toBe(cuentaAntes + 1)

    // Guardar sin la clave la deja en true (valor por defecto): sigue contando.
    await guardar(E, demo.espacioId, GRATIS, false)
    expect(await plan(O, demo.espacioId)).toEqual(antes)
    const sinClave = await guardar(E, demo.espacioId, GRATIS)
    expect(sinClave.usar_en_agente).toBe(true)
    expect(await plan(O, demo.espacioId)).toEqual(conLuna)

    // Quien llama también queda fuera si se baja: Tomi con opt-out es como si no hubiera guardado.
    await guardar(E, demo.espacioId, GRATIS, false)
    await guardar(O, demo.espacioId, TOMI, false)
    const sinTomi = await plan(O, demo.espacioId)
    expect(sinTomi.personas_consideradas).toBe(4) // solo las 4 semillas
    expect(sinTomi.perfil_grupo.personas).toBe(4)
    expect((await mias(O, demo.espacioId)).personas_con_preferencias).toBe(4)
    await guardar(O, demo.espacioId, TOMI, true)
    expect(await plan(O, demo.espacioId)).toEqual(antes)
  })

  it('2. pocas_preferencias: con opt-out la respuesta es la misma que si no hubiera guardado', async () => {
    const esp = await crearEspacioPrueba(O, 'e8-pocas', 'Org t')
    await ok(E, 'join_space', { p_codigo: esp.codigo, p_nombre_visible: 'Dos t' })
    await guardar(O, esp.espacioId, TOMI)
    const noGuardo = await plan(O, esp.espacioId)
    expect(`${noGuardo.codigo}/${noGuardo.detalle}`).toBe('entrada_incompleta/pocas_preferencias')
    const cuenta0 = (await mias(O, esp.espacioId)).personas_con_preferencias
    expect(cuenta0).toBe(1)

    await guardar(E, esp.espacioId, GRATIS, false)
    expect(await plan(O, esp.espacioId)).toEqual(noGuardo)
    expect((await mias(O, esp.espacioId)).personas_con_preferencias).toBe(cuenta0)
    expect((await mias(E, esp.espacioId)).personas_con_preferencias).toBe(cuenta0) // tampoco para quien se bajó

    await guardar(E, esp.espacioId, GRATIS, true)
    const dos = await plan(O, esp.espacioId)
    expect(dos.tipo).toBe('borrador')
    expect(dos.personas_consideradas).toBe(2)
    expect((await mias(O, esp.espacioId)).personas_con_preferencias).toBe(2)
  })

  it('3. por defecto true, validación, idempotencia y simulate_save_preferences sin cambios', async () => {
    const esp = await crearEspacioPrueba(O, 'e8-defecto', 'Org t')
    await ok(E, 'join_space', { p_codigo: esp.codigo, p_nombre_visible: 'Dos t' })
    const vacio = await mias(E, esp.espacioId)
    expect(vacio.preferencias).toBeNull()
    expect(vacio.usar_en_agente).toBe(true) // todavía no guardó nada: el valor por defecto de la casilla

    const a = await guardar(E, esp.espacioId, TOMI)
    expect(a.resultado.repetido).toBe(false)
    expect(a.usar_en_agente).toBe(true)
    expect(a.preferencias).toEqual(TOMI) // la clave nueva no entra en `preferencias`
    expect((await guardar(E, esp.espacioId, TOMI)).resultado.repetido).toBe(true)
    expect((await guardar(E, esp.espacioId, TOMI, true)).resultado.repetido).toBe(true)

    // Cambiar solo la casilla no es repetir.
    const b = await guardar(E, esp.espacioId, TOMI, false)
    expect(b.resultado.repetido).toBe(false)
    expect(b.usar_en_agente).toBe(false)
    const propias = await mias(E, esp.espacioId)
    expect(propias.usar_en_agente).toBe(false)
    expect(propias.preferencias).toEqual(TOMI) // siguen guardadas, solo para ella
    expect((await guardar(E, esp.espacioId, TOMI, false)).resultado.repetido).toBe(true)
    expect((await guardar(E, esp.espacioId, TOMI)).resultado.repetido).toBe(false) // sin la clave vuelve a true
    expect((await mias(E, esp.espacioId)).usar_en_agente).toBe(true)

    // Validación: la clave es opcional y booleana; sigue la lista cerrada para el resto.
    for (const malo of ['no', 1, null, 'true', {}, []]) {
      const r = await rpc(E, 'save_my_preferences', { p_espacio_id: esp.espacioId, p_preferencias: { ...TOMI, usar_en_agente: malo } })
      expect(err(r), JSON.stringify(malo)).toBe('entrada_incompleta/preferencias_invalidas')
    }
    expect(err(await rpc(E, 'save_my_preferences', { p_espacio_id: esp.espacioId, p_preferencias: { ...TOMI, comentario: 'x', usar_en_agente: true } })))
      .toBe('entrada_incompleta/preferencias_invalidas')
    expect(err(await rpc(E, 'save_my_preferences', { p_espacio_id: esp.espacioId, p_preferencias: { usar_en_agente: true } })))
      .toBe('entrada_incompleta/preferencias_invalidas')
    expect(err(await rpc(E, 'save_my_preferences', { p_espacio_id: esp.espacioId, p_preferencias: 'texto' })))
      .toBe('entrada_incompleta/formato_invalido')
    expect((await mias(E, esp.espacioId)).usar_en_agente).toBe(true) // los rechazos no cambiaron nada

    // simulate_save_preferences no cambia: rechaza la clave y no toca el valor de los simulados (siempre true).
    const mati = ids.Mati
    expect(err(await rpc(O, 'simulate_save_preferences', { p_espacio_id: demo.espacioId, p_miembro_id: mati, p_preferencias: { ...TOMI, usar_en_agente: false } })))
      .toBe('entrada_incompleta/preferencias_invalidas')
    expect((await rpc(O, 'simulate_save_preferences', { p_espacio_id: demo.espacioId, p_miembro_id: mati, p_preferencias: TOMI })).ok).toBe(true)
    // El reinicio deja las semillas como estaban (siempre true): el plan base vuelve a ser el de las 4 semillas.
    await ok(O, 'reset_demo', { p_espacio_id: demo.espacioId, p_intento_id: intento() })
    await guardar(E, demo.espacioId, GRATIS, false)
    await guardar(O, demo.espacioId, TOMI, false)
    expect((await plan(O, demo.espacioId)).personas_consideradas).toBe(4)
    await guardar(O, demo.espacioId, TOMI, true)
  })

  it('4. get_my_preferences devuelve el valor propio; ninguna respuesta compartida lo trae', async () => {
    await guardar(E, demo.espacioId, GRATIS, false)
    expect((await mias(E, demo.espacioId)).usar_en_agente).toBe(false)
    expect((await mias(O, demo.espacioId)).usar_en_agente).toBe(true) // el de Tomi, no el de Luna

    const prop = await crearPropuesta(O, demo.espacioId, demo.miembroId, { minimo: 2, maximo: 6, titulo: 't-e8-privacidad' })
    const compartidas: Json[] = [
      await ok(O, 'get_space', { p_espacio_id: demo.espacioId }),
      await ok(E, 'get_space', { p_espacio_id: demo.espacioId }),
      await ok(O, 'list_my_spaces'),
      await ok(E, 'list_my_spaces'),
      await ok(O, 'list_proposals', { p_espacio_id: demo.espacioId }),
      await ok(E, 'list_proposals', { p_espacio_id: demo.espacioId }),
      await ok(O, 'get_proposal_state', { p_propuesta_id: prop }),
      await ok(E, 'get_proposal_state', { p_propuesta_id: prop }),
      await rpc(E, 'get_simulation_panel', { p_propuesta_id: prop }),
      await planR(O, demo.espacioId),
    ]
    for (const r of compartidas) {
      const txt = JSON.stringify(r)
      expect(txt).not.toContain('usar_en_agente')
      expect(txt).not.toContain('"me_gustaria"')
    }
    // Un tercero que no es miembro tampoco lo ve.
    const ajena = await rpc(await nuevaSesion(), 'get_my_preferences', { p_espacio_id: demo.espacioId })
    expect(err(ajena)).toBe('fuera_de_audiencia/no_miembro')
    expect(JSON.stringify(ajena)).not.toContain('usar_en_agente')
    await ok(O, 'cancel_proposal', { p_propuesta_id: prop })
    await guardar(E, demo.espacioId, GRATIS, true)
  })

  it('5. catálogo: 31 para authenticated y 0 para anon, una sola firma por nombre', async () => {
    expect(Object.keys(PERMITIDAS)).toHaveLength(TOTAL_PERMITIDAS) // E11: 40; E13: 41
    const anon = clienteSinSesion()
    for (const fn of ['save_my_preferences', 'get_my_preferences', 'proponer_plan_borrador']) {
      const a = await rpcCrudo(anon, fn, PERMITIDAS[fn]())
      expect(a.error?.code, fn).toBe('42501')
      const b = await rpcCrudo(O, fn, PERMITIDAS[fn]())
      expect(b.error, fn).toBeNull()
    }
    // Sin firma nueva: un parámetro extra no existe (no hay sobrecarga con `usar_en_agente` aparte).
    const sobrecarga = await rpcCrudo(O, 'save_my_preferences', { ...PERMITIDAS.save_my_preferences(), p_usar_en_agente: false })
    expect(sobrecarga.error?.code).toBe('PGRST202')
    // El helper nuevo es privado.
    const helper = await rpcCrudo(O, 'validar_preferencias_propias', { p: TOMI })
    expect(helper.error?.code).toBe('PGRST202')
  })
})
