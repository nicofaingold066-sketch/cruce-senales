# Revisión del rediseño de Juan (`wip/front-juan`): privacidad y panel del agente

Dueño del informe: agente-ia. Viernes 23 oct 2026, escrito a las 17:15 (hora del reloj, Santiago). Pedido del coordinador. Solo lectura: no se editó nada de esa rama ni de `src/`.

Qué se revisó: `wip/front-juan` en `5b8cf1a` (base común con `main`: `7b0335b`), contra `origin/main` (`61c5228`). Son 30 archivos de `src/` (5930 líneas más, 1738 menos); no toca `src/agente/` ni `supabase/`. Método: lectura del diff completo con dos enfoques, el panel del agente (yo) y la privacidad (una revisión independiente con un modelo distinto), y verificación en el código de los hallazgos de abajo. En la copia de la rama, typecheck y build pasan. Probado en vivo a las 17:14 (§5).

## Resumen
- **El panel del agente sigue montado y conectado igual que en `main`, y funciona en vivo con el modelo real** (§5). No hace falta adaptarlo.
- **Privacidad: ninguna pantalla nueva muestra condiciones, disponibilidad ni los conteos que la enmienda 7 reserva al organizador.** No se calcula ningún estado, cupo ni plazo en el cliente. Lo que compartir manda afuera (WhatsApp, `.ics`) lleva solo datos públicos.
- **Hay un problema nuevo de navegador compartido (P1):** el nombre que el rediseño guarda en el navegador no se borra al "Entrar como otra persona", así que la persona siguiente aparece con el nombre de la anterior y lo trae precargado.
- Para la integración: la rama no tiene la ruta `#/entrar` de login, y agrega `lucide-react` sin registrarla.

