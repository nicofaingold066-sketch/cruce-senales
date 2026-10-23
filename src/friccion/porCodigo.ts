// Entrada por código coherente con el enlace (flujo-usuario §6.6): escribir el código en la portada no pasaba
// `miembro_id`, así que "Ana" anotada por el organizador recibía "nombre en uso". Antes de unirse, se mira la lista
// del grupo con el código (preview_space_by_code, enmienda 9):
// - el nombre escrito coincide con un integrante libre → se reclama ese lugar (join_space con p_miembro_id);
// - no coincide y el grupo tiene integrantes libres → conviene elegir en "¿Quién eres?" (#/unirse/<código>);
// - si no, se une con el nombre escrito, como siempre. Si la vista falla, también: join_space da el error correcto.
// El servidor sigue decidiendo quién está libre y si el reclamo vale.
import { api } from '../lib/api'
import type { VistaPorCodigoOk } from '../lib/api'

export interface DestinoPorCodigo {
  /** Lugar anotado que corresponde al nombre escrito (null: se entra como persona nueva). */
  miembroId: string | null
  /** Nombre exacto con que el organizador anotó a esa persona. */
  nombre: string
  /** true: mandar a "¿Quién eres?" para que elija su nombre en la lista. */
  elegir: boolean
}

/** Sin mayúsculas, tildes ni espacios de más: "  ána " y "Ana" son el mismo nombre. */
export function normalizarNombre(n: string): string {
  return n.normalize('NFD').replace(/\p{M}/gu, '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('es')
}

export function destinoDesdeVista(vista: Pick<VistaPorCodigoOk, 'espacio' | 'miembros'>, nombre: string): DestinoPorCodigo {
  const libres = vista.miembros.filter((m) => m.libre)
  const buscado = normalizarNombre(nombre)
  const igual = libres.filter((m) => normalizarNombre(m.nombre) === buscado)
  if (igual.length === 1) return { miembroId: igual[0].miembro_id, nombre: igual[0].nombre, elegir: false }
  // En la demo se puede entrar con cualquier nombre (los guiones y el jurado lo hacen): no se desvía a la lista.
  const elegir = !vista.espacio.demo && libres.length > 0
  return { miembroId: null, nombre: nombre.trim(), elegir }
}

export async function destinoPorCodigo(codigo: string, nombre: string): Promise<DestinoPorCodigo> {
  const r = await api.previewSpaceByCode(codigo)
  if (!r.ok) return { miembroId: null, nombre: nombre.trim(), elegir: false }
  return destinoDesdeVista(r.data, nombre)
}
