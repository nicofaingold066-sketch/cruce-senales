// Las filas debajo del bloque de resultado (S4), exactas por estado como en el mockup validado (03:05, obligatorio):
//  5 esperando:  Tu respuesta · Cambiar › · Así no puedo, pero sigo › · Avisar al grupo (WhatsApp) › · Ficha del plan ·
//                Quién confirmó ⌄ · Historial ⌄ · (chico) Retirarme de este plan
// 15 reuniendo:  Recordar a quien falta (WhatsApp) · Tu respuesta · Cambiar › · Ficha del plan ⌄ · (chico) Cancelar la propuesta
// 16 ¡se juntan!: Ver el lugar en el mapa · Avisar al grupo (WhatsApp) · Agregar a mi calendario · Ficha del plan · Historial ⌄
//                · (chico) Ya no puedo ir
// 17 en revisión: Tu respuesta · Cambiar › · Ficha del plan · Historial ⌄ · (chico) Cancelar la propuesta
// Lo privado nunca aparece: "Tu respuesta" es la propia (`get_my_conditions`), los avisos no nombran a nadie.
import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { descargarCalendario, enlaceInvitacion } from '../../lib/compartir'
import { diaDe, franjaTexto } from '../../lib/format'
import { useMutacion } from '../../lib/hooks'
import type { PropuestaViva } from '../../lib/hooks'
import { rutas } from '../../lib/shell'
import type { Disponibilidad, Espacio, EstadoPropuesta } from '../../lib/types'
import { Boton, ErrorCaja } from '../../components/ui'
import { Confirmacion, useVolverFoco } from '../../components/Confirmacion'
import { Icono } from '../../components/Icono'
import { AsiNoPuedo } from '../../friccion/AsiNoPuedo'
import HistorialTab from '../../screens/HistorialTab'
import type { Pestana } from '../../screens/tabs'
import { mostrarBuscarLugar, urlLugar } from '../lugarMapa'
import { urlAviso } from '../recordar'
import type { MotivoAviso } from '../recordar'
import { FichaPlan } from './FichaPlan'
import { textoTuRespuesta } from './accion'

/** A quién y con qué mensaje se avisa al grupo (el mensaje no nombra a nadie ni dice cuántos faltan). */
function motivoAviso(p: EstadoPropuesta, codigo: string | null): MotivoAviso | null {
  const o = p.opcion
  if (!codigo) return null
  if (p.estado === 'grupo_confirmado') return p.mi_situacion.acepte_version && o ? 'confirmado' : null
  if (p.estado === 'reuniendo_interes') return p.mi_situacion.es_organizador ? 'faltan' : null
  // Con el último cupo reservado a quien no puede faltar, "si vas, confírmala" invitaría a algo que el servidor rechaza.
  // Mockup (pantalla 5): la fila es para todos; el mensaje es el mismo y no nombra a nadie.
  if (p.estado === 'esperando_compromisos' && o && o.cupos.libres_para_otros > 0) return p.opcion_anterior ? 'reparacion' : 'version_nueva'
  return null
}

/** La respuesta propia, solo para mostrársela a la misma persona. Se vuelve a pedir cuando cambia el estado del plan. */
function useMiRespuesta(p: EstadoPropuesta): Disponibilidad | null {
  const [disp, setDisp] = useState<Disponibilidad | null>(null)
  const pedir = p.mi_situacion.condiciones !== 'sin_cargar' && !p.mi_situacion.retirado
  useEffect(() => {
    if (!pedir) return
    let vivo = true
    void api.getMyConditions(p.id).then((r) => {
      if (vivo && r.ok) setDisp(r.data.condiciones.disponibilidad)
    })
    return () => {
      vivo = false
    }
  }, [p.id, p.state_rev, pedir])
  return pedir ? disp : null
}

