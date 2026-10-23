// Identidad de CRUCE: dos caminos que se cruzan y un punto donde se encuentran.
// Dibujo propio en SVG, sin dependencias. Usa currentColor para heredar el color del texto.

export function Logo({ tam = 28, titulo }: { tam?: number; titulo?: string }) {
  return (
    <svg
      className="logo"
      width={tam}
      height={tam}
      viewBox="0 0 32 32"
      role={titulo ? 'img' : undefined}
      aria-label={titulo}
      aria-hidden={titulo ? undefined : true}
    >
      <path d="M5 6 C 13 12, 19 20, 27 26" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M27 6 C 19 12, 13 20, 5 26" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" opacity="0.55" />
      <circle cx="16" cy="16" r="4.6" className="logo-punto" />
    </svg>
  )
}

/** Logo y nombre juntos, para el encabezado y la portada. */
export function Marca({ grande = false }: { grande?: boolean }) {
  return (
    <span className={`marca-bloque ${grande ? 'marca-grande' : ''}`}>
      <Logo tam={grande ? 56 : 24} />
      <span className="marca-nombre">CRUCE</span>
    </span>
  )
}
