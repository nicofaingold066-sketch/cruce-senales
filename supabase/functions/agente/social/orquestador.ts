// E11: orquestación pura del agente existente. Solo los puertos inyectados hacen I/O.
// Sin aceptación humana, aprobación, modificación de opt-ins, política ni reparación automática.
import { mensajeFijo, textoValido } from '../logica.ts'
import type {
  ActividadSocial, AprobacionSocial, BorradorReciboSocial, BorradorSocial, ClimaSocial,
  EjecucionSocial, EntradaSocial, ErrorSocial, FranjasSocial, InicioSocial, MotivoCierreSocial,
  FamiliaSocial, OpcionModelo, OpcionSocial, PersonasSocial, PlanSocial, PuertoBackendSocial, PuertoModelo, QuorumSocial, ResultadoSocial,
} from './contratos.ts'

const ETIQUETAS: Record<ActividadSocial, string> = {
  asado: 'Asado', padel: 'Pádel', futbol: 'Fútbol', parque: 'Paseo por el parque', fiesta: 'Fiesta',
  cena: 'Cena', cafe: 'Café y brunch', bar: 'Bar', juegos_salida: 'Bowling y escape room',
  cultura: 'Plan cultural', cine: 'Cine', cerro: 'Paseo por el cerro', juegos_casa: 'Juegos en casa',
  tenis: 'Tenis', basquet: 'Básquet', peli_casa: 'Película en casa',
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const CONTROLES = /[\u0000-\u001f\u007f-\u009f]/u
const FAMILIAS = ['deporte', 'comida', 'salida_noche', 'cultura', 'aire_libre', 'en_casa']
const objeto = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x)
const cadena = (x: unknown, max = 256): x is string => typeof x === 'string' && x.length > 0 && x.length <= max && !CONTROLES.test(x)
const cantidad = (x: unknown): x is number => Number.isSafeInteger(x) && (x as number) >= 0
const fecha = (x: unknown): x is string => cadena(x, 40) && /^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(x) && Number.isFinite(Date.parse(x))
const textoPersistible = (x: unknown): x is string => cadena(x, 280) && x.trim().length > 0
const climaValido = (x: unknown): x is ClimaSocial => objeto(x)
  && typeof x.sabado === 'string' && ['seco', 'lluvia', 'desconocido'].includes(x.sabado)
  && typeof x.domingo === 'string' && ['seco', 'lluvia', 'desconocido'].includes(x.domingo)
const error = (detalle: string, incierto = false, ejecucion?: EjecucionSocial): ResultadoSocial => ({
  estado: 'error', error: { codigo: 'fallo_temporal', detalle }, resultado_incierto: incierto,
  ...(ejecucion ? { ejecucion } : {}),
})

// Solo códigos de contrato, nunca mensajes/payloads del servidor o del proveedor.
const ERRORES = new Set([
  'sesion_invalida/sin_sesion', 'fuera_de_audiencia/no_miembro', 'no_autorizado/no_es_organizador_espacio',
  'entrada_incompleta/campo_faltante', 'entrada_incompleta/formato_invalido', 'entrada_incompleta/fecha_invalida',
  'entrada_incompleta/pocas_preferencias', 'entrada_incompleta/intento_reutilizado',
  'entrada_incompleta/politica_invalida', 'entrada_incompleta/oportunidad_invalida',
  'no_autorizado/sin_aprobacion', 'opcion_desactualizada/borrador_cambiado', 'opcion_desactualizada/opcion_vencida',
  'opcion_desactualizada/oportunidad_en_uso', 'opcion_desactualizada/ejecucion_cerrada',
  'opcion_desactualizada/ejecucion_publicada', 'sin_alternativa/sin_destinatarios', 'fallo_temporal/reintentar',
])
function rechazado(e: ErrorSocial, ejecucion?: EjecucionSocial): ResultadoSocial {
  if (!objeto(e) || !ERRORES.has(`${e.codigo}/${e.detalle}`)) return error('contrato_invalido', false, ejecucion)
  return { estado: e.detalle === 'sin_aprobacion' ? 'necesita_aprobacion' : 'error',
    error: { codigo: e.codigo, detalle: e.detalle }, ...(ejecucion ? { ejecucion } : {}) }
}
function respuestaValida(r: unknown): boolean {
  return objeto(r) && (r.ok === true ? r.contrato === 2 : r.ok === false && objeto(r.error))
}

