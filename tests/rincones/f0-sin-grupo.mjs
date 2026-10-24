// Fase 0: rincones que no necesitan un grupo (portada, validaciones, rutas raras, sin red). Sesión anónima nueva.
import { abrir, actor, BASE, rincon, nota, marcar, guardar, log, boton, esperarTexto, errores } from './lib.mjs'
const b = await abrir()
const p = await actor(b, 'f0')
const ir = async (hash, espera = 2500) => { await p.goto(`${BASE}/${hash}`); await p.waitForTimeout(espera) }

// R01 portada sin nombre (la entrada animada dura ~2,9 s)
await p.goto(BASE); await p.waitForTimeout(700)
await rincon(p, 'R00', 'Entrada animada (Intro) a los 0,7 s', { anchos: [{ n: '375', w: 375, h: 812 }], completa: false })
await p.waitForTimeout(3500)
await rincon(p, 'R01', 'Portada sin nombre, sesión anónima nueva', { foco: true })

// R02 entrar con nombre vacío
const entrar = p.getByRole('button', { name: 'Entrar', exact: true })
nota('R02', `Entrar vacío: deshabilitado=${await entrar.isDisabled()}`)
await p.getByPlaceholder('Tu nombre').fill('   ')
nota('R02', `Entrar con solo espacios: deshabilitado=${await entrar.isDisabled()}`)
await p.getByPlaceholder('Tu nombre').fill('X'.repeat(60))
nota('R02', `Nombre de 60 caracteres: valor guardado de ${(await p.getByPlaceholder('Tu nombre').inputValue()).length}`)
await rincon(p, 'R02', 'Portada: nombre vacío o muy largo', { anchos: [{ n: '375', w: 375, h: 812 }] })
await p.getByPlaceholder('Tu nombre').fill('')

// R03 Unirme con un código vacío / inexistente
// S1 (friccion, wip/friccion 0b5e4d1): «Unirme con un código» está dentro de la fila plegable «Tengo un código de invitación»; si no se ve, se abre.
const unirme = p.getByRole('button', { name: 'Unirme', exact: true })
if (!(await unirme.isVisible().catch(() => false))) { await p.getByText('Tengo un código de invitación').first().click().catch(() => {}); await p.waitForTimeout(500) }
nota('R03', `Unirme vacío: deshabilitado=${await unirme.isDisabled()}`)
const campos = p.locator('form').last().locator('input')
await campos.nth(0).fill('ZZZZ9999'); await campos.nth(1).fill('Pruebas')
await unirme.click(); await p.waitForTimeout(3000)
nota('R03', `Código inexistente: URL ${p.url().replace(BASE, '')}; texto visible: ${(await p.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 260)}`)
await rincon(p, 'R03', 'Portada: código inexistente', { foco: false })

// R04 enlace de invitación con código inexistente
await ir('#/unirse/ZZZZ9999', 3500)
nota('R04', (await p.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 300))
await rincon(p, 'R04', 'Enlace #/unirse/<código inexistente>', { foco: true })

// R05 enlace mal copiado
await ir('#/unirse/%', 3000)
nota('R05', (await p.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 300))
await rincon(p, 'R05', 'Enlace #/unirse/% (mal copiado)')
await ir('#/unirse/ab', 3000)
nota('R05', 'código de 2 caracteres: ' + (await p.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 200))

// R06 ruta desconocida
await ir('#/cosa-rara/x/y', 2500)
await rincon(p, 'R06', 'Ruta desconocida (#/cosa-rara/x/y)')
nota('R06', 'texto: ' + (await p.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 160))

// R07 espacio y propuesta inexistentes
await ir('#/e/00000000-0000-0000-0000-000000000000', 5000)
nota('R07', 'espacio inexistente: ' + (await p.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 300))
await rincon(p, 'R07', 'Espacio inexistente (uuid válido sin datos)')
await ir('#/e/no-es-uuid', 5000)
nota('R07b', 'espacio con id inválido: ' + (await p.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 300))
await rincon(p, 'R07b', 'Espacio con id que no es uuid')
await ir('#/e/00000000-0000-0000-0000-000000000000/p/00000000-0000-0000-0000-000000000000', 5000)
nota('R08', 'propuesta inexistente: ' + (await p.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 300))
await rincon(p, 'R08', 'Propuesta inexistente')
await ir('#/e/00000000-0000-0000-0000-000000000000/nueva', 4000)
nota('R09', 'nueva propuesta de espacio inexistente: ' + (await p.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 300))
await rincon(p, 'R09', 'Nueva propuesta en espacio inexistente')

// R10 Planes, Perfil y Crear sin nombre ni grupos
for (const [id, h, nom] of [['R10', '#/planes', 'Planes sin grupos (sin nombre local)'], ['R11', '#/perfil', 'Perfil sin nombre'], ['R12', '#/crear', 'Crear grupo sin nombre local'], ['R13', '#/entrar', 'Ruta #/entrar']]) {
  await ir(h, 3000)
  nota(id, (await p.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 260))
  await rincon(p, id, nom, { foco: id !== 'R13' })
}

// R14 sin red: portada y acción
await ir('', 4000)
await p.context().setOffline(true); await p.waitForTimeout(800)
nota('R14', 'aviso sin conexión visible: ' + ((await p.getByText('Sin conexión').count()) > 0))
await p.getByPlaceholder('Tu nombre').fill('Sin Red'); await boton(p, 'Entrar').click().catch(() => {}); await p.waitForTimeout(1500)
nota('R14', 'tras Entrar sin red: ' + (await p.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 260))
await rincon(p, 'R14', 'Portada sin conexión (aviso global)')
await p.context().setOffline(false); await p.waitForTimeout(1500)
nota('R14', 'tras volver la red, aviso: ' + ((await p.getByText('Sin conexión').count()) > 0))

console.log('ERRORES', JSON.stringify(errores))
console.log(guardar('f0'))
await b.close()
