/// <reference lib="dom" />
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

const mock = vi.hoisted(() => ({ invoke: vi.fn(), rpc: vi.fn() }))
vi.mock('../src/lib/supabase', () => ({ supabase: { functions: { invoke: mock.invoke }, rpc: mock.rpc } }))
import { claveSocial, crearSolicitudSocial, guardarPendienteSocial, leerPendienteSocial, socialApi, textoInvitacionAgente, type PendienteSocial } from '../src/agente/socialApi'

const espacio = '00000000-0000-4000-8000-000000000001'
const ejecucion = '00000000-0000-4000-8000-000000000002'
const propuesta = '00000000-0000-4000-8000-000000000003'
const aprobarId = '00000000-0000-4000-8000-000000000004'
const publicarId = '00000000-0000-4000-8000-000000000005'
const sabado = '2026-10-31'
const clima = { sabado: 'seco', domingo: 'lluvia' } as const
const solicitud = () => crearSolicitudSocial(espacio, sabado, clima, ejecucion)
const ok = <T extends object>(campos: T) => ({ ok: true, contrato: 2, ...campos })
const envuelto = (data: unknown) => ({ data, error: null })
function borrador() {
  return { hash: 'hash-exacto-servidor', opcion_ref: 'referencia-opaca', plan: { titulo: 'Encuentro ficticio', lugar: { nombre: 'Parque ficticio', simulado: true },
    franjas: [{ inicio: '2026-10-31T14:00:00-03:00', fin: '2026-10-31T17:00:00-03:00' }, { inicio: '2026-11-01T14:00:00-03:00', fin: '2026-11-01T17:00:00-03:00' }],
    minimo: 4, maximo: 6, invitados: 5, plazo: '2026-10-29T20:00:00-03:00', imprescindible: { nombre: 'Tomi ficticio' } } }
}
function recibo() {
  const b = borrador()
  return ok({ eleccion_fuente: 'regla', explicacion_fuente: 'texto_fijo', resultado_social: {
    estado: 'borrador', propia: true, borrador: b,
    ejecucion: { id: ejecucion, estado: 'borrador', oportunidad: `sabado:${sabado}`, propuesta_id: null,
      aprobacion: null, borrador: { ...b, texto: 'Una idea para revisar juntos.' } },
  } })
}
function rpc(data: unknown, error: unknown = null) {
  mock.rpc.mockReturnValue({ abortSignal: () => Promise.resolve({ data, error }) })
}
beforeEach(async () => {
  vi.stubGlobal('navigator', { onLine: true })
  mock.invoke.mockReset()
  mock.rpc.mockReset()
  mock.invoke.mockResolvedValue(envuelto(ok({ capacidades: { agente_social: 1 } })))
  await socialApi.capacidad(espacio)
  mock.invoke.mockClear()
})
afterEach(() => vi.unstubAllGlobals())

