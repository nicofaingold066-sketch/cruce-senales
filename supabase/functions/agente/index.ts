// Función del servidor del agente del círculo (docs/agente-ia.md, enmiendas 4 y 4.1).
// 1) Trae el clima. 2) Pide a proponer_plan_borrador, con el JWT de quien llama, las opciones que
// le sirven a todo el grupo (el servidor las filtra y ordena con reglas fijas, leyendo las
// preferencias de cada uno). 3) Si hay clave, Claude hace de coordinador del grupo: elige UNA de esas
// opciones mirando el perfil del grupo entero y redacta por qué y un mensaje para invitar.
// El modelo nunca recibe datos de una persona: solo opciones ya validadas, el clima y totales del grupo.
// Sin clave, con error, con una elección fuera de la lista o pasados ~8 s: primera opción y texto fijo.
// Nunca crea, invita ni confirma nada.
import { createClient } from 'npm:@supabase/supabase-js@2'
import Anthropic from 'npm:@anthropic-ai/sdk@1.2.0'

const PLAZO_TOTAL_MS = 8000
const PLAZO_CLIMA_MS = 3000
const MODELO_POR_DEFECTO = 'claude-haiku-5-5'
// Centro de Santiago: el clima es del lugar del encuentro, nunca de la ubicación de una persona.
const LATITUD = -33.45
const LONGITUD = -70.66

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type EstadoClima = 'seco' | 'lluvia' | 'desconocido'

interface ClimaDia {
  estado: EstadoClima
  maxima: number | null
}

interface Franja {
  inicio: string
  fin: string
}

interface Candidata {
  id: string
  actividad?: string
  actividad_etiqueta: string
  lugar: { id: string; nombre: string; simulado: boolean }
  titulo: string
  franjas: Franja[]
  frases_grupo: string[]
}

/** Totales del grupo (enmienda 4.1). Con 3 personas o menos solo llega `personas`. */
interface PerfilGrupo {
  personas: number
  gustos?: { actividad_etiqueta: string; cuantos: number }[]
  energia_mayoritaria?: string | null
  ambiente_mayoritario?: string | null
  presupuesto_grupo?: string | null
}

interface ResultadoPlan extends Candidata {
  tipo: 'borrador'
  personas_consideradas: number
  candidatas?: Candidata[]
  perfil_grupo?: PerfilGrupo
}

// Textos fijos por código de frase (lista cerrada de la enmienda 4). Siempre afirmativos sobre el plan.
const FRASES: Record<string, string> = {
  presupuesto_todos: 'le sirve al presupuesto de todos',
  bajo_techo: 'es bajo techo por si cambia el tiempo',
  al_aire_libre_con_buen_tiempo: 'es al aire libre y se espera buen tiempo',
  el_mas_elegido: 'es lo que más eligieron',
  ritmo_del_grupo: 'va con el ritmo que prefiere el grupo',
}

const ENERGIA_TEXTO: Record<string, string> = { con_todo: 'con todo', algo_tranquilo: 'algo tranquilo' }
const AMBIENTE_TEXTO: Record<string, string> = { fiesta: 'de fiesta', tranquilo: 'tranquilo' }
const PRESUPUESTO_TEXTO: Record<string, string> = {
  cualquiera: 'sin límite de presupuesto',
  moderado: 'algo económico',
  bajo: 'gratis o casi gratis',
}

