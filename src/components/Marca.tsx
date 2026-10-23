// Identidad de CRUXE: una X de trazo grueso (el plan) y un trazo fino partido en dos (dos personas)
// que llegan al cruce desde lados opuestos y se encuentran en su borde. Dibujo propio en SVG, sin dependencias.
// El trazo grueso usa el color de la marca (currentColor); el fino y los puntos, el de --punto.

export function Trazos() {
  return (
    <>
      <path d="M9 6 L35 6 L91 94 L65 94 Z" fill="currentColor" />
      <path className="logo-b" d="M89 8 L64.4 34.5 M11 92 L35.6 65.5" fill="none" strokeWidth="8.5" strokeLinecap="round" />
      <circle className="logo-b-relleno" cx="64.4" cy="34.5" r="7.2" />
      <circle className="logo-b-relleno" cx="35.6" cy="65.5" r="7.2" />
    </>
  )
}

/** La X sola (ícono). */
export function Logo({ tam = 28, titulo }: { tam?: number; titulo?: string }) {
  return (
    <svg
      className="logo"
      width={tam}
      height={tam}
      viewBox="0 0 100 100"
      role={titulo ? 'img' : undefined}
      aria-label={titulo}
      aria-hidden={titulo ? undefined : true}
    >
      <Trazos />
    </svg>
  )
}

/** Nombre con la X del logo integrada: CRU✕E. Para el encabezado y la portada. */
export function Marca({ grande = false }: { grande?: boolean }) {
  return (
    <span className={`marca-bloque ${grande ? 'marca-grande' : ''}`} role="img" aria-label="CRUXE">
      <span className="marca-nombre" aria-hidden="true">
        CRU
        <svg className="marca-x" viewBox="0 0 100 100">
          <Trazos />
        </svg>
        E
      </span>
    </span>
  )
}
