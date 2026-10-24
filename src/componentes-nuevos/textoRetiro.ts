// Texto junto a "Retirarme de esta propuesta" (ux-flujo, docs/output-debate.md §3.1 y psico §8.10). Lógica pura.
// Retirarse es definitivo; la mayoría de las veces lo que la persona quiere decir es "esta fecha no". Esta ayuda
// le ofrece la salida que corresponde a cada momento, sin decir nada de nadie más.
import type { EstadoPropuesta } from '../lib/types'

type MiSituacionE13 = EstadoPropuesta['mi_situacion'] & { mi_opinion?: 'asi_no_puedo' | null }

export type DatosAyudaRetiro = Pick<EstadoPropuesta, 'estado'> & { mi_situacion: MiSituacionE13 }

/**
 * `mi_opinion` llega con la enmienda 13: si la respuesta trae la clave (aunque sea null), "Así no puedo, pero sigo"
 * existe y la baja ya no lleva nombre. Sin la clave, se usan los textos de antes de la enmienda.
 */
export function conEnmienda13(yo: MiSituacionE13): boolean {
  return Object.prototype.hasOwnProperty.call(yo, 'mi_opinion')
}

export function textoAyudaRetiro({ estado, mi_situacion: yo }: DatosAyudaRetiro): string | null {
  if (yo.retirado || !yo.puede.retirarme) return null
  const definitivo = 'Retirarte es para no participar más en este plan.'
  if (estado === 'reuniendo_interes') {
    return `Si solo una de las fechas no te sirve, márcala como "No puedo". ${definitivo}`
  }
  if ((estado === 'esperando_compromisos' || estado === 'grupo_confirmado') && yo.acepte_version) {
    return conEnmienda13(yo)
      ? 'Si ya no puedes ir, retirarte avisa al grupo sin decir quién. No hace falta contar por qué.'
      : 'Si ya no puedes ir, retirarte avisa al grupo. No hace falta contar por qué.'
  }
  if (estado === 'esperando_compromisos' && yo.elegible_en_version === true) {
    return conEnmienda13(yo)
      ? `Si solo esta fecha no te sirve, usa "Así no puedo, pero sigo". ${definitivo}`
      : `Si solo esta fecha no te sirve, no confirmes. ${definitivo}`
  }
  return null
}