function entradaValida(e: EntradaSocial): boolean {
  if (!objeto(e) || !cadena(e.sabado, 10)) return false
  const d = new Date(`${e.sabado}T12:00:00Z`)
  return UUID.test(e.espacioId) && UUID.test(e.ejecucionId)
    && /^\d{4}-\d\d-\d\d$/.test(e.sabado) && Number.isFinite(d.getTime())
    && d.toISOString().slice(0, 10) === e.sabado && d.getUTCDay() === 6
    && climaValido(e.clima) && e.oportunidad === `sabado:${e.sabado}`
    && (!e.accion || e.accion.tipo === 'preparar'
      || (e.accion.tipo === 'publicar' && cadena(e.accion.borradorHash)))
}

function franjasDe(x: unknown): FranjasSocial | null {
  if (!Array.isArray(x) || x.length !== 2 || !x.every((f) => objeto(f)
    && fecha(f.inicio) && fecha(f.fin) && Date.parse(f.fin) > Date.parse(f.inicio))) return null
  return [{ inicio: x[0].inicio, fin: x[0].fin }, { inicio: x[1].inicio, fin: x[1].fin }]
}
function planDe(x: unknown): PlanSocial | null {
  if (!objeto(x) || !cadena(x.titulo, 80) || !objeto(x.lugar) || !cadena(x.lugar.nombre, 512)
    || typeof x.lugar.simulado !== 'boolean' || !cantidad(x.minimo) || !cantidad(x.maximo)
    || x.minimo < 2 || x.minimo > x.maximo || x.maximo > 20 || !fecha(x.plazo)
    || !objeto(x.imprescindible) || !cadena(x.imprescindible.nombre, 80) || !cantidad(x.invitados)) return null
  const franjas = franjasDe(x.franjas)
  if (!franjas || (x.actividad !== undefined && (typeof x.actividad !== 'string' || !Object.hasOwn(ETIQUETAS, x.actividad)))) return null
  // No recalcular cupos/plazo; conservar exactamente los del servidor, incluido mínimo por quórum.
  return { titulo: x.titulo, lugar: { nombre: x.lugar.nombre, simulado: x.lugar.simulado }, franjas,
    minimo: x.minimo, maximo: x.maximo, plazo: x.plazo,
    imprescindible: { nombre: x.imprescindible.nombre }, invitados: x.invitados,
    ...(x.actividad !== undefined ? { actividad: x.actividad as ActividadSocial } : {}) }
}
function borradorDe(x: unknown): BorradorSocial | null {
  if (!objeto(x) || !cadena(x.hash) || !cadena(x.opcion_ref)) return null
  const plan = planDe(x.plan)
  return plan ? { hash: x.hash, opcion_ref: x.opcion_ref, plan } : null
}
function ejecucionDe(x: unknown): EjecucionSocial | null {
  if (!objeto(x) || !cadena(x.id) || !UUID.test(x.id) || !cadena(x.oportunidad)
    || !['en_curso', 'borrador', 'publicada', 'fallida'].includes(String(x.estado))
    || !(x.propuesta_id === null || (cadena(x.propuesta_id) && UUID.test(x.propuesta_id)))
    || !(x.motivo === null || cadena(x.motivo, 80))) return null
  let borrador: BorradorReciboSocial | null = null
  if (x.borrador !== null) {
    const b = borradorDe(x.borrador)
    if (!b || !objeto(x.borrador) || !textoPersistible(x.borrador.texto)) return null
    borrador = { ...b, texto: x.borrador.texto }
  }
  let aprobacion: AprobacionSocial | null = null
  if (x.aprobacion !== null) {
    const a = x.aprobacion
    if (!objeto(a) || !cadena(a.hash) || !objeto(a.aprobado_en)
      || !fecha(a.aprobado_en.utc) || !fecha(a.aprobado_en.local)) return null
    aprobacion = { hash: a.hash, aprobado_en: { utc: a.aprobado_en.utc, local: a.aprobado_en.local } }
  }
  if ((x.estado === 'borrador' && !borrador) || (x.estado === 'publicada' && !x.propuesta_id)) return null
  return { id: x.id, estado: x.estado as EjecucionSocial['estado'], oportunidad: x.oportunidad,
    propuesta_id: x.propuesta_id, borrador, aprobacion, motivo: x.motivo }
}
function personasDe(x: unknown): PersonasSocial | null {
  return objeto(x) && cantidad(x.min) && cantidad(x.max) && x.min >= 2 && x.min <= x.max && x.max <= 20
    ? { min: x.min, max: x.max } : null
}
function quorumDe(x: unknown): QuorumSocial | null | undefined {
  if (x === undefined || x === null) return x
  if (!objeto(x) || typeof x.actividad !== 'string' || !Object.hasOwn(ETIQUETAS, x.actividad)
    || !cadena(x.etiqueta, 80) || !cantidad(x.personas_min) || x.personas_min < 2 || x.personas_min > 20
    || !cantidad(x.personas_posibles)) return undefined
  return { actividad: x.actividad as ActividadSocial, etiqueta: x.etiqueta,
    personas_min: x.personas_min, personas_posibles: x.personas_posibles }
}
function opcionDe(x: unknown): OpcionSocial | null {
  if (!objeto(x) || !cadena(x.opcion_ref) || typeof x.actividad !== 'string' || !Object.hasOwn(ETIQUETAS, x.actividad)
    || !cadena(x.actividad_etiqueta, 80) || !cadena(x.titulo, 80)) return null
  const franjas = franjasDe(x.franjas)
  const personas = x.personas !== undefined ? personasDe(x.personas) : null
  if (!franjas || (x.personas !== undefined && !personas)
    || (x.familia !== undefined && (typeof x.familia !== 'string' || !FAMILIAS.includes(x.familia)))) return null
  // Viaje inválido se omite, como el saneamiento de la lógica existente. Nunca zonas/modos individuales.
  const viaje = objeto(x.viaje) && cantidad(x.viaje.max_minutos) && typeof x.viaje.estimado === 'boolean'
    ? { max_minutos: x.viaje.max_minutos, estimado: x.viaje.estimado } : null
  return { opcion_ref: x.opcion_ref, actividad: x.actividad as ActividadSocial,
    actividad_etiqueta: x.actividad_etiqueta, titulo: x.titulo, franjas, viaje,
    ...(x.familia !== undefined ? { familia: x.familia as FamiliaSocial } : {}), ...(personas ? { personas } : {}) }
}
function recibo(e: EjecucionSocial, propia: boolean, repetido = true): ResultadoSocial {
  if (e.estado === 'publicada' && e.propuesta_id) return {
    estado: 'publicada', ejecucion: e, propuesta: { id: e.propuesta_id }, propia, repetido,
  }
  if (e.estado === 'borrador' && e.borrador) return {
    estado: 'borrador', ejecucion: e, borrador: e.borrador, propia, repetido,
  }
  return { ...error(e.estado === 'fallida' ? 'ejecucion_fallida' : 'ejecucion_en_curso', e.estado !== 'fallida', e), propia, repetido }
}
async function huella(e: EntradaSocial): Promise<string> {
  const canonico = ['social-e11-v1', e.espacioId, e.sabado, { sabado: e.clima.sabado, domingo: e.clima.domingo }]
  const bytes = new TextEncoder().encode(JSON.stringify(canonico))
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map((b) => b.toString(16).padStart(2, '0')).join('')
}
async function elegirConLimite(modelo: PuertoModelo, opciones: readonly OpcionModelo[], ms = 8000): Promise<unknown> {
  const controlador = new AbortController()
  let reloj: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      Promise.resolve().then(() => modelo(opciones, controlador.signal)),
      new Promise<null>((resolve) => {
        // El handler puede pasar el presupuesto de su proveedor existente, hasta 30 s.
        reloj = setTimeout(() => { controlador.abort(); resolve(null) }, Number.isFinite(ms) ? Math.min(30000, Math.max(1, ms)) : 8000)
      }),
    ])
  } catch { return null }
  finally { if (reloj) clearTimeout(reloj) }
}

