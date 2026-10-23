import type { PropuestaResumen } from '../lib/types'
import { CODIGOS_SIGUIENTE } from '../lib/types'
import { rutas } from '../lib/shell'
import { momentoCorto } from '../lib/format'
import { InsigniaEstado, Progreso } from './ui'
import { Icono } from './Icono'

/** "Te toca" según el código del servidor; los booleanos solo si llega un código desconocido. */
export function esTurno(p: PropuestaResumen): boolean {
  const cod = p.siguiente_accion.codigo
  const conocido = (CODIGOS_SIGUIENTE as readonly string[]).includes(cod)
  return cod === 'te_toca_aceptar' || (!conocido && Boolean(p.mi_situacion?.puede_aceptar))
}

/**
 * Tarjeta de un plan en vivo (lista del espacio, portada y "Mis planes"). El estado destacado y "Tu turno"
 * salen del servidor: estado de la propuesta y siguiente_accion.codigo (enmienda 3); el booleano solo de respaldo.
 */
export function PlanVivo({ p, espacioId, espacioNombre }: { p: PropuestaResumen; espacioId: string; espacioNombre?: string }) {
  const turno = esTurno(p)
  const conVersion = p.version != null
  // Mejora #56: con más confirmaciones que el mínimo, "5 de 4 confirmaron" se lee raro.
  const cuenta =
    p.confirmados > p.minimo ? `${p.confirmados} confirmaron (mínimo ${p.minimo})` : `${p.confirmados} de ${p.minimo} confirmaron`
  return (
    <a className={`plan-vivo plan-vivo-${p.estado} ${turno ? 'plan-vivo-turno' : ''}`} href={rutas.propuesta(espacioId, p.id)}>
      {espacioNombre ? <span className="pv-espacio">{espacioNombre}</span> : null}
      <span className="pv-arriba">
        <InsigniaEstado estado={p.estado} etiqueta={p.estado_etiqueta} />
        {conVersion ? <span className="etiqueta num">Versión {p.version}</span> : null}
      </span>
      {/* Mismo nombre de transición que el título de la pantalla del plan: el título "viaja" al abrirlo. */}
      <span className="pv-titulo" style={{ viewTransitionName: `plan-${p.id}` }}>
        {p.titulo}
      </span>
      {turno || p.mi_situacion?.retirado ? (
        <span className="pv-estado">
          {turno ? <span className="pastilla pastilla-turno">Tu turno</span> : null}
          {p.mi_situacion?.retirado ? <span className="etiqueta">Te retiraste</span> : null}
        </span>
      ) : null}
      <span className={`pv-siguiente ${turno ? 'pv-siguiente-turno' : ''}`}>{p.siguiente_accion.texto}</span>
      {conVersion ? (
        <span className="pv-progreso" style={{ display: 'block' }}>
          <Progreso
            valor={p.confirmados}
            minimo={p.minimo}
            maximo={p.maximo}
            ok={p.estado === 'grupo_confirmado'}
            etiqueta={cuenta}
          />
        </span>
      ) : null}
      <span className="pv-meta">
        <span className="num">
          {conVersion ? `${cuenta} · máx. ${p.maximo}` : `Mínimo ${p.minimo}, máximo ${p.maximo}`} ·{' '}
          {p.plazo_vencido ? 'plazo cerrado' : `cierre ${momentoCorto(p.plazo)}`}
        </span>
        <span className="pv-abrir" aria-hidden="true">
          Abrir <Icono n="chevron" tam={14} />
        </span>
      </span>
    </a>
  )
}