## 1. Panel del agente
| Qué | Dónde (en `wip/front-juan`) | Estado |
|---|---|---|
| Montaje | `src/screens/Espacio.tsx:14` (carga diferida) y `:251`: `<AgentePanel espacioId esOrganizador soloLectura demo />`, dentro de un `details` que lo monta solo al abrirse (`:247-253`) | Igual que `main` (`Espacio.tsx:181-186`): mismas props y sin llamadas mientras está plegado |
| Borrador hacia "Nueva propuesta" | `src/screens/NuevaPropuesta.tsx:9` y `:98-105`: `tomarBorradorAgente`, que aplica título y las dos franjas al formulario nuevo (`aInicio`, `aFin`, `bInicio`, `bFin`); aviso "Borrador del agente" en `:240-242` | Funciona igual |
| Componentes que usa el panel | `src/components/ui.tsx`: `Boton`, `Aviso`, `ErrorCaja` sin cambios de firma; `Cargando` ganó un parámetro opcional (`esqueleto`) | Compatible |
| Estilos | `src/styles.css:1750-1800`: Juan estiló el panel a propósito (`.agente-plegable`, `.agente-panel`, `.agente-icono`). Siguen existiendo todas las clases que usa el panel (`.bloque`, `.grupo`, `.opciones`, `.opcion-radio`, `.opcion-activa`, `.btn-chico`, `.campo`, `.etiqueta-destacada`…) | Compatible |
| Casilla "Que el agente use mis preferencias" (#72) | Está en `wip/fundamentos` (`5ab6cc4`), no en esta rama. Como la rama no toca `src/agente/`, la mezcla la conserva; su CSS es propio (`.agente-casilla`) | Sin choque |

**A mirar en vivo:** `.opcion-radio` pasó a ser una píldora (`border-radius: 999px`) con el `input` invisible sobre toda la etiqueta (`styles.css:1203-1231`), y `.opcion-activa` es fondo oscuro con texto claro (`:1236-1239`). Las candidatas del agente usan esa clase con contenido en dos líneas (nombre del plan, rótulo SIMULACIÓN, "Recomendada"): puede verse raro dentro de una píldora, y hay que confirmar que el rótulo SIMULACIÓN y "Recomendada" se leen sobre el fondo oscuro de la elegida. Es visual: no rompe el funcionamiento.

## 2. Privacidad: hallazgos
Prioridad: P1 hace falta antes de la demo (pasa en el recorrido de navegador compartido); P2 conviene; P3 detalle.

### P1. El nombre guardado en el navegador queda de la persona anterior
- **Qué es nuevo:** `src/lib/perfil.ts` guarda el nombre de la persona en `localStorage` (`cruxe:perfil`). No se manda al servidor; sirve para saludar y precargar "Tu nombre".
- **Dónde falla:** `src/lib/sesiones.ts:94-103` (`sesionNueva`) borra solo lo que la app guarda en `sessionStorage` (`cruxe:*`), no el perfil. El camino "Entrar como otra persona" de la invitación (`src/screens/Inicio.tsx:391`) llama a `sesionNueva` y después a `entrar()`, que hace `recordarNombreSiFalta(nombre)` (`:355`), que no pisa un nombre que ya está. "Volver a esa sesión" (`src/components/Sesiones.tsx:19-22`) recarga sin tocar el nombre. El camino desde Perfil sí está bien (`src/screens/Perfil.tsx:154` llama a `olvidarPerfil()`).
- **Escenario (el de la demo):** en la notebook de Tomi, Pepe abre la invitación y entra como otra persona. Su sesión es de Pepe, pero el perfil sigue diciendo "Tomi": el encabezado muestra a Tomi cuando la pantalla todavía no tiene identidad del espacio (`src/App.tsx:65`: `identidad.yo ?? perfil?.nombre`), la portada dice "Hola, Tomi." (`Inicio.tsx:115`) y "Crear grupo" viene con "Tomi" (`src/screens/CrearGrupo.tsx:18`). Pepe puede crear un grupo o unirse a otro como "Tomi" con un toque. En una demo, si el nombre guardado es el de una persona simulada ("Luna"), reclama su lugar. Es justo el hallazgo 8 de la revisión de privacidad (#42), que #47 había cerrado.
- **Arreglo (unas 3 líneas, en `src/lib/sesiones.ts`):** en `sesionNueva`, si `r.ok`, llamar a `olvidarPerfil()`. En "Volver a esa sesión", guardar el nombre dentro de la sesión guardada y restaurarlo al volver (o al menos olvidar el actual).

### P2. La invitación precarga el nombre del dueño del navegador
- **Dónde:** `src/screens/Inicio.tsx:340` y `:343-345` precargan "Tu nombre" con el perfil; `:429` pone el foco en ese campo; con el código ya en el enlace, "Unirme" queda listo para un toque (`:352`, `:438`).
- **Escenario:** alguien abre un enlace de WhatsApp en el navegador de Tomi para un grupo donde Tomi no está. Como esa sesión no era miembro, no salta el aviso de navegador compartido y la persona se une con la sesión de Tomi y con el nombre "Tomi". Antes del rediseño el campo venía vacío y había que escribir un nombre.
- **Arreglo:** no precargar cuando se llega por un enlace de invitación, o mostrar arriba "Este navegador está como Tomi. ¿No eres tú? Entrar como otra persona".

### P2. El cruce llama "Sin respuesta" a quien no puede
- **Dónde:** `src/components/Cruce.tsx:70` (`pendiente: 'sin respuesta visible'`, la descripción para lector) y `:183` (leyenda "Sin respuesta"); `src/screens/Propuesta.tsx:273-290` marca como `pendiente` a todo el que no está en bajas, confirmados ni interesados.
- **Por qué importa:** no filtra datos (esas listas ya eran públicas), pero rotula como "sin respuesta" a alguien que marcó en privado que no puede o que no forma parte de la versión. Ante el grupo, eso señala a una persona por lo que decidió su disponibilidad privada, y contradice "el silencio nunca es asistencia" en la dirección inversa (lo hace parecer silencio).
- **Arreglo:** "Sin confirmar" en la leyenda y en la descripción.

### P3. Textos que prometen algo distinto de lo que hace la enmienda 7
- `src/screens/Perfil.tsx:98` (nuevo): "El grupo solo ve cuántas personas cargaron." y `src/screens/RespuestaTab.tsx:27-28` (ya estaba en `main`): "El grupo solo ve cuántas personas cargaron condiciones". Desde E7.2 ese conteo lo ve solo quien organiza. Es inexacto en la dirección segura (los miembros ven menos). Arreglo: "solo quien organiza ve cuántas personas respondieron".

### P3. "Volver a esa sesión" no avisa que cualquiera puede usarlo
- `src/components/Sesiones.tsx:35` y `:54`, en la portada y en Perfil (`Perfil.tsx:48`, texto en `:165-167`). Quien use el navegador después ve "Este navegador guarda otra sesión: Tomi en «Los del finde»" y con un toque pasa a ser Tomi. No es peor que antes de #47 (el aislamiento protege de entrar por accidente, no de alguien que lo intenta), pero el texto no lo dice. Arreglo: una línea "Cualquiera que use este navegador puede volver a esa sesión; para separarlas de verdad, usa una ventana privada", y en la etiqueta solo el nombre, sin el del grupo.

### P3. El `.ics` no escapa bien
- `src/lib/compartir.ts:26`: `.replace(/;/g, '\;')` en JavaScript produce `;` (la barra se pierde), y `/\r?\n/` no cubre un `\r` suelto. Un título o nombre con esos caracteres rompe o agrega líneas al archivo de calendario de quien lo descarga. Arreglo: `'\\;'` y `/[\r\n]+/g`, quitando los caracteres de control.

### Ya existía, no lo trae el rediseño
- En grupos de 3 o menos, "Faltan por responder" (`src/screens/PlanTab.tsx:213-217`) y "Con condiciones" (`:462-471`) le dejan al organizador deducir la disponibilidad de alguien (por ejemplo, con 2 elegibles de 3, si uno confirma y quedan 0 pendientes, el tercero no podía). Es un límite declarado de la enmienda 7; el arreglo de fondo es de backend (mandar `null` también al organizador con 3 o menos).

## 3. Revisado y sin problemas de privacidad
- **Planes, PlanVivo, Inicio (`planesActivos`):** agrupan por estado y turno que manda el servidor; `list_proposals` no trae los conteos de la enmienda 7.
- **Espacio:** el código de invitación ya era visible para los miembros; "Invita a tu grupo" con menos de 3 miembros es solo presentación.
- **Propuesta (la escena del cruce), PlanTab (comparación de versiones), RespuestaTab y Condiciones:** usan listas públicas o las condiciones propias; "Con condiciones" y "Faltan por responder" siguen protegidos por `!= null`.
- **SimulacionTab:** solo agrega el avatar; sigue siendo del organizador.
- **`ui.tsx` (Avatar, Progreso, DiaTile), Tablero, Resaltado, Marca, Icono, Intro, Confeti:** decorativos. El confeti y el cruce dependen solo del estado que el servidor ya mostró; no hay cambios optimistas que revelen algo antes.
- **Compartir:** invitación ("Súmate a «grupo» en CRUXE…"), WhatsApp del cierre ("Confirmado en CRUXE: título, cuándo. Van: nombres") y `.ics` ("Plan confirmado en CRUXE (versión N). Van: nombres") llevan solo quienes confirmaron, que es público. Sale por `wa.me` solo si la persona lo toca.
- **Logs:** no hay `console.*` nuevos; los mensajes de sesiones no llevan tokens ni ids.

## 4. Fuera de privacidad (para el coordinador y Juan)
- **Regla del caso:** con el grupo confirmado, el seguimiento marca el paso "Encuentro" como hecho (`src/screens/Propuesta.tsx:317-326`, `grupo_confirmado: 4` sobre los pasos de `:315`). `docs/caso-canonico.md:31` dice "No marcar «encuentro realizado» como hecho". Arreglo: `grupo_confirmado: 3` (Confirmar hecho; Encuentro pendiente).
- **Cierre para quien no va:** `CierrePlan` (confeti, "¡Se juntan!", calendario) aparece con `grupo_confirmado` también a quien se retiró o no forma parte de la versión (`src/screens/PlanTab.tsx:42`). Arreglo: mostrarlo solo si `mi_situacion` dice que confirmó.
- **Cruce con más de 10 personas:** `src/components/Cruce.tsx:91` (`slice(0, 10)`) oculta sin aviso a la persona 11 en adelante, incluso a quien mira. No pasa en la demo (6 personas).
- **Integración:** la rama no tiene la ruta `#/entrar` de login (`main` `61c5228`: `src/lib/shell.tsx:60`, `:76`, `:91` y `src/App.tsx:9`, `:151-152`). Al mezclar hay que conservarla. **Dependencia nueva:** `lucide-react` 1.53.0 (`package.json`); AGENTS.md pide avisar y registrarla en `docs/componentes-externos.md`.

## 5. Prueba en vivo del panel en la rama
**Viernes 23 oct 2026, de 17:14:37 a 17:14:44 (hora del reloj).** `wip/front-juan` `5b8cf1a` en un servidor local contra la base real (sin migración en curso, última aplicada 0034), Chrome sin ventana a 375 × 812 con tacto. Demo propio nuevo con datos ficticios, entrando como "Tomi". **Una sola llamada al modelo.** Resultado: 11 de 11.
- El panel se monta al abrir "Agente del círculo"; guardar preferencias funciona.
- "Simular sol" y "Que el agente proponga": una llamada a la función, 4345 ms, `eleccion_fuente: "modelo"` y `explicacion_fuente: "modelo"`; la pantalla dice "Lo redactó la IA…".
- Candidatas: asado en el quincho, fútbol en la cancha y picnic en el parque. Elegida: el asado. Perfil del grupo: 4 personas, asado 3 de 4, fútbol 2 de 4, ritmo "algo tranquilo".
- Lo que escribió la IA: "Es la actividad que más eligieron (3 de 4) y se hace en el quincho, así que sirve aunque cambie el tiempo. Además el ritmo es tranquilo y el presupuesto les calza a todos." y el mensaje "Hola, les propongo un asado en el quincho, el sábado 31 de 14:00 a 17:00 o el domingo 1 de 14:00 a 17:00; marquen si les interesa y carguen su disponibilidad en CRUXE para elegir el día." Coincide con los totales y las franjas que mandó el servidor; sin nombres ni datos de una persona.
- Las candidatas se ven bien en la píldora nueva: la elegida en fondo oscuro con "SIMULACIÓN" y "Recomendada por el agente" legibles, dentro del ancho (35 a 340 px).
- "Usar esta opción" lleva a "Nueva propuesta" con el aviso "Borrador del agente" y el título "Asado en casa de Tomi".
- Sin desborde horizontal ni errores en la consola.

Detalle que ya estaba en `main`, no del rediseño: el panel dice "3 opciones para 5 personas" y el perfil dice "4 personas". Son dos números del servidor que cuentan distinto (`personas_consideradas` incluye a quien pide; el perfil lo excluye desde la enmienda 7, E7.4). Se puede aclarar el texto más adelante.
