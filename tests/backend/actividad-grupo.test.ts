// Actividad compartida: solo movimientos con nombre. Condiciones/opiniones y E13 del plan siguen privados.
// Ejecutar contra la base únicamente después de aplicar la migración de actividad y tomar turno de pruebas.
import { beforeAll, describe, expect, it } from 'vitest'
import {
  clienteSinSesion, crearEspacioPrueba, crearPropuesta, err, FRANJAS, intento, nuevaSesion, ok,
  PERMITIDAS, PLAZO, rpc, rpcCrudo, TOTAL_PERMITIDAS, type Json, type Sesion,
} from './helpers'

const SI = { A: 'si', B: 'si' }
const PREF = {
  presupuesto: 'da_igual', energia: 'con_todo', ambiente: 'da_igual', lugar: 'da_igual',
  me_gustaria: ['asado'], usar_en_agente: true,
}

describe('actividad del grupo: ingresos, bajas de planes y salida real', { timeout: 180_000 }, () => {
  let O: Sesion
  let A: Sesion
  let B: Sesion
  let X: Sesion

  beforeAll(async () => {
    ;[O, A, B, X] = await Promise.all([nuevaSesion(), nuevaSesion(), nuevaSesion(), nuevaSesion()])
  }, 60_000)

  async function grupo(nombre: string) {
    const g = await crearEspacioPrueba(O, `actividad-${nombre}`, 'Organiza ficticio')
    const a = await ok(A, 'join_space', { p_codigo: g.codigo, p_nombre_visible: 'Luna ficticia' })
    const b = await ok(B, 'join_space', { p_codigo: g.codigo, p_nombre_visible: 'Mati ficticio' })
    return { ...g, a: a.resultado.miembro_id as string, b: b.resultado.miembro_id as string }
  }

  const espacio = async (s: Sesion, id: string) => (await ok(s, 'get_space', { p_espacio_id: id })).espacio
  const estado = async (s: Sesion, id: string) => (await ok(s, 'get_proposal_state', { p_propuesta_id: id })).propuesta

  async function plan(g: Awaited<ReturnType<typeof grupo>>, titulo: string) {
    const id = await crearPropuesta(O, g.espacioId, g.miembroId, { minimo: 2, maximo: 3, titulo })
    for (const s of [O, A, B]) await ok(s, 'save_my_conditions', { p_propuesta_id: id, p_disponibilidad: SI })
    const ev = await ok(O, 'evaluate_and_publish', { p_propuesta_id: id, p_intento_id: intento() })
    expect(ev.resultado.tipo).toBe('opcion_publicada')
    await ok(O, 'accept_version', { p_propuesta_id: id, p_version: 1, p_intento_id: intento() })
    const aceptarA = intento()
    await ok(A, 'accept_version', { p_propuesta_id: id, p_version: 1, p_intento_id: aceptarA })
    return { id, aceptarA }
  }

  it('reclamar pendiente registra un solo ingreso real; todos los miembros ven una proyección cerrada', async () => {
    const c = await ok(O, 'create_space', {
      p_nombre: `t-actividad-pendiente-${intento().slice(0, 6)}`, p_tipo: 'amigos',
      p_nombre_visible: 'Organiza ficticio', p_integrantes: ['Luna ficticia', 'Por entrar ficticio'],
    })
    const g = c.espacio
    expect(g.actividad).toEqual([])
    const a = g.miembros.find((m: Json) => m.nombre === 'Luna ficticia').miembro_id
    await ok(A, 'join_space', { p_codigo: g.codigo_invitacion, p_nombre_visible: '', p_miembro_id: a })
    await ok(A, 'join_space', { p_codigo: g.codigo_invitacion, p_nombre_visible: 'Luna ficticia' })
    const deO = (await espacio(O, g.id)).actividad
    expect(deO).toHaveLength(1)
    expect(deO[0]).toMatchObject({
      tipo: 'miembro_unido', miembro: { miembro_id: a, nombre: 'Luna ficticia', simulado: false }, plan: null,
    })
    expect((await espacio(A, g.id)).actividad).toEqual(deO)
    for (const e of deO) {
      expect(Object.keys(e).sort()).toEqual(['en', 'id', 'miembro', 'plan', 'tipo'])
      expect(Object.keys(e.miembro).sort()).toEqual(['miembro_id', 'nombre', 'simulado'])
      expect(Object.keys(e.en).sort()).toEqual(['local', 'utc'])
    }
    const texto = JSON.stringify(deO)
    for (const privado of ['user_id', 'usuario_original_id', 'habia_aceptado', 'condiciones', 'opinion', 'preferencias', O.userId, A.userId]) {
      expect(texto).not.toContain(privado)
    }
    expect(err(await rpc(X, 'get_space', { p_espacio_id: g.id }))).toBe('fuera_de_audiencia/no_miembro')
    expect(await ok(X, 'preview_space_by_code', { p_codigo: g.codigo_invitacion })).not.toHaveProperty('actividad')
  })

  it('la baja del plan tiene nombre en la actividad y sigue redactada en el detalle E13', async () => {
    const g = await grupo('baja')
    const p = await plan(g, 'Encuentro ficticio de prueba')
    await ok(A, 'withdraw_commitment', { p_propuesta_id: p.id })
    await ok(A, 'withdraw_commitment', { p_propuesta_id: p.id })
    const deO = (await espacio(O, g.espacioId)).actividad
    const bajas = deO.filter((e: Json) => e.tipo === 'baja_plan')
    expect(bajas).toHaveLength(1)
    expect(bajas[0]).toMatchObject({
      miembro: { miembro_id: g.a, nombre: 'Luna ficticia' },
      plan: { id: p.id, titulo: 'Encuentro ficticio de prueba' },
    })
    expect(Object.keys(bajas[0].plan).sort()).toEqual(['id', 'titulo'])
    expect(JSON.stringify(bajas)).not.toContain('habia_aceptado')
    expect((await espacio(B, g.espacioId)).actividad).toEqual(deO)
    const detalle = await estado(O, p.id)
    expect(detalle.bajas[0]).toMatchObject({
      miembro: { miembro_id: null, nombre: 'Una persona' }, habia_aceptado: null,
    })
    expect((await espacio(A, g.espacioId)).miembros.some((m: Json) => m.miembro_id === g.a)).toBe(true)
    await ok(O, 'cancel_proposal', { p_propuesta_id: p.id })
  })

  it('salir retira atómicamente de dos planes, conserva historia y revoca lecturas, mutaciones y replays', async () => {
    const g = await grupo('salida')
    const p1 = await plan(g, 'Primer encuentro ficticio')
    const p2 = await plan(g, 'Segundo encuentro ficticio')
    const sinParticipar = await crearPropuesta(O, g.espacioId, g.miembroId, { minimo: 2, maximo: 3, titulo: 'Todavía sin participar' })
    const salida = intento()
    const salir = await ok(A, 'leave_space', { p_espacio_id: g.espacioId, p_intento_id: salida })
    expect(salir.resultado).toEqual({ espacio_id: g.espacioId, miembro_id: g.a, repetido: false })
    expect(salir).not.toHaveProperty('espacio')
    expect((await ok(A, 'leave_space', { p_espacio_id: g.espacioId, p_intento_id: salida })).resultado.repetido).toBe(true)
    expect((await ok(A, 'leave_space', { p_espacio_id: g.espacioId, p_intento_id: intento() })).resultado.repetido).toBe(true)
    const deO = await espacio(O, g.espacioId)
    expect(deO.miembros.some((m: Json) => m.miembro_id === g.a)).toBe(false)
    expect(deO.actividad.filter((e: Json) => e.tipo === 'miembro_salio' && e.miembro.miembro_id === g.a)).toHaveLength(1)
    expect(deO.actividad.filter((e: Json) => e.tipo === 'baja_plan' && e.miembro.miembro_id === g.a)).toHaveLength(2)
    expect(deO.actividad.some((e: Json) => e.tipo === 'baja_plan' && e.plan.id === sinParticipar)).toBe(false)
    for (const p of [p1, p2]) {
      const despues = await estado(O, p.id)
      expect(despues.estado).toBe('en_revision')
      expect(despues.confirmados).toBe(1)
      expect(despues.bajas).toHaveLength(1)
    }
    expect((await ok(A, 'list_my_spaces')).espacios.some((e: Json) => e.id === g.espacioId)).toBe(false)
    const args: Record<string, Record<string, unknown>> = {
      get_space: { p_espacio_id: g.espacioId }, list_proposals: { p_espacio_id: g.espacioId },
      get_proposal_state: { p_propuesta_id: p1.id }, mark_interest: { p_propuesta_id: p1.id, p_interesado: true },
      get_my_conditions: { p_propuesta_id: p1.id }, save_my_conditions: { p_propuesta_id: p1.id, p_disponibilidad: SI },
      accept_version: { p_propuesta_id: p1.id, p_version: 1, p_intento_id: p1.aceptarA },
      withdraw_commitment: { p_propuesta_id: p1.id }, get_my_preferences: { p_espacio_id: g.espacioId },
      save_my_preferences: { p_espacio_id: g.espacioId, p_preferencias: PREF },
      set_recibir_invitaciones_agente: { p_espacio_id: g.espacioId, p_recibir: true },
    }
    for (const [fn, a] of Object.entries(args)) {
      expect(err(await rpc(A, fn, a)), fn).toBe('fuera_de_audiencia/no_miembro')
    }
    // Todas las demás entradas dirigidas a grupo/propuesta tampoco pueden devolver contenido ni mutar.
    // 0058: seed_demo_makana es global como seed_demo_space (no recibe grupo; crea el demo Makana del usuario).
    const globales = new Set(['server_info', 'create_space', 'join_space', 'preview_space_by_code', 'list_my_spaces', 'seed_demo_space', 'seed_demo_makana', 'leave_space'])
    for (const [fn, entrada] of Object.entries(PERMITIDAS)) {
      if (globales.has(fn) || args[fn]) continue
      const a = entrada()
      if ('p_espacio_id' in a) a.p_espacio_id = g.espacioId
      if ('p_propuesta_id' in a) a.p_propuesta_id = p1.id
      const r = await rpc(A, fn, a)
      expect(r.ok, fn).toBe(false)
      expect(r, fn).not.toHaveProperty('espacio')
      expect(r, fn).not.toHaveProperty('propuesta')
    }
    const prev = await ok(X, 'preview_space_by_code', { p_codigo: g.codigo })
    expect(prev.miembros.some((m: Json) => m.miembro_id === g.a)).toBe(false)
    expect(prev).not.toHaveProperty('actividad')
    expect(err(await rpc(X, 'join_space', { p_codigo: g.codigo, p_nombre_visible: 'Luna ficticia', p_miembro_id: g.a }))).toBe('no_autorizado/miembro_ya_reclamado')
    for (const id of [p1.id, p2.id, sinParticipar]) await ok(O, 'cancel_proposal', { p_propuesta_id: id })
  })

  it('solo la misma sesión reingresa y un intento viejo de salida nunca vuelve a ejecutarse', async () => {
    const g = await grupo('reingreso')
    const p = await plan(g, 'Plan anterior al reingreso')
    const salida = intento()
    await ok(A, 'leave_space', { p_espacio_id: g.espacioId, p_intento_id: salida })
    const reingreso = await ok(A, 'join_space', { p_codigo: g.codigo, p_nombre_visible: 'Luna ficticia' })
    expect(reingreso.resultado.miembro_id).toBe(g.a)
    expect(reingreso.resultado.reingreso).toBe(true)
    expect((await estado(A, p.id)).mi_situacion.retirado).toBe(true)
    expect((await estado(A, p.id)).mi_situacion.puede.aceptar).toBe(false)
    await ok(A, 'leave_space', { p_espacio_id: g.espacioId, p_intento_id: salida })
    expect((await espacio(A, g.espacioId)).mi_miembro_id).toBe(g.a)
    const a = (await espacio(O, g.espacioId)).actividad
    expect(a.filter((e: Json) => e.tipo === 'miembro_unido' && e.miembro.miembro_id === g.a)).toHaveLength(2)
    expect(a.filter((e: Json) => e.tipo === 'miembro_salio' && e.miembro.miembro_id === g.a)).toHaveLength(1)
    await ok(O, 'cancel_proposal', { p_propuesta_id: p.id })
  })

  it('ningún organizador deja planes activos sin responsable; el rechazo no genera movimientos', async () => {
    const g = await grupo('organizador')
    const antes = (await espacio(O, g.espacioId)).actividad
    const noSaleO = await rpc(O, 'leave_space', { p_espacio_id: g.espacioId, p_intento_id: intento() })
    expect(err(noSaleO)).toBe('no_autorizado/organizador_no_puede_salir')
    expect(noSaleO.error.mensaje).toContain('organiza el grupo')
    const crearIntento = intento()
    const params = {
      p_espacio_id: g.espacioId, p_titulo: 'Plan organizado por miembro ficticio', p_franjas: FRANJAS,
      p_minimo: 2, p_maximo: 3, p_imprescindible_id: g.a, p_plazo: PLAZO,
      p_zona_horaria: 'America/Santiago', p_intento_id: crearIntento,
    }
    const p = await ok(A, 'create_proposal', params)
    const noSaleA = await rpc(A, 'leave_space', { p_espacio_id: g.espacioId, p_intento_id: intento() })
    expect(err(noSaleA)).toBe('no_autorizado/organizador_con_planes_activos')
    expect((await espacio(O, g.espacioId)).actividad).toEqual(antes)
    await ok(A, 'cancel_proposal', { p_propuesta_id: p.resultado.propuesta_id })
    await ok(A, 'leave_space', { p_espacio_id: g.espacioId, p_intento_id: intento() })
    expect(err(await rpc(A, 'create_proposal', params))).toBe('fuera_de_audiencia/no_miembro')
    const imprescindibleSalido = await rpc(O, 'create_proposal', { ...params, p_imprescindible_id: g.a, p_intento_id: intento() })
    expect(err(imprescindibleSalido)).toBe('entrada_incompleta/imprescindible_invalido')
  })

  // 0058 (demo Makana) suma seed_demo_makana: el catálogo pasa de 42 a 43 (ver demo-makana.test.ts).
  it('catálogo 43/0 y argumentos de salida; un intento no puede reutilizarse en otro grupo', async () => {
    expect(TOTAL_PERMITIDAS).toBe(43)
    expect(Object.keys(PERMITIDAS)).toHaveLength(43)
    expect((await rpcCrudo(clienteSinSesion(), 'leave_space', {
      p_espacio_id: '00000000-0000-4000-8000-000000000000', p_intento_id: intento(),
    })).error?.code).toBe('42501')
    const g1 = await grupo('intento-uno')
    const g2 = await grupo('intento-dos')
    const i = intento()
    await ok(A, 'leave_space', { p_espacio_id: g1.espacioId, p_intento_id: i })
    expect(err(await rpc(A, 'leave_space', { p_espacio_id: g2.espacioId, p_intento_id: i }))).toBe('entrada_incompleta/intento_reutilizado')
    expect((await espacio(A, g2.espacioId)).mi_miembro_id).toBe(g2.a)
    expect(err(await rpc(X, 'leave_space', { p_espacio_id: g2.espacioId, p_intento_id: intento() }))).toBe('fuera_de_audiencia/no_miembro')
  })
})
