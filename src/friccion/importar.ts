// #82: cuando la red cambia (wifi ↔ datos, ERR_NETWORK_CHANGED) mientras se baja una parte del paquete, el import de
// esa pantalla falla y el navegador recuerda el fallo de esa URL hasta recargar. Se reintenta UNA vez pidiendo la
// misma parte con otra URL (`?r=1`); si vuelve a fallar, el error sube a la barrera de App.tsx, que ofrece "Recargar".

/** URL del módulo que no se pudo bajar, si el navegador la dice (Chrome y Firefox sí; Safari no). */
export function urlDelError(e: unknown): string | null {
  const msg = e instanceof Error ? e.message : String(e)
  const m = /(https?:\/\/[^\s'"]+?\.(?:m?js|tsx?))(?:\?[^\s'"]*)?(?=$|[\s'"])/.exec(msg)
  return m ? m[1] : null
}

/** Marca de los errores de carga de una pantalla, para que la barrera los distinga de un fallo al dibujar. */
export class ErrorDeCarga extends Error {
  constructor(causa: unknown) {
    super('No se pudo bajar una parte de la aplicación')
    this.name = 'ErrorDeCarga'
    this.cause = causa
  }
}

export function esErrorDeCarga(e: unknown): boolean {
  if (e instanceof ErrorDeCarga) return true
  const msg = e instanceof Error ? e.message : String(e)
  return /dynamically imported module|importing a module script failed|unable to preload|error loading/i.test(msg)
}

/**
 * Envuelve el import de una pantalla: comparte la misma promesa entre la precarga y React.lazy (una sola bajada) y,
 * si falla, reintenta una vez con `?r=1`. Si el reintento también falla, olvida la promesa (la próxima vez prueba
 * de nuevo) y lanza ErrorDeCarga.
 */
export function conReintento<T>(cargar: () => Promise<T>): () => Promise<T> {
  let enCurso: Promise<T> | null = null
  return () => {
    enCurso ??= cargar().catch(async (e: unknown) => {
      const url = urlDelError(e)
      try {
        // Sin URL (Safari) se repite el mismo import: algunos navegadores no recuerdan el fallo.
        return url ? ((await import(/* @vite-ignore */ `${url}?r=1`)) as T) : await cargar()
      } catch {
        enCurso = null
        throw new ErrorDeCarga(e)
      }
    })
    return enCurso
  }
}
