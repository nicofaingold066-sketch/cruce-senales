// Galería del resultado de GRU (S6) sin base, red ni modelo. Datos ficticios. Abrir con el servidor de desarrollo:
// /src/agente/prueba/galeria-agente.html (con `?caso=<id>` dibuja uno solo, para las capturas a 375 y 1280 px).
// Los botones no tocan nada real salvo «Usar esta opción», que lleva a Nueva propuesta: no tocarlo acá.
import { createRoot } from 'react-dom/client'
import '../../lib/tema'
import '../../styles.css'
import '../../estilo/vida.css'
import { Card } from '../../components/ui'
import { BorradorTarjeta } from '../AgentePanel'
import type { BorradorAgente } from '../api'

const franjas = [
  { clave: 'A', inicio: '2026-10-31T16:00', fin: '2026-10-31T18:00' },
  { clave: 'B', inicio: '2026-11-01T16:00', fin: '2026-11-01T18:00' },
]
const PADEL = { id: 'lugar-sim-3', actividad: 'padel', actividad_etiqueta: 'Pádel', lugar: { id: 'lugar-sim-3', nombre: 'Club Providencia (Simulación)', simulado: true }, titulo: 'Pádel en Club Providencia', franjas, frases_grupo: ['el_mas_elegido'], viaje: { max_minutos: 35, estimado: true } }
const ASADO = { id: 'lugar-sim-14', actividad: 'asado', actividad_etiqueta: 'Asado', lugar: { id: 'lugar-sim-14', nombre: 'Parrilla del parque (Simulación)', simulado: true }, titulo: 'Asado en una parrilla del parque', franjas, frases_grupo: ['bajo_techo'], viaje: { max_minutos: 20, estimado: true } }
const PICNIC = { id: 'lugar-sim-7', actividad: 'parque', actividad_etiqueta: 'Picnic', lugar: { id: 'lugar-sim-7', nombre: 'Parque Bustamante (Simulación)', simulado: true }, titulo: 'Picnic en el parque', franjas, frases_grupo: [], viaje: { max_minutos: 25, estimado: true } }

// Títulos naturales (Nico, 11:40): parque y cerro, como en la demo Makana.
const PARQUE = { id: 'lugar-sim-21', actividad: 'parque', actividad_etiqueta: 'Parque', lugar: { id: 'lugar-sim-21', nombre: 'Parque de la comuna (Simulación)', simulado: true }, titulo: 'Parque en Parque de la comuna', franjas, frases_grupo: [], viaje: { max_minutos: 35, estimado: true } }
const CERRO = { id: 'lugar-sim-22', actividad: 'cerro', actividad_etiqueta: 'Cerro', lugar: { id: 'lugar-sim-22', nombre: 'Sendero del cerro (Simulación)', simulado: true }, titulo: 'Cerro en Sendero del cerro', franjas, frases_grupo: [], viaje: { max_minutos: 35, estimado: true } }
const CULTURA = { id: 'lugar-sim-23', actividad: 'cultura', actividad_etiqueta: 'Cultura', lugar: { id: 'lugar-sim-23', nombre: 'Museo y feria del centro (Simulación)', simulado: true }, titulo: 'Cultura en Museo y feria del centro', franjas, frases_grupo: [], viaje: { max_minutos: 35, estimado: true } }

function borrador(extra: Partial<BorradorAgente>): BorradorAgente {
  return {
    tipo: 'borrador', ...PADEL, personas_consideradas: 4, candidatas: [PADEL, ASADO, PICNIC], elegida_id: PADEL.id,
    clima: { fuente: 'simulacion', resumen: 'Simulación: sábado y domingo con sol.', sabado: 'seco', domingo: 'seco' },
    perfil_grupo: { personas: 4, gustos: [{ actividad_etiqueta: 'Pádel', cuantos: 3 }, { actividad_etiqueta: 'Asado', cuantos: 2 }] },
    quorum: null, viaje: { max_minutos: 35, estimado: true },
    explicacion: 'El pádel es lo que más eligieron y el club queda a mano para todos.',
    mensaje_al_grupo: '¿Pádel el sábado o el domingo a las 16:00 en Club Providencia? Marquen si les interesa y cuándo pueden.',
    eleccion_fuente: 'modelo', explicacion_fuente: 'modelo', modelo_usado: 'fable',
    pasos: ['Miré el clima del sábado: sin lluvia (simulación)', 'Busqué planes que le sirven a todo el grupo: 3', 'Preparé dónde buscar canchas de pádel: Google Maps y EasyCancha', 'Elegí: Pádel en Club Providencia (Simulación)'],
    modo_agente: 'herramientas',
    ...extra,
  } as BorradorAgente
}

const CASOS: { id: string; titulo: string; b: BorradorAgente }[] = [
  { id: 'parque', titulo: 'Títulos naturales: parque elegido; cerro y museo como otras opciones', b: borrador({ ...PARQUE, candidatas: [PARQUE, CERRO, CULTURA], elegida_id: PARQUE.id, mensaje_al_grupo: '¡Hola! Les propongo un día de parque el sábado 31 o el domingo 1 a las 16:00. Marquen si les interesa y carguen su disponibilidad en CRUXE.' } as Partial<BorradorAgente>) },
  { id: 'modelo', titulo: 'Con herramientas: la IA eligió y redactó (3 opciones, 4 pasos)', b: borrador({}) },
  {
    id: 'fijo',
    titulo: 'Propuesta rápida sin modelo: una opción y texto fijo',
    b: borrador({ ...ASADO, candidatas: [ASADO], elegida_id: ASADO.id, eleccion_fuente: 'regla', explicacion_fuente: 'texto_fijo', modelo_usado: null, pasos: [], modo_agente: 'directo', explicacion: 'Es bajo techo por si cambia el tiempo.', mensaje_al_grupo: '¡Hola! Les propongo un asado en una parrilla del parque el sábado 31 o el domingo 1. Marquen si les interesa.' } as Partial<BorradorAgente>),
  },
]

const solo = new URLSearchParams(window.location.search).get('caso')
function Galeria() {
  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: 16, display: 'grid', gap: 24 }}>
      {CASOS.filter((c) => !solo || c.id === solo).map((c) => (
        <section key={c.id} data-caso={c.id}>
          {solo ? null : <h2 style={{ fontSize: 13, margin: '0 0 8px' }}>{c.titulo}</h2>}
          <Card className="agente-panel">
            <BorradorTarjeta espacioId="00000000-0000-4000-8000-000000000000" b={c.b} pasos={c.b.pasos} personasGrupo={7} invitar={{ disponible: true, abrir: () => {} }} />
          </Card>
        </section>
      ))}
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<Galeria />)
