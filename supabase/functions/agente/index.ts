// Función del servidor del agente del círculo (docs/agente-ia.md, enmiendas 4 y 4.1).
// 1) Trae el clima. 2) Pide a proponer_plan_borrador, con el JWT de quien llama, las opciones que
// le sirven a todo el grupo (el servidor las filtra y ordena con reglas fijas, leyendo las
// preferencias de cada uno). 3) Si hay clave, Claude hace de coordinador del grupo: elige UNA de esas
// opciones mirando el perfil del grupo entero y redacta por qué y un mensaje para invitar. Con
// AI_GATEWAY_API_KEY va por el Vercel AI Gateway; sin ella y con ANTHROPIC_API_KEY, por la API directa.
// El modelo nunca recibe datos de una persona: solo opciones ya validadas, el clima y totales del grupo.
// Modelo: Fable 5.1 (prueba; antes Opus) y, si falla o no llega a tiempo, Haiku. Sin clave, con error de los dos, con una elección fuera
// de la lista o pasados ~30 s: primera opción y texto fijo.
// El modo anterior nunca crea, invita ni confirma. La ruta social aditiva prepara
// un borrador inmutable; aprobar/publicar siguen siendo acciones humanas separadas.
import { createClient } from 'npm:@supabase/supabase-js@2'
import Anthropic from 'npm:@anthropic-ai/sdk@1.2.0'
import {
  armarPedido,
  candidataSegura,
  candidatasDe,
  climaPedido,
  climaSimulado,
  crearLimiteModelo,
  datosGeneracion,
  elegirProveedor,
  ESPERAS_GENERACION_MS,
  GATEWAY_URL,
  familiaModelo,
  entradaModelo,
  esSabado,
  leerPronostico,
  mensajeFijo,
  modoSalida,
  perfilParaRespuesta,
  quorumSeguro,
  resumenClima,
  sumarDia,
  textoDeRespuesta,
  tipoDeIdGeneracion,
  unirFrases,
  usuarioDe,
  validarSalidaModelo,
  viajeDe,
  type Candidata,
  type Clima,
  type PerfilGrupo,
  type Proveedor,
  type Quorum,
  type ResultadoPlan,
} from './logica.ts'

// El principal tarda más que Haiku: hasta 20 s para el principal y lo que quede (unos 8 s) para el respaldo.
const PLAZO_TOTAL_MS = 30000
const PLAZO_PRINCIPAL_MS = 20000
const PLAZO_RESPALDO_MS = 8000
const PLAZO_CLIMA_MS = 3000
// Una llamada al modelo por persona cada 10 s y un tope por minuto, en la memoria de esta instancia (mejor esfuerzo).
const limiteModelo = crearLimiteModelo()
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
  'Si una opción trae viaje_max_minutos, puedes decir que queda a menos de esos minutos para todos y que es un estimado;',
  'nunca digas dónde vive nadie, cómo se mueve ni si alguien necesita que lo lleven.',
  'Si llega aviso_quorum, puedes decir con tacto que esa actividad necesita un grupo más grande y que estas opciones se pueden',
  'armar con el grupo actual; habla del tamaño del grupo, nunca de quién falta ni de cuántos van o se sumaron.',
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

/**
 * Después de responder al usuario, pregunta al Gateway si la generación salió por la clave propia (BYOK). Al registro
 * van solo el tipo de id, `is_byok`, el proveedor y el modelo. Si algo falla, solo queda un aviso: no afecta la respuesta.
 */
function registrarGeneracion(proveedor: Proveedor, clave: string, id: unknown): void {
  if (proveedor.tipo !== 'gateway') return
  const tipo = tipoDeIdGeneracion(id)
  if (tipo === null) return
  console.info('agente: id de la respuesta del Gateway', tipo)
  const runtime = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime
  if (tipo !== 'gen' || typeof runtime?.waitUntil !== 'function') return
  runtime.waitUntil(
    (async () => {
      // Los datos de uso llegan con demora: un intento después de cada espera.
      for (const [intento, espera] of ESPERAS_GENERACION_MS.entries()) {
        await new Promise((r) => setTimeout(r, espera))
        try {
          const r = await fetch(`${GATEWAY_URL}/v1/generation?id=${encodeURIComponent(String(id))}`, {
            headers: { Authorization: `Bearer ${clave}` },
            signal: AbortSignal.timeout(5000),
          })
          if (r.status === 404 && intento < ESPERAS_GENERACION_MS.length - 1) continue
          if (!r.ok) {
            console.info('agente: no se pudo leer la generación del Gateway', r.status)
            return
          }
          console.info('agente: generación del Gateway', JSON.stringify(datosGeneracion(await r.json())))
          return
        } catch (e) {
          console.info('agente: no se pudo leer la generación del Gateway', e instanceof Error ? e.constructor.name : 'desconocido')
          return
        }
      }
    })(),
  )
}

