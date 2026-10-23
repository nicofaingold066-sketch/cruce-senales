import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import type { ApiError, Espacio } from '../lib/types'
import { useAccion } from '../lib/hooks'
import { franjaTexto, momentoCorto, ZONA_VISIBLE } from '../lib/format'
import { dejarAviso, irA, rutas, useIdentidad, useShell } from '../lib/shell'
import { Aviso, Boton, Cargando, ErrorCaja } from '../components/ui'
import { tomarBorradorAgente } from '../agente/api'

interface Formulario {
  titulo: string
  aInicio: string
  aFin: string
  bInicio: string
  bFin: string
  minimo: string
  maximo: string
  imprescindibleId: string
  plazo: string
}

// Valores exactos del caso canónico (contrato, sección 5). Todo ficticio.
const CASO = {
  titulo: 'Asado en casa de Tomi',
  aInicio: '2026-10-31T14:00',
  aFin: '2026-10-31T17:00',
  bInicio: '2026-11-01T14:00',
  bFin: '2026-11-01T17:00',
  minimo: '4',
  maximo: '6',
  plazo: '2026-10-29T20:00',
}

type Campo = 'titulo' | 'franjas' | 'cupos' | 'plazo' | 'imprescindible'

/** Qué sección del formulario marcar según el error tipado del servidor (contrato 0.5). */
function campoDeError(e: ApiError | null): Campo | null {
  if (!e || e.codigo !== 'entrada_incompleta') return null
  switch (e.detalle) {
    case 'franjas_invalidas':
      return 'franjas'
    case 'cupos_invalidos':
      return 'cupos'
    case 'plazo_invalido':
      return 'plazo'
    case 'imprescindible_invalido':
      return 'imprescindible'
    case 'campo_faltante':
    case 'formato_invalido':
      return 'titulo'
    default:
      return null
  }
}

