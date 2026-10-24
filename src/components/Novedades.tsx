// Novedades del grupo (pedido de Juan: "que a los que se metieron les llegue una notificación"). Avisos DENTRO de
// CRUXE armados solo con lo que el servidor ya le muestra a cada persona: quién está en el grupo (get_space), el
// estado de cada plan (list_proposals) y su historial público (get_proposal_state). Nunca condiciones ni conteos que
// el servidor reserva al organizador; la baja va sin nombre (enmienda 13 c). No decide nada ni escribe en la base.
// Cómo: un único sondeo compartido por todas las pantallas que lo muestran, que compara con la última foto guardada
// en este navegador (localStorage) y convierte las diferencias en avisos. La primera vez solo toma la foto.
// Con el teléfono bloqueado no llega nada: eso necesita push (service worker, claves y un emisor en el servidor).
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { api } from '../lib/api'
import type { EspacioResumen, EstadoPropuesta, Evento, PropuestaResumen } from '../lib/types'
import { franjaTexto } from '../lib/format'
import { rutas } from '../lib/shell'
import { vibrar } from '../lib/tacto'
import { Icono } from './Icono'

export interface Novedad {
  id: string
  /** Miembro de quien mira en ese grupo: en un navegador compartido, cada persona ve solo las suyas. */
  miembroId: string
  espacio: string
  href: string
  propuestaId: string | null
  texto: string
  /** Hora local de este teléfono en que se detectó (solo para ordenar y mostrar "hace un rato"). */
  en: number
  visto: boolean
}

interface FotoEspacio {
  miembroId: string
  /** Ids de quienes ya entraron (sin los anotados que todavía no abrieron el enlace). */
  dentro: string[]
}
interface FotoPropuesta {
  rev: number
  turno: boolean
}
interface Guardado {
  espacios: Record<string, FotoEspacio>
  propuestas: Record<string, FotoPropuesta>
  items: Novedad[]
}

const CLAVE = 'cruxe:novedades:v1'
const CLAVE_SISTEMA = 'cruxe:novedades:sistema'
const CADA_MS = 30000
// La primera revisión espera: no compite con la carga de la pantalla que se abre (ni suma pedidos a la base justo
// ahí). Lo ya guardado se ve al instante. Volver a la pestaña revisa, pero no más de una vez cada 15 s.
const PRIMERA_MS = 10000
const VOLVER_MS = 15000
const MAX_GRUPOS = 8
const MAX_ITEMS = 40

function leer(): Guardado {
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE) ?? 'null') as Guardado | null
    if (g && typeof g === 'object' && g.espacios && g.propuestas && Array.isArray(g.items)) return g
  } catch {
    // Sin almacenamiento o dato roto: se empieza de cero (solo se pierde la foto anterior).
  }
  return { espacios: {}, propuestas: {}, items: [] }
}

function escribir(g: Guardado) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(g))
  } catch {
    // Sin almacenamiento: las novedades duran mientras la página esté abierta.
  }
}

// ---------------------------------------------------------------- almacén compartido

let datos: Guardado = typeof window === 'undefined' ? { espacios: {}, propuestas: {}, items: [] } : leer()
/** Miembros de la sesión actual (de list_my_spaces): solo se muestran sus novedades. */
let mios = new Set<string>()
/** Novedades que llegaron con la página abierta (para el aviso flotante; no las de visitas anteriores). */
let recientes: Novedad[] = []
let version = 0
const oyentes = new Set<() => void>()
let timer: ReturnType<typeof setTimeout> | undefined
let enCurso = false
/** Hora de la última revisión terminada (0: todavía ninguna en esta página). */
let ultima = 0

function avisar() {
  version++
  for (const o of oyentes) o()
}

function suscribir(o: () => void) {
  oyentes.add(o)
  if (oyentes.size === 1) arrancar()
  return () => {
    oyentes.delete(o)
    if (oyentes.size === 0) parar()
  }
}

function visibilidad() {
  if (document.visibilityState === 'visible' && ultima > 0 && Date.now() - ultima > VOLVER_MS) void revisar()
}

/** Revisión ya (la usa el banco de prueba offline para no esperar los tiempos reales). */
function forzar() {
  void revisar()
}

function arrancar() {
  programar(ultima > 0 && Date.now() - ultima > CADA_MS ? 0 : PRIMERA_MS)
  document.addEventListener('visibilitychange', visibilidad)
  window.addEventListener('cruxe:revisar-novedades', forzar)
}

