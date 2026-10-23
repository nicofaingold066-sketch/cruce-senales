// Banco #69: importa el SDK, los helpers y la pantalla originales, sin copiar su lógica.
// Solo lo carga el runner local con TODA salida externa interceptada.
import React from 'react'
import { createRoot } from 'react-dom/client'
import { supabase } from '../../src/lib/supabase'
import { entrarComoOtraPersona, volverAGuardada, leerGuardada, olvidarGuardada } from '../../src/lib/sesiones'
import { ShellProvider } from '../../src/lib/shell'
import Inicio from '../../src/screens/Inicio'
import App from '../../src/App'
import '../../src/styles.css'

const CLAVE = 'cruxe:sesion-guardada'
const setOriginal = Storage.prototype.setItem
window.sesionesQA = {
  lista: false,
  poner: async session => {
    const r = await supabase.auth.setSession(session)
    return { ok: !r.error }
  },
  estado: async () => {
    const { data } = await supabase.auth.getSession()
    return { actual: data.session?.user?.user_metadata?.ficticio ?? null,
      guardada: leerGuardada()?.etiqueta ?? null }
  },
  guardarFicticia: (refresh_token, etiqueta = 'Tomi en «Los del asado»') =>
    localStorage.setItem(CLAVE, JSON.stringify({ refresh_token, etiqueta })),
  tokenGuardadoEs: ficticio => leerGuardada()?.refresh_token === ficticio,
  cambiar: () => entrarComoOtraPersona('Tomi en «Los del asado»'),
  volver: () => volverAGuardada(leerGuardada()),
  olvidar: olvidarGuardada,
  bloquearGuardado: () => {
    Storage.prototype.setItem = function (k, v) {
      if (k === CLAVE) throw new DOMException('Almacenamiento bloqueado de prueba', 'SecurityError')
      return setOriginal.call(this, k, v)
    }
  },
}
function Banco() {
  const [vista, setVista] = React.useState(new URL(location.href).searchParams.get('modo') || '')
  window.sesionesQA.mostrarInicio = () => setVista('inicio')
  window.sesionesQA.mostrarApp = () => {
    const u = new URL(location.href)
    u.searchParams.set('modo', 'app')
    history.replaceState(null, '', u)
    setVista('app')
  }
  return <ShellProvider soloLectura={false}>{vista === 'app' ? <App /> : vista === 'inicio' ? <Inicio /> : <p>Banco offline de sesiones ficticias.</p>}</ShellProvider>
}
createRoot(document.getElementById('root')).render(<Banco />)
await supabase.auth.getSession()
window.sesionesQA.lista = true
