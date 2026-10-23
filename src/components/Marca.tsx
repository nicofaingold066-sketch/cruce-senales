// Identidad de CRUXE: dos trazos que vienen de lados opuestos y se encuentran en el centro.
// Juntos forman la X de CRUXE. Dibujo propio en SVG, sin dependencias.
// El trazo izquierdo usa el color de la marca (currentColor) y el derecho el de --punto.

function Trazos() {
  return (
    <>
      <path d="M8 9 L21 24 L8 39" fill="none" stroke="currentColor" strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path className="logo-b" d="M40 9 L27 24 L40 39" fill="none" strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round" />
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
      viewBox="3 4 42 40"
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
        <svg className="marca-x" viewBox="5 6 38 36">
          <Trazos />
        </svg>
        E
      </span>
    </span>
  )
}
