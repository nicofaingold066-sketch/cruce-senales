// Lógica pura del agente del círculo: sin red, sin base y sin modelo, para poder probarla sola
// (`node --test supabase/functions/agente/`, ver docs/agente-ia.md). La usa index.ts.
// Nada de acá lee preferencias de una persona: trabaja con opciones ya validadas por el servidor
// y con totales del grupo.

export type EstadoClima = 'seco' | 'lluvia' | 'desconocido'

export interface ClimaDia {
  estado: EstadoClima
  maxima: number | null
}

export interface Clima {
  sabado: ClimaDia
  domingo: ClimaDia
  /** "open-meteo", "simulacion" o "sin_pronostico". */
  fuente: string
}

export interface Franja {
  inicio: string
  fin: string
}

export interface Candidata {
  id: string
  actividad?: string
  actividad_etiqueta: string
  lugar: { id: string; nombre: string; simulado: boolean }
  titulo: string
  franjas: Franja[]
  frases_grupo: string[]
}

/** Totales del grupo (enmienda 4.1). Con 3 personas o menos solo llega `personas`. */
export interface PerfilGrupo {
  personas: number
  gustos?: { actividad_etiqueta: string; cuantos: number }[]
  energia_mayoritaria?: string | null
  ambiente_mayoritario?: string | null
  presupuesto_grupo?: string | null
}

export interface ResultadoPlan extends Candidata {
  tipo: 'borrador'
  personas_consideradas: number
  candidatas?: Candidata[]
  perfil_grupo?: PerfilGrupo
}

// Textos fijos por código de frase (lista cerrada de la enmienda 4). Siempre afirmativos sobre el plan.
export const FRASES: Record<string, string> = {
  presupuesto_todos: 'le sirve al presupuesto de todos',
  bajo_techo: 'es bajo techo por si cambia el tiempo',
  al_aire_libre_con_buen_tiempo: 'es al aire libre con buen pronóstico',
  el_mas_elegido: 'es lo que más eligieron',
  ritmo_del_grupo: 'va con el ritmo que prefiere el grupo',
}

const ENERGIA_TEXTO: Record<string, string> = { con_todo: 'con todo', algo_tranquilo: 'algo tranquilo' }
const AMBIENTE_TEXTO: Record<string, string> = { fiesta: 'de fiesta', tranquilo: 'tranquilo' }

/** Una actividad con menos de esta cantidad de personas no se muestra ni se le manda al modelo (mejora #26). */
export const MINIMO_POR_GUSTO = 2

// Expresiones que delatan la situación de una persona o prometen algo que no pasó. Se comparan como
// palabras completas (las que terminan en * son prefijos). Si el modelo usa una, se descarta su salida.
const PROHIBIDAS = [
  'alguien', 'algunos de ustedes', 'algunas de ustedes', 'uno de ustedes no', 'una de ustedes no', 'quien no puede',
  'plata', 'dinero', 'pobre*', 'caro para', 'no le alcanza', 'no les alcanza', 'no puede pagar', 'no pueden pagar',
  'no puede ir', 'no pueden ir', 'enferm*', 'problemas de salud', 'su salud', 'tu salud', 'ánimo', 'animo', 'triste*',
  'cansad*', 'deprim*', 'restricci*', 'confirmad*', 'reserv*', 'agend*', 'ya está listo',
  // Presupuesto (hallazgo 7 de la revisión de privacidad): el servidor ya descarta por precio; el texto no lo menciona.
  'gratis', 'barat*', 'económic*', 'economic*', 'poco presupuesto', 'presupuesto bajo', 'presupuesto ajustado', 'presupuesto limitado',
]
const LETRA = '\\p{L}'

