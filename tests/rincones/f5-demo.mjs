// Fase 5: el DEMO ("Los del finde") en una sesión propia: espacio, herramientas, nueva propuesta precargada, Simulación,
// condiciones del caso, confirmación simulada, baja simulada y reparación. No se resetea el demo ni se llama al agente.
import { abrir, actor, BASE, rincon, nota, guardar, log, boton, esperarTexto, errores, CARPETA, revisar } from './lib.mjs'
import { escribir, guardarSesion } from './estado.mjs'
const b = await abrir()
const t = await actor(b, 'tomi')
const txt = async (p) => (await p.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 520)
const T = (ms = 1500) => t.waitForTimeout(ms)
const corto = async (id, f) => { try { await f() } catch (e) { nota(id, `ERROR DEL GUION: ${String(e).split('\n')[0].slice(0, 220)}`); await t.screenshot({ path: `${CARPETA}/${id}-error.png` }).catch(() => {}) } }
const pestana = async (n) => { await t.getByRole('tab', { name: n }).click(); await T(1500) }
await t.goto(BASE); await t.waitForTimeout(4200)
await corto('R100', async () => {
  await boton(t, /^Probar la demo «Los del (asado|finde)»$/).click(); await t.waitForURL(/#\/e\//, { timeout: 40000 }); await T(4500)
  escribir({ demoEspacio: t.url().split('/e/')[1].split('/')[0] }); await guardarSesion(t)
  await rincon(t, 'R100', 'Demo: espacio "Los del finde" recién abierto (Tomi organiza, 5 simulados)', { foco: true }); nota('R100', await txt(t))
})
await corto('R101', async () => {
  await t.getByText('Herramientas del organizador').click().catch(() => {}); await T(600)
  await rincon(t, 'R101', 'Demo: Herramientas del organizador abiertas'); nota('R101', await txt(t))
})
await corto('R102', async () => {
  await t.getByRole('link', { name: /Crear propuesta|Nueva propuesta/ }).first().click(); await T(2500)
  await rincon(t, 'R102', 'Demo: Nueva propuesta precargada con el caso', { foco: false }); nota('R102', await txt(t))
  await revisar(t); await T(800)
  await boton(t, 'Crear y abrir al grupo').click(); await t.waitForURL(/\/p\//, { timeout: 40000 }); await T(3500)
  await rincon(t, 'R103', 'Demo: propuesta abierta, Plan (reuniendo interés)', { foco: true }); nota('R103', await txt(t))
})
await corto('R104', async () => {
  await pestana('Simulación')
  await rincon(t, 'R104', 'Demo: pestaña Simulación', { foco: true }); nota('R104', await txt(t))
  await t.getByRole('button', { name: /Cargar condiciones del caso/ }).click(); await T(5000)
  await rincon(t, 'R105', 'Demo: Simulación tras cargar las condiciones del caso'); nota('R105', await txt(t))
})
await corto('R106', async () => {
  await pestana('Mi respuesta')
  for (const f of ['A', 'B']) await t.locator('fieldset', { hasText: `Franja ${f}` }).getByText('Sí puedo', { exact: true }).click()
  await boton(t, 'Guardar condiciones').click(); await esperarTexto(t, 'Guardado', 15000)
  await pestana('Plan')
  await rincon(t, 'R106', 'Demo: Plan listo para buscar opción (Tomi cargó sus condiciones)'); nota('R106', await txt(t))
  await t.getByRole('button', { name: /opción|Buscar/i }).first().click(); await T(6000)
  await rincon(t, 'R107', 'Demo: v1 publicada', { foco: true }); nota('R107', await txt(t))
})
await corto('R108', async () => {
  await pestana('Simulación')
  await t.getByRole('button', { name: /^Aceptar versión 1 por /i }).first().click(); await T(4000)
  await rincon(t, 'R108', 'Demo: Simulación tras aceptar v1 por un simulado'); nota('R108', await txt(t))
  const bajas = t.getByRole('button', { name: /^Se baja: / })
  nota('R108', 'botones "Se baja": ' + (await bajas.count()))
  await bajas.first().click(); await T(5000)
  await pestana('Plan')
  await rincon(t, 'R109', 'Demo: tras baja simulada, estado resultante', { foco: true }); nota('R109', await txt(t))
})
console.log('ERRORES', JSON.stringify(errores)); console.log(guardar('f5')); await b.close()
