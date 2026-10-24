// Agente con herramientas (pedido de Nico, 23 oct 23:17): "la IA propone, las reglas protegen".
// El modelo decide qué mirar y cuándo (clima, planes, canchas) y cada resultado sale de los filtros del servidor:
// buscar_planes llama a proponer_plan_borrador, que ya descarta por presupuesto, techo, viaje, familia y quórum.
// El modelo nunca recibe datos de una persona: lo mismo que entradaModelo (totales del grupo y opciones validadas).
// Al final elige con elegir_plan entre las candidatas del servidor y pasa por validarSalidaModelo, como siempre.
// Sin red, sin base y sin modelo: index.ts inyecta las implementaciones reales; las pruebas, las simuladas.
import { validarSalidaModelo, type Candidata } from './logica.ts'

/** Tope de llamadas a herramientas (sin contar la elección final) y tiempo total del bucle. */
export const MAX_HERRAMIENTAS = 4
export const PLAZO_HERRAMIENTAS_MS = 25000

export type Dia = 'sabado' | 'domingo'
export type EstadoClimaDia = 'seco' | 'lluvia' | 'desconocido'

/** Lo que devuelve buscar_planes del lado del servidor (la respuesta de proponer_plan_borrador ya saneada). */
export type ResultadoBusqueda =
  | { tipo: 'borrador'; candidatas: Candidata[]; paraModelo: unknown }
  | { tipo: 'sin_plan'; motivo: string | null }
  | { tipo: 'error' }

/** Las herramientas reales: las implementa index.ts. */
export interface Herramientas {
  verClima(dia: Dia): Promise<{ estado: EstadoClimaDia; maxima: number | null; simulado: boolean }>
  buscarPlanes(): Promise<ResultadoBusqueda>
  /** Sitios reales donde ver canchas de esa actividad (los enlaces los arma el panel). Vacío si no aplica. */
  buscarCanchas(actividad: string): string[]
}

export interface BloqueModelo {
  type: string
  id?: string
  name?: string
  input?: unknown
  text?: string
  [otro: string]: unknown
}

export interface RespuestaModelo {
  id?: string
  stop_reason?: string | null
  content: BloqueModelo[]
}

export type Mensaje = { role: 'user' | 'assistant'; content: unknown }

/** Una vuelta del modelo; `plazoMs` es lo que le queda al bucle. Si falla o se agota el tiempo, lanza. */
export type LlamarModelo = (mensajes: Mensaje[], plazoMs: number) => Promise<RespuestaModelo>

export interface ResultadoBucle {
  eleccion: Candidata
  explicacion: string
  mensaje: string
  candidatas: Candidata[]
  /** Pasos con texto fijo del servidor (nunca texto del modelo ni nombres). */
  pasos: string[]
  /** El id de la última respuesta (para registrar BYOK). */
  idRespuesta: unknown
}

export const NOMBRE_ELEGIR = 'elegir_plan'

export const HERRAMIENTAS = [
  {
    name: 'ver_clima',
    description: 'Pronóstico del sábado o del domingo en Santiago (en el demo, el clima de simulación). Devuelve estado y máxima.',
    input_schema: {
      type: 'object' as const,
      properties: { dia: { type: 'string' as const, enum: ['sabado', 'domingo'] } },
      required: ['dia'],
      additionalProperties: false,
    },
  },
  {
    name: 'buscar_planes',
    description:
      'Busca en el servidor los planes que le sirven a TODO el grupo, ya filtrados por presupuesto, techo si llueve, ' +
      'tiempo de viaje, propósito del grupo y cantidad de personas. Usa el clima que el servidor conoce. Devuelve las ' +
      'opciones con sus razones y totales del grupo. Las únicas opciones válidas para elegir son las que devuelve.',
    input_schema: { type: 'object' as const, properties: {}, additionalProperties: false },
  },
  {
    name: 'buscar_canchas',
    description: 'Dice si hay sitios reales para ver canchas de una actividad (pádel, fútbol o tenis). CRUXE no reserva.',
    input_schema: {
      type: 'object' as const,
      properties: { actividad: { type: 'string' as const, enum: ['padel', 'futbol', 'tenis'] } },
      required: ['actividad'],
      additionalProperties: false,
    },
  },
  {
    name: NOMBRE_ELEGIR,
    description:
      'Último paso: elige UNA de las opciones que devolvió buscar_planes y redacta la explicación (máximo 240 caracteres) ' +
      'y el mensaje al grupo (máximo 320, una línea).',
    input_schema: {
      type: 'object' as const,
      properties: {
        eleccion_id: { type: 'string' as const },
        explicacion: { type: 'string' as const },
        mensaje_al_grupo: { type: 'string' as const },
      },
      required: ['eleccion_id', 'explicacion', 'mensaje_al_grupo'],
      additionalProperties: false,
    },
  },
]