export function FilasPlan({
  p,
  viva,
  soloLectura,
  espacio,
  irAPestana,
  conSimulacion,
}: {
  p: EstadoPropuesta
  viva: PropuestaViva
  soloLectura: boolean
  espacio: Espacio | null
  irAPestana: (t: Pestana) => void
  /** Solo quien organiza una demo (E7.3): la fila que abre la Simulación (pantalla 18). */
  conSimulacion: boolean
}) {
  const s = p.mi_situacion
  const o = p.opcion
  const codigo = espacio?.codigo_invitacion ?? null
  const estado = p.estado
  const abierta = estado !== 'cancelado' && estado !== 'expirado'
  const motivo = motivoAviso(p, codigo)
  const disp = useMiRespuesta(p)
  const [nota, setNota] = useState<string | null>(null)
  const datosAviso =
    motivo && codigo
      ? { motivo, titulo: p.titulo, cuando: o ? franjaTexto(o.franja.inicio, o.franja.fin) : null, cuposLibres: o?.cupos.disponibles ?? null, enlace: enlaceInvitacion(codigo) }
      : null
  const rotuloAvisar = motivo === 'faltan' ? 'Recordar a quien falta (WhatsApp)' : 'Avisar al grupo (WhatsApp)'
  const tuRespuesta = textoTuRespuesta(
    disp,
    p.franjas.map((f) => ({ clave: f.clave, dia: diaDe(f.inicio.local).split(' ')[0].toLocaleLowerCase('es') })),
    s.condiciones,
  )
  const props = { p, viva, soloLectura, irAPestana, espacio }

  function agendar() {
    if (!o) return
    const quienes = o.aceptaron.map((a) => a.miembro.nombre).join(', ')
    const ok = descargarCalendario({
      id: `${p.id}-v${o.version}`,
      titulo: p.titulo,
      inicioUtc: o.franja.inicio.utc,
      finUtc: o.franja.fin.utc,
      descripcion: `Plan confirmado en CRUXE (versión ${o.version}). Van: ${quienes}.`,
    })
    setNota(ok ? 'Listo: se descargó el evento para tu calendario.' : 'No se pudo armar el evento en este navegador.')
  }

  const filaRespuesta =
    abierta && !s.retirado && (s.puede.guardar_condiciones || s.condiciones !== 'sin_cargar') ? (
      <li key="respuesta">
        <a className="fila" href={rutas.responder(p.espacio_id, p.id)}>
          <span className="fila-texto">Tu respuesta: {tuRespuesta}</span>
          <span className="fila-accion">
            Cambiar <Icono n="chevron" tam={14} />
          </span>
        </a>
      </li>
    ) : null
  const filaAvisar = datosAviso ? (
    <li key="avisar">
      <a className="fila" href={urlAviso(datosAviso)} target="_blank" rel="noopener noreferrer">
        <span className="fila-texto">{rotuloAvisar}</span>
        <Icono n="chevron" tam={14} />
      </a>
    </li>
  ) : null
  const [abrirAsi, setAbrirAsi] = useState(false)
  const marcoAsi = s.mi_opinion === 'asi_no_puedo'
  const filaAsi =
    estado === 'esperando_compromisos' && o && (marcoAsi || s.puede.opinar) ? (
      <li key="asi">
        {marcoAsi || abrirAsi ? (
          <div className="fila-abierta">
            <AsiNoPuedo p={p} viva={viva} soloLectura={soloLectura} irAPestana={irAPestana} />
          </div>
        ) : (
          <button type="button" className="fila fila-boton" onClick={() => setAbrirAsi(true)} aria-expanded={false}>
            <span className="fila-texto">Así no puedo, pero sigo</span>
            <Icono n="chevron" tam={14} />
          </button>
        )}
      </li>
    ) : null
  const filaSimulacion = conSimulacion ? (
    <li key="simulacion">
      <button type="button" className="fila fila-boton" onClick={() => irAPestana('simulacion')}>
        <span className="fila-texto">
          Simulación <span className="rotulo-sim">demo</span>
        </span>
        <Icono n="chevron" tam={14} />
      </button>
    </li>
  ) : null
  const historial = (
    <details className="tarjeta plegable historial-plegado">
      <summary>
        <h2>Historial</h2>
      </summary>
      <HistorialTab {...props} />
    </details>
  )

  if (estado === 'grupo_confirmado') {
    const mapa = mostrarBuscarLugar(espacio?.demo ?? true, p.titulo)
    return (
      <div className="filas-plan">
        <div className="filas-botones">
          {mapa ? (
            <a className="btn btn-secundario btn-grande" href={urlLugar(p.titulo)} target="_blank" rel="noopener noreferrer">
              Ver el lugar en el mapa
            </a>
          ) : null}
          {datosAviso ? (
            <a className="btn btn-secundario" href={urlAviso(datosAviso)} target="_blank" rel="noopener noreferrer">
              <Icono n="whatsapp" tam={18} /> Avisar al grupo (WhatsApp)
            </a>
          ) : null}
          {s.acepte_version && o ? (
            <button type="button" className="btn btn-secundario" onClick={agendar}>
              <Icono n="agendar" tam={18} /> Agregar a mi calendario
            </button>
          ) : null}
          {nota ? (
            <p role="status" className="suave">
              {nota}
            </p>
          ) : null}
        </div>
        {filaSimulacion ? <ul className="filas">{filaSimulacion}</ul> : null}
        <FichaPlan p={p} viva={viva} titulo="Ficha del plan · Historial">
          {historial}
        </FichaPlan>
        {s.acepte_version ? (
          <Retirarme
            p={p}
            viva={viva}
            soloLectura={soloLectura}
            rotulo={`Ya no puedo ir${o && o.cupos.confirmados - 1 < o.cupos.minimo ? ' · si te bajas, el plan pasa a revisión y los demás vuelven a confirmar' : ''}`}
          />
        ) : null}
      </div>
    )
  }

  const filas =
    estado === 'reuniendo_interes' || estado === 'borrador'
      ? [filaAvisar, filaRespuesta, filaSimulacion]
      : estado === 'esperando_compromisos'
        ? [filaRespuesta, filaAsi, filaAvisar, filaSimulacion]
        : [filaRespuesta, filaSimulacion]
  const hayFilas = filas.some(Boolean)

  return (
    <div className="filas-plan">
      {hayFilas ? <ul className="filas">{filas}</ul> : null}

      {estado === 'esperando_compromisos' ? (
        <>
          <FichaPlan p={p} viva={viva} titulo="Ficha del plan · Quién confirmó" />
          {historial}
        </>
      ) : estado === 'reuniendo_interes' || estado === 'borrador' ? (
        <FichaPlan p={p} viva={viva} titulo="Ficha del plan" />
      ) : (
        <FichaPlan p={p} viva={viva} titulo="Ficha del plan · Historial">
          {historial}
        </FichaPlan>
      )}

      {estado === 'esperando_compromisos' ? <Retirarme p={p} viva={viva} soloLectura={soloLectura} rotulo="Retirarme de este plan" /> : null}
      {s.puede.cancelar && estado !== 'esperando_compromisos' ? <Cancelar p={p} viva={viva} soloLectura={soloLectura} /> : null}
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
    <section ref={zona} className="cancelar-chico" aria-label="Cancelar la propuesta">
      {!confirmar ? (
        <button type="button" className="enlace fila-chica" onClick={() => setConfirmar(true)} disabled={soloLectura} data-abre-confirmacion>
          Cancelar la propuesta
        </button>
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

/** "Retirarme de este plan" / "Ya no puedo ir": acción directa, con la pregunta que toma el foco (#67, fee1163). */
function Retirarme({ p, viva, soloLectura, rotulo }: { p: EstadoPropuesta; viva: PropuestaViva; soloLectura: boolean; rotulo: string }) {
  const s = p.mi_situacion
  const [confirmar, setConfirmar] = useState(false)
  const { ocupado, error, correr } = useMutacion(viva)
  const { zona, volver } = useVolverFoco<HTMLElement>()
  if (s.retirado || !s.puede.retirarme) return null
  async function hacer() {
    const r = await correr(`baja:${p.id}`, () => api.withdrawCommitment(p.id))
    if (r?.ok) setConfirmar(false)
  }
  return (
    <section ref={zona} className="cancelar-chico" aria-label="Retirarme de este plan">
      {!confirmar ? (
        <button type="button" className="enlace fila-chica" onClick={() => setConfirmar(true)} disabled={soloLectura} data-abre-confirmacion>
          {rotulo}
        </button>
      ) : (
        <Confirmacion titulo="¿Retirarte definitivamente?">
          Perderás tu interés y tu confirmación, y la baja queda registrada sin tu nombre. Si el grupo queda por debajo del mínimo, el plan pasa a revisión.
          <div className="fila-botones">
            <Boton variante="peligro" onClick={() => void hacer()} ocupado={ocupado} ocupadoTexto="Registrando baja…">
              Sí, no voy
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
