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

/** Enmienda 10: viaje máximo estimado del grupo hacia una opción. Solo con 4 personas o más; si no, null. */
export interface Viaje {
  max_minutos: number
  estimado: boolean
}

export interface Candidata {
  id: string
  actividad?: string
  actividad_etiqueta: string
  lugar: { id: string; nombre: string; simulado: boolean }
  titulo: string
  franjas: Franja[]
  frases_grupo: string[]
  viaje?: Viaje | null
  // Enmienda 14: familia de la actividad y personas mínimas y máximas del catálogo (públicas).
  familia?: string | null
  personas?: Personas | null
}

/** Enmienda 14: personas mínimas y máximas de la actividad (catálogo, no son de nadie). */
export interface Personas {
  min: number
  max: number
}

/**
 * Enmienda 14: la actividad del propósito que quedó afuera por tamaño del grupo. Los dos números ya son públicos
 * en el espacio (lista de miembros y catálogo).
 */
export interface Quorum {
  actividad: string
  etiqueta: string
  personas_min: number
  personas_posibles: number
}

const CLAVE_CORTA = /^[a-z_]{1,30}$/
const entero = (v: unknown, min: number, max: number) =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : null

export function familiaSegura(v: unknown): string | null {
  return typeof v === 'string' && CLAVE_CORTA.test(v) ? v : null
}

export function personasSeguras(v: unknown): Personas | null {
  if (!v || typeof v !== 'object') return null
  const min = entero((v as { min?: unknown }).min, 1, 50)
  const max = entero((v as { max?: unknown }).max, 1, 50)
  return min !== null && max !== null && min <= max ? { min, max } : null
}

/** Solo las cuatro claves del contrato; cualquier otra (o una forma rara) se descarta. */
export function quorumSeguro(v: unknown): Quorum | null {
  if (!v || typeof v !== 'object') return null
  const q = v as Record<string, unknown>
  const etiqueta = typeof q.etiqueta === 'string' ? q.etiqueta.trim() : ''
  const min = entero(q.personas_min, 1, 50)
  const posibles = entero(q.personas_posibles, 0, 200)
  if (typeof q.actividad !== 'string' || !CLAVE_CORTA.test(q.actividad) || !etiqueta || etiqueta.length > 40) return null
  if (min === null || posibles === null) return null
  return { actividad: q.actividad, etiqueta, personas_min: min, personas_posibles: posibles }
}

/** Texto fijo del tamaño del grupo (ajuste 7 de la enmienda 14): habla del grupo, nunca de asistencia. */
export function textoQuorum(q: Quorum): string {
  return `Para ${q.etiqueta} hacen falta al menos ${q.personas_min} personas; este grupo tiene ${q.personas_posibles} por ahora.`
}

/** Candidata saneada: el viaje solo con minutos; familia y personas solo con la forma del contrato. */
/**
 * Nombres de personas que trae el catálogo de lugares de la demo (auditoría M2: "Asado en casa de Tomi", "Quincho de
 * Tomi"). El catálogo es de la base, cerrada esta noche; acá se neutralizan para que ningún grupo vea el nombre de
 * alguien que no está: "Asado en casa", "Quincho (Simulación)". Si el catálogo suma otro, va en esta lista.
 */
export const NOMBRES_DEL_CATALOGO = ['Tomi']

export function candidataSegura(c: Candidata): Candidata {
  const n: Candidata = { ...c }
  if (typeof c.titulo === 'string') n.titulo = sinNombres(c.titulo, NOMBRES_DEL_CATALOGO)
  if (c.lugar && typeof c.lugar.nombre === 'string') n.lugar = { ...c.lugar, nombre: sinNombres(c.lugar.nombre, NOMBRES_DEL_CATALOGO) }
  if (c.viaje !== undefined) n.viaje = viajeSeguro(c.viaje)
  if (c.familia !== undefined) n.familia = familiaSegura(c.familia)
  if (c.personas !== undefined) n.personas = personasSeguras(c.personas)
  return n
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
  // Enmienda 14: sin sanear todavía (ver quorumSeguro).
  quorum?: unknown
}

