/// <reference lib="dom" />
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mock = vi.hoisted(() => ({ rpc: vi.fn(), incompatible: false }))
vi.mock('../src/lib/api', () => ({ CONTRATO_ESPERADO: 2, contratoIncompatible: () => mock.incompatible }))
vi.mock('../src/lib/supabase', () => ({ supabase: { rpc: mock.rpc } }))
import { agenteApi } from '../src/agente/api'

const espacio = '00000000-0000-4000-8000-000000000001'
const respuesta = (campos: Record<string, unknown>) => ({ ok: true, contrato: 2, ...campos })
function responder(data: unknown, error: unknown = null) {
  mock.rpc.mockReturnValue({ abortSignal: () => Promise.resolve({ data, error }) })
}
beforeEach(() => {
  mock.rpc.mockReset()
  mock.incompatible = false
  vi.stubGlobal('navigator', { onLine: true })
})
afterEach(() => vi.unstubAllGlobals())

describe('consentimiento E11 (puerto RPC simulado, sin red)', () => {
  it.each([false, true])('lee el permiso propio %s sin derivarlo de E8 ni exigir gustos', async (recibir) => {
    responder(respuesta({ preferencias: null, usar_en_agente: false, recibir_invitaciones_agente: recibir }))
    expect(await agenteApi.getMyPreferences(espacio)).toMatchObject({ ok: true, data: {
      preferencias: null, usar_en_agente: false, recibir_invitaciones_agente: recibir,
    } })
    expect(mock.rpc).toHaveBeenCalledWith('get_my_preferences', { p_espacio_id: espacio })
  })

  it.each([undefined, null, 'true', 1])('no inventa permiso confirmado al leer %s', async (valor) => {
    responder(respuesta({ recibir_invitaciones_agente: valor }))
    expect(await agenteApi.getMyPreferences(espacio)).toMatchObject({ ok: true, data: { recibir_invitaciones_agente: null } })
  })

  it.each([false, true])('guarda %s con la firma exacta, sin preferencias ni aceptaciones', async (recibir) => {
    responder(respuesta({ recibir_invitaciones_agente: recibir }))
    expect(await agenteApi.setRecibirInvitaciones(espacio, recibir)).toEqual({ ok: true, data: { recibir_invitaciones_agente: recibir } })
    expect(mock.rpc).toHaveBeenCalledExactlyOnceWith('set_recibir_invitaciones_agente', { p_espacio_id: espacio, p_recibir: recibir })
  })

  it('devuelve el eco discordante para que la UI conserve el cambio pendiente', async () => {
    responder(respuesta({ recibir_invitaciones_agente: false }))
    expect(await agenteApi.setRecibirInvitaciones(espacio, true)).toEqual({ ok: true, data: { recibir_invitaciones_agente: false } })
  })

  it.each([undefined, null, 'false', 0])('no anuncia guardado confirmado ante eco inválido %s', async (valor) => {
    responder(respuesta({ recibir_invitaciones_agente: valor }))
    expect(await agenteApi.setRecibirInvitaciones(espacio, false)).toMatchObject({ ok: false, error: { codigo: 'fallo_temporal' } })
    expect(mock.rpc).toHaveBeenCalledTimes(1)
  })

  it('preserva el rechazo del servidor sin convertirlo en permiso', async () => {
    responder({ ok: false, contrato: 2, error: { codigo: 'fuera_de_audiencia', detalle: 'no_miembro', mensaje: 'No perteneces a este espacio.', reintentable: false } })
    expect(await agenteApi.setRecibirInvitaciones(espacio, true)).toMatchObject({ ok: false, error: { codigo: 'fuera_de_audiencia', detalle: 'no_miembro', reintentable: false } })
  })

  it('informa RPC no publicada, sin intentar otra operación', async () => {
    responder(null, { code: 'PGRST202' })
    expect(await agenteApi.setRecibirInvitaciones(espacio, true)).toMatchObject({ ok: false, error: { detalle: 'operacion_no_publicada' } })
    expect(mock.rpc).toHaveBeenCalledTimes(1)
  })

  it('un timeout no se convierte en una confirmación ni se reintenta solo', async () => {
    mock.rpc.mockReturnValue({ abortSignal: () => Promise.reject({ name: 'TimeoutError' }) })
    expect(await agenteApi.setRecibirInvitaciones(espacio, true)).toMatchObject({ ok: false, error: { detalle: 'tiempo_agotado' } })
    expect(mock.rpc).toHaveBeenCalledTimes(1)
  })

  it('sin conexión o con contrato incompatible no envía', async () => {
    vi.stubGlobal('navigator', { onLine: false })
    expect(await agenteApi.setRecibirInvitaciones(espacio, true)).toMatchObject({ ok: false, error: { sinConexion: true } })
    mock.incompatible = true
    expect(await agenteApi.setRecibirInvitaciones(espacio, true)).toMatchObject({ ok: false, error: { codigo: 'contrato_incompatible' } })
    expect(mock.rpc).not.toHaveBeenCalled()
  })

  it('guardar E8 no manda ni cambia el consentimiento E11', async () => {
    responder(respuesta({ usar_en_agente: false, resultado: { repetido: false } }))
    const preferencias = { presupuesto: 'da_igual', energia: 'algo_tranquilo', ambiente: 'da_igual', lugar: 'da_igual', me_gustaria: ['parque'] } as const
    await agenteApi.saveMyPreferences(espacio, { ...preferencias, me_gustaria: ['parque'] }, false)
    expect(mock.rpc).toHaveBeenCalledExactlyOnceWith('save_my_preferences', { p_espacio_id: espacio, p_preferencias: { ...preferencias, me_gustaria: ['parque'], usar_en_agente: false } })
  })
})
