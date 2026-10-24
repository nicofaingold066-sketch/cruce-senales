// Las filas de la hoja del plan (S4, pantalla 5 del mockup): lo secundario, una fila por cosa y debajo del resultado.
// "Tu respuesta · Cambiar", "Así no puedo, pero sigo" (friccion), "Avisar al grupo", el mapa, los cambios del grupo sin
// nombre (E13 c), la ficha plegada con quién confirmó, y al final, chicos, "No voy" y cancelar (quien organiza).
import { useState } from 'react'
import type { ReactNode } from 'react'
import { api } from '../../lib/api'
import { enlaceInvitacion } from '../../lib/compartir'
import { franjaTexto } from '../../lib/format'
import { useMutacion } from '../../lib/hooks'
import type { PropuestaViva } from '../../lib/hooks'
import { rutas } from '../../lib/shell'
import type { Espacio, EstadoPropuesta } from '../../lib/types'
import { Boton, ErrorCaja } from '../../components/ui'
import { Confirmacion, useVolverFoco } from '../../components/Confirmacion'
import { Icono } from '../../components/Icono'
import { AsiNoPuedo } from '../../friccion/AsiNoPuedo'
import type { Pestana } from '../../screens/tabs'
import { mostrarBuscarLugar, urlLugar } from '../lugarMapa'
import { rotuloAviso, textoAviso, urlAviso } from '../recordar'
import type { MotivoAviso } from '../recordar'

const TEXTO_CONDICIONES: Record<EstadoPropuesta['mi_situacion']['condiciones'], string> = {
  completas: 'respondiste',
  incompletas: 'te falta algún día',
  sin_cargar: 'sin responder',
}

/** A quién y con qué mensaje se avisa al grupo (el mensaje no nombra a nadie ni dice cuántos faltan). */
function motivoAviso(p: EstadoPropuesta, codigo: string | null): MotivoAviso | null {
  const o = p.opcion
  if (!codigo) return null
  if (p.estado === 'grupo_confirmado') return p.mi_situacion.acepte_version && o ? 'confirmado' : null
  if (!p.mi_situacion.es_organizador) return null
  if (p.estado === 'reuniendo_interes') return 'faltan'
  // Con el último cupo reservado a quien no puede faltar, "si vas, confírmala" invitaría a algo que el servidor rechaza.
  if (p.estado === 'esperando_compromisos' && o && o.cupos.libres_para_otros > 0) return p.opcion_anterior ? 'reparacion' : 'version_nueva'
  return null
}