async function coordinarConModelo(
  candidatas: Candidata[],
  perfil: PerfilGrupo | null,
  clima: string,
  nombres: string[],
  hastaMs: number,
  simulado: boolean,
  usuario: string,
  quorum: Quorum | null = null,
): Promise<{ eleccion: Candidata; explicacion: string; mensaje: string; modelo: string } | null> {
  const proveedor = elegirProveedor((n) => Deno.env.get(n))
  const restante = () => hastaMs - Date.now()
  if (!proveedor || restante() < 1500 || candidatas.length === 0 || candidatas.some((c) => typeof c.id !== 'string')) return null
  const clave = Deno.env.get(proveedor.variableClave)
  if (!clave) return null
  // Costo: pasado el límite, el agente responde igual, con la regla y el texto fijo (no es un error).
  // Cuenta una vez por pedido de la persona, aunque se use el respaldo.
  if (!limiteModelo.permitir(usuario, Date.now())) {
    console.info('agente: límite de llamadas al modelo; va la regla', proveedor.tipo)
    return null
  }
  const modo = modoSalida(Deno.env.get('AGENTE_SALIDA'))
  const entrada = entradaModelo(candidatas, perfil, clima, nombres, simulado, quorum)
  // Principal (Fable u Opus) y, si falla o no llega a tiempo, una sola llamada al respaldo (Haiku). Después, la regla.
  const intentos = [
    { modelo: proveedor.modelo, plazo: PLAZO_PRINCIPAL_MS },
    { modelo: proveedor.respaldo, plazo: PLAZO_RESPALDO_MS },
  ]
  for (const [i, intento] of intentos.entries()) {
    // El respaldo necesita tiempo para responder; al principal le deja el suyo.
    const quedan = restante() - (i === 0 ? Math.min(PLAZO_RESPALDO_MS, 6000) : 0)
    const plazo = Math.min(intento.plazo, i === 0 ? Math.max(quedan, 0) : restante())
    if (plazo < 1500) continue
    const familia = familiaModelo(intento.modelo)
    const client = new Anthropic({ apiKey: clave, baseURL: proveedor.baseURL, timeout: plazo, maxRetries: 0 })
    try {
      // El `timeout` del SDK cubre hasta las cabeceras; el `signal` corta también la lectura del cuerpo.
      const respuesta = await client.messages.create(
        armarPedido(proveedor, modo, candidatas, SISTEMA, entrada, intento.modelo),
        { signal: AbortSignal.timeout(plazo) },
      )
      const texto = textoDeRespuesta(respuesta, modo)
      if (texto === null) {
        // Solo el motivo de corte y cuántos tokens escribió: sirve para ver si el tope corta respuestas.
        console.error('agente: respuesta del modelo descartada', proveedor.tipo, familia, respuesta.stop_reason, respuesta.usage?.output_tokens ?? null)
        continue
      }
      // La elección tiene que ser una de las opciones que el servidor ya validó, y los textos, válidos.
      const valida = validarSalidaModelo(texto, candidatas, nombres)
      if (valida) {
        registrarGeneracion(proveedor, clave, (respuesta as { id?: unknown }).id)
        return { ...valida, modelo: familia }
      }
      console.error('agente: salida del modelo rechazada por la validación', proveedor.tipo, familia)
    } catch (e) {
      // Solo el proveedor, el modelo, el tipo de error y el código HTTP: nunca el contenido, la clave ni datos del grupo.
      const estado = e instanceof Error && typeof (e as { status?: unknown }).status === 'number' ? (e as { status: number }).status : 0
      // constructor.name: las clases de error del SDK no fijan `name` (queda "Error").
      console.error('agente: el modelo no respondió', proveedor.tipo, familia, e instanceof Error ? e.constructor.name : 'desconocido', estado)
    }
  }
  return null
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

  let entrada: { espacio_id?: unknown; sabado?: unknown; clima_simulado?: unknown; social?: unknown }
  try {
    entrada = await req.json()
  } catch {
    return errorEntrada('formato_invalido', 'Un dato tiene un formato inválido.')
  }
  if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada)) {
    return errorEntrada('formato_invalido', 'Un dato tiene un formato inválido.')
  }
  const espacioId = typeof entrada.espacio_id === 'string' ? entrada.espacio_id : ''
  const sabado = typeof entrada.sabado === 'string' ? entrada.sabado : ''
  const social = entrada.social !== undefined
  if (!espacioId) return errorEntrada('campo_faltante', 'Falta completar un dato obligatorio.')
  if (!social && !esSabado(sabado)) return errorEntrada('fecha_invalida', 'La fecha debe ser un sábado futuro dentro de los próximos 16 días.')

  const url = Deno.env.get('SUPABASE_URL')
  const clavePublica = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
  if (!url || !clavePublica) return errorTemporal()
  // Cliente con el JWT de quien llama: la base decide rol y pertenencia, sin clave de servicio.
  const supabase = createClient(url, clavePublica, {
    global: { headers: { Authorization: autorizacion } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const atenderSocial = social ? (await import('./social-http.ts')).atenderSocial : null
  if (atenderSocial && entrada.social && typeof entrada.social === 'object'
    && 'accion' in entrada.social && entrada.social.accion === 'capacidad') {
    return responder(await atenderSocial(entrada, { cliente: supabase, modelo: async () => null, signal: req.signal }))
  }

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

  if (atenderSocial) {
    const { crearModeloSocial } = await import('./modelo-social.ts')
    const modelo = crearModeloSocial({
      proveedor: elegirProveedor((n) => Deno.env.get(n)),
      modo: Deno.env.get('AGENTE_SALIDA'), nombres, hastaMs: inicio + PLAZO_TOTAL_MS,
      signal: req.signal,
      permitir: () => limiteModelo.permitir(usuarioDe(autorizacion), Date.now()),
      invocar: async (proveedor, pedido, signal, plazo) => {
        const clave = Deno.env.get(proveedor.variableClave)
        if (!clave) throw new Error('modelo_no_disponible')
        const client = new Anthropic({ apiKey: clave, baseURL: proveedor.baseURL, timeout: plazo, maxRetries: 0 })
        return client.messages.create(pedido, { signal })
      },
    })
    return responder(await atenderSocial(entrada, { cliente: supabase, modelo, signal: req.signal }))
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
  // Enmienda 10: de cada viaje solo pasan los minutos y si es estimado (cualquier otra clave se descarta).
  // Enmienda 14: familia y personas solo con la forma del contrato; el quórum, solo sus cuatro claves.
  const candidatas = candidatasDe(base).map(candidataSegura)
  const quorum = quorumSeguro(base.quorum)
  const perfil = base.perfil_grupo ?? null
  const resumen = resumenClima(clima)

  const simulado = clima.fuente === 'simulacion'
  const delModelo = await coordinarConModelo(
    candidatas,
    perfil,
    resumen,
    nombres,
    inicio + PLAZO_TOTAL_MS,
    simulado,
    usuarioDe(autorizacion),
    quorum,
  )
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
      // Enmienda 10: el viaje máximo estimado de la opción destacada (null con menos de 4 personas con zona).
      viaje: viajeDe(elegida, candidatas, base.viaje),
      // Enmienda 14: familia y personas de la destacada (si el servidor las manda) y el quórum (null si no aplica).
      ...(elegida.familia !== undefined ? { familia: elegida.familia } : {}),
      ...(elegida.personas !== undefined ? { personas: elegida.personas } : {}),
      quorum,
      explicacion:
        delModelo?.explicacion ??
        unirFrases(elegida.frases_grupo, simulado, { perfil: perfilParaRespuesta(perfil), actividad: elegida.actividad_etiqueta }),
      mensaje_al_grupo: delModelo?.mensaje ?? mensajeFijo(elegida),
      eleccion_fuente: delModelo ? 'modelo' : 'regla',
      // Qué modelo escribió: "opus", "haiku" (respaldo) u otro; null con la regla y el texto fijo.
      modelo_usado: delModelo?.modelo ?? null,
      explicacion_fuente: delModelo ? 'modelo' : 'texto_fijo',
    },
  })
})