function escapar(t: string): string {
  return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const PROHIBIDAS_RE = PROHIBIDAS.map((p) => {
  const prefijo = p.endsWith('*')
  const base = escapar(prefijo ? p.slice(0, -1) : p)
  return new RegExp(`(^|[^${LETRA}])${base}${prefijo ? '' : `($|[^${LETRA}])`}`, 'u')
})

export function sumarDia(fecha: string): string {
  const d = new Date(`${fecha}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

export function esSabado(fecha: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(fecha) && new Date(`${fecha}T12:00:00Z`).getUTCDay() === 6
}

/** Lee la respuesta diaria de Open-Meteo. Lo que falte queda "desconocido": nunca se inventa buen tiempo. */
export function leerPronostico(j: unknown, sabado: string): Clima {
  const desconocido: ClimaDia = { estado: 'desconocido', maxima: null }
  const diario = (j as { daily?: Record<string, unknown[]> } | null)?.daily
  const dias = Array.isArray(diario?.time) ? (diario.time as string[]) : []
  const dia = (fecha: string): ClimaDia => {
    const i = dias.indexOf(fecha)
    if (i < 0 || !diario) return desconocido
    const prob = diario.precipitation_probability_max?.[i]
    const codigo = diario.weather_code?.[i]
    const maxima = diario.temperature_2m_max?.[i]
    if (typeof prob !== 'number' && typeof codigo !== 'number') return desconocido
    // Código WMO 51 o más = llovizna, lluvia, nieve o tormenta.
    const llueve = (typeof prob === 'number' && prob >= 50) || (typeof codigo === 'number' && codigo >= 51)
    return { estado: llueve ? 'lluvia' : 'seco', maxima: typeof maxima === 'number' ? Math.round(maxima) : null }
  }
  return { sabado: dia(sabado), domingo: dia(sumarDia(sabado)), fuente: 'open-meteo' }
}

/** Clima de simulación (mejora #23). */
export function climaSimulado(estado: 'seco' | 'lluvia'): Clima {
  const dia: ClimaDia = { estado, maxima: null }
  return { sabado: dia, domingo: dia, fuente: 'simulacion' }
}

/**
 * El clima simulado solo vale en un espacio demo, y `esDemo` sale del servidor (get_space con el JWT
 * de quien llama), nunca del cliente. Cualquier otro caso devuelve null y se usa el clima real.
 */
export function climaPedido(esDemo: boolean, pedido: unknown): 'seco' | 'lluvia' | null {
  return esDemo && (pedido === 'seco' || pedido === 'lluvia') ? pedido : null
}

export function resumenClima(c: Clima): string {
  if (c.fuente === 'simulacion') {
    return c.sabado.estado === 'lluvia' ? 'Simulación: sábado y domingo con lluvia.' : 'Simulación: sábado y domingo con sol.'
  }
  if (c.fuente !== 'open-meteo') return 'Sin pronóstico disponible.'
  const dia = (nombre: string, d: ClimaDia) => {
    const estado = d.estado === 'lluvia' ? 'con lluvia' : d.estado === 'seco' ? 'sin lluvia' : 'sin pronóstico'
    return `${nombre} ${estado}${d.maxima != null ? `, máxima ${d.maxima}°` : ''}`
  }
  return `${dia('Sábado', c.sabado)}. ${dia('Domingo', c.domingo)}.`
}

// Con clima de simulación no se habla de pronóstico: es un clima de prueba.
const FRASE_SOL_SIMULADO = 'es al aire libre con el sol de la simulación'

/** Datos del grupo (solo totales) para que el texto fijo no suene genérico (mejora #40). */
export interface ContextoFrases {
  perfil?: PerfilGrupo | null
  /** Etiqueta de la actividad de la opción ("Asado"), para decir cuántos la eligieron. */
  actividad?: string
}

const ENERGIA_PLAN: Record<string, string> = { con_todo: 'un plan con todo', algo_tranquilo: 'un plan algo tranquilo' }
const AMBIENTE_PLAN: Record<string, string> = { fiesta: 'con ambiente de fiesta', tranquilo: 'con ambiente tranquilo' }

export function textoFrase(codigo: string, simulado: boolean, contexto: ContextoFrases = {}): string | undefined {
  if (simulado && codigo === 'al_aire_libre_con_buen_tiempo') return FRASE_SOL_SIMULADO
  // Con 3 personas o menos no se dan detalles del grupo: se podría adivinar quién eligió qué.
  const p = contexto.perfil && contexto.perfil.personas > 3 ? contexto.perfil : null
  if (p && codigo === 'ritmo_del_grupo') {
    const partes = [
      p.energia_mayoritaria ? ENERGIA_PLAN[p.energia_mayoritaria] : undefined,
      p.ambiente_mayoritario ? AMBIENTE_PLAN[p.ambiente_mayoritario] : undefined,
    ].filter((t): t is string => Boolean(t))
    if (partes.length === 2) return `va con lo que prefiere la mayoría: ${partes[0]} y ${partes[1]}`
    if (partes.length === 1) return `va con lo que prefiere la mayoría: ${partes[0]}`
  }
  if (codigo === 'el_mas_elegido') {
    // Solo si se puede mostrar sin delatar a nadie: grupo de 4 o más y actividad elegida por 2 o más
    // (hallazgo 5). Si no, la frase no se dice, aunque la base la mande.
    const g = p && contexto.actividad ? gustoVisible(p, contexto.actividad) : undefined
    return g && p ? `es lo que más eligieron (${g.cuantos} de ${p.personas})` : undefined
  }
  return FRASES[codigo]
}

export function unirFrases(codigos: string[], simulado = false, contexto: ContextoFrases = {}): string {
  const partes = codigos.map((c) => textoFrase(c, simulado, contexto)).filter((t): t is string => Boolean(t))
  if (partes.length === 0) return 'Es la opción que mejor le sirve al grupo con lo que cargaron.'
  const texto = partes.length === 1 ? partes[0] : `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`
  return `${texto.charAt(0).toUpperCase()}${texto.slice(1)}.`
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

/** "sábado 31 de 14:00 a 17:00", sin convertir zonas (HoraLocal de Santiago). */
export function franjaCorta(f: Franja): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})/.exec(f.inicio)
  const n = /T(\d{2}:\d{2})/.exec(f.fin)
  if (!m || !n) return `${f.inicio} a ${f.fin}`
  const dia = DIAS[new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).getUTCDay()]
  return `${dia} ${Number(m[3])} de ${m[4]} a ${n[1]}`
}

export function mensajeFijo(c: Candidata): string {
  const [a, b] = c.franjas
  const dias = a && b ? ` el ${franjaCorta(a)} o el ${franjaCorta(b)}` : ''
  return `¡Hola! Les propongo ${c.titulo.charAt(0).toLowerCase()}${c.titulo.slice(1)}${dias}. Marquen si les interesa y carguen su disponibilidad en CRUXE.`
}

/** Saca los nombres de los integrantes de un texto del catálogo ("Asado en casa de Tomi" → "Asado en casa"). */
export function sinNombres(texto: string, nombres: string[]): string {
  let t = texto
  for (const n of nombres) {
    if (n.length < 2) continue
    const nombre = escapar(n)
    t = t.replace(new RegExp(`\\s+(de|del|con)\\s+${nombre}(?=$|[^${LETRA}])`, 'giu'), '')
    t = t.replace(new RegExp(`(^|[^${LETRA}])${nombre}(?=$|[^${LETRA}])`, 'giu'), '$1')
  }
  return t.replace(/\s{2,}/g, ' ').trim()
}

/**
 * Acepta un texto del modelo solo si es corto, no nombra a nadie y no delata una situación individual.
 * Los nombres se buscan con su mayúscula inicial (son nombres propios), así "caro" no choca con Caro.
 */
export function textoValido(texto: unknown, max: number, nombres: string[]): texto is string {
  if (typeof texto !== 'string') return false
  const t = texto.trim()
  if (t.length < 15 || t.length > max || t.includes('\n')) return false
  const bajo = t.toLowerCase()
  if (PROHIBIDAS_RE.some((re) => re.test(bajo))) return false
  return !nombres.some((n) => {
    if (n.length < 2) return false
    const propio = n.charAt(0).toUpperCase() + n.slice(1)
    return new RegExp(`(^|[^${LETRA}])${escapar(propio)}($|[^${LETRA}])`, 'u').test(t)
  })
}

function gustoVisible(perfil: PerfilGrupo, actividad: string): { actividad_etiqueta: string; cuantos: number } | undefined {
  return perfil.personas > 3 ? gustosVisibles(perfil).find((g) => g.actividad_etiqueta === actividad) : undefined
}

/** Gustos que se pueden mostrar o mandar: solo los que eligieron al menos MINIMO_POR_GUSTO personas. */
export function gustosVisibles(perfil: PerfilGrupo | null | undefined): { actividad_etiqueta: string; cuantos: number }[] {
  return perfil?.gustos?.filter((g) => g.cuantos >= MINIMO_POR_GUSTO) ?? []
}

/**
 * Perfil para la respuesta de la función: con 3 personas o menos, solo la cantidad (mejora #26), y nunca
 * el presupuesto del grupo (hallazgo 7). Anda igual si la base todavía lo manda o si ya no (enmienda 7, E7.4).
 */
export function perfilParaRespuesta(perfil: PerfilGrupo | null | undefined): PerfilGrupo | null {
  if (!perfil) return null
  if (perfil.personas <= 3) return { personas: perfil.personas }
  const { presupuesto_grupo: _presupuesto, ...sinPresupuesto } = perfil
  return { ...sinPresupuesto, gustos: gustosVisibles(perfil) }
}

/** Lo único que ve el modelo: opciones ya validadas, clima y totales del grupo. Sin nombres ni ids de miembros. */
export function entradaModelo(candidatas: Candidata[], perfil: PerfilGrupo | null, clima: string, nombres: string[], simulado = false) {
  const p = perfil && perfil.personas > 3 ? perfil : null
  return {
    clima,
    grupo: {
      personas: perfil?.personas ?? null,
      // Una actividad que eligió una sola persona no se menciona: se podría adivinar quién fue.
      gustos: p ? gustosVisibles(p).map((g) => `${g.actividad_etiqueta}: ${g.cuantos} de ${p.personas}`) : [],
      ritmo: p?.energia_mayoritaria ? ENERGIA_TEXTO[p.energia_mayoritaria] ?? null : null,
      ambiente: p?.ambiente_mayoritario ? AMBIENTE_TEXTO[p.ambiente_mayoritario] ?? null : null,
    },
    opciones: candidatas.map((c) => ({
      id: c.id,
      // El catálogo puede traer el nombre de un integrante ("Quincho de Tomi"): al modelo le llega sin nombre.
      plan: sinNombres(c.titulo, nombres),
      actividad: c.actividad_etiqueta,
      lugar: sinNombres(c.lugar.nombre.replace(' (Simulación)', ''), nombres),
      dias: c.franjas.map(franjaCorta),
      // Mismas frases que el texto fijo: "lo que más eligieron" solo si no delata a nadie (hallazgo 5).
      razones: c.frases_grupo.map((f) => textoFrase(f, simulado, { perfil, actividad: c.actividad_etiqueta })).filter(Boolean),
    })),
  }
}

/** Candidatas de la respuesta de la base. Sin la enmienda 4.1, la única es la del servidor (su id es el del catálogo). */
export function candidatasDe(base: ResultadoPlan): Candidata[] {
  return Array.isArray(base.candidatas) && base.candidatas.length > 0
    ? base.candidatas.slice(0, 3)
    : [{ ...base, id: base.id ?? base.lugar.id }]
}

/**
 * Valida la salida JSON del modelo. La elección tiene que ser una de las candidatas que el servidor ya
 * validó y los dos textos tienen que pasar textoValido. Si algo falla, null: va la primera y el texto fijo.
 */
export function validarSalidaModelo(
  texto: string,
  candidatas: Candidata[],
  nombres: string[],
): { eleccion: Candidata; explicacion: string; mensaje: string } | null {
  let salida: { eleccion_id?: unknown; explicacion?: unknown; mensaje_al_grupo?: unknown }
  try {
    salida = JSON.parse(texto)
  } catch {
    return null
  }
  if (!salida || typeof salida !== 'object') return null
  const eleccion = candidatas.find((c) => c.id === salida.eleccion_id)
  if (!eleccion) return null
  if (!textoValido(salida.explicacion, 240, nombres) || !textoValido(salida.mensaje_al_grupo, 320, nombres)) return null
  return { eleccion, explicacion: salida.explicacion.trim(), mensaje: salida.mensaje_al_grupo.trim() }
}
