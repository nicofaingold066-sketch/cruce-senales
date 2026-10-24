// Compara dos corridas (carpetas con f*.json): qué hallazgos desaparecieron (arreglados), cuáles son nuevos y cuáles siguen.
// Solo compara las fases que existen en las dos carpetas. Los números que cambian entre corridas (horas, nombres "Rincones 07:31",
// códigos) se normalizan a '#'. Uso: node comparar.mjs <carpeta-antes> <carpeta-despues> [--todo]
import { readdirSync, readFileSync, existsSync } from 'node:fs'
const [antes, despues] = process.argv.slice(2)
const todo = process.argv.includes('--todo')
const RUIDO = /fuente-chica|span\.avatar|foco-recorrido/
const norm = (t) => t.replace(/\d+/g, '#').replace(/Rincones[^"|]*/g, 'Rincones #')
const cargar = (c) => {
  const fases = {}
  if (!existsSync(c)) return fases
  for (const f of readdirSync(c).filter((x) => /^f\d+[a-z]?\.json$/.test(x))) {
    const d = JSON.parse(readFileSync(`${c}/${f}`, 'utf8'))
    const claves = new Map()
    for (const h of d.hallazgos || []) {
      if (h.info || (!todo && RUIDO.test(`${h.tipo} ${h.detalle}`))) continue
      const k = `${h.id}|${h.tipo}|${norm(h.detalle)}`
      if (!claves.has(k)) claves.set(k, { ...h, anchos: new Set() })
      claves.get(k).anchos.add(h.ancho)
    }
    fases[f] = { claves, veredictos: d.veredictos || {}, errores: (d.errores || []).map((e) => `${e.tipo} ${norm(e.texto)}`) }
  }
  return fases
}
const A = cargar(antes), B = cargar(despues)
const comunes = Object.keys(A).filter((f) => B[f]).sort()
const soloB = Object.keys(B).filter((f) => !A[f]).sort()
console.log(`antes: ${antes.split('/').pop()} · después: ${despues.split('/').pop()} · fases comparables: ${comunes.join(', ') || 'ninguna'}${soloB.length ? ` · solo en después: ${soloB.join(', ')}` : ''}`)
let desap = 0, nuevos = 0, siguen = 0
for (const f of comunes) {
  const a = A[f].claves, b = B[f].claves
  const d = [...a.keys()].filter((k) => !b.has(k)), n = [...b.keys()].filter((k) => !a.has(k)), s = [...a.keys()].filter((k) => b.has(k))
  desap += d.length; nuevos += n.length; siguen += s.length
  if (d.length || n.length) {
    console.log(`\n== ${f}`)
    for (const k of d) { const h = a.get(k); console.log(`  DESAPARECIÓ  ${h.id} [${[...h.anchos].join(',')}] ${h.tipo}: ${h.detalle.slice(0, 150)}`) }
    for (const k of n) { const h = b.get(k); console.log(`  NUEVO        ${h.id} [${[...h.anchos].join(',')}] ${h.tipo}: ${h.detalle.slice(0, 150)}`) }
  }
  // rincones que fallaron en el guion (ERROR DEL GUION) en una corrida y no en la otra
  const errA = Object.entries(A[f].veredictos).filter(([, v]) => (v.notas || []).some((x) => /ERROR DEL GUION/.test(x))).map(([id]) => id)
  const errB = Object.entries(B[f].veredictos).filter(([, v]) => (v.notas || []).some((x) => /ERROR DEL GUION/.test(x))).map(([id]) => id)
  const soloErrB = errB.filter((x) => !errA.includes(x)), soloErrA = errA.filter((x) => !errB.includes(x))
  if (soloErrB.length) console.log(`  GUION FALLA AHORA en ${f}: ${soloErrB.join(', ')} (revisar: ¿cambió la pantalla?)`)
  if (soloErrA.length) console.log(`  guion ya no falla en ${f}: ${soloErrA.join(', ')}`)
  const eA = new Set(A[f].errores), eB = new Set(B[f].errores)
  const errNuevos = [...eB].filter((x) => !eA.has(x))
  if (errNuevos.length) console.log(`  ERRORES DE RED/CONSOLA NUEVOS en ${f}: ${errNuevos.slice(0, 5).join(' · ')}`)
  // Texto de la pantalla que cambió entre builds (notas del veredicto, sin números): dice qué rincones hay que volver a mirar a ojo.
  const limpiar = (n) => norm(n).replace(/\s+/g, ' ').trim()
  for (const id of Object.keys(B[f].veredictos)) {
    const na = (A[f].veredictos[id]?.notas || []).map(limpiar), nb = (B[f].veredictos[id]?.notas || []).map(limpiar)
    if (!na.length || na.join('\n') === nb.join('\n')) continue
    const dif = nb.find((x, i) => x !== na[i]) ?? ''
    const ant = na[nb.findIndex((x, i) => x !== na[i])] ?? ''
    // Primer punto en que divergen, para leer el cambio sin la parte común.
    let i = 0; while (i < dif.length && i < ant.length && dif[i] === ant[i]) i++
    console.log(`  CAMBIÓ EL TEXTO ${id}: …${ant.slice(Math.max(0, i - 20), i + 90)}  →  …${dif.slice(Math.max(0, i - 20), i + 110)}`)
  }
}
console.log(`\nTOTAL: desaparecieron ${desap} · nuevos ${nuevos} · siguen ${siguen}`)