export default function NuevaPropuesta({ espacioId }: { espacioId: string }) {
  const { soloLectura } = useShell()
  const [espacio, setEspacio] = useState<Espacio | null>(null)
  const [errorEspacio, setErrorEspacio] = useState<ApiError | null>(null)
  const [paso, setPaso] = useState<'editar' | 'revisar'>('editar')
  const [f, setF] = useState<Formulario | null>(null)
  const { ocupado, error, ejecutar, limpiarError } = useAccion()
  const [faltantes, setFaltantes] = useState(false)
  const [abrirUltimo, setAbrirUltimo] = useState(true)
  const [desdeAgente, setDesdeAgente] = useState(false)
  const flujo = useRef(false)
  const [enCurso, setEnCurso] = useState(false)

  const yo = espacio?.miembros.find((m) => m.es_yo) ?? null
  useIdentidad(espacio?.nombre ?? null, yo?.nombre ?? null, espacio ? (espacio.mi_rol === 'organizador' ? 'organizador' : 'miembro') : null)

  const cargar = useCallback(async () => {
    const r = await api.getSpace(espacioId)
    if (r.ok) {
      setEspacio(r.data.espacio)
      setErrorEspacio(null)
    } else setErrorEspacio(r.error)
  }, [espacioId])

  useEffect(() => {
    void cargar()
  }, [cargar])

  // Precarga solo una vez que se conoce el espacio. En el espacio demo se usan los valores del caso.
  // Si el agente dejó un borrador (se lee una sola vez), su título y sus dos franjas reemplazan esos valores.
  const precargado = useRef(false)
  useEffect(() => {
    if (!espacio || f || precargado.current) return
    precargado.current = true
    const yoM = espacio.miembros.find((m) => m.es_yo)
    const tomi = espacio.miembros.find((m) => m.nombre.toLowerCase() === 'tomi')
    const borrador = tomarBorradorAgente(espacio.id)
    const base: Formulario = espacio.demo
      ? { ...CASO, imprescindibleId: (tomi ?? yoM)?.miembro_id ?? '' }
      : { titulo: '', aInicio: '', aFin: '', bInicio: '', bFin: '', minimo: '2', maximo: '6', imprescindibleId: yoM?.miembro_id ?? '', plazo: '' }
    if (borrador) {
      const [a, b] = borrador.franjas
      setDesdeAgente(true)
      setF({ ...base, titulo: borrador.titulo, aInicio: a.inicio, aFin: a.fin, bInicio: b.inicio, bFin: b.fin })
      return
    }
    setF(base)
  }, [espacio, f])

  if (errorEspacio && !espacio) {
    return (
      <div className="pantalla">
        <ErrorCaja error={errorEspacio} onReintentar={cargar} />
      </div>
    )
  }
  if (!espacio || !f) {
    return (
      <div className="pantalla">
        <Cargando texto="Preparando el formulario…" />
      </div>
    )
  }

  const form = f
  function poner<K extends keyof Formulario>(k: K, v: Formulario[K]) {
    setF({ ...form, [k]: v })
    if (error) limpiarError()
  }

  const completo =
    form.titulo.trim() !== '' &&
    form.aInicio !== '' &&
    form.aFin !== '' &&
    form.bInicio !== '' &&
    form.bFin !== '' &&
    form.minimo !== '' &&
    form.maximo !== '' &&
    form.imprescindibleId !== '' &&
    form.plazo !== ''

  const imprescindible = espacio.miembros.find((m) => m.miembro_id === form.imprescindibleId)
  const marcado = campoDeError(error)

  function revisar() {
    if (!completo) {
      setFaltantes(true)
      return
    }
    setFaltantes(false)
    setPaso('revisar')
  }

  async function crear(abrir: boolean) {
    // U2 (revisión de Codex): un solo flujo crear → abrir → navegar. El bloqueo cubre también la apertura,
    // así un segundo clic no puede pedir otra creación con otro intento.
    if (flujo.current) return
    flujo.current = true
    setEnCurso(true)
    try {
      await crearYAbrir(abrir)
    } finally {
      flujo.current = false
      setEnCurso(false)
    }
  }

  async function crearYAbrir(abrir: boolean) {
    setAbrirUltimo(abrir)
    // La huella incluye todos los datos: si cambian, es otro intento (contrato 0.7).
    const huella = JSON.stringify(form)
    const r = await ejecutar(huella, (intentoId) =>
      api.createProposal({
        espacioId,
        titulo: form.titulo.trim(),
        franjas: [
          { inicio: form.aInicio, fin: form.aFin },
          { inicio: form.bInicio, fin: form.bFin },
        ],
        minimo: Number(form.minimo),
        maximo: Number(form.maximo),
        imprescindibleId: form.imprescindibleId,
        plazo: form.plazo,
        intentoId,
      }),
    )
    if (!r) return
    if (!r.ok) {
      if (r.error.resultadoIncierto || r.error.codigo === 'intento_obsoleto') await cargar() // refresca el espacio
      setPaso('editar') // vuelve al formulario con el campo marcado y todo lo escrito intacto
      return
    }
    const propuestaId = r.data.resultado.propuesta_id
    if (abrir) {
      const o = await api.openProposal(propuestaId)
      // Si abrir falla, no se vuelve a crear: se va a ESA propuesta, que queda en borrador con el botón "Abrir".
      if (!o.ok) dejarAviso(`La propuesta se creó, pero no se pudo abrir al grupo (${o.error.mensaje}). Ábrela con el botón "Abrir".`)
    }
    irA(rutas.propuesta(espacioId, propuestaId))
  }

  return (
    <div className="pantalla">
      <p>
        <a href={rutas.espacio(espacioId)}>← {espacio.nombre}</a>
      </p>
      <h1>Nueva propuesta</h1>

      {paso === 'editar' ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            revisar()
          }}
          noValidate
        >
          {desdeAgente ? (
            <Aviso tono="info" titulo="Borrador del agente">
              Título y franjas vienen del borrador que propuso el agente. Revisa mínimo, máximo, persona imprescindible y
              cierre antes de crear: el agente no crea ni confirma nada.
            </Aviso>
          ) : null}
          {espacio.demo && !desdeAgente ? (
            <Aviso tono="info">
              Valores precargados del caso "Los del asado". Puedes cambiarlos antes de revisar.{' '}
              <button
                type="button"
                className="enlace"
                onClick={() => {
                  const tomi = espacio.miembros.find((m) => m.nombre.toLowerCase() === 'tomi')
                  setF({ ...CASO, imprescindibleId: tomi?.miembro_id ?? form.imprescindibleId })
                }}
              >
                Restablecer valores del caso
              </button>
            </Aviso>
          ) : null}
          {faltantes ? <Aviso tono="error">Completa todos los campos antes de revisar.</Aviso> : null}
          {error ? <ErrorCaja error={error} onReintentar={() => void crear(abrirUltimo)} /> : null}

          <label className="campo">
            <span>Propósito de la propuesta</span>
            <input
              value={form.titulo}
              onChange={(e) => poner('titulo', e.target.value)}
              maxLength={80}
              aria-invalid={marcado === 'titulo' || (faltantes && form.titulo.trim() === '') ? true : undefined}
            />
          </label>

          <fieldset className={`grupo ${marcado === 'franjas' ? 'grupo-error' : ''}`}>
            <legend>Franjas candidatas (hora de {ZONA_VISIBLE})</legend>
            <p className="suave">Son exactamente dos. La primera tiene prioridad si ambas sirven.</p>
            <div className="par-fechas">
              <strong>Franja A</strong>
              <label className="campo">
                <span>Inicio</span>
                <input type="datetime-local" value={form.aInicio} onChange={(e) => poner('aInicio', e.target.value)} />
              </label>
              <label className="campo">
                <span>Fin</span>
                <input type="datetime-local" value={form.aFin} onChange={(e) => poner('aFin', e.target.value)} />
              </label>
            </div>
            <div className="par-fechas">
              <strong>Franja B</strong>
              <label className="campo">
                <span>Inicio</span>
                <input type="datetime-local" value={form.bInicio} onChange={(e) => poner('bInicio', e.target.value)} />
              </label>
              <label className="campo">
                <span>Fin</span>
                <input type="datetime-local" value={form.bFin} onChange={(e) => poner('bFin', e.target.value)} />
              </label>
            </div>
          </fieldset>

          <fieldset className={`grupo ${marcado === 'cupos' ? 'grupo-error' : ''}`}>
            <legend>Cupos</legend>
            <div className="par-campos">
              <label className="campo">
                <span>Mínimo (cuenta a quien es imprescindible)</span>
                <input type="number" inputMode="numeric" min={2} max={20} value={form.minimo} onChange={(e) => poner('minimo', e.target.value)} />
              </label>
              <label className="campo">
                <span>Máximo</span>
                <input type="number" inputMode="numeric" min={2} max={20} value={form.maximo} onChange={(e) => poner('maximo', e.target.value)} />
              </label>
            </div>
          </fieldset>

          <label className={`campo ${marcado === 'imprescindible' ? 'campo-error' : ''}`}>
            <span>Persona imprescindible (anfitrión)</span>
            <select value={form.imprescindibleId} onChange={(e) => poner('imprescindibleId', e.target.value)}>
              {espacio.miembros.map((m) => (
                <option key={m.miembro_id} value={m.miembro_id}>
                  {m.nombre}
                  {m.simulado ? ' (Simulación)' : ''}
                </option>
              ))}
            </select>
            <small>Sin esta persona el grupo no puede confirmarse.</small>
          </label>

          <label className={`campo ${marcado === 'plazo' ? 'campo-error' : ''}`}>
            <span>Cierre de aceptación (hora de {ZONA_VISIBLE})</span>
            <input type="datetime-local" value={form.plazo} onChange={(e) => poner('plazo', e.target.value)} />
            <small>El servidor decide si un plazo se cumplió; esta pantalla no lo calcula.</small>
          </label>

          <Boton type="submit" disabled={soloLectura}>
            Revisar antes de crear
          </Boton>
        </form>
      ) : (
        <div>
          <Aviso tono="info" titulo="Revisa antes de crear">
            Nada se publica hasta que confirmes. Podrás volver y cambiar cualquier dato.
          </Aviso>
          <section className="tarjeta">
            <dl className="datos">
              <dt>Propósito</dt>
              <dd>{form.titulo.trim()}</dd>
              <dt>Franja A</dt>
              <dd>{franjaTexto(form.aInicio, form.aFin)}</dd>
              <dt>Franja B</dt>
              <dd>{franjaTexto(form.bInicio, form.bFin)}</dd>
              <dt>Zona horaria</dt>
              <dd>{ZONA_VISIBLE}</dd>
              <dt>Cupos</dt>
              <dd>
                Mínimo {form.minimo} (contando a {imprescindible?.nombre ?? 'quien es imprescindible'}), máximo {form.maximo}
              </dd>
              <dt>Imprescindible</dt>
              <dd>{imprescindible?.nombre ?? '—'}</dd>
              <dt>Cierre de aceptación</dt>
              <dd>{momentoCorto(form.plazo)}</dd>
            </dl>
          </section>
          {error ? <ErrorCaja error={error} onReintentar={() => void crear(abrirUltimo)} /> : null}
          <div className="fila-botones">
            <Boton onClick={() => void crear(true)} ocupado={ocupado || enCurso} ocupadoTexto="Creando…" disabled={soloLectura}>
              Crear y abrir al grupo
            </Boton>
            <Boton variante="secundario" onClick={() => void crear(false)} ocupado={ocupado || enCurso} ocupadoTexto="Creando…" disabled={soloLectura}>
              Crear solo el borrador
            </Boton>
            <Boton variante="secundario" onClick={() => setPaso('editar')} disabled={ocupado || enCurso}>
              Volver a editar
            </Boton>
          </div>
          <p className="suave">
            "Abrir" permite que cada persona marque su interés y cargue sus condiciones. Marcar interés no suma confirmados.
          </p>
        </div>
      )}
    </div>
  )
}