/**
 * Enmienda 10: solo un número de minutos y si es estimado. Cualquier otra clave (zona, modo, una persona) se
 * descarta aunque llegue, y un valor raro da null: la respuesta compartida nunca lleva más que esto.
 */
export function viajeSeguro(v: unknown): Viaje | null {
  if (!v || typeof v !== 'object') return null
  const m = (v as { max_minutos?: unknown }).max_minutos
  if (typeof m !== 'number' || !Number.isFinite(m) || m <= 0 || m > 600) return null
  return { max_minutos: Math.round(m), estimado: (v as { estimado?: unknown }).estimado !== false }
}

/**
 * El viaje de la opción destacada. Si las candidatas traen su propio viaje, vale ese. Si solo viene el de arriba
 * (que es el de la primera opción), sirve únicamente cuando la destacada es la primera.
 */
export function viajeDe(elegida: Candidata, candidatas: Candidata[], arriba: unknown): Viaje | null {
  if (elegida.viaje !== undefined) return viajeSeguro(elegida.viaje)
  return candidatas[0]?.id === elegida.id ? viajeSeguro(arriba) : null
}

// Textos fijos por código de frase (lista cerrada de la enmienda 4). Siempre afirmativos sobre el plan.
export const FRASES: Record<string, string> = {
  presupuesto_todos: 'le sirve al presupuesto de todos',
  bajo_techo: 'es bajo techo por si cambia el tiempo',
  al_aire_libre_con_buen_tiempo: 'es al aire libre con buen pronóstico',
  el_mas_elegido: 'es lo que más eligieron',
  ritmo_del_grupo: 'va con el ritmo que prefiere el grupo',
  // Enmienda 14 (0049): la actividad del propósito del grupo.
  proposito_del_grupo: 'es lo que este grupo vino a hacer',
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
  // Enmienda 10: ni dónde vive nadie ni cómo se mueve (el servidor ya lo tuvo en cuenta).
  'vive', 'viven', 'sin auto', 'no tiene auto', 'no tienen auto', 'que lo lleven', 'que la lleven', 'que los lleven', 'lo pasen a buscar',
  'la pasen a buscar', 'sin movilidad', 'comuna de',
  // Enmienda 14 (ajuste 7): tamaño del grupo, nunca asistencia ("van 4", "se sumaron 4").
  'se sumaron', 'se sumó', 'ya van',
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
export function entradaModelo(
  candidatas: Candidata[],
  perfil: PerfilGrupo | null,
  clima: string,
  nombres: string[],
  simulado = false,
  quorum: Quorum | null = null,
) {
  const p = perfil && perfil.personas > 3 ? perfil : null
  return {
    clima,
    // Enmienda 14: una razón más, con totales del grupo (nunca quién falta).
    aviso_quorum: quorum ? textoQuorum(quorum) : null,
    grupo: {
      personas: perfil?.personas ?? null,
      // Auditoría M1: cuántos son en el grupo (la lista de miembros es pública en el espacio), para elegir un plan que
      // calce con ese tamaño. `personas` de arriba son solo quienes cargaron y habilitaron preferencias.
      tamano: nombres.length > 0 ? nombres.length : null,
      // Una actividad que eligió una sola persona no se menciona: se podría adivinar quién fue.
      gustos: p ? gustosVisibles(p).map((g) => `${g.actividad_etiqueta}: ${g.cuantos} de ${p.personas}`) : [],
      ritmo: p?.energia_mayoritaria ? ENERGIA_TEXTO[p.energia_mayoritaria] ?? null : null,
      ambiente: p?.ambiente_mayoritario ? AMBIENTE_TEXTO[p.ambiente_mayoritario] ?? null : null,
    },
    opciones: candidatas.map((c) => ({
      id: c.id,
      // Enmienda 10: solo el viaje máximo estimado del grupo (minutos), nunca zonas, modos ni personas.
      viaje_max_minutos: viajeSeguro(c.viaje)?.max_minutos ?? null,
      // Enmienda 14 / auditoría M1: mínimo y máximo de personas del plan (catálogo, público).
      personas: personasSeguras(c.personas) ?? null,
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

// ---------------------------------------------------------------------------------------------
// Proveedor del modelo (mejora #64). Sin red ni claves: estas funciones solo deciden y arman datos.
// Con AI_GATEWAY_API_KEY se usa el Vercel AI Gateway; sin ella y con ANTHROPIC_API_KEY, la API de
// Anthropic directa; sin ninguna, no hay modelo y el agente sigue con reglas y texto fijo.
// ---------------------------------------------------------------------------------------------

export const GATEWAY_URL = 'https://ai-gateway.vercel.sh'
// Nombres en el Gateway: `creador/modelo`, con punto en la versión (página de modelos de Vercel).
// Decisión de Nico (23 oct, 19:4x): Opus como principal y Haiku como respaldo si falla o no llega a tiempo.
// Prueba de Fable 5.1 (23 oct, 23:1x, aprobada por Nico): principal Fable con el mismo respaldo, plazo y validaciones.
// Fable piensa siempre (thinking adaptive explícito se acepta), admite effort y salida con esquema; rechaza un
// tool_choice forzado, que acá no se usa. Si no conviene, se vuelve a 'anthropic/claude-opus-5.5'.
export const MODELO_GATEWAY = 'anthropic/claude-fable-5.1'
export const RESPALDO_GATEWAY = 'anthropic/claude-haiku-5.5'
// Nombres en la API de Anthropic directa.
export const MODELO_DIRECTO = 'claude-fable-5-1'
export const RESPALDO_DIRECTO = 'claude-haiku-5-5'
/**
 * Lo que se le deja escribir al modelo. El JSON (explicación de 240, mensaje de 320 y el id) ocupa unos
 * 250 tokens, pero Haiku 5.5 piensa por defecto y ese pensamiento cuenta contra max_tokens: con un tope
 * justo la respuesta se corta antes del texto, se cobra igual y el agente cae al texto fijo. Antes 2048.
 */
export const MAX_TOKENS_MODELO = 1500
export const NOMBRE_HERRAMIENTA = 'elegir_plan'

export interface Proveedor {
  tipo: 'gateway' | 'anthropic'
  /** Nombre de la variable de entorno con la clave: la clave en sí nunca pasa por acá. */
  variableClave: 'AI_GATEWAY_API_KEY' | 'ANTHROPIC_API_KEY'
  /** Solo el Gateway usa otra URL base; con la API directa queda la del SDK. */
  baseURL?: string
  /** Principal (Fable 5.1 en la prueba; antes Opus). */
  modelo: string
  /** Una sola llamada a este si el principal falla o no llega a tiempo (Haiku). */
  respaldo: string
}

/** Lo que la pantalla dice que se usó: "fable", "opus", "haiku", "sonnet" u "otro". */
export function familiaModelo(modelo: string): 'fable' | 'opus' | 'haiku' | 'sonnet' | 'otro' {
  const m = modelo.toLowerCase()
  if (m.includes('fable')) return 'fable'
  return m.includes('opus') ? 'opus' : m.includes('haiku') ? 'haiku' : m.includes('sonnet') ? 'sonnet' : 'otro'
}

// ---------------------------------------------------------------------------------------------
// ¿Salió por la clave propia (BYOK)? El Gateway guarda cada generación y GET /v1/generation?id=gen_… devuelve
// `is_byok` (documentación de Vercel, "Look up a generation"). La función lo consulta en segundo plano, con la
// misma clave y del lado del servidor, y al registro van solo estos tres datos: nunca la clave ni el contenido.
// ---------------------------------------------------------------------------------------------

// Los datos de uso llegan con demora (con 4 y 8 s dio 404, prueba del 23 oct a las 23:15): tres intentos.
export const ESPERAS_GENERACION_MS = [5000, 10000, 20000]

/** De qué tipo es el id que devolvió el Gateway: "gen" sirve para consultar la generación; null si no vino. */
export function tipoDeIdGeneracion(id: unknown): 'gen' | 'msg' | 'otro' | null {
  if (typeof id !== 'string' || id.length === 0) return null
  return id.startsWith('gen_') ? 'gen' : id.startsWith('msg_') ? 'msg' : 'otro'
}

/** Solo lo que dice por dónde salió la llamada; cualquier otro campo (costos, tokens, ids) se descarta. */
export function datosGeneracion(j: unknown): { is_byok: boolean | null; proveedor: string | null; modelo: string | null } {
  const d = (j as { data?: Record<string, unknown> } | null)?.data ?? {}
  const corto = (v: unknown) => (typeof v === 'string' && v.length <= 80 ? v : null)
  return { is_byok: typeof d.is_byok === 'boolean' ? d.is_byok : null, proveedor: corto(d.provider_name), modelo: corto(d.model) }
}

export type ModoSalida = 'json' | 'herramienta'

/**
 * Elige el proveedor según qué secretos existen. `leer` devuelve el valor de una variable de entorno
 * (en la función, Deno.env.get). AGENTE_MODELO y AGENTE_MODELO_RESPALDO pisan el principal y el respaldo,
 * pero solo si tienen el formato del proveedor elegido (`creador/modelo` en el Gateway, sin barra en la API
 * directa): así un valor viejo no deja al agente sin modelo en silencio.
 */
export function elegirProveedor(leer: (nombre: string) => string | undefined): Proveedor | null {
  const hay = (n: string) => (leer(n) ?? '').trim().length > 0
  const pedido = (leer('AGENTE_MODELO') ?? '').trim()
  const pedidoRespaldo = (leer('AGENTE_MODELO_RESPALDO') ?? '').trim()
  if (hay('AI_GATEWAY_API_KEY')) {
    return {
      tipo: 'gateway',
      variableClave: 'AI_GATEWAY_API_KEY',
      baseURL: GATEWAY_URL,
      modelo: pedido.includes('/') ? pedido : MODELO_GATEWAY,
      respaldo: pedidoRespaldo.includes('/') ? pedidoRespaldo : RESPALDO_GATEWAY,
    }
  }
  if (hay('ANTHROPIC_API_KEY')) {
    return {
      tipo: 'anthropic',
      variableClave: 'ANTHROPIC_API_KEY',
      modelo: pedido && !pedido.includes('/') ? pedido : MODELO_DIRECTO,
      respaldo: pedidoRespaldo && !pedidoRespaldo.includes('/') ? pedidoRespaldo : RESPALDO_DIRECTO,
    }
  }
  return null
}

/**
 * AGENTE_SALIDA=herramienta fuerza una herramienta en vez del JSON con esquema, si el proveedor no acepta el
 * formato. Solo sirve con Haiku 5.5: Sonnet 5.5, Opus 5.5 y Fable 5.1 rechazan (400) un tool_choice forzado.
 */
export function modoSalida(valor: string | undefined): ModoSalida {
  return (valor ?? '').trim().toLowerCase() === 'herramienta' ? 'herramienta' : 'json'
}

function esquemaSalida(candidatas: Candidata[]) {
  return {
    type: 'object' as const,
    properties: {
      eleccion_id: { type: 'string' as const, enum: candidatas.map((c) => c.id) },
      explicacion: { type: 'string' as const },
      mensaje_al_grupo: { type: 'string' as const },
    },
    required: ['eleccion_id', 'explicacion', 'mensaje_al_grupo'],
    additionalProperties: false,
  }
}

/** El pedido a Messages. La elección queda limitada por esquema a los ids que el servidor ya validó. */
export function armarPedido(
  proveedor: Proveedor,
  modo: ModoSalida,
  candidatas: Candidata[],
  sistema: string,
  entrada: unknown,
  modelo: string = proveedor.modelo,
) {
  const base = {
    model: modelo,
    max_tokens: MAX_TOKENS_MODELO,
    system: sistema,
    messages: [{ role: 'user' as const, content: JSON.stringify(entrada) }],
  }
  const esquema = esquemaSalida(candidatas)
  if (modo === 'herramienta') {
    return {
      ...base,
      tools: [
        {
          name: NOMBRE_HERRAMIENTA,
          description: 'Elige una de las opciones recibidas y redacta la explicación y el mensaje para el grupo.',
          input_schema: esquema,
        },
      ],
      tool_choice: { type: 'tool' as const, name: NOMBRE_HERRAMIENTA },
    }
  }
  return {
    ...base,
    // Esfuerzo bajo para que el principal responda rápido. Vercel documenta `effort` junto con `thinking: adaptive`
    // (Opus 5.5 y Fable 5.1 piensan siempre; con la herramienta forzada no se manda, porque no se combinan).
    ...(proveedor.tipo === 'gateway' ? { thinking: { type: 'adaptive' as const } } : {}),
    output_config: {
      effort: 'low' as const,
      format: { type: 'json_schema' as const, schema: esquema },
    },
  }
}

interface BloqueRespuesta {
  type: string
  text?: string
  name?: string
  input?: unknown
}

/**
 * Saca el texto JSON de la respuesta del modelo, o null si no terminó bien (cortada por largo, rechazo,
 * sin el bloque esperado). El resultado sigue pasando por validarSalidaModelo.
 */
export function textoDeRespuesta(
  respuesta: { stop_reason?: string | null; content: BloqueRespuesta[] },
  modo: ModoSalida,
): string | null {
  if (modo === 'herramienta') {
    if (respuesta.stop_reason !== 'tool_use') return null
    const bloque = respuesta.content.find((b) => b.type === 'tool_use' && b.name === NOMBRE_HERRAMIENTA)
    return bloque && bloque.input && typeof bloque.input === 'object' ? JSON.stringify(bloque.input) : null
  }
  if (respuesta.stop_reason !== 'end_turn') return null
  const texto = respuesta.content.map((b) => (b.type === 'text' ? (b.text ?? '') : '')).join('')
  return texto.length > 0 ? texto : null
}

// ---------------------------------------------------------------------------------------------
// Límite de llamadas al modelo (mejora #64, costo). Frena a una persona que pide una y otra vez y pone un
// techo por instancia; no frena a quien abre sesiones anónimas nuevas (cada una trae otro usuario) ni suma
// entre instancias, y se reinicia con la función. Es una protección parcial: el tope real de gasto es el
// límite de la clave. Si el límite dice que no, el agente responde igual con la regla y el texto fijo.
// ---------------------------------------------------------------------------------------------

export const ESPERA_POR_USUARIO_MS = 10_000
export const TOPE_GLOBAL = 30
export const VENTANA_GLOBAL_MS = 60_000

/** El `sub` del JWT de quien llama. Solo para llevar la cuenta: la base es quien comprueba la sesión. */
export function usuarioDe(autorizacion: string | null | undefined): string {
  try {
    const token = (autorizacion ?? '').replace(/^Bearer\s+/i, '')
    const carga = token.split('.')[1]
    if (!carga) return 'sin-usuario'
    const json = atob(carga.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(carga.length / 4) * 4, '='))
    const sub = (JSON.parse(json) as { sub?: unknown }).sub
    return typeof sub === 'string' && sub.length > 0 && sub.length <= 64 ? sub : 'sin-usuario'
  } catch {
    return 'sin-usuario'
  }
}

export interface LimiteModelo {
  /** true si esta llamada puede ir al modelo (y la cuenta); false si hay que responder con la regla. */
  permitir(usuario: string, ahora: number): boolean
}

export function crearLimiteModelo(
  esperaMs = ESPERA_POR_USUARIO_MS,
  tope = TOPE_GLOBAL,
  ventanaMs = VENTANA_GLOBAL_MS,
): LimiteModelo {
  const ultimo = new Map<string, number>()
  let llamadas: number[] = []
  return {
    permitir(usuario, ahora) {
      for (const [u, t] of ultimo) if (ahora - t >= esperaMs) ultimo.delete(u)
      llamadas = llamadas.filter((t) => ahora - t < ventanaMs)
      const previo = ultimo.get(usuario)
      if (previo !== undefined && ahora - previo < esperaMs) return false
      if (llamadas.length >= tope) return false
      ultimo.set(usuario, ahora)
      llamadas.push(ahora)
      return true
    },
  }
}
