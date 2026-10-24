// "Buscar el lugar en el mapa" (psico §12 U2, D10). Lo conecta front-juan en `PlanTab.tsx`, en la tarjeta de la opción
// publicada, debajo de la franja y para todo el grupo: <BuscarLugar titulo={p.titulo} demo={espacio.demo} />
import { mostrarBuscarLugar, urlLugar } from './lugarMapa'

export function BuscarLugar({ titulo, demo }: { titulo: string; demo: boolean }) {
  if (!mostrarBuscarLugar(demo, titulo)) return null
  return (
    <div className="buscar-lugar">
      <a className="btn btn-secundario btn-chico" href={urlLugar(titulo)} target="_blank" rel="noopener noreferrer">
        Buscar el lugar en el mapa
      </a>
      <p className="suave">Abre Google Maps con el nombre del plan. CRUXE no sabe desde dónde sales.</p>
    </div>
  )
}
