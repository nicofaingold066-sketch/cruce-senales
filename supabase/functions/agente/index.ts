// Función del servidor del agente del círculo (docs/agente-ia.md, enmienda 4).
// Hace solo tres cosas: trae el clima, pide el plan a proponer_plan_borrador (puntaje fijo en
// Postgres, con el JWT de quien llama) y, si hay clave, le pide a Claude que redacte la explicación.
// El modelo nunca recibe datos de una persona: solo el plan elegido, el clima y frases del grupo.
// Sin clave, con error o pasados ~8 s, devuelve el texto fijo. Nunca crea ni confirma nada.
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

interface Borrador {
  tipo: 'borrador'
  actividad: string
  actividad_etiqueta: string
  lugar: { id: string; nombre: string; simulado: boolean }
  titulo: string
  franjas: Franja[]
  frases_grupo: string[]
  personas_consideradas: number
}

// Textos fijos por código de frase (lista cerrada de la enmienda 4). Siempre afirmativos sobre el plan.
const FRASES: Record<string, string> = {
  presupuesto_todos: 'le sirve al presupuesto de todos',
  bajo_techo: 'es bajo techo por si cambia el tiempo',
  al_aire_libre_con_buen_tiempo: 'es al aire libre y se espera buen tiempo',
  el_mas_elegido: 'es lo que más eligieron',
  ritmo_del_grupo: 'va con el ritmo que prefiere el grupo',
}

// Palabras que delatan una situación individual. Si el modelo las usa, se descarta su texto.
const PROHIBIDAS = [
  'alguien', 'algunos', 'algunas', 'plata', 'dinero', 'pobre', 'caro para', 'no puede', 'no pueden',
  'enfermo', 'enferma', 'salud', 'ánimo', 'animo', 'triste', 'cansad', 'deprim', 'restricci',
]

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

function resumenClima(c: { sabado: ClimaDia; domingo: ClimaDia; fuente: string }): string {
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

/** Acepta el texto del modelo solo si es corto y no nombra a nadie ni delata una situación individual. */
function textoValido(texto: string, nombres: string[]): boolean {
  const t = texto.trim()
  if (t.length < 15 || t.length > 240 || t.includes('\n')) return false
  const bajo = t.toLowerCase()
  if (PROHIBIDAS.some((p) => bajo.includes(p))) return false
  return !nombres.some((n) => n.length > 1 && new RegExp(`\\b${n.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'u').test(bajo))
}

async function redactarConModelo(
  borrador: Borrador,
  clima: string,
  textoFijo: string,
  nombres: string[],
  restanteMs: number,
): Promise<string | null> {
  const clave = Deno.env.get('ANTHROPIC_API_KEY')
  if (!clave || restanteMs < 1500) return null
  const modelo = Deno.env.get('AGENTE_MODELO') || MODELO_POR_DEFECTO
  const client = new Anthropic({ apiKey: clave, timeout: restanteMs, maxRetries: 0 })
  try {
    const respuesta = await client.messages.create({
      model: modelo,
      max_tokens: 1024,
      output_config: { effort: 'low' },
      system:
        'Redactas, en español de Chile y en tono cercano, la explicación de un plan para un grupo de amigos. ' +
        'Escribe una o dos frases, de 200 caracteres como máximo, en una sola línea y sin comillas. ' +
        'Usa solo los datos que te dan. No nombres a ninguna persona, no hables de la situación de nadie en particular ' +
        '(dinero, salud, ánimo, disponibilidad) y no digas que el plan está confirmado: el grupo todavía tiene que aceptarlo.',
      messages: [
        {
          role: 'user',
          content: JSON.stringify({
            plan: borrador.titulo,
            actividad: borrador.actividad_etiqueta,
            lugar: borrador.lugar.nombre.replace(' (Simulación)', ''),
            dias: 'sábado o domingo',
            clima,
            razones_del_grupo: borrador.frases_grupo.map((c) => FRASES[c]).filter(Boolean),
            ejemplo_de_tono: textoFijo,
          }),
        },
      ],
    })
    if (respuesta.stop_reason !== 'end_turn') return null
    const texto = respuesta.content
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('')
      .trim()
    return textoValido(texto, nombres) ? texto : null
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

  let entrada: { espacio_id?: unknown; sabado?: unknown }
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

  const clima = await traerClima(sabado)
  const { data: plan, error: errorPlan } = await supabase.rpc('proponer_plan_borrador', {
    p_espacio_id: espacioId,
    p_sabado: sabado,
    p_clima: { sabado: clima.sabado.estado, domingo: clima.domingo.estado },
  })
  if (errorPlan || !plan || typeof plan !== 'object') return errorTemporal()
  // Errores de negocio (rol, pertenencia, pocas preferencias...) pasan tal cual.
  if (!plan.ok || plan.resultado?.tipo !== 'borrador') return responder(plan)

  const borrador = plan.resultado as Borrador
  const resumen = resumenClima(clima)
  const textoFijo = unirFrases(borrador.frases_grupo)

  // Nombres visibles del espacio (no son privados): solo para rechazar un texto que nombre a alguien.
  let nombres: string[] = []
  const { data: espacio } = await supabase.rpc('get_space', { p_espacio_id: espacioId })
  if (espacio?.ok && Array.isArray(espacio.espacio?.miembros)) {
    nombres = espacio.espacio.miembros.map((m: { nombre?: string }) => m.nombre ?? '').filter(Boolean)
  }

  const delModelo = await redactarConModelo(borrador, resumen, textoFijo, nombres, PLAZO_TOTAL_MS - (Date.now() - inicio))

  return responder({
    ...plan,
    resultado: {
      ...borrador,
      clima: { fuente: clima.fuente, resumen, sabado: clima.sabado.estado, domingo: clima.domingo.estado },
      explicacion: delModelo ?? textoFijo,
      explicacion_fuente: delModelo ? 'modelo' : 'texto_fijo',
    },
  })
})
