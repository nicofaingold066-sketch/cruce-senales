# Parche para las pantallas de Juan: conectar las piezas de la noche

Dueño del documento: ux-flujo (rama `wip/ux`). Pedido del coordinador (21:12). Escrito: viernes 23 oct 2026, 21:21.
El parche toca solo `src/screens/**` (rutas de front-juan). **No está subido a ninguna rama de código**: lo aplica Juan (o el coordinador, si Nico lo decide). Archivo listo para `git apply`: `docs/parche-capturas/pantallas.patch`.

## 1. Cómo aplicarlo (un minuto)

Base: `origin/wip/fundamentos` con `origin/wip/friccion`, `origin/wip/apertura` y `origin/wip/ux` fusionadas (las piezas viven en esas ramas: `src/componentes-nuevos/**`, `src/friccion/**`, `src/lib/ejemplos.ts`).

```bash
git fetch origin && git merge origin/wip/fundamentos origin/wip/friccion origin/wip/apertura origin/wip/ux
git show origin/wip/ux:docs/parche-capturas/pantallas.patch > /tmp/pantallas.patch
git apply --check /tmp/pantallas.patch && git apply /tmp/pantallas.patch
npm run typecheck && npm run build
```

Comprobado: `git apply --check` limpio sobre esa base recién fusionada (entre 21:20 y 21:21). Si alguna rama avanzó y un trozo no entra, cada cambio está explicado abajo con archivo, lugar y props para hacerlo a mano.

## 2. Qué conecta

