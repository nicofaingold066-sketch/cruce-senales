// Preferencia visual del navegador; no forma parte de los gustos privados de un grupo.
export type ModoTema = 'light' | 'dark' | 'system'

const CLAVE = 'cruxe:tema:v1'
const oyentes = new Set<() => void>()

function esModoTema(valor: unknown): valor is ModoTema {
  return valor === 'light' || valor === 'dark' || valor === 'system'
}

function leerPersistido(): ModoTema {
  // El respaldo de sesión solo se escribe cuando falla localStorage. Va primero
  // para que un valor local antiguo no tape la última elección de esta pestaña.
  for (const tipo of ['sessionStorage', 'localStorage'] as const) {
    try {
      const valor = window[tipo].getItem(CLAVE)
      if (esModoTema(valor)) return valor
    } catch {
      // Sin almacenamiento, la elección sigue funcionando en memoria.
    }
  }
  return 'system'
}

const anterior = import.meta.hot?.data.modoTema
let modo: ModoTema = esModoTema(anterior) ? anterior : leerPersistido()
const sistema = window.matchMedia?.('(prefers-color-scheme: dark)')

function aplicarTema() {
  const tema = modo === 'system' ? (sistema?.matches ? 'dark' : 'light') : modo
  document.documentElement.dataset.theme = tema
  document.documentElement.style.colorScheme = tema
}

function notificar() {
  oyentes.forEach((oyente) => oyente())
}

/** Snapshot estable para useSyncExternalStore, sin lecturas de almacenamiento al renderizar. */
export function leerTema(): ModoTema {
  return modo
}

export function suscribirTema(oyente: () => void): () => void {
  oyentes.add(oyente)
  return () => {
    oyentes.delete(oyente)
  }
}

export function cambiarTema(nuevo: ModoTema) {
  if (!esModoTema(nuevo)) return
  modo = nuevo

  try {
    window.localStorage.setItem(CLAVE, nuevo)
    try {
      window.sessionStorage.removeItem(CLAVE)
    } catch {
      // La elección principal ya quedó guardada.
    }
  } catch {
    try {
      window.sessionStorage.setItem(CLAVE, nuevo)
    } catch {
      // La elección en memoria y el cambio visual no dependen del guardado.
    }
  }

  aplicarTema()
  notificar()
}

function alCambiarSistema() {
  if (modo === 'system') aplicarTema()
}

function alCambiarAlmacenamiento(evento: StorageEvent) {
  if (evento.key !== CLAVE && evento.key !== null) return
  const nuevo = leerPersistido()
  if (nuevo === modo) return
  modo = nuevo
  aplicarTema()
  notificar()
}

// La app sigue el sistema incluso antes de abrir el selector.
aplicarTema()
sistema?.addEventListener('change', alCambiarSistema)
window.addEventListener('storage', alCambiarAlmacenamiento)

if (import.meta.hot) {
  import.meta.hot.dispose((datos) => {
    datos.modoTema = modo
    sistema?.removeEventListener('change', alCambiarSistema)
    window.removeEventListener('storage', alCambiarAlmacenamiento)
    oyentes.clear()
  })
}
