// Sesión "login": la ENTRADA de CRUXE (#/entrar). No hay contraseñas, correos ni teléfonos: la identidad es la
// sesión anónima que este navegador conserva y un nombre visible ficticio dentro de cada espacio.
// Primera vez (sesión sin espacios): esta pantalla, con tres entradas. Vuelta (con espacios): la portada de siempre.
// Los nombres accesibles ("Probar la demo «Los del asado»", "Tu nombre en el espacio", "Unirme") son los mismos de la
// portada: los guiones e2e arrancan en #/ y los buscan por nombre.
import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { api } from '../lib/api'
import type { ApiError } from '../lib/types'
import { useAccion } from '../lib/hooks'
import { dejarAviso, irA, rutas, useIdentidad, useShell } from '../lib/shell'
import { leerGuardada, volverAGuardada } from '../lib/sesiones'
import { Aviso, Boton, Cargando, ErrorCaja } from '../components/ui'
import { Marca } from '../components/Marca'
import { conEspacios, marcarConEspacios } from './estado'
import './login.css'

// "Crear un espacio" lleva a la portada una vez sin redirigir, y abre allí su formulario.
let abrirCrear = false

/** Reemplaza el hash sin dejar una entrada en el historial (el botón Atrás no vuelve a la redirección). */
function reemplazar(hash: string) {
  window.location.replace(hash)
}

type Comprobacion = { fase: 'comprobando' } | { fase: 'sin_espacios' } | { fase: 'con_espacios' } | { fase: 'error'; error: ApiError }

/** ¿La sesión ya tiene espacios? Sin `activa` no pregunta al servidor y responde que sí (se muestra la portada). */
function useComprobacion(activa = true) {
  const [estado, setEstado] = useState<Comprobacion>(() => (conEspacios() || !activa ? { fase: 'con_espacios' } : { fase: 'comprobando' }))
  const secuencia = useRef(0)
  const comprobar = useCallback(async () => {
    if (conEspacios()) return setEstado({ fase: 'con_espacios' })
    const mia = ++secuencia.current
    setEstado({ fase: 'comprobando' })
    const r = await api.listMySpaces()
    if (mia !== secuencia.current) return
    if (!r.ok) return setEstado({ fase: 'error', error: r.error })
    if (r.data.espacios.length > 0) {
      marcarConEspacios()
      setEstado({ fase: 'con_espacios' })
    } else {
      setEstado({ fase: 'sin_espacios' })
    }
  }, [])
  useEffect(() => {
    if (activa) void comprobar()
  }, [activa, comprobar])
  return { estado, comprobar }
}

/**
 * Envuelve la portada (#/): en la primera visita (sesión sin espacios) lleva a #/entrar. Si no se puede saber
 * (sin conexión, error), muestra la portada de siempre, que ya maneja sus errores.
 */
export function PrimeraVisita({ children }: { children: ReactNode }) {
  const [saltar] = useState(() => {
    const s = abrirCrear
    abrirCrear = false
    return s
  })
  const { estado } = useComprobacion(!saltar)
  const mostrar = saltar || estado.fase === 'con_espacios' || estado.fase === 'error'

  useEffect(() => {
    if (!saltar && estado.fase === 'sin_espacios') reemplazar(rutas.entrar())
  }, [saltar, estado.fase])

  useEffect(() => {
    if (!saltar) return
    // El formulario de crear vive en la portada (plegado): se abre y se enfoca su primer campo.
    const plegable = [...document.querySelectorAll<HTMLDetailsElement>('details.plegable')].find((d) =>
      d.querySelector('summary')?.textContent?.includes('Crear un espacio'),
    )
    if (!plegable) return
    plegable.open = true
    plegable.scrollIntoView({ block: 'start' })
    plegable.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true })
  }, [saltar])

  return mostrar ? <>{children}</> : <Cargando texto="Preparando tu sesión…" />
}

