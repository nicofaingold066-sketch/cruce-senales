// 0056 (rediseño): campos de solo lectura, aditivos. `fecha_local` en list_proposals y list_my_spaces;
// `organizador` y `plan {titulo, fecha_local}` en preview_space_by_code. Contra la base real, datos ficticios: un
// espacio "t-" propio con una persona que se une y otra sesión que solo mira el código.
import { beforeAll, describe, expect, it } from 'vitest'
import { FRANJAS, intento, nuevaSesion, ok, PLAZO, sufijo, type Json, type Sesion } from './helpers'

const SI = { A: 'si', B: 'si' }

describe('0056: fecha_local, organizador y plan para el rediseño', { timeout: 180_000 }, () => {
  let O: Sesion // organiza
  let U: Sesion // se une
  let X: Sesion // solo tiene el código
  let esp: string
  let codigo: string

  const preview = async () => ok(X, 'preview_space_by_code', { p_codigo: codigo })
  const miEspacio = async () => (await ok(O, 'list_my_spaces')).espacios.find((e: Json) => e.id === esp)
  const resumen = async (p: string) => (await ok(U, 'list_proposals', { p_espacio_id: esp })).propuestas.find((x: Json) => x.id === p)

  beforeAll(async () => {
    ;[O, U, X] = await Promise.all([nuevaSesion(), nuevaSesion(), nuevaSesion()])
    const r = await ok(O, 'create_space', { p_nombre: `t-0056-${sufijo()}`, p_tipo: 'amigos', p_nombre_visible: 'Org r', p_integrantes: ['Pend r'] })
    esp = r.resultado.espacio_id
    codigo = r.resultado.codigo_invitacion
    await ok(U, 'join_space', { p_codigo: codigo, p_nombre_visible: 'Uno r' })
  }, 60_000)

  it('sin propuesta: organizador sí, plan null, fecha_local null', async () => {
    const pv = await preview()
    expect(pv.organizador).toBe('Org r')
    expect(pv.plan).toBeNull()
    expect((await miEspacio()).fecha_local).toBeNull()
  })

  it('abierta sin versión → plan con título y fecha null; publicada → la fecha de la opción vigente en los tres', async () => {
    const r = await ok(O, 'create_proposal', {
      p_espacio_id: esp, p_titulo: 'Asado t-0056', p_franjas: FRANJAS, p_minimo: 2, p_maximo: 4,
      p_imprescindible_id: (await ok(O, 'get_space', { p_espacio_id: esp })).espacio.mi_miembro_id,
      p_plazo: PLAZO, p_zona_horaria: 'America/Santiago', p_intento_id: intento(),
    })
    const p = r.resultado.propuesta_id as string
    // Un borrador no es plan destacado.
    expect((await preview()).plan).toBeNull()
    await ok(O, 'open_proposal', { p_propuesta_id: p })
    expect((await preview()).plan).toEqual({ titulo: 'Asado t-0056', fecha_local: null })
    expect((await resumen(p)).fecha_local).toBeNull()

    for (const s of [O, U]) await ok(s, 'save_my_conditions', { p_propuesta_id: p, p_disponibilidad: SI })
    await ok(O, 'evaluate_and_publish', { p_propuesta_id: p, p_intento_id: intento() })
    const fecha = FRANJAS[0].inicio // la franja A, la más temprana viable
    expect((await resumen(p)).fecha_local).toBe(fecha)
    expect((await miEspacio()).fecha_local).toBe(fecha)
    const pv = await preview()
    expect(pv.plan).toEqual({ titulo: 'Asado t-0056', fecha_local: fecha })
    // Nada privado ni conteos en la vista por código.
    const txt = JSON.stringify(pv)
    for (const x of ['disponibilidad', 'confirmados', 'minimo', 'interesados', 'condiciones', 'Uno r"', O.userId, U.userId]) {
      if (x === 'Uno r"') continue // los nombres de la lista de integrantes ya eran públicos (enmienda 9)
      expect(txt).not.toContain(x)
    }

    // Cancelada: deja de ser plan destacado.
    await ok(O, 'cancel_proposal', { p_propuesta_id: p })
    expect((await preview()).plan).toBeNull()
    expect((await miEspacio()).fecha_local).toBeNull()
    expect((await resumen(p)).fecha_local).toBe(fecha) // el resumen de una propuesta sigue diciendo su fecha
  })
})
