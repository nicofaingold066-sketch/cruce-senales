// #29: datos ficticios propios; RPC real y handler real del agente en runtime sin clave/modelo.
// No se llama a la función desplegada: no tiene un parámetro que garantice no facturar si se agrega una clave.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'
import { createClient } from '@supabase/supabase-js'
import * as logica from '../../supabase/functions/agente/logica'
import { nuevaSesion, ok, rpc, crearEspacioPrueba, type Sesion, type Json } from '../backend/helpers'

const PREF = (actividades: string[]) => ({ presupuesto: 'da_igual', energia: 'algo_tranquilo',
  ambiente: 'tranquilo', lugar: 'da_igual', me_gustaria: actividades })
const COORD = 'https://raw.githubusercontent.com/nicofaingold066-sketch/cruce-senales/coordinacion/agentes/backend.md'

async function baseLibre() {
  const r = await fetch(`${COORD}?t=${Date.now()}`, { signal: AbortSignal.timeout(15_000) })
  expect(r.ok, 'No se pudo verificar la coordinación: no se prueba la base a ciegas').toBe(true)
  expect(await r.text(), 'Migración en curso: esperar, no ejecutar esta suite').not.toMatch(/MIGRACION EN CURSO:\s*00\d\d/)
}

// Scanner estructural, con controles negativos: no confunde un agregado permitido con preferencias individuales.
function privadoAusente(v: unknown, nombres: string[], ids: string[], ruta = '$') {
  if (typeof v === 'string') {
    for (const secreto of [...nombres, ...ids]) expect(v.includes(secreto), `${ruta}: identidad expuesta`).toBe(false)
    return
  }
  if (!v || typeof v !== 'object') return
  if (Array.isArray(v)) { v.forEach((x, i) => privadoAusente(x, nombres, ids, `${ruta}[${i}]`)); return }
  for (const [k, valor] of Object.entries(v)) {
    expect(['preferencias', 'me_gustaria', 'disponibilidad', 'condiciones', 'miembro_id', 'user_id',
      'auth_user_id', 'access_token', 'refresh_token', 'puntaje', 'descartadas'].includes(k), `${ruta}.${k}`).toBe(false)
    if (k === 'cuantos') expect(valor, `${ruta}.cuantos: señal individual`).toBeGreaterThanOrEqual(2)
    privadoAusente(valor, nombres, ids, `${ruta}.${k}`)
  }
}

