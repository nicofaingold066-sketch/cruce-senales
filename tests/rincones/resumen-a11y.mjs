// Resume un a11y-*.json: por rincón, fallas y avisos (sin repetir por ancho), y al final los "info" de orden de Tab y anuncios.
// Uso: node resumen-a11y.mjs <a11y.json> [--todo]
import { readFileSync } from 'node:fs'
const d = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const todo = process.argv.includes('--todo')
const por = new Map()
for (const h of d) {
  const k = `${h.id}|${h.nivel}|${h.regla}|${h.detalle}`
  if (!por.has(k)) por.set(k, { ...h, anchos: new Set() })
  por.get(k).anchos.add(h.ancho)
}
const orden = { falla: 0, aviso: 1, info: 2 }
const filas = [...por.values()].sort((a, b) => a.id.localeCompare(b.id) || orden[a.nivel] - orden[b.nivel] || a.regla.localeCompare(b.regla))
let ultimo = ''
const totales = { falla: 0, aviso: 0 }
for (const h of filas) {
  if (h.nivel === 'info' && !todo && !/anuncio|foco-pantalla/.test(h.regla)) continue
  if (h.id !== ultimo) { console.log(`\n== ${h.id} ${h.rincon}`); ultimo = h.id }
  if (h.nivel !== 'info') totales[h.nivel]++
  console.log(`  ${h.nivel.toUpperCase().padEnd(5)} [${[...h.anchos].join(',')}] ${h.regla}: ${h.detalle}`)
}
console.log(`\nTOTAL fallas ${totales.falla} · avisos ${totales.aviso} (sin repetir por ancho)`)
// Reglas con más fallas
const porRegla = {}
for (const h of filas) if (h.nivel === 'falla') porRegla[h.regla] = (porRegla[h.regla] || 0) + 1
console.log('por regla:', Object.entries(porRegla).sort((a, b) => b[1] - a[1]).map(([r, n]) => `${r} ${n}`).join(' · '))