const DIA_TEXTO: Record<Dia, string> = { sabado: 'sábado', domingo: 'domingo' }
const CLIMA_TEXTO: Record<EstadoClimaDia, string> = { seco: 'sin lluvia', lluvia: 'lluvia', desconocido: 'sin pronóstico' }
const ACTIVIDAD_TEXTO: Record<string, string> = { padel: 'pádel', futbol: 'fútbol', tenis: 'tenis' }

/** Texto fijo de cada paso: lo arma el servidor con lo que pasó, nunca con texto del modelo. */
export function textoPaso(nombre: string, entrada: unknown, resultado: unknown): string | null {
  const e = (entrada ?? {}) as Record<string, unknown>
  if (nombre === 'ver_clima') {
    const r = resultado as { estado?: EstadoClimaDia; simulado?: boolean } | null
    const dia = DIA_TEXTO[e.dia as Dia]
    if (!dia || !r?.estado) return null
    return `Miré el clima del ${dia}: ${CLIMA_TEXTO[r.estado]}${r.simulado ? ' (simulación)' : ''}`
  }
  if (nombre === 'buscar_planes') {
    const r = resultado as ResultadoBusqueda | null
    if (!r || r.tipo === 'error') return 'Intenté buscar planes, pero el servidor no respondió'
    const n = r.tipo === 'borrador' ? r.candidatas.length : 0
    return `Busqué planes que le sirven a todo el grupo: ${n === 0 ? 'ninguno' : n}`
  }
  if (nombre === 'buscar_canchas') {
    const act = ACTIVIDAD_TEXTO[String(e.actividad)]
    const sitios = Array.isArray(resultado) ? (resultado as string[]) : []
    if (!act) return null
    return sitios.length > 0 ? `Busqué canchas reales de ${act}: ${unirLista(sitios)}` : `No hay sitios de canchas para ${act}`
  }
  return null
}

