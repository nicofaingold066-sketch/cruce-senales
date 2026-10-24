// Banco sin base (datos ficticios): <AsiNoPuedo/> con una propuesta inventada y una API falsa, y <CampoQuienViene/>.
// Abrir con el servidor de desarrollo: /src/friccion/prueba/enmienda13.html
import { createRoot } from 'react-dom/client'
import { useState } from 'react'
import '../../styles.css'
import { AsiNoPuedo } from '../AsiNoPuedo'
import { CampoQuienViene } from '../QuienViene'
import { conQuienViene } from '../../lib/compartir'
import type { QuienViene } from '../../lib/compartir'
import type { EstadoPropuesta } from '../../lib/types'
import type { PropuestaViva } from '../../lib/hooks'
import type { OpinarFn } from '../opinar'

const llamadas: string[] = []
;(window as unknown as { llamadas: string[] }).llamadas = llamadas
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms))

const base = {
  id: 'p1',
  espacio_id: 'e1',
  titulo: 'Asado de prueba',
  estado: 'esperando_compromisos',
  opcion: { version: 1 },
  mi_situacion: {
    miembro_id: 'm1',
    nombre: 'Ana',
    es_organizador: false,
    es_organizador_espacio: false,
    interesado: true,
    condiciones: 'completas',
    retirado: false,
    elegible_en_version: true,
    acepte_version: false,
    puede: { abrir: false, marcar_interes: true, guardar_condiciones: false, evaluar: false, aceptar: true, retirarme: true, proponer_reparacion: false, cancelar: false, simular: false },
  },
} as unknown as EstadoPropuesta

function Banco() {
  const [p, setP] = useState(base)
  const viva: PropuestaViva = {
    propuesta: p,
    servidorAhora: null,
    recibidoEn: 0,
    errorInicial: null,
    sinActualizar: null,
    fuera: false,
    cargando: false,
    refrescar: async () => {},
    aplicarResultado: (r) => {
      if (r.ok) setP(r.data.propuesta)
    },
  }
  const opinar: OpinarFn = async (propuestaId, version, opinion, intentoId) => {
    llamadas.push(`${propuestaId}:${version}:${opinion}:${intentoId.length > 10 ? 'intento' : intentoId}`)
    await espera(200)
    const s = p.mi_situacion
    const propuesta = {
      ...p,
      mi_situacion: { ...s, mi_opinion: opinion === 'asi_no_puedo' ? 'asi_no_puedo' : null, puede: { ...s.puede, guardar_condiciones: opinion === 'asi_no_puedo' } },
    } as unknown as EstadoPropuesta
    return { ok: true, data: { ok: true, contrato: 2, servidor_ahora: { utc: '', local: '' }, resultado: {}, propuesta } as never }
  }
  const [q, setQ] = useState<QuienViene | null>(null)
  const [nombre, setNombre] = useState('Los del pádel')
  ;(window as unknown as { titulo: string }).titulo = conQuienViene(nombre, q)
  return (
    <main className="contenido" style={{ padding: 16 }}>
      <AsiNoPuedo p={p} viva={viva} soloLectura={false} opinar={opinar} />
      <label className="campo">
        <span>Nombre del grupo</span>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </label>
      <CampoQuienViene valor={q} cambiar={setQ} nombre={nombre} />
      <p id="titulo">{conQuienViene(nombre, q)}</p>
    </main>
  )
}
createRoot(document.getElementById('root')!).render(<Banco />)