export function Entrar() {
  useIdentidad(null, null, null)
  const { estado, comprobar } = useComprobacion()

  useEffect(() => {
    // Vuelta: quien ya tiene espacios no ve la entrada; va a la portada, que muestra "Tu plan".
    if (estado.fase === 'con_espacios') reemplazar(rutas.inicio())
  }, [estado.fase])

  if (estado.fase === 'comprobando' || estado.fase === 'con_espacios') return <Cargando texto="Preparando tu sesión…" />
  return (
    <div className="pantalla entrada">
      <section className="entrada-cabeza" aria-labelledby="entrada-titulo">
        <Marca grande />
        <h1 id="entrada-titulo" className="portada-lema">
          Del «nos juntamos» al encuentro que ocurre.
        </h1>
        <p className="portada-sub">
          Sin correo ni contraseña: este navegador recuerda tu sesión y en cada espacio usas solo un nombre.
        </p>
      </section>
      {estado.fase === 'error' ? <ErrorCaja error={estado.error} onReintentar={() => void comprobar()} /> : null}
      <Opciones />
    </div>
  )
}

/** Con otra sesión guardada en este navegador (mejora #47), retomarla es la primera opción. */
function Opciones() {
  const [guardada, setGuardada] = useState(() => leerGuardada())
  const [otraPersona, setOtraPersona] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const enVuelo = useRef(false)
  const otra = useRef<HTMLButtonElement | null>(null)

  async function volver() {
    if (enVuelo.current || !guardada) return
    enVuelo.current = true
    setOcupado(true)
    setError(null)
    const r = await volverAGuardada(guardada)
    if (r.ok) {
      // Todo lo de esta pantalla es de la sesión de ahora: se empieza de cero con la recuperada.
      window.location.replace(rutas.inicio())
      window.location.reload()
      return
    }
    enVuelo.current = false
    setOcupado(false)
    setError(r.mensaje)
    setGuardada(leerGuardada())
  }

  useEffect(() => {
    // Tras un error, el foco va a la opción que sigue sirviendo.
    if (error) otra.current?.focus()
  }, [error])

  if (guardada && !otraPersona) {
    return (
      <section className="tarjeta entrada-opcion" aria-labelledby="entrada-seguir">
        <h2 id="entrada-seguir">Sigues como {guardada.etiqueta}</h2>
        <p className="suave">Este navegador guarda esa sesión. Si no eres esa persona, entra como otra.</p>
        <div className="entrada-botones">
          <Boton onClick={volver} ocupado={ocupado} ocupadoTexto="Volviendo…" autoFocus>
            Volver a esa sesión
          </Boton>
          <button type="button" ref={otra} className="btn btn-secundario" onClick={() => setOtraPersona(true)} disabled={ocupado}>
            Entrar como otra persona
          </button>
        </div>
        {error ? (
          <Aviso tono="error" titulo="No se pudo volver a esa sesión">
            {error}
          </Aviso>
        ) : null}
      </section>
    )
  }
  return (
    <>
      {error ? (
        <Aviso tono="error" titulo="No se pudo volver a esa sesión">
          {error}
        </Aviso>
      ) : null}
      <Entradas enfocar={!otraPersona} />
    </>
  )
}

function Entradas({ enfocar }: { enfocar: boolean }) {
  const { soloLectura } = useShell()
  return (
    <div className="entrada-opciones">
      <EntradaDemo deshabilitado={soloLectura} enfocar={enfocar} />
      <EntradaCodigo deshabilitado={soloLectura} />
      <section className="tarjeta entrada-opcion" aria-labelledby="entrada-crear">
        <h2 id="entrada-crear">Crear un espacio</h2>
        <p className="suave">Para tu propio grupo: invitas con el código y cada persona responde desde su teléfono.</p>
        <button
          type="button"
          className="btn btn-secundario"
          disabled={soloLectura}
          onClick={() => {
            abrirCrear = true
            irA(rutas.inicio())
          }}
        >
          Crear un espacio
        </button>
      </section>
    </div>
  )
}