function parar() {
  if (timer) clearTimeout(timer)
  timer = undefined
  document.removeEventListener('visibilitychange', visibilidad)
  window.removeEventListener('cruxe:revisar-novedades', forzar)
}

function programar(ms = CADA_MS) {
  if (timer) clearTimeout(timer)
  timer = oyentes.size > 0 ? setTimeout(() => void revisar(), ms) : undefined
}

// ---------------------------------------------------------------- de lo que cambió a un aviso

const conTitulo = (p: { titulo: string }) => `«${p.titulo}»`

/** Texto de un evento del historial para quien no lo hizo. Solo eventos que el grupo ya ve en "Historial". */
function textoEvento(e: Evento, p: EstadoPropuesta): string | null {
  const franja =
    p.opcion && (e.version_nueva == null || e.version_nueva === p.opcion.version)
      ? `: ${franjaTexto(p.opcion.franja.inicio, p.opcion.franja.fin)}`
      : ''
  switch (e.tipo) {
    case 'propuesta_abierta':
      return `${e.actor?.nombre ?? 'Alguien'} propuso ${conTitulo(p)}. Marca cuándo puedes (es privado).`
    case 'opcion_publicada':
      return `${conTitulo(p)}: hay una opción${franja}.`
    case 'aceptacion':
      if (e.estado_nuevo === 'grupo_confirmado') return `${conTitulo(p)}: ¡grupo confirmado, se juntan!${franja ? franja.replace(': ', ' ') : ''}`
      // Enmienda 13 (c): la aceptación de quien después se retiró llega sin actor; nunca se completa con un nombre.
      return `${e.actor?.nombre ?? 'Una persona'} confirmó la versión ${e.version_nueva ?? e.version_previa ?? ''} de ${conTitulo(p)}.`.replace(' versión  de', ' versión de')
    case 'baja':
      // Enmienda 13 (c): sin nombre ni motivo, aunque llegue un actor.
      return e.estado_nuevo === 'en_revision'
        ? `${conTitulo(p)}: una persona se retiró y el plan quedó en revisión.`
        : `${conTitulo(p)}: una persona se retiró.`
    case 'reparacion_publicada':
      return `${conTitulo(p)}: hay una versión nueva${franja}. Las confirmaciones anteriores no cuentan.`
    case 'propuesta_cancelada':
      return `${conTitulo(p)} se canceló.`
    case 'propuesta_expirada':
      return `${conTitulo(p)}: venció el plazo para confirmar.`
    default:
      return null
  }
}

const esTurno = (p: PropuestaResumen) => p.siguiente_accion.codigo === 'te_toca_aceptar'

let secuencia = 0
function nuevoId() {
  secuencia++
  return `${Date.now().toString(36)}-${secuencia}`
}

async function revisarEspacio(e: EspacioResumen, previo: Guardado, nuevas: Novedad[], siguiente: Guardado) {
  const yo = e.mi_miembro_id
  const fotoE = previo.espacios[e.id]
  // Grupo recién visto o con otra persona en este navegador: solo se toma la foto, sin avisos.
  const conocido = fotoE != null && fotoE.miembroId === yo
  const href = rutas.espacio(e.id)
  const agregar = (texto: string, propuestaId: string | null, destino = href) =>
    nuevas.push({ id: nuevoId(), miembroId: yo, espacio: e.nombre, href: destino, propuestaId, texto, en: Date.now(), visto: false })

  const [esp, lista] = await Promise.all([api.getSpace(e.id), api.listProposals(e.id)])
  if (esp.ok) {
    const dentro = esp.data.espacio.miembros.filter((m) => !m.pendiente)
    if (conocido) {
      for (const m of dentro) {
        if (!m.es_yo && !fotoE.dentro.includes(m.miembro_id)) agregar(`${m.nombre} entró a «${e.nombre}».`, null)
      }
    }
    siguiente.espacios[e.id] = { miembroId: yo, dentro: dentro.map((m) => m.miembro_id) }
  } else if (fotoE) {
    siguiente.espacios[e.id] = fotoE
  }

  if (!lista.ok) {
    for (const [id, f] of Object.entries(previo.propuestas)) if (id.startsWith(`${e.id}:`)) siguiente.propuestas[id] = f
    return
  }
  for (const p of lista.data.propuestas) {
    const clave = `${e.id}:${p.id}`
    const fotoP = previo.propuestas[clave]
    siguiente.propuestas[clave] = { rev: p.state_rev, turno: esTurno(p) }
    const destino = rutas.propuesta(e.id, p.id)
    if (!conocido) continue
    // Plan nuevo o con cambios: el historial dice qué pasó desde la última foto (un pedido por plan que cambió).
    if (!fotoP || fotoP.rev !== p.state_rev) {
      const st = await api.getProposalState(p.id)
      if (st.ok && st.data.sin_cambios !== true) {
        const estado = st.data.propuesta
        const desde = fotoP?.rev ?? -1
        for (const ev of estado.historial) {
          if (ev.state_rev <= desde) continue
          // Lo que hizo uno mismo no se avisa (sí lo que el sistema hizo, como un plazo que vence).
          if (ev.actor?.miembro_id === yo || ev.ejecutado_por?.miembro_id === yo) continue
          const texto = textoEvento(ev, estado)
          if (texto) agregar(texto, p.id, destino)
        }
      }
    }
    // Lo que le toca a esta persona, aunque el evento lo haya disparado otra (el servidor lo dice en siguiente_accion).
    if (esTurno(p) && !fotoP?.turno) agregar(`${conTitulo(p)}: ${p.siguiente_accion.texto}`, p.id, destino)
  }
}