function unirLista(xs: string[]): string {
  return xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`
}

/** Ejecuta UNA herramienta de acción. Devuelve lo que ve el modelo (JSON) y el resultado para el paso. */
async function ejecutar(
  nombre: string,
  entrada: unknown,
  h: Herramientas,
): Promise<{ paraModelo: unknown; resultado: unknown; error: boolean; busqueda?: ResultadoBusqueda }> {
  const e = (entrada ?? {}) as Record<string, unknown>
  if (nombre === 'ver_clima') {
    if (e.dia !== 'sabado' && e.dia !== 'domingo') return { paraModelo: { error: 'dia debe ser sabado o domingo' }, resultado: null, error: true }
    const c = await h.verClima(e.dia)
    return { paraModelo: { dia: e.dia, estado: c.estado, maxima: c.maxima, simulacion: c.simulado }, resultado: c, error: false }
  }
  if (nombre === 'buscar_planes') {
    const r = await h.buscarPlanes()
    if (r.tipo === 'error') return { paraModelo: { error: 'el servidor no respondió' }, resultado: r, error: true, busqueda: r }
    if (r.tipo === 'sin_plan') return { paraModelo: { opciones: [], motivo: r.motivo }, resultado: r, error: false, busqueda: r }
    return { paraModelo: r.paraModelo, resultado: r, error: false, busqueda: r }
  }
  if (nombre === 'buscar_canchas') {
    if (typeof e.actividad !== 'string' || !ACTIVIDAD_TEXTO[e.actividad]) {
      return { paraModelo: { error: 'actividad debe ser padel, futbol o tenis' }, resultado: [], error: true }
    }
    const sitios = h.buscarCanchas(e.actividad)
    return { paraModelo: { actividad: e.actividad, sitios, nota: 'Los enlaces se muestran en la app; CRUXE no reserva.' }, resultado: sitios, error: false }
  }
  return { paraModelo: { error: `herramienta desconocida: ${nombre.slice(0, 40)}` }, resultado: null, error: true }
}

/**
 * El bucle: el modelo pide herramientas, la función las ejecuta y le devuelve los resultados, hasta que elige con
 * elegir_plan. Devuelve null (y la función sigue por el camino de siempre) si se pasa de MAX_HERRAMIENTAS, de tiempo,
 * si el modelo falla, termina sin elegir o elige algo que no pasa la validación.
 */
export async function bucleHerramientas(opciones: {
  llamar: LlamarModelo
  herramientas: Herramientas
  entradaInicial: unknown
  nombres: string[]
  hastaMs: number
  ahora?: () => number
  maxHerramientas?: number
}): Promise<ResultadoBucle | null> {
  const ahora = opciones.ahora ?? Date.now
  const max = opciones.maxHerramientas ?? MAX_HERRAMIENTAS
  const mensajes: Mensaje[] = [{ role: 'user', content: JSON.stringify(opciones.entradaInicial) }]
  const pasos: string[] = []
  let usadas = 0
  let busqueda: ResultadoBusqueda | null = null
  // Una vuelta por herramienta más la de la elección, con margen; el tope real es `max`.
  for (let vuelta = 0; vuelta < max + 2; vuelta++) {
    const restante = opciones.hastaMs - ahora()
    if (restante < 1500) return null
    let r: RespuestaModelo
    try {
      r = await opciones.llamar(mensajes, restante)
    } catch {
      return null
    }
    if (ahora() > opciones.hastaMs) return null
    if (r.stop_reason !== 'tool_use') return null
    const usos = r.content.filter((b) => b.type === 'tool_use' && typeof b.name === 'string' && typeof b.id === 'string')
    if (usos.length === 0) return null
    const eleccion = usos.find((b) => b.name === NOMBRE_ELEGIR)
    if (eleccion) {
      if (!busqueda || busqueda.tipo !== 'borrador') return null
      const valida = validarSalidaModelo(JSON.stringify(eleccion.input ?? {}), busqueda.candidatas, opciones.nombres)
      if (!valida) return null
      pasos.push(`Elegí: ${valida.eleccion.actividad_etiqueta} en ${valida.eleccion.lugar.nombre}`)
      return { ...valida, candidatas: busqueda.candidatas, pasos, idRespuesta: r.id }
    }
    usadas += usos.length
    if (usadas > max) return null
    const resultados: unknown[] = []
    for (const uso of usos) {
      let hecho: Awaited<ReturnType<typeof ejecutar>>
      try {
        hecho = await ejecutar(uso.name as string, uso.input, opciones.herramientas)
      } catch {
        hecho = { paraModelo: { error: 'la herramienta falló' }, resultado: null, error: true }
      }
      if (hecho.busqueda) busqueda = hecho.busqueda
      const paso = hecho.error && uso.name !== 'buscar_planes' ? null : textoPaso(uso.name as string, uso.input, hecho.resultado)
      if (paso) pasos.push(paso)
      resultados.push({
        type: 'tool_result',
        tool_use_id: uso.id,
        content: JSON.stringify(hecho.paraModelo),
        ...(hecho.error ? { is_error: true } : {}),
      })
    }
    // El turno del modelo vuelve tal cual (incluye sus bloques de pensamiento, que no se pueden tocar).
    mensajes.push({ role: 'assistant', content: r.content })
    mensajes.push({ role: 'user', content: resultados })
  }
  return null
}

/** Instrucciones extra para el modo con herramientas (se suman al sistema de siempre). */
export const SISTEMA_HERRAMIENTAS = [
  'Ahora trabajas con herramientas. Decide tú qué mirar: ver_clima para el sábado y el domingo (puedes pedir los dos a la vez),',
  'buscar_planes para traer las opciones que el servidor ya comprobó que le sirven a todo el grupo y, si una opción es de',
  'pádel, fútbol o tenis, buscar_canchas. No inventes opciones: solo puedes elegir entre las que devuelve buscar_planes.',
  'Termina siempre con elegir_plan. Usa como máximo cuatro herramientas antes de elegir. Sé breve: no expliques tus pasos.',
].join(' ')
