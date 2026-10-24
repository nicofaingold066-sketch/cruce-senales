// Puertos E11 simulados: no red, Supabase, SDK ni modelo reales.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { orquestarAgenteSocial } from './orquestador.ts'
import type {
  ActividadSocial, BorradorReciboSocial, ContextoSocial, EjecucionSocial, EntradaSocial,
  OpcionSocial, PlanSocial, PuertoBackendSocial, PuertoModelo, Respuesta,
} from './contratos.ts'

const ESP = '00000000-0000-4000-8000-000000000001'
const RUN = '00000000-0000-4000-8000-000000000002'
const OTRO = '00000000-0000-4000-8000-000000000003'
const PROP = '00000000-0000-4000-8000-000000000004'
const HASH = 'a'.repeat(64)
const TEXTO = 'Les propongo un plan; marquen si les interesa y carguen su disponibilidad.'
const entrada: EntradaSocial = {
  espacioId: ESP, ejecucionId: RUN, sabado: '2026-10-31', oportunidad: 'sabado:2026-10-31',
  clima: { sabado: 'lluvia', domingo: 'desconocido' },
}
const franjas: OpcionSocial['franjas'] = [
  { inicio: '2026-10-31T14:00', fin: '2026-10-31T17:00' },
  { inicio: '2026-11-01T14:00', fin: '2026-11-01T17:00' },
]
const opcion: OpcionSocial = {
  opcion_ref: 'op_12345678901234567890', actividad: 'asado', actividad_etiqueta: 'Asado',
  titulo: 'Asado en el parque', franjas, viaje: { max_minutos: 25, estimado: true },
}
const plan: PlanSocial = {
  titulo: opcion.titulo, lugar: { nombre: 'Parrilla del parque (Simulación)', simulado: true },
  franjas, minimo: 4, maximo: 12, plazo: '2026-10-31T11:00',
  imprescindible: { nombre: 'Organizador Ficticio' }, invitados: 4,
}
const borrador: BorradorReciboSocial = { hash: HASH, opcion_ref: opcion.opcion_ref, texto: TEXTO, plan }
const ok = <T>(t: T): Respuesta<T> => ({ ok: true, contrato: 2, servidor_ahora: {}, ...t })
const no = (codigo: string, detalle: string) => ({ ok: false as const, error: { codigo, detalle } })
const nuevo = (): EjecucionSocial => ({
  id: RUN, estado: 'en_curso', oportunidad: entrada.oportunidad,
  propuesta_id: null, borrador: null, aprobacion: null, motivo: null,
})

