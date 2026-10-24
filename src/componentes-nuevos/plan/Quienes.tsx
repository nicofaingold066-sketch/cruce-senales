// Quiénes (S4, rediseño): quién confirmó la versión vigente, a quién le interesa (público por diseño) y los cambios del
// grupo sin nombre (enmienda 13 c). Las condiciones de cada persona nunca se muestran.
import { momentoCorto } from '../../lib/format'
import type { EstadoPropuesta } from '../../lib/types'
import { Avatar, EncabezadoSeccion, Nombre } from '../../components/ui'

export function Quienes({ p }: { p: EstadoPropuesta }) {
  const o = p.opcion
  const yo = p.mi_situacion.miembro_id
  const vigente = (p.estado === 'esperando_compromisos' || p.estado === 'grupo_confirmado') && o
  const interesados = p.interesados.miembros
  const cerrado = p.estado === 'cancelado' || p.estado === 'expirado'
  if (cerrado && p.bajas.length === 0 && interesados.length === 0) return null
  return (
    <section className="quienes" aria-labelledby="quienes-titulo">
      <EncabezadoSeccion
        id="quienes-titulo"
        titulo={vigente ? 'Quién confirmó esta versión' : 'Quiénes'}
        nota="Las condiciones de cada persona son privadas y no se muestran."
      />
      {vigente ? (
        o.aceptaron.length === 0 ? (
          <p className="suave">Todavía nadie confirmó la versión {o.version}.</p>
        ) : (
          <ul className="chips-personas">
            {o.aceptaron.map((a) => (
              <li key={a.miembro.miembro_id} title={`Confirmó ${momentoCorto(a.aceptado_en)}`}>
                <Avatar nombre={a.miembro.nombre} simulado={a.miembro.simulado} yo={a.miembro.miembro_id === yo} tam={26} />
                <Nombre m={a.miembro} yo={a.miembro.miembro_id === yo} />
              </li>
            ))}
          </ul>
        )
      ) : null}
      {/* Con una versión vigente cuenta quién confirmó; el interés solo acompaña mientras se juntan respuestas. */}
      {!vigente && interesados.length > 0 ? (
        <>
          <p className="suave">Les interesa (lo ve el grupo; no es una confirmación):</p>
          <ul className="chips-personas chips-interes" aria-label="Marcaron Me interesa">
            {interesados.map((m) => (
              <li key={m.miembro_id}>
                <Avatar nombre={m.nombre} simulado={m.simulado} yo={m.miembro_id === yo} tam={26} />
                <Nombre m={m} yo={m.miembro_id === yo} />
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {p.bajas.length > 0 ? (
        <p className="suave quienes-bajas">
          {/* Enmienda 13 (c), psico §16: sin nombre y sin "había confirmado". */}
          {p.bajas.map((b) => `Una persona se retiró${b.version != null ? ` (versión ${b.version})` : ''}.`).join(' ')} Quien se retira no vuelve a entrar en este plan.
        </p>
      ) : null}
    </section>
  )
}
