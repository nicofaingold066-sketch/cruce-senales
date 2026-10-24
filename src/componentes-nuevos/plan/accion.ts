// Qué le toca a quien mira el plan (S4, rediseño). Solo lee lo que el servidor ya decidió: `puede.*`, el estado,
// `siguiente_accion.codigo` y los totales que manda. Nunca calcula cupos, plazos ni elegibilidad.
// Regla del sistema de diseño: UNA acción primaria por pantalla; si no me toca nada, no hay botón, hay una frase.
import type { EstadoPropuesta, ReglaMotor } from '../../lib/types'

export type AccionPlan =
  | { clave: 'abrir'; texto: 'Abrir propuesta' }
  | { clave: 'responder'; texto: 'Responder en un toque' }
  | { clave: 'buscar_opcion'; texto: 'Buscar opción compatible' | 'Volver a buscar opción'; secundaria: boolean }
  | { clave: 'confirmar'; texto: string; version: number }
  | { clave: 'rearmar'; texto: 'Rearmar con lo nuevo' }
  | { clave: 'buscar_alternativa'; texto: 'Buscar alternativa' | 'Volver a buscar alternativa' }
  | { clave: 'calendario'; texto: 'Calendario' }

export type DatosAccion = Pick<EstadoPropuesta, 'estado' | 'mi_situacion' | 'siguiente_accion' | 'ultima_evaluacion' | 'opcion'> &
  Pick<EstadoPropuesta, 'opiniones_totales'>

export function accionPrimaria(p: DatosAccion): AccionPlan | null {
  const s = p.mi_situacion
  if (s.retirado) return null
  if (s.puede.aceptar && p.opcion) return { clave: 'confirmar', texto: `Confirmar versión ${p.opcion.version}`, version: p.opcion.version }
  switch (p.estado) {
    case 'borrador':
      return s.puede.abrir ? { clave: 'abrir', texto: 'Abrir propuesta' } : null
    case 'reuniendo_interes': {
      if (s.puede.guardar_condiciones && s.condiciones !== 'completas') return { clave: 'responder', texto: 'Responder en un toque' }
      if (!s.puede.evaluar) return null
      const sinOpcion = p.ultima_evaluacion?.resultado === 'sin_opcion'
      // El énfasis sigue al servidor: primario solo cuando su próxima acción es buscar, o para volver a buscar tras
      // "Sin opción". Un toque temprano deja "Sin opción compatible" a la vista de todo el grupo (D-3 de la revisión UX).
      const secundaria = p.siguiente_accion.codigo !== 'buscar_opcion' && !sinOpcion
      return { clave: 'buscar_opcion', texto: sinOpcion ? 'Volver a buscar opción' : 'Buscar opción compatible', secundaria }
    }
    case 'esperando_compromisos':
      // Enmienda 13 (b): rearmar solo con 2 o más "así no puedo" (con 1 delataría quién); el total llega solo a quien organiza.
      if (s.puede.proponer_reparacion && (p.opiniones_totales?.asi_no_puedo ?? 0) >= 2) return { clave: 'rearmar', texto: 'Rearmar con lo nuevo' }
      return null
    case 'en_revision': {
      if (!s.puede.proponer_reparacion) return null
      const sinAlternativa = p.ultima_evaluacion?.resultado === 'sin_alternativa'
      return { clave: 'buscar_alternativa', texto: sinAlternativa ? 'Volver a buscar alternativa' : 'Buscar alternativa' }
    }
    case 'grupo_confirmado':
      return s.acepte_version && p.opcion ? { clave: 'calendario', texto: 'Calendario' } : null
    default:
      return null
  }
}

/** Por qué no puedo confirmar la versión que veo (una línea). Solo si hay opción y no puedo. */
export function porQueNoConfirmo(p: Pick<EstadoPropuesta, 'mi_situacion' | 'opcion' | 'plazo_vencido' | 'estado'>): string | null {
  const s = p.mi_situacion
  const o = p.opcion
  if (!o || s.puede.aceptar) return null
  if (p.estado !== 'esperando_compromisos' && p.estado !== 'grupo_confirmado') return null
  if (s.retirado) return 'Te retiraste de esta propuesta y ya no participas en ella.'
  if (s.acepte_version) return `Ya confirmaste la versión ${o.version}.`
  if (s.elegible_en_version === false) {
    // Un grupo confirmado no vence, pero `plazo_vencido` sí: con el plazo cerrado no se promete un rearme que ya no puede pasar.
    return p.plazo_vencido ? 'Esta versión se armó sin ti y el plazo de aceptación ya cerró.' : 'No formas parte de las personas que pueden aceptar esta versión.'
  }
  if (p.plazo_vencido) return 'El plazo de aceptación ya cerró.'
  if (s.motivo_aceptar === 'cupo_reservado') return 'El último cupo está reservado para quien no puede faltar. Si se libera otro, podrás confirmar.'
  if (o.cupos.disponibles <= 0) return 'Ya se completaron los cupos de esta versión.'
  return 'Ahora no puedes confirmar esta versión.'
}

/** Mejora #56: con más confirmaciones que el mínimo, "5 de 4" se lee raro; se dice "5 (mínimo 4)". */
export function cuentaConfirmados(confirmados: number, minimo: number): string {
  return confirmados > minimo ? `${confirmados} (mínimo ${minimo})` : `${confirmados} de ${minimo}`
}

/** Enmienda 15: cómo elige el motor entre las franjas viables, en palabras (pedido de sinteticos 02:25). */
export function textoRegla(regla: ReglaMotor | undefined): string {
  return regla === 'mas_si' ? 'la opción que pueden más personas' : 'la opción más temprana que alcanza el mínimo'
}

/** Etapa actual de la tira Respuestas · Opción · Confirmar · Encuentro (solo una lectura del estado del servidor). */
export const ETAPAS = ['Respuestas', 'Opción', 'Confirmar', 'Encuentro'] as const
export function etapaDe(estado: EstadoPropuesta['estado']): number | null {
  const i: Record<string, number> = { borrador: 0, reuniendo_interes: 0, en_revision: 1, esperando_compromisos: 2, grupo_confirmado: 3 }
  return i[estado] ?? null
}