export function FilasPlan({
  p,
  viva,
  soloLectura,
  espacio,
  irAPestana,
  children,
}: {
  p: EstadoPropuesta
  viva: PropuestaViva
  soloLectura: boolean
  espacio: Espacio | null
  irAPestana: (t: Pestana) => void
  /** La ficha plegada: va después de las filas y antes de lo chico del final. */
  children?: ReactNode
}) {
  const s = p.mi_situacion
  const o = p.opcion
  const codigo = espacio?.codigo_invitacion ?? null
  const abierta = p.estado !== 'cancelado' && p.estado !== 'expirado'
  const vigente = (p.estado === 'esperando_compromisos' || p.estado === 'grupo_confirmado') && o
  const motivo = motivoAviso(p, codigo)
  const [copiado, setCopiado] = useState(false)
  const datosAviso =
    motivo && codigo
      ? { motivo, titulo: p.titulo, cuando: o ? franjaTexto(o.franja.inicio, o.franja.fin) : null, cuposLibres: o?.cupos.disponibles ?? null, enlace: enlaceInvitacion(codigo) }
      : null
  const mapa = vigente && mostrarBuscarLugar(espacio?.demo ?? true, p.titulo)

  return (
    <div className="filas-plan">
      <ul className="filas">
        {abierta && !s.retirado && (s.puede.guardar_condiciones || s.condiciones !== 'sin_cargar') ? (
          <li>
            <a className="fila" href={rutas.responder(p.espacio_id, p.id)}>
              <Icono n="calendario" tam={18} />
              <span className="fila-texto">
                Tu respuesta: {TEXTO_CONDICIONES[s.condiciones]} <span className="fila-nota">· privada</span>
              </span>
              <span className="fila-accion">
                {s.puede.guardar_condiciones ? 'Cambiar' : 'Ver'} <Icono n="chevron" tam={14} />
              </span>
            </a>
          </li>
        ) : null}
        {datosAviso ? (
          <li>
            <a className="fila" href={urlAviso(datosAviso)} target="_blank" rel="noopener noreferrer">
              <Icono n="whatsapp" tam={18} />
              <span className="fila-texto">
                {rotuloAviso(datosAviso.motivo)} <span className="fila-nota">· WhatsApp, sin nombrar a nadie</span>
              </span>
              <Icono n="chevron" tam={14} />
            </a>
            <button
              type="button"
              className="enlace fila-copiar"
              onClick={() => void navigator.clipboard.writeText(textoAviso(datosAviso)).then(() => setCopiado(true), () => setCopiado(false))}
            >
              {copiado ? 'Mensaje copiado.' : 'Copiar mensaje'}
            </button>
          </li>
        ) : null}
        {mapa ? (
          <li>
            <a className="fila" href={urlLugar(p.titulo)} target="_blank" rel="noopener noreferrer">
              <Icono n="enlace" tam={18} />
              <span className="fila-texto">
                Buscar el lugar en el mapa <span className="fila-nota">· CRUXE no sabe desde dónde sales</span>
              </span>
              <Icono n="chevron" tam={14} />
            </a>
          </li>
        ) : null}
        {p.bajas.length > 0 ? (
          <li className="fila fila-quieta">
            <Icono n="personas" tam={18} />
            <span className="fila-texto">
              {/* Enmienda 13 (c), psico §16: sin nombre y sin "había confirmado". */}
              Cambios en el grupo: {p.bajas.map((b) => `Una persona se retiró${b.version != null ? ` (versión ${b.version})` : ''}.`).join(' ')}
            </span>
          </li>
        ) : null}
      </ul>

      {/* Enmienda 13 (a): "Así no puedo, pero sigo" junto a confirmar; marcado, ofrece actualizar o volver a «puedo». */}
      {vigente ? <AsiNoPuedo p={p} viva={viva} soloLectura={soloLectura} irAPestana={irAPestana} /> : null}

      {children}

      {abierta && !s.retirado && s.puede.retirarme ? (
        <button type="button" className="enlace fila-chica" onClick={() => irAPestana('respuesta')}>
          No voy a ir: retirarme en «Mi respuesta»
        </button>
      ) : null}
      {s.puede.cancelar ? <Cancelar p={p} viva={viva} soloLectura={soloLectura} /> : null}
    </div>
  )
}

function Cancelar({ p, viva, soloLectura }: { p: EstadoPropuesta; viva: PropuestaViva; soloLectura: boolean }) {
  const [confirmar, setConfirmar] = useState(false)
  const { ocupado, error, correr } = useMutacion(viva)
  // #67 (A2): la pregunta toma el foco y "Volver" lo devuelve al botón que la abrió.
  const { zona, volver } = useVolverFoco<HTMLElement>()
  async function hacer() {
    const r = await correr(`cancelar:${p.id}`, () => api.cancelProposal(p.id))
    if (r?.ok) setConfirmar(false)
  }
  return (
    <section ref={zona} className={`zona-peligro zona-peligro-chica ${confirmar ? '' : 'zona-peligro-fila'}`} aria-labelledby="cancelar-titulo">
      <div className="zona-peligro-texto">
        <h3 id="cancelar-titulo">¿Ya no va?</h3>
        <p className="suave">Pasa a Cancelado y no se puede reabrir.</p>
      </div>
      {!confirmar ? (
        <Boton variante="secundario" onClick={() => setConfirmar(true)} disabled={soloLectura} data-abre-confirmacion>
          Cancelar propuesta
        </Boton>
      ) : (
        <Confirmacion titulo="¿Cancelar la propuesta?">
          La propuesta pasa a Cancelado y no se puede reabrir.
          <div className="fila-botones">
            <Boton variante="peligro" onClick={() => void hacer()} ocupado={ocupado} ocupadoTexto="Cancelando…">
              Sí, cancelar
            </Boton>
            <Boton variante="secundario" onClick={() => volver(() => setConfirmar(false))} disabled={ocupado}>
              Volver
            </Boton>
          </div>
        </Confirmacion>
      )}
      {error ? <ErrorCaja error={error} enfocar /> : null}
    </section>
  )
}
