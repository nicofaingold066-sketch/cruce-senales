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

// 0049: el agente con propósito (filtro por familia, quórum) y "Me gustaría" dentro de la familia. Se saltea sola
// mientras 0049 no esté aplicada (get_my_preferences todavía no trae `familia` en cada actividad).
describe('enmienda 14 (0049): agente con familia y quórum', { timeout: 180_000 }, () => {
  let O: Sesion
  let U: Sesion
  let V: Sesion
  let sabado: string
  let aplicada = false
  const SECO = { sabado: 'seco', domingo: 'seco' }
  const PREF = (me: string[]) => ({ presupuesto: 'da_igual', energia: 'con_todo', ambiente: 'da_igual', lugar: 'da_igual', me_gustaria: me })

  const espacioCon = async (proposito: string, gente: Sesion[], integrantes: string[] = []) => {
    const r = await ok(O, 'create_space', {
      p_nombre: `t-e14b-${sufijo()}`, p_tipo: 'amigos', p_nombre_visible: 'Org t', p_proposito: proposito,
      ...(integrantes.length ? { p_integrantes: integrantes } : {}),
    })
    for (const [i, s] of gente.entries()) await ok(s, 'join_space', { p_codigo: r.resultado.codigo_invitacion, p_nombre_visible: `P${i} t` })
    return r.resultado.espacio_id as string
  }
  const plan = async (esp: string) => {
    const r = await rpc(O, 'proponer_plan_borrador', { p_espacio_id: esp, p_sabado: sabado, p_clima: SECO })
    return r.ok ? r.resultado : r.error
  }

  beforeAll(async () => {
    ;[O, U, V] = await Promise.all([nuevaSesion(), nuevaSesion(), nuevaSesion()])
    const d = await ok(O, 'seed_demo_space')
    const op = (await ok(O, 'get_my_preferences', { p_espacio_id: d.espacio.id })).opciones.actividades
    aplicada = op.every((a: Json) => typeof a.familia === 'string')
    const hoy = (await ok(O, 'server_info')).servidor_ahora.local.slice(0, 10)
    const x = new Date(`${hoy}T00:00:00Z`)
    do x.setUTCDate(x.getUTCDate() + 1)
    while (x.getUTCDay() !== 6)
    sabado = x.toISOString().slice(0, 10)
  }, 60_000)

  it('3. "Me gustaría" solo de la familia del grupo; en libre, las 16 con su familia', async () => {
    if (!aplicada) return
    const esp = await espacioCon('deporte', [])
    const op = (await ok(O, 'get_my_preferences', { p_espacio_id: esp })).opciones.actividades
    expect(op.map((a: Json) => a.clave).sort()).toEqual(['basquet', 'futbol', 'padel', 'tenis'])
    for (const a of op) expect(a.familia).toBe('deporte')
    const asado = await rpc(O, 'save_my_preferences', { p_espacio_id: esp, p_preferencias: PREF(['asado']) })
    expect(err(asado)).toBe('entrada_incompleta/fuera_de_proposito')
    expect(err(await rpc(O, 'save_my_preferences', { p_espacio_id: esp, p_preferencias: PREF(['padel']) }))).toBe('ok')
    const libre = await espacioCon('libre', [])
    const todas = (await ok(O, 'get_my_preferences', { p_espacio_id: libre })).opciones.actividades
    expect(todas).toHaveLength(16)
    // Espejo de src/lib/types.ts: familia de cada actividad igual a la del servidor.
    const espejo: Record<string, string> = {
      futbol: 'deporte', padel: 'deporte', tenis: 'deporte', basquet: 'deporte', asado: 'comida', cena: 'comida', cafe: 'comida',
      fiesta: 'salida_noche', bar: 'salida_noche', juegos_salida: 'salida_noche', cultura: 'cultura', cine: 'cultura',
      parque: 'aire_libre', cerro: 'aire_libre', juegos_casa: 'en_casa', peli_casa: 'en_casa',
    }
    expect(Object.fromEntries(todas.map((a: Json) => [a.clave, a.familia]))).toEqual(espejo)
  })

  it('4. agente: solo la familia, solo lo que alcanza, aviso de quórum; faltan_personas; los pendientes no cuentan', async () => {
    if (!aplicada) return
    // Grupo de fútbol con 3 personas (y 2 pendientes que no cuentan): fútbol (10), básquet (6) y pádel (4) no alcanzan.
    const esp = await espacioCon('futbol', [U, V], ['Pend uno t', 'Pend dos t'])
    for (const s of [O, U]) await ok(s, 'save_my_preferences', { p_espacio_id: esp, p_preferencias: PREF(['futbol', 'tenis']) })
    const r = await plan(esp)
    expect(r.tipo).toBe('borrador')
    expect(r.candidatas.map((c: Json) => c.actividad)).toEqual(['tenis'])
    for (const c of r.candidatas) {
      expect(c.familia).toBe('deporte')
      expect(c.personas.min).toBeLessThanOrEqual(3)
    }
    expect(r.quorum).toEqual({ actividad: 'futbol', etiqueta: 'Fútbol', personas_min: 10, personas_posibles: 3 })
    // Salida/noche con 2 personas: bar (3) y bowling (4) no alcanzan.
    const noche = await espacioCon('salida_noche', [U])
    for (const s of [O, U]) await ok(s, 'save_my_preferences', { p_espacio_id: noche, p_preferencias: PREF(['bar']) })
    expect(await plan(noche)).toEqual({ tipo: 'sin_plan_compatible', motivo: 'faltan_personas' })
    // Un grupo de tenis de 2: tenis, con la frase del propósito y sin aviso de quórum.
    const tenis = await espacioCon('tenis', [U])
    for (const s of [O, U]) await ok(s, 'save_my_preferences', { p_espacio_id: tenis, p_preferencias: PREF(['tenis']) })
    const t = await plan(tenis)
    expect(t.candidatas[0].actividad).toBe('tenis')
    expect(t.candidatas[0].frases_grupo).toContain('proposito_del_grupo')
    expect(t.quorum).toBeNull()
    // Privacidad: nada por persona.
    const txt = JSON.stringify(r)
    for (const n of ['P0 t', 'P1 t', 'Pend uno t', 'Org t']) expect(txt).not.toContain(n)
  })

  it('10. (0051, pedido de Nico 00:01) la fiesta es candidata en un grupo de noche de 6: sábado 23–03 y domingo 22–02', async () => {
    if (!aplicada) return
    const otros = await Promise.all([nuevaSesion(), nuevaSesion(), nuevaSesion()])
    const esp = await espacioCon('fiesta', [U, V, ...otros]) // 6 personas, ninguna pendiente
    const NOCHE = { ...PREF(['fiesta', 'bar']), ambiente: 'fiesta', momento: 'noche' }
    for (const s of [O, U, V]) await ok(s, 'save_my_preferences', { p_espacio_id: esp, p_preferencias: NOCHE })
    const r = await plan(esp)
    expect(r.tipo).toBe('borrador')
    const fiesta = r.candidatas.find((c: Json) => c.actividad === 'fiesta')
    expect(fiesta, JSON.stringify(r.candidatas.map((c: Json) => c.actividad))).toBeTruthy()
    expect(fiesta.titulo).toBe('Fiesta en un bar')
    const dom = new Date(`${sabado}T12:00:00Z`)
    dom.setUTCDate(dom.getUTCDate() + 1)
    const lun = new Date(dom)
    lun.setUTCDate(lun.getUTCDate() + 1)
    const d = (x: Date) => x.toISOString().slice(0, 10)
    expect(fiesta.franjas).toEqual([
      { inicio: `${sabado}T23:00`, fin: `${d(dom)}T03:00` },
      { inicio: `${d(dom)}T22:00`, fin: `${d(lun)}T02:00` },
    ])
    expect(r.quorum).toBeNull() // 6 personas alcanzan el mínimo de la fiesta
  })

  it('5. el agente social publica con la actividad de la fila en un grupo con propósito', async () => {
    if (!aplicada) return
    const esp = await espacioCon('deporte', [U, V])
    for (const s of [O, U]) await ok(s, 'save_my_preferences', { p_espacio_id: esp, p_preferencias: PREF(['tenis']) })
    await ok(U, 'set_recibir_invitaciones_agente', { p_espacio_id: esp, p_recibir: true })
    const ops = (await ok(O, 'agente_social_candidatos', { p_espacio_id: esp, p_sabado: sabado, p_clima: SECO })).opciones
    expect(ops[0]).toMatchObject({ actividad: 'tenis', familia: 'deporte', personas: { min: 2, max: 4 } })
    const id = intento()
    await ok(O, 'iniciar_ejecucion_agente', { p_espacio_id: esp, p_ejecucion_id: id, p_oportunidad: `sabado:${sabado}`, p_parametros_hash: 'e14' })
    const g = await ok(O, 'guardar_borrador_agente', { p_ejecucion_id: id, p_opcion_ref: ops[0].opcion_ref, p_texto: 'Tenis el sábado.' })
    // Ajuste 9: minimo = greatest(least(3, maximo), personas_min) acotado por maximo = greatest(3, 2) = 3.
    expect(g.borrador.plan).toMatchObject({ actividad: 'tenis', minimo: 3, maximo: 3 })
    await ok(O, 'aprobar_borrador_agente', { p_ejecucion_id: id, p_borrador_hash: g.borrador.hash, p_intento_id: intento() })
    const pub = await rpc(O, 'publicar_borrador_agente', { p_ejecucion_id: id, p_borrador_hash: g.borrador.hash, p_intento_id: intento() })
    expect(err(pub)).toBe('ok')
    const prop = (await ok(O, 'get_proposal_state', { p_propuesta_id: pub.propuesta.id })).propuesta
    expect(prop.actividad).toEqual({ clave: 'tenis', etiqueta: 'Tenis', familia: 'deporte' })
    await ok(O, 'cancel_proposal', { p_propuesta_id: pub.propuesta.id })
  })

  it('9. (0050) propósito "cultura" es la familia: ni +3 ni proposito_del_grupo ni quórum; con "cine", sí la frase', async () => {
    if (!aplicada) return
    const cul = await espacioCon('cultura', [U])
    for (const s of [O, U]) await ok(s, 'save_my_preferences', { p_espacio_id: cul, p_preferencias: PREF(['cultura', 'cine']) })
    const r = await plan(cul)
    expect(r.tipo).toBe('borrador')
    for (const c of r.candidatas) {
      expect(c.familia).toBe('cultura')
      expect(c.frases_grupo).not.toContain('proposito_del_grupo')
    }
    expect(r.quorum).toBeNull()
    const cine = await espacioCon('cine', [U])
    for (const s of [O, U]) await ok(s, 'save_my_preferences', { p_espacio_id: cine, p_preferencias: PREF(['cultura', 'cine']) })
    const r2 = await plan(cine)
    expect(r2.candidatas.find((c: Json) => c.actividad === 'cine').frases_grupo).toContain('proposito_del_grupo')
    for (const c of r2.candidatas.filter((c: Json) => c.actividad !== 'cine')) expect(c.frases_grupo).not.toContain('proposito_del_grupo')
  })

  it('6. el demo (libre) no cambia: el agente sigue eligiendo la parrilla del parque primero', async () => {
    if (!aplicada) return
    const d = await ok(O, 'seed_demo_space')
    await ok(O, 'reset_demo', { p_espacio_id: d.espacio.id, p_intento_id: intento() })
    const r = await plan(d.espacio.id)
    expect(r.lugar.id).toBe('lugar-sim-14')
    expect(r.quorum).toBeNull()
  })
})

