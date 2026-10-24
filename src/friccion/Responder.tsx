// #88 "Respuesta en un paso" (feedback del jurado: quitar fricción). Después de "¿Quién eres?", el invitado llega acá
// (#/e/<id>/responder) y responde la propuesta abierta con UN toque: "Puedo los dos días", "Solo …" o "No puedo".
// Cada opción guarda las dos franjas juntas con save_my_conditions (privado: solo el servidor lo ve).
// Si no hay exactamente una propuesta que pueda responder ahora, no muestra nada: reemplaza la ruta por el espacio
// (o por el plan, si te toca confirmar) y deja un aviso con lo que dice el servidor sobre qué sigue.
// El servidor decide si puede guardar (`puede.guardar_condiciones`); esta pantalla nunca lo calcula.
import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import type { ApiError, EstadoPropuesta, Preferencia, PropuestaResumen } from '../lib/types'
import { useAccion } from '../lib/hooks'
import { dejarAviso, rutas, tomarAviso, useIdentidad, useShell } from '../lib/shell'
import { vibrar } from '../lib/tacto'
import { Boton, Cargando, Chip, ErrorCaja } from '../components/ui'
import { Icono } from '../components/Icono'
import { TomarDeCalendario } from './Calendario'
import { nombreDelPlan, opcionesRapidas } from './respuestas'
import { RespuestasRapidas } from './RespuestasRapidas'
import { AjustarPorDia } from './AjustarPorDia'
import { etiquetaPlan } from '../componentes-nuevos/plan/accion'
import '../estilo/seccion-s5.css'
import type { Opcion } from './respuestas'
import { miOpinion } from './opinar'
import { sinQuienViene } from '../lib/compartir'
import './friccion.css'

type Carga =
  | { fase: 'cargando' }
  | { fase: 'error'; error: ApiError }
  | { fase: 'lista'; p: EstadoPropuesta; espacio: string; demo: boolean; yo: string | null; organizador: boolean; reabierta: boolean; personas: number }