function banco(modo: 'aprobacion' | 'autonoma' = 'aprobacion') {
  const contexto: ContextoSocial = { localidad: 'santiago', zona_horaria: 'America/Santiago',
    politica: { modo, version: 1 }, personas_autorizadas: 30, destinatarios: 4 }
  const llamadas: string[] = []
  const guardados: Parameters<PuertoBackendSocial['guardar_borrador_agente']>[0][] = []
  const publicados: Parameters<PuertoBackendSocial['publicar_borrador_agente']>[0][] = []
  let run: EjecucionSocial | null = null
  let hashParametros: string | null = null
  let efectos = 0
  let modelos = 0
  const backend: PuertoBackendSocial = {
    async agente_social_contexto() { llamadas.push('contexto'); return ok(contexto) },
    async iniciar_ejecucion_agente(p) {
      llamadas.push('iniciar')
      if (run) {
        if (hashParametros && hashParametros !== p.p_parametros_hash) {
          return { ...no('opcion_desactualizada', 'oportunidad_en_uso'), ejecucion: structuredClone(run) }
        }
        return ok({ ejecucion: structuredClone(run), repetido: true, propia: p.p_ejecucion_id === run.id })
      }
      hashParametros = p.p_parametros_hash
      run = { ...nuevo(), id: p.p_ejecucion_id }
      return ok({ ejecucion: structuredClone(run), repetido: false, propia: true })
    },
    async agente_social_candidatos() {
      llamadas.push('candidatos')
      return ok({ opciones: [structuredClone(opcion)], sin_plan_compatible: false })
    },
    async guardar_borrador_agente(p) {
      llamadas.push('guardar'); guardados.push(p)
      run = { ...run!, estado: 'borrador', borrador: { ...structuredClone(borrador), texto: p.p_texto, opcion_ref: p.p_opcion_ref } }
      // Forma E11 exacta: guardar no devuelve texto; sí devuelve el plan visible.
      return ok({ borrador: { hash: HASH, opcion_ref: p.p_opcion_ref, plan: structuredClone(plan) }, repetido: false })
    },
    async publicar_borrador_agente(p) {
      llamadas.push('publicar'); publicados.push(p)
      if (contexto.destinatarios === 0) return no('opcion_desactualizada', 'borrador_cambiado')
      if (run?.borrador?.hash !== p.p_borrador_hash) return no('opcion_desactualizada', 'borrador_cambiado')
      if (contexto.politica.modo === 'aprobacion' && run.aprobacion?.hash !== p.p_borrador_hash) return no('no_autorizado', 'sin_aprobacion')
      const repetido = run.estado === 'publicada'
      if (!repetido) efectos++
      run = { ...run, estado: 'publicada', propuesta_id: PROP }
      return ok({ propuesta: { id: PROP }, invitados: 4, repetido })
    },
    async cerrar_ejecucion_agente(p) {
      llamadas.push('cerrar'); run = { ...run!, estado: 'fallida', motivo: p.p_motivo }
      return ok({ ejecucion: structuredClone(run), repetido: false })
    },
  }
  const modelo: PuertoModelo = async () => { llamadas.push('modelo'); modelos++; return { opcion_ref: opcion.opcion_ref, texto: TEXTO } }
  return {
    backend, modelo, contexto, llamadas, guardados, publicados,
    get run() { return run }, get hash() { return hashParametros }, get efectos() { return efectos }, get modelos() { return modelos },
    sembrar(e: EjecucionSocial) { run = structuredClone(e) },
    aprobar() { run!.aprobacion = { hash: HASH, aprobado_en: { utc: '2026-10-24T03:00:00Z', local: '2026-10-24T00:00:00' } } },
    correr(e: EntradaSocial = entrada, m: PuertoModelo = modelo) {
      return orquestarAgenteSocial(e, { backend, modelo: m, limiteModeloMs: 10 })
    },
  }
}

test('E11 exact fixture without cuantos: persists full visible plan and two real windows', async () => {
  const t = banco(); const r = await t.correr()
  assert.equal(r.estado, 'necesita_aprobacion'); assert.deepEqual(r.borrador?.plan, plan)
  assert.equal(r.ejecucion?.borrador?.texto, TEXTO); assert.equal(t.efectos, 0)
  assert.deepEqual(t.llamadas, ['contexto', 'iniciar', 'candidatos', 'modelo', 'guardar'])
})

test('preparar with publicacionAutomatica:false stores an autonomous draft, stable replay, no publication', async () => {
  const t = banco('autonoma')
  const puertos = { backend: t.backend, modelo: t.modelo, limiteModeloMs: 10, publicacionAutomatica: false }
  const politica = structuredClone(t.contexto.politica)
  const r = await orquestarAgenteSocial(entrada, puertos)
  assert.equal(r.estado, 'borrador'); assert.equal(r.ejecucion?.estado, 'borrador')
  assert.deepEqual(r.borrador?.plan, plan); assert.equal(t.efectos, 0); assert.equal(t.publicados.length, 0)
  const repetida = await orquestarAgenteSocial(entrada, puertos)
  assert.equal(repetida.estado, 'borrador'); assert.equal(repetida.repetido, true)
  assert.deepEqual(repetida.ejecucion, r.ejecucion); assert.equal(t.guardados.length, 1); assert.equal(t.modelos, 1)
  assert.deepEqual(t.contexto.politica, politica)
  assert.deepEqual(t.llamadas, ['contexto', 'iniciar', 'candidatos', 'modelo', 'guardar', 'contexto', 'iniciar'])
  // Solo una acción explícita puede continuar; el backend decide con su política real.
  const publicada = await orquestarAgenteSocial({ ...entrada, accion: { tipo: 'publicar', borradorHash: HASH } }, puertos)
  assert.equal(publicada.estado, 'publicada'); assert.equal(t.efectos, 1); assert.equal(t.publicados.length, 1)
  assert.equal(t.guardados.length, 1); assert.equal(t.modelos, 1); assert.deepEqual(t.contexto.politica, politica)
})