async function revisar() {
  if (enCurso) return
  enCurso = true
  try {
    const r = await api.listMySpaces()
    if (!r.ok) return
    const espacios = r.data.espacios.slice(0, MAX_GRUPOS)
    mios = new Set(r.data.espacios.map((e) => e.mi_miembro_id))
    const previo = leer()
    const siguiente: Guardado = { espacios: {}, propuestas: {}, items: previo.items }
    const nuevas: Novedad[] = []
    for (const e of espacios) await revisarEspacio(e, previo, nuevas, siguiente)
    siguiente.items = [...nuevas.reverse(), ...previo.items].slice(0, MAX_ITEMS)
    datos = siguiente
    escribir(datos)
    if (nuevas.length > 0) {
      recientes = [...nuevas, ...recientes].slice(0, 5)
      vibrar([12, 60, 12])
      avisarSistema(nuevas)
    }
    avisar()
  } finally {
    enCurso = false
    ultima = Date.now()
    programar()
  }
}

// ---------------------------------------------------------------- notificación del sistema (solo compu)

/** En Android, `new Notification` no existe sin service worker; en iOS, solo con la app instalada. */
export function sistemaDisponible(): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) return false
  return !window.matchMedia?.('(pointer: coarse)').matches
}

function sistemaActivado(): boolean {
  try {
    return sistemaDisponible() && Notification.permission === 'granted' && localStorage.getItem(CLAVE_SISTEMA) === '1'
  } catch {
    return false
  }
}

function avisarSistema(nuevas: Novedad[]) {
  if (!sistemaActivado() || document.visibilityState === 'visible') return
  for (const n of nuevas.slice(0, 3)) {
    try {
      const aviso = new Notification(`CRUXE · ${n.espacio}`, { body: n.texto, tag: n.id })
      aviso.onclick = () => {
        window.focus()
        window.location.hash = n.href
        aviso.close()
      }
    } catch {
      // El navegador no deja crearla (por ejemplo, sin service worker): quedan los avisos dentro de CRUXE.
    }
  }
}

// ---------------------------------------------------------------- hooks y vistas

function useAlmacen() {
  return useSyncExternalStore(suscribir, () => version, () => version)
}

/** Las novedades de la persona de esta sesión, de la más nueva a la más vieja. */
export function useNovedades() {
  useAlmacen()
  const items = datos.items.filter((n) => mios.size === 0 || mios.has(n.miembroId))
  return {
    items,
    sinVer: items.filter((n) => !n.visto).length,
    marcarVistas: () => {
      datos = { ...datos, items: datos.items.map((n) => (mios.size === 0 || mios.has(n.miembroId) ? { ...n, visto: true } : n)) }
      escribir(datos)
      recientes = []
      avisar()
    },
  }
}

function haceUnRato(en: number): string {
  const min = Math.round((Date.now() - en) / 60000)
  if (min < 1) return 'recién'
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  return h < 24 ? `hace ${h} h` : `hace ${Math.round(h / 24)} d`
}

