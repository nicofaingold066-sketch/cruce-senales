// Cómo se armó el plan (S4, rediseño; pedido de Nico: "mostrar bien cómo sale el output"). Cuatro pasos con datos
// reales del servidor: qué entró, qué eligió, qué versión vale y cuándo se juntan. Funde la comparación de versiones,
// la versión anterior, el historial resumido y los conteos de respuestas. Nada privado: ni condiciones ni quién se retiró.
import type { ReactNode } from 'react'
import { diaDe, franjaTexto, hora } from '../../lib/format'
import type { Espacio, EstadoPropuesta, MiembroRef } from '../../lib/types'
import { AvatarPila, EncabezadoSeccion } from '../../components/ui'
import { ETAPAS, cuentaConfirmados, etapaDe, textoRegla } from './accion'

/** "Sábado 31 oct · 14:00–17:00"; si cruza de día, la franja completa. */
function franjaBreve(inicio: string, fin: string): string {
  return inicio.slice(0, 10) === fin.slice(0, 10) ? `${diaDe(inicio)} · ${hora(inicio)}–${hora(fin)}` : franjaTexto(inicio, fin)
}

export function ComoSeArmo({ p, espacio }: { p: EstadoPropuesta; espacio: Espacio | null }) {
  const o = p.opcion
  const etapa = etapaDe(p.estado)
  const n = p.personas_con_condiciones
  const total = espacio?.miembros.length ?? null
  const sinOpcion = p.estado === 'reuniendo_interes' && p.ultima_evaluacion?.resultado === 'sin_opcion'
  const vigente = (p.estado === 'esperando_compromisos' || p.estado === 'grupo_confirmado') && o
  const cerrado = p.estado === 'cancelado' || p.estado === 'expirado'

  // Versión anterior → vigente (enmienda 6): quién había confirmado sale del historial (público); la baja va sin nombre (E13 c).
  const ant = p.opcion_anterior ?? null
  const reparada = vigente && p.ultima_evaluacion?.resultado === 'reparacion_publicada' && p.ultima_evaluacion.version === o.version
  const vAnt = ant?.version ?? (o && o.version > 1 ? o.version - 1 : null)
  const vistos = new Set<string>()
  const confirmaronAnt: MiembroRef[] =
    vAnt == null
      ? []
      : p.historial
          .filter((e) => e.tipo === 'aceptacion' && (e.version_nueva ?? e.version_previa) === vAnt && e.actor)
          .map((e) => e.actor!)
          .filter((m) => (vistos.has(m.miembro_id) ? false : (vistos.add(m.miembro_id), true)))
  const bajasAnt = vAnt == null ? [] : p.bajas.filter((b) => b.version === vAnt)
  const asiNoPodian = reparada && bajasAnt.length === 0

  const pasos: { texto: string; detalle?: ReactNode }[] = [
    {
      texto:
        n != null
          ? `Con condiciones: ${n}${total != null ? ` de ${total}` : ''}. Mínimo ${p.minimo}. Cada respuesta es privada.`
          : 'Cada uno marcó en privado cuándo puede, Sí o No por opción. Nadie ve lo de los demás.',
    },
    {
      texto: sinOpcion
        ? 'Se buscó y no hubo franja posible con las respuestas de hoy. El mínimo no se toca; por privacidad no se dicen los motivos.'
        : o
          ? `El servidor cruzó las respuestas y eligió ${textoRegla(p.regla, p.minimo)}, con ${p.imprescindible.nombre}, que no puede faltar.`
          : `Cuando haya respuestas suficientes, el servidor elige ${textoRegla(p.regla, p.minimo)}, con ${p.imprescindible.nombre}, que no puede faltar.`,
    },
    {
      texto: o
        ? p.estado === 'en_revision'
          ? `Versión ${o.version} (en revisión, no confirmada). Sus confirmaciones no pasan a la próxima versión.`
          : `Versión ${o.version}: ${franjaBreve(o.franja.inicio.local, o.franja.fin.local)}. Cada confirmación vale solo para esta versión.`
        : 'Cada persona confirma la versión que salga. Una confirmación vale para una sola versión.',
      detalle:
        o && vigente && (ant || reparada) ? (
          <div className="versiones">
            <p className="versiones-titulo">
              El plan cambió: versión {vAnt} → versión {o.version}
            </p>
            <p className="version version-vieja">
              <span className="version-rotulo">Versión {vAnt} · ya no vale</span>
              {ant ? <span className="version-franja">{franjaBreve(ant.inicio.local, ant.fin.local)}</span> : null}
              <span className="version-nota">
                {bajasAnt.length === 1 ? 'Una persona se retiró. ' : bajasAnt.length > 1 ? `${bajasAnt.length} personas se retiraron. ` : asiNoPodian ? 'Algunos no podían así. ' : ''}
                {confirmaronAnt.length > 0 ? (
                  <>
                    Habían confirmado: <AvatarPila personas={confirmaronAnt} /> {confirmaronAnt.map((m) => m.nombre).join(', ')}. Estas confirmaciones no pasan a la versión {o.version}.
                  </>
                ) : null}
              </span>
            </p>
            <p className="version version-nueva">
              <span className="version-rotulo">Versión {o.version} · vigente</span>
              <span className="version-franja">{franjaBreve(o.franja.inicio.local, o.franja.fin.local)}</span>
              <span className="version-nota">
                {ant && ant.inicio.local === o.franja.inicio.local && ant.fin.local === o.franja.fin.local ? 'Misma fecha y hora; cambió quién puede ir. ' : ''}
                {o.aceptaron.length === 0
                  ? `Nadie confirmó todavía: empieza de cero. Se confirma con ${o.cupos.minimo} confirmaciones de esta versión, entre ellas la de ${p.imprescindible.nombre}.`
                  : `Confirmaron ${cuentaConfirmados(o.cupos.confirmados, o.cupos.minimo)}.`}
              </span>
            </p>
          </div>
        ) : o && vigente && o.aceptaron.length === 0 ? (
          <p className="version-nota">Nadie confirmó todavía: empieza de cero.</p>
        ) : undefined,
    },
    {
      texto: cerrado
        ? p.estado === 'cancelado'
          ? 'La propuesta se canceló.'
          : 'Venció el plazo de aceptación.'
        : p.estado === 'grupo_confirmado' && o
          ? `¡Se juntan! ${franjaTexto(o.franja.inicio, o.franja.fin)}.`
          : `Queda confirmado con ${o?.cupos.minimo ?? p.minimo} confirmaciones de la versión vigente, con la de ${p.imprescindible.nombre}.`,
    },
  ]

  return (
    <section className="como-se-armo" aria-labelledby="como-titulo">
      <EncabezadoSeccion id="como-titulo" titulo="Cómo se armó" nota="Lo que entró, lo que decidió el servidor y en qué terminó." />
      <ol className="pasos-plan">
        {pasos.map((paso, i) => {
          const estado = etapa === null ? '' : i < etapa ? 'paso-plan-hecho' : i === etapa ? 'paso-plan-actual' : ''
          return (
            <li key={ETAPAS[i]} className={`paso-plan ${estado}`} aria-current={etapa === i ? 'step' : undefined}>
              <span className="paso-plan-num" aria-hidden="true">
                {i + 1}
              </span>
              <div className="paso-plan-cuerpo">
                <strong className="paso-plan-titulo">{ETAPAS[i]}</strong>
                <p className="paso-plan-texto">{paso.texto}</p>
                {paso.detalle}
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
