// Íconos de Lucide (https://lucide.dev, licencia ISC). Siempre decorativos: el texto vecino dice qué es.
// Se importan uno por uno para que el paquete solo lleve los que se usan.
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  KeyRound,
  Lock,
  Minus,
  Play,
  Plus,
  Share,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const ICONOS = {
  atras: ChevronLeft,
  chevron: ChevronRight,
  compartir: Share,
  copiar: Copy,
  mas: Plus,
  menos: Minus,
  candado: Lock,
  personas: Users,
  chispa: Sparkles,
  llave: KeyRound,
  calendario: CalendarDays,
  check: Check,
  play: Play,
  reloj: Clock,
  rayo: Zap,
} satisfies Record<string, LucideIcon>

export type NombreIcono = keyof typeof ICONOS

export function Icono({ n, tam = 22 }: { n: NombreIcono; tam?: number }) {
  const I = ICONOS[n]
  return <I size={tam} strokeWidth={2.1} aria-hidden="true" focusable="false" />
}