/** Busca la única propuesta que esta persona puede responder ahora; si no hay una sola, sale (ver `salir`). */
function usePropuestaPorResponder(espacioId: string, propuestaId?: string) {
  const [carga, setCarga] = useState<Carga>({ fase: 'cargando' })
  // Aviso que dejó "¿Quién eres?" ("Entraste como Ana…"). Si se vuelve al espacio, se le pasa a esa pantalla.
  const [aviso] = useState(() => tomarAviso())
  const avisoRef = useRef(aviso)

  /**
   * No hay nada que responder en un toque: se va al espacio (o al plan, si al servidor le toca pedirte que confirmes)
   * con el aviso de entrada y, si hay un plan vivo, el texto del servidor sobre qué sigue para ti.
   */
  const salir = useCallback(
    (x: PropuestaResumen | null) => {
      // En el plan, "Te toca confirmar…" ya está arriba: el aviso no lo repite.
      const alPlan = x?.siguiente_accion.codigo === 'te_toca_aceptar'
      const partes = [avisoRef.current, x && !alPlan ? `«${x.titulo}»: ${x.siguiente_accion.texto}` : null].filter(Boolean)
      if (partes.length) dejarAviso(partes.join(' '))
      avisoRef.current = null
      window.location.replace(alPlan ? rutas.propuesta(espacioId, x.id) : rutas.espacio(espacioId))
    },
    [espacioId],
  )

  const cargar = useCallback(async () => {
    setCarga({ fase: 'cargando' })
    const [lista, esp] = await Promise.all([api.listProposals(espacioId), api.getSpace(espacioId)])
    if (!lista.ok) return setCarga({ fase: 'error', error: lista.error })
    if (!esp.ok) return setCarga({ fase: 'error', error: esp.error })
    const vivas = lista.data.propuestas.filter(
      (x) => !x.plazo_vencido && !x.mi_situacion.retirado && x.estado !== 'cancelado' && x.estado !== 'expirado',
    )
    // Con una propuesta pedida (botón "Responder en un toque" dentro de un plan), solo esa.
    const mias = vivas.filter((x) => !propuestaId || x.id === propuestaId)
    const abiertas = mias.filter((x) => x.estado === 'reuniendo_interes')
    // Enmienda 13: con "así no puedo" marcado en la versión vigente, también se vuelve a responder en un toque.
    const esperando = mias.filter((x) => x.estado === 'esperando_compromisos')
    // "Cambiar ›" desde un plan EN REVISIÓN: el servidor permite guardar condiciones (la reparación las usa).
    const enRevision = propuestaId ? mias.filter((x) => x.estado === 'en_revision') : []
    const candidata =
      abiertas.length === 1
        ? abiertas[0]
        : abiertas.length === 0 && esperando.length === 1
          ? esperando[0]
          : abiertas.length === 0 && esperando.length === 0 && enRevision.length === 1
            ? enRevision[0]
            : null
    const sinNada = propuestaId ? (vivas.find((x) => x.id === propuestaId) ?? null) : vivas.length === 1 ? vivas[0] : null
    if (!candidata) return salir(sinNada)
    const e = await api.getProposalState(candidata.id)
    if (!e.ok) return setCarga({ fase: 'error', error: e.error })
    if (e.data.sin_cambios === true) return salir(candidata)
    const p = e.data.propuesta
    const s = p.mi_situacion
    const reabierta = p.estado === 'esperando_compromisos' && miOpinion(s) === 'asi_no_puedo'
    // Sin propuesta pedida, solo se ofrece lo que falta; con una pedida ("Cambiar ›" en el plan) se puede volver a responder.
    const corresponde = propuestaId ? p.estado === 'reuniendo_interes' || p.estado === 'en_revision' || reabierta : p.estado === 'reuniendo_interes' ? s.condiciones !== 'completas' : reabierta
    if (!s.puede.guardar_condiciones || !corresponde) return salir(candidata)
    const espacio = esp.data.espacio
    const yo = espacio.miembros.find((m) => m.es_yo)?.nombre ?? s.nombre
    setCarga({ fase: 'lista', p, espacio: sinQuienViene(espacio.nombre), demo: espacio.demo, yo, organizador: espacio.mi_rol === 'organizador', reabierta, personas: espacio.miembros.filter((m) => !m.pendiente).length })
  }, [espacioId, propuestaId, salir])

  useEffect(() => {
    void cargar()
  }, [cargar])

  return { carga, setCarga, cargar, aviso }
}

