// Perfil local: el nombre con que la persona entra a CRUXE en este navegador.
// No es una cuenta: no hay contraseña ni correo (la sesión es anónima, contrato 0.1) y no se manda al servidor.
// Solo sirve para completar "Tu nombre" al unirse o crear un grupo; en cada grupo el nombre visible es el del servidor.
import { useEffect, useState } from 'react'

const CLAVE = 'cruxe:perfil'

export interface Perfil {
  nombre: string
}

const oyentes = new Set<() => void>()

export function leerPerfil(): Perfil | null {
  try {
    const crudo = localStorage.getItem(CLAVE)
    if (!crudo) return null
    const p = JSON.parse(crudo) as Partial<Perfil>
    return typeof p.nombre === 'string' && p.nombre.trim() ? { nombre: p.nombre.trim() } : null
  } catch {
    return null
  }
}

/** Guarda el nombre. Sin almacenamiento disponible (ventana privada estricta) devuelve false y la app sigue igual. */
export function guardarPerfil(nombre: string): boolean {
  let ok = false
  try {
    localStorage.setItem(CLAVE, JSON.stringify({ nombre: nombre.trim() }))
    ok = true
  } catch {
    ok = false
  }
  oyentes.forEach((f) => f())
  return ok
}

export function olvidarPerfil() {
  try {
    localStorage.removeItem(CLAVE)
  } catch {
    // Nada guardado.
  }
  oyentes.forEach((f) => f())
}

/** Si todavía no hay nombre, guarda el que la persona usó al unirse o crear un grupo. */
export function recordarNombreSiFalta(nombre: string) {
  if (!leerPerfil() && nombre.trim()) guardarPerfil(nombre)
}

export function usePerfil(): Perfil | null {
  const [perfil, setPerfil] = useState<Perfil | null>(() => leerPerfil())
  useEffect(() => {
    const f = () => setPerfil(leerPerfil())
    oyentes.add(f)
    window.addEventListener('storage', f)
    return () => {
      oyentes.delete(f)
      window.removeEventListener('storage', f)
    }
  }, [])
  return perfil
}
