// Banco de prueba de la entrada estilo Tricount, sin base: la API es falsa y en memoria (datos ficticios).
// Abrir con el servidor de desarrollo: /src/login/prueba/quien.html?vista=quien | crear (solo el campo de integrantes)
import { createRoot } from 'react-dom/client'
import '../../styles.css'
import { QuienEres } from '../QuienEres'
import { CampoIntegrantes } from '../Integrantes'
import { useState } from 'react'
import type { FuenteEntrada } from '../QuienEres'
import type { ApiError } from '../../lib/types'

const miembros = [
  { miembro_id: 'm1', nombre: 'Tomi', libre: false },
  { miembro_id: 'm2', nombre: 'Luna', libre: true },
  { miembro_id: 'm3', nombre: 'Mati', libre: true },
  { miembro_id: 'm4', nombre: 'Caro', libre: false },
  { miembro_id: 'm5', nombre: 'Fede', libre: true },
  { miembro_id: 'm6', nombre: 'Sofi con un apellido larguísimo de prueba', libre: true },
]
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms))
const fallo = (detalle: string, mensaje: string): ApiError =>
  ({ codigo: 'conflicto', detalle, mensaje, reintentable: false, state_rev: null }) as unknown as ApiError
const llamadas: string[] = []
;(window as unknown as { llamadas: string[] }).llamadas = llamadas

const fuente: FuenteEntrada = {
  async verPorCodigo(codigo) {
    llamadas.push(`ver:${codigo}`)
    await espera(300)
    if (codigo === 'MALO') return { ok: false, error: fallo('codigo_inexistente', 'El código de invitación no existe.') }
    return { ok: true, data: { espacio: { nombre: 'Los del asado', demo: true }, miembros: miembros.map((m) => ({ ...m })) } }
  },
  async unirse(codigo, nombre, miembroId) {
    llamadas.push(`unirse:${codigo}:${nombre}:${miembroId}`)
    await espera(300)
    if (miembroId === 'm5' || nombre === 'Pepe') {
      // Navegador compartido: esta sesión ya es Tomi en el espacio.
      return { ok: true, data: { ok: true, contrato: 2, servidor_ahora: {} as never, resultado: { espacio_id: 'e1', miembro_id: 'm1', reclamo_asiento_simulado: false, ya_era_miembro: true, repetido: false }, espacio: { nombre: 'Los del asado', miembros: [{ miembro_id: 'm1', nombre: 'Tomi', es_yo: true }] } as never } }
    }
    if (miembroId === 'm3') {
      miembros[2].libre = false
      return { ok: false, error: fallo('miembro_ya_reclamado', 'Esa persona ya entró desde otro teléfono. Elige otro nombre.') }
    }
    return { ok: false, error: fallo('banco', 'Banco de prueba: aquí se entraría al espacio.') }
  },
}

function Crear() {
  const [lista, setLista] = useState<string[]>([])
  ;(window as unknown as { lista: string[] }).lista = lista
  return <CampoIntegrantes integrantes={lista} cambiar={setLista} tuNombre="Tomi" />
}

const p = new URLSearchParams(location.search)
const vista = p.get('vista') ?? 'quien'
createRoot(document.getElementById('root')!).render(
  <main className="contenido">
    {vista === 'crear' ? <Crear /> : <QuienEres codigo={p.get('codigo') ?? 'KQ7M2XPA'} fuente={fuente} />}
  </main>,
)
