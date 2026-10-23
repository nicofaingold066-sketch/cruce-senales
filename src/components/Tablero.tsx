// Código en "tablero de aeropuerto" (idea del Split Flap Display de componentry.dev, propio y en CSS):
// cada carácter es una paleta que cae en su lugar, en cascada. El texto sigue siendo el código tal cual
// (se lee, se copia y lo encuentran las pruebas en strong.codigo).
export function Tablero({ codigo, como: Etiqueta = 'strong' }: { codigo: string; como?: 'strong' | 'span' }) {
  return (
    <Etiqueta className="codigo tablero">
      {Array.from(codigo).map((c, i) => (
        <span key={`${i}-${c}`} className="tablero-celda" style={{ animationDelay: `${120 + i * 70}ms` }}>
          {c}
        </span>
      ))}
    </Etiqueta>
  )
}
