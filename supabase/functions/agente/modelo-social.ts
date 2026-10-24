// Reutiliza proveedor, formato y límites del agente existente. El SDK se inyecta
// desde index.ts: este archivo no lee claves ni puede aprobar/publicar/aceptar.
import { armarPedido, modoSalida, textoDeRespuesta, textoValido, type Proveedor } from './logica.ts'
import type { OpcionModelo, PuertoModelo } from './social/contratos.ts'

type Pedido = ReturnType<typeof armarPedido>
export interface DependenciasModeloSocial {
  proveedor: Proveedor | null
  modo?: string
  permitir: () => boolean
  invocar: (proveedor: Proveedor, pedido: Pedido, signal: AbortSignal, limiteMs: number) => Promise<unknown>
  nombres: readonly string[]
  hastaMs: number
  ahora?: () => number
}
const objeto = (x: unknown): x is Record<string, unknown> => x !== null && typeof x === 'object' && !Array.isArray(x)
const SISTEMA_SOCIAL = [
  'Elige UNA opcion de las recibidas para sugerir un encuentro entre amigos.',
  'No tienes condiciones, disponibilidad, nombres ni identidades; no los infieras.',
  'No confirmes asistencia, no reserves, no apruebes ni publiques nada.',
  'eleccion_id debe ser una referencia recibida. explicacion es breve, sobre la actividad.',
  'mensaje_al_grupo: español cercano, una línea, entre 15 y 280 caracteres; propone una idea e invita a responder.',
  'No inventes lugares, personas, precios ni datos. La disponibilidad y la confirmación se resuelven después.',
  'No nombres personas ni situaciones individuales. No digas confirmado, reservado, agendado ni que todos pueden.',
].join(' ')

function proyectar(opciones: readonly OpcionModelo[]) {
  return opciones.map((o) => ({
    opcion_ref: o.opcion_ref, actividad: o.actividad,
    franjas: o.franjas.map((f) => ({ inicio: f.inicio, fin: f.fin })),
    ...(o.viaje_max_minutos !== undefined ? { viaje_max_minutos: o.viaje_max_minutos } : {}),
    ...(o.familia !== undefined ? { familia: o.familia } : {}),
    ...(o.personas !== undefined ? { personas: { min: o.personas.min, max: o.personas.max } } : {}),
  }))
}

export function crearModeloSocial(d: DependenciasModeloSocial): PuertoModelo {
  return async (opciones, signal) => {
    const proveedor = d.proveedor
    const ahora = d.ahora ?? Date.now
    if (!proveedor || signal.aborted || opciones.length === 0 || d.hastaMs - ahora() < 1500 || !d.permitir()) return null
    const modo = modoSalida(d.modo)
    const entrada = { opciones: proyectar(opciones) }
    // armarPedido solo consume los ids para el esquema de elección. El mensaje
    // enviado al modelo contiene exclusivamente la proyección anterior.
    const referencias = opciones.map((o) => ({ id: o.opcion_ref })) as Parameters<typeof armarPedido>[2]
    for (const [i, modelo] of [proveedor.modelo, proveedor.respaldo].entries()) {
      if (signal.aborted) return null
      const restante = d.hastaMs - ahora()
      const plazo = Math.min(i === 0 ? 20000 : 8000, restante - (i === 0 ? 6000 : 0))
      if (plazo < 1500) continue
      const control = new AbortController()
      let reloj: ReturnType<typeof setTimeout> | undefined
      let cancelar: (() => void) | undefined
      try {
        const corte = new Promise<never>((_, rechazar) => {
          cancelar = () => { control.abort(); rechazar(new Error('modelo_no_disponible')) }
          signal.addEventListener('abort', cancelar, { once: true })
          reloj = setTimeout(cancelar, plazo)
        })
        const respuesta = await Promise.race([
          d.invocar(proveedor, armarPedido(proveedor, modo, referencias, SISTEMA_SOCIAL, entrada, modelo), control.signal, plazo), corte,
        ])
        if (!objeto(respuesta) || !Array.isArray(respuesta.content)) continue
        const texto = textoDeRespuesta(respuesta as unknown as Parameters<typeof textoDeRespuesta>[0], modo)
        const salida: unknown = texto === null ? null : JSON.parse(texto)
        if (objeto(salida) && opciones.some((o) => o.opcion_ref === salida.eleccion_id)
          && textoValido(salida.mensaje_al_grupo, 280, [...d.nombres])
          && !/[\u0000-\u001f\u007f-\u009f]/u.test(salida.mensaje_al_grupo)) {
          return { opcion_ref: salida.eleccion_id, texto: salida.mensaje_al_grupo.trim() }
        }
      } catch {
        // No contenido, causas, URL, nombres ni mensajes del proveedor en logs.
      } finally {
        if (reloj !== undefined) clearTimeout(reloj)
        if (cancelar) signal.removeEventListener('abort', cancelar)
      }
    }
    return null
  }
}
