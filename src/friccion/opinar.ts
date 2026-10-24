// Enmienda 13 (a): "Así no puedo, pero sigo". Opinar sobre la versión vigente sin bajarse: la persona sigue en el plan,
// no cuenta como baja y vuelve a poder actualizar su disponibilidad (`puede.guardar_condiciones`). Lo decide el servidor
// (`opinar_version`); acá solo está la lectura de lo que manda y el adaptador a la API.
import { api } from '../lib/api'
import type { PropuestaOk } from '../lib/api'
import type { ApiResult, EstadoPropuesta, MiSituacion } from '../lib/types'

export type Opinion = 'asi_no_puedo' | 'retirar_opinion'
export type MiOpinion = 'asi_no_puedo' | null
/** La respuesta de `opinar_version` trae la propuesta, como toda escritura (contrato 4). Las claves de `resultado` las fija backend. */
export type OpinarOk = PropuestaOk<Record<string, unknown>>
export type OpinarFn = (propuestaId: string, version: number, opinion: Opinion, intentoId: string) => Promise<ApiResult<OpinarOk>>

/** `mi_situacion.mi_opinion` (enmienda 13). Hasta que backend lo publique no viene: se lee como null. */
export function miOpinion(s: MiSituacion): MiOpinion {
  const v = (s as MiSituacion & { mi_opinion?: unknown }).mi_opinion
  return v === 'asi_no_puedo' ? 'asi_no_puedo' : null
}

/**
 * Cuándo se ofrece "Así no puedo, pero sigo": elegible en la versión vigente, sin haberla aceptado, sin retirarse,
 * mientras se esperan compromisos. El servidor decide igual (`opinar_version`); esto solo evita un botón que va a fallar.
 */
export function puedeOpinar(p: EstadoPropuesta): boolean {
  const s = p.mi_situacion
  return p.estado === 'esperando_compromisos' && p.opcion != null && s.elegible_en_version === true && !s.acepte_version && !s.retirado
}

/** Usa `api.opinarVersion` cuando backend la publique; hasta entonces responde un error claro sin llamar a nada. */
export const opinarReal: OpinarFn = (propuestaId, version, opinion, intentoId) => {
  const fn = (api as unknown as { opinarVersion?: OpinarFn }).opinarVersion
  if (typeof fn === 'function') return fn(propuestaId, version, opinion, intentoId)
  const r: ApiResult<OpinarOk> = {
    ok: false,
    error: {
      codigo: 'fallo_temporal',
      detalle: 'no_disponible',
      mensaje: 'Esta acción todavía no está disponible. Intenta más tarde.',
      reintentable: false,
      state_rev: null,
    },
  }
  return Promise.resolve(r)
}
