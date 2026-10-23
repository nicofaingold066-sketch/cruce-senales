// Resume un hallazgos.json agrupando por rincón y tipo. Uso: node resumen.mjs <archivo.json> [--todo]
import { readFileSync } from 'node:fs'
const d = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const por = new Map()
for (const h of d.hallazgos) {
  if (h.info) continue
  const k = `${h.id}|${h.tipo}|${h.detalle}`
  if (!por.has(k)) por.set(k, { ...h, anchos: [] })
  por.get(k).anchos.push(h.ancho)
}
let ultimo = ''
for (const h of [...por.values()].sort((a, b) => a.id.localeCompare(b.id) || a.tipo.localeCompare(b.tipo))) {
  if (h.id !== ultimo) { console.log(`\n== ${h.id} ${h.rincon}`); ultimo = h.id }
  console.log(`  [${[...new Set(h.anchos)].join(',')}] ${h.tipo}: ${h.detalle}`)
}
console.log('\nERRORES', JSON.stringify(d.errores))
