import { useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../lib/api'
import type { TipoEspacio } from '../lib/types'
import { useAccion } from '../lib/hooks'
import { dejarAviso, irA, rutas, useIdentidad, useShell } from '../lib/shell'
import { recordarNombreSiFalta, usePerfil } from '../lib/perfil'
import { Aviso, Boton, ErrorCaja } from '../components/ui'
import { Icono } from '../components/Icono'

// Crear un grupo propio (un "espacio" del contrato). Solo lo social: el tipo queda fijo en "amigos"
// (decisión de Nico y Juan, 11:51). Después se invita con el enlace desde la pantalla del grupo.
export default function CrearGrupo() {
  useIdentidad(null, null, null)
  const { soloLectura } = useShell()
  const perfil = usePerfil()
  const [nombre, setNombre] = useState('')
  const [visible, setVisible] = useState(() => perfil?.nombre ?? '')
  const tipo: TipoEspacio = 'amigos'
  const { ocupado, error, ejecutar } = useAccion()
  const faltan = nombre.trim() === '' || visible.trim() === ''

  async function hacer(e: FormEvent) {
    e.preventDefault()
    if (faltan) return
    const r = await ejecutar(`crear:${nombre}:${tipo}:${visible}`, () => api.createSpace(nombre.trim(), tipo, visible.trim()))
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
        <p className="escena-sub">Un grupo es la gente con la que siempre dicen «nos juntamos». Lo creas, compartes el enlace y cada uno entra desde su teléfono.</p>
      </section>
      <div className="hoja">
        <form onSubmit={hacer} noValidate>
          <fieldset className="form-seccion">
            <legend>El grupo</legend>
            <label className="campo">
              <span>Nombre del grupo</span>
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={60} placeholder="Ej.: Los del asado" />
            </label>
            <label className="campo">
              <span>Tu nombre en el grupo</span>
              <input value={visible} onChange={(e) => setVisible(e.target.value)} maxLength={30} autoComplete="nickname" />
              <small>Así te van a ver los demás en este grupo.</small>
            </label>
          </fieldset>
          <Aviso tono="info">
            Vas a ser quien organiza: creas las propuestas y buscas la opción compatible. Las condiciones de cada persona son
            privadas, también para ti.
          </Aviso>
          {error ? <ErrorCaja error={error} enfocar /> : null}
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