function EntradaDemo({ deshabilitado, enfocar }: { deshabilitado: boolean; enfocar: boolean }) {
  const { ocupado, error, ejecutar } = useAccion()
  async function hacer() {
    const r = await ejecutar('seed', () => api.seedDemoSpace())
    if (r?.ok) {
      marcarConEspacios()
      irA(rutas.espacio(r.data.resultado.espacio_id))
    }
  }
  return (
    <section className="tarjeta entrada-opcion entrada-principal" aria-labelledby="entrada-demo">
      <h2 id="entrada-demo">Ver cómo funciona</h2>
      <Boton onClick={hacer} ocupado={ocupado} ocupadoTexto="Preparando la demo…" disabled={deshabilitado} autoFocus={enfocar}>
        Probar la demo «Los del asado»
      </Boton>
      <p className="suave">Serás Tomi, quien organiza. Las otras cinco personas son simuladas (datos ficticios).</p>
      {error ? <ErrorCaja error={error} enfocar /> : null}
    </section>
  )
}

function EntradaCodigo({ deshabilitado }: { deshabilitado: boolean }) {
  const [codigo, setCodigo] = useState('')
  const [nombre, setNombre] = useState('')
  const { ocupado, error, ejecutar } = useAccion()
  const campoCodigo = useRef<HTMLInputElement>(null)
  const campoNombre = useRef<HTMLInputElement>(null)
  const faltan = codigo.trim() === '' || nombre.trim() === ''
  const codigoMal = error?.detalle === 'codigo_inexistente'
  const nombreMal = error?.detalle === 'nombre_en_uso'

  useEffect(() => {
    // Tras un error del código o del nombre, el foco va al campo que hay que corregir.
    if (codigoMal) campoCodigo.current?.focus()
    else if (nombreMal) campoNombre.current?.focus()
  }, [error, codigoMal, nombreMal])

  async function hacer(e: FormEvent) {
    e.preventDefault()
    if (faltan) return
    const c = codigo.trim()
    const n = nombre.trim()
    const r = await ejecutar(`join:${c}:${n}`, () => api.joinSpace(c, n))
    if (!r?.ok) return
    if (r.data.resultado.ya_era_miembro) {
      // No se entra en silencio como quien estaba antes: la portada de invitación avisa y ofrece otra persona.
      irA(rutas.unirse(c))
      return
    }
    marcarConEspacios()
    if (r.data.resultado.reclamo_asiento_simulado) {
      dejarAviso(`Reclamaste el lugar de ${n}. Desde ahora respondes tú desde este teléfono; cuándo puedes y tus condiciones no las ve nadie del grupo.`)
    }
    irA(rutas.espacio(r.data.resultado.espacio_id))
  }

  return (
    <form id="unirse" className="tarjeta entrada-opcion" onSubmit={hacer} noValidate aria-labelledby="entrada-codigo">
      <h2 id="entrada-codigo">Tengo un código de invitación</h2>
      <label className={`campo ${codigoMal ? 'campo-error' : ''}`}>
        <span>Código de invitación</span>
        <input
          ref={campoCodigo}
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={16}
          aria-invalid={codigoMal || undefined}
        />
      </label>
      <label className={`campo ${nombreMal ? 'campo-error' : ''}`}>
        <span>Tu nombre en el espacio</span>
        <input
          ref={campoNombre}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          autoComplete="off"
          maxLength={30}
          aria-invalid={nombreMal || undefined}
        />
        <small>Solo en la demo «Los del asado»: si escribes el nombre de una persona simulada (por ejemplo "Luna"), tomas su lugar.</small>
      </label>
      <Boton type="submit" variante="secundario" ocupado={ocupado} ocupadoTexto="Uniéndome…" disabled={faltan || deshabilitado}>
        Unirme
      </Boton>
      {error ? <ErrorCaja error={error} enfocar={!codigoMal && !nombreMal} /> : null}
    </form>
  )
}