test('publicacionAutomatica undefined or true preserves existing autonomous behavior', async () => {
  for (const publicacionAutomatica of [undefined, true]) {
    const t = banco('autonoma')
    const r = await orquestarAgenteSocial(entrada, { backend: t.backend, modelo: t.modelo, limiteModeloMs: 10, publicacionAutomatica })
    assert.equal(r.estado, 'publicada'); assert.equal(t.efectos, 1); assert.equal(t.publicados.length, 1)
  }
})

test('publicacionAutomatica:false does not grant approval or bypass DB checks for explicit publication', async () => {
  const t = banco('aprobacion')
  const puertos = { backend: t.backend, modelo: t.modelo, limiteModeloMs: 10, publicacionAutomatica: false }
  assert.equal((await orquestarAgenteSocial(entrada, puertos)).estado, 'necesita_aprobacion')
  const continuar: EntradaSocial = { ...entrada, accion: { tipo: 'publicar', borradorHash: HASH } }
  const rechazada = await orquestarAgenteSocial(continuar, puertos)
  assert.equal(rechazada.error?.detalle, 'sin_aprobacion'); assert.equal(t.efectos, 0)
  t.aprobar()
  assert.equal((await orquestarAgenteSocial(continuar, puertos)).estado, 'publicada')
  assert.equal(t.efectos, 1); assert.equal(t.modelos, 1); assert.equal(t.contexto.politica.modo, 'aprobacion')
})

test('weather preserves both distinct days and canonical hash ignores object key order', async () => {
  const t = banco(); let recibido: unknown
  const candidatos = t.backend.agente_social_candidatos
  t.backend.agente_social_candidatos = async (p) => { recibido = p.p_clima; return candidatos(p) }
  await t.correr(); const h = t.hash
  assert.deepEqual(recibido, { sabado: 'lluvia', domingo: 'desconocido' })
  await t.correr({ ...entrada, clima: { domingo: 'desconocido', sabado: 'lluvia' } })
  assert.equal(t.hash, h); assert.equal(h?.length, 64); assert.equal(t.modelos, 1)
  const conflicto = await t.correr({ ...entrada, clima: { sabado: 'seco', domingo: 'desconocido' } })
  assert.equal(conflicto.error?.detalle, 'oportunidad_en_uso'); assert.equal(conflicto.ejecucion?.id, RUN)
})

for (const estado of ['en_curso', 'borrador', 'publicada', 'fallida'] as const) {
  for (const publicar of [false, true]) test(`propia:false ${estado}, publicar=${publicar}: NO candidates/model/save/publish/close`, async () => {
    const t = banco('autonoma')
    t.sembrar({ ...nuevo(), estado,
      borrador: estado === 'borrador' || estado === 'publicada' ? borrador : null,
      propuesta_id: estado === 'publicada' ? PROP : null,
      motivo: estado === 'fallida' ? 'sin_plan' : null })
    const r = await t.correr({ ...entrada, ejecucionId: OTRO,
      ...(publicar ? { accion: { tipo: 'publicar' as const, borradorHash: HASH } } : {}) })
    assert.equal(r.propia, false); assert.deepEqual(t.llamadas, ['contexto', 'iniciar'])
    assert.equal(t.efectos, 0); assert.equal(t.guardados.length, 0)
    if (estado === 'borrador') assert.deepEqual(r.ejecucion?.borrador?.plan, plan)
    if (estado === 'publicada') assert.equal(r.propuesta?.id, PROP)
  })
}

test('missing propia fails closed, including explicit publish with exact hash', async () => {
  const t = banco('autonoma'); const iniciar = t.backend.iniciar_ejecucion_agente
  t.backend.iniciar_ejecucion_agente = async (p) => {
    const r = await iniciar(p)
    if (r.ok) delete (r as Partial<typeof r>).propia
    return r
  }
  const r = await t.correr({ ...entrada, accion: { tipo: 'publicar', borradorHash: HASH } })
  assert.equal(r.error?.detalle, 'contrato_invalido'); assert.equal(r.resultado_incierto, true)
  assert.deepEqual(t.llamadas, ['contexto', 'iniciar'])
})

test('a contradictory own receipt with another execution ID never grants effects', async () => {
  const t = banco('autonoma')
  t.backend.iniciar_ejecucion_agente = async () => ok({ ejecucion: { ...nuevo(), id: OTRO }, repetido: false, propia: true })
  const r = await t.correr()
  assert.equal(r.error?.detalle, 'contrato_invalido'); assert.equal(r.resultado_incierto, true)
  assert.deepEqual(t.llamadas, ['contexto'])
})

