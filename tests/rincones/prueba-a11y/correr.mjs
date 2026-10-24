// Autoprueba del módulo a11y.mjs sobre una página local con fallas sembradas (idioma, título, h1, nombres, etiqueta,
// objetivo, pestañas, aria-hidden, contraste, foco sin indicador, foco bajo la barra fija, espaciado, anuncios).
// No toca la base ni la app. Uso: node tests/rincones/prueba-a11y/correr.mjs  → luego node resumen-a11y.mjs <json> --todo
import { abrir, actor } from '../lib.mjs'
import { rinconA11y, anunciado, guardarA11y } from '../a11y.mjs'
const b = await abrir(); const p = await actor(b, 'prueba')
await p.goto(new URL('./pagina.html', import.meta.url).href)
await rinconA11y(p, 'P1', 'página de prueba con fallas sembradas')
await p.evaluate(() => { document.getElementById('vivo').textContent = 'Guardado de prueba' })
await anunciado(p, 'P1', 'prueba', 'Guardado de prueba')
await p.evaluate(() => { const d = document.createElement('p'); d.textContent = 'Mensaje mudo'; document.querySelector('main').append(d) })
await anunciado(p, 'P1', 'prueba', 'Mensaje mudo')
console.log(guardarA11y('a11y-prueba')); await b.close()
