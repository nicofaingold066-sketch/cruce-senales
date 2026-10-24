// Galería de la pestaña Plan (S4) en cada estado y rol, sin base ni red. Datos ficticios (`estados-s4.ts`).
// Abrir con el servidor de desarrollo: /src/componentes-nuevos/prueba/galeria-s4.html. Con `?caso=<id>` dibuja un solo
// caso a pantalla completa (para las capturas a 320, 375 y 1280 px); sin parámetro, todos en fila con su título.
// Los botones llaman a la base real: no tocarlos. Lo que se ve es la pantalla real con datos declarados, nada calculado.
import { createRoot } from 'react-dom/client'
import '../../styles.css'
import '../../estilo/seccion-s4.css'
import type { PropuestaViva } from '../../lib/hooks'
import type { EstadoPropuesta } from '../../lib/types'
import PlanTab from '../../screens/PlanTab'
import { Resultado } from '../plan/Resultado'
import { escenaDe } from '../plan/escena'
import { CASOS_S4, SERVIDOR_AHORA, espacioDe } from './estados-s4'
import type { CasoS4 } from './estados-s4'

function vivaDe(p: EstadoPropuesta): PropuestaViva {
  return {
    propuesta: p,
    servidorAhora: SERVIDOR_AHORA,
    recibidoEn: Date.now(),
    errorInicial: null,
    sinActualizar: null,
    fuera: false,
    cargando: false,
    refrescar: async () => {},
    aplicarResultado: () => {},
  }
}

function Caso({ c, solo }: { c: CasoS4; solo: boolean }) {
  const espacio = espacioDe(c.yo, c.demo ?? false)
  const quien = `${c.yo.nombre}${c.p.mi_situacion.es_organizador ? ' (organiza)' : ''}`
  const cruce = escenaDe(c.p, espacio)
  return (
    <section className="galeria-caso" aria-labelledby={`caso-${c.id}`} data-caso={c.id} style={solo ? undefined : { marginBottom: 48 }}>
      <div className="vista vista-plan">
        <section className="escena resultado-escena" data-tono={cruce.tono}>
          <div className="resultado-arriba">
            <span className="escena-volver">{solo ? `‹ ${espacio.nombre}` : `${c.titulo} · mira ${quien}`}</span>
          </div>
          <Resultado p={c.p} viva={vivaDe(c.p)} soloLectura={false} espacio={espacio} activa="plan" irAPestana={() => {}} cruce={cruce} />
        </section>
        <div className="hoja">
          <div className="pestanas">
            <div className="pestanas-carril" role="tablist" aria-label="Secciones de la propuesta">
              {['Plan', 'Mi respuesta', 'Historial', ...(c.p.mi_situacion.es_organizador_espacio && c.demo ? ['Simulación'] : [])].map((t, i) => (
                <button key={t} type="button" role="tab" aria-selected={i === 0} className={`pestana ${i === 0 ? 'pestana-activa' : ''}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="panel-pestana" role="tabpanel">
            <PlanTab p={c.p} viva={vivaDe(c.p)} soloLectura={false} irAPestana={() => {}} espacio={espacio} />
          </div>
        </div>
      </div>
    </section>
  )
}

function Galeria() {
  const id = new URLSearchParams(window.location.search).get('caso')
  const casos = id ? CASOS_S4.filter((c) => c.id === id) : CASOS_S4
  if (casos.length === 0) {
    return (
      <div className="vista">
        <div className="hoja">
          <p>
            No hay un caso «{id}». Casos: {CASOS_S4.map((c) => c.id).join(', ')}.
          </p>
        </div>
      </div>
    )
  }
  return (
    <>
      {casos.map((c) => (
        <Caso key={c.id} c={c} solo={!!id} />
      ))}
    </>
  )
}

createRoot(document.getElementById('root')!).render(<Galeria />)
