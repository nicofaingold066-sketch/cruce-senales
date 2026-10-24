// Galería sin red ni modelo: la tarjeta de la propuesta de GRU con el borrador de la foto de Nico (datos ficticios).
import { createRoot } from 'react-dom/client'
import '../../styles.css'
import { BorradorTarjeta } from '../AgentePanel'
import type { BorradorAgente } from '../api'

const franjas = [
  { inicio: '2026-10-31T11:00', fin: '2026-10-31T14:00' },
  { inicio: '2026-11-01T11:00', fin: '2026-11-01T14:00' },
]
const cand = (id: string, actividad: string, etiqueta: string, lugar: string) => ({
  id, actividad, actividad_etiqueta: etiqueta, lugar: { id: `l-${id}`, nombre: `${lugar} (Simulación)`, simulado: true },
  titulo: `${etiqueta} en ${lugar}`, franjas, frases_grupo: ['Le sirve al presupuesto de todos.'], viaje: { max_minutos: 35, estimado: true },
})
const b = {
  tipo: 'borrador',
  ...cand('c3', 'cultura', 'Cultura', 'Museo y feria del centro'),
  personas_consideradas: 6,
  candidatas: [cand('c1', 'parque', 'Parque', 'Parque de la comuna'), cand('c2', 'cerro', 'Cerro', 'Sendero del cerro'), cand('c3', 'cultura', 'Cultura', 'Museo y feria del centro')],
  elegida_id: 'c1',
  clima: { fuente: 'simulacion', resumen: 'Simulación: sábado y domingo con sol.', sabado: 'sin lluvia', domingo: 'sin lluvia' },
  explicacion: 'Le sirve al presupuesto de todos y es al aire libre con buen tiempo.',
  mensaje_al_grupo: '¡Hola! Les propongo un día de parque el sábado 31 de 11:00 a 14:00 o el domingo 1 de 11:00 a 14:00. Marquen si les interesa y carguen su disponibilidad en CRUXE.',
  eleccion_fuente: 'modelo',
  explicacion_fuente: 'modelo',
  perfil_grupo: { personas: 6, gustos: [{ actividad_etiqueta: 'Asado', cuantos: 4 }, { actividad_etiqueta: 'Pádel', cuantos: 4 }, { actividad_etiqueta: 'Parque', cuantos: 3 }], energia_mayoritaria: 'con_todo', ambiente_mayoritario: 'tranquilo' },
  viaje: { max_minutos: 35, estimado: true },
} as unknown as BorradorAgente

createRoot(document.getElementById('root')!).render(
  <main style={{ padding: 'var(--margen)', background: 'var(--fondo)', minHeight: '100vh' }} className="agente-panel">
    <BorradorTarjeta
      espacioId="00000000-0000-0000-0000-000000000000"
      b={b}
      pasos={['Miré el clima del sábado: sin lluvia (simulación)', 'Miré el clima del domingo: sin lluvia (simulación)', 'Busqué planes que le sirven a todo el grupo: 3', 'Elegí: Parque en Parque de la comuna (Simulación)']}
      personasGrupo={7}
      invitar={{ disponible: true, abrir: () => {} }}
    />
  </main>,
)
