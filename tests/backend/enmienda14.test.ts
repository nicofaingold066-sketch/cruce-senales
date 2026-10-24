// Enmienda 14 (docs/contrato-enmienda-14.md, aprobada por Nico 21:55): propósito del grupo, familias y quórum.
// 0048: propósito en create_space/get_space/preview_space_by_code, actividad en create_proposal y en la vista,
// filas 15 a 17 del catálogo. Contra la base real, datos ficticios, espacios "t-" y demo propio.
import { beforeAll, describe, expect, it } from 'vitest'
import {
  clienteSinSesion, err, FRANJAS, intento, nuevaSesion, ok, PERMITIDAS, PLAZO, rpc, rpcCrudo, sufijo, TOTAL_PERMITIDAS,
  type Json, type Sesion,
} from './helpers'

const FUERA = 'Este grupo se armó para otro tipo de plan. Elige una actividad de ese tipo o crea un grupo en modo libre.'

describe('enmienda 14 (0048): propósito del grupo y actividad de la propuesta', { timeout: 180_000 }, () => {
  let O: Sesion
  let U: Sesion

  const crearEspacio = (s: Sesion, proposito?: string) =>
    rpc(s, 'create_space', {
      p_nombre: `t-e14-${sufijo()}`, p_tipo: 'amigos', p_nombre_visible: 'Org t',
      ...(proposito === undefined ? {} : { p_proposito: proposito }),
    })
  const proponer = (s: Sesion, espacio: string, actividad?: string | null, i = intento()) =>
    rpc(s, 'create_proposal', {
      p_espacio_id: espacio, p_titulo: 't-e14 plan', p_franjas: FRANJAS, p_minimo: 2, p_maximo: 6,
      p_imprescindible_id: '00000000-0000-4000-8000-000000000000', p_plazo: PLAZO, p_zona_horaria: 'America/Santiago', p_intento_id: i,
      ...(actividad === undefined ? {} : { p_actividad: actividad }),
    })

  beforeAll(async () => {
    ;[O, U] = await Promise.all([nuevaSesion(), nuevaSesion()])
  }, 60_000)

  it('1. create_space: sin propósito queda libre; con actividad o familia, su familia; inválido rechazado; get_space y preview lo traen', async () => {
    const libre = await crearEspacio(O)
    expect(libre.espacio).toMatchObject({ proposito: 'libre', familia: 'libre' })
    const casos: [string, string][] = [['futbol', 'deporte'], ['deporte', 'deporte'], ['cultura', 'cultura'], ['cena', 'comida'], ['libre', 'libre']]
    for (const [p, f] of casos) {
      const r = await crearEspacio(O, p)
      expect(r.espacio, p).toMatchObject({ proposito: p, familia: f })
    }
    expect(err(await crearEspacio(O, 'sushi'))).toBe('entrada_incompleta/formato_invalido')
    expect(err(await crearEspacio(O, 'otra_cosa'))).toBe('entrada_incompleta/formato_invalido')
    const futbol = await crearEspacio(O, 'futbol')
    const g = await ok(O, 'get_space', { p_espacio_id: futbol.resultado.espacio_id })
    expect(g.espacio).toMatchObject({ proposito: 'futbol', familia: 'deporte' })
    const pv = await ok(U, 'preview_space_by_code', { p_codigo: futbol.resultado.codigo_invitacion })
    expect(pv.espacio).toEqual({ nombre: futbol.espacio.nombre, demo: false, proposito: 'futbol', familia: 'deporte' })
    // Quien se une también lo ve.
    const j = await ok(U, 'join_space', { p_codigo: futbol.resultado.codigo_invitacion, p_nombre_visible: 'Uno t' })
    expect(j.espacio).toMatchObject({ proposito: 'futbol', familia: 'deporte' })
  })

  it('2. create_proposal: en un grupo de fútbol, otra familia se rechaza, sin actividad y de la familia se acepta; en libre, cualquiera', async () => {
    const f = await crearEspacio(O, 'futbol')
    const esp = f.resultado.espacio_id
    const yo = f.resultado.miembro_id
    const proponerYo = (act?: string | null, i = intento()) =>
      rpc(O, 'create_proposal', {
        p_espacio_id: esp, p_titulo: 't-e14 plan', p_franjas: FRANJAS, p_minimo: 2, p_maximo: 6,
        p_imprescindible_id: yo, p_plazo: PLAZO, p_zona_horaria: 'America/Santiago', p_intento_id: i,
        ...(act === undefined ? {} : { p_actividad: act }),
      })
    // Ajuste 1: sin actividad se acepta (nadie queda trabado por la interfaz).
    const sin = await proponerYo()
    expect(err(sin)).toBe('ok')
    expect(sin.propuesta.actividad).toBeNull()
    // Otra familia: rechazo con el mensaje exacto y sin propuesta creada.
    const antes = (await ok(O, 'list_proposals', { p_espacio_id: esp })).propuestas.length
    const asado = await proponerYo('asado')
    expect(err(asado)).toBe('entrada_incompleta/fuera_de_proposito')
    expect(asado.error.mensaje).toBe(FUERA)
    expect(asado.error.reintentable).toBe(false)
    expect((await ok(O, 'list_proposals', { p_espacio_id: esp })).propuestas.length).toBe(antes)
    // Misma familia (pádel en un grupo de fútbol): ok, con la actividad en la vista y en la lista.
    const padel = await proponerYo('padel')
    expect(err(padel)).toBe('ok')
    expect(padel.propuesta.actividad).toEqual({ clave: 'padel', etiqueta: 'Pádel', familia: 'deporte' })
    const lista = (await ok(O, 'list_proposals', { p_espacio_id: esp })).propuestas
    expect(lista.find((p: Json) => p.id === padel.resultado.propuesta_id).actividad).toEqual({ clave: 'padel', etiqueta: 'Pádel', familia: 'deporte' })
    // Clave inexistente: formato_invalido. Mismo intento con otra actividad: intento_reutilizado.
    expect(err(await proponerYo('sushi'))).toBe('entrada_incompleta/formato_invalido')
    const i = intento()
    expect(err(await proponerYo('tenis', i))).toBe('ok')
    expect(err(await proponerYo('padel', i))).toBe('entrada_incompleta/intento_reutilizado')
    expect((await proponerYo('tenis', i)).resultado.repetido).toBe(true)

    // Ajuste 2: alguien de otro espacio no se entera del propósito (no_miembro antes que fuera_de_proposito).
    expect(err(await proponer(U, esp, 'asado'))).toBe('fuera_de_audiencia/no_miembro')

    // Libre: sin actividad y con cualquier actividad.
    const l = await crearEspacio(O)
    const proponerLibre = (act?: string) =>
      rpc(O, 'create_proposal', {
        p_espacio_id: l.resultado.espacio_id, p_titulo: 't-e14 libre', p_franjas: FRANJAS, p_minimo: 2, p_maximo: 6,
        p_imprescindible_id: l.resultado.miembro_id, p_plazo: PLAZO, p_zona_horaria: 'America/Santiago', p_intento_id: intento(),
        ...(act === undefined ? {} : { p_actividad: act }),
      })
    expect((await proponerLibre()).propuesta.actividad).toBeNull()
    expect((await proponerLibre('cena')).propuesta.actividad).toEqual({ clave: 'cena', etiqueta: 'Cena', familia: 'comida' })
    expect((await proponerLibre('peli_casa')).propuesta.actividad).toEqual({ clave: 'peli_casa', etiqueta: 'Película en casa', familia: 'en_casa' })
  })

  it('7. el demo queda libre y reset_demo no lo toca', async () => {
    const d = await ok(O, 'seed_demo_space')
    expect(d.espacio).toMatchObject({ proposito: 'libre', familia: 'libre' })
    const r = await ok(O, 'reset_demo', { p_espacio_id: d.espacio.id, p_intento_id: intento() })
    expect(r.espacio).toMatchObject({ proposito: 'libre', familia: 'libre' })
  })

  it('8. catálogo: las 16 actividades se pueden marcar (filas 15 a 17 incluidas); lista permitida 41/0', async () => {
    const d = await ok(O, 'seed_demo_space')
    const op = (await ok(O, 'get_my_preferences', { p_espacio_id: d.espacio.id })).opciones.actividades
    const claves = op.map((a: Json) => a.clave)
    for (const c of ['tenis', 'basquet', 'peli_casa']) expect(claves).toContain(c)
    expect(claves).toHaveLength(16)
    expect(Object.keys(PERMITIDAS)).toHaveLength(TOTAL_PERMITIDAS)
    expect((await rpcCrudo(clienteSinSesion(), 'create_space', PERMITIDAS.create_space())).error?.code).toBe('42501')
  })
})
