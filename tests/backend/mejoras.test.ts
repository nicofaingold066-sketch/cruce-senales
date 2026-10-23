// Mejoras de la bola de nieve (MEJORAS.md en la rama coordinacion), contra la base real.
import { beforeAll, describe, expect, it } from 'vitest'
import { err, nuevaSesion, ok, rpc, simulado, type Json, type Sesion } from './helpers'

describe('mejora #12: nombres y código normalizados', { timeout: 60_000 }, () => {
  let O: Sesion
  let U1: Sesion
  let U2: Sesion
  let demo: Json

  beforeAll(async () => {
    ;[O, U1, U2] = await Promise.all([nuevaSesion(), nuevaSesion(), nuevaSesion()])
    demo = (await ok(O, 'seed_demo_space')).espacio
  }, 60_000)

  it('tabulador o espacio no separable al inicio no esquivan nombre_en_uso', async () => {
    // "\tLuna" reclama el asiento limpio de Luna (no crea una segunda Luna).
    const j = await ok(U1, 'join_space', { p_codigo: demo.codigo_invitacion, p_nombre_visible: '\tLuna' })
    expect(j.resultado.reclamo_asiento_simulado).toBe(true)
    expect(j.espacio.miembros.filter((m: Json) => m.nombre.toLowerCase().includes('luna')).map((m: Json) => m.nombre)).toEqual(['Luna'])
    for (const variante of [' Luna', 'Luna ', '　luna', 'Lu​na', '﻿LUNA\t']) {
      const r = await rpc(U2, 'join_space', { p_codigo: demo.codigo_invitacion, p_nombre_visible: variante })
      expect(err(r), JSON.stringify(variante)).toBe('entrada_incompleta/nombre_en_uso')
    }
    // Un nombre que solo tiene espacios raros está vacío.
    expect(err(await rpc(U2, 'join_space', { p_codigo: demo.codigo_invitacion, p_nombre_visible: '\t ​' })))
      .toBe('entrada_incompleta/campo_faltante')
  })

  it('código de invitación pegado con espacios raros y nombre con espacios internos repetidos', async () => {
    const r = await ok(U2, 'join_space', {
      p_codigo: ` ${demo.codigo_invitacion.slice(0, 4)} ${demo.codigo_invitacion.slice(4).toLowerCase()}​`,
      p_nombre_visible: 'Invitado   doce\tt',
    })
    expect(r.resultado.ya_era_miembro).toBe(false)
    expect(r.espacio.miembros.find((m: Json) => m.es_yo).nombre).toBe('Invitado doce t')
  })

  it('forma Unicode: "José" compuesto y descompuesto es el mismo nombre; el espacio también se normaliza', async () => {
    const c = await ok(O, 'create_space', { p_nombre: '\t t-e12  normalizado　', p_tipo: 'amigos', p_nombre_visible: '\tOrg t' })
    const esp = { espacioId: c.resultado.espacio_id as string, codigo: c.resultado.codigo_invitacion as string }
    expect(c.espacio.nombre).toBe('t-e12 normalizado')
    expect(c.espacio.miembros[0].nombre).toBe('Org t')
    await simulado(O, esp.espacioId, 'José t') // NFC
    expect(err(await rpc(O, 'add_simulated_member', { p_espacio_id: esp.espacioId, p_nombre_visible: 'José t' })))
      .toBe('entrada_incompleta/nombre_en_uso')
    expect(err(await rpc(U1, 'join_space', { p_codigo: esp.codigo, p_nombre_visible: 'JOSÉ t' })))
      .toBe('entrada_incompleta/nombre_en_uso')
  })
})