describe('flujo E11 humano: contrato con transporte simulado, sin red', () => {
  it('probe solo consulta capacidad y nunca incluye sabado en raíz ni en social', async () => {
    await socialApi.capacidad(espacio)
    expect(mock.invoke).toHaveBeenCalledExactlyOnceWith('agente', { body: { espacio_id: espacio, social: { accion: 'capacidad' } }, timeout: 30000 })
    expect(mock.rpc).not.toHaveBeenCalled()
  })
  it.each([null, {}, { ok: true, contrato: 1, capacidades: { agente_social: 1 } }, ok({ capacidades: { agente_social: true } }), ok({ capacidades: { agente_social: '1' } })])('capacidad inválida %j bloquea preparar sin transporte adicional', async (data) => {
    mock.invoke.mockResolvedValue(envuelto(data))
    expect((await socialApi.capacidad(espacio)).ok).toBe(false)
    mock.invoke.mockClear()
    expect((await socialApi.preparar(solicitud())).ok).toBe(false)
    expect(mock.invoke).not.toHaveBeenCalled()
  })
  it('no prepara espacios que no tienen probe confirmado', async () => {
    const s = crearSolicitudSocial(propuesta, sabado, clima, ejecucion)
    expect((await socialApi.preparar(s)).ok).toBe(false)
    expect(mock.invoke).not.toHaveBeenCalled()
  })
  it('prepara con fecha SOLO anidada y sin RPC de aprobación/publicación', async () => {
    mock.invoke.mockResolvedValue(envuelto(recibo()))
    expect(await socialApi.preparar(solicitud())).toMatchObject({ ok: true, data: { estado: 'borrador', ejecucionId: ejecucion, propia: true, aprobacionHash: null, eleccionFuente: 'regla', explicacionFuente: 'texto_fijo' } })
    expect(mock.invoke).toHaveBeenCalledExactlyOnceWith('agente', { timeout: 30000, body: { espacio_id: espacio, social: { accion: 'preparar', sabado, ejecucion_id: ejecucion, clima } } })
    expect(mock.rpc).not.toHaveBeenCalled()
  })
  it('pierde una respuesta sin anunciar éxito y recupera usando idéntico cuerpo', async () => {
    mock.invoke.mockRejectedValueOnce(new Error('dato privado no debe mostrarse')).mockResolvedValueOnce(envuelto(recibo()))
    const s = solicitud()
    const r = await socialApi.preparar(s)
    expect(r).toMatchObject({ ok: false, error: { resultadoIncierto: true, reintentable: true } })
    expect(JSON.stringify(r)).not.toContain('dato privado')
    expect((await socialApi.preparar(s)).ok).toBe(true)
    expect(mock.invoke.mock.calls[0]).toEqual(mock.invoke.mock.calls[1])
    expect(mock.invoke.mock.calls.every(([, options]) => !Object.hasOwn(options.body, 'sabado'))).toBe(true)
  })
  it('snapshot conserva clima aunque cambien los props originales', () => {
    const mutable = { sabado: 'seco', domingo: 'lluvia' } as typeof clima & { sabado: string }
    const s = crearSolicitudSocial(espacio, sabado, mutable, ejecucion)
    Object.assign(mutable, { sabado: 'lluvia' })
    expect(s.social.clima.sabado).toBe('seco')
  })
  it.each(['2026-10-30', '2026-02-31', 'cualquier fecha'])('no acepta sábado inválido %s', (dia) => {
    expect(() => crearSolicitudSocial(espacio, dia, clima, ejecucion)).toThrow()
  })
  it('rechaza raíz sabado aun si la fecha anidada existe', async () => {
    expect((await socialApi.preparar({ ...solicitud(), sabado } as ReturnType<typeof solicitud>)).ok).toBe(false)
    expect(mock.invoke).not.toHaveBeenCalled()
  })
  it('proyecta campos del contrato y no envía propiedades privadas añadidas', async () => {
    mock.invoke.mockResolvedValue(envuelto(recibo()))
    await socialApi.preparar({ ...solicitud(), secreto: 'no enviar' } as ReturnType<typeof solicitud>)
    expect(JSON.stringify(mock.invoke.mock.calls)).not.toContain('secreto')
  })
  it.each(['contrato', 'ejecucion', 'franjas', 'hash', 'aprobacion'])('no habilita acciones por recibo discordante: %s', async (campo) => {
    const x = recibo()
    if (campo === 'contrato') x.contrato = 1
    if (campo === 'ejecucion') x.resultado_social.ejecucion.id = propuesta
    if (campo === 'franjas') x.resultado_social.borrador.plan.franjas = []
    if (campo === 'hash') x.resultado_social.ejecucion.borrador.hash = 'otro-hash'
    if (campo === 'aprobacion') Object.assign(x.resultado_social.ejecucion, { aprobacion: { hash: 'otro' } })
    mock.invoke.mockResolvedValue(envuelto(x))
    expect(await socialApi.preparar(solicitud())).toMatchObject({ ok: false, error: { resultadoIncierto: true } })
  })
  it('recupera aprobación solo del recibo y hash exactos', async () => {
    const x = recibo()
    Object.assign(x.resultado_social.ejecucion, { aprobacion: { hash: borrador().hash, aprobado_en: { utc: '2026-10-24T02:00:00Z', local: '2026-10-23T23:00:00-03:00' } } })
    mock.invoke.mockResolvedValue(envuelto(x))
    expect(await socialApi.preparar(solicitud())).toMatchObject({ ok: true, data: { aprobacionHash: borrador().hash } })
  })
  it('necesita_aprobacion ofrece el borrador, nunca aprobación implícita', async () => {
    const x = recibo()
    x.resultado_social.estado = 'necesita_aprobacion'
    mock.invoke.mockResolvedValue(envuelto(x))
    expect(await socialApi.preparar(solicitud())).toMatchObject({ ok: true, data: { estado: 'borrador', aprobacionHash: null } })
    expect(mock.rpc).not.toHaveBeenCalled()
  })
  it('recibo ajeno es explícitamente no propio', async () => {
    const x = recibo()
    x.resultado_social.propia = false
    x.resultado_social.ejecucion.id = propuesta
    mock.invoke.mockResolvedValue(envuelto(x))
    expect(await socialApi.preparar(solicitud())).toMatchObject({ ok: true, data: { propia: false, ejecucionId: propuesta } })
  })
  it('fuente ausente no se convierte en modelo ni regla', async () => {
    const x = recibo()
    Object.assign(x, { eleccion_fuente: null, explicacion_fuente: null })
    mock.invoke.mockResolvedValue(envuelto(x))
    expect(await socialApi.preparar(solicitud())).toMatchObject({ ok: true, data: { eleccionFuente: null, explicacionFuente: null } })
  })
  it('aprobar usa el hash exacto y un intento independiente, sin publicar', async () => {
    rpc(ok({ aprobacion: { hash: borrador().hash, aprobado_en: { utc: '2026-10-24T02:00:00Z', local: '2026-10-23T23:00:00-03:00' } } }))
    expect(await socialApi.aprobar(ejecucion, borrador().hash, aprobarId)).toEqual({ ok: true, data: { hash: borrador().hash } })
    expect(mock.rpc).toHaveBeenCalledExactlyOnceWith('aprobar_borrador_agente', { p_ejecucion_id: ejecucion, p_borrador_hash: borrador().hash, p_intento_id: aprobarId })
    expect(mock.invoke).not.toHaveBeenCalled()
  })
  it('eco de aprobación distinto no autoriza publicar', async () => {
    rpc(ok({ aprobacion: { hash: 'otro-hash', aprobado_en: { utc: '2026-10-24T02:00:00Z', local: '2026-10-23T23:00:00-03:00' } } }))
    expect(await socialApi.aprobar(ejecucion, borrador().hash, aprobarId)).toMatchObject({ ok: false, error: { resultadoIncierto: true } })
  })
  it('publicar tiene otro UUID, conserva invitados reales y repetido', async () => {
    rpc(ok({ propuesta: { id: propuesta }, invitados: 3, repetido: true }))
    expect(await socialApi.publicar(ejecucion, borrador().hash, publicarId)).toEqual({ ok: true, data: { propuestaId: propuesta, invitados: 3, repetido: true } })
    expect(mock.rpc).toHaveBeenCalledExactlyOnceWith('publicar_borrador_agente', { p_ejecucion_id: ejecucion, p_borrador_hash: borrador().hash, p_intento_id: publicarId })
    expect(publicarId).not.toBe(aprobarId)
  })
  it('no convierte publicación malformada en éxito', async () => {
    rpc(ok({ propuesta: { id: propuesta }, invitados: '3', repetido: false }))
    expect(await socialApi.publicar(ejecucion, borrador().hash, publicarId)).toMatchObject({ ok: false, error: { resultadoIncierto: true } })
  })
  it('timeout de publicación mantiene incertidumbre y mismo intento al reintentar', async () => {
    mock.rpc.mockReturnValueOnce({ abortSignal: () => Promise.reject(new Error('fallo')) }).mockReturnValueOnce({ abortSignal: () => Promise.resolve(envuelto(ok({ propuesta: { id: propuesta }, invitados: 3, repetido: true }))) })
    expect(await socialApi.publicar(ejecucion, borrador().hash, publicarId)).toMatchObject({ ok: false, error: { resultadoIncierto: true } })
    expect((await socialApi.publicar(ejecucion, borrador().hash, publicarId)).ok).toBe(true)
    expect(mock.rpc.mock.calls[0]).toEqual(mock.rpc.mock.calls[1])
  })
  it('rechazos nunca exponen detalle o mensaje privado del servidor', async () => {
    rpc({ ok: false, error: { codigo: 'no_autorizado', detalle: 'dato privado', mensaje: 'otro secreto' } })
    const r = await socialApi.publicar(ejecucion, borrador().hash, publicarId)
    expect(r).toMatchObject({ ok: false, error: { codigo: 'no_autorizado', reintentable: false } })
    expect(JSON.stringify(r)).not.toMatch(/dato privado|otro secreto/)
  })
  it('sin conexión no envía ni prepara ni aprueba ni publica', async () => {
    vi.stubGlobal('navigator', { onLine: false })
    for (const r of [await socialApi.preparar(solicitud()), await socialApi.aprobar(ejecucion, borrador().hash, aprobarId), await socialApi.publicar(ejecucion, borrador().hash, publicarId)]) expect(r).toMatchObject({ ok: false, error: { sinConexion: true } })
    expect(mock.invoke).not.toHaveBeenCalled()
    expect(mock.rpc).not.toHaveBeenCalled()
  })
})

