// Guardia común de los guiones que escriben en la base: si backend está migrando o midiendo carga, no se corre.
// Lee la ficha de backend en la rama `coordinacion` (sin tocar la copia de trabajo). Sale con código 3 si debe esperar.
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
const aqui = dirname(fileURLToPath(import.meta.url))
const leerFicha = () => {
  execFileSync('git', ['fetch', '-q', 'origin', 'coordinacion'], { stdio: 'pipe', cwd: aqui })
  return execFileSync('git', ['show', 'origin/coordinacion:agentes/backend.md'], { encoding: 'utf8', cwd: aqui })
}
export function baseLibre() {
  let ficha
  try { ficha = leerFicha() } catch { ficha = leerFicha() } // un reintento: la red local falla a veces
  const tocando = ficha.match(/## Tocando ahora\s*\n([\s\S]*?)(?=\n## |$)/)?.[1]
  if (!tocando) throw new Error('No se pudo verificar la ficha de backend')
  if (/MIGRACION EN CURSO|PRUEBA DE CARGA EN CURSO/i.test(tocando)) {
    console.log('PAUSADO: backend migrando o midiendo carga ("MIGRACION EN CURSO"/"PRUEBA DE CARGA EN CURSO" en agentes/backend.md). No se corre contra la base.')
    process.exit(3)
  }
}
