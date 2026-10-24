// E11: adaptador interno. Recibe el cliente ya autenticado del handler existente.
// No crea clientes, credenciales, endpoints ni herramientas de aceptación/aprobación.
import type { PuertoBackendSocial, Respuesta } from './social/contratos.ts'

interface ResultadoRpc { data: unknown; error: unknown }
interface PeticionRpc extends PromiseLike<ResultadoRpc> {
  abortSignal(signal: AbortSignal): PromiseLike<ResultadoRpc>
}
export interface ClienteRpcSocial {
  rpc(nombre: string, parametros: Record<string, unknown>): PeticionRpc
}
const objeto = (x: unknown): x is Record<string, unknown> =>
  x !== null && typeof x === 'object' && !Array.isArray(x)
const fallo = () => new Error('rpc_social_no_disponible')

/** Sin reintentos de escritura: el orquestador recupera el recibo canónico. */
export function crearPuertoBackendSocial(
  cliente: ClienteRpcSocial,
  opciones: { signal?: AbortSignal; limiteMs?: number } = {},
): PuertoBackendSocial {
  const limiteMs = opciones.limiteMs ?? 15000
  if (!Number.isSafeInteger(limiteMs) || limiteMs < 1 || limiteMs > 30000) throw fallo()

  async function llamar<T>(nombre: string, parametros: Record<string, unknown>): Promise<Respuesta<T>> {
    if (opciones.signal?.aborted) throw fallo()
    const control = new AbortController()
    let reloj: ReturnType<typeof setTimeout> | undefined
    let cancelar: (() => void) | undefined
    try {
      const limite = new Promise<never>((_, rechazar) => {
        cancelar = () => { control.abort(); rechazar(fallo()) }
        opciones.signal?.addEventListener('abort', cancelar, { once: true })
        reloj = setTimeout(cancelar, limiteMs)
      })
      const r = await Promise.race([cliente.rpc(nombre, parametros).abortSignal(control.signal), limite])
      if (!objeto(r) || r.error !== null || !objeto(r.data) || r.data.contrato !== 2
        || (r.data.ok !== true && r.data.ok !== false)
        || (r.data.ok === false && (!objeto(r.data.error)
          || typeof r.data.error.codigo !== 'string' || typeof r.data.error.detalle !== 'string'))) throw fallo()
      // Los payloads de dominio los valida/proyecta el orquestador; no se vuelcan a logs.
      return r.data as Respuesta<T>
    } catch {
      // Un error de transporte no prueba que una escritura haya sido rechazada.
      // Nunca propagar mensajes, URLs, headers ni causas del SDK/proveedor.
      throw fallo()
    } finally {
      if (reloj !== undefined) clearTimeout(reloj)
      if (cancelar) opciones.signal?.removeEventListener('abort', cancelar)
    }
  }

  return {
    agente_social_contexto: (p) => llamar('agente_social_contexto', { p_espacio_id: p.p_espacio_id }),
    agente_social_candidatos: (p) => llamar('agente_social_candidatos', {
      p_espacio_id: p.p_espacio_id, p_sabado: p.p_sabado,
      p_clima: { sabado: p.p_clima.sabado, domingo: p.p_clima.domingo },
    }),
    iniciar_ejecucion_agente: (p) => llamar('iniciar_ejecucion_agente', {
      p_espacio_id: p.p_espacio_id, p_ejecucion_id: p.p_ejecucion_id,
      p_oportunidad: p.p_oportunidad, p_parametros_hash: p.p_parametros_hash,
    }),
    guardar_borrador_agente: (p) => llamar('guardar_borrador_agente', {
      p_ejecucion_id: p.p_ejecucion_id, p_opcion_ref: p.p_opcion_ref, p_texto: p.p_texto,
    }),
    publicar_borrador_agente: (p) => llamar('publicar_borrador_agente', {
      p_ejecucion_id: p.p_ejecucion_id, p_borrador_hash: p.p_borrador_hash, p_intento_id: p.p_intento_id,
    }),
    cerrar_ejecucion_agente: (p) => llamar('cerrar_ejecucion_agente', {
      p_ejecucion_id: p.p_ejecucion_id, p_estado: 'fallida', p_motivo: p.p_motivo,
    }),
  }
}
