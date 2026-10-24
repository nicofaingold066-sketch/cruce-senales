import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../lib/api'
import type { TipoEspacio } from '../lib/types'
import { useAccion } from '../lib/hooks'
import { dejarAviso, irA, rutas, useIdentidad, useShell } from '../lib/shell'
import { recordarNombreSiFalta, usePerfil } from '../lib/perfil'
import { ayudaGrupo, ejemploPorSemilla, placeholderGrupo } from '../lib/ejemplos'
import { Aviso, Boton, ErrorCaja } from '../components/ui'
import { Icono } from '../components/Icono'
import { CampoIntegrantes } from '../login/Integrantes'
import { CampoQuienViene } from '../friccion/QuienViene'
import { conQuienViene } from '../lib/compartir'
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
  const tipo: TipoEspacio = 'amigos'
  const { ocupado, error, ejecutar } = useAccion()
  const faltan = nombre.trim() === '' || visible.trim() === ''
  // Entrada como Tricount: con la lista del grupo, al abrir el enlace cada uno toca su nombre. Sin ella, cada uno tiene
  // que escribirlo y no hay a quién elegir; por eso, con la lista vacía, "Crear grupo" pide confirmar una vez.
  const [preguntarSinLista, setPreguntarSinLista] = useState(false)
  const zonaIntegrantes = useRef<HTMLDivElement>(null)
  // Un nombre escrito y no agregado (el campo de CampoIntegrantes) se pierde al crear: se avisa en la misma pregunta.
  const escritoSinAgregar = () => (zonaIntegrantes.current?.querySelector('input')?.value.trim() ?? '') !== ''

  function irALista() {
    setPreguntarSinLista(false)
    const campo = zonaIntegrantes.current?.querySelector('input')
    campo?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    campo?.focus({ preventScroll: true })
  }

  function hacer(e: FormEvent) {
    e.preventDefault()
    if (faltan) return
    if (integrantes.length === 0) {
      setPreguntarSinLista(true)
      return
    }
    void crear()
  }

  async function crear() {
    if (faltan) return
    const r = await ejecutar(`crear:${nombre}:${tipo}:${visible}:${integrantes.join('|')}`, () =>
      api.createSpace(conQuienViene(nombre.trim(), quienViene), tipo, visible.trim(), integrantes),
    )
    if (r?.ok) {
      recordarNombreSiFalta(visible)
      dejarAviso(`Creaste «${nombre.trim()}». Ahora invita a tu grupo: comparte el enlace o el código.`)
      irA(rutas.espacio(r.data.resultado.espacio_id))
    }
  }

  return (
    <div className="vista">
      <section className="escena" aria-labelledby="crear-titulo">
        <a className="escena-volver" href={rutas.inicio()}>
          <Icono n="atras" tam={20} /> Inicio
        </a>
        <span className="escena-eyebrow">Nuevo grupo</span>
        <h1 id="crear-titulo">Crear un grupo</h1>
        <p className="escena-sub">
          Un grupo es la gente con la que siempre dicen «nos juntamos». {ayudaGrupo(ej)} Anota a todos, comparte el enlace y cada
          uno entra desde su teléfono tocando su nombre.
        </p>
      </section>
      <div className="hoja">
        <form onSubmit={hacer} noValidate>
          <fieldset className="form-seccion">
            <legend>El grupo</legend>
            <label className="campo">
              <span>Nombre del grupo</span>
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={60} placeholder={placeholderGrupo(ej)} />
            </label>
            <label className="campo">
              <span>Tu nombre en el grupo</span>
              <input value={visible} onChange={(e) => setVisible(e.target.value)} maxLength={30} autoComplete="nickname" />
              <small>Así te van a ver los demás en este grupo.</small>
            </label>
          </fieldset>
          <div ref={zonaIntegrantes}>
            <CampoIntegrantes
              integrantes={integrantes}
              cambiar={(lista) => {
                setIntegrantes(lista)
                if (lista.length > 0) setPreguntarSinLista(false)
              }}
              tuNombre={visible}
            />
          </div>
          {/* Lo que va a ver cada uno al abrir el enlace: su nombre para tocar (enmienda 9, "¿Quién eres?"). */}
          <p className="suave lista-resumen" aria-live="polite">
            {integrantes.length > 0
              ? `Al abrir el enlace, cada uno toca su nombre: ${[visible.trim() ? `${visible.trim()} (tú)` : 'tú', ...integrantes].join(', ')}.`
              : 'Anota a los del grupo: al abrir el enlace, cada uno toca su nombre y listo. Puedes pegar la lista del chat.'}
          </p>
          <CampoQuienViene valor={quienViene} cambiar={setQuienViene} nombre={nombre} />
          <Aviso tono="info">
            Vas a ser quien organiza: creas las propuestas y buscas la opción compatible. Las condiciones de cada persona son
            privadas, también para ti.
          </Aviso>
          {error ? <ErrorCaja error={error} enfocar /> : null}
          {preguntarSinLista ? (
            <Aviso tono="aviso" titulo="¿Crear sin la lista del grupo?">
              {escritoSinAgregar()
                ? 'Escribiste un nombre pero no lo agregaste: toca «Agregar» para que quede en la lista. '
                : ''}
              Sin la lista, al abrir el enlace nadie tiene un nombre para tocar: cada uno tiene que escribir el suyo.
              <div className="fila-botones">
                <Boton autoFocus onClick={irALista}>
                  Agregar nombres
                </Boton>
                <Boton variante="secundario" onClick={() => void crear()} ocupado={ocupado} ocupadoTexto="Creando…" disabled={soloLectura}>
                  Crear sin lista
                </Boton>
              </div>
            </Aviso>
          ) : null}
          <div className="barra-accion">
            <Boton type="submit" ocupado={ocupado} ocupadoTexto="Creando…" disabled={faltan || soloLectura}>
              Crear grupo
            </Boton>
          </div>
        </form>
      </div>
    </div>
  )
}
