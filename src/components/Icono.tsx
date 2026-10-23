// Íconos de Lucide (https://lucide.dev, licencia ISC). Siempre decorativos: el texto vecino dice qué es.
// Se importan uno por uno para que el paquete solo lleve los que se usan.
import {
  CalendarDays,
  CalendarPlus,
  Check,
  CircleUserRound,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  House,
  KeyRound,
  Link,
  Lock,
  MessageCircle,
  Minus,
  PartyPopper,
  Play,
  Plus,
  Repeat2,
  Share,
  ShieldCheck,
  Sparkles,
  UserRoundPlus,
  Users,
  UsersRound,
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
  casa: House,
  persona: CircleUserRound,
  whatsapp: MessageCircle,
  agendar: CalendarPlus,
  invitar: UserRoundPlus,
  grupo: UsersRound,
  privado: ShieldCheck,
  fiesta: PartyPopper,
  cambiar: Repeat2,
  enlace: Link,
} satisfies Record<string, LucideIcon>

export type NombreIcono = keyof typeof ICONOS

export function Icono({ n, tam = 22 }: { n: NombreIcono; tam?: number }) {
  const I = ICONOS[n]
  return <I size={tam} strokeWidth={2.1} aria-hidden="true" focusable="false" />
}