test('own repeated in-course receipt does not restart a worker', async () => {
  const t = banco('autonoma'); t.sembrar(nuevo())
  const r = await t.correr(); assert.equal(r.error?.detalle, 'ejecucion_en_curso')
  assert.equal(r.resultado_incierto, true); assert.deepEqual(t.llamadas, ['contexto', 'iniciar'])
})

test('human approval continuation uses existing exact hash and preserves approval receipt', async () => {
  const t = banco(); await t.correr(); t.aprobar()
  const e: EntradaSocial = { ...entrada, accion: { tipo: 'publicar', borradorHash: HASH } }
  const r = await t.correr(e)
  assert.equal(r.estado, 'publicada'); assert.equal(t.efectos, 1); assert.equal(t.modelos, 1)
  assert.equal(r.ejecucion?.aprobacion?.hash, HASH); assert.deepEqual(r.ejecucion?.borrador?.plan, plan)
  assert.deepEqual(t.publicados[0], { p_ejecucion_id: RUN, p_borrador_hash: HASH, p_intento_id: RUN })
  assert.equal((await t.correr(e)).propuesta?.id, PROP); assert.equal(t.efectos, 1)
})

test('no approval and changed hash never imply acceptance or approval', async () => {
  const t = banco(); await t.correr()
  const r = await t.correr({ ...entrada, accion: { tipo: 'publicar', borradorHash: HASH } })
  assert.equal(r.estado, 'necesita_aprobacion'); assert.equal(r.error?.detalle, 'sin_aprobacion')
  const antes = t.publicados.length
  const cambiado = await t.correr({ ...entrada, accion: { tipo: 'publicar', borradorHash: 'otro' } })
  assert.equal(cambiado.error?.detalle, 'borrador_cambiado'); assert.equal(t.publicados.length, antes)
  assert.equal(t.efectos, 0); assert.equal(t.modelos, 1)
})

test('autonomous publication and concurrent duplicate UUIDs: one model and one effect', async () => {
  const t = banco('autonoma'); let entrar = () => {}; let liberar = () => {}
  const llego = new Promise<void>((r) => { entrar = r }); const barrera = new Promise<void>((r) => { liberar = r })
  const primero = t.correr(entrada, async (o, s) => { entrar(); await barrera; return t.modelo(o, s) })
  await llego
  const segundo = await t.correr({ ...entrada, ejecucionId: OTRO })
  assert.equal(segundo.propia, false); liberar()
  assert.equal((await primero).estado, 'publicada'); assert.equal(t.efectos, 1); assert.equal(t.modelos, 1)
})

test('lost publish response recovers the same proposal and full receipt; no second write', async () => {
  const t = banco('autonoma'); const publicar = t.backend.publicar_borrador_agente
  t.backend.publicar_borrador_agente = async (p) => { await publicar(p); throw new Error('PRIVATE-PROVIDER') }
  const r = await t.correr()
  assert.equal(r.estado, 'publicada'); assert.deepEqual(r.ejecucion?.borrador?.plan, plan)
  assert.equal(t.publicados.length, 1); assert.equal(t.efectos, 1); assert.equal(t.modelos, 1)
  assert.ok(!JSON.stringify(r).includes('PRIVATE-PROVIDER'))
})

test('lost draft response recovers stored text and plan, without autonomous publish', async () => {
  const t = banco('autonoma'); const guardar = t.backend.guardar_borrador_agente
  t.backend.guardar_borrador_agente = async (p) => { await guardar(p); throw new Error('lost') }
  const r = await t.correr(); assert.equal(r.estado, 'borrador')
  assert.deepEqual(r.ejecucion?.borrador?.plan, plan); assert.equal(r.ejecucion?.borrador?.texto, TEXTO)
  assert.equal(t.guardados.length, 1); assert.equal(t.efectos, 0)
})

test('lost start response only reads receipt, never assumes ownership to resume', async () => {
  const t = banco('autonoma'); const iniciar = t.backend.iniciar_ejecucion_agente; let n = 0
  t.backend.iniciar_ejecucion_agente = async (p) => { const r = await iniciar(p); if (n++ === 0) throw new Error('lost'); return r }
  const r = await t.correr()
  assert.equal(r.resultado_incierto, true); assert.equal(r.error?.detalle, 'ejecucion_en_curso')
  assert.equal(t.modelos, 0); assert.equal(t.guardados.length, 0)
})

