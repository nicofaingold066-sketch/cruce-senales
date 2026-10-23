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
import {
  candidatasDe,
  climaPedido,
  climaSimulado,
  entradaModelo,
  esSabado,
  leerPronostico,
  mensajeFijo,
  perfilParaRespuesta,
  resumenClima,
  sumarDia,
  unirFrases,
  validarSalidaModelo,
  type Candidata,
  type Clima,
  type PerfilGrupo,
  type ResultadoPlan,
} from './logica.ts'

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

/** Pronóstico de Open-Meteo (gratis, sin clave). Si falla o tarda, todo queda "desconocido". */
async function traerClima(sabado: string): Promise<Clima> {
  const desconocido = { estado: 'desconocido' as const, maxima: null }
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${LATITUD}&longitude=${LONGITUD}` +
    `&daily=precipitation_probability_max,weather_code,temperature_2m_max&timezone=America%2FSantiago` +
    `&start_date=${sabado}&end_date=${sumarDia(sabado)}`
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(PLAZO_CLIMA_MS) })
    if (!r.ok) return { sabado: desconocido, domingo: desconocido, fuente: 'sin_pronostico' }
    return leerPronostico(await r.json(), sabado)
  } catch {
    return { sabado: desconocido, domingo: desconocido, fuente: 'sin_pronostico' }
  }
}

async function coordinarConModelo(
  candidatas: Candidata[],
  perfil: PerfilGrupo | null,
  clima: string,
  nombres: string[],
  restanteMs: number,
  simulado: boolean,
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
      messages: [{ role: 'user', content: JSON.stringify(entradaModelo(candidatas, perfil, clima, nombres, simulado)) }],
    })
    if (respuesta.stop_reason !== 'end_turn') return null
    const texto = respuesta.content.map((b) => (b.type === 'text' ? b.text : '')).join('')
    // La elección tiene que ser una de las opciones que el servidor ya validó, y los textos, válidos.
    return validarSalidaModelo(texto, candidatas, nombres)
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
  const simuladoPedido = climaPedido(esDemo, entrada.clima_simulado)
  const clima = simuladoPedido ? climaSimulado(simuladoPedido) : await traerClima(sabado)
  const { data: plan, error: errorPlan } = await supabase.rpc('proponer_plan_borrador', {
    p_espacio_id: espacioId,
    p_sabado: sabado,
    p_clima: { sabado: clima.sabado.estado, domingo: clima.domingo.estado },
  })
  if (errorPlan || !plan || typeof plan !== 'object') return errorTemporal()
  // Errores de negocio (rol, pertenencia, pocas preferencias...) y "sin plan compatible" pasan tal cual.
  if (!plan.ok || plan.resultado?.tipo !== 'borrador') return responder(plan)

  const base = plan.resultado as ResultadoPlan
  const candidatas = candidatasDe(base)
  const perfil = base.perfil_grupo ?? null
  const resumen = resumenClima(clima)

  const simulado = clima.fuente === 'simulacion'
  const delModelo = await coordinarConModelo(candidatas, perfil, resumen, nombres, PLAZO_TOTAL_MS - (Date.now() - inicio), simulado)
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
      // Solo totales del grupo; con 3 personas o menos, solo la cantidad (mejora #26).
      perfil_grupo: perfilParaRespuesta(perfil),
      clima: { fuente: clima.fuente, resumen, sabado: clima.sabado.estado, domingo: clima.domingo.estado },
      explicacion: delModelo?.explicacion ?? unirFrases(elegida.frases_grupo, simulado),
      mensaje_al_grupo: delModelo?.mensaje ?? mensajeFijo(elegida),
      eleccion_fuente: delModelo ? 'modelo' : 'regla',
      explicacion_fuente: delModelo ? 'modelo' : 'texto_fijo',
    },
  })
})
