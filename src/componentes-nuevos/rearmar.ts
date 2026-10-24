// "Rearmar con lo nuevo" (enmienda 13 (b), ux-flujo). Lógica pura, sin React.
// Con la versión publicada, quien no puede marca "Así no puedo, pero sigo" (enmienda 13 (a)) y actualiza su
// disponibilidad. Si la versión no llega al mínimo, el organizador la rearma con `propose_repair`: la versión N+1
// usa la disponibilidad actual y nace sin aceptaciones ni opiniones. Tope: 3 versiones.
// El servidor decide si se puede (`mi_situacion.puede.proponer_reparacion`, que en `esperando_compromisos` solo se
// prende con 2 o más "así no puedo" y versión menor que 3; backend 21:05); esta función solo arma los textos.
// Privacidad: el organizador ve el total de "así no puedo" solo si son 2 o más (`opiniones_totales`), nunca quiénes.
// Con 0 o 1 no se muestra nada aunque el servidor lo permita: con 1, mostrar algo delataría a esa persona
// (psico §8.10). Esa persona igual puede retirarse (sin nombre, 13 (c)) y el plan sigue por "Buscar alternativa".
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
  clave: 'rearmar' | 'sin_alternativa' | 'tope_versiones' | 'ya_no_hace_falta'
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

  const n = p.opiniones_totales?.asi_no_puedo ?? null
  const hayVarios = n !== null && n >= 2

  // Con la versión 3 el servidor ya no prende `proponer_reparacion`: el aviso sale igual si hay 2 o más que no pueden.
  if (error?.detalle === 'tope_versiones' || (version !== null && version >= TOPE_VERSIONES && hayVarios)) {
    return {
      clave: 'tope_versiones',
      titulo: 'Ya van tres versiones',
      texto: 'Pueden quedarse con esta o probar otro día con un plan nuevo.',
      boton: null,
      nota: null,
    }
  }
  if (error?.detalle === 'estado_no_admite') {
    return {
      clave: 'ya_no_hace_falta',
      titulo: 'Ya no hace falta rearmar',
      texto: 'Cambiaron las respuestas desde que abriste esta pantalla. La versión vigente sigue.',
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
  if (!yo.puede.proponer_reparacion || !hayVarios) return null

  const siguiente = version !== null ? `La versión ${version + 1}` : 'La versión nueva'
  return {
    clave: 'rearmar',
    titulo: 'Algunos no pueden así',
    texto: `${n} personas marcaron que así no pueden. Puedes rearmar con lo nuevo: ${siguiente.toLowerCase()} usa la disponibilidad actualizada y empieza sin confirmaciones; quien ya confirmó vuelve a confirmar si le sirve.`,
    boton: 'Rearmar con lo nuevo',
    nota:
      version !== null
        ? version + 1 >= TOPE_VERSIONES
          ? `Será la última versión posible (${TOPE_VERSIONES}).`
          : `Se puede rearmar hasta la versión ${TOPE_VERSIONES}.`
        : null,
  }
}
