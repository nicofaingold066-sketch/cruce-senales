// Solo grupos ficticios creados por estas sesiones de prueba. Sin modelo ni servicios externos.
// La comprobación física de cascadas y rollback requiere además un arnés SQL local privilegiado.
import { beforeAll, describe, expect, it } from 'vitest'
import {
  clienteSinSesion, crearEspacioPrueba, crearPropuesta, err, intento, nuevaSesion, ok,
  PERMITIDAS, rpc, rpcCrudo, TOTAL_PERMITIDAS, type Json, type Sesion,
} from './helpers'

const PREF = {
  presupuesto: 'da_igual', energia: 'con_todo', ambiente: 'da_igual', lugar: 'da_igual',
  me_gustaria: ['asado', 'cena'], usar_en_agente: true,
}
const SI = { A: 'si', B: 'si' }
const Z = '00000000-0000-4000-8000-000000000000'

describe('eliminar un grupo: solo administrador, atómico e idempotente', { timeout: 180_000 }, () => {
  let O: Sesion
  let A: Sesion
  let B: Sesion
  let X: Sesion
  let sabado: string

  beforeAll(async () => {
    ;[O, A, B, X] = await Promise.all([nuevaSesion(), nuevaSesion(), nuevaSesion(), nuevaSesion()])
    const hoy = (await ok(O, 'server_info')).servidor_ahora.local.slice(0, 10)
    const d = new Date(`${hoy}T00:00:00Z`)
    do d.setUTCDate(d.getUTCDate() + 1)
    while (d.getUTCDay() !== 6)
    sabado = d.toISOString().slice(0, 10)
  }, 60_000)

  async function grupo(nombre: string) {
    const g = await crearEspacioPrueba(O, `eliminar-${nombre}`, 'Organiza ficticio')
    const a = await ok(A, 'join_space', { p_codigo: g.codigo, p_nombre_visible: 'Luna ficticia' })
    return { ...g, a: a.resultado.miembro_id as string }
  }

  const borrar = (s: Sesion, id: string, i = intento()) =>
    rpc(s, 'delete_space', { p_espacio_id: id, p_intento_id: i })

  it('catálogo 43/0, sin sesión y argumentos incompletos', async () => {
    expect(TOTAL_PERMITIDAS).toBe(43)
    expect(Object.keys(PERMITIDAS)).toHaveLength(43)
    expect((await rpcCrudo(clienteSinSesion(), 'delete_space', {
      p_espacio_id: Z, p_intento_id: intento(),
    })).error?.code).toBe('42501')
    for (const args of [
      { p_espacio_id: null, p_intento_id: intento() },
      { p_espacio_id: Z, p_intento_id: null },
    ]) expect(err(await rpc(O, 'delete_space', args))).toBe('entrada_incompleta/formato_invalido')
    expect(err(await borrar(O, Z))).toBe('fuera_de_audiencia/no_miembro')
  })

  it('miembro, externo y exmiembro no borran; organizar un plan no convierte en administrador del grupo', async () => {
    const g = await grupo('permisos')
    const p = await crearPropuesta(A, g.espacioId, g.a, { minimo: 2, maximo: 2 })
    expect(err(await borrar(A, g.espacioId))).toBe('no_autorizado/no_es_organizador_espacio')
    expect(err(await borrar(X, g.espacioId))).toBe('fuera_de_audiencia/no_miembro')
    await ok(A, 'cancel_proposal', { p_propuesta_id: p })
    await ok(A, 'leave_space', { p_espacio_id: g.espacioId, p_intento_id: intento() })
    expect(err(await borrar(A, g.espacioId))).toBe('fuera_de_audiencia/no_miembro')
    expect((await ok(O, 'get_space', { p_espacio_id: g.espacioId })).espacio.id).toBe(g.espacioId)
    expect((await borrar(O, g.espacioId)).ok).toBe(true)
  })

  it('borra planes confirmados, historial, preferencias e invitaciones; revoca acceso y código para todos', async () => {
    const g = await grupo('completo')
    await ok(B, 'join_space', { p_codigo: g.codigo, p_nombre_visible: 'Mati ficticio' })
    const p = await crearPropuesta(O, g.espacioId, g.miembroId, { minimo: 2, maximo: 3 })
    for (const s of [O, A, B]) {
      await ok(s, 'save_my_preferences', { p_espacio_id: g.espacioId, p_preferencias: PREF })
      await ok(s, 'save_my_conditions', { p_propuesta_id: p, p_disponibilidad: SI })
    }
    await ok(O, 'evaluate_and_publish', { p_propuesta_id: p, p_intento_id: intento() })
    await ok(A, 'opinar_version', { p_propuesta_id: p, p_version: 1, p_opinion: 'asi_no_puedo', p_intento_id: intento() })
    for (const s of [O, A, B]) await ok(s, 'accept_version', { p_propuesta_id: p, p_version: 1, p_intento_id: intento() })
    await ok(B, 'withdraw_commitment', { p_propuesta_id: p })
    expect((await ok(O, 'get_proposal_state', { p_propuesta_id: p })).propuesta.estado).toBe('grupo_confirmado')

    await ok(A, 'set_recibir_invitaciones_agente', { p_espacio_id: g.espacioId, p_recibir: true })
    await ok(O, 'set_politica_agente_social', { p_espacio_id: g.espacioId, p_modo: 'aprobacion', p_intento_id: intento() })
    const ej = intento()
    await ok(O, 'iniciar_ejecucion_agente', {
      p_espacio_id: g.espacioId, p_ejecucion_id: ej, p_oportunidad: `sabado:${sabado}`, p_parametros_hash: 'eliminar-ficticio',
    })
    const [op] = (await ok(O, 'agente_social_candidatos', {
      p_espacio_id: g.espacioId, p_sabado: sabado, p_clima: { sabado: 'seco', domingo: 'seco' },
    })).opciones
    const borrador = await ok(O, 'guardar_borrador_agente', {
      p_ejecucion_id: ej, p_opcion_ref: op.opcion_ref, p_texto: 'Un encuentro ficticio para este grupo. Cada persona confirma si puede.',
    })
    await ok(O, 'aprobar_borrador_agente', { p_ejecucion_id: ej, p_borrador_hash: borrador.borrador.hash, p_intento_id: intento() })
    const publicado = await ok(O, 'publicar_borrador_agente', {
      p_ejecucion_id: ej, p_borrador_hash: borrador.borrador.hash, p_intento_id: intento(),
    })
    expect(publicado.invitados).toBe(1)

    const res = await borrar(O, g.espacioId)
    expect(res.ok).toBe(true)
    expect(res.resultado).toEqual({ espacio_id: g.espacioId, eliminado: true, repetido: false })
    expect(res).not.toHaveProperty('espacio')
    expect(res).not.toHaveProperty('propuesta')
    for (const s of [O, A, B]) {
      expect((await ok(s, 'list_my_spaces')).espacios.some((e: Json) => e.id === g.espacioId)).toBe(false)
      for (const [fn, args] of [
        ['get_space', { p_espacio_id: g.espacioId }],
        ['list_proposals', { p_espacio_id: g.espacioId }],
        ['get_my_preferences', { p_espacio_id: g.espacioId }],
        ['get_proposal_state', { p_propuesta_id: p }],
        ['get_proposal_state', { p_propuesta_id: publicado.propuesta.id }],
        ['mark_interest', { p_propuesta_id: p, p_interesado: true }],
        ['agente_social_contexto', { p_espacio_id: g.espacioId }],
      ] as const) expect(err(await rpc(s, fn, args)), fn).toBe('fuera_de_audiencia/no_miembro')
    }
    expect(err(await rpc(X, 'preview_space_by_code', { p_codigo: g.codigo }))).toBe('fuera_de_audiencia/codigo_inexistente')
    expect(err(await rpc(X, 'join_space', { p_codigo: g.codigo, p_nombre_visible: 'Nuevo ficticio' }))).toBe('fuera_de_audiencia/codigo_inexistente')
  })

  it('mismo intento recupera éxito después del borrado; otra sesión y otro intento no reciben ese recibo', async () => {
    const g = await grupo('reintento')
    const i = intento()
    expect((await borrar(O, g.espacioId, i)).resultado.repetido).toBe(false)
    const repetido = await borrar(O, g.espacioId, i)
    expect(repetido.resultado).toEqual({ espacio_id: g.espacioId, eliminado: true, repetido: true })
    expect(JSON.stringify(repetido)).not.toContain('Organiza ficticio')
    expect(err(await borrar(A, g.espacioId, i))).toBe('fuera_de_audiencia/no_miembro')
    expect(err(await borrar(O, g.espacioId))).toBe('fuera_de_audiencia/no_miembro')
  })

  it('reutilizar un intento en otro grupo u operación nunca borra el otro grupo', async () => {
    const g1 = await grupo('aislado-uno')
    const g2 = await grupo('aislado-dos')
    await ok(A, 'save_my_preferences', { p_espacio_id: g2.espacioId, p_preferencias: PREF })
    const p = await crearPropuesta(O, g2.espacioId, g2.miembroId, { minimo: 2, maximo: 2 })
    const antes = await ok(O, 'get_space', { p_espacio_id: g2.espacioId })
    const i = intento()
    await borrar(O, g1.espacioId, i)
    expect(err(await borrar(O, g2.espacioId, i))).toBe('entrada_incompleta/intento_reutilizado')
    expect((await ok(O, 'get_space', { p_espacio_id: g2.espacioId })).espacio).toEqual(antes.espacio)
    expect((await ok(A, 'get_my_preferences', { p_espacio_id: g2.espacioId })).preferencias.me_gustaria).toEqual(PREF.me_gustaria)
    expect((await ok(A, 'get_proposal_state', { p_propuesta_id: p })).propuesta.id).toBe(p)
    const ip = intento()
    await ok(O, 'set_politica_agente_social', { p_espacio_id: g2.espacioId, p_modo: 'aprobacion', p_intento_id: ip })
    expect(err(await borrar(O, g2.espacioId, ip))).toBe('entrada_incompleta/intento_reutilizado')
    await borrar(O, g2.espacioId)
  })

  it('dos solicitudes del mismo intento devuelven un éxito nuevo y uno repetido', async () => {
    // Contra Postgres remoto son dos solicitudes independientes; PGlite las serializa y solo verifica el replay.
    const g = await grupo('doble')
    const i = intento()
    const res = await Promise.all([borrar(O, g.espacioId, i), borrar(O, g.espacioId, i)])
    expect(res.every(r => r.ok)).toBe(true)
    expect(res.map(r => r.resultado.repetido).sort()).toEqual([false, true])
  })
})