| Pieza (dueño) | Pantalla y lugar | Props | Qué hace |
|---|---|---|---|
| `espacio` en las pestañas (ux-flujo) | `tabs.ts` (`PestanaProps.espacio?`) y `Propuesta.tsx` (`props = { …, espacio }`) | — | Las pestañas reciben el espacio (código de invitación y si es demo) que `Propuesta.tsx` ya cargaba |
| `AvisoParaMi` (ux-flujo) | `PlanTab.tsx`, primer hijo del `<div>` | `p`, `servidorAhora={viva.servidorAhora}`, `irARespuesta={() => irAPestana('respuesta')}` | "Esta versión no te incluye", "Si no llegan N, nadie queda comprometido", "Así no puedes, pero sigues", "Una persona se retiró", "Se armó la juntada", "Hoy conviene recordar" (organizador, cerca del cierre). Nada si no corresponde |
| `FaltaTuRespuesta` (friccion) | `PlanTab.tsx`, antes de `BuscarOpcion` | `p`, `espacioId={p.espacio_id}` | "Falta tu respuesta" + "Responder en un toque" (también al organizador que no puede faltar) |
| `RecordarFaltan` motivo `faltan` (ux-flujo) | `PlanTab.tsx`, tarjeta "Avisar al grupo" en `reuniendo_interes`, solo quien organiza | `codigo`, `titulo` | WhatsApp sin nombres ni conteos: "Recordatorio para «X»…" |
| `BuscarLugar` (ux-flujo, D10) | `PlanTab.tsx` › `OpcionVigente`, debajo de la franja | `titulo={p.titulo}`, `demo` | "Buscar el lugar en el mapa" (Google Maps con el título; oculto en el demo) |
| `AsiNoPuedo` (friccion, E13 a) | `PlanTab.tsx` › `OpcionVigente`, después del bloque de "Confirmar versión N" | `p`, `viva`, `soloLectura`, `irAPestana` | "Así no puedo, pero sigo" / "Ya no: puedo así". Llama a `api.opinarVersion` (la sube backend con la enmienda 13); hasta entonces responde "todavía no está disponible" |
| `RearmarConLoNuevo` (ux-flujo, E13 b) | `PlanTab.tsx`, después de `OpcionVigente`, en `esperando_compromisos`, solo quien organiza | `p`, `viva`, `soloLectura` | Con 2 o más "así no puedo": "Rearmar con lo nuevo" (`propose_repair`); tope de 3 versiones; con 1, nada |
| `RecordarFaltan` motivo `version_nueva` / `reparacion` (ux-flujo) | `PlanTab.tsx`, tarjeta "Avisar al grupo" en `esperando_compromisos`, solo quien organiza | `codigo`, `titulo`, `motivo={p.opcion_anterior ? 'reparacion' : 'version_nueva'}`, `cuando` | "Hay opción para «X»… si no puedes, no confirmes…" |
| `RecordarFaltan` motivo `confirmado` (ux-flujo) | `PlanTab.tsx` › `CierrePlan`, en lugar del enlace de WhatsApp (que queda si no hay código) | `codigo`, `titulo`, `cuando`, `cuposLibres={o.cupos.disponibles}` | "Se juntan: «X»… Quedan 2 cupos. Si vas y no confirmaste, toca y confirma: <enlace>" (sin nombres) |
| `AyudaRetiro` (ux-flujo) | `RespuestaTab.tsx` › `Retiro`, antes del botón "Retirarme de esta propuesta" | `p` | "Si solo esta fecha no te sirve…" según el momento; con E13, "usa «Así no puedo, pero sigo»" |
| `TomarDeCalendario` (friccion, #90) | `RespuestaTab.tsx` › `MisCondiciones`, antes de `EditorCondiciones`, **solo en el demo** | `franjas`, `semilla`, `onTomar={(d) => b.reemplazar(d)}`, `deshabilitado` | Agenda ficticia que sugiere las franjas |
| `atajosParaGrupo` y `placeholderPlan` (apertura) | `NuevaPropuesta.tsx`: se borra `ACTIVIDADES`; el carrusel usa `atajosParaGrupo(espacio.nombre)`; placeholder del título | — | "Los del pádel" ve Pádel primero; "Asado" ya no encabeza siempre |
| `CampoQuienViene` + `conQuienViene` (friccion, D3) y `placeholderGrupo` (apertura) | `CrearGrupo.tsx`, debajo de `CampoIntegrantes`; `createSpace(conQuienViene(nombre, quienViene), …)` | `valor`, `cambiar`, `nombre` | "¿Quién viene?" (solo el grupo / con parejas / abierta) como marca en el nombre, sin migración |
| `QueGuarda` (friccion) | `Perfil.tsx`, al final | — | Plegable "¿Qué guarda CRUXE de mí?" |
| Texto de "Mi respuesta" con la versión vigente (coordinador 21:30, enmienda 13 / 0046) | `RespuestaTab.tsx`, `razonSinGuardar` | — | "Estás en la versión vigente. Si esta fecha no te sirve, marca «Así no puedo, pero sigo» y podrás cambiar cuándo puedes." (sin ese texto decía que la disponibilidad no podía cambiar) |
| `UnirseConNombre` + `useUnirse` (friccion, fila 43) | `Inicio.tsx`: `UnirsePortada` reemplaza al formulario viejo `UnirsePorCodigo` (se borra) | `codigoInicial`, `deshabilitado` | Un solo formulario de unión: mismos rótulos ("Código de invitación", "Tu nombre en el espacio", "Unirme"), reclama al integrante anotado o lleva a "¿Quién eres?" |

Lo que NO toca: rótulos que buscan los guiones de `tests/e2e/` (la lista fija de `prompts/equipo-noche.md`), `src/login/**`, `src/friccion/**`, `src/agente/**`, `src/lib/**`.

## 3. Verificación (copia local descartable, sin subir)

| Prueba | Resultado | Hora |
|---|---|---|
| `git apply --check` sobre base recién fusionada | limpio | entre 21:20 y 21:21 |
| `npm run typecheck` | verde | entre 21:20 y 21:21 |
| `npx vite build` | verde | entre 21:20 y 21:21 |
| `node tests/e2e/red-controlada.mjs` (sin base) | **10/10** | 21:16 |
| `node --test "src/componentes-nuevos/*.test.mjs"` | 34/34 | entre 21:20 y 21:21 |
| `recorrido-dos-sesiones.mjs` contra el build del parche | **23/23** (21:23 y de nuevo 21:33 con el parche final) | 21:33-21:34 |
| `jurado-navegador.mjs` contra el build | **4/4**, 174 RPC, privacidad sin hallazgos (21:25 y 21:35) | 21:34-21:35 |
| Capturas con comprobaciones (3 sesiones) | **16/16**, 24 imágenes a 375 y 320 px en `docs/parche-capturas/` | 21:32-21:33 |
| Enmienda 13 de punta a punta (6 sesiones, con `api.opinarVersion` de backend `4022f62`): 5 invitados en 4 toques, 2 "así no puedo" con el botón real de friccion, el organizador ve "Algunos no pueden así" sin nombres, "Rearmar con lo nuevo", versión 2 sin confirmaciones heredadas, baja de una persona que los demás ven como "Una persona se bajó" | **26/26** | 21:30-21:32 |

Base de la prueba: `wip/fundamentos` + `wip/friccion` (`1623ee8`, que arregla un typecheck que rompían los tipos nuevos de backend) + `wip/apertura` + `wip/ux` + `wip/backend` (`4022f62`). Typecheck completo verde con todo eso junto.

Forma de la enmienda 13 (c) que el parche tiene en cuenta (leída en la migración `0043` de backend): las bajas de otras personas llegan como `miembro: { miembro_id: null, nombre: "Una persona" }` y `habia_aceptado: null`, y el evento de baja del historial con ese mismo actor. `Propuesta.tsx` y `PlanTab.tsx` no se rompen con esa forma (no hace falta tocarlos por eso).

Agregado a las 21:36: el texto de `RespuestaTab.tsx` del aviso del coordinador de las 21:30 (solo un texto; typecheck verde; las pruebas de arriba no lo cubren).

## 4. Notas para Juan

- `AsiNoPuedo` necesita `api.opinarVersion` en `src/lib/api.ts` (backend, con la enmienda 13). Sin eso, el botón aparece y responde "todavía no está disponible".
- `Inicio.tsx` es el cambio más grande (borra el formulario viejo). Si preferís no tocar la portada esta noche, aplicá el parche sin ese archivo: `git apply --exclude=src/screens/Inicio.tsx /tmp/pantallas.patch`.
- En el plan del organizador, "responder" aparece tres veces (estado del servidor, el aviso viejo "Aún no completaste tus condiciones" y "¿Cuándo puedes?" de friccion). Sugerencia: sacar el aviso viejo; antes avisar a qa-noche (`tests/e2e/convencer-uno.mjs:202` toca "Ir a Mi respuesta").
- Los textos de la auditoría de tono de psico (§16: "Bajas registradas" → "Cambios en el grupo", "anfitrión" → "no puede faltar", etc.) NO están en este parche: son pedidos aparte en la ficha de psico, y algunos cambian rótulos que buscan los guiones (avisar antes a qa-noche).

## 5. El parche completo

```diff
diff --git a/src/screens/CrearGrupo.tsx b/src/screens/CrearGrupo.tsx
index 82f0da5..520ba71 100644
--- a/src/screens/CrearGrupo.tsx
+++ b/src/screens/CrearGrupo.tsx
@@ -1,4 +1,4 @@
-import { useState } from 'react'
+import { useMemo, useState } from 'react'
 import type { FormEvent } from 'react'
 import { api } from '../lib/api'
 import type { TipoEspacio } from '../lib/types'
@@ -8,6 +8,10 @@ import { recordarNombreSiFalta, usePerfil } from '../lib/perfil'
 import { Aviso, Boton, ErrorCaja } from '../components/ui'
 import { Icono } from '../components/Icono'
 import { CampoIntegrantes } from '../login/Integrantes'
+import { CampoQuienViene } from '../friccion/QuienViene'
+import { conQuienViene } from '../lib/compartir'
+import type { QuienViene } from '../lib/compartir'
+import { ejemploPorSemilla, placeholderGrupo } from '../lib/ejemplos'
 
 // Crear un grupo propio (un "espacio" del contrato). Solo lo social: el tipo queda fijo en "amigos"
 // (decisión de Nico y Juan, 11:51). Después se invita con el enlace desde la pantalla del grupo.
@@ -19,6 +23,10 @@ export default function CrearGrupo() {
   const [visible, setVisible] = useState(() => perfil?.nombre ?? '')
   // Enmienda 9 (fase 2, sesión login): los nombres del grupo; cada uno elige el suyo al abrir la invitación.
   const [integrantes, setIntegrantes] = useState<string[]>([])
+  // D3 de psico (friccion): quién viene es una regla del grupo; va como marca en el nombre, sin migración.
+  const [quienViene, setQuienViene] = useState<QuienViene | null>(null)
+  // Apertura: el ejemplo del nombre rota (no siempre "Los del asado").
+  const ej = useMemo(() => ejemploPorSemilla(new Date().toDateString()), [])
   const tipo: TipoEspacio = 'amigos'
   const { ocupado, error, ejecutar } = useAccion()
   const faltan = nombre.trim() === '' || visible.trim() === ''
@@ -27,7 +35,7 @@ export default function CrearGrupo() {
     e.preventDefault()
     if (faltan) return
     const r = await ejecutar(`crear:${nombre}:${tipo}:${visible}:${integrantes.join('|')}`, () =>
-      api.createSpace(nombre.trim(), tipo, visible.trim(), integrantes),
+      api.createSpace(conQuienViene(nombre.trim(), quienViene), tipo, visible.trim(), integrantes),
     )
     if (r?.ok) {
       recordarNombreSiFalta(visible)
@@ -52,7 +60,7 @@ export default function CrearGrupo() {
             <legend>El grupo</legend>
             <label className="campo">
               <span>Nombre del grupo</span>
-              <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={60} placeholder="Ej.: Los del asado" />
+              <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={60} placeholder={placeholderGrupo(ej)} />
             </label>
             <label className="campo">
               <span>Tu nombre en el grupo</span>
@@ -61,6 +69,7 @@ export default function CrearGrupo() {
             </label>
           </fieldset>
           <CampoIntegrantes integrantes={integrantes} cambiar={setIntegrantes} tuNombre={visible} />
+          <CampoQuienViene valor={quienViene} cambiar={setQuienViene} nombre={nombre} />
           <Aviso tono="info">
             Vas a ser quien organiza: creas las propuestas y buscas la opción compatible. Las condiciones de cada persona son
             privadas, también para ti.
diff --git a/src/screens/Inicio.tsx b/src/screens/Inicio.tsx
index c346f62..237f655 100644
--- a/src/screens/Inicio.tsx
+++ b/src/screens/Inicio.tsx
@@ -3,10 +3,9 @@ import type { FormEvent } from 'react'
 import { api } from '../lib/api'
 import type { ApiError, EspacioResumen, PropuestaResumen, TipoEspacio } from '../lib/types'
 import { useAccion, useSondeo } from '../lib/hooks'
-import { dejarAviso, irA, rutas, useIdentidad, useShell } from '../lib/shell'
-import { leerGuardada, sesionNueva } from '../lib/sesiones'
+import { irA, rutas, useIdentidad, useShell } from '../lib/shell'
 import { OtraSesion } from '../components/Sesiones'
-import { guardarPerfil, leerPerfil, recordarNombreSiFalta, usePerfil } from '../lib/perfil'
+import { guardarPerfil, usePerfil } from '../lib/perfil'
 import { vibrar } from '../lib/tacto'
 import { Aviso, Boton, Cargando, ErrorCaja, colorAvatar, iniciales } from '../components/ui'
 import { PlanVivo, esTurno } from '../components/PlanVivo'
@@ -15,6 +14,8 @@ import { Icono } from '../components/Icono'
 import { Orbita } from '../components/Orbita'
 import { Resaltado } from '../components/Resaltado'
 import { Tablero } from '../components/Tablero'
+import { UnirseConNombre, useUnirse } from '../login/QuienEres'
+import { fuenteReal } from '../login/fuente'
 
 const TIPO: Record<TipoEspacio, string> = { amigos: 'Amigos', empresa: 'Empresa' }
 
@@ -76,7 +77,7 @@ export default function Inicio({
           </div>
         </section>
         <div className="hoja">
-          <UnirsePorCodigo deshabilitado={soloLectura} codigoInicial={codigoInvitacion} />
+          <UnirsePortada deshabilitado={soloLectura} codigoInicial={codigoInvitacion} />
           <div className="privado" role="note">
             <span className="privado-icono" aria-hidden="true">
               <Icono n="candado" tam={20} />
@@ -194,7 +195,7 @@ export default function Inicio({
           </section>
         ) : null}
 
-        <UnirsePorCodigo deshabilitado={soloLectura} />
+        <UnirsePortada deshabilitado={soloLectura} />
 
         {conPlan ? null : (
           <section aria-labelledby="como-titulo">
@@ -335,171 +336,11 @@ function irAUnirse() {
   form?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true })
 }
 
-function UnirsePorCodigo({ deshabilitado, codigoInicial }: { deshabilitado: boolean; codigoInicial?: string }) {
-  const [codigo, setCodigo] = useState(codigoInicial ?? '')
-  // Por un enlace de invitación puede llegar otra persona al teléfono de alguien: ahí el nombre NO se precarga
-  // (revisión del rediseño, P2); se ofrece "Soy X" o "No soy X" (sesión nueva, la de X queda guardada).
-  const porInvitacion = codigoInicial != null
-  const [nombre, setNombre] = useState(() => (porInvitacion ? '' : (leerPerfil()?.nombre ?? '')))
-  const perfil = usePerfil()
-  // Si la persona escribe su nombre en el ingreso con este formulario ya en pantalla, se completa solo.
-  useEffect(() => {
-    if (perfil && !porInvitacion) setNombre((n) => n || perfil.nombre)
-  }, [perfil, porInvitacion])
-  const [separando, setSeparando] = useState(false)
-  async function noSoy(quien: string) {
-    if (separando) return
-    setSeparando(true)
-    const s = await sesionNueva(quien)
-    setSeparando(false)
-    if (!s.ok) setErrorCambio(s.mensaje)
-  }
-  const { ocupado, error, ejecutar } = useAccion()
-  // Navegador compartido: la sesión guardada ya es miembro de este espacio con otro nombre.
-  const [yaMiembro, setYaMiembro] = useState<{ espacioId: string; espacio: string; nombreActual: string } | null>(null)
-  const [confirmar, setConfirmar] = useState(false)
-  const [cambiando, setCambiando] = useState(false)
-  const [errorCambio, setErrorCambio] = useState<string | null>(null)
-  const faltan = codigo.trim() === '' || nombre.trim() === ''
-
-  function entrar(r: { espacio_id: string; reclamo_asiento_simulado: boolean }, espacio: string, sesionGuardada?: string) {
-    recordarNombreSiFalta(nombre)
-    if (r.reclamo_asiento_simulado) {
-      dejarAviso(`Reclamaste el lugar de ${nombre.trim()}. Desde ahora actúas con tu propia sesión y tus condiciones dejan de ser visibles para la simulación.${sesionGuardada ? ` ${sesionGuardada}` : ''}`)
-    } else if (sesionGuardada) {
-      dejarAviso(`Entraste como ${nombre.trim()}. ${sesionGuardada}`)
-    } else {
-      dejarAviso(`Te uniste a «${espacio}» como ${nombre.trim()}. Cuando haya un plan, marca si te interesa y carga en privado cuándo puedes.`)
-    }
-    irA(rutas.espacio(r.espacio_id))
-  }
-
-  async function hacer(e: FormEvent) {
-    e.preventDefault()
-    if (faltan) return
-    setYaMiembro(null)
-    setConfirmar(false)
-    setErrorCambio(null)
-    const r = await ejecutar(`join:${codigo.trim()}:${nombre.trim()}`, () =>
-      api.joinSpace(codigo.trim(), nombre.trim()),
-    )
-    if (!r?.ok) return
-    if (r.data.resultado.ya_era_miembro) {
-      // El servidor no cambia el nombre ni crea a otra persona: no se entra en silencio como quien estaba antes.
-      const yo = r.data.espacio.miembros.find((m) => m.es_yo)
-      setYaMiembro({ espacioId: r.data.resultado.espacio_id, espacio: r.data.espacio.nombre, nombreActual: yo?.nombre ?? 'otra persona' })
-      return
-    }
-    entrar(r.data.resultado, r.data.espacio.nombre)
-  }
-
-  async function entrarComoOtra() {
-    if (!yaMiembro || cambiando) return
-    const previa = yaMiembro
-    setCambiando(true)
-    setErrorCambio(null)
-    try {
-      const s = await sesionNueva(previa.nombreActual)
-      if (!s.ok) {
-        setErrorCambio(s.mensaje)
-        return
-      }
-      setYaMiembro(null)
-      setConfirmar(false)
-      const r = await ejecutar(`join-nueva:${codigo.trim()}:${nombre.trim()}`, () => api.joinSpace(codigo.trim(), nombre.trim()))
-      if (r?.ok) {
-        entrar(
-          r.data.resultado,
-          r.data.espacio.nombre,
-          s.guardada ? `La sesión de ${previa.nombreActual} quedó guardada en este navegador: para volver a ella, ve a tus espacios.` : undefined,
-        )
-      }
-    } finally {
-      setCambiando(false)
-    }
-  }
-  const otraGuardada = yaMiembro && confirmar ? leerGuardada() : null
-  return (
-    <form id="unirse" className="tarjeta unirse" onSubmit={hacer} noValidate>
-      <h2>Unirme con un código</h2>
-      <label className="campo campo-codigo">
-        <span>Código de invitación</span>
-        <input
-          value={codigo}
-          onChange={(e) => setCodigo(e.target.value)}
-          autoCapitalize="characters"
-          autoComplete="off"
-          spellCheck={false}
-          maxLength={16}
-          aria-invalid={error?.detalle === 'codigo_inexistente' ? true : undefined}
-        />
-      </label>
-      {porInvitacion && perfil ? (
-        <div className="quien-soy" role="group" aria-label="Quién usa este teléfono">
-          <p>
-            Este teléfono está como <strong>{perfil.nombre}</strong>. ¿Eres tú?
-          </p>
-          <div className="fila-botones">
-            <button type="button" className="btn btn-secundario btn-chico" onClick={() => setNombre(perfil.nombre)}>
-              Soy {perfil.nombre}
-            </button>
-            <Boton variante="secundario" className="btn-chico" onClick={() => void noSoy(perfil.nombre)} ocupado={separando} ocupadoTexto="Separando…">
-              No soy {perfil.nombre}
-            </Boton>
-          </div>
-        </div>
-      ) : null}
-      <label className="campo">
-        <span>Tu nombre en el espacio</span>
-        <input
-          autoFocus={codigoInicial != null}
-          value={nombre}
-          onChange={(e) => setNombre(e.target.value)}
-          autoComplete="nickname"
-          maxLength={30}
-          aria-invalid={error?.detalle === 'nombre_en_uso' ? true : undefined}
-        />
-        <small>Si usas el nombre de una persona simulada de la demo (por ejemplo "Luna"), reclamas su lugar.</small>
-      </label>
-      <Boton type="submit" className="btn-bloque" ocupado={ocupado} ocupadoTexto="Uniéndome…" disabled={faltan || deshabilitado || cambiando}>
-        Unirme
-      </Boton>
-      {error ? <ErrorCaja error={error} enfocar /> : null}
-      {yaMiembro ? (
-        <Aviso tono="aviso" titulo={`Este navegador ya está en este espacio como ${yaMiembro.nombreActual}`}>
-          {confirmar ? (
-            <>
-              <p>
-                {otraGuardada
-                  ? `Este navegador ya guarda la sesión de ${otraGuardada.etiqueta}; la de ${yaMiembro.nombreActual} no se guardará y no se podrá volver a ella desde acá.`
-                  : `Se abre una sesión nueva para ti. La de ${yaMiembro.nombreActual} queda guardada en este navegador: se puede retomar desde tus espacios con "Volver a esa sesión".`}
-              </p>
-              <div className="fila-botones">
-                <Boton variante={otraGuardada ? 'peligro' : 'primario'} onClick={() => void entrarComoOtra()} ocupado={cambiando} ocupadoTexto="Cambiando de persona…">
-                  Sí, entrar como {nombre.trim() || 'otra persona'}
-                </Boton>
-                <Boton variante="secundario" onClick={() => setConfirmar(false)} disabled={cambiando}>
-                  Cancelar
-                </Boton>
-              </div>
-            </>
-          ) : (
-            <>
-              <p>
-                Si eres {yaMiembro.nombreActual}, sigue. Si eres otra persona, entra con una sesión nueva: así no ves ni cambias lo que
-                cargó {yaMiembro.nombreActual}.
-              </p>
-              <div className="fila-botones">
-                <Boton onClick={() => irA(rutas.espacio(yaMiembro.espacioId))}>Seguir como {yaMiembro.nombreActual}</Boton>
-                <Boton variante="secundario" onClick={() => setConfirmar(true)}>
-                  Entrar como otra persona
-                </Boton>
-              </div>
-            </>
-          )}
-          {errorCambio ? <p role="alert">{errorCambio}</p> : null}
-        </Aviso>
-      ) : null}
-    </form>
-  )
+/** Un solo formulario de unión (friccion, fila 43 de la tabla #102): el de "¿Quién eres?", que reclama al integrante
+ * anotado o lleva a la lista del grupo según el código. Mismos rótulos ("Código de invitación", "Tu nombre en el
+ * espacio", "Unirme") y mismo aviso de navegador compartido (#47). */
+function UnirsePortada({ deshabilitado, codigoInicial = '' }: { deshabilitado: boolean; codigoInicial?: string }) {
+  const u = useUnirse(fuenteReal)
+  const campoNombre = useRef<HTMLInputElement>(null)
+  return <UnirseConNombre codigoInicial={codigoInicial} u={u} campoNombre={campoNombre} deshabilitado={deshabilitado} vista={null} />
 }
diff --git a/src/screens/NuevaPropuesta.tsx b/src/screens/NuevaPropuesta.tsx
index 255c82a..839b712 100644
--- a/src/screens/NuevaPropuesta.tsx
+++ b/src/screens/NuevaPropuesta.tsx
@@ -8,6 +8,7 @@ import { Avatar, Aviso, Boton, Cargando, ErrorCaja } from '../components/ui'
 import { Icono } from '../components/Icono'
 import type { NombreIcono } from '../components/Icono'
 import { tomarBorradorAgente } from '../agente/api'
+import { ATAJOS, atajosParaGrupo, ejemploPorSemilla, placeholderPlan } from '../lib/ejemplos'
 
 // Una propuesta se arma con dos momentos posibles (A y B), cada uno un día y una hora de encuentro,
 // y una duración aproximada: la hora de fin se calcula sola. El contrato sigue recibiendo inicio y fin
@@ -44,15 +45,8 @@ const CASO = {
   plazoOtro: '',
 }
 
-const ACTIVIDADES: { titulo: string; icono: NombreIcono; min: number }[] = [
-  { titulo: 'Asado', icono: 'asado', min: 180 },
-  { titulo: 'Fútbol', icono: 'futbol', min: 60 },
-  { titulo: 'Cena', icono: 'cena', min: 120 },
-  { titulo: 'Juntada', icono: 'juntada', min: 120 },
-  { titulo: 'Cine', icono: 'cine', min: 150 },
-  { titulo: 'Cumple', icono: 'cumple', min: 180 },
-  { titulo: 'Paseo', icono: 'paseo', min: 180 },
-]
+// Atajos de actividad (apertura, `src/lib/ejemplos.ts`): el que nombra el grupo va primero; "Asado" ya no encabeza siempre.
+type Actividad = { titulo: string; icono: NombreIcono; min: number }
 const HORAS = ['12:00', '13:00', '14:00', '17:00', '19:00', '20:00', '21:00']
 const DURACIONES = [60, 120, 180, 240]
 const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
@@ -221,8 +215,8 @@ export default function NuevaPropuesta({ espacioId }: { espacioId: string }) {
     setF({ ...form, [k]: v })
     if (error) limpiarError()
   }
-  function elegirActividad(a: (typeof ACTIVIDADES)[number]) {
-    const esAtajo = form.titulo.trim() === '' || ACTIVIDADES.some((x) => x.titulo === form.titulo.trim())
+  function elegirActividad(a: Actividad) {
+    const esAtajo = form.titulo.trim() === '' || ATAJOS.some((x) => x.titulo === form.titulo.trim())
     setF({ ...form, titulo: esAtajo ? a.titulo : form.titulo, duracion: a.min })
     if (error) limpiarError()
   }
@@ -353,7 +347,7 @@ export default function NuevaPropuesta({ espacioId }: { espacioId: string }) {
             <fieldset className="form-seccion">
               <legend>Qué hacen</legend>
               <div className="carrusel" role="group" aria-label="Atajos de actividad">
-                {ACTIVIDADES.map((a) => (
+                {atajosParaGrupo(espacio.nombre).map((a) => (
                   <button
                     key={a.titulo}
                     type="button"
@@ -372,7 +366,7 @@ export default function NuevaPropuesta({ espacioId }: { espacioId: string }) {
                   value={form.titulo}
                   onChange={(e) => poner('titulo', e.target.value)}
                   maxLength={80}
-                  placeholder="Ej.: Asado en casa de Tomi"
+                  placeholder={placeholderPlan(ejemploPorSemilla(espacio.nombre))}
                   aria-invalid={marcado === 'titulo' || (faltantes && form.titulo.trim() === '') ? true : undefined}
                 />
               </label>
diff --git a/src/screens/Perfil.tsx b/src/screens/Perfil.tsx
index 0ccec0e..9a209f7 100644
--- a/src/screens/Perfil.tsx
+++ b/src/screens/Perfil.tsx
@@ -8,6 +8,7 @@ import { leerGuardada, sesionNueva } from '../lib/sesiones'
 import { Avatar, Aviso, Boton, Cargando, ErrorCaja, colorAvatar, iniciales } from '../components/ui'
 import { Icono } from '../components/Icono'
 import { OtraSesion } from '../components/Sesiones'
+import { QueGuarda } from '../friccion/QueGuarda'
 
 // Perfil: cómo entraste a CRUXE en este navegador. No hay cuenta ni contraseña: la sesión es anónima
 // (contrato 0.1). Acá se cambia el nombre local, se ven tus grupos y se entra como otra persona sin perder la sesión.
@@ -103,6 +104,7 @@ export default function Perfil() {
         </section>
 
         <CambiarPersona nombre={perfil?.nombre ?? null} />
+        <QueGuarda />
       </div>
     </div>
   )
diff --git a/src/screens/PlanTab.tsx b/src/screens/PlanTab.tsx
index 284728e..8868d22 100644
--- a/src/screens/PlanTab.tsx
+++ b/src/screens/PlanTab.tsx
@@ -10,8 +10,16 @@ import { Confeti } from '../components/Confeti'
 import { Resaltado } from '../components/Resaltado'
 import { descargarCalendario, urlWhatsApp } from '../lib/compartir'
 import { vibrar } from '../lib/tacto'
-
-export default function PlanTab({ p, viva, soloLectura, irAPestana }: PestanaProps) {
+import { AvisoParaMi } from '../componentes-nuevos/AvisoParaMi'
+import { BuscarLugar } from '../componentes-nuevos/BuscarLugar'
+import { RearmarConLoNuevo } from '../componentes-nuevos/RearmarConLoNuevo'
+import { RecordarFaltan } from '../componentes-nuevos/RecordarFaltan'
+import { AsiNoPuedo } from '../friccion/AsiNoPuedo'
+import { FaltaTuRespuesta } from '../friccion/FaltaTuRespuesta'
+
+export default function PlanTab({ p, viva, soloLectura, irAPestana, espacio }: PestanaProps) {
+  const codigo = espacio?.codigo_invitacion ?? null
+  const organiza = p.mi_situacion.es_organizador
   const enRevision = p.estado === 'en_revision'
   const conOpcion = p.estado === 'esperando_compromisos' || p.estado === 'grupo_confirmado'
   const reuniendo = p.estado === 'borrador' || p.estado === 'reuniendo_interes'
@@ -25,6 +33,8 @@ export default function PlanTab({ p, viva, soloLectura, irAPestana }: PestanaPro
 
   return (
     <div>
+      <AvisoParaMi p={p} servidorAhora={viva.servidorAhora} irARespuesta={() => irAPestana('respuesta')} />
+
       {p.estado === 'cancelado' || p.estado === 'expirado' ? (
         <Aviso tono="aviso" titulo={p.estado_etiqueta}>
           {p.siguiente_accion.texto}
@@ -38,9 +48,33 @@ export default function PlanTab({ p, viva, soloLectura, irAPestana }: PestanaPro
       {p.estado === 'borrador' ? <AbrirPropuesta p={p} viva={viva} soloLectura={soloLectura} /> : null}
 
       {/* El cierre (calendario, aviso) es para quien va: quien confirmó esta versión. */}
-      {p.estado === 'grupo_confirmado' && p.opcion && p.mi_situacion.acepte_version ? <CierrePlan p={p} /> : null}
+      {p.estado === 'grupo_confirmado' && p.opcion && p.mi_situacion.acepte_version ? <CierrePlan p={p} codigo={codigo} /> : null}
+
+      {conOpcion && p.opcion ? (
+        <OpcionVigente
+          key={p.opcion.version}
+          p={p}
+          viva={viva}
+          soloLectura={soloLectura}
+          irAPestana={irAPestana}
+          demo={espacio?.demo ?? true}
+        />
+      ) : null}
 
-      {conOpcion && p.opcion ? <OpcionVigente key={p.opcion.version} p={p} viva={viva} soloLectura={soloLectura} /> : null}
+      {/* Enmienda 13 (b): solo para quien organiza, con 2 o más "así no puedo"; se oculta solo si no corresponde. */}
+      {p.estado === 'esperando_compromisos' && organiza ? <RearmarConLoNuevo p={p} viva={viva} soloLectura={soloLectura} /> : null}
+
+      {p.estado === 'esperando_compromisos' && organiza && codigo && p.opcion ? (
+        <section className="tarjeta" aria-labelledby="avisar-version">
+          <h2 id="avisar-version">Avisar al grupo</h2>
+          <RecordarFaltan
+            codigo={codigo}
+            titulo={p.titulo}
+            motivo={p.opcion_anterior ? 'reparacion' : 'version_nueva'}
+            cuando={franjaTexto(p.opcion.franja.inicio, p.opcion.franja.fin)}
+          />
+        </section>
+      ) : null}
 
       {enRevision ? (
         <AlternativaOrganizador p={p} viva={viva} soloLectura={soloLectura} sinAlternativa={sinAlternativa} />
@@ -50,6 +84,15 @@ export default function PlanTab({ p, viva, soloLectura, irAPestana }: PestanaPro
 
       {reuniendo ? <ReuniendoInteres p={p} irAPestana={irAPestana} /> : null}
 
+      <FaltaTuRespuesta p={p} espacioId={p.espacio_id} />
+
+      {p.estado === 'reuniendo_interes' && organiza && codigo ? (
+        <section className="tarjeta" aria-labelledby="avisar-faltan">
+          <h2 id="avisar-faltan">Avisar al grupo</h2>
+          <RecordarFaltan codigo={codigo} titulo={p.titulo} motivo="faltan" />
+        </section>
+      ) : null}
+
       {p.estado === 'reuniendo_interes' ? (
         <BuscarOpcion p={p} viva={viva} soloLectura={soloLectura} sinOpcion={sinOpcion} />
       ) : null}
@@ -142,7 +185,13 @@ function cuentaConfirmados(confirmados: number, minimo: number): string {
   return confirmados > minimo ? `${confirmados} (mínimo ${minimo})` : `${confirmados} de ${minimo}`
 }
 
-function OpcionVigente({ p, viva, soloLectura }: VivaProps) {
+function OpcionVigente({
+  p,
+  viva,
+  soloLectura,
+  irAPestana,
+  demo,
+}: VivaProps & { irAPestana: PestanaProps['irAPestana']; demo: boolean }) {
   const o = p.opcion!
   const { ocupado, error, correr } = useMutacion(viva)
   const confirmado = p.estado === 'grupo_confirmado'
@@ -167,6 +216,7 @@ function OpcionVigente({ p, viva, soloLectura }: VivaProps) {
           </p>
         </div>
       </div>
+      <BuscarLugar titulo={p.titulo} demo={demo} />
 
       {/* Solo dibuja los números que entrega el servidor: confirmados, mínimo (la marca) y máximo. */}
       <div>
@@ -269,6 +319,7 @@ function OpcionVigente({ p, viva, soloLectura }: VivaProps) {
           {razonNoAceptar(p)}
         </p>
       )}
+      <AsiNoPuedo p={p} viva={viva} soloLectura={soloLectura} irAPestana={irAPestana} />
       {error && error.codigo !== 'sin_alternativa' ? <ErrorCaja error={error} enfocar /> : null}
     </section>
   )
@@ -600,7 +651,7 @@ function Cancelar({ p, viva, soloLectura }: VivaProps) {
 // ------------------------------------------------------------------ cierre: el encuentro ocurre
 
 /** Final del recorrido: el servidor confirmó el grupo. Llevarlo al calendario y avisar afuera de CRUXE. */
-function CierrePlan({ p }: { p: EstadoPropuesta }) {
+function CierrePlan({ p, codigo }: { p: EstadoPropuesta; codigo: string | null }) {
   const o = p.opcion!
   const [nota, setNota] = useState<string | null>(null)
   const cuando = franjaTexto(o.franja.inicio, o.franja.fin)
@@ -638,10 +689,16 @@ function CierrePlan({ p }: { p: EstadoPropuesta }) {
         <button type="button" className="btn btn-primario btn-chico" onClick={agendar} aria-label="Agregar al calendario">
           <Icono n="agendar" tam={18} /> Calendario
         </button>
-        <a className="btn btn-secundario btn-chico" href={urlWhatsApp(texto)} target="_blank" rel="noopener noreferrer" aria-label="Avisar por WhatsApp">
-          <Icono n="whatsapp" tam={18} /> WhatsApp
-        </a>
+        {codigo ? null : (
+          <a className="btn btn-secundario btn-chico" href={urlWhatsApp(texto)} target="_blank" rel="noopener noreferrer" aria-label="Avisar por WhatsApp">
+            <Icono n="whatsapp" tam={18} /> WhatsApp
+          </a>
+        )}
       </div>
+      {/* Con el código, el aviso lleva el enlace y los cupos libres (sin nombres) para que se sume quien no confirmó. */}
+      {codigo ? (
+        <RecordarFaltan codigo={codigo} titulo={p.titulo} motivo="confirmado" cuando={cuando} cuposLibres={o.cupos.disponibles} />
+      ) : null}
       {nota ? <p role="status">{nota}</p> : null}
     </section>
   )
diff --git a/src/screens/Propuesta.tsx b/src/screens/Propuesta.tsx
index 04183a5..2ea6802 100644
--- a/src/screens/Propuesta.tsx
+++ b/src/screens/Propuesta.tsx
@@ -131,7 +131,7 @@ function PropuestaInterna({ espacioId, propuestaId }: { espacioId: string; propu
   const conocido = (CODIGOS_SIGUIENTE as readonly string[]).includes(cod)
   const turno = cod === 'te_toca_aceptar' || (!conocido && p.mi_situacion.puede.aceptar)
   const yaAcepte = cod === 'ya_aceptaste' || (!conocido && !turno && p.mi_situacion.acepte_version && p.estado === 'esperando_compromisos')
-  const props = { p, viva, soloLectura, irAPestana: setPestana }
+  const props = { p, viva, soloLectura, irAPestana: setPestana, espacio }
 
   const escena = escenaDe(p, espacio)
 
diff --git a/src/screens/RespuestaTab.tsx b/src/screens/RespuestaTab.tsx
index 5ae01e7..3d6d69e 100644
--- a/src/screens/RespuestaTab.tsx
+++ b/src/screens/RespuestaTab.tsx
@@ -7,6 +7,8 @@ import { Icono } from '../components/Icono'
 import { vibrar } from '../lib/tacto'
 import { EditorCondiciones } from '../components/Condiciones'
 import type { PestanaProps } from './tabs'
+import { AyudaRetiro } from '../componentes-nuevos/AyudaRetiro'
+import { TomarDeCalendario } from '../friccion/Calendario'
 
 const ESTADO_COND: Record<string, string> = {
   sin_cargar: 'Sin cargar',
@@ -14,7 +16,7 @@ const ESTADO_COND: Record<string, string> = {
   completas: 'Completas',
 }
 
-export default function RespuestaTab({ p, viva, soloLectura }: PestanaProps) {
+export default function RespuestaTab({ p, viva, soloLectura, espacio }: PestanaProps) {
   const s = p.mi_situacion
   return (
     <div>
@@ -33,7 +35,7 @@ export default function RespuestaTab({ p, viva, soloLectura }: PestanaProps) {
         </Aviso>
       ) : null}
       <Interes p={p} viva={viva} soloLectura={soloLectura} />
-      <MisCondiciones p={p} viva={viva} soloLectura={soloLectura} />
+      <MisCondiciones p={p} viva={viva} soloLectura={soloLectura} demo={espacio?.demo === true} />
       <Retiro p={p} viva={viva} soloLectura={soloLectura} />
     </div>
   )
@@ -89,7 +91,7 @@ function Interes({ p, viva, soloLectura }: VivaProps) {
   )
 }
 
-function MisCondiciones({ p, viva, soloLectura }: VivaProps) {
+function MisCondiciones({ p, viva, soloLectura, demo }: VivaProps & { demo: boolean }) {
   const [cond, setCond] = useState<Condiciones | null>(null)
   const [errorCarga, setErrorCarga] = useState<ApiError | null>(null)
   const claves = p.franjas.map((f) => f.clave)
@@ -134,6 +136,15 @@ function MisCondiciones({ p, viva, soloLectura }: VivaProps) {
       {errorCarga && cond === null ? <ErrorCaja error={errorCarga} onReintentar={cargar} /> : null}
       {cond !== null ? (
         <>
+          {/* #90 de friccion: agenda ficticia, solo en el espacio demo (en un grupo real confunde). */}
+          {demo ? (
+            <TomarDeCalendario
+              franjas={p.franjas}
+              semilla={p.mi_situacion.miembro_id}
+              onTomar={(d) => b.reemplazar(d)}
+              deshabilitado={!s.puede.guardar_condiciones || soloLectura}
+            />
+          ) : null}
           <EditorCondiciones
             franjas={p.franjas}
             valor={b.draft}
@@ -175,7 +186,8 @@ function razonSinGuardar(p: EstadoPropuesta): string {
   if (s.retirado) return 'Te retiraste de esta propuesta y ya no puedes participar en ella.'
   if (p.plazo_vencido) return 'El plazo de aceptación ya cerró.'
   if ((p.estado === 'esperando_compromisos' || p.estado === 'grupo_confirmado') && s.elegible_en_version) {
-    return 'Formas parte de la versión vigente; tu disponibilidad no puede cambiar mientras esté vigente.'
+    // Enmienda 13 (0046): con la versión vigente, la salida es "Así no puedo, pero sigo" (no retirarse).
+    return 'Estás en la versión vigente. Si esta fecha no te sirve, marca «Así no puedo, pero sigo» y podrás cambiar cuándo puedes.'
   }
   return 'Ahora no puedes cambiar tus condiciones en esta propuesta.'
 }
@@ -195,6 +207,7 @@ function Retiro({ p, viva, soloLectura }: VivaProps) {
       <p className="suave">
         Si ya no puedes, retirarte avisa al grupo. Es definitivo en esta propuesta: no podrás volver a participar en ella.
       </p>
+      <AyudaRetiro p={p} />
       {!confirmar ? (
         <Boton variante="secundario" onClick={() => setConfirmar(true)} disabled={soloLectura}>
           Retirarme de esta propuesta
diff --git a/src/screens/tabs.ts b/src/screens/tabs.ts
index 21015be..e4610e4 100644
--- a/src/screens/tabs.ts
+++ b/src/screens/tabs.ts
@@ -1,5 +1,5 @@
 import type { PropuestaViva } from '../lib/hooks'
-import type { EstadoPropuesta } from '../lib/types'
+import type { Espacio, EstadoPropuesta } from '../lib/types'
 
 export type Pestana = 'plan' | 'respuesta' | 'historial' | 'simulacion'
 
@@ -8,4 +8,6 @@ export interface PestanaProps {
   viva: PropuestaViva
   soloLectura: boolean
   irAPestana: (t: Pestana) => void
+  /** El espacio de la propuesta (código de invitación y si es demo); null mientras carga. */
+  espacio?: Espacio | null
 }
```