describe('persistencia mínima y texto personal', () => {
  function storage() {
    const datos = new Map<string, string>()
    return { getItem: (key: string) => datos.get(key) ?? null, setItem: (key: string, value: string) => { datos.set(key, value) } }
  }
  it('recarga recupera cuerpo e intentos exactos sin reconsultar clima', () => {
    const s = storage()
    const p: PendienteSocial = { version: 1, solicitud: solicitud(), intentos: { aprobar: { hash: borrador().hash, id: aprobarId }, publicar: { hash: borrador().hash, id: publicarId } } }
    guardarPendienteSocial(s, p)
    expect(leerPendienteSocial(s, espacio, sabado)).toEqual(p)
    expect(s.getItem(claveSocial(espacio, sabado))).not.toMatch(/Tomi|Parque|Encuentro|texto/)
  })
  it('almacenamiento corrupto falla cerrado; no inventa otra ejecución', () => {
    const s = storage()
    s.setItem(claveSocial(espacio, sabado), '{incompleto')
    expect(() => leerPendienteSocial(s, espacio, sabado)).toThrow()
    expect(leerPendienteSocial(s, propuesta, sabado)).toBe(null)
  })
  it.each([null, {}, { invitacion_agente: null }, { invitacion_agente: { texto: 4 } }, { mi_situacion: { invitacion_agente: { texto: 'No buscar de forma recursiva' } } }])('no inventa invitación de %j', (situacion) => {
    expect(textoInvitacionAgente(situacion)).toBe(null)
  })
  it('extrae solo texto actual de mi_situacion, sin disponibilidad ni preferencias', () => {
    expect(textoInvitacionAgente({ invitacion_agente: { texto: 'Te invitaron a revisar esta propuesta.', secreto: 'ignorar' }, preferencias: 'ignorar' })).toBe('Te invitaron a revisar esta propuesta.')
  })
})
