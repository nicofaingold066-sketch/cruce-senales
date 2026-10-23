// "Recordar a quien falta" / "Avisar al grupo" por WhatsApp (#89, ux-flujo). Lo conecta front-juan.
// Solo para quien organiza la propuesta (la pantalla decide si mostrarlo con `mi_situacion.es_organizador`).
// El mensaje no nombra a nadie ni dice cuántos faltan: es el mismo para todo el grupo.
import { useState } from 'react'
import { enlaceInvitacion } from '../lib/compartir'
import { Icono } from '../components/Icono'
import { rotuloAviso, textoAviso, urlAviso } from './recordar'
import type { MotivoAviso } from './recordar'

export function RecordarFaltan({
  codigo,
  titulo,
  motivo = 'faltan',
  cuando,
  cuposLibres,
}: {
  /** `espacio.codigo_invitacion`. */
  codigo: string
  /** Título de la propuesta. */
  titulo: string
  motivo?: MotivoAviso
  /** Franja vigente ya formateada, para 'version_nueva', 'reparacion' y 'confirmado'. */
  cuando?: string | null
  /** Solo 'confirmado': `p.opcion.cupos.disponibles`. */
  cuposLibres?: number | null
}) {
  const [copiado, setCopiado] = useState(false)
  const datos = { motivo, titulo, cuando, cuposLibres, enlace: enlaceInvitacion(codigo) }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(textoAviso(datos))
      setCopiado(true)
    } catch {
      setCopiado(false)
    }
  }

  return (
    <div className="recordar-faltan">
      <div className="fila-botones">
        <a className="btn btn-secundario" href={urlAviso(datos)} target="_blank" rel="noopener noreferrer">
          <Icono n="whatsapp" tam={18} /> {rotuloAviso(motivo)}
        </a>
        <button type="button" className="btn btn-secundario" onClick={() => void copiar()}>
          Copiar mensaje
        </button>
      </div>
      <p className="suave" role="status">
        {copiado
          ? 'Mensaje copiado.'
          : motivo === 'faltan'
            ? 'El mensaje va a todo el grupo: no nombra a nadie ni dice cuántos faltan.'
            : 'El mensaje va a todo el grupo y no nombra a nadie.'}
      </p>
    </div>
  )
}
