// Mejora #92 (apertura): ejemplos que rotan para placeholders y textos de ayuda, para que la interfaz no asuma
// siempre "asado". Son funciones puras: el mismo índice o la misma semilla dan siempre el mismo ejemplo, sin azar ni
// reloj. Quien las use decide cada cuánto rota (por ejemplo, una semilla por visita o por día).
// El caso de la demo sigue siendo «Los del asado» (docs/caso-canonico.md): este archivo no lo toca ni lo reemplaza.
// Todo es ficticio.

export interface Ejemplo {
  clave: string
  /** Nombre de un grupo, para «Nombre del grupo». Máximo 60 caracteres (el campo admite 60). */
  grupo: string
  /** Propósito de una propuesta, para «Propósito de la propuesta». Máximo 80 caracteres (el campo admite 80). */
  plan: string
  /** Tipo de juntada en una frase corta, para textos de ayuda («amigos del pádel»). */
  tipo: string
}

export const EJEMPLOS: readonly Ejemplo[] = [
  { clave: 'padel', grupo: 'Los del pádel', plan: 'Pádel el martes a las 20:00', tipo: 'amigos del pádel' },
  { clave: 'cumple', grupo: 'Cumpleaños de Vale', plan: 'Cena de cumpleaños de Vale', tipo: 'un cumpleaños' },
  { clave: 'cena', grupo: 'Cena de ex compañeros', plan: 'Cena el viernes en un restaurante', tipo: 'ex compañeros del colegio' },
  { clave: 'cine', grupo: 'Los del cine', plan: 'Ir al cine el domingo en la tarde', tipo: 'amigos del cine' },
  { clave: 'cerro', grupo: 'Los del cerro', plan: 'Caminata por el cerro el sábado en la mañana', tipo: 'amigos de la caminata' },
  { clave: 'juegos', grupo: 'Noche de juegos', plan: 'Juegos de mesa en casa de Dani', tipo: 'amigos de los juegos de mesa' },
  { clave: 'lectura', grupo: 'Club de lectura', plan: 'Reunión del club de lectura', tipo: 'un club de lectura' },
  { clave: 'brunch', grupo: 'La familia de Emi', plan: 'Brunch del domingo en un café', tipo: 'la familia' },
]

/** Ejemplo número `indice`, dando la vuelta: 0, 1, 2… recorre la lista y vuelve a empezar. Acepta negativos y decimales. */
export function ejemploPorIndice(indice: number): Ejemplo {
  const n = EJEMPLOS.length
  const i = Number.isFinite(indice) ? Math.trunc(indice) : 0
  return EJEMPLOS[((i % n) + n) % n]
}

/** Ejemplo para un texto cualquiera (por ejemplo, el código del grupo o la fecha): el mismo texto da el mismo ejemplo. */
export function ejemploPorSemilla(semilla: string): Ejemplo {
  let h = 0
  for (let k = 0; k < semilla.length; k++) h = (h * 31 + semilla.charCodeAt(k)) >>> 0
  return ejemploPorIndice(h)
}

/** Placeholder de «Nombre del grupo». */
export function placeholderGrupo(e: Ejemplo): string {
  return `Ej.: ${e.grupo}`
}

/** Placeholder de «Propósito de la propuesta». */
export function placeholderPlan(e: Ejemplo): string {
  return `Ej.: ${e.plan}`
}

/** Ayuda de «Crear un grupo»: deja claro que sirve cualquier grupo y nombra el tipo del ejemplo. */
export function ayudaGrupo(e: Ejemplo): string {
  return `Cualquier grupo sirve, por ejemplo ${e.tipo}.`
}

// Atajos de actividad de «Nueva propuesta» (pedido de ux-flujo, 19:35): en un grupo «Los del pádel» el primer atajo no
// puede ser «Asado». Los datos son los mismos que usa la pantalla (título, ícono, duración en minutos); los íconos son
// nombres que ya existen en components/Icono.tsx. «Asado» no va primero: queda en el medio.
export interface Atajo {
  titulo: string
  icono: 'asado' | 'futbol' | 'cena' | 'juntada' | 'cine' | 'cumple' | 'paseo'
  min: number
  /** Palabras (sin tildes, en minúscula) que, si aparecen en el nombre del grupo, sugieren este atajo. */
  palabras: readonly string[]
}

export const ATAJOS: readonly Atajo[] = [
  { titulo: 'Pádel', icono: 'futbol', min: 90, palabras: ['padel'] },
  { titulo: 'Tenis', icono: 'futbol', min: 90, palabras: ['tenis'] },
  { titulo: 'Cena', icono: 'cena', min: 120, palabras: ['cena', 'restaurante'] },
  { titulo: 'Cine', icono: 'cine', min: 150, palabras: ['cine', 'pelicula'] },
  { titulo: 'Cumple', icono: 'cumple', min: 180, palabras: ['cumple', 'cumpleanos'] },
  { titulo: 'Asado', icono: 'asado', min: 180, palabras: ['asado', 'parrilla', 'quincho'] },
  { titulo: 'Juegos de mesa', icono: 'juntada', min: 180, palabras: ['juegos', 'mesa'] },
  { titulo: 'Café o brunch', icono: 'juntada', min: 120, palabras: ['cafe', 'brunch', 'once', 'lectura'] },
  { titulo: 'Cerro', icono: 'paseo', min: 180, palabras: ['cerro', 'trekking', 'caminata'] },
  { titulo: 'Museo o feria', icono: 'paseo', min: 120, palabras: ['museo', 'feria', 'cultura'] },
  { titulo: 'Fútbol', icono: 'futbol', min: 60, palabras: ['futbol', 'pichanga', 'baby'] },
  { titulo: 'Juntada', icono: 'juntada', min: 120, palabras: [] },
]

function sinTildes(t: string): string {
  return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

/**
 * Atajos en el orden que conviene mostrar para un grupo. Si el nombre del grupo nombra una actividad («Los del pádel»),
 * ese atajo va primero; si no, el orden base. «Asado» solo va primero si el grupo lo nombra.
 */
export function atajosParaGrupo(nombreGrupo: string): readonly Atajo[] {
  const nombre = sinTildes(nombreGrupo)
  const palabras = nombre.split(/[^a-z0-9]+/).filter(Boolean)
  const elegido = ATAJOS.find((a) => a.palabras.some((p) => palabras.includes(p)))
  return elegido ? [elegido, ...ATAJOS.filter((a) => a !== elegido)] : ATAJOS
}
