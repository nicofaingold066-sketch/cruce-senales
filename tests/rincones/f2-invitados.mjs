// Fase 2: invitados reales entran por el enlace del grupo creado en f1 y responden; el organizador busca la opción,
// se confirma la v1, alguien se baja, se repara a v2. Una sesión (contexto) por persona.
import { abrir, actor, BASE, rincon, nota, guardar, log, boton, esperarTexto, errores, CARPETA } from './lib.mjs'
import { leer, escribir, guardarSesion, rutaSesion } from './estado.mjs'
const g = leer()
const b = await abrir()
const org = await actor(b, 'org', { storageState: rutaSesion('org') })
const txt = async (p) => (await p.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 420)
const T = (p, ms = 1500) => p.waitForTimeout(ms)
const corto = async (id, p, f) => { try { await f() } catch (e) { nota(id, `ERROR DEL GUION: ${String(e).split('\n')[0].slice(0, 220)}`); await p.screenshot({ path: `${CARPETA}/${id}-error.png` }).catch(() => {}) } }
const pestana = async (p, n) => { await p.getByRole('tab', { name: n }).click(); await T(p, 1500) }
const siNo = (p, franja, v) => p.locator('fieldset', { hasText: `Franja ${franja}` }).getByText(v, { exact: true }).click()
const guardarCond = async (p) => { await boton(p, 'Guardar condiciones').click(); await esperarTexto(p, 'Guardado', 15000) }

// ---- Ana entra por el enlace ----
const ana = await actor(b, 'ana')
await corto('R40', ana, async () => {
  await ana.goto(`${BASE}/#/unirse/${g.codigo}`); await T(ana, 4500)
  await rincon(ana, 'R40', 'Invitación: "¿Quién eres?" con lista de integrantes anotados', { foco: true }); nota('R40', await txt(ana))
})
await corto('R41', ana, async () => {
  await ana.getByRole('button', { name: /Ana/ }).first().click(); await T(ana, 800)
  await rincon(ana, 'R41', 'Invitación: confirmar "¿Eres Ana?"', { foco: true }); nota('R41', await txt(ana))
  await ana.getByRole('button', { name: /Sí, soy Ana/ }).click()
  await ana.waitForURL(/#\/e\//, { timeout: 30000 }); await T(ana, 3500)
  await guardarSesion(ana)
})
await corto('R42', ana, async () => {
  await rincon(ana, 'R42', 'Espacio visto por una invitada (Ana) con propuesta abierta', { foco: true }); nota('R42', await txt(ana))
})
// Ana abre la propuesta
await corto('R43', ana, async () => {
  await ana.getByText('Partido de pádel el sábado').first().click(); await T(ana, 3500)
  await rincon(ana, 'R43', 'Propuesta abierta, Plan, vista de invitada (sin interés aún)', { foco: true }); nota('R43', await txt(ana))
})
await corto('R44', ana, async () => {
  await pestana(ana, 'Mi respuesta')
  await rincon(ana, 'R44', 'Mi respuesta: sin marcar nada (todo Pendiente)', { foco: true }); nota('R44', await txt(ana))
  // guardar con solo A
  await siNo(ana, 'A', 'Sí puedo'); await guardarCond(ana)
  await rincon(ana, 'R45', 'Mi respuesta: guardó solo la franja A (condiciones incompletas)'); nota('R45', await txt(ana))
  await siNo(ana, 'B', 'No puedo'); await guardarCond(ana)
  await rincon(ana, 'R46', 'Mi respuesta: A sí, B no, guardado completo'); nota('R46', await txt(ana))
  await boton(ana, 'Me interesa').click(); await esperarTexto(ana, 'Marcaste "Me interesa"', 15000)
  await rincon(ana, 'R47', 'Mi respuesta: marcó "Me interesa"'); nota('R47', await txt(ana))
})

// ---- Beto y Caro ----
for (const [id, n] of [['beto', 'Beto'], ['caro', 'Caro']]) {
  const p = await actor(b, id)
  await corto(`R48${id}`, p, async () => {
    await p.goto(`${BASE}/#/unirse/${g.codigo}`); await T(p, 4000)
    await p.getByRole('button', { name: new RegExp(n) }).first().click(); await T(p, 600)
    await p.getByRole('button', { name: new RegExp(`Sí, soy ${n}`) }).click()
    await p.waitForURL(/#\/e\//, { timeout: 30000 }); await T(p, 3000)
    await p.getByText('Partido de pádel el sábado').first().click(); await T(p, 3000)
    await pestana(p, 'Mi respuesta')
    await siNo(p, 'A', 'No puedo'); await siNo(p, 'B', 'Sí puedo'); await guardarCond(p)
    await guardarSesion(p)
    log(`${n} respondió`)
  })
}
// Organizador: interés y condiciones
await corto('R49', org, async () => {
  await org.goto(`${BASE}/#/e/${g.espacioId}/p/${g.propuestaId}`); await T(org, 3500)
  await pestana(org, 'Mi respuesta')
  await siNo(org, 'A', 'Sí puedo'); await siNo(org, 'B', 'Sí puedo'); await guardarCond(org)
  await boton(org, 'Me interesa').click(); await T(org, 1500)
  await pestana(org, 'Plan')
  await rincon(org, 'R49', 'Plan del organizador con condiciones cargadas: listo para buscar opción', { foco: true }); nota('R49', await txt(org))
})
await corto('R50', org, async () => {
  await org.getByRole('button', { name: /opción|Buscar/i }).first().click(); await T(org, 5000)
  await rincon(org, 'R50', 'Opción publicada v1 (esperando compromisos), vista organizador', { foco: true }); nota('R50', await txt(org))
})
await guardarSesion(org)
console.log('ERRORES', JSON.stringify(errores))
console.log(guardar('f2'))
await b.close()
