import { describe, expect, it } from 'vitest'
import type { EstadoClave, MiembroEspacio, MiembroRef } from '../lib/types'
import { integrantesPublicos, participacionDe } from './datos'

const ref = (id: string, nombre = id): MiembroRef => ({ miembro_id: id, nombre, simulado: false })
const miembro = (id: string, extra: Partial<MiembroEspacio> = {}): MiembroEspacio => ({
  ...ref(id), rol: 'miembro', es_yo: false, pendiente: false, ...extra,
})
const grupo = { miembros: [miembro('Bastián', { es_yo: true, rol: 'organizador' }), miembro('Carlos'),
  miembro('Joaco'), miembro('Pía'), miembro('Charlie', { pendiente: true }), miembro('Nacho', { simulado: true })] }
const plan = (aceptaron: string[] = [], version: number | null = 1, estado: EstadoClave = 'esperando_compromisos') => ({
  estado, opcion: version === null ? null : { version, aceptaron: aceptaron.map(nombre => ({ miembro: ref(nombre) })) },
  interesados: { miembros: [ref('Pía')] },
})
const ids = (personas: { miembro_id: string }[]) => personas.map(m => m.miembro_id)

describe('participación pública de la versión actual', () => {
  it('una versión nueva empieza sin los nombres confirmados de la anterior', () => {
    const primera = participacionDe(plan(['Bastián', 'Joaco'], 1), grupo)
    expect(primera?.tipo).toBe('version')
    if (primera?.tipo !== 'version') throw new Error('Se esperaba una versión')
    expect(ids(primera.confirmados)).toEqual(['Bastián', 'Joaco'])
    const nueva = participacionDe(plan([], 2), grupo)
    if (nueva?.tipo !== 'version') throw new Error('Se esperaba una versión')
    expect(nueva.version).toBe(2)
    expect(nueva.confirmados).toEqual([])
    expect(ids(nueva.sinConfirmar ?? [])).toEqual(['Bastián', 'Carlos', 'Joaco', 'Pía', 'Nacho'])
  })

  it('sin confirmar solo resta aceptaciones explícitas, sin inferir por interés, condiciones o baja', () => {
    const entrada = Object.assign(plan(['Bastián']), {
      mi_situacion: { condiciones: 'completas', retirado: true },
      bajas: [{ miembro: ref('Joaco'), motivo: 'privado' }],
    })
    const r = participacionDe(entrada, grupo)
    if (r?.tipo !== 'version') throw new Error('Se esperaba una versión')
    expect(ids(r.confirmados)).toEqual(['Bastián'])
    // Interesarse, no responder, no poder o retirarse no son estados deducidos por esta lista.
    expect(ids(r.sinConfirmar ?? [])).toEqual(['Carlos', 'Joaco', 'Pía', 'Nacho'])
    expect(r).not.toHaveProperty('noAsisten')
    expect(r).not.toHaveProperty('noPueden')
    expect(r).not.toHaveProperty('noRespondieron')
  })

  it('separa pendientes del grupo y nunca los suma a quienes ya entraron ni al complemento de la versión', () => {
    const miembros = integrantesPublicos(grupo)
    expect(ids(miembros.entraron)).toEqual(['Bastián', 'Carlos', 'Joaco', 'Pía'])
    expect(ids(miembros.simulados)).toEqual(['Nacho'])
    expect(ids(miembros.porEntrar)).toEqual(['Charlie'])
    const r = participacionDe(plan(['Bastián']), grupo)
    if (r?.tipo !== 'version') throw new Error('Se esperaba una versión')
    expect(ids(r.porEntrar)).toEqual(['Charlie'])
    expect(ids(r.sinConfirmar ?? [])).not.toContain('Charlie')
  })

  it('sin espacio conserva las aceptaciones del servidor y deja desconocido quién falta', () => {
    const r = participacionDe(plan(['Carlos'], 2), null)
    if (r?.tipo !== 'version') throw new Error('Se esperaba una versión')
    expect(ids(r.confirmados)).toEqual(['Carlos'])
    expect(r.sinConfirmar).toBeNull()
    expect(r.porEntrar).toEqual([])
  })

  it('conserva una aceptación pública aunque la lista del grupo todavía no incluya a esa persona', () => {
    const r = participacionDe(plan(['Carlos'], 2), { miembros: [miembro('Bastián')] })
    if (r?.tipo !== 'version') throw new Error('Se esperaba una versión')
    expect(ids(r.confirmados)).toEqual(['Carlos'])
    expect(ids(r.sinConfirmar ?? [])).toEqual(['Bastián'])
  })

  it('la revisión conserva solo las aceptaciones que todavía devuelve la opción actual', () => {
    const r = participacionDe(plan(['Bastián'], 1, 'en_revision'), grupo)
    if (r?.tipo !== 'version') throw new Error('Se esperaba una versión')
    expect(r.enRevision).toBe(true)
    expect(ids(r.confirmados)).toEqual(['Bastián'])
    expect(ids(r.sinConfirmar ?? [])).toContain('Joaco')
  })

  it('antes de una versión muestra interés separado y sin transformarlo en confirmación', () => {
    const r = participacionDe(plan([], null, 'reuniendo_interes'), grupo)
    expect(r?.tipo).toBe('interes')
    if (r?.tipo !== 'interes') throw new Error('Se esperaba interés')
    expect(ids(r.interesados)).toEqual(['Pía'])
    expect(r).not.toHaveProperty('confirmados')
    expect(r).not.toHaveProperty('sinConfirmar')
  })

  it.each(['cancelado', 'expirado'] as const)('no presenta participación vigente en un plan %s', estado => {
    expect(participacionDe(plan(['Bastián', 'Joaco'], 1, estado), grupo)).toBeNull()
  })

  it('usa IDs, conserva nombres completos y no confunde personas distintas con el mismo nombre', () => {
    const nombre = 'María de los Ángeles Fernández'
    const espacio = { miembros: [miembro('a', { nombre }), miembro('b', { nombre })] }
    const p = { ...plan(), opcion: { version: 3, aceptaron: [{ miembro: ref('a', nombre) }, { miembro: ref('a', nombre) }] } }
    const r = participacionDe(p, espacio)
    if (r?.tipo !== 'version') throw new Error('Se esperaba una versión')
    expect(r.confirmados).toEqual([{ miembro_id: 'a', nombre, simulado: false, es_yo: false }])
    expect(ids(r.sinConfirmar ?? [])).toEqual(['b'])
  })

  it('no depende del rol del observador para mostrar la misma participación pública', () => {
    const org = participacionDe(plan(['Bastián']), grupo)
    const miembroComun = participacionDe(Object.assign(plan(['Bastián']), { mi_situacion: { es_organizador: false } }), grupo)
    expect(miembroComun).toEqual(org)
  })

  it('proyecta solo campos públicos y no lee condiciones, motivos, horarios ni preferencias', () => {
    const rechazar = () => { throw new Error('Se intentó leer un campo privado') }
    const entrada = Object.defineProperties(plan(['Bastián']), {
      mi_situacion: { get: rechazar }, bajas: { get: rechazar }, historial: { get: rechazar },
      franjas: { get: rechazar }, preferencias: { get: rechazar },
    })
    const personaConDatosExtra = Object.assign(miembro('Bastián'), { preferencias: { presupuesto: 'secreto' },
      disponibilidad: { A: 'no' }, motivo: 'privado', user_id: 'identidad-privada' })
    const espacio = { miembros: [personaConDatosExtra] }
    const r = participacionDe(entrada, espacio)
    const publico = JSON.stringify({ r, integrantes: integrantesPublicos(espacio) })
    expect(publico).not.toMatch(/secreto|privado|preferencias|disponibilidad|motivo|user_id|condiciones|franjas/)
    if (r?.tipo !== 'version') throw new Error('Se esperaba una versión')
    expect(Object.keys(r.confirmados[0]).sort()).toEqual(['es_yo', 'miembro_id', 'nombre', 'simulado'])
    expect(personaConDatosExtra).toHaveProperty('preferencias')
  })

  it('una salida del grupo quita a esa persona de sin confirmar sin alterar aceptaciones del servidor', () => {
    const r = participacionDe(plan(['Bastián']), { miembros: grupo.miembros.filter(m => m.nombre !== 'Joaco') })
    if (r?.tipo !== 'version') throw new Error('Se esperaba una versión')
    expect(ids(r.sinConfirmar ?? [])).not.toContain('Joaco')
    expect(ids(r.confirmados)).toEqual(['Bastián'])
  })
})
