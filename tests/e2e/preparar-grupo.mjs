// Origen: guion de friccion (2026-10-23). Prepara un grupo ficticio: organizador "Orga" con integrantes Ana y Beto, y una propuesta abierta. Imprime el código.
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { baseLibre } from './base-libre.mjs'
baseLibre()
const RAIZ = fileURLToPath(new URL('../../', import.meta.url))
const require = createRequire(RAIZ + 'package.json')
const { createClient } = require('@supabase/supabase-js')
const env = Object.fromEntries(readFileSync(RAIZ + '.env', 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]))
const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } })
const a = await sb.auth.signInAnonymously(); if (a.error) throw a.error
const rpc = async (fn, args) => { const r = await sb.rpc(fn, args); if (r.error || r.data?.ok === false) throw new Error(fn + ' ' + JSON.stringify(r.error ?? r.data)); return r.data }
const integrantes = (process.env.INTEGRANTES ?? 'Ana,Beto').split(',').filter(Boolean)
const e = process.env.DEMO === '1' ? await (async () => {
  const d = await rpc('seed_demo_space', {})
  const g = await rpc('get_space', { p_espacio_id: d.resultado.espacio_id })
  return { resultado: { espacio_id: d.resultado.espacio_id, codigo_invitacion: g.espacio.codigo_invitacion, miembro_id: g.espacio.miembros.find((m) => m.es_yo).miembro_id } }
})() : await rpc('create_space', { p_nombre: 'Prueba fricción ' + Date.now().toString(36), p_tipo: 'amigos', p_nombre_visible: 'Orga', ...(integrantes.length ? { p_integrantes: integrantes } : {}) })
const espacioId = e.resultado.espacio_id, codigo = e.resultado.codigo_invitacion
if (process.env.SIN_PROPUESTA !== '1') {
  const d = new Date(Date.now() + 6 * 864e5), d2 = new Date(Date.now() + 7 * 864e5), c = new Date(Date.now() + 4 * 864e5)
  const f = (x) => x.toISOString().slice(0, 10)
  const p = await rpc('create_proposal', { p_espacio_id: espacioId, p_titulo: 'Asado de prueba', p_franjas: [{ inicio: f(d) + 'T14:00', fin: f(d) + 'T17:00' }, { inicio: f(d2) + 'T14:00', fin: f(d2) + 'T17:00' }], p_minimo: 2, p_maximo: 4, p_imprescindible_id: e.resultado.miembro_id, p_plazo: f(c) + 'T20:00', p_zona_horaria: 'America/Santiago', p_intento_id: crypto.randomUUID() })
  if (process.env.SIN_ABRIR !== '1') await rpc('open_proposal', { p_propuesta_id: p.resultado.propuesta_id })
  console.log(JSON.stringify({ codigo, espacioId, propuestaId: p.resultado.propuesta_id }))
} else console.log(JSON.stringify({ codigo, espacioId }))
