// Lo que dibuja el cruce del resultado (S4). Movido desde `screens/Propuesta.tsx` para que la galería sin base lo use igual.
import type { NodoCruce, TonoCruce } from '../../components/Cruce'
import type { Espacio, EstadoPropuesta } from '../../lib/types'

/**
 * Lo que dibuja el cruce. Personas del espacio con lo que el servidor dice de cada una en esta propuesta:
 * se bajó (bajas), confirmó la versión vigente (opcion.aceptaron), marcó interés (interesados) o nada visible.
 * Los números del centro son los del servidor; el anillo solo es confirmados / mínimo.
 */
export function escenaDe(
  p: EstadoPropuesta,
  espacio: Espacio | null,
): { nodos: NodoCruce[]; valor: string; etiqueta: string; fraccion: number; tono: TonoCruce } {
  const vigente = p.estado === 'esperando_compromisos' || p.estado === 'grupo_confirmado'
  const bajas = new Set(p.bajas.map((b) => b.miembro.miembro_id))
  const aceptaron = new Set(vigente ? (p.opcion?.aceptaron ?? []).map((a) => a.miembro.miembro_id) : [])
  const interes = new Set(p.interesados.miembros.map((m) => m.miembro_id))
  if (!vigente) for (const a of p.opcion?.aceptaron ?? []) interes.add(a.miembro.miembro_id)
  const nodos: NodoCruce[] = (espacio?.miembros ?? []).map((m) => ({
    id: m.miembro_id,
    nombre: m.nombre,
    simulado: m.simulado,
    yo: m.es_yo,
    estado: bajas.has(m.miembro_id)
      ? 'baja'
      : aceptaron.has(m.miembro_id)
        ? 'confirmo'
        : interes.has(m.miembro_id)
          ? 'interesado'
          : 'pendiente',
  }))
  const c = p.opcion?.cupos
  const confirmados = c?.confirmados ?? 0
  const minimo = c?.minimo ?? p.minimo
  // Mejora #56 también en el cruce: con más confirmaciones que el mínimo, "5/4" se lee raro; va "5" y "mín. 4".
  const sobre = confirmados > minimo
  const cuenta = sobre ? String(confirmados) : `${confirmados}/${minimo}`
  switch (p.estado) {
    case 'esperando_compromisos':
      return { nodos, valor: cuenta, etiqueta: sobre ? `mín. ${minimo}` : 'confirmaron', fraccion: c ? c.confirmados / c.minimo : 0, tono: 'vivo' }
    case 'grupo_confirmado':
      return { nodos, valor: cuenta, etiqueta: 'se juntan', fraccion: 1, tono: 'ok' }
    case 'en_revision':
      return { nodos, valor: `v${p.opcion?.version ?? ''}`, etiqueta: 'en revisión', fraccion: c ? c.confirmados / c.minimo : 0, tono: 'revision' }
    case 'reuniendo_interes': {
      // El motor arma la opción con las respuestas (condiciones completas), no con "Me interesa": el centro no
      // cuenta interés. El organizador ve cuántos respondieron (E7.2: el servidor solo se lo da a él); los demás,
      // si ya respondieron ellos mismos.
      if (p.ultima_evaluacion?.resultado === 'sin_opcion') return { nodos, valor: '—', etiqueta: 'sin opción', fraccion: 0, tono: 'neutro' }
      const n = p.personas_con_condiciones
      const s = p.mi_situacion
      if (n != null) return { nodos, valor: String(n), etiqueta: n === 1 ? 'respondió' : 'respondieron', fraccion: 0, tono: 'info' }
      if (s.retirado) return { nodos, valor: '—', etiqueta: 'te retiraste', fraccion: 0, tono: 'neutro' }
      return s.condiciones === 'completas'
        ? { nodos, valor: '✓', etiqueta: 'respondiste', fraccion: 0, tono: 'info' }
        : { nodos, valor: '—', etiqueta: s.condiciones === 'incompletas' ? 'respuesta incompleta' : 'falta tu respuesta', fraccion: 0, tono: 'info' }
    }
    case 'borrador':
      return { nodos, valor: '—', etiqueta: 'borrador', fraccion: 0, tono: 'neutro' }
    default:
      return { nodos, valor: '—', etiqueta: p.estado_etiqueta.toLocaleLowerCase('es'), fraccion: 0, tono: 'neutro' }
  }
}
