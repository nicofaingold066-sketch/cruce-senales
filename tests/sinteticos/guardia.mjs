// Guardia: no se corre nada contra la base mientras alguna ficha de agentes/ (rama coordinacion) declare "MIGRACION EN CURSO".
// Lee el archivo con `git show origin/coordinacion:...` (no toca la copia de trabajo). CRUXE_COORD cambia la copia que se consulta;
// CRUXE_SIN_GUARDIA=1 la salta (solo para una prueba contra un entorno que no es la base compartida).
import { execFileSync } from 'node:child_process'

const COORD = process.env.CRUXE_COORD || '/Users/macair/cruse/cruce-coord-sinteticos'

// Una declaración de migración (o de carga) vigente: una línea de lista que EMPIEZA con la marca, con o sin hora y con o sin
// negritas: «- MIGRACION EN CURSO», «- [20:59] **MIGRACION EN CURSO**», «- **[01:16] MIGRACION EN CURSO**». Las menciones dentro de
// otra frase (reglas, historia, avisos honestos) no cuentan.
const DECLARACION = /^[-*]\s+(?:\*\*)?(?:\[[0-9:]+\]\s*)?(?:\*\*)?\s*(MIGRACION EN CURSO|PRUEBA DE CARGA EN CURSO)/

export function migracionEnCurso() {
  if (process.env.CRUXE_SIN_GUARDIA === '1') return null
  try {
    execFileSync('git', ['-C', COORD, 'fetch', '-q', 'origin', 'coordinacion'], { stdio: 'ignore', timeout: 30000 })
    // Desde las 23:52 la base la migra `pendientes` y antes `backend`: se miran TODAS las fichas, no solo la de uno.
    const fichas = execFileSync('git', ['-C', COORD, 'ls-tree', '--name-only', 'origin/coordinacion', 'agentes/'], { encoding: 'utf8' })
      .split('\n').filter((f) => f.endsWith('.md'))
    for (const f of fichas) {
      const texto = execFileSync('git', ['-C', COORD, 'show', `origin/coordinacion:${f}`], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 })
      const linea = texto.split('\n').find((l) => DECLARACION.test(l))
      if (linea) return `${f.replace('agentes/', '')}: ${linea.slice(0, 180)}`
    }
    return null
  } catch (e) {
    return `no pude leer las fichas (${String(e.message).split('\n')[0]}); por prudencia no corro`
  }
}

export function exigirBaseLibre() {
  const aviso = migracionEnCurso()
  if (aviso) {
    console.log(`BASE OCUPADA, no corro: ${aviso}`)
    process.exit(3)
  }
}
