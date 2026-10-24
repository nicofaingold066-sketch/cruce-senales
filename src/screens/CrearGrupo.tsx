import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../lib/api'
import type { TipoEspacio } from '../lib/types'
import { useAccion } from '../lib/hooks'
import { dejarAviso, irA, rutas, useIdentidad, useShell } from '../lib/shell'
import { recordarNombreSiFalta, usePerfil } from '../lib/perfil'
import { ejemploPorSemilla, placeholderGrupo } from '../lib/ejemplos'
import { Avatar, Aviso, Boton, ErrorCaja, IconoGrupo } from '../components/ui'
import { Icono } from '../components/Icono'
import { MAX_INTEGRANTES } from '../login/Integrantes'
import { CampoQuienViene } from '../friccion/QuienViene'
import { CampoProposito } from '../friccion/Proposito'
import type { Proposito } from '../friccion/propositos'
import { conQuienViene } from '../lib/compartir'
import '../estilo/seccion-s2.css'
import type { QuienViene } from '../lib/compartir'

// Crear un grupo propio (un "espacio" del contrato). Solo lo social: el tipo queda fijo en "amigos"
// (decisión de Nico y Juan, 11:51). Después se invita con el enlace desde la pantalla del grupo.
export default function CrearGrupo() {
  useIdentidad(null, null, null)
  const { soloLectura } = useShell()
  const perfil = usePerfil()
  const [nombre, setNombre] = useState('')
  const [visible, setVisible] = useState(() => perfil?.nombre ?? '')
  // Enmienda 9 (fase 2, sesión login): los nombres del grupo; cada uno elige el suyo al abrir la invitación.
  const [integrantes, setIntegrantes] = useState<string[]>([])
  // Ejemplo del placeholder y de la ayuda (#92, apertura): rota cada hora y se fija al abrir la pantalla, así no
  // cambia mientras se escribe. Nunca asume asado.
  const [ej] = useState(() => ejemploPorSemilla(String(Math.floor(Date.now() / 3600000))))
  // D3 de psico (friccion): quién viene es una regla del grupo; va como marca en el nombre, sin migración.
  const [quienViene, setQuienViene] = useState<QuienViene | null>(null)
  // Enmienda 14: para qué es el grupo. 'libre' (por defecto) es el comportamiento de siempre y no se manda al servidor.
  const [proposito, setProposito] = useState<Proposito>('libre')
  const tipo: TipoEspacio = 'amigos'
  const { ocupado, error, ejecutar } = useAccion()
  const faltan = nombre.trim() === '' || visible.trim() === ''
  // Entrada como Tricount: con la lista del grupo, al abrir el enlace cada uno toca su nombre. Sin ella, cada uno tiene
  // que escribirlo y no hay a quién elegir. Por eso "Crear grupo" pregunta una vez si la lista está vacía o si quedó un
  // nombre escrito sin "Agregar" (se perdería en silencio). Se mira al tocar, no al dibujar.
  const [pregunta, setPregunta] = useState<{ sinLista: boolean; escrito: boolean } | null>(null)
  const zonaIntegrantes = useRef<HTMLDivElement>(null)
  // Solo cuenta un nombre que "Agregar" sumaría: no uno repetido, ni el propio, ni uno de más de 30 letras (esos
  // CampoIntegrantes los rechaza y deja escritos; preguntar por ellos trabaría la creación sin salida).
  const escritoSinAgregar = () => {
    const texto = zonaIntegrantes.current?.querySelector('input')?.value ?? ''
    const igual = (a: string, b: string) => a.trim().toLocaleLowerCase('es') === b.trim().toLocaleLowerCase('es')
    return texto
      .split(/[,;\n\r]+/)
      .map((x) => x.replace(/\s+/g, ' ').trim())
      .some((n) => n !== '' && n.length <= 30 && !igual(n, visible) && !integrantes.some((a) => igual(a, n)))
  }

  function irALista() {
    setPregunta(null)
    const campo = zonaIntegrantes.current?.querySelector('input')
    campo?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    campo?.focus({ preventScroll: true })
  }

  function hacer(e: FormEvent) {
    e.preventDefault()
    if (faltan) return
    const escrito = escritoSinAgregar()
    if (integrantes.length === 0 || escrito) {
      setPregunta({ sinLista: integrantes.length === 0, escrito })
      return
    }
    void crear()
  }

  async function crear() {
    if (faltan) return
    const r = await ejecutar(`crear:${nombre}:${tipo}:${visible}:${integrantes.join('|')}:${proposito}`, () =>
      api.createSpace(conQuienViene(nombre.trim(), quienViene), tipo, visible.trim(), integrantes, proposito),
    )
    if (r?.ok) {
      recordarNombreSiFalta(visible)
      dejarAviso(`Creaste «${nombre.trim()}». Ahora invita a tu grupo: comparte el enlace o el código.`)
      // Mockup (pantalla 11): "Después, directo a armar el primer plan." La X de Nuevo plan vuelve al grupo.
      irA(rutas.nueva(r.data.resultado.espacio_id))
    }
  }

  return (
    <div className="vista vista-s2 vista-crear">
      {/* Mockup validado, pantalla 11 (exacto): hoja a pantalla completa con X y título. */}
      <div className="hoja s2-hoja-completa">
        <header className="s2-crear-cabeza">
          <a className="s2-cerrar" href={rutas.inicio()} aria-label="Cerrar y volver a tus grupos">
            <Icono n="cerrar" tam={22} />
          </a>
          <h1 id="crear-titulo">Crear un grupo</h1>
          <span aria-hidden="true" />
        </header>
        <form onSubmit={hacer} noValidate aria-labelledby="crear-titulo">
          <fieldset className="form-seccion">
            <legend className="visualmente-oculto">El grupo</legend>
            <label className="campo">
              <span>Nombre del grupo</span>
              <span className="s2-nombre-grupo">
                {/* El ícono del grupo sale de sus iniciales (no hay ícono elegible en el contrato). */}
                <IconoGrupo nombre={nombre.trim() || '?'} />
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={60} placeholder={placeholderGrupo(ej)} />
              </span>
            </label>
            <label className="campo">
              <span>Tu nombre en el grupo</span>
              <input value={visible} onChange={(e) => setVisible(e.target.value)} maxLength={30} autoComplete="nickname" />
            </label>
          </fieldset>
          <div ref={zonaIntegrantes}>
            <QuienesSon
              integrantes={integrantes}
              cambiar={(lista) => {
                setIntegrantes(lista)
                // Con la lista cambiada, la pregunta abierta ya no vale: el próximo "Crear grupo" vuelve a mirar.
                setPregunta(null)
              }}
              tuNombre={visible}
            />
          </div>
          <details className="s2-fila-opciones">
            <summary>
              <span>Opciones</span>
              <span className="suave"> · ¿para qué es el grupo? · ¿quién viene?</span>
            </summary>
            <CampoProposito valor={proposito} cambiar={setProposito} deshabilitado={soloLectura} />
            <CampoQuienViene valor={quienViene} cambiar={setQuienViene} nombre={nombre} />
          </details>
          {error ? <ErrorCaja error={error} enfocar /> : null}
          {pregunta ? (
            <Aviso tono="aviso" titulo={pregunta.sinLista ? '¿Crear sin la lista del grupo?' : '¿Crear sin el nombre que escribiste?'}>
              <span id="crear-pregunta">
                {pregunta.escrito ? 'Escribiste un nombre pero no lo agregaste: toca «Agregar» para que quede en la lista. ' : ''}
                {pregunta.sinLista
                  ? 'Sin la lista, al abrir el enlace nadie tiene un nombre para tocar: cada uno tiene que escribir el suyo.'
                  : 'Si creas el grupo así, ese nombre no queda en la lista.'}
              </span>
              <div className="fila-botones">
                <Boton autoFocus onClick={irALista} disabled={ocupado} aria-describedby="crear-pregunta">
                  {pregunta.sinLista ? 'Agregar nombres' : 'Agregarlo'}
                </Boton>
                <Boton variante="secundario" onClick={() => void crear()} ocupado={ocupado} ocupadoTexto="Creando…" disabled={faltan || soloLectura}>
                  {pregunta.sinLista ? 'Crear sin lista' : 'Crear sin agregarlo'}
                </Boton>
              </div>
            </Aviso>
          ) : null}
          <div className="barra-accion">
            {/* Mientras está la pregunta, la decisión es la de arriba: el botón de siempre baja a secundario. */}
            <Boton type="submit" variante={pregunta ? 'secundario' : 'primario'} ocupado={ocupado} ocupadoTexto="Creando…" disabled={faltan || soloLectura}>
              Crear grupo
            </Boton>
            <p className="suave s2-nota-final">Después, directo a armar el primer plan.</p>
          </div>
        </form>
      </div>
    </div>
  )
}

