// "Rearmar con lo nuevo" (enmienda 13 (b), ux-flujo). Lógica pura, sin React.
// Con la versión publicada, quien no puede marca "Así no puedo, pero sigo" (enmienda 13 (a)) y actualiza su
// disponibilidad. Si la versión no llega al mínimo, el organizador la rearma con `propose_repair`: la versión N+1
// usa la disponibilidad actual y nace sin aceptaciones ni opiniones. Tope: 3 versiones.
// El servidor decide si se puede (`mi_situacion.puede.proponer_reparacion`); esta función solo arma los textos.
// Privacidad: el organizador ve el total de "así no puedo" solo si son 2 o más (`opiniones_totales`), nunca quiénes.
import type { EstadoPropuesta } from '../lib/types'

/** Campos de la enmienda 13 que todavía no están en `types.ts` (opcionales: sin la enmienda, no cambia nada). */
export interface CamposE13 {
  /** Solo para el organizador; `asi_no_puedo` es null con menos de 2. */
  opiniones_totales?: { asi_no_puedo: number | null } | null
}

export type DatosRearmar = Pick<EstadoPropuesta, 'estado' | 'mi_situacion'> &
  Partial<Pick<EstadoPropuesta, 'opcion'>> &
  CamposE13

export interface ErrorRearmar {
  codigo: string
  detalle: string
}

export interface VistaRearmar {
  clave: 'rearmar' | 'sin_alternativa' | 'tope_versiones'
  titulo: string
  texto: string
  /** Rótulo del botón, o null si no hay nada que tocar. */
  boton: string | null
  nota: string | null
}

/** Tope de versiones por propuesta (enmienda 13 (b)). El servidor lo hace cumplir; acá solo evita un botón inútil. */
export const TOPE_VERSIONES = 3

export function vistaRearmar(p: DatosRearmar, error?: ErrorRearmar | null): VistaRearmar | null {
  const yo = p.mi_situacion
  if (!yo.es_organizador || p.estado !== 'esperando_compromisos') return null
  const version = p.opcion?.version ?? null

  if (error?.detalle === 'tope_versiones' || (version !== null && version >= TOPE_VERSIONES && yo.puede.proponer_reparacion)) {
    return {
      clave: 'tope_versiones',
      titulo: `Ya van ${TOPE_VERSIONES} versiones`,
      texto: 'No se puede rearmar otra vez. Si esta versión no se confirma, puedes cancelar el plan y armar uno nuevo.',
      boton: null,
      nota: null,
    }
  }
  if (error?.codigo === 'sin_alternativa') {
    return {
      clave: 'sin_alternativa',
      titulo: 'No hay otra fecha posible',
      texto:
        'Con la disponibilidad nueva no hay una fecha que sirva. No se baja el mínimo ni se inventa un plan. Puedes esperar a que confirmen o cancelar.',
      boton: yo.puede.proponer_reparacion ? 'Volver a intentar' : null,
      nota: null,
    }
  }
  if (!yo.puede.proponer_reparacion) return null

  const n = p.opiniones_totales?.asi_no_puedo ?? null
  const quienes = n !== null && n >= 2 ? `${n} personas no pueden con esta versión. ` : ''
  const siguiente = version !== null ? `La versión ${version + 1}` : 'La versión nueva'
  return {
    clave: 'rearmar',
    titulo: 'Rearmar con lo nuevo',
    texto: `${quienes}${siguiente} usa la disponibilidad actualizada y empieza sin confirmaciones: quien ya confirmó tiene que volver a confirmar.`,
    boton: 'Rearmar con lo nuevo',
    nota:
      version !== null
        ? version + 1 >= TOPE_VERSIONES
          ? `Será la última versión posible (${TOPE_VERSIONES}).`
          : `Se puede rearmar hasta la versión ${TOPE_VERSIONES}.`
        : null,
  }
}
