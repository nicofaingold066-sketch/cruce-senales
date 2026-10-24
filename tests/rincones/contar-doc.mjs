// Cuenta los rincones de docs/rincones.md por veredicto (la última celda de cada fila del inventario) y las observaciones O-xx
// por estado. Uso: node contar-doc.mjs [ruta-al-doc]   Sirve para el resumen de las 08:00.
import { readFileSync } from 'node:fs'
const doc = readFileSync(process.argv[2] || new URL('../../docs/rincones.md', import.meta.url), 'utf8')
const inv = doc.split('## Inventario de rincones')[1] || ''
const cuenta = { A: 0, O: 0, R: 0, pendiente: 0, otro: 0 }
const otros = []
let colEstado = -1
for (const l of inv.split('\n')) {
  if (/^\| Id \|/.test(l)) { const h = l.split('|').map((c) => c.trim()).filter(Boolean); colEstado = h.findIndex((c) => /^Estado$/i.test(c)); continue }
  if (!/^\| [RAGB]\d+[a-z]?(\/[RAGB]?\d+[a-z]?|[–-][RAGB]?\d+)? \|/.test(l)) continue
  const celdas = l.split('|').map((c) => c.trim()).filter(Boolean)
  const v = (colEstado >= 0 && celdas[colEstado] ? celdas[colEstado] : celdas[celdas.length - 1]).replace(/\*\*/g, '')
  const rango = celdas[0].match(/^[RAGB](\d+)[a-z]?[–-](?:[RAGB])?(\d+)/); const n = rango ? Math.max(1, Number(rango[2]) - Number(rango[1]) + 1) : /\//.test(celdas[0]) ? celdas[0].split('/').length : 1
  let k
  if (/^(—|pendiente|por recorrer|adaptar)/i.test(v)) k = 'pendiente'
  else if (/^(A\b|APROBADO|componente A)/i.test(v) || /^A desde/i.test(v) || /^A /.test(v) || v === 'A') k = 'A'
  else if (/^(O\b|OBSERVADO)/.test(v)) k = 'O'
  else if (/^(R\b|ROTO)/.test(v)) k = 'R'
  else { k = 'otro'; otros.push(`${celdas[0]}: ${v.slice(0, 60)}`) }
  cuenta[k] += n
}
console.log(`filas del inventario (contando rangos y pares): APROBADO ${cuenta.A} · OBSERVADO ${cuenta.O} · ROTO ${cuenta.R} · pendiente ${cuenta.pendiente} · sin clasificar ${cuenta.otro}`)
if (otros.length) console.log('  sin clasificar:\n   ' + otros.join('\n   '))
const obs = [...doc.split('## Inventario de rincones')[0].matchAll(/^\| (O-\d+) \| ([^|]+) \|/gm)].map((m) => [m[1], m[2].trim()])
const aprob = obs.filter(([, e]) => /APROBADO/i.test(e)).map(([i]) => i), abiertas = obs.filter(([, e]) => !/APROBADO|aceptado|decidido/i.test(e)).map(([i]) => i)
console.log(`observaciones: ${obs.length} · ya APROBADAS ${aprob.length} (${aprob.join(', ')}) · abiertas ${abiertas.length} (${abiertas.join(', ')})`)
