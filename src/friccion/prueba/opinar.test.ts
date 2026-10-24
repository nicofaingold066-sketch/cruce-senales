// Enmienda 13 (a), lógica sin pantalla: qué se lee de `mi_situacion`, cuándo se ofrece opinar y el adaptador a la API.
// Correr: npx vitest run --config <config con include src/friccion/prueba/*.test.ts> (Vitest del repo solo mira tests/**).
import { expect, test, vi } from 'vitest'
vi.mock('../../lib/api', () => ({ api: {} }))
import { api } from '../../lib/api'
import { miOpinion, opinarReal, puedeOpinar } from '../opinar'
import type { EstadoPropuesta, MiSituacion } from '../../lib/types'

const situacion = (x: Partial<MiSituacion> & { mi_opinion?: unknown } = {}): MiSituacion =>
  ({
    miembro_id: 'm1',
    nombre: 'Ana',
    es_organizador: false,
    es_organizador_espacio: false,
    interesado: false,
    condiciones: 'completas',
    retirado: false,
    elegible_en_version: true,
    acepte_version: false,
    puede: { abrir: false, marcar_interes: true, guardar_condiciones: false, evaluar: false, aceptar: true, retirarme: true, proponer_reparacion: false, cancelar: false, simular: false },
    ...x,
  }) as MiSituacion
const propuesta = (estado: EstadoPropuesta['estado'], x: Partial<MiSituacion> = {}, opcion: unknown = { version: 1 }) =>
  ({ id: 'p1', estado, opcion, mi_situacion: situacion(x) }) as unknown as EstadoPropuesta

test('mi_opinion: null mientras backend no lo mande; asi_no_puedo cuando viene; otro valor se ignora', () => {
  expect(miOpinion(situacion())).toBeNull()
  expect(miOpinion(situacion({ mi_opinion: 'asi_no_puedo' }))).toBe('asi_no_puedo')
  expect(miOpinion(situacion({ mi_opinion: 'prefiero_otro' }))).toBeNull()
})

test('puedeOpinar: solo elegible, sin aceptar, sin retirarse, esperando compromisos y con opción', () => {
  expect(puedeOpinar(propuesta('esperando_compromisos'))).toBe(true)
  expect(puedeOpinar(propuesta('reuniendo_interes'))).toBe(false)
  expect(puedeOpinar(propuesta('grupo_confirmado'))).toBe(false)
  expect(puedeOpinar(propuesta('esperando_compromisos', { elegible_en_version: false }))).toBe(false)
  expect(puedeOpinar(propuesta('esperando_compromisos', { elegible_en_version: null }))).toBe(false)
  expect(puedeOpinar(propuesta('esperando_compromisos', { acepte_version: true }))).toBe(false)
  expect(puedeOpinar(propuesta('esperando_compromisos', { retirado: true }))).toBe(false)
  expect(puedeOpinar(propuesta('esperando_compromisos', {}, null))).toBe(false)
})

test('puedeOpinar: si el servidor manda puede.opinar, manda eso (true o false), no la regla local', () => {
  const con = (opinar: boolean, x: Partial<MiSituacion> = {}) => {
    const p = propuesta('reuniendo_interes', x)
    ;(p.mi_situacion.puede as unknown as { opinar: boolean }).opinar = opinar
    return p
  }
  expect(puedeOpinar(con(true))).toBe(true) // la regla local diría false (reuniendo_interes)
  const p = propuesta('esperando_compromisos')
  ;(p.mi_situacion.puede as unknown as { opinar: boolean }).opinar = false
  expect(puedeOpinar(p)).toBe(false) // la regla local diría true
})

test('opinarReal sin api.opinarVersion: error claro, no reintentable, sin llamar a nada', async () => {
  const r = await opinarReal('p1', 1, 'asi_no_puedo', 'i1')
  expect(r.ok).toBe(false)
  if (!r.ok) {
    expect(r.error.detalle).toBe('no_disponible')
    expect(r.error.reintentable).toBe(false)
    expect(r.error.mensaje).toMatch(/todavía no está disponible/)
  }
})

test('opinarReal con api.opinarVersion: pasa los cuatro argumentos tal cual y devuelve lo que diga el servidor', async () => {
  const fn = vi.fn(async () => ({ ok: true as const, data: { ok: true, contrato: 2, servidor_ahora: { utc: '', local: '' }, resultado: {}, propuesta: {} } }))
  ;(api as unknown as { opinarVersion: unknown }).opinarVersion = fn
  const r = await opinarReal('p1', 2, 'retirar_opinion', 'intento-7')
  expect(fn).toHaveBeenCalledWith('p1', 2, 'retirar_opinion', 'intento-7')
  expect(r.ok).toBe(true)
})