test('lost receipt is uncertain, not a confirmed failed publication; no close/retry', async () => {
  const t = banco('autonoma'); const iniciar = t.backend.iniciar_ejecucion_agente; let n = 0
  t.backend.iniciar_ejecucion_agente = async (p) => { if (n++ > 0) throw new Error('offline'); return iniciar(p) }
  t.backend.publicar_borrador_agente = async () => { t.llamadas.push('publicar'); throw new Error('PRIVATE') }
  const r = await t.correr(); assert.equal(r.resultado_incierto, true)
  assert.equal(r.error?.detalle, 'recibo_no_disponible'); assert.equal(t.llamadas.filter((x) => x === 'publicar').length, 1)
  assert.ok(!t.llamadas.includes('cerrar')); assert.ok(!JSON.stringify(r).includes('PRIVATE'))
})

test('error with canonical receipt during lost-write recovery stays uncertain', async () => {
  const t = banco('autonoma'); const iniciar = t.backend.iniciar_ejecucion_agente; let n = 0
  t.backend.iniciar_ejecucion_agente = async (p) => {
    if (n++ > 0) return { ...no('opcion_desactualizada', 'oportunidad_en_uso'), ejecucion: { ...nuevo(), estado: 'borrador', borrador } }
    return iniciar(p)
  }
  t.backend.publicar_borrador_agente = async () => { throw new Error('lost') }
  const r = await t.correr()
  assert.equal(r.resultado_incierto, true); assert.equal(r.error?.detalle, 'oportunidad_en_uso')
  assert.deepEqual(r.ejecucion?.borrador?.plan, plan); assert.equal(t.guardados.length, 1)
  assert.ok(!t.llamadas.includes('cerrar'))
})

test('conflict receipt preserves canonical plan/approval but strips private or malformed fields', async () => {
  const t = banco(); const run = { ...nuevo(), estado: 'borrador' as const, borrador: {
    ...borrador, plan: { ...plan, destinatarios: ['PRIVATE'], quorum: 'PRIVATE' },
  }, condiciones: 'PRIVATE' }
  t.backend.iniciar_ejecucion_agente = async () => ({ ...no('opcion_desactualizada', 'oportunidad_en_uso'), ejecucion: run })
  const r = await t.correr(); assert.equal(r.error?.detalle, 'oportunidad_en_uso'); assert.equal(r.propia, false)
  assert.deepEqual(r.ejecucion?.borrador?.plan, plan)
  assert.ok(!JSON.stringify(r).includes('PRIVATE'))
  assert.deepEqual(t.llamadas, ['contexto'])
})

test('model projection has two windows and aggregate travel only, never approval plan or private fields', async () => {
  const t = banco(); let visto: unknown
  t.backend.agente_social_candidatos = async () => ok({ sin_plan_compatible: false, opciones: [{
    ...opcion, titulo: 'PRIVATE nombre no va al modelo', condiciones: 'PRIVATE',
    viaje: { max_minutos: 25, estimado: true, zonas: ['PRIVATE'] }, cuantos: 1,
  }] })
  await t.correr(entrada, async (v) => { visto = v; return null })
  assert.deepEqual(visto, [{ opcion_ref: opcion.opcion_ref, actividad: 'asado', franjas, viaje_max_minutos: 25 }])
  assert.ok(!JSON.stringify(visto).includes('PRIVATE'))
})

for (const actividad of ['asado', 'padel', 'futbol', 'parque', 'fiesta', 'cena', 'cafe', 'bar',
  'juegos_salida', 'cultura', 'cine', 'cerro', 'juegos_casa', 'tenis', 'basquet', 'peli_casa'] as ActividadSocial[]) {
  test(`closed documented activity ${actividad}: valid fallback <=280, two windows, no invented alternative`, async () => {
    const t = banco(); t.backend.agente_social_candidatos = async () => ok({ opciones: [{ ...opcion, actividad }], sin_plan_compatible: false })
    await t.correr(entrada, async () => null)
    assert.equal(t.guardados.length, 1); assert.equal(t.guardados[0].p_opcion_ref, opcion.opcion_ref)
    assert.ok(t.guardados[0].p_texto.length <= 280); assert.ok(t.guardados[0].p_texto.includes('sábado'))
    assert.ok(t.guardados[0].p_texto.includes('domingo'))
  })
}