export async function orquestarAgenteSocial(
  entrada: EntradaSocial,
  puertos: {
    backend: PuertoBackendSocial; modelo: PuertoModelo; limiteModeloMs?: number
    // Control interno del handler, nunca política ni permiso del cliente HTTP.
    // false prepara sin publicar; la acción explícita publicar sigue validándose en DB.
    publicacionAutomatica?: boolean
  },
): Promise<ResultadoSocial> {
  if (!entradaValida(entrada)) return { estado: 'error', error: { codigo: 'entrada_incompleta', detalle: 'formato_invalido' } }
  const publicarAlPreparar = puertos.publicacionAutomatica !== false
  // Snapshot de parámetros: ni caller ni modelo cambian la huella durante los awaits.
  const e: EntradaSocial = { espacioId: entrada.espacioId, ejecucionId: entrada.ejecucionId,
    sabado: entrada.sabado, oportunidad: entrada.oportunidad,
    clima: { sabado: entrada.clima.sabado, domingo: entrada.clima.domingo },
    ...(entrada.accion ? { accion: { ...entrada.accion } } : {}) }
  const b = puertos.backend
  let contexto
  try { contexto = await b.agente_social_contexto({ p_espacio_id: e.espacioId }) }
  catch { return error('contexto_no_disponible') }
  if (!respuestaValida(contexto)) return error('contrato_invalido')
  if (!contexto.ok) return rechazado(contexto.error)
  if (!['aprobacion', 'autonoma'].includes(contexto.politica?.modo) || !cantidad(contexto.destinatarios)) return error('contrato_invalido')
  const modoAlIniciar = contexto.politica.modo
  const destinatariosAlIniciar = contexto.destinatarios
  const inicio: InicioSocial = { p_espacio_id: e.espacioId, p_ejecucion_id: e.ejecucionId,
    p_oportunidad: e.oportunidad, p_parametros_hash: await huella(e) }
  // Una única consulta idempotente resuelve una respuesta perdida; jamás repetir el efecto.
  const recuperar = async (): Promise<ResultadoSocial> => {
    try {
      const r = await b.iniciar_ejecucion_agente(inicio)
      if (!respuestaValida(r)) return error('recibo_no_disponible', true)
      if (!r.ok) {
        const canonica = ejecucionDe(r.ejecucion)
        return canonica ? { ...rechazado(r.error, canonica), propia: false, resultado_incierto: true } : error('recibo_no_disponible', true)
      }
      const recibida = ejecucionDe(r.ejecucion)
      return recibida && recibida.oportunidad === e.oportunidad && typeof r.propia === 'boolean'
        && (!r.propia || recibida.id === e.ejecucionId) ? recibo(recibida, r.propia) : error('recibo_no_disponible', true)
    } catch { return error('recibo_no_disponible', true) }
  }
  let r
  try { r = await b.iniciar_ejecucion_agente(inicio) }
  catch { return recuperar() }
  if (!respuestaValida(r)) return error('contrato_invalido', true)
  if (!r.ok) {
    const canonica = ejecucionDe(r.ejecucion)
    return { ...rechazado(r.error, canonica ?? undefined), ...(canonica ? { propia: false } : {}) }
  }
  const ejecucion = ejecucionDe(r.ejecucion)
  if (!ejecucion || ejecucion.oportunidad !== e.oportunidad || typeof r.propia !== 'boolean' || typeof r.repetido !== 'boolean'
    || (r.propia && ejecucion.id !== e.ejecucionId)) return error('contrato_invalido', true)
  // Barrera anterior a CUALQUIER modelo/candidatos (emite refs), guardar/publicar/cerrar.
  // Incluso un hash correcto o política autónoma no dan permiso al worker no propietario.
  if (!r.propia) return recibo(ejecucion, false, r.repetido)

  const publicar = async (actual: EjecucionSocial): Promise<ResultadoSocial> => {
    if (!actual.borrador) return error('borrador_no_disponible', false, actual)
    try {
      const p = await b.publicar_borrador_agente({ p_ejecucion_id: actual.id,
        p_borrador_hash: actual.borrador.hash,
        // E11: iniciar no usa cruce.intentos. Aprobar debe usar OTRO UUID desde la UI.
        p_intento_id: actual.id })
      if (!respuestaValida(p)) return error('contrato_invalido', true, actual)
      if (!p.ok) return { ...rechazado(p.error, actual), borrador: actual.borrador, propia: true }
      if (!p.propuesta || !UUID.test(p.propuesta.id) || !cantidad(p.invitados) || typeof p.repetido !== 'boolean') return error('contrato_invalido', true, actual)
      return { estado: 'publicada', ejecucion: { ...actual, estado: 'publicada', propuesta_id: p.propuesta.id },
        propuesta: { id: p.propuesta.id }, borrador: actual.borrador, propia: true, repetido: p.repetido }
    } catch { return recuperar() }
  }
  if (e.accion?.tipo === 'publicar' && ejecucion.estado === 'borrador' && ejecucion.borrador) {
    if (e.accion.borradorHash !== ejecucion.borrador.hash) return {
      estado: 'error', ejecucion, propia: true, error: { codigo: 'opcion_desactualizada', detalle: 'borrador_cambiado' },
    }
    return publicar(ejecucion) // La aprobación/política/opt-ins se revalidan en el servidor.
  }
  if (r.repetido || ejecucion.estado !== 'en_curso') return recibo(ejecucion, true, r.repetido)
  if (e.accion?.tipo === 'publicar') return error('borrador_no_disponible', false, ejecucion)

  const cerrar = async (motivo: MotivoCierreSocial): Promise<ResultadoSocial> => {
    try {
      const c = await b.cerrar_ejecucion_agente({ p_ejecucion_id: ejecucion.id, p_estado: 'fallida', p_motivo: motivo })
      if (!respuestaValida(c)) return error('contrato_invalido', true, ejecucion)
      if (!c.ok) return rechazado(c.error, ejecucion)
      const cerrada = ejecucionDe(c.ejecucion)
      if (!cerrada || cerrada.id !== ejecucion.id || cerrada.oportunidad !== e.oportunidad
        || cerrada.estado !== 'fallida' || cerrada.motivo !== motivo || typeof c.repetido !== 'boolean') {
        // No presentar un cierre ajeno/inconsistente como éxito. El recibo previo es
        // conocido y proyectado; no devolver el payload que contradice la operación.
        return error('contrato_invalido', true, ejecucion)
      }
      return motivo === 'sin_plan'
        ? { estado: 'sin_plan', ejecucion: cerrada, propia: true, repetido: c.repetido }
        : { ...error('reintentar', false, cerrada), propia: true, repetido: c.repetido }
    } catch { return recuperar() }
  }
  if (destinatariosAlIniciar === 0) {
    const cerrado = await cerrar('sin_plan')
    return cerrado.estado === 'sin_plan' ? { ...cerrado, error: { codigo: 'sin_alternativa', detalle: 'sin_destinatarios' } } : cerrado
  }
  let candidatas
  try { candidatas = await b.agente_social_candidatos({ p_espacio_id: e.espacioId, p_sabado: e.sabado, p_clima: { ...e.clima } }) }
  catch { return error('candidatos_no_disponibles', false, ejecucion) }
  if (!respuestaValida(candidatas)) return error('contrato_invalido', false, ejecucion)
  if (!candidatas.ok) return rechazado(candidatas.error, ejecucion)
  if (typeof candidatas.sin_plan_compatible !== 'boolean' || !Array.isArray(candidatas.opciones) || candidatas.opciones.length > 20) return cerrar('candidatos_rechazados')
  if (candidatas.sin_plan_compatible || candidatas.opciones.length === 0) {
    const cerrado = await cerrar('sin_plan')
    return { ...cerrado, ...(candidatas.motivo === 'faltan_personas' || candidatas.motivo === 'sin_lugar_cerca_para_todos'
      ? { motivo: candidatas.motivo } : {}) }
  }
  const quorum = quorumDe(candidatas.quorum)
  if (candidatas.quorum !== undefined && quorum === undefined) return cerrar('candidatos_rechazados')
  const metadatos = quorum !== undefined ? { quorum } : {}
  const opciones = candidatas.opciones.map(opcionDe)
  if (opciones.some((o) => !o) || new Set(opciones.map((o) => o?.opcion_ref)).size !== opciones.length) return cerrar('candidatos_rechazados')
  const validas = opciones as OpcionSocial[]
  const paraModelo: readonly OpcionModelo[] = Object.freeze(validas.map((o) => Object.freeze({
    opcion_ref: o.opcion_ref, actividad: o.actividad,
    franjas: Object.freeze(o.franjas.map((f) => Object.freeze({ inicio: f.inicio, fin: f.fin }))) as FranjasSocial,
    ...(o.viaje ? { viaje_max_minutos: o.viaje.max_minutos } : {}),
    ...(o.familia ? { familia: o.familia } : {}), ...(o.personas ? { personas: Object.freeze({ ...o.personas }) } : {}),
  })))
  const salida = await elegirConLimite(puertos.modelo, paraModelo, puertos.limiteModeloMs)
  let elegida = validas[0]
  let texto = mensajeFijo({ id: elegida.opcion_ref, titulo: ETIQUETAS[elegida.actividad],
    actividad_etiqueta: ETIQUETAS[elegida.actividad], franjas: [...elegida.franjas], frases_grupo: [],
    lugar: { id: '', nombre: '', simulado: true } })
  if (objeto(salida) && textoPersistible(salida.texto) && textoValido(salida.texto, 280, [])) {
    const encontrada = validas.find((o) => o.opcion_ref === salida.opcion_ref)
    if (encontrada) { elegida = encontrada; texto = salida.texto.trim() }
  }
  if (!textoPersistible(texto) || !textoValido(texto, 280, [])) return cerrar('modelo_fallo')
  let guardado
  try { guardado = await b.guardar_borrador_agente({ p_ejecucion_id: ejecucion.id, p_opcion_ref: elegida.opcion_ref, p_texto: texto }) }
  catch { return recuperar() }
  if (!respuestaValida(guardado)) return error('contrato_invalido', true, ejecucion)
  if (!guardado.ok) return rechazado(guardado.error, ejecucion)
  const borrador = borradorDe(guardado.borrador)
  if (!borrador || borrador.opcion_ref !== elegida.opcion_ref) return error('contrato_invalido', true, ejecucion)
  const preparada: EjecucionSocial = { ...ejecucion, estado: 'borrador', borrador: { ...borrador, texto } }
  if (modoAlIniciar !== 'autonoma' || !publicarAlPreparar) return {
    estado: modoAlIniciar === 'autonoma' ? 'borrador' : 'necesita_aprobacion',
    ejecucion: preparada, borrador: preparada.borrador!, propia: true, ...metadatos,
  }
  return { ...await publicar(preparada), ...metadatos }
}
