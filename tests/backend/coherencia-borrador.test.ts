// 0057 (coherencia del borrador): los 7 casos de docs/auditoria-agente.md §2b contra la base real. Datos ficticios:
// espacios "t-coh-…" con sesiones de prueba y el demo propio de una sesión (Tomi y sus simulados, que la prueba
// lleva a 12 y a 20 personas). Cuatro sesiones para todo el archivo (tope de sesiones anónimas por hora).
import { beforeAll, describe, expect, it } from 'vitest'
import { demoPrueba, nuevaSesion, ok, rpc, simulado, sufijo, type Json, type Sesion } from './helpers'

type Pref = Record<string, unknown>
const SECO = { sabado: 'seco', domingo: 'seco' }
const DESCONOCIDO = { sabado: 'desconocido', domingo: 'desconocido' }
const PREF = (me: string[], extra: Pref = {}): Pref => ({
  presupuesto: 'da_igual', energia: 'con_todo', ambiente: 'da_igual', lugar: 'da_igual', me_gustaria: me, ...extra,
})
// Del catálogo (0014, 0038, 0044, 0048): al aire libre y gratis.
const AIRE_LIBRE = ['lugar-sim-03', 'lugar-sim-04', 'lugar-sim-12', 'lugar-sim-15', 'lugar-sim-16']
const GRATIS = ['lugar-sim-04', 'lugar-sim-10', 'lugar-sim-12']

const entra = (c: Json, n: number) => c.personas.min <= n && n <= c.personas.max

/** El orden por tamaño: primero lo que entra, después (si nada entra) lo de cupo menor, al final lo que pide más gente. */
function ordenPorTamano(r: Json, n: number) {
  const rango = (c: Json) => (entra(c, n) ? 0 : c.personas.max < n ? 1 : 2)
  const rangos = r.candidatas.map(rango)
  expect(rangos, JSON.stringify(r.candidatas.map((c: Json) => [c.id, c.personas]))).toEqual([...rangos].sort())
  if (rangos.includes(0)) expect(rangos).not.toContain(1)
}

