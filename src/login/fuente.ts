// La API real de la entrada (enmienda 9). El banco de prueba (src/login/prueba) usa una falsa con la misma forma.
import { api } from '../lib/api'
import type { FuenteEntrada } from './QuienEres'

export const fuenteReal: FuenteEntrada = {
  verPorCodigo: async (codigo) => {
    const r = await api.previewSpaceByCode(codigo)
    return r.ok ? { ok: true, data: { espacio: r.data.espacio, miembros: r.data.miembros } } : r
  },
  unirse: (codigo, nombre, miembroId) => api.joinSpace(codigo, nombre, miembroId),
  yaEstoy: async (codigo) => {
    const r = await api.listMySpaces()
    if (!r.ok) return null
    const e = r.data.espacios.find((x) => x.codigo_invitacion.toUpperCase() === codigo.toUpperCase())
    return e ? { espacioId: e.id, miembroId: e.mi_miembro_id } : null
  },
}
