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
  { clave: 'juegos', grupo: 'Noche de juegos', plan: 'Juegos de mesa el sábado', tipo: 'amigos de los juegos de mesa' },
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

/**
 * Placeholder de «Propósito de la propuesta». Con la familia del espacio (enmienda 14) el ejemplo es de esa familia, para
 * que en un grupo de fútbol no se lea «Caminata por el cerro»; sin familia o con `libre`, el ejemplo que rota de siempre.
 */
export function placeholderPlan(e: Ejemplo, familia?: Familia | null): string {
  if (!familia || familia === 'libre') return `Ej.: ${e.plan}`
  const planes = PLANES_POR_FAMILIA[familia]
  const i = Math.max(0, EJEMPLOS.indexOf(e))
  return `Ej.: ${planes[i % planes.length].plan}`
}

/** Ayuda de «Crear un grupo»: deja claro que sirve cualquier grupo y nombra el tipo del ejemplo. */
export function ayudaGrupo(e: Ejemplo): string {
  return `Cualquier grupo sirve, por ejemplo ${e.tipo}.`
}

// Atajos de actividad de «Nueva propuesta» (pedido de ux-flujo, 19:35; enmienda 14, 21:55): en un grupo «Los del pádel» el
// primer atajo no puede ser «Asado», y en un grupo con propósito (familia) solo se ofrecen los atajos de esa familia.
// Los datos son los mismos que usa la pantalla (título, ícono, duración en minutos); los íconos son nombres que ya
// existen en components/Icono.tsx. «Asado» no va primero: queda en el medio.

/** Familias de la enmienda 14 (`docs/contrato-enmienda-14.md` (a)). `libre` es el modo sin restricción. */
export type Familia = 'deporte' | 'comida' | 'salida_noche' | 'cultura' | 'aire_libre' | 'en_casa' | 'libre'

/** Tabla fija del contrato: actividad del catálogo → familia (el servidor es la autoridad; esto solo filtra atajos). */
export const FAMILIA_DE_ACTIVIDAD: Readonly<Record<string, Exclude<Familia, 'libre'>>> = {
  futbol: 'deporte',
  padel: 'deporte',
  tenis: 'deporte',
  basquet: 'deporte',
  asado: 'comida',
  cena: 'comida',
  cafe: 'comida',
  fiesta: 'salida_noche',
  bar: 'salida_noche',
  juegos_salida: 'salida_noche',
  cultura: 'cultura',
  cine: 'cultura',
  parque: 'aire_libre',
  cerro: 'aire_libre',
  juegos_casa: 'en_casa',
  peli_casa: 'en_casa',
}

/** Ejemplos de plan por familia (todos de actividades de esa familia, sin nombrar a nadie; 80 caracteres como máximo). */
export const PLANES_POR_FAMILIA: Readonly<Record<Exclude<Familia, 'libre'>, readonly { plan: string; actividad: string }[]>> = {
  deporte: [
    { plan: 'Fútbol 5 el sábado', actividad: 'futbol' },
    { plan: 'Pádel el martes a las 20:00', actividad: 'padel' },
    { plan: 'Tenis en parejas el domingo', actividad: 'tenis' },
  ],
  comida: [
    { plan: 'Sushi el sábado', actividad: 'cena' },
    { plan: 'Asado en una parrilla del parque', actividad: 'asado' },
    { plan: 'Brunch del domingo en un café', actividad: 'cafe' },
  ],
  salida_noche: [
    { plan: 'Tragos en un bar el viernes', actividad: 'bar' },
    { plan: 'Bowling el sábado en la noche', actividad: 'juegos_salida' },
  ],
  cultura: [
    { plan: 'Ir al cine el domingo en la tarde', actividad: 'cine' },
    { plan: 'Museo o feria el sábado', actividad: 'cultura' },
  ],
  aire_libre: [
    { plan: 'Caminata por el cerro el sábado', actividad: 'cerro' },
    { plan: 'Picnic en el parque el domingo', actividad: 'parque' },
  ],
  en_casa: [
    { plan: 'Juegos de mesa el sábado', actividad: 'juegos_casa' },
    { plan: 'Noche de película en casa', actividad: 'peli_casa' },
  ],
}

export interface Atajo {
  titulo: string
  icono: 'asado' | 'futbol' | 'cena' | 'juntada' | 'cine' | 'cumple' | 'paseo'
  min: number
  /** Clave de la actividad del catálogo (`create_proposal.p_actividad`); `null` = solo para grupos en modo libre. */
  actividad: string | null
  /** Palabras (sin tildes, en minúscula) que, si aparecen en el nombre del grupo, sugieren este atajo. */
  palabras: readonly string[]
}

