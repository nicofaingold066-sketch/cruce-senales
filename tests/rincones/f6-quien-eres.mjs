// Fase 6: variantes de entrada por invitación: nombre nuevo ("No estoy en la lista"), nombre en uso, navegador que ya es miembro,
// "Entrar como otra persona", reclamar lugar simulado del demo, Perfil (editar nombre, entrar como otra persona), "Hoy paso".
import { abrir, actor, BASE, rincon, nota, guardar, boton, esperarTexto, errores, CARPETA } from './lib.mjs'
import { leer, guardarSesion, rutaSesion } from './estado.mjs'
const g = leer()
const b = await abrir()
const txt = async (p) => (await p.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 520)
const T = (p, ms = 1500) => p.waitForTimeout(ms)
const corto = async (id, p, f) => { try { await f() } catch (e) { nota(id, `ERROR DEL GUION: ${String(e).split('\n')[0].slice(0, 220)}`); await p.screenshot({ path: `${CARPETA}/${id}-error.png` }).catch(() => {}) } }
// A. persona nueva que no está en la lista
const d = await actor(b, 'dani')
await corto('R120', d, async () => {
  await d.goto(`${BASE}/#/unirse/${g.codigo}`); await T(d, 4000)
  await d.getByRole('button', { name: /No estoy en la lista/ }).click().catch(() => {}); await T(d, 700)
  await rincon(d, 'R120', 'Invitación: "No estoy en la lista" (escribir nombre nuevo)', { foco: true }); nota('R120', await txt(d))
})
await corto('R121', d, async () => {
  const campos = d.locator('form input'); const n = await campos.count(); nota('R121', `campos en el formulario: ${n}`)
  await campos.last().fill('Ana'); await boton(d, 'Unirme').click(); await T(d, 3500)
  await rincon(d, 'R121', 'Invitación: nombre ya en uso ("Ana")'); nota('R121', await txt(d))
  await campos.last().fill('Dani'); await boton(d, 'Unirme').click(); await d.waitForURL(/#\/e\//, { timeout: 30000 }); await T(d, 3500)
  await guardarSesion(d)
  await rincon(d, 'R122', 'Espacio visto por una persona que entró escribiendo su nombre (Dani, sin respuestas)'); nota('R122', await txt(d))
})
// B. mismo navegador que ya es miembro vuelve a abrir el enlace
await corto('R123', d, async () => {
  await d.goto(`${BASE}/#/unirse/${g.codigo}`); await T(d, 4500)
  await rincon(d, 'R123', 'Invitación abierta en un navegador que YA es miembro ("Seguir como Dani")', { foco: true }); nota('R123', await txt(d))
  await d.getByRole('button', { name: /Entrar como otra persona|Elegir otro nombre|Seguir como/ }).first().click({ timeout: 4000 }).catch(() => nota('R123', 'sin botón para cambiar de persona')); await T(d, 800)
  await rincon(d, 'R124', 'Confirmación de "Entrar como otra persona"'); nota('R124', await txt(d))
})
// C. Perfil: editar nombre, grupos
const o = await actor(b, 'org', { storageState: rutaSesion('org') })
await corto('R125', o, async () => {
  await o.goto(`${BASE}/#/perfil`); await T(o, 3500)
  // S2b (mockup 13): el nombre se edita tras «Cambiar» (al lado de «Así te ven tus amigos»).
  await o.getByRole('button', { name: /^Cambiar/ }).click().catch(() => {}); await T(o, 500)
  await o.getByPlaceholder(/./).first().fill('Rincon Org 2').catch(() => {})
  await boton(o, 'Guardar nombre').click().catch(() => {}); await T(o, 1200)
  await rincon(o, 'R125', 'Perfil: guardó un nombre nuevo (solo local)', { foco: true }); nota('R125', await txt(o))
  await o.getByLabel(/Cómo te llaman/).fill('Rincon Org'); await boton(o, 'Guardar nombre').click().catch(() => {})
})
// D. Hoy paso (Beto)
const be = await actor(b, 'beto', { storageState: rutaSesion('beto') })
await corto('R126', be, async () => {
  await be.goto(`${BASE}/#/e/${g.espacioId}`); await T(be, 3500)
  await rincon(be, 'R126', 'Espacio visto por un invitado con un plan confirmado y uno cancelado', { foco: false }); nota('R126', await txt(be))
})
// E. Reclamar un lugar simulado del demo desde otro navegador
const demo = g.demoEspacio ? await (async () => { const t = await actor(b, 'tomi', { storageState: rutaSesion('tomi') }); await t.goto(`${BASE}/#/e/${g.demoEspacio}`); await T(t, 3500); return (await t.locator('.codigo').first().textContent()).trim() })() : null
if (demo) {
  const j = await actor(b, 'jurado')
  await corto('R127', j, async () => {
    await j.goto(`${BASE}/#/unirse/${demo}`); await T(j, 4500)
    await rincon(j, 'R127', 'Invitación al DEMO: lista con personas simuladas reclamables', { foco: true }); nota('R127', await txt(j))
    await j.getByRole('button', { name: /Mati/ }).first().click({ timeout: 4000 }); await T(j, 800)
    await rincon(j, 'R128', 'Demo: confirmar "¿Eres Mati?" (lugar simulado)'); nota('R128', await txt(j))
    await j.getByRole('button', { name: /Sí, soy Mati/ }).click(); await j.waitForURL(/#\/e\//, { timeout: 30000 }); await T(j, 3500)
    await rincon(j, 'R129', 'Demo: espacio tras reclamar el lugar de Mati (jurado)'); nota('R129', await txt(j))
  })
}
console.log('ERRORES', JSON.stringify(errores)); console.log(guardar('f6')); await b.close()
