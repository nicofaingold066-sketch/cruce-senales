import { useId } from 'react'
import type { ReactNode } from 'react'
import { Avatar } from '../components/ui'
import { Icono } from '../components/Icono'
import type { NombreIcono } from '../components/Icono'
import type { Espacio, EstadoPropuesta } from '../lib/types'
import { integrantesPublicos, participacionDe } from './datos'
import type { PersonaPublica } from './datos'
import './participacion.css'

type EstadoPersona = 'confirmo' | 'sin_confirmar' | 'interes' | 'entro' | 'simulada' | 'por_entrar'
const ESTADOS: Record<EstadoPersona, { texto: string; icono: NombreIcono }> = {
  confirmo: { texto: 'Confirmó', icono: 'check' },
  sin_confirmar: { texto: 'Sin confirmar', icono: 'reloj' },
  interes: { texto: 'Le interesa', icono: 'chispa' },
  entro: { texto: 'Ya entró', icono: 'check' },
  simulada: { texto: 'Simulación', icono: 'persona' },
  por_entrar: { texto: 'Por entrar', icono: 'invitar' },
}

function ListaPersonas({ titulo, personas, estado, vacio }: {
  titulo: string; personas: PersonaPublica[]; estado: EstadoPersona; vacio?: string
}) {
  if (personas.length === 0 && !vacio) return null
  return (
    <section className={`participacion-categoria participacion-categoria-${estado}`} aria-label={titulo}>
      <h3 className="participacion-subtitulo">
        <span>{titulo}</span><span className="participacion-conteo" aria-label={`${personas.length} personas`}>{personas.length}</span>
      </h3>
      {personas.length === 0 ? <p className="participacion-vacio">{vacio}</p> : (
        <ul className="participacion-personas" aria-label={titulo}>
          {personas.map(m => {
            const fichaEstado = estado === 'entro' && m.simulado ? 'simulada' : estado
            const ficha = ESTADOS[fichaEstado]
            return (
              <li key={m.miembro_id} className={`participacion-persona participacion-persona-${fichaEstado}`}>
                <Avatar nombre={m.nombre} simulado={m.simulado} yo={m.es_yo} tam={32} />
                <span className="participacion-persona-texto">
                  <span className="participacion-nombre">{m.nombre}{m.es_yo ? <span className="participacion-tu"> (tú)</span> : null}</span>
                  {m.simulado && fichaEstado !== 'simulada' ? <span className="participacion-simulacion">Simulación</span> : null}
                  <span className="participacion-estado"><Icono n={ficha.icono} tam={14} />{ficha.texto}</span>
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function Panel({ titulo, etiqueta, children }: { titulo: string; etiqueta?: string; children: ReactNode }) {
  const id = useId()
  return (
    <section className="tarjeta participacion-publica" aria-labelledby={id}>
      <header className="participacion-cabecera">
        <h2 id={id}><Icono n="personas" tam={20} />{titulo}</h2>
        {etiqueta ? <span className="participacion-version">{etiqueta}</span> : null}
      </header>
      {children}
    </section>
  )
}

export function ParticipacionPlan({ p, espacio }: { p: EstadoPropuesta; espacio: Espacio | null }) {
  const datos = participacionDe(p, espacio)
  if (!datos) return null
  return (
    <Panel titulo="Participación del plan" etiqueta={datos.tipo === 'version' ? `Versión ${datos.version}` : undefined}>
      {datos.tipo === 'version' ? (
        <>
          {datos.enRevision ? <p className="participacion-revision">El plan está en revisión. Una alternativa necesita nuevas confirmaciones.</p> : null}
          <ListaPersonas titulo={`Confirmaron la versión ${datos.version}`} personas={datos.confirmados} estado="confirmo" vacio="Todavía no hay confirmaciones para esta versión." />
          {datos.sinConfirmar === null ? (
            <p className="participacion-vacio">La lista de integrantes se está actualizando.</p>
          ) : (
            <ListaPersonas titulo="Sin confirmar esta versión" personas={datos.sinConfirmar} estado="sin_confirmar" vacio="Todas las personas que ya están en el grupo confirmaron esta versión." />
          )}
          <p className="participacion-nota">Cada persona confirma por su cuenta. Estar en el grupo no confirma el encuentro.</p>
        </>
      ) : (
        <>
          <ListaPersonas titulo="Les interesa" personas={datos.interesados} estado="interes" vacio="Todavía no hay interés marcado." />
          <p className="participacion-nota">El interés todavía no confirma la asistencia.</p>
        </>
      )}
      <ListaPersonas titulo="Por entrar al grupo" personas={datos.porEntrar} estado="por_entrar" />
    </Panel>
  )
}

export function IntegrantesGrupo({ espacio }: { espacio: Espacio }) {
  const grupo = integrantesPublicos(espacio)
  const total = grupo.entraron.length + grupo.simulados.length + grupo.porEntrar.length
  return (
    <Panel titulo="Integrantes del grupo" etiqueta={`${total} ${total === 1 ? 'persona' : 'personas'}`}>
      <ListaPersonas titulo="Ya están en el grupo" personas={grupo.entraron} estado="entro" vacio="Todavía no entró ninguna persona." />
      <ListaPersonas titulo="Personas simuladas" personas={grupo.simulados} estado="simulada" />
      <ListaPersonas titulo="Por entrar al grupo" personas={grupo.porEntrar} estado="por_entrar" />
      <p className="participacion-nota">Estar en el grupo no confirma el encuentro. Cada plan se confirma por separado.</p>
    </Panel>
  )
}
