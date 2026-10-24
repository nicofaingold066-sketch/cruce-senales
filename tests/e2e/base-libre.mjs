// Guardia común de los guiones que escriben en la base: si alguien está migrando o midiendo carga, no se corre.
// Revisa la sección «Tocando ahora» de TODAS las fichas de `agentes/` en la rama `coordinacion` (sin tocar la copia de trabajo):
// la migración la anuncia backend o, desde las 23:52, pendientes. Cuenta solo cuando la frase abre el ítem de la lista
// (`- MIGRACION EN CURSO`, `- [hh:mm] MIGRACION EN CURSO`, `- **MIGRACION EN CURSO (hh:mm)**`): una mención en prosa
// («esperando que backend saque MIGRACION EN CURSO») no frena. Sale con código 3 si debe esperar.
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
const aqui = dirname(fileURLToPath(import.meta.url))
const git = (...a) => execFileSync('git', a, { encoding: 'utf8', cwd: aqui, stdio: ['ignore', 'pipe', 'pipe'] })
const ABRE = /^\s*-\s*(?:\[\d{2}:\d{2}\]\s*)?(?:\*\*)?(?:MIGRACION|PRUEBA DE CARGA) EN CURSO/im
function fichas() {
  git('fetch', '-q', 'origin', 'coordinacion')
  return git('ls-tree', '--full-tree', '--name-only', 'origin/coordinacion', 'agentes/').split('\n').filter((f) => f.endsWith('.md')).map((f) => [f, git('show', `origin/coordinacion:${f}`)])
}
export function baseLibre() {
  let todas
  try { todas = fichas() } catch { todas = fichas() } // un reintento: la red local falla a veces
  const ocupa = []
  for (const [f, texto] of todas) {
    const tocando = texto.match(/## Tocando ahora\s*\n([\s\S]*?)(?=\n## |$)/)?.[1] ?? ''
    if (ABRE.test(tocando)) ocupa.push(f.replace('agentes/', '').replace('.md', ''))
  }
  if (!todas.length) throw new Error('No se pudo verificar la coordinación')
  if (ocupa.length) {
    console.log(`PAUSADO: ${ocupa.join(', ')} migrando o midiendo carga ("MIGRACION EN CURSO"/"PRUEBA DE CARGA EN CURSO" en su ficha). No se corre contra la base.`)
    process.exit(3)
  }
}
