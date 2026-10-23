// Guardia: no se corre nada contra la base mientras agentes/backend.md (rama coordinacion) diga "MIGRACION EN CURSO".
// Lee el archivo con `git show origin/coordinacion:...` (no toca la copia de trabajo). CRUXE_COORD cambia la copia que se consulta;
// CRUXE_SIN_GUARDIA=1 la salta (solo para una prueba contra un entorno que no es la base compartida).
import { execFileSync } from 'node:child_process'

const COORD = process.env.CRUXE_COORD || '/Users/macair/cruse/cruce-coord-sinteticos'

export function migracionEnCurso() {
  if (process.env.CRUXE_SIN_GUARDIA === '1') return null
  try {
    execFileSync('git', ['-C', COORD, 'fetch', '-q', 'origin', 'coordinacion'], { stdio: 'ignore', timeout: 30000 })
    const ficha = execFileSync('git', ['-C', COORD, 'show', 'origin/coordinacion:agentes/backend.md'], { encoding: 'utf8' })
    // La ficha cita la frase entre comillas al explicar la regla ("MIGRACION EN CURSO"): eso no es un aviso.
    const lineas = ficha.split('\n').filter((l) => /MIGRACION EN CURSO/.test(l.replace(/["«][^"»]*MIGRACION EN CURSO[^"»]*["»]/g, '')))
    return lineas.length ? lineas[0].slice(0, 200) : null
  } catch (e) {
    return `no pude leer la ficha de backend (${String(e.message).split('\n')[0]}); por prudencia no corro`
  }
}

export function exigirBaseLibre() {
  const aviso = migracionEnCurso()
  if (aviso) {
    console.log(`BASE OCUPADA, no corro: ${aviso}`)
    process.exit(3)
  }
}