export const ATAJOS: readonly Atajo[] = [
  { titulo: 'Pádel', icono: 'futbol', min: 90, actividad: 'padel', palabras: ['padel'] },
  { titulo: 'Tenis', icono: 'futbol', min: 90, actividad: 'tenis', palabras: ['tenis'] },
  { titulo: 'Cena', icono: 'cena', min: 120, actividad: 'cena', palabras: ['cena', 'restaurante', 'sushi'] },
  { titulo: 'Cine', icono: 'cine', min: 150, actividad: 'cine', palabras: ['cine', 'pelicula'] },
  { titulo: 'Cumple', icono: 'cumple', min: 180, actividad: null, palabras: ['cumple', 'cumpleanos'] },
  { titulo: 'Asado', icono: 'asado', min: 180, actividad: 'asado', palabras: ['asado', 'parrilla', 'quincho'] },
  { titulo: 'Básquet', icono: 'futbol', min: 90, actividad: 'basquet', palabras: ['basquet', 'basket'] },
  { titulo: 'Bar', icono: 'juntada', min: 150, actividad: 'bar', palabras: ['bar', 'tragos', 'cerveza'] },
  { titulo: 'Bowling o escape room', icono: 'juntada', min: 120, actividad: 'juegos_salida', palabras: ['bowling', 'escape'] },
  { titulo: 'Juegos de mesa', icono: 'juntada', min: 180, actividad: 'juegos_casa', palabras: ['juegos', 'mesa'] },
  { titulo: 'Película en casa', icono: 'cine', min: 150, actividad: 'peli_casa', palabras: ['peli', 'maraton'] },
  { titulo: 'Café o brunch', icono: 'juntada', min: 120, actividad: 'cafe', palabras: ['cafe', 'brunch', 'once', 'lectura'] },
  { titulo: 'Cerro', icono: 'paseo', min: 180, actividad: 'cerro', palabras: ['cerro', 'trekking', 'caminata'] },
  { titulo: 'Picnic en el parque', icono: 'paseo', min: 180, actividad: 'parque', palabras: ['parque', 'picnic'] },
  { titulo: 'Museo o feria', icono: 'paseo', min: 120, actividad: 'cultura', palabras: ['museo', 'feria', 'cultura'] },
  { titulo: 'Fútbol', icono: 'futbol', min: 60, actividad: 'futbol', palabras: ['futbol', 'pichanga', 'baby'] },
  { titulo: 'Juntada', icono: 'juntada', min: 120, actividad: null, palabras: [] },
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

/**
 * Los atajos de una familia (enmienda 14): en un grupo con propósito solo se ofrecen las actividades de su familia, y los
 * atajos sin actividad («Cumple», «Juntada») quedan solo para el modo libre. `libre` o sin familia devuelve todos.
 * Cada familia tiene 2 o más atajos, así que el carrusel nunca queda vacío.
 */
export function atajosParaFamilia(familia?: Familia | null): readonly Atajo[] {
  if (!familia || familia === 'libre') return ATAJOS
  return ATAJOS.filter((a) => a.actividad !== null && FAMILIA_DE_ACTIVIDAD[a.actividad] === familia)
}

/** Lo que usa «Nueva propuesta»: la familia del espacio filtra y el nombre del grupo ordena (la actividad nombrada va primero). */
export function atajosParaEspacio(nombreGrupo: string, familia?: Familia | null): readonly Atajo[] {
  const permitidos = atajosParaFamilia(familia)
  const ordenados = atajosParaGrupo(nombreGrupo)
  return ordenados.filter((a) => permitidos.includes(a))
}

// Orden de los chips de «Me gustaría» (pedido de sinteticos, H11): el servidor las devuelve por `orden` del catálogo y
// «Asado» sale primero siempre. Esta función solo reordena lo que la pantalla ya recibió; no cambia qué actividades hay.
const PALABRAS_ACTIVIDAD: Readonly<Record<string, readonly string[]>> = {
  asado: ['asado', 'parrilla', 'quincho'],
  padel: ['padel'],
  tenis: ['tenis'],
  basquet: ['basquet', 'basket'],
  peli_casa: ['peli', 'maraton'],
  futbol: ['futbol', 'pichanga', 'baby'],
  parque: ['parque', 'picnic'],
  fiesta: ['fiesta', 'carrete'],
  cena: ['cena', 'restaurante'],
  bar: ['bar', 'tragos', 'cerveza'],
  juegos_casa: ['juegos', 'mesa'],
  cine: ['cine', 'pelicula'],
  cultura: ['museo', 'feria', 'cultura', 'teatro'],
  juegos_salida: ['bowling', 'escape'],
  cerro: ['cerro', 'trekking', 'caminata'],
  cafe: ['cafe', 'brunch', 'once', 'lectura'],
}

/**
 * Misma lista, otro orden: la actividad que nombra el grupo («Los del pádel») va primero; si ninguna, «Asado» deja el
 * primer lugar y queda en el medio. Estable (el resto conserva su orden) y sin perder ni repetir actividades.
 */
export function ordenarActividadesParaGrupo<T extends { clave: string }>(actividades: readonly T[], nombreGrupo: string): T[] {
  const lista = [...actividades]
  const palabras = sinTildes(nombreGrupo).split(/[^a-z0-9]+/).filter(Boolean)
  const nombrada = lista.find((a) => (PALABRAS_ACTIVIDAD[a.clave] ?? []).some((p) => palabras.includes(p)))
  if (nombrada) return [nombrada, ...lista.filter((a) => a !== nombrada)]
  if (lista[0]?.clave === 'asado' && lista.length > 2) {
    const [asado, ...resto] = lista
    resto.splice(Math.floor(lista.length / 2) - 1, 0, asado)
    return resto
  }
  return lista
}