test('exactly 280 safe model characters are accepted; 281 and every control use fixed text', async () => {
  const texto280 = 'Les propongo una actividad para compartir. '.padEnd(280, 'x')
  const t = banco(); await t.correr(entrada, async () => ({ opcion_ref: opcion.opcion_ref, texto: texto280 }))
  assert.equal(t.guardados[0].p_texto, texto280)
  for (const texto of [texto280 + 'x', 'Hay una propuesta\npara compartir actividades.', 'Hay una propuesta\tpara compartir actividades.',
    'Hay una propuesta\rpara compartir actividades.', 'Hay una propuesta\u0000para compartir actividades.', 'Hay una propuesta\u0085para compartir actividades.']) {
    const t = banco(); await t.correr(entrada, async () => ({ opcion_ref: opcion.opcion_ref, texto }))
    assert.equal(t.guardados.length, 1); assert.ok(t.guardados[0].p_texto.startsWith('¡Hola!'))
  }
})

for (const [nombre, salida] of [
  ['foreign option', { opcion_ref: 'otra', texto: TEXTO }],
  ['false acceptance', { opcion_ref: opcion.opcion_ref, texto: 'Todos están confirmados y reservados.' }],
  ['invalid shape', { opcion_ref: opcion.opcion_ref, texto: { secreto: 'PRIVATE' } }],
] as const) test(`${nombre}: fallback, one persistence path`, async () => {
  const t = banco('autonoma'); await t.correr(entrada, async () => salida)
  assert.equal(t.guardados.length, 1); assert.equal(t.efectos, 1); assert.ok(t.guardados[0].p_texto.startsWith('¡Hola!'))
})

test('provider failure and timeout cause one safe write, late model output has no effects', async () => {
  const t = banco('autonoma'); await t.correr(entrada, async () => { throw new Error('PRIVATE vendor') })
  assert.equal(t.guardados.length, 1); assert.equal(t.efectos, 1)
  const h = banco('autonoma'); let signal: AbortSignal | undefined; let terminar: (v: unknown) => void = () => {}
  const r = await h.correr(entrada, async (_o, s) => { signal = s; return new Promise((resolve) => { terminar = resolve }) })
  assert.equal(r.estado, 'publicada'); assert.equal(signal?.aborted, true)
  terminar({ opcion_ref: opcion.opcion_ref, texto: TEXTO }); await Promise.resolve()
  assert.equal(h.guardados.length, 1); assert.equal(h.efectos, 1)
})

test('invalid candidate reference/date/shape, unknown activity and duplicate refs never reach model', async () => {
  for (const opciones of [
    [{ ...opcion, actividad: 'inventada' }], [{ ...opcion, franjas: [franjas[0]] }],
    [{ ...opcion, franjas: [franjas[0], { inicio: franjas[1].fin, fin: franjas[1].inicio }] }],
    [opcion, opcion],
  ]) {
    const t = banco(); t.backend.agente_social_candidatos = async () => ok({ opciones, sin_plan_compatible: false }) as Awaited<ReturnType<PuertoBackendSocial['agente_social_candidatos']>>
    const r = await t.correr()
    assert.equal(r.estado, 'error'); assert.deepEqual(r.error, { codigo: 'fallo_temporal', detalle: 'reintentar' })
    assert.equal(r.ejecucion?.estado, 'fallida'); assert.equal(r.resultado_incierto, false); assert.equal(t.modelos, 0)
    assert.equal(t.guardados.length, 0); assert.equal(t.run?.motivo, 'candidatos_rechazados')
  }
})

