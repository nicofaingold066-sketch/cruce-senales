import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import { alIncompatible, api, contratoIncompatible, nuevoIntento } from './api'
import type { ApiError, ApiResult, Disponibilidad, EstadoPropuesta, Momento } from './types'

// ---------------------------------------------------------------- conexión

export function useOnline(): boolean {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

export function useContratoIncompatible(): boolean {
  const [v, setV] = useState(contratoIncompatible())
  useEffect(() => alIncompatible(() => setV(true)), [])
  return v
}

// ---------------------------------------------------------------- sesión

export type FaseSesion = { fase: 'cargando' } | { fase: 'lista' } | { fase: 'error'; mensaje: string }

let promesaSesion: Promise<string | null> | null = null

/** Crea la sesión anónima solo si no existe una (contrato 0.1). Una sola ejecución aunque React monte dos veces. */
function asegurarSesion(): Promise<string | null> {
  if (!promesaSesion) {
    promesaSesion = (async () => {
      const { data, error } = await supabase.auth.getSession()
      if (error) return error.message
      if (data.session) return null
      const r = await supabase.auth.signInAnonymously()
      if (r.error) return r.error.message
      return null
    })().then((res) => {
      if (res !== null) promesaSesion = null // permite reintentar
      return res
    })
  }
  return promesaSesion
}

export function useSesion(): { sesion: FaseSesion; reintentar: () => void } {
  const [sesion, setSesion] = useState<FaseSesion>({ fase: 'cargando' })
  const [intento, setIntento] = useState(0)
  useEffect(() => {
    let vivo = true
    setSesion({ fase: 'cargando' })
    asegurarSesion().then((err) => {
      if (!vivo) return
      if (err === null) {
        setSesion({ fase: 'lista' })
        // Verifica la versión del contrato; no bloquea si falla.
        void api.serverInfo()
      } else {
        setSesion({
          fase: 'error',
          mensaje:
            'No se pudo iniciar la sesión. Revisa tu conexión; si persiste, el inicio de sesión anónimo puede estar deshabilitado en el proyecto.',
        })
      }
    })
    return () => {
      vivo = false
    }
  }, [intento])
  return { sesion, reintentar: () => setIntento((n) => n + 1) }
}

// ---------------------------------------------------------------- sondeo

/** Ejecuta fn cada ms milisegundos mientras enabled; nunca solapa dos ejecuciones. */
export function useSondeo(fn: () => Promise<void>, ms: number, enabled = true) {
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => {
    if (!enabled) return
    let vivo = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const ciclo = async () => {
      try {
        await ref.current()
      } finally {
        if (vivo) timer = setTimeout(ciclo, ms)
      }
    }
    timer = setTimeout(ciclo, ms)
    const visible = () => {
      if (document.visibilityState === 'visible') void ref.current()
    }
    document.addEventListener('visibilitychange', visible)
    return () => {
      vivo = false
      if (timer) clearTimeout(timer)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [ms, enabled])
}

// ---------------------------------------------------------------- acciones con intento

/**
 * Ejecuta una mutación sin doble envío. Genera un id de intento al hacer clic y lo reutiliza solo
 * para reintentos del MISMO clic tras un fallo reintentable (misma "huella"). Contrato 0.7.
 */
export function useAccion() {
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const intento = useRef<{ huella: string; id: string } | null>(null)
  const enVuelo = useRef(false)
  const montado = useRef(true)
  useEffect(() => {
    montado.current = true
    return () => {
      montado.current = false
    }
  }, [])

  async function ejecutar<T>(
    huella: string,
    fn: (intentoId: string) => Promise<ApiResult<T>>,
  ): Promise<ApiResult<T> | null> {
    if (enVuelo.current) return null
    enVuelo.current = true
    setOcupado(true)
    setError(null)
    if (!intento.current || intento.current.huella !== huella) {
      intento.current = { huella, id: nuevoIntento() }
    }
    let r: ApiResult<T>
    try {
      r = await fn(intento.current.id)
    } finally {
      enVuelo.current = false
    }
    if (r.ok || !r.error.reintentable) intento.current = null
    if (montado.current) {
      setOcupado(false)
      if (!r.ok) setError(r.error)
    }
    return r
  }

  return { ocupado, error, ejecutar, limpiarError: () => setError(null) }
}

// ---------------------------------------------------------------- propuesta viva

export interface PropuestaViva {
  propuesta: EstadoPropuesta | null
  servidorAhora: Momento | null
  recibidoEn: number
  /** Error de la carga inicial (sin datos todavía). */
  errorInicial: ApiError | null
  /** Falló la última actualización pero hay datos previos. */
  sinActualizar: ApiError | null
  /** La propuesta ya no existe o dejaste de ser miembro (por ejemplo, tras reiniciar la demo). */
  fuera: boolean
  cargando: boolean
  refrescar: () => Promise<void>
  /** Aplica la respuesta de una mutación: usa la propuesta devuelta o, si el error trae state_rev mayor, refresca. */
  aplicarResultado: (r: ApiResult<{ propuesta: EstadoPropuesta; servidor_ahora: Momento }>) => void
}

/** Estado vivo de una propuesta. Una respuesta con state_rev menor al ya aplicado se descarta (contrato 4). */
export function usePropuestaViva(propuestaId: string): PropuestaViva {
  const [propuesta, setPropuesta] = useState<EstadoPropuesta | null>(null)
  const [servidor, setServidor] = useState<{ ahora: Momento; recibido: number } | null>(null)
  const [errorInicial, setErrorInicial] = useState<ApiError | null>(null)
  const [sinActualizar, setSinActualizar] = useState<ApiError | null>(null)
  const [fuera, setFuera] = useState(false)
  const [cargando, setCargando] = useState(true)
  const rev = useRef(-1)
  const enVuelo = useRef(false)
  const repetir = useRef(false)

  const aplicar = useCallback(
    (p: EstadoPropuesta, ahora: Momento) => {
      if (p.id !== propuestaId) return
      if (p.state_rev < rev.current) return // respuesta atrasada: nunca pisa una más nueva
      rev.current = p.state_rev
      setPropuesta(p)
      setServidor({ ahora, recibido: Date.now() })
    },
    [propuestaId],
  )

  const refrescar = useCallback(async () => {
    if (enVuelo.current) {
      repetir.current = true
      return
    }
    enVuelo.current = true
    try {
      do {
        repetir.current = false
        const r = await api.getProposalState(propuestaId)
        if (r.ok) {
          aplicar(r.data.propuesta, r.data.servidor_ahora)
          setSinActualizar(null)
          setErrorInicial(null)
        } else if (r.error.codigo === 'fuera_de_audiencia') {
          setFuera(true)
        } else {
          if (rev.current < 0) setErrorInicial(r.error)
          else setSinActualizar(r.error)
          if (r.error.codigo === 'sesion_invalida') break
        }
        setCargando(false)
      } while (repetir.current)
    } finally {
      enVuelo.current = false
    }
  }, [propuestaId, aplicar])

  useEffect(() => {
    void refrescar()
  }, [refrescar])

  useSondeo(refrescar, 3000, !fuera)

  const aplicarResultado = useCallback(
    (r: ApiResult<{ propuesta: EstadoPropuesta; servidor_ahora: Momento }>) => {
      if (r.ok) {
        aplicar(r.data.propuesta, r.data.servidor_ahora)
        setSinActualizar(null)
      } else if (r.error.codigo === 'fuera_de_audiencia' && r.error.detalle === 'no_miembro') {
        setFuera(true)
      } else if (r.error.state_rev != null && r.error.state_rev > rev.current) {
        void refrescar()
      } else if (
        r.error.resultadoIncierto ||
        r.error.codigo === 'intento_obsoleto' ||
        r.error.codigo === 'opcion_desactualizada' ||
        r.error.codigo === 'cupo_completo' ||
        r.error.codigo === 'plazo_vencido'
      ) {
        // Resultado incierto: se refresca el estado; el intento original se conserva (useAccion) para reintentar.
        void refrescar()
      }
    },
    [aplicar, refrescar],
  )

  return {
    propuesta,
    servidorAhora: servidor?.ahora ?? null,
    recibidoEn: servidor?.recibido ?? 0,
    errorInicial,
    sinActualizar,
    fuera,
    cargando,
    refrescar,
    aplicarResultado,
  }
}

// ---------------------------------------------------------------- borrador de condiciones

export function normalizar(d: Disponibilidad | null | undefined, claves: string[]): Disponibilidad {
  const o: Disponibilidad = {}
  for (const c of claves) o[c] = d?.[c] ?? 'pendiente'
  return o
}

/** Borrador local de condiciones: el sondeo nunca pisa lo que la persona está escribiendo. */
export function useBorradorCondiciones(servidor: Disponibilidad | null, claves: string[]) {
  const srvKey = JSON.stringify(normalizar(servidor, claves))
  const [draft, setDraft] = useState<Disponibilidad>(() => normalizar(servidor, claves))
  const ultimo = useRef(srvKey)
  const draftRef = useRef(draft)
  draftRef.current = draft
  useEffect(() => {
    if (srvKey === ultimo.current) return
    const estabaSucio = JSON.stringify(draftRef.current) !== ultimo.current
    ultimo.current = srvKey
    if (!estabaSucio) setDraft(JSON.parse(srvKey) as Disponibilidad)
  }, [srvKey])
  const sucio = JSON.stringify(draft) !== srvKey
  return {
    draft,
    sucio,
    poner: (clave: string, v: Disponibilidad[string]) => setDraft((d) => ({ ...d, [clave]: v })),
    reemplazar: (d: Disponibilidad) => setDraft(normalizar(d, claves)),
    descartar: () => setDraft(JSON.parse(srvKey) as Disponibilidad),
  }
}

// ---------------------------------------------------------------- mutaciones sobre una propuesta

/**
 * Acción sobre una propuesta: ejecuta con intento reutilizable y aplica la respuesta al estado vivo
 * (respetando state_rev). Un error con state_rev mayor dispara un refresco inmediato.
 */
export function useMutacion(viva: PropuestaViva) {
  const accion = useAccion()
  async function correr<T extends { propuesta: EstadoPropuesta; servidor_ahora: Momento }>(
    huella: string,
    fn: (intentoId: string) => Promise<ApiResult<T>>,
  ): Promise<ApiResult<T> | null> {
    const r = await accion.ejecutar(huella, fn)
    if (r) viva.aplicarResultado(r)
    return r
  }
  return { ...accion, correr }
}

/** Reloj local para cuentas regresivas informativas. */
export function useAhora(ms = 1000): number {
  const [ahora, setAhora] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), ms)
    return () => clearInterval(t)
  }, [ms])
  return ahora
}
