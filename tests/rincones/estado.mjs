// Estado entre fases: código del grupo y sesiones (storageState) de cada actor, para no recrear grupos en cada corrida.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
const DIR = process.env.RINCONES_ESTADO || '/Users/macair/cruse/rincones-capturas/estado'
mkdirSync(DIR, { recursive: true })
export const leer = () => (existsSync(`${DIR}/grupo.json`) ? JSON.parse(readFileSync(`${DIR}/grupo.json`, 'utf8')) : {})
export const escribir = (parcial) => writeFileSync(`${DIR}/grupo.json`, JSON.stringify({ ...leer(), ...parcial }, null, 1))
export const rutaSesion = (actor) => `${DIR}/sesion-${actor}.json`
export const haySesion = (actor) => existsSync(rutaSesion(actor))
export async function guardarSesion(page) { await page.context().storageState({ path: rutaSesion(page.actor) }) }