for (const [nombre, cambio] of [
  ['en_curso', { estado: 'en_curso' }],
  ['borrador', { estado: 'borrador', borrador }],
  ['publicada', { estado: 'publicada', propuesta_id: PROP }],
  ['otra ejecucion', { id: OTRO }],
  ['otra oportunidad', { oportunidad: 'sabado:2026-11-07' }],
  ['otro motivo', { motivo: 'modelo_fallo' }],
] as const) test(`close receipt ${nombre}: uncertain error, no foreign/private receipt or later effects`, async () => {
  const t = banco('autonoma')
  t.backend.agente_social_candidatos = async () => { t.llamadas.push('candidatos'); return ok({ opciones: [], sin_plan_compatible: true }) }
  t.backend.cerrar_ejecucion_agente = async () => {
    t.llamadas.push('cerrar')
    const recibo: EjecucionSocial & { datos_privados: string } = {
      ...nuevo(), estado: 'fallida', motivo: 'sin_plan', ...cambio,
      datos_privados: 'MARCADOR-PRIVADO-NO-DEVOLVER',
    }
    return ok({ ejecucion: recibo, repetido: false })
  }
  const r = await t.correr()
  assert.equal(r.estado, 'error'); assert.equal(r.error?.detalle, 'contrato_invalido')
  assert.equal(r.resultado_incierto, true); assert.equal(r.ejecucion?.id, RUN)
  assert.equal(r.ejecucion?.oportunidad, entrada.oportunidad); assert.equal(r.ejecucion?.estado, 'en_curso')
  assert.ok(!JSON.stringify(r).includes('MARCADOR-PRIVADO'))
  assert.deepEqual(t.llamadas, ['contexto', 'iniciar', 'candidatos', 'cerrar'])
  assert.equal(t.modelos, 0); assert.equal(t.guardados.length, 0); assert.equal(t.publicados.length, 0)
})

test('valid sin_plan close keeps its projected receipt but no extra private fields', async () => {
  const t = banco()
  t.backend.agente_social_candidatos = async () => { t.llamadas.push('candidatos'); return ok({ opciones: [], sin_plan_compatible: true }) }
  t.backend.cerrar_ejecucion_agente = async (p) => {
    t.llamadas.push('cerrar')
    assert.equal(p.p_motivo, 'sin_plan')
    return ok({ ejecucion: { ...nuevo(), estado: 'fallida', motivo: 'sin_plan',
      datos_privados: 'MARCADOR-PRIVADO-NO-DEVOLVER' } as EjecucionSocial, repetido: true })
  }
  const r = await t.correr()
  assert.equal(r.estado, 'sin_plan'); assert.equal(r.ejecucion?.estado, 'fallida')
  assert.equal(r.ejecucion?.motivo, 'sin_plan'); assert.equal(r.repetido, true)
  assert.ok(!JSON.stringify(r).includes('MARCADOR-PRIVADO'))
  assert.deepEqual(t.llamadas, ['contexto', 'iniciar', 'candidatos', 'cerrar'])
  assert.equal(t.modelos, 0); assert.equal(t.guardados.length, 0); assert.equal(t.publicados.length, 0)
})

test('backend quorum minimum is preserved, never replaced with module defaults', async () => {
  const t = banco(); t.backend.guardar_borrador_agente = async () => ok({ borrador: {
    hash: HASH, opcion_ref: opcion.opcion_ref, plan: { ...plan, minimo: 10, maximo: 14 },
  }, repetido: false })
  const r = await t.correr(); assert.equal(r.borrador?.plan.minimo, 10); assert.equal(r.borrador?.plan.maximo, 14)
})

test('prepared E14 bridge: activity string in visible plan, root quorum and optional candidate fields', async () => {
  const t = banco(); let visto: unknown
  const quorum = { actividad: 'futbol' as const, etiqueta: 'Fútbol', personas_min: 10, personas_posibles: 4 }
  t.backend.agente_social_candidatos = async () => ok({ opciones: [{ ...opcion, actividad: 'tenis',
    familia: 'deporte', personas: { min: 2, max: 4 } }], sin_plan_compatible: false, quorum })
  t.backend.guardar_borrador_agente = async () => ok({ borrador: {
    hash: HASH, opcion_ref: opcion.opcion_ref, plan: { ...plan, actividad: 'tenis', minimo: 2, maximo: 4 },
  }, repetido: false })
  const r = await t.correr(entrada, async (o) => { visto = o; return null })
  assert.equal(r.borrador?.plan.actividad, 'tenis'); assert.equal(r.borrador?.plan.minimo, 2)
  assert.deepEqual(r.quorum, quorum); assert.ok(!('quorum' in r.borrador!.plan))
  assert.deepEqual((visto as object[])[0], { opcion_ref: opcion.opcion_ref, actividad: 'tenis', franjas,
    viaje_max_minutos: 25, familia: 'deporte', personas: { min: 2, max: 4 } })
})