describe('#29 · regresión de privacidad del agente', () => {
  const sesiones: Sesion[] = []
  const nombres = ['Priv29Organiza', 'Priv29Una', 'Priv29Dos', 'Priv29Tres', 'Priv29Cuatro']
  const miembros: string[] = []
  let espacio: string
  let sabado: string
  let handler: (req: Request) => Promise<Response>
  let modeloIntentos = 0
  let rpcReales = 0

  beforeAll(async () => {
    await baseLibre()
    // Cinco sesiones reutilizadas para todos los casos; no se tocan demos compartidos.
    for (let i = 0; i < 5; i++) sesiones.push(await nuevaSesion())
    const e = await crearEspacioPrueba(sesiones[0], 'priv29', nombres[0])
    espacio = e.espacioId; miembros.push(e.miembroId)
    for (let i = 1; i < 5; i++) {
      const r = await ok(sesiones[i], 'join_space', { p_codigo: e.codigo, p_nombre_visible: nombres[i] })
      miembros.push(r.resultado.miembro_id)
    }
    const hoy = (await ok(sesiones[0], 'server_info')).servidor_ahora.local.slice(0, 10)
    const d = new Date(`${hoy}T00:00:00Z`)
    do { d.setUTCDate(d.getUTCDate() + 1) } while (d.getUTCDay() !== 6)
    sabado = d.toISOString().slice(0, 10)
    const preferencias = [['asado'], ['asado', 'parque'], ['asado', 'parque'], ['asado'], ['futbol']]
    for (let i = 0; i < 5; i++) await ok(sesiones[i], 'save_my_preferences', {
      p_espacio_id: espacio, p_preferencias: PREF(preferencias[i]),
    })
    // Ejecuta index.ts sin editarlo. Solo sustituye imports/runtime Deno; todas sus RPC son reales.
    const original = await readFile(new URL('../../supabase/functions/agente/index.ts', import.meta.url), 'utf8')
    const sinImports = original.replace(/^import \{ createClient \} from .*$/m, '')
      .replace(/^import Anthropic from .*$/m, '').replace(/import \{[\s\S]*?\} from '\.\/logica\.ts'/, '')
    const code = stripTypeScriptTypes(sinImports)
    const DenoSeguro = {
      env: { get: (k: string) => ({ SUPABASE_URL: process.env.VITE_SUPABASE_URL,
        SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_PUBLISHABLE_KEY }[k]) },
      serve: (fn: typeof handler) => { handler = fn },
    }
    class ModeloProhibido { constructor() { modeloIntentos++; throw new Error('Modelo prohibido en regresión') } }
    new Function('createClient', 'Anthropic', 'Deno', ...Object.keys(logica), code)(
      createClient, ModeloProhibido, DenoSeguro, ...Object.values(logica))
    expect(handler).toBeTypeOf('function')
  }, 90_000)

  afterAll(async () => {
    for (const s of sesiones) await s.c.auth.signOut({ scope: 'local' })
    console.log(`#29: ${rpcReales} RPC de borrador; ${modeloIntentos} intentos de modelo; ${sesiones.length} sesiones propias`)
  })

  const secretos = () => [...miembros, ...sesiones.map(s => s.userId)]
  const args = () => ({ p_espacio_id: espacio, p_sabado: sabado, p_clima: { sabado: 'seco', domingo: 'seco' } })
  async function funcion(s = sesiones[0]) {
    const { data } = await s.c.auth.getSession()
    const response = await handler(new Request('https://prueba.invalid/agente', { method: 'POST', headers: {
      Authorization: `Bearer ${data.session!.access_token}`, 'Content-Type': 'application/json',
    }, body: JSON.stringify({ espacio_id: espacio, sabado }) }))
    return response.json() as Promise<Json>
  }

  it('el scanner detecta singleton, identidad y preferencias, incluso anidados', () => {
    for (const v of [{ x: { gustos: [{ cuantos: 1 }] } }, { x: { me_gustaria: ['padel'] } },
      { mensaje: nombres[2] }, { x: { texto: miembros[1] } }]) {
      expect(() => privadoAusente(v, nombres, secretos())).toThrow()
    }
  })

  it('RPC real: singleton ausente, agregado de dos visible y sin datos individuales', async () => {
    await baseLibre()
    const r = await ok(sesiones[0], 'proponer_plan_borrador', args()); rpcReales++
    expect(r.resultado.tipo).toBe('borrador')
    privadoAusente(r, nombres, secretos())
    expect(r.resultado.perfil_grupo.gustos).toContainEqual({ actividad_etiqueta: 'Parque', cuantos: 2 })
    expect(r.resultado.perfil_grupo.gustos.some((g: Json) => g.actividad_etiqueta === 'Fútbol')).toBe(false)
  }, 30_000)

  it('handler real, JWT real y sin clave: texto fijo, sin singleton ni preferencias individuales', async () => {
    await baseLibre()
    const r = await funcion()
    expect(r.ok).toBe(true)
    expect(r.resultado).toMatchObject({ tipo: 'borrador', eleccion_fuente: 'regla', explicacion_fuente: 'texto_fijo' })
    privadoAusente(r, nombres, secretos())
    expect(modeloIntentos).toBe(0)
  }, 30_000)

  it('el segundo voto hace visible Fútbol en ambos caminos; el filtro no borra todo el perfil', async () => {
    await baseLibre()
    await ok(sesiones[3], 'save_my_preferences', { p_espacio_id: espacio, p_preferencias: PREF(['asado', 'futbol']) })
    const r = await ok(sesiones[0], 'proponer_plan_borrador', args()); rpcReales++
    const f = await funcion()
    for (const respuesta of [r, f]) {
      expect(respuesta.ok).toBe(true)
      privadoAusente(respuesta, nombres, secretos())
      expect(respuesta.resultado.perfil_grupo.gustos).toContainEqual({ actividad_etiqueta: 'Fútbol', cuantos: 2 })
    }
  }, 30_000)

  it('miembro común y ajeno reciben errores sin nombres ni preferencias por RPC y handler', async () => {
    await baseLibre()
    const ajeno = await crearEspacioPrueba(sesiones[4], 'priv29-ajeno', 'Priv29Ajeno')
    for (const [s, id, detalle] of [[sesiones[1], espacio, 'no_es_organizador_espacio'],
      [sesiones[0], ajeno.espacioId, 'no_miembro']] as const) {
      const r = await rpc(s, 'proponer_plan_borrador', { ...args(), p_espacio_id: id }); rpcReales++
      expect(r.ok).toBe(false); expect(r.error.detalle).toBe(detalle)
      privadoAusente(r, nombres, secretos())
    }
    const f = await funcion(sesiones[1])
    expect(f.ok).toBe(false); expect(f.error.detalle).toBe('no_es_organizador_espacio')
    privadoAusente(f, nombres, secretos())
  }, 30_000)
})
