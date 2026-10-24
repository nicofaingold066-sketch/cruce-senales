// Resume los registros de docs/qa/logs/<dir>/*.txt: PASS/FAIL por bloque y la lista de FAIL.
//   node tests/qa-gente/resumen.mjs [docs/qa/logs/v2]
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
const dir = resolve(process.argv[2] || 'docs/qa/logs/v2')
let P = 0, F = 0
for (const f of readdirSync(dir).filter((x) => x.endsWith('.txt') && !x.startsWith('cadena')).sort()) {
  const t = readFileSync(`${dir}/${f}`, 'utf8'); const j = t.split('\n').find((l) => l.startsWith('JSON '))
  if (!j) { console.log(`${f}: sin JSON (no terminó)`); continue }
  const r = JSON.parse(j.slice(5)); const fa = r.filas.filter((x) => !x.cond); P += r.filas.length - fa.length; F += fa.length
  console.log(`${r.guion}: ${r.filas.length - fa.length} PASS, ${fa.length} FAIL`)
  for (const x of fa) console.log(`   FAIL ${x.nombre} → ${String(x.detalle).slice(0, 200)}`)
}
console.log(`TOTAL: ${P} PASS, ${F} FAIL`)
