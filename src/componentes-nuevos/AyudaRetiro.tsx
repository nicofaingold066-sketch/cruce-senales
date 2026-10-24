// Ayuda junto a "Retirarme de esta propuesta" (ux-flujo). Lo conecta front-juan en `RespuestaTab.tsx`, dentro de
// `Retiro`, antes del botón. No dibuja nada si no hay una alternativa que ofrecer.
import { textoAyudaRetiro } from './textoRetiro'
import type { DatosAyudaRetiro } from './textoRetiro'

export function AyudaRetiro({ p }: { p: DatosAyudaRetiro }) {
  const t = textoAyudaRetiro(p)
  return t ? <p className="suave">{t}</p> : null
}
