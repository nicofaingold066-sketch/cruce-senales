// Detector de textos que no deberían aparecer en un grupo REAL de amigos, o que se prestan a malentendidos.
// Se corre sobre el texto de cada pantalla que ve cada persona. Cada regla crea (una sola vez) un hallazgo.
import { hallazgo } from './lib.mjs'

// Cosas del demo que un grupo real no debería ver. `solo` limita a un perfil o pantalla.
const DEMO = [
  // «Datos ficticios» queda en todas las pantallas por decisión del coordinador (19:44): no se reporta.
  { id: 'demo-tomi', re: /\bTomi\b/, gravedad: 'media', destinatario: 'front-juan',
    titulo: 'Aparece «Tomi» (personaje del demo) en un grupo real', esperaba: 'Ningún personaje del demo fuera del demo.' },
  { id: 'demo-asado', re: /asado/i, gravedad: 'baja', destinatario: 'apertura',
    titulo: 'Un texto asume «asado» en un grupo que no es de asado', esperaba: 'Ejemplos que no asuman la actividad.' },
  { id: 'demo-simulacion', re: /Simulaci[oó]n|simulad[oa]s?/i, gravedad: 'media', destinatario: 'front-juan',
    titulo: 'Aparece «Simulación» / «simulado» en un grupo real', esperaba: 'La simulación es solo del demo.' },
  { id: 'demo-luna-mati', re: /\b(Luna|Mati|Caro|Fede|Sofi)\b/, gravedad: 'media', destinatario: 'front-juan',
    titulo: 'Aparece un personaje del demo (Luna/Mati/Caro/Fede/Sofi)', esperaba: 'Ninguno fuera del demo.' },
  { id: 'demo-serastomi', re: /Serás Tomi/, gravedad: 'media', destinatario: 'front-juan',
    titulo: 'Texto del botón de la demo visible para quien viene a crear su grupo', esperaba: 'Que se entienda que la demo no es el camino principal.' },
]

// Textos que se prestan a leer «confirmé» donde solo hubo «me interesa», o que prometen unanimidad / asistencia.
const CONFUSOS = [
  { id: 'conf-anfitrion', re: /anfitri[oó]n/i, gravedad: 'baja', destinatario: 'front-juan',
    titulo: '«Anfitrión» en un grupo donde nadie recibe en su casa', esperaba: '«Quien no puede faltar» o equivalente, sin suponer una casa.' },
  { id: 'conf-5-de-4', re: /(\d+) de (\d+) confirmaron/, validar: (m) => Number(m[1]) > Number(m[2]),
    gravedad: 'baja', destinatario: 'front-juan', titulo: 'Conteo imposible «N de M» con N mayor que M', esperaba: 'N (mínimo M).' },
  { id: 'conf-faltan-1', re: /Faltan 1 /, gravedad: 'baja', destinatario: 'backend', titulo: '«Faltan 1» (singular mal)', esperaba: '«Falta 1».' },
  { id: 'conf-santiago', re: /hora de Santiago/i, gravedad: 'baja', destinatario: 'front-juan',
    titulo: 'La hora se anuncia «de Santiago»: un grupo en otra ciudad lo lee como error', esperaba: 'La hora del grupo.' },
]

const vistos = new Set()
export function revisarTextos(persona, donde, texto, captura) {
  // La portada ofrece la demo a propósito: ahí los personajes y la «Simulación» son esperables. 
  const enPortada = /portada/.test(donde)
  for (const r of [...DEMO, ...CONFUSOS]) {
    if (enPortada) continue
    const m = texto.match(r.re)
    if (!m) continue
    if (r.validar && !r.validar(m)) continue
    const id = `${r.id}`
    if (vistos.has(id)) continue
    vistos.add(id)
    hallazgo({ id, persona, gravedad: r.gravedad, destinatario: r.destinatario, titulo: r.titulo,
      paso: `${persona.nombre} (${persona.ancho} px) en «${donde}»`, vio: `«${m[0]}»`, esperaba: r.esperaba, captura })
  }
}
