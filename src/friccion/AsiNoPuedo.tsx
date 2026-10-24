// Enmienda 13 (a): botón "Así no puedo, pero sigo" junto a "Confirmar versión N" (PlanTab) o en Mi respuesta; lo conecta
// front-juan:   <AsiNoPuedo p={p} viva={viva} soloLectura={soloLectura} irAPestana={irAPestana} />
// Un toque, sin confirmación: se deshace con "Volver a «puedo»" (`retirar_opinion`). Diferencia con "Retirarme": retirarse
// es para no participar más en este plan; esto es "esta fecha no me sirve, sigo en el plan". Los textos están en
// TEXTO_ASI_NO_PUEDO para que AvisoParaMi (ux-flujo) diga lo mismo.
import { useState } from 'react'
import type { EstadoPropuesta } from '../lib/types'
import type { PropuestaViva } from '../lib/hooks'
import { useMutacion } from '../lib/hooks'
import { rutas } from '../lib/shell'
import { vibrar } from '../lib/tacto'
import { Boton, ErrorCaja } from '../components/ui'
import { Icono } from '../components/Icono'
import type { Pestana } from '../screens/tabs'
import { miOpinion, opinarReal, puedeOpinar } from './opinar'
import type { Opinion, OpinarFn } from './opinar'
import './friccion.css'

export const TEXTO_ASI_NO_PUEDO = {
  boton: 'Así no puedo, pero sigo',
  // psico §8.10 + la diferencia con "Retirarme" (coordinador). "Nadie ve que fuiste tú": el organizador recibe solo un
  // total, y recién desde 2 (enmienda 13 (a)); nunca nombres.
  diferencia:
    'Si esta fecha no te sirve pero quieres ir, márcalo: sigues en el plan y puedes cambiar cuándo puedes. Nadie ve que fuiste tú. Retirarte es para no participar más en este plan.',
  titulo: 'Así no puedes, pero sigues',
  marcado: 'Marcaste que así no puedes. Sigues en el plan: si se rearma, cuenta lo que marques ahora.',
  actualizar: 'Actualizar cuándo puedo',
  // rincones O-17: "Ya no: puedo así" se leía como doble negación.
  deshacer: 'Volver a «puedo»',
  deshecho: 'Listo: ya no figura que así no puedes.',
} as const

export function AsiNoPuedo({
  p,
  viva,
  soloLectura,
  irAPestana,
  opinar = opinarReal,
}: {
  p: EstadoPropuesta
  viva: PropuestaViva
  soloLectura: boolean
  /** Si está (pestañas del plan), ofrece también ir a "Mi respuesta" para editar día por día. */
  irAPestana?: (t: Pestana) => void
  /** Para el banco de prueba: la API real por defecto. */
  opinar?: OpinarFn
}) {
  const s = p.mi_situacion
  const { ocupado, error, correr } = useMutacion(viva)
  const [nota, setNota] = useState<string | null>(null)
  const version = p.opcion?.version ?? null
  const marcado = miOpinion(s) === 'asi_no_puedo'
  if (version == null || (!marcado && !puedeOpinar(p))) return null
  const v = version

  async function mandar(opinion: Opinion) {
    setNota(null)
    const r = await correr(`opinar:${p.id}:${v}:${opinion}`, (intento) => opinar(p.id, v, opinion, intento))
    if (r?.ok) {
      vibrar(10)
      // Al marcar, la tarjeta de abajo ya lo explica; la nota solo confirma que se guardó.
      setNota(opinion === 'asi_no_puedo' ? 'Guardado.' : TEXTO_ASI_NO_PUEDO.deshecho)
    }
  }

  if (marcado) {
    return (
      <section className="tarjeta asi-no-puedo" aria-labelledby={`asi-${p.id}`}>
        <h2 id={`asi-${p.id}`}>
          <Icono n="cambiar" tam={20} /> {TEXTO_ASI_NO_PUEDO.titulo}
        </h2>
        <p className="suave">{TEXTO_ASI_NO_PUEDO.marcado}</p>
        <div className="entrada-botones">
          <a className="btn btn-primario" href={rutas.responder(p.espacio_id, p.id)}>
            {TEXTO_ASI_NO_PUEDO.actualizar}
          </a>
          {irAPestana ? (
            <Boton variante="secundario" onClick={() => irAPestana('respuesta')} disabled={ocupado}>
              Editar día por día en Mi respuesta
            </Boton>
          ) : null}
          {p.estado === 'esperando_compromisos' ? (
            <Boton variante="secundario" onClick={() => void mandar('retirar_opinion')} ocupado={ocupado} ocupadoTexto="Quitando…" disabled={soloLectura}>
              {TEXTO_ASI_NO_PUEDO.deshacer}
            </Boton>
          ) : null}
        </div>
        {nota ? <p role="status">{nota}</p> : null}
        {error ? <ErrorCaja error={error} enfocar /> : null}
      </section>
    )
  }

  return (
    <section className="asi-no-puedo">
      <Boton variante="secundario" onClick={() => void mandar('asi_no_puedo')} ocupado={ocupado} ocupadoTexto="Guardando…" disabled={soloLectura}>
        <Icono n="cambiar" tam={18} /> {TEXTO_ASI_NO_PUEDO.boton}
      </Boton>
      <p className="suave asi-no-puedo-nota">{TEXTO_ASI_NO_PUEDO.diferencia}</p>
      {nota ? <p role="status">{nota}</p> : null}
      {error ? <ErrorCaja error={error} enfocar /> : null}
    </section>
  )
}