/** Tarjeta "Novedades" (Inicio y Mis planes). Con `siempre`, se muestra también vacía, con la explicación. */
export function NovedadesTarjeta({ siempre = false }: { siempre?: boolean }) {
  const { items, sinVer, marcarVistas } = useNovedades()
  const [sistema, setSistema] = useState(sistemaActivado)
  const [notaSistema, setNotaSistema] = useState<string | null>(null)
  if (items.length === 0 && !siempre) return null

  async function activarSistema() {
    setNotaSistema(null)
    try {
      const permiso = await Notification.requestPermission()
      if (permiso !== 'granted') {
        setNotaSistema('El navegador no dio permiso. Los avisos siguen apareciendo dentro de CRUXE.')
        return
      }
      new Notification('CRUXE', { body: 'Listo: te avisamos aquí mientras CRUXE esté abierto en esta compu.' })
      localStorage.setItem(CLAVE_SISTEMA, '1')
      setSistema(true)
    } catch {
      setNotaSistema('Este navegador no permite estos avisos. Los avisos siguen apareciendo dentro de CRUXE.')
    }
  }

  const visibles = items.slice(0, 6)
  return (
    <section className="tarjeta novedades" aria-labelledby="novedades-titulo">
      <div className="tarjeta-cabeza">
        <h2 id="novedades-titulo">
          <Icono n="campana" tam={18} /> Novedades
        </h2>
        {sinVer > 0 ? (
          <span className="etiqueta etiqueta-destacada num">
            {sinVer} <span className="visualmente-oculto">{sinVer === 1 ? 'novedad sin ver' : 'novedades sin ver'}</span>
          </span>
        ) : null}
      </div>
      {visibles.length > 0 ? (
        <ul className="novedades-lista">
          {visibles.map((n) => (
            <li key={n.id} className={n.visto ? '' : 'novedad-nueva'}>
              <a href={n.href} onClick={marcarVistas}>
                <span className="novedad-texto">{n.texto}</span>
                <span className="novedad-meta">
                  {n.espacio} · {haceUnRato(n.en)}
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="suave">Cuando alguien entre a tu grupo, haya una opción o alguien confirme, te avisamos aquí.</p>
      )}
      {sinVer > 0 ? (
        <button type="button" className="enlace" onClick={marcarVistas}>
          Marcar como vistas
        </button>
      ) : null}
      <p className="suave novedades-nota">
        Solo lo que el grupo ya puede ver: nunca cuándo puede cada uno. Llegan mientras CRUXE está abierto; con el
        teléfono bloqueado todavía no.
      </p>
      {sistemaDisponible() && !sistema ? (
        <button type="button" className="btn btn-secundario btn-chico" onClick={() => void activarSistema()}>
          <Icono n="campana" tam={16} /> Avisarme también con una notificación en esta compu
        </button>
      ) : null}
      {notaSistema ? <p role="status">{notaSistema}</p> : null}
    </section>
  )
}

/**
 * Aviso flotante arriba de la pantalla cuando llega una novedad con la página abierta. Se va solo a los 8 s.
 * `excluirPropuesta`: en la pantalla de ese plan no se avisa lo que ya se ve ahí mismo.
 */
export function AvisoNovedades({ excluirPropuesta }: { excluirPropuesta?: string }) {
  useAlmacen()
  const ultima = recientes.find((n) => !n.visto && n.propuestaId !== excluirPropuesta && (mios.size === 0 || mios.has(n.miembroId))) ?? null
  const [cerrada, setCerrada] = useState<string | null>(null)
  const montado = useRef(Date.now())
  const visible = ultima && ultima.id !== cerrada && ultima.en >= montado.current - CADA_MS ? ultima : null
  useEffect(() => {
    if (!visible) return
    const t = setTimeout(() => setCerrada(visible.id), 8000)
    return () => clearTimeout(t)
  }, [visible])
  if (!visible) return null
  return (
    <div className="aviso-novedad" role="status" aria-live="polite">
      <Icono n="campana" tam={18} />
      <a href={visible.href} onClick={() => setCerrada(visible.id)}>
        <span className="novedad-meta">{visible.espacio}</span>
        <span className="novedad-texto">{visible.texto}</span>
      </a>
      <button type="button" className="aviso-novedad-cerrar" aria-label="Cerrar aviso" onClick={() => setCerrada(visible.id)}>
        <Icono n="cerrar" tam={16} />
      </button>
    </div>
  )
}
