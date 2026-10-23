// Pruebas críticas: conexión (C0), privacidad, interés sin compromiso, sin opción, fuera de audiencia,
// validaciones de creación e idempotencia de create_proposal. Espacios propios con prefijo "t-".
import { beforeAll, describe, expect, it } from 'vitest'
import {
  clienteSinSesion, crearEspacioPrueba, crearPropuesta, err, FRANJAS, intento, nuevaSesion, ok, PLAZO, rpc,
  simulado, type Json, type Sesion,
} from './helpers'

describe('privacidad y audiencia', { timeout: 60_000 }, () => {
  let T: Sesion // organizador real
  let L: Sesion // miembro real
  let X: Sesion // tercera sesión, al principio fuera del espacio
  let esp: { espacioId: string; codigo: string; miembroId: string }
  let lunaId: string
  let matiId: string
  let prop: string

  beforeAll(async () => {
    ;[T, L, X] = await Promise.all([nuevaSesion(), nuevaSesion(), nuevaSesion()])
    esp = await crearEspacioPrueba(T, 'privacidad', 'Tomi t')
    const j = await ok(L, 'join_space', { p_codigo: esp.codigo.toLowerCase(), p_nombre_visible: 'Luna t' })
    lunaId = j.resultado.miembro_id
    matiId = await simulado(T, esp.espacioId, 'Mati t')
  }, 60_000)

  it('C0: server_info, sesión inválida sin sesión y tablas inaccesibles', async () => {
    const info = await ok(T, 'server_info')
    expect(info.contrato).toBe(1)
    expect(info.sesion.autenticada).toBe(true)
    expect(info.servidor_ahora.utc).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)

    const anon = clienteSinSesion()
    const r = await rpc(anon, 'create_space', { p_nombre: 't-x', p_tipo: 'amigos', p_nombre_visible: 'x' })
    expect(err(r)).toBe('sesion_invalida/sin_sesion')
    expect(r.state_rev).toBeNull()

    // Consulta directa a tablas desde el cliente: error o 0 filas.
    for (const c of [anon, L.c]) {
      const a = await c.from('condiciones').select('*')
      expect(a.error !== null || (a.data ?? []).length === 0).toBe(true)
      const b = await c.schema('cruce').from('condiciones').select('*')
      expect(b.error !== null || (b.data ?? []).length === 0).toBe(true)
    }
  })

  it('validaciones de create_proposal e idempotencia por intento', async () => {
    const base = {
      p_espacio_id: esp.espacioId, p_titulo: 't-validacion', p_franjas: FRANJAS, p_minimo: 2, p_maximo: 4,
      p_imprescindible_id: esp.miembroId, p_plazo: PLAZO, p_zona_horaria: 'America/Santiago',
    }
    expect(err(await rpc(T, 'create_proposal', { ...base, p_franjas: [...FRANJAS, FRANJAS[0]], p_intento_id: intento() })))
      .toBe('entrada_incompleta/franjas_invalidas')
    expect(err(await rpc(T, 'create_proposal', { ...base, p_minimo: 5, p_maximo: 4, p_intento_id: intento() })))
      .toBe('entrada_incompleta/cupos_invalidos')
    expect(err(await rpc(T, 'create_proposal', { ...base, p_zona_horaria: 'UTC', p_intento_id: intento() })))
      .toBe('entrada_incompleta/zona_horaria_no_soportada')
    expect(err(await rpc(T, 'create_proposal', { ...base, p_plazo: '2026-12-07T20:00', p_intento_id: intento() })))
      .toBe('entrada_incompleta/plazo_invalido')
    expect(err(await rpc(T, 'create_proposal', { ...base, p_plazo: '29/10/2026', p_intento_id: intento() })))
      .toBe('entrada_incompleta/formato_invalido')

    // Mismo intento dos veces en paralelo: una sola propuesta.
    const i = intento()
    const [a, b] = await Promise.all([
      rpc(T, 'create_proposal', { ...base, p_intento_id: i }),
      rpc(T, 'create_proposal', { ...base, p_intento_id: i }),
    ])
    expect(a.ok && b.ok).toBe(true)
    expect(a.resultado.propuesta_id).toBe(b.resultado.propuesta_id)
    expect([a.resultado.repetido, b.resultado.repetido].sort()).toEqual([false, true])
    // Mismo intento con otros parámetros: intento_reutilizado.
    expect(err(await rpc(T, 'create_proposal', { ...base, p_titulo: 't-otro', p_intento_id: i })))
      .toBe('entrada_incompleta/intento_reutilizado')
    // Otra persona del espacio puede ser imprescindible; alguien ajeno no.
    const ajeno = await rpc(T, 'create_proposal', { ...base, p_imprescindible_id: intento(), p_intento_id: intento() })
    expect(err(ajeno)).toBe('entrada_incompleta/imprescindible_invalido')
  })

  it('interés sin compromiso: 2 interesados, 0 confirmados, sin opción publicada', async () => {
    prop = await crearPropuesta(T, esp.espacioId, esp.miembroId, { minimo: 2, maximo: 4 })
    await ok(L, 'mark_interest', { p_propuesta_id: prop, p_interesado: true })
    const r = await ok(T, 'simulate_mark_interest', { p_propuesta_id: prop, p_miembro_id: matiId, p_interesado: true })
    expect(r.resultado.simulado).toBe(true)
    const s = (await ok(L, 'get_proposal_state', { p_propuesta_id: prop })).propuesta
    expect(s.interesados.cantidad).toBe(2)
    expect(s.confirmados).toBe(0)
    expect(s.opcion).toBeNull()
    expect(s.estado).toBe('reuniendo_interes')
    // Repetir no cambia nada ni sube state_rev.
    const rep = await ok(L, 'mark_interest', { p_propuesta_id: prop, p_interesado: true })
    expect(rep.resultado.repetido).toBe(true)
    expect(rep.propuesta.state_rev).toBe(s.state_rev)
  })

  it('privacidad: nadie lee condiciones ajenas', async () => {
    // Condiciones distintivas: Tomi solo B, Luna A y B, Mati (simulado) solo A.
    const t = await ok(T, 'save_my_conditions', { p_propuesta_id: prop, p_disponibilidad: { A: 'no', B: 'si' } })
    expect(t.condiciones.disponibilidad).toEqual({ A: 'no', B: 'si' })
    const revAntes = t.propuesta.state_rev
    const l = await ok(L, 'save_my_conditions', { p_propuesta_id: prop, p_disponibilidad: { A: 'si', B: 'si' } })
    expect(l.propuesta.state_rev).toBe(revAntes) // guardar condiciones no sube state_rev
    await ok(T, 'simulate_save_conditions', { p_propuesta_id: prop, p_miembro_id: matiId, p_disponibilidad: { A: 'si', B: 'no' } })

    const mias = await ok(L, 'get_my_conditions', { p_propuesta_id: prop })
    expect(mias.condiciones.disponibilidad).toEqual({ A: 'si', B: 'si' })
    expect(mias.condiciones.estado).toBe('completas')

    const vistas: Json[] = [
      l,
      mias,
      await ok(L, 'get_proposal_state', { p_propuesta_id: prop }),
      await ok(L, 'list_proposals', { p_espacio_id: esp.espacioId }),
      await ok(L, 'get_space', { p_espacio_id: esp.espacioId }),
      await rpc(L, 'get_simulation_panel', { p_propuesta_id: prop }),
      await rpc(L, 'simulate_save_conditions', { p_propuesta_id: prop, p_miembro_id: matiId, p_disponibilidad: { A: 'no' } }),
      await rpc(L, 'save_my_conditions', { p_propuesta_id: prop, p_disponibilidad: { C: 'si' } }),
    ]
    expect(err(vistas[5])).toBe('no_autorizado/no_es_organizador_espacio')
    expect(err(vistas[6])).toBe('no_autorizado/no_es_organizador_espacio')
    expect(err(vistas[7])).toBe('entrada_incompleta/disponibilidad_invalida')

    for (const v of vistas) {
      const txt = JSON.stringify(v)
      expect(txt).not.toContain(T.userId) // ids de Auth nunca salen
      expect(txt).not.toContain(L.userId)
      expect(txt).not.toContain('user_id')
    }
    // Solo las respuestas propias (save y get_my_conditions) traen disponibilidad, y es la de Luna.
    for (const v of vistas.slice(2)) expect(JSON.stringify(v)).not.toContain('"disponibilidad":')
    const estado = vistas[2].propuesta
    expect(estado.personas_con_condiciones).toBe(3)
    expect(JSON.stringify(estado)).not.toMatch(/"(si|no|pendiente)"/)
    expect(JSON.stringify(estado)).not.toContain('incompletas')

    // El organizador ve solo simulados en el panel, y no puede simular a un miembro real.
    const panel = await ok(T, 'get_simulation_panel', { p_propuesta_id: prop })
    const nombres = panel.simulacion.miembros.map((m: Json) => m.miembro.nombre)
    expect(nombres).toEqual(['Mati t'])
    expect(panel.simulacion.rotulo).toBe('Simulación')
    const real = await rpc(T, 'simulate_save_conditions', { p_propuesta_id: prop, p_miembro_id: lunaId, p_disponibilidad: { A: 'no', B: 'no' } })
    expect(err(real)).toBe('no_autorizado/miembro_no_simulado')
  })

  it('fuera de audiencia: no miembro y no elegible en la versión', async () => {
    // X todavía no es miembro.
    expect(err(await rpc(X, 'get_space', { p_espacio_id: esp.espacioId }))).toBe('fuera_de_audiencia/no_miembro')
    expect(err(await rpc(X, 'get_proposal_state', { p_propuesta_id: prop }))).toBe('fuera_de_audiencia/no_miembro')
    expect(err(await rpc(X, 'list_proposals', { p_espacio_id: esp.espacioId }))).toBe('fuera_de_audiencia/no_miembro')
    expect(err(await rpc(X, 'get_my_conditions', { p_propuesta_id: prop }))).toBe('fuera_de_audiencia/no_miembro')
    const ajena = await rpc(X, 'accept_version', { p_propuesta_id: prop, p_version: 1, p_intento_id: intento() })
    expect(err(ajena)).toBe('fuera_de_audiencia/no_miembro')
    expect(ajena.state_rev).toBeNull()
    expect(err(await rpc(X, 'join_space', { p_codigo: 'ZZZZZZZZ', p_nombre_visible: 'Equis' }))).toBe('fuera_de_audiencia/codigo_inexistente')
    expect(err(await rpc(X, 'join_space', { p_codigo: esp.codigo, p_nombre_visible: ' luna T ' }))).toBe('entrada_incompleta/nombre_en_uso')

    // Publica: B es la única viable (Tomi no está en A). Elegibles B: Tomi y Luna.
    const ev = await ok(T, 'evaluate_and_publish', { p_propuesta_id: prop, p_intento_id: intento() })
    expect(ev.resultado).toMatchObject({ tipo: 'opcion_publicada', version: 1, franja: 'B' })
    expect(ev.propuesta.opcion.cupos.pendientes).toBe(2)

    // Mati (solo A) no es elegible en la versión 1.
    const m = await rpc(T, 'simulate_accept', { p_propuesta_id: prop, p_miembro_id: matiId, p_version: 1, p_intento_id: intento() })
    expect(err(m)).toBe('fuera_de_audiencia/no_elegible_en_version')
    expect(m.state_rev).toBe(ev.propuesta.state_rev)

    // X se une después de publicada: entra a la audiencia pero no a la versión 1.
    await ok(X, 'join_space', { p_codigo: esp.codigo, p_nombre_visible: 'Equis t' })
    const sx = (await ok(X, 'get_proposal_state', { p_propuesta_id: prop })).propuesta
    expect(sx.mi_situacion.elegible_en_version).toBe(false)
    expect(sx.mi_situacion.puede.aceptar).toBe(false)
    const x = await rpc(X, 'accept_version', { p_propuesta_id: prop, p_version: 1, p_intento_id: intento() })
    expect(err(x)).toBe('fuera_de_audiencia/no_elegible_en_version')

    // Luna sabe que es elegible; sus condiciones quedan congeladas mientras la versión esté vigente.
    const sl = (await ok(L, 'get_proposal_state', { p_propuesta_id: prop })).propuesta
    expect(sl.mi_situacion.elegible_en_version).toBe(true)
    const cong = await rpc(L, 'save_my_conditions', { p_propuesta_id: prop, p_disponibilidad: { A: 'no', B: 'no' } })
    expect(err(cong)).toBe('no_autorizado/condiciones_congeladas')
  })

  it('sin opción compatible: el imprescindible sin disponibilidad no baja el mínimo', async () => {
    const p2 = await crearPropuesta(T, esp.espacioId, esp.miembroId, { minimo: 2, maximo: 4, titulo: 't-sin-opcion' })
    await ok(T, 'save_my_conditions', { p_propuesta_id: p2, p_disponibilidad: { A: 'no', B: 'no' } })
    await ok(L, 'save_my_conditions', { p_propuesta_id: p2, p_disponibilidad: { A: 'si', B: 'si' } })
    await ok(T, 'simulate_save_conditions', { p_propuesta_id: p2, p_miembro_id: matiId, p_disponibilidad: { A: 'si', B: 'si' } })
    const r = await ok(T, 'evaluate_and_publish', { p_propuesta_id: p2, p_intento_id: intento() })
    expect(r.resultado).toMatchObject({ tipo: 'sin_opcion', version: null, franja: null })
    expect(r.propuesta.estado).toBe('reuniendo_interes')
    expect(r.propuesta.opcion).toBeNull()
    expect(r.propuesta.minimo).toBe(2)
    expect(r.propuesta.ultima_evaluacion).toMatchObject({ resultado: 'sin_opcion', version: null })
    expect(r.propuesta.siguiente_accion.codigo).toBe('sin_opcion')
    // Luna ve el resultado pero no el motivo.
    const sl = await ok(L, 'get_proposal_state', { p_propuesta_id: p2 })
    expect(JSON.stringify(sl)).not.toMatch(/"(si|no)"/)
  })
})
