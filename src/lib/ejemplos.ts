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
