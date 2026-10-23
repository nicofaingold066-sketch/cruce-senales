// Banco de pruebas: monta hooks y componentes REALES; no copia su lógica.
import React from 'react'
import { createRoot } from 'react-dom/client'
import { api } from '../../src/lib/api'
import { usePropuestaViva, useAccion, useBorradorCondiciones } from '../../src/lib/hooks'
import Espacio from '../../src/screens/Espacio'
import SimulacionTab from '../../src/screens/SimulacionTab'

const modo = new URL(location.href).searchParams.get('modo') || 'hooks'
function Hooks() {
  const viva = usePropuestaViva('propuesta-red')
  const accion = useAccion()
  const borrador = useBorradorCondiciones({ A: 'no' }, ['A'])
  window.red = {
    api, viva, accion, borrador,
    aceptar: async () => {
      const r = await accion.ejecutar('aceptar-v1', id => api.acceptVersion('propuesta-red', 1, id))
      if (r) viva.aplicarResultado(r)
      return r
    },
    snapshot: () => ({ rev: viva.propuesta?.state_rev, titulo: viva.propuesta?.titulo,
      cargando: viva.cargando, fuera: viva.fuera, errorInicial: viva.errorInicial,
      sinActualizar: viva.sinActualizar, ocupado: accion.ocupado, error: accion.error,
      draft: borrador.draft }),
  }
  return <pre id="snapshot">{JSON.stringify(window.red.snapshot())}</pre>
}
function Simulacion() {
  const [p, setP] = React.useState({ id: 'propuesta-red', state_rev: 10, opcion: null,
    franjas: [], mi_situacion: { puede: { simular: false } } })
  window.red = { padre: rev => setP(prev => ({ ...prev, state_rev: rev })) }
  return <SimulacionTab p={p} viva={{ aplicarResultado() {} }} soloLectura={false} />
}
createRoot(document.getElementById('root')).render(
  modo === 'espacio' ? <Espacio espacioId="espacio-red" /> : modo === 'simulacion' ? <Simulacion /> : <Hooks />,
)