// Expresiones que delatan la situación de una persona o prometen algo que no pasó. Se comparan como
// palabras completas (las que terminan en * son prefijos). Si el modelo usa una, se descarta su salida.
const PROHIBIDAS = [
  'alguien', 'algunos de ustedes', 'algunas de ustedes', 'uno de ustedes no', 'una de ustedes no', 'quien no puede',
  'plata', 'dinero', 'pobre*', 'caro para', 'no le alcanza', 'no les alcanza', 'no puede pagar', 'no pueden pagar',
  'no puede ir', 'no pueden ir', 'enferm*', 'problemas de salud', 'su salud', 'tu salud', 'ánimo', 'animo', 'triste*',
  'cansad*', 'deprim*', 'restricci*', 'confirmad*', 'reservad*', 'agendad*', 'ya está listo',
]
const LETRA = '\\p{L}'
const PROHIBIDAS_RE = PROHIBIDAS.map((p) => {
  const prefijo = p.endsWith('*')
  const base = (prefijo ? p.slice(0, -1) : p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^${LETRA}])${base}${prefijo ? '' : `($|[^${LETRA}])`}`, 'u')
})

const SISTEMA = [
  'Eres el agente coordinador de un grupo de amigos en CRUXE, una app chilena para que los planes entre amigos sí ocurran.',
  'Tu carácter: comprensivo, empático, amable, ejecutivo y buen coordinador. Piensas en el grupo entero, no en una persona.',
  'Recibes opciones de plan que el servidor ya comprobó que le sirven a todos (presupuesto, techo si llueve), el clima y el perfil',
  'agregado del grupo. Elige la opción que mejor equilibra los gustos del grupo, su ritmo y el clima; ante la duda, la primera.',
  'Escribe en español de Chile, cercano y concreto, sin exagerar.',
  'Reglas que no se rompen: no nombres a ninguna persona; no hables de la situación de nadie en particular (dinero, salud, ánimo,',
  'disponibilidad); no uses las palabras "alguien", "plata", "dinero", "confirmado", "reservado" ni "agendado"; no inventes datos',
  'que no te dieron; no digas que algo está confirmado, reservado o agendado: el grupo todavía tiene que aceptarlo, y los lugares',
  'son de simulación. Si el clima empieza con "Simulación", es un clima de prueba: no lo presentes como pronóstico real.',
  'explicacion: una o dos frases, máximo 240 caracteres, sobre por qué esa opción le sirve al grupo.',
  'mensaje_al_grupo: una invitación de máximo 320 caracteres, en una sola línea, que proponga el plan con sus dos opciones de día',
  'e invite a cada uno a marcar si le interesa y cargar su disponibilidad.',
].join(' ')

function responder(cuerpo: unknown, estado = 200): Response {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' },
  })
}

function errorEntrada(detalle: string, mensaje: string): Response {
  return responder({
    ok: false,
    contrato: 2,
    error: { codigo: 'entrada_incompleta', detalle, mensaje, reintentable: false },
    state_rev: null,
  })
}

function errorTemporal(): Response {
  return responder({
    ok: false,
    contrato: 2,
    error: { codigo: 'fallo_temporal', detalle: 'reintentar', mensaje: 'Falla temporal. Intenta de nuevo.', reintentable: true },
    state_rev: null,
  })
}

function sumarDia(fecha: string): string {
  const d = new Date(`${fecha}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

function esSabado(fecha: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(fecha) && new Date(`${fecha}T12:00:00Z`).getUTCDay() === 6
}

/** Pronóstico de Open-Meteo (gratis, sin clave). Si falla o tarda, todo queda "desconocido". */
async function traerClima(sabado: string): Promise<{ sabado: ClimaDia; domingo: ClimaDia; fuente: string }> {
  const desconocido = { estado: 'desconocido' as const, maxima: null }
  const domingo = sumarDia(sabado)
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${LATITUD}&longitude=${LONGITUD}` +
    `&daily=precipitation_probability_max,weather_code,temperature_2m_max&timezone=America%2FSantiago` +
    `&start_date=${sabado}&end_date=${domingo}`
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(PLAZO_CLIMA_MS) })
    if (!r.ok) return { sabado: desconocido, domingo: desconocido, fuente: 'sin_pronostico' }
    const j = await r.json()
    const dias: string[] = j?.daily?.time ?? []
    const dia = (fecha: string): ClimaDia => {
      const i = dias.indexOf(fecha)
      if (i < 0) return desconocido
      const prob = j.daily.precipitation_probability_max?.[i]
      const codigo = j.daily.weather_code?.[i]
      const maxima = j.daily.temperature_2m_max?.[i]
      if (typeof prob !== 'number' && typeof codigo !== 'number') return desconocido
      // Código WMO 51 o más = llovizna, lluvia, nieve o tormenta.
      const llueve = (typeof prob === 'number' && prob >= 50) || (typeof codigo === 'number' && codigo >= 51)
      return { estado: llueve ? 'lluvia' : 'seco', maxima: typeof maxima === 'number' ? Math.round(maxima) : null }
    }
    return { sabado: dia(sabado), domingo: dia(domingo), fuente: 'open-meteo' }
  } catch {
    return { sabado: desconocido, domingo: desconocido, fuente: 'sin_pronostico' }
  }
}

/** Clima de simulación (mejora #23): solo en espacios demo, para que la demo no dependa del clima real. */
function climaSimulado(estado: 'seco' | 'lluvia'): { sabado: ClimaDia; domingo: ClimaDia; fuente: string } {
  const dia = { estado, maxima: null }
  return { sabado: dia, domingo: dia, fuente: 'simulacion' }
}

function resumenClima(c: { sabado: ClimaDia; domingo: ClimaDia; fuente: string }): string {
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

function unirFrases(codigos: string[]): string {
  const partes = codigos.map((c) => FRASES[c]).filter((t): t is string => Boolean(t))
  if (partes.length === 0) return 'Es la opción que mejor le sirve al grupo con lo que cargaron.'
  const texto = partes.length === 1 ? partes[0] : `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`
  return `${texto.charAt(0).toUpperCase()}${texto.slice(1)}.`
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

/** "sábado 31 de 14:00 a 17:00", sin convertir zonas (HoraLocal de Santiago). */
function franjaCorta(f: Franja): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})/.exec(f.inicio)
  const n = /T(\d{2}:\d{2})/.exec(f.fin)
  if (!m || !n) return `${f.inicio} a ${f.fin}`
  const dia = DIAS[new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).getUTCDay()]
  return `${dia} ${Number(m[3])} de ${m[4]} a ${n[1]}`
}

function mensajeFijo(c: Candidata): string {
  const [a, b] = c.franjas
  const dias = a && b ? ` el ${franjaCorta(a)} o el ${franjaCorta(b)}` : ''
  return `¡Hola! Les propongo ${c.titulo.charAt(0).toLowerCase()}${c.titulo.slice(1)}${dias}. Marquen si les interesa y carguen su disponibilidad en CRUXE.`
}

function escapar(t: string): string {
  return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
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

/** Lo único que ve el modelo: opciones ya validadas, clima y totales del grupo. Sin nombres ni ids de miembros. */
export function entradaModelo(candidatas: Candidata[], perfil: PerfilGrupo | null, clima: string, nombres: string[]) {
  const p = perfil && perfil.personas > 3 ? perfil : null
  return {
    clima,
    grupo: {
      personas: perfil?.personas ?? null,
      gustos: p?.gustos?.map((g) => `${g.actividad_etiqueta}: ${g.cuantos} de ${p.personas}`) ?? [],
      ritmo: p?.energia_mayoritaria ? ENERGIA_TEXTO[p.energia_mayoritaria] ?? null : null,
      ambiente: p?.ambiente_mayoritario ? AMBIENTE_TEXTO[p.ambiente_mayoritario] ?? null : null,
      presupuesto: p?.presupuesto_grupo ? PRESUPUESTO_TEXTO[p.presupuesto_grupo] ?? null : null,
    },
    opciones: candidatas.map((c) => ({
      id: c.id,
      // El catálogo puede traer el nombre de un integrante ("Quincho de Tomi"): al modelo le llega sin nombre.
      plan: sinNombres(c.titulo, nombres),
      actividad: c.actividad_etiqueta,
      lugar: sinNombres(c.lugar.nombre.replace(' (Simulación)', ''), nombres),
      dias: c.franjas.map(franjaCorta),
      razones: c.frases_grupo.map((f) => FRASES[f]).filter(Boolean),
    })),
  }
}

async function coordinarConModelo(
  candidatas: Candidata[],
  perfil: PerfilGrupo | null,
  clima: string,
  nombres: string[],
  restanteMs: number,
): Promise<{ eleccion: Candidata; explicacion: string; mensaje: string } | null> {
  const clave = Deno.env.get('ANTHROPIC_API_KEY')
  if (!clave || restanteMs < 1500 || candidatas.length === 0 || candidatas.some((c) => typeof c.id !== 'string')) return null
  const modelo = Deno.env.get('AGENTE_MODELO') || MODELO_POR_DEFECTO
  const client = new Anthropic({ apiKey: clave, timeout: restanteMs, maxRetries: 0 })
  try {
    const respuesta = await client.messages.create({
      model: modelo,
      max_tokens: 2048,
      system: SISTEMA,
      output_config: {
        effort: 'low',
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              eleccion_id: { type: 'string', enum: candidatas.map((c) => c.id) },
              explicacion: { type: 'string' },
              mensaje_al_grupo: { type: 'string' },
            },
            required: ['eleccion_id', 'explicacion', 'mensaje_al_grupo'],
            additionalProperties: false,
          },
        },
      },
      messages: [{ role: 'user', content: JSON.stringify(entradaModelo(candidatas, perfil, clima, nombres)) }],
    })
    if (respuesta.stop_reason !== 'end_turn') return null
    const texto = respuesta.content.map((b) => (b.type === 'text' ? b.text : '')).join('')
    const salida = JSON.parse(texto) as { eleccion_id?: unknown; explicacion?: unknown; mensaje_al_grupo?: unknown }
    // La elección tiene que ser una de las opciones que el servidor ya validó.
    const eleccion = candidatas.find((c) => c.id === salida.eleccion_id)
    if (!eleccion) return null
    if (!textoValido(salida.explicacion, 240, nombres) || !textoValido(salida.mensaje_al_grupo, 320, nombres)) return null
    return { eleccion, explicacion: salida.explicacion.trim(), mensaje: salida.mensaje_al_grupo.trim() }
  } catch (e) {
    // Solo el tipo de error: nunca el contenido ni datos del grupo.
    console.error('agente: el modelo no respondió', e instanceof Error ? e.name : 'desconocido')
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return errorEntrada('formato_invalido', 'Un dato tiene un formato inválido.')
  const inicio = Date.now()

  const autorizacion = req.headers.get('Authorization')
  if (!autorizacion) {
    return responder({
      ok: false,
      contrato: 2,
      error: { codigo: 'sesion_invalida', detalle: 'sin_sesion', mensaje: 'No hay una sesión válida. Recarga la página para continuar.', reintentable: false },
      state_rev: null,
    })
  }

  let entrada: { espacio_id?: unknown; sabado?: unknown; clima_simulado?: unknown }
  try {
    entrada = await req.json()
  } catch {
    return errorEntrada('formato_invalido', 'Un dato tiene un formato inválido.')
  }
  const espacioId = typeof entrada.espacio_id === 'string' ? entrada.espacio_id : ''
  const sabado = typeof entrada.sabado === 'string' ? entrada.sabado : ''
  if (!espacioId) return errorEntrada('campo_faltante', 'Falta completar un dato obligatorio.')
  if (!esSabado(sabado)) return errorEntrada('fecha_invalida', 'La fecha debe ser un sábado futuro dentro de los próximos 16 días.')

  const url = Deno.env.get('SUPABASE_URL')
  const clavePublica = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
  if (!url || !clavePublica) return errorTemporal()
  // Cliente con el JWT de quien llama: la base decide rol y pertenencia, sin clave de servicio.
  const supabase = createClient(url, clavePublica, {
    global: { headers: { Authorization: autorizacion } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Nombres visibles del espacio (no son privados): solo para rechazar un texto que nombre a alguien.
  // get_space, con el JWT de quien llama, también dice si el espacio es demo: el cliente no lo decide.
  let nombres: string[] = []
  let esDemo = false
  const { data: espacio } = await supabase.rpc('get_space', { p_espacio_id: espacioId })
  if (espacio?.ok && espacio.espacio) {
    esDemo = espacio.espacio.demo === true
    if (Array.isArray(espacio.espacio.miembros)) {
      nombres = espacio.espacio.miembros.map((m: { nombre?: string }) => m.nombre ?? '').filter(Boolean)
    }
  }

  // Clima simulado solo en un espacio demo; en cualquier otro caso se ignora y va el clima real.
  const pedido = entrada.clima_simulado
  const clima = esDemo && (pedido === 'seco' || pedido === 'lluvia') ? climaSimulado(pedido) : await traerClima(sabado)
  const { data: plan, error: errorPlan } = await supabase.rpc('proponer_plan_borrador', {
    p_espacio_id: espacioId,
    p_sabado: sabado,
    p_clima: { sabado: clima.sabado.estado, domingo: clima.domingo.estado },
  })
  if (errorPlan || !plan || typeof plan !== 'object') return errorTemporal()
  // Errores de negocio (rol, pertenencia, pocas preferencias...) y "sin plan compatible" pasan tal cual.
  if (!plan.ok || plan.resultado?.tipo !== 'borrador') return responder(plan)

  const base = plan.resultado as ResultadoPlan
  // Sin la enmienda 4.1, la única opción es la que eligió el servidor (su id es el del catálogo).
  const candidatas: Candidata[] =
    Array.isArray(base.candidatas) && base.candidatas.length > 0 ? base.candidatas.slice(0, 3) : [{ ...base, id: base.id ?? base.lugar.id }]
  const perfil = base.perfil_grupo ?? null
  const resumen = resumenClima(clima)

  const delModelo = await coordinarConModelo(candidatas, perfil, resumen, nombres, PLAZO_TOTAL_MS - (Date.now() - inicio))
  const elegida = delModelo?.eleccion ?? candidatas[0]

  // Los campos de primer nivel describen la opción destacada; `candidatas` trae todas para que el
  // organizador vea y decida cuál usar. Nada se crea ni se invita desde acá.
  return responder({
    ...plan,
    resultado: {
      tipo: 'borrador',
      actividad: elegida.actividad ?? base.actividad,
      actividad_etiqueta: elegida.actividad_etiqueta,
      lugar: elegida.lugar,
      titulo: elegida.titulo,
      franjas: elegida.franjas,
      frases_grupo: elegida.frases_grupo,
      personas_consideradas: base.personas_consideradas,
      candidatas,
      elegida_id: elegida.id,
      clima: { fuente: clima.fuente, resumen, sabado: clima.sabado.estado, domingo: clima.domingo.estado },
      explicacion: delModelo?.explicacion ?? unirFrases(elegida.frases_grupo),
      mensaje_al_grupo: delModelo?.mensaje ?? mensajeFijo(elegida),
      eleccion_fuente: delModelo ? 'modelo' : 'regla',
      explicacion_fuente: delModelo ? 'modelo' : 'texto_fijo',
    },
  })
})