// 0050: cuando se retira la persona imprescindible y el mínimo sigue cumplido, quien no organiza no puede
// deducir quién se fue por el texto de siguiente_accion (revisión de la E14, privacidad).
describe('enmienda 14 (0050): baja del imprescindible sin delatarlo', { timeout: 180_000 }, () => {
  it('quien no organiza lee "ya no reúne lo necesario"; el organizador sigue viendo la causa', async () => {
    const [O, U] = await Promise.all([nuevaSesion(), nuevaSesion()])
    const d = await ok(O, 'seed_demo_space')
    await ok(O, 'reset_demo', { p_espacio_id: d.espacio.id, p_intento_id: intento() })
    await ok(U, 'join_space', { p_codigo: d.espacio.codigo_invitacion, p_nombre_visible: 'Invitada e14c t' })
    const ids = Object.fromEntries(d.espacio.miembros.map((m: Json) => [m.nombre, m.miembro_id]))
    const r = await ok(O, 'create_proposal', {
      p_espacio_id: d.espacio.id, p_titulo: 't-e14c anfitrión', p_franjas: FRANJAS, p_minimo: 3, p_maximo: 6,
      p_imprescindible_id: ids.Mati, p_plazo: PLAZO, p_zona_horaria: 'America/Santiago', p_intento_id: intento(),
    })
    const prop = r.resultado.propuesta_id
    await ok(O, 'open_proposal', { p_propuesta_id: prop })
    await ok(O, 'simulate_load_case', { p_propuesta_id: prop, p_intento_id: intento() })
    await ok(O, 'save_my_conditions', { p_propuesta_id: prop, p_disponibilidad: { A: 'si', B: 'si' } })
    await ok(U, 'save_my_conditions', { p_propuesta_id: prop, p_disponibilidad: { A: 'si', B: 'no' } })
    await ok(O, 'evaluate_and_publish', { p_propuesta_id: prop, p_intento_id: intento() })
    await ok(U, 'accept_version', { p_propuesta_id: prop, p_version: 1, p_intento_id: intento() })
    await ok(O, 'accept_version', { p_propuesta_id: prop, p_version: 1, p_intento_id: intento() })
    for (const n of ['Luna', 'Mati']) {
      await ok(O, 'simulate_accept', { p_propuesta_id: prop, p_miembro_id: ids[n], p_version: 1, p_intento_id: intento() })
    }
    const est = (s: Sesion) => ok(s, 'get_proposal_state', { p_propuesta_id: prop }).then((x: Json) => x.propuesta)
    expect((await est(U)).estado).toBe('grupo_confirmado')
    // Se baja Mati (la imprescindible): quedan 3 confirmados con mínimo 3, así que la causa sería deducible.
    await ok(O, 'simulate_withdraw', { p_propuesta_id: prop, p_miembro_id: ids.Mati })
    const u = await est(U)
    expect(u.estado).toBe('en_revision')
    expect(u.siguiente_accion).toEqual({ codigo: 'buscar_alternativa', texto: 'La versión 1 ya no reúne lo necesario para juntarse.' })
    expect(JSON.stringify(u.siguiente_accion)).not.toMatch(/anfitri|mínimo/)
    const lista = (await ok(U, 'list_proposals', { p_espacio_id: d.espacio.id })).propuestas.find((p: Json) => p.id === prop)
    expect(lista.siguiente_accion).toEqual(u.siguiente_accion)
    const o = await est(O)
    expect(o.siguiente_accion.codigo).toBe('buscar_alternativa')
    expect(o.siguiente_accion.texto).toContain('anfitrión')
    await ok(O, 'cancel_proposal', { p_propuesta_id: prop })
  })
})