export function Responder({ espacioId, propuestaId }: { espacioId: string; propuestaId?: string }) {
  const { soloLectura } = useShell()
  const { carga, setCarga, cargar, aviso } = usePropuestaPorResponder(espacioId, propuestaId)
  const lista = carga.fase === 'lista' ? carga : null
  useIdentidad(lista?.espacio ?? null, lista?.yo ?? null, lista ? (lista.organizador ? 'organizador' : 'miembro') : null)
  const guardar = useAccion()
  const interes = useAccion()
  const [elegida, setElegida] = useState<Opcion | null>(null)
  // #90: la agenda ficticia solo SUGIERE una opción (se resalta); responder sigue siendo tocarla.
  const [sugerida, setSugerida] = useState<string | null>(null)
  const [interesNota, setInteresNota] = useState<string | null>(null)
  // Enmienda 15 (E-d): con la regla "la que más pueden", quien puede en los dos planes puede decir cuál prefiere (privado).
  const prefer = useAccion()
  const [prefiero, setPrefiero] = useState<Preferencia | null>(null)
  const titulo = useRef<HTMLHeadingElement>(null)

  // El foco va al h1 al abrir la pantalla y al responder ("Respondiste"), como pide rincones.
  useEffect(() => {
    if (lista) titulo.current?.focus({ preventScroll: true })
  }, [lista, elegida])

  if (!lista) {
    return (
      <div className="vista s5 s5-responder">
        <section className="escena">
          <a className="escena-volver" href={rutas.espacio(espacioId)}>
            <Icono n="atras" tam={20} /> Ver el grupo
          </a>
        </section>
        <div className="hoja">
          {carga.fase === 'error' ? (
            <>
              <ErrorCaja error={carga.error} onReintentar={() => void cargar()} titulo="No se pudo cargar el plan" />
              <a className="btn btn-secundario" href={rutas.espacio(espacioId)}>
                Ir al grupo
              </a>
            </>
          ) : (
            <Cargando texto="Buscando el plan para responder…" esqueleto />
          )}
        </div>
      </div>
    )
  }

  const { p } = lista
  const rapidas = opcionesRapidas(p.franjas)
  const opciones = rapidas ?? []
  const s = p.mi_situacion
  const verPlan = rutas.propuesta(espacioId, p.id)

  async function responder(o: Opcion) {
    const r = await guardar.ejecutar(`rapida:${p.id}:${o.id}`, () => api.saveMyConditions(p.id, o.disponibilidad))
    if (r?.ok) {
      vibrar(10)
      setCarga({ ...lista!, p: r.data.propuesta })
      setElegida(o)
    }
  }

  async function marcarInteres() {
    const r = await interes.ejecutar(`interes:${p.id}:true`, () => api.markInterest(p.id, true))
    if (r?.ok) {
      vibrar(10)
      setCarga({ ...lista!, p: r.data.propuesta })
      setInteresNota('Marcaste "Me interesa". El grupo ve tu nombre entre los interesados; no es una confirmación.')
    }
  }

  const algunSi = elegida ? Object.values(elegida.disponibilidad).includes('si') : false
  const conDesempate = p.regla === 'mas_si' && elegida?.id === 'ambas'
  async function preferir(q: Preferencia) {
    if (!elegida) return
    const r = await prefer.ejecutar(`prefiero:${p.id}:${q}`, () => api.saveMyConditions(p.id, elegida.disponibilidad, q))
    if (r?.ok) {
      vibrar(10)
      setCarga({ ...lista!, p: r.data.propuesta })
      setPrefiero(q)
    }
  }

  // Pantalla 14: lo que marcaste, en una línea ("Puedes los dos días.").
  const loQueMarcaste = elegida
    ? elegida.id === 'dia'
      ? 'Guardaste tus condiciones día por día.'
      : elegida.id === 'ninguna'
      ? 'No puedes ninguno de los días.'
      : elegida.id === 'ambas' || elegida.id === 'si'
        ? elegida.texto.replace(/^Puedo/, 'Puedes') + '.'
        : elegida.texto.replace(/^Solo/, 'Puedes solo') + '.'
    : ''
  // Cuántos respondieron: el servidor solo se lo da a quien organiza la propuesta (E7.2); nunca se calcula acá.
  const respondieron = p.personas_con_condiciones

  return (
    <div className="vista s5 s5-responder">
      <section className="escena" aria-labelledby="responder-titulo">
        {elegida ? (
          <>
            {/* Pantalla 14 empieza en el check. "Respuesta guardada" queda para el lector (y los guiones), sin verse. */}
            <p className="visualmente-oculto" role="status">
              Respuesta guardada
            </p>
            <span className="s5-check sd-exito" aria-hidden="true">
              <Icono n="check" tam={40} />
            </span>
          </>
        ) : (
          <>
            <a className="escena-volver" href={verPlan}>
              <Icono n="atras" tam={20} /> Ver el plan
            </a>
            <span className="escena-eyebrow">
              {p.titulo} · {lista.espacio}
            </span>
          </>
        )}
        <h1 id="responder-titulo" ref={titulo} tabIndex={-1}>
          {elegida ? 'Respondiste' : '¿Cuándo puedes?'}
        </h1>
        <p className="escena-sub">
          {!elegida
            ? lista.reabierta
              ? 'Marcaste que así no puedes. ¿Cuándo sí? Toca una opción: si se rearma, cuenta esto. Es privado: nadie del grupo lo ve.'
              : rapidas
                ? 'Toca una opción y listo. Es privado: nadie del grupo ve qué elegiste.'
                : 'Marca Sí o No en cada día. Es privado: nadie del grupo ve qué elegiste.'
            : loQueMarcaste}
        </p>
        {elegida ? <p className="escena-sub s5-solo-tu">Cuando haya un plan, lo ves acá. Solo tú ves lo que marcaste.</p> : null}
      </section>
      <div className="hoja">
        {aviso && !elegida ? (
          <p className="suave rapida-aviso" role="status">
            <Icono n="check" tam={16} /> {aviso.split('.')[0]}.
          </p>
        ) : null}

        {!elegida ? (
          <>
            <section aria-labelledby="responder-titulo">
              <RespuestasRapidas franjas={p.franjas} onElegir={(o) => void responder(o)} ocupado={guardar.ocupado} deshabilitado={soloLectura} sugerida={sugerida} />
              {guardar.ocupado ? <p role="status" className="suave">Guardando…</p> : null}
              {sugerida ? (
                <p id="rapida-sugerencia" className="suave" role="status">
                  Tu agenda ficticia sugiere «{opciones.find((o) => o.id === sugerida)?.texto}». Tócala para responder.
                </p>
              ) : null}
              {guardar.error ? <ErrorCaja error={guardar.error} enfocar /> : null}
            </section>
          </>
        ) : (
          <>
            {/* Enmienda 15: con la regla "la que más pueden", quien puede en los dos dice cuál prefiere (privado, opcional). */}
            {conDesempate ? (
              <section className="tarjeta s5-respondiste" aria-label="Cuál prefieres">
                <div className="rapida-prefiero">
                  <p className="suave">
                    {prefiero
                      ? `Prefieres «${nombreDelPlan(p.franjas, prefiero)}». Es privado y solo desempata si puedes en los dos.`
                      : 'Si puedes en los dos, ¿cuál prefieres? Es privado y solo desempata; puedes dejarlo sin responder.'}
                  </p>
                  {!prefiero ? (
                    <div className="rapida-prefiero-botones">
                      {(['A', 'B'] as Preferencia[]).map((q) => (
                        <Boton key={q} variante="secundario" onClick={() => void preferir(q)} ocupado={prefer.ocupado} ocupadoTexto="Guardando…" disabled={soloLectura}>
                          Prefiero «{nombreDelPlan(p.franjas, q)}»
                        </Boton>
                      ))}
                    </div>
                  ) : null}
                  {prefer.error ? <ErrorCaja error={prefer.error} enfocar /> : null}
                </div>
              </section>
            ) : null}

            <section className="tarjeta s5-grupo" aria-label={`Estado de ${lista.espacio}`}>
              <div className="tarjeta-cabeza">
                <strong className="t-cuerpo">{lista.espacio}</strong>
                <Chip>{etiquetaPlan(p.estado, p.estado_etiqueta)}</Chip>
              </div>
              {respondieron != null && lista.personas > 0 ? (
                <>
                  <div className="s5-barra" role="img" aria-label={`${respondieron} de ${lista.personas} respondieron`}>
                    <span style={{ width: `${Math.min(100, Math.round((respondieron / lista.personas) * 100))}%` }} />
                  </div>
                  <p className="t-nota">
                    {respondieron} de {lista.personas} respondieron
                  </p>
                </>
              ) : null}
              <p className="t-nota s5-nota">
                {s.es_organizador
                  ? 'Cuando haya suficientes respuestas, busca la opción desde el plan.'
                  : 'Quien organiza busca la opción cuando haya suficientes respuestas.'}
              </p>
            </section>

            <div className="s5-filas">
              <button
                type="button"
                className="s5-fila-opcional s5-fila-boton"
                onClick={() => {
                  setSugerida(null)
                  setPrefiero(null)
                  setElegida(null)
                }}
              >
                <span>Cambiar mi respuesta</span>
                <Icono n="chevron" tam={18} />
              </button>
              {algunSi && s.puede.marcar_interes && !s.interesado ? (
                <FilaInteres nota="(opcional · lo ve el grupo)" onTocar={() => void marcarInteres()} ocupado={interes.ocupado} deshabilitado={soloLectura} />
              ) : null}
              {interesNota ? <p role="status">{interesNota}</p> : null}
              {interes.error ? <ErrorCaja error={interes.error} enfocar /> : null}
            </div>

            <a className="btn btn-primario s5-listo" href={verPlan}>
              Listo
            </a>
          </>
        )}
      </div>
      {!elegida ? (
        <>
          {/* Pantalla 6: lo opcional, chico y debajo, cada cosa diciendo quién la ve. Fuera de la hoja para que en la
              computadora (C6) quede a la izquierda, bajo el título; en el teléfono sigue la hoja. */}
          <section className="s5-opcional s5-opcional-afuera" aria-labelledby="s5-opcional-titulo">
            <h2 id="s5-opcional-titulo" className="s5-opcional-titulo">
              Opcional
            </h2>
            {s.puede.marcar_interes && !s.interesado ? (
              <FilaInteres nota="(lo ve el grupo)" onTocar={() => void marcarInteres()} ocupado={interes.ocupado} deshabilitado={soloLectura} />
            ) : null}
            {s.interesado ? <p className="t-nota">Ya avisaste que te interesa (lo ve el grupo; no es confirmar).</p> : null}
            {interesNota ? <p role="status">{interesNota}</p> : null}
            {interes.error ? <ErrorCaja error={interes.error} enfocar /> : null}
            <a
              className="s5-fila-opcional s5-fila-enlace"
              href={rutas.espacio(espacioId)}
              onClick={() => {
                // El grupo abre "Mis preferencias" si encuentra esta marca.
                try {
                  sessionStorage.setItem('cruxe:abrir-preferencias', '1')
                } catch {
                  // Sin almacenamiento: se llega al grupo igual.
                }
              }}
            >
              <span>
                Mis gustos y presupuesto <span className="t-nota">(privado)</span>
              </span>
              <Icono n="chevron" tam={18} />
            </a>
            {/* #90: la agenda es ficticia (simulación) y solo SUGIERE; responder sigue siendo tocar la opción. */}
            {p.franjas.length > 0 ? (
              <TomarDeCalendario
                fila
                franjas={p.franjas}
                semilla={s.miembro_id}
                deshabilitado={soloLectura || guardar.ocupado}
                textoUsar="Ver qué sugiere mi agenda"
                onTomar={(d) => {
                  const o = opciones.find((x) => p.franjas.every((f) => x.disponibilidad[f.clave] === d[f.clave]))
                  if (!o) return
                  setSugerida(o.id)
                  const b = document.getElementById(`rapida-${o.id}`)
                  b?.scrollIntoView({ block: 'center', behavior: 'smooth' })
                  b?.focus({ preventScroll: true })
                }}
              />
            ) : null}
          </section>
          {/* Pantalla 6, abajo y chico: el editor fino (3+ franjas o ajustes que un toque no dice). */}
          <div className="s5-ajustar-afuera">
            <AjustarPorDia
              p={p}
              abierto={!rapidas}
              deshabilitado={soloLectura}
              onGuardado={(np, c) => {
                setCarga({ ...lista!, p: np })
                setElegida({ id: 'dia', texto: 'Condiciones guardadas', detalle: '', disponibilidad: c.disponibilidad })
              }}
            />
          </div>
        </>
      ) : null}
    </div>
  )
}

/** "Avisar que me interesa (lo ve el grupo)": la fila entera es el botón (pantallas 6 y 14). */
function FilaInteres({ nota, onTocar, ocupado, deshabilitado }: { nota: string; onTocar: () => void; ocupado: boolean; deshabilitado: boolean }) {
  return (
    <button
      type="button"
      className="s5-fila-opcional s5-fila-boton"
      onClick={() => {
        if (!ocupado) onTocar()
      }}
      aria-busy={ocupado || undefined}
      disabled={deshabilitado}
    >
      <span>
        {ocupado ? 'Avisando…' : 'Avisar que me interesa'} <span className="t-nota">{nota}</span>
      </span>
      <Icono n="chevron" tam={18} />
    </button>
  )
}