describe('0057: coherencia del borrador del agente (tamaño del grupo y gustos)', { timeout: 240_000 }, () => {
  let O: Sesion
  let U: Sesion
  let V: Sesion
  let W: Sesion
  let sabado: string

  const espacioCon = async (gente: Sesion[]) => {
    const r = await ok(O, 'create_space', { p_nombre: `t-coh-${sufijo()}`, p_tipo: 'amigos', p_nombre_visible: 'Org t' })
    for (const [i, s] of gente.entries()) await ok(s, 'join_space', { p_codigo: r.resultado.codigo_invitacion, p_nombre_visible: `P${i} t` })
    return r.resultado.espacio_id as string
  }
  const plan = async (esp: string, clima: Json = SECO) => {
    const r = await rpc(O, 'proponer_plan_borrador', { p_espacio_id: esp, p_sabado: sabado, p_clima: clima })
    return r.ok ? r.resultado : r.error
  }
  const guardar = (s: Sesion, esp: string, p: Pref) => ok(s, 'save_my_preferences', { p_espacio_id: esp, p_preferencias: p })

  beforeAll(async () => {
    ;[O, U, V, W] = await Promise.all([nuevaSesion(), nuevaSesion(), nuevaSesion(), nuevaSesion()])
    const hoy = (await ok(O, 'server_info')).servidor_ahora.local.slice(0, 10)
    const x = new Date(`${hoy}T00:00:00Z`)
    do x.setUTCDate(x.getUTCDate() + 1)
    while (x.getUTCDay() !== 6)
    sabado = x.toISOString().slice(0, 10)
  }, 60_000)

  it('c2: 3 personas que quieren fútbol: primero algo que entra para 3; el fútbol (mín. 10) al final', async () => {
    const esp = await espacioCon([U, V])
    for (const s of [O, U, V]) await guardar(s, esp, PREF(['futbol'], { momento: 'manana' }))
    const r = await plan(esp)
    expect(r.tipo).toBe('borrador')
    expect(entra(r.candidatas[0], 3), r.candidatas[0].id).toBe(true)
    ordenPorTamano(r, 3)
    const futbol = r.candidatas.findIndex((c: Json) => c.actividad === 'futbol')
    if (futbol >= 0) expect(futbol).toBe(r.candidatas.length - 1)
  })

  it('c3: 4 personas que quieren cine de noche: el cine aparece primero; la fiesta (mín. 6) no va antes', async () => {
    const esp = await espacioCon([U, V, W])
    for (const s of [O, U, V, W]) await guardar(s, esp, PREF(['cine'], { momento: 'noche' }))
    const r = await plan(esp)
    expect(r.tipo).toBe('borrador')
    expect(r.candidatas[0].actividad).toBe('cine')
    expect(r.actividad).toBe('cine')
    ordenPorTamano(r, 4)
    // Con 3 personas además de quien pide, el perfil y la frase siguen sin gustos (umbrales de siempre).
    expect(r.perfil_grupo).toEqual({ personas: 3 })
    for (const c of r.candidatas) expect(c.frases_grupo).not.toContain('el_mas_elegido')
  })

  it('c5: 2 personas, ojalá gratis, quieren fiesta o bar de noche: solo opciones gratis (el presupuesto manda)', async () => {
    const esp = await espacioCon([U])
    for (const s of [O, U]) await guardar(s, esp, PREF(['fiesta', 'bar'], { presupuesto: 'ojala_gratis', momento: 'noche' }))
    const r = await plan(esp)
    expect(r.tipo).toBe('borrador')
    for (const c of r.candidatas) expect(GRATIS, c.id).toContain(c.id)
    ordenPorTamano(r, 2)
  })

  describe('demo propio (6, 12 y 20 personas)', () => {
    let demo: Json
    let ids: Record<string, string>
    const sim = (id: string, p: Pref) => ok(O, 'simulate_save_preferences', { p_espacio_id: demo.espacioId, p_miembro_id: id, p_preferencias: p })
    /** Tomi y todos los simulados con las mismas preferencias; `porPersona` cambia algunas claves según el índice. */
    const todos = async (p: Pref, porPersona: (i: number) => Pref = () => ({})) => {
      await guardar(O, demo.espacioId, { ...p, ...porPersona(0) })
      for (const [i, id] of Object.values(ids).entries()) await sim(id, { ...p, ...porPersona(i + 1) })
    }
    const sumar = async (hasta: number) => {
      const actual = Object.keys(ids).length + 1
      for (let i = actual; i < hasta; i++) {
        const nombre = `Coh${i} t`
        ids[nombre] = await simulado(O, demo.espacioId, nombre)
      }
    }

    beforeAll(async () => {
      demo = await demoPrueba(O)
      const miembros = (await ok(O, 'get_space', { p_espacio_id: demo.espacioId })).espacio.miembros as Json[]
      ids = Object.fromEntries(miembros.filter((m) => m.miembro_id !== demo.miembroId).map((m) => [m.nombre, m.miembro_id]))
      expect(Object.keys(ids).length + 1).toBe(6)
    }, 60_000)

    it('c4: 6 personas, alguien pide techo y no hay pronóstico: nada al aire libre y todo entra para 6', async () => {
      await todos(PREF(['parque', 'cerro'], { momento: 'tarde' }), (i) => (i === 0 ? { lugar: 'bajo_techo' } : {}))
      const r = await plan(demo.espacioId, DESCONOCIDO)
      expect(r.tipo).toBe('borrador')
      for (const c of r.candidatas) expect(AIRE_LIBRE, c.id).not.toContain(c.id)
      ordenPorTamano(r, 6)
    })

    it('c1: 12 personas que quieren pádel: el pádel (máx. 4) no sale; todo lo que sale entra para 12', async () => {
      await sumar(12)
      await todos(PREF(['padel'], { momento: 'manana' }))
      const r = await plan(demo.espacioId)
      expect(r.tipo).toBe('borrador')
      expect(r.candidatas.map((c: Json) => c.actividad)).not.toContain('padel')
      for (const c of r.candidatas) expect(entra(c, 12), c.id).toBe(true)
    })

    it('c7: 20 personas que quieren café o cena: solo lo que entra para 20 (café máx. 6 y cena máx. 8 no salen)', async () => {
      await sumar(20)
      await todos(PREF(['cafe', 'cena'], { momento: 'manana' }))
      const r = await plan(demo.espacioId)
      expect(r.tipo).toBe('borrador')
      expect(r.candidatas.length).toBeGreaterThan(0)
      for (const c of r.candidatas) expect(entra(c, 20), c.id).toBe(true)
    })

    it('c6 (último: simulate conserva la zona en los siguientes): viaje máximo 15 min en transporte público, mitad Puente Alto y mitad Vitacura: sin lugar cerca para todos', async () => {
      await todos(PREF(['asado'], { momento: 'tarde', movilidad: 'transporte_publico', tiempo_max: '15' }), (i) => ({
        zona: i % 2 === 0 ? 'puente_alto' : 'vitacura',
      }))
      expect(await plan(demo.espacioId)).toEqual({ tipo: 'sin_plan_compatible', motivo: 'sin_lugar_cerca_para_todos' })
    })
  })
})
