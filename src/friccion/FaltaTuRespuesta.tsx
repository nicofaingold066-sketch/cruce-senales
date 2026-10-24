// Fricción (docs/flujo-usuario.md §3.3.1 y §3.3.4): quien todavía no respondió ve, en el plan, un acceso directo a
// "¿Cuándo puedes?" (respuesta de un toque). Sobre todo el organizador: si busca la opción antes de responder y es
// quien no puede faltar, no hay opción posible. Solo usa lo que el servidor ya decidió (`puede.guardar_condiciones`,
// `condiciones`, `imprescindible`); no calcula nada. front-juan lo conecta en PlanTab.tsx, antes de <BuscarOpcion/>:
//   <FaltaTuRespuesta p={p} espacioId={p.espacio_id} />
import type { EstadoPropuesta } from '../lib/types'
import { rutas } from '../lib/shell'
import { Icono } from '../components/Icono'
import './friccion.css'

export function FaltaTuRespuesta({ p, espacioId }: { p: EstadoPropuesta; espacioId: string }) {
  const s = p.mi_situacion
  if (p.estado !== 'reuniendo_interes' || !s.puede.guardar_condiciones || s.condiciones === 'completas') return null
  return (
    <section className="tarjeta entrada-principal falta-respuesta" aria-labelledby={`falta-${p.id}`}>
      <h2 id={`falta-${p.id}`}>
        <Icono n="calendario" tam={20} /> ¿Cuándo puedes?
      </h2>
      <p className="suave">
        {/* La cabecera del plan (siguiente_accion, enmienda 12 a) ya le dice a quien no puede faltar lo que pasa sin su respuesta: acá no se repite. */}
        {s.condiciones === 'incompletas'
          ? 'Te queda algún día sin marcar; con la respuesta completa entras en la búsqueda.'
          : 'Marca cuándo puedes. Es privado: el grupo no ve qué elegiste.'}
      </p>
      <a className="btn btn-primario" href={rutas.responder(espacioId, p.id)}>
        Responder en un toque
      </a>
    </section>
  )
}