test('prepared E14 receipt preserves string activity, never confuses final proposal activity object', async () => {
  const t = banco(); t.sembrar({ ...nuevo(), estado: 'borrador', borrador: { ...borrador, plan: { ...plan, actividad: 'asado' } } })
  assert.equal((await t.correr()).ejecucion?.borrador?.plan.actividad, 'asado')
  const invalido = banco(); invalido.sembrar({ ...nuevo(), estado: 'borrador', borrador: {
    ...borrador, plan: { ...plan, actividad: { clave: 'asado', familia: 'comida' } as never },
  } })
  assert.equal((await invalido.correr()).error?.detalle, 'contrato_invalido')
  assert.equal(invalido.modelos, 0)
})

test('prepared E14 null quorum is valid, malformed metadata cannot cause writes', async () => {
  const t = banco(); t.backend.agente_social_candidatos = async () => ok({ opciones: [opcion], sin_plan_compatible: false, quorum: null })
  assert.equal((await t.correr()).quorum, null)
  for (const cambio of [{ familia: 'inventada' }, { personas: { min: 12, max: 4 } }]) {
    const t = banco(); t.backend.agente_social_candidatos = async () => ok({
      opciones: [{ ...opcion, ...cambio }], sin_plan_compatible: false,
    }) as Awaited<ReturnType<PuertoBackendSocial['agente_social_candidatos']>>
    await t.correr(); assert.equal(t.guardados.length, 0); assert.equal(t.modelos, 0)
  }
})

test('E8 does not authorize invitations; no recipients closes only own run without model', async () => {
  const t = banco('autonoma'); t.contexto.destinatarios = 0
  const r = await t.correr(); assert.equal(r.estado, 'sin_plan'); assert.equal(r.error?.detalle, 'sin_destinatarios')
  assert.deepEqual(t.llamadas, ['contexto', 'iniciar', 'cerrar']); assert.equal(t.efectos, 0)
})

test('backend revocation or policy downgrade between draft and publish remains authoritative', async () => {
  for (const cambio of ['revocacion', 'politica']) {
    const t = banco('autonoma'); const guardar = t.backend.guardar_borrador_agente
    t.backend.guardar_borrador_agente = async (p) => {
      const r = await guardar(p)
      if (cambio === 'revocacion') t.contexto.destinatarios = 0
      else t.contexto.politica = { modo: 'aprobacion', version: 2 }
      return r
    }
    assert.ok((await t.correr()).error); assert.equal(t.efectos, 0); assert.equal(t.publicados.length, 1)
  }
})

test('published receipt remains readable after revocation, no fresh effects', async () => {
  const t = banco('autonoma'); await t.correr(); t.contexto.destinatarios = 0
  assert.equal((await t.correr()).estado, 'publicada'); assert.equal(t.guardados.length, 1); assert.equal(t.efectos, 1)
})

test('no compatible plan with no motivo or faltan_personas never invents a similar candidate', async () => {
  for (const motivo of [null, 'faltan_personas']) {
    const t = banco(); t.backend.agente_social_candidatos = async () => ok({ opciones: [], sin_plan_compatible: true, motivo })
    const r = await t.correr()
    assert.equal(r.estado, 'sin_plan'); assert.equal(t.modelos, 0); assert.equal(t.run?.motivo, 'sin_plan')
    assert.equal(r.motivo, motivo ?? undefined); assert.ok(!('quorum' in r))
  }
})

test('session/role errors, invalid inputs and malformed response stop safely without payload leaks', async () => {
  for (const cambio of [{ espacioId: 'ajeno' }, { sabado: '2026-02-31' }, { clima: 'seco' }, { oportunidad: 'otra' }]) {
    const t = banco(); const r = await t.correr({ ...entrada, ...cambio } as EntradaSocial)
    assert.equal(r.error?.codigo, 'entrada_incompleta'); assert.equal(t.llamadas.length, 0)
  }
  const t = banco(); t.backend.agente_social_contexto = async () => no('fuera_de_audiencia', 'no_miembro')
  assert.equal((await t.correr()).error?.codigo, 'fuera_de_audiencia'); assert.equal(t.run, null)
  const d = banco(); d.backend.agente_social_contexto = async () => no('PRIVATE', 'PRIVATE')
  assert.ok(!JSON.stringify(await d.correr()).includes('PRIVATE'))
  const m = banco(); m.backend.guardar_borrador_agente = async () => ok({ borrador: { hash: HASH, opcion_ref: opcion.opcion_ref } as never, repetido: false })
  const r = await m.correr(); assert.equal(r.resultado_incierto, true); assert.equal(m.efectos, 0)
})