/** "Quiénes son" (pantalla 11): tú arriba, cada nombre con avatar y ×, y una fila para agregar uno o varios. */
function QuienesSon({ integrantes, cambiar, tuNombre }: { integrantes: string[]; cambiar: (lista: string[]) => void; tuNombre: string }) {
  const [nuevo, setNuevo] = useState('')
  const [aviso, setAviso] = useState<string | null>(null)
  const campo = useRef<HTMLInputElement>(null)

  /** Agrega uno o varios nombres (una lista pegada o escrita con comas, punto y coma o saltos de línea). */
  function agregarVarios(texto: string, reenfocar = true) {
    const nombres = texto.split(/[,;\n\r]+/).map((x) => x.replace(/\s+/g, ' ').trim()).filter(Boolean)
    if (nombres.length === 0) return
    const igual = (a: string, b: string) => a.trim().toLocaleLowerCase('es') === b.toLocaleLowerCase('es')
    const lista = [...integrantes]
    const agregados: string[] = []
    const avisos: string[] = []
    for (const n of nombres) {
      if (n.length > 30) avisos.push(`${n.slice(0, 30)}… es muy largo (hasta 30 letras).`)
      else if (igual(tuNombre, n) || lista.some((a) => igual(a, n))) avisos.push(`${n} ya está en la lista.`)
      else if (lista.length >= MAX_INTEGRANTES) {
        avisos.push(`Hasta ${MAX_INTEGRANTES} personas en la lista; el resto entra con el enlace.`)
        break
      } else {
        lista.push(n)
        agregados.push(n)
      }
    }
    if (agregados.length) {
      cambiar(lista)
      setNuevo('')
    }
    setAviso([agregados.length ? `Agregaste a ${agregados.join(', ')}.` : null, ...avisos].filter(Boolean).join(' '))
    if (reenfocar) campo.current?.focus()
  }

  return (
    <fieldset className="form-seccion s2-quienes">
      <legend>Quiénes son</legend>
      <ul className="s2-quienes-lista quien-integrantes" aria-label="Integrantes que agregaste">
        <li>
          <Avatar nombre={tuNombre.trim() || '?'} yo tam={32} />
          <span className="s2-quienes-nombre">{tuNombre.trim() || 'Tú'}</span>
          <span className="suave">tú · organizas</span>
        </li>
        {integrantes.map((n) => (
          <li key={n}>
            <Avatar nombre={n} tam={32} />
            <span className="s2-quienes-nombre">{n}</span>
            <button
              type="button"
              className="s2-quitar"
              aria-label={`Quitar a ${n}`}
              onClick={() => {
                cambiar(integrantes.filter((x) => x !== n))
                setAviso(`Quitaste a ${n}.`)
                campo.current?.focus()
              }}
            >
              <Icono n="cerrar" tam={18} />
            </button>
          </li>
        ))}
      </ul>
      <div className="s2-quienes-entrada">
        <label className="visualmente-oculto" htmlFor="quienes-nuevo">
          Agregar a alguien del grupo
        </label>
        <input
          id="quienes-nuevo"
          className="s2-campo-nombres"
          ref={campo}
          value={nuevo}
          placeholder="Nombre, o varios separados por comas"
          onChange={(e) => setNuevo(e.target.value)}
          onBlur={() => {
            if (nuevo.trim() !== '') agregarVarios(nuevo, false)
          }}
          onPaste={(e) => {
            const t = e.clipboardData.getData('text')
            if (/[,;\n\r]/.test(t)) {
              e.preventDefault()
              agregarVarios(`${nuevo}${nuevo ? ',' : ''}${t}`)
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              agregarVarios(nuevo)
            }
          }}
          maxLength={200}
          autoComplete="off"
        />
        <Boton variante="secundario" onClick={() => agregarVarios(nuevo)} disabled={nuevo.trim() === ''}>
          Agregar
        </Boton>
      </div>
      <p className="suave s2-quienes-nota">Al abrir el enlace, cada uno toca su nombre y listo.</p>
      <p className="visualmente-oculto" aria-live="polite">
        {aviso}
      </p>
    </fieldset>
  )
}
