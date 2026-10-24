// Guardia P-A (psico, docs/psicologia-grupo.md §8.7) y regla D2 (enmienda 13 / psico §5): palabras que no deben
// aparecer en copia visible para el grupo.
//   §8.7: etiquetas de comida, pareja y género que el agente no puede escribir.
//   D2: ningún texto visible pide ni muestra el género ni la pareja de una persona. «Con parejas» / «solo el grupo»
//       como regla de la juntada sí se permite (no se busca "pareja" a secas, sino las formas que apuntan a alguien).
// Estática: no usa red ni base. node tests/e2e/guardia-palabras.mjs   (sale 1 si hay hallazgos)
// Revisa src/ y supabase/functions/agente/ (sin pruebas, sin comentarios de código, sin el catálogo ni las propias
// listas de palabras prohibidas del filtro, que necesariamente las contienen). Un hallazgo legítimo se anota en PERMITIDOS.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, relative } from 'node:path'
const RAIZ = fileURLToPath(new URL('../../', import.meta.url))
const PALABRAS_87 = ['vegetarian[oa]s?', 'vegan[oa]s?', 'celíac[oa]s?', 'alérgic[oa]s?', 'no come', 'pareja de', 'novi[oa]s?', 'solter[oa]s?',
  'hombres', 'mujeres', 'chicos', 'chicas', 'otra vez en casa', 'de nuevo en casa', 'ya que nadie', 'como nadie', 'para variar']
const PALABRAS_D2 = ['g[eé]nero', 'sexo', 'sex', 'hombre', 'mujer', 'masculin[oa]s?', 'femenin[oa]s?', 'casad[oa]s?', 'estado civil',
  'identidad de g[eé]nero', 'orientación sexual', 'tu pareja', 'su pareja', 'mi pareja', 'tienes pareja', 'tenés pareja',
  'vienes con (?:tu )?pareja', 'venís con (?:tu )?pareja', 'con quién vienes', 'con quién venís', 'eres hombre', 'eres mujer', 'sos hombre', 'sos mujer']
const REGLAS = [
  ['§8.7', new RegExp(`(?<![\\p{L}])(${PALABRAS_87.join('|')})(?![\\p{L}])`, 'giu')],
  ['D2', new RegExp(`(?<![\\p{L}])(${PALABRAS_D2.join('|')})(?![\\p{L}])`, 'giu')],
]
// Rutas (relativas a la raíz) que contienen las palabras a propósito: listas de prohibidas, catálogo, pruebas.
const EXCLUIR = [/\.test\.(ts|tsx|mjs)$/, /catalogo/i, /prohibid/i, /palabras/i, /\/prueba\//]
// Hallazgos aceptados: 'ruta: palabra' (con motivo). Hoy ninguno.
const PERMITIDOS = []
const archivos = []
const recorrer = (dir) => {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n)
    if (statSync(p).isDirectory()) { if (!['node_modules', 'dist', '.git'].includes(n)) recorrer(p); continue }
    if (/\.(tsx?|jsx?)$/.test(n)) archivos.push(p)
  }
}
for (const d of ['src', 'supabase/functions/agente']) { try { recorrer(join(RAIZ, d)) } catch { /* carpeta ausente en esta rama */ } }
const sinComentarios = (t) => t
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, a) => a + ' '.repeat(m.length - a.length))
let hallazgos = 0, revisados = 0
const porRegla = Object.fromEntries(REGLAS.map(([nombre]) => [nombre, 0]))
for (const f of archivos) {
  const rel = relative(RAIZ, f)
  if (EXCLUIR.some((r) => r.test('/' + rel))) continue
  revisados++
  const src = sinComentarios(readFileSync(f, 'utf8'))
  src.split('\n').forEach((linea, i) => {
    for (const [regla, re] of REGLAS) {
      for (const m of linea.matchAll(re)) {
        if (PERMITIDOS.includes(`${rel}: ${m[1].toLowerCase()}`)) continue
        hallazgos++; porRegla[regla]++
        console.log(`HALLAZGO [${regla}] ${rel}:${i + 1}  «${m[1]}»  ${linea.trim().slice(0, 110)}`)
      }
    }
  })
}
console.log(`guardia-palabras: ${revisados} archivos revisados, ${hallazgos} hallazgos (${REGLAS.map(([n]) => `${n}: ${porRegla[n]}`).join(', ')}).`)
process.exitCode = hallazgos ? 1 : 0
