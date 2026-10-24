// Enmienda 14 (b): propósito del grupo. Espejo de la tabla fija del contrato (docs/contrato-enmienda-14.md §(a)) mientras
// backend no publica la suya en src/lib/types.ts (`FAMILIAS`, `FAMILIA_DE_ACTIVIDAD`, `ACTIVIDAD_ETIQUETA`). Cuando
// exista, esta tabla se reemplaza por esos exports; prueba/propositos.test.ts avisa si dejan de coincidir. Puro: sin red.
// Todo lo decide el servidor (valida el propósito y filtra propuestas); esto solo arma el selector y las frases.

export type Familia = 'deporte' | 'comida' | 'salida_noche' | 'cultura' | 'aire_libre' | 'en_casa'
export type ActividadClave =
  | 'futbol' | 'padel' | 'tenis' | 'basquet'
  | 'asado' | 'cena' | 'cafe'
  | 'fiesta' | 'bar' | 'juegos_salida'
  | 'cultura' | 'cine'
  | 'parque' | 'cerro'
  | 'juegos_casa' | 'peli_casa'
/** 'libre' (sin restricción), una familia o una actividad del catálogo. Misma unión cerrada que backend (types.ts, E14). */
export type Proposito = 'libre' | Familia | ActividadClave

export const FAMILIAS: { clave: Familia; etiqueta: string; cualquier: string }[] = [
  { clave: 'deporte', etiqueta: 'Deporte', cualquier: 'Cualquier deporte' },
  { clave: 'comida', etiqueta: 'Comida', cualquier: 'Cualquier plan de comida' },
  { clave: 'salida_noche', etiqueta: 'Salida / noche', cualquier: 'Cualquier salida / noche' },
  { clave: 'cultura', etiqueta: 'Cultura', cualquier: 'Cualquier plan cultural' },
  { clave: 'aire_libre', etiqueta: 'Aire libre', cualquier: 'Cualquier plan al aire libre' },
  { clave: 'en_casa', etiqueta: 'En casa', cualquier: 'Cualquier plan en casa' },
]

/** Actividades del catálogo con su familia (contrato E14 §a). `cultura` es a la vez familia y actividad: vale como familia. */
export const ACTIVIDADES: { clave: ActividadClave; etiqueta: string; familia: Familia }[] = [
  { clave: 'futbol', etiqueta: 'Fútbol', familia: 'deporte' },
  { clave: 'padel', etiqueta: 'Pádel', familia: 'deporte' },
  { clave: 'tenis', etiqueta: 'Tenis', familia: 'deporte' },
  { clave: 'basquet', etiqueta: 'Básquet', familia: 'deporte' },
  { clave: 'asado', etiqueta: 'Asado', familia: 'comida' },
  { clave: 'cena', etiqueta: 'Cena', familia: 'comida' },
  { clave: 'cafe', etiqueta: 'Café y brunch', familia: 'comida' },
  { clave: 'fiesta', etiqueta: 'Fiesta', familia: 'salida_noche' },
  { clave: 'bar', etiqueta: 'Bar', familia: 'salida_noche' },
  { clave: 'juegos_salida', etiqueta: 'Bowling y escape room', familia: 'salida_noche' },
  { clave: 'cultura', etiqueta: 'Cultura', familia: 'cultura' },
  { clave: 'cine', etiqueta: 'Cine', familia: 'cultura' },
  { clave: 'parque', etiqueta: 'Parque', familia: 'aire_libre' },
  { clave: 'cerro', etiqueta: 'Cerro', familia: 'aire_libre' },
  { clave: 'juegos_casa', etiqueta: 'Juegos en casa', familia: 'en_casa' },
  { clave: 'peli_casa', etiqueta: 'Película en casa', familia: 'en_casa' },
]

/** Solo `cultura` no se repite: ya es la familia. `fiesta` SÍ se ofrece (pedido de Nico, 00:01): pendientes le da a `evento-sim-01` horario de domingo de noche y pasa a ser candidata del agente (antes, ajuste 8 del contrato E14, no se ofrecía porque no tenía domingo). */
const NO_OFRECER = new Set(['cultura'])

/** La frase de la invitación y de "¿Quién eres?": "para jugar fútbol". Falta una clave → sin frase (texto de siempre). */
export const FRASE_PROPOSITO: Record<string, string> = {
  futbol: 'para jugar fútbol',
  padel: 'para jugar pádel',
  tenis: 'para jugar tenis',
  basquet: 'para jugar básquet',
  asado: 'para hacer un asado',
  cena: 'para salir a cenar',
  cafe: 'para tomar un café o un brunch',
  fiesta: 'para hacer una fiesta',
  bar: 'para ir a un bar',
  juegos_salida: 'para ir a bowling o a un escape room',
  cine: 'para ir al cine',
  parque: 'para pasar un rato en el parque',
  cerro: 'para subir un cerro',
  juegos_casa: 'para jugar en casa',
  peli_casa: 'para ver una película en casa',
  deporte: 'para hacer deporte',
  comida: 'para comer algo juntos',
  salida_noche: 'para salir de noche',
  cultura: 'para un plan cultural',
  aire_libre: 'para un plan al aire libre',
  en_casa: 'para un plan en casa',
}

export function esFamilia(p: string): p is Familia {
  return FAMILIAS.some((f) => f.clave === p)
}

export function esProposito(p: string): p is Proposito {
  return p === 'libre' || esFamilia(p) || ACTIVIDADES.some((a) => a.clave === p)
}

/** Familia de un propósito: libre → 'libre'; familia → la misma (gana sobre una actividad homónima); actividad → su familia. */
export function familiaDeProposito(p: string): Familia | 'libre' | null {
  if (p === 'libre') return 'libre'
  if (esFamilia(p)) return p
  return ACTIVIDADES.find((a) => a.clave === p)?.familia ?? null
}

/** "para jugar fútbol", o null si es libre, vacío o desconocido (el texto queda como siempre). */
export function fraseProposito(p: string | null | undefined): string | null {
  if (!p || p === 'libre') return null
  return FRASE_PROPOSITO[p] ?? null
}

export interface OpcionProposito {
  valor: Proposito
  etiqueta: string
}
export interface GrupoProposito {
  familia: Familia
  etiqueta: string
  opciones: OpcionProposito[]
}

/** Lo que ofrece el selector: "Libre" primero y, por familia, "Cualquier …" y sus actividades (cultura ya es la familia, no se repite). */
export function opcionesProposito(): { libre: OpcionProposito; grupos: GrupoProposito[] } {
  return {
    libre: { valor: 'libre', etiqueta: 'Libre: cualquiera propone lo que quiera' },
    grupos: FAMILIAS.map((f) => ({
      familia: f.clave,
      etiqueta: f.etiqueta,
      opciones: [
        { valor: f.clave, etiqueta: f.cualquier },
        ...ACTIVIDADES.filter((a) => a.familia === f.clave && !NO_OFRECER.has(a.clave)).map((a) => ({ valor: a.clave, etiqueta: a.etiqueta })),
      ],
    })),
  }
}

/** Qué significa lo elegido, en una línea bajo el selector. Dice lo que pasa en la pantalla; el servidor es quien valida. */
export function explicacionProposito(p: string): string {
  if (p === 'libre') return 'Cualquiera del grupo puede proponer lo que quiera.'
  const f = FAMILIAS.find((x) => x.clave === familiaDeProposito(p))
  return f ? `Las propuestas de este grupo serán de este tipo de plan (${f.etiqueta.toLocaleLowerCase('es')}).` : ''
}
