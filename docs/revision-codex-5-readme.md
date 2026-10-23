# Revisión independiente 5: README y bases de Señales

23 oct 2026. Codex. README revisado: `4477919e05fb89584a59b39bc732cbbcc4e5db16`, líneas referidas a esa versión. Informe de propuestas: no se modifica README, src/, supabase/ ni main.

## Fuentes y criterio

Bases oficiales, versión 1.5 de 19 oct 2026: [hack.makana.cl/bases.html](https://hack.makana.cl/bases.html), consultadas el 23 oct mediante HTTPS. Secciones 9 (entrega, README de una página, tres preguntas y cuentas de integrantes), 10.2 (caso propio) y 8 (ejemplos ficticios). El navegador de búsqueda no pudo abrir la página; se leyó el HTML oficial descargado con curl, no se dependió solo de notas locales. Referencias internas: AGENTS.md, caso canónico, contrato/enmiendas 2–3, evidencia histórica de correcciones y E2E de Codex.

**Distinción:** las bases permiten bibliotecas, plantillas, servicios y asistentes. En el texto oficial consultado NO aparece una exigencia específica de enumerar cada componente con enlace en el README; ese inventario es un pedido del coordinador y una regla de AGENTS.md. Se revisa igualmente, sin atribuirlo falsamente a las bases. Tampoco una lista de nombres reemplaza la obligación sobre cuentas/historial.

## Cumplimiento observado

| Punto | Dónde | Evaluación |
|---|---|---|
| Qué problema atacamos | README:6–9 | Presente. Describe un episodio y separa varias hipótesis. |
| Por qué ese y no otro | README:11–12 | Presente. Acota coordinación frente a soledad/motivación. |
| Qué dejamos fuera y por qué | README:23–32 | Presente. R4 recomienda no convertir una hipótesis en certeza. |
| Una página | Archivo completo, 708 palabras aprox. | No hay formato de página fijado; la lectura es larga. Reducir y comprobar presentación final (R5). |
| Componentes externos con enlace | README:57–61 | Supabase/supabase-js, React, Vite, TS, Vitest, Vercel, Claude Code y Codex tienen enlaces. No se observan librerías runtime principales omitidas en package.json; tipos y plugins de compilación pueden quedar en lockfile/documentación técnica. |
| Participantes | README:63–65 | Nico y Juan, ambos con perfil de GitHub. La atribución efectiva se revisa aparte (R3). |
| Ejemplos ficticios | README:34–44 | Declaración clara. No se cargan datos personales del equipo en el ejemplo de la solución. |
| Ejecutable y demo | README:46–53 | Tiene URL e instrucciones. Esta revisión no certifica acceso a Vercel ni una demo de navegador. |

## Hallazgos: 0 altas, 4 medias, 2 bajas

### R1 · Media: «compatible con todos» promete una condición que el producto no aplica

- **Dónde:** README:16 y 18; `docs/caso-canonico.md`, condiciones y pasos 3/6; contrato §5.
- **Por qué importa:** la franja A excluye Fede y Sofi y sigue siendo válida. El requisito es mínimo 4 incluido Tomi, no unanimidad. El jurado puede interpretar que el motor falló cuando muestra la opción correcta. «Todos deben volver a aceptar» también puede interpretarse como las seis personas obligatorias.
- **Cómo contrastar:** cargar el caso exacto: A/v1 es válida con cuatro elegibles; B/v2 puede confirmarse con Tomi, Luna, Mati y Fede sin Sofi. Lo confirmó el E2E real dos veces.
- **Cambio concreto:** «El servidor propone una opción que cumple el mínimo e incluye al anfitrión imprescindible. Quien participe confirma esa versión; una alternativa requiere confirmaciones nuevas, sin heredar las anteriores».

### R2 · Media: mezcla evidencia histórica, estado actual y pendientes

- **Dónde:** README:21, 32, 37–40; `docs/correcciones-altas-1.md`; `tests/e2e/evidencia-recorrido-canonico.md`.
- **Por qué importa:** 98 representa la evidencia histórica de 23+75; el backend ahora tiene un corte posterior con 27 pruebas reportadas y 26 RPC. No hay aquí una nueva ejecución conjunta de todas las suites que permita actualizar por suma el número global. «Pendiente de punta a punta» necesita distinguir API de interfaz, y el estado del agente cambia en otra rama.
- **Reproducción documental:** comparar el catálogo 25/43 de correcciones-altas-1 con la enmienda 3 y migración 0012; leer las salidas E2E 3/3 dos veces. Son alcances/fechas diferentes, no una certificación acumulativa automática.
- **Cambio concreto:** fecha, commit y enlace de evidencia por corte. Añadir el recorrido RPC de Codex con dos sesiones; mantener el navegador como evidencia separada, atribuida a quien lo ejecutó. Para la entrega, declarar el estado del agente según el commit efectivamente integrado y probado; no prometer el de otra rama. No cambiar 98 por otro total calculado sin ejecutar.

### R3 · Media: la lista de participantes no demuestra la atribución exigida en el historial

- **Dónde:** README:61 y 63–65; historial alcanzable desde `4477919` (`git shortlog -sne 4477919`).
- **Por qué importa:** se declaran Nico y Juan, pero ese historial tiene autores Nico Faingold y Claude; no aparece Juan como autor. La nota de asistentes no explica qué sesión corresponde a qué integrante ni qué realizó Juan. Esto no demuestra que Juan no haya colaborado: muestra que esa atribución aún no es verificable con este historial.
- **Cómo verificar:** inspeccionar autores y contribuciones en la rama de entrega; no basta que Juan figure en una lista ni que un commit tenga un coautor IA.
- **Cambio concreto:** describir aportes humanos comprobables y el uso de asistentes; cada integrante debe usar su propia cuenta en su trabajo posterior. Conservar la historia existente y explicar los commits antiguos con autor Claude; no fabricar aportes, commits vacíos, firmas o una reasignación retroactiva. El estado de las contribuciones de Juan queda pendiente de evidencia.

### R4 · Media: el descarte de pagos afirma una causa no investigada

- **Dónde:** README:9 frente a 27; `docs/caso-canonico.md`, sección Problema.
- **Por qué importa:** se reconoce que las condiciones de dinero/horario podrían influir, pero después se asegura que pagos y reparto «no son la causa». La causa real del asado fallido sigue siendo hipótesis; debilita la defensa del problema ante el jurado.
- **Cambio concreto:** «Pagos y reparto: fuera para limitar integraciones y datos sensibles; este corte prueba coordinación de horarios y compromiso, sin evaluar si el costo explica el episodio». No hace falta investigar otra vez todo el problema para corregir la certeza excesiva.

### R5 · Baja: la extensión dificulta el requisito de una página

- **Dónde:** README completo (65 líneas, unas 708 palabras, dos tablas y varias listas).
- **Por qué importa:** GitHub no define páginas y no se hizo una impresión de referencia; no afirmo incumplimiento demostrado. Sin embargo, la extensión deja poco espacio para escanear las tres respuestas que piden las bases.
- **Cambio concreto:** reducir el cuerpo a unas 350–450 palabras; mover detalle de pruebas, stack e instrucciones largas a archivos enlazados. Comprobar una vista de entrega legible, sin recurrir a letra diminuta. La cantidad sugerida es criterio editorial, no un límite oficial de palabras.

### R6 · Baja: las cifras de contexto no tienen enlace directo verificable

- **Dónde:** README:7 y 12.
- **Por qué importa:** se nombran fuentes secundarias y se precisan porcentajes sin permitir consultar encuesta, año o denominador desde el README. No se verificaron esos números en esta tarea ni se presentan como falsos. No son necesarios para explicar el caso propio.
- **Cambio concreto:** enlazar las páginas exactas y describir el denominador, o retirar las cifras del README compacto y dejar el sustento en `docs/problema.md` con fuentes. No sustituirlas por otros números sin verificación.

## Propuesta concreta de README compacto para el coordinador

El siguiente borrador conserva las tres respuestas, componentes y participantes. Es una propuesta dentro del informe, no una edición de README. Actualizar la fecha/evidencia final y las contribuciones antes de publicar.

```markdown
# CRUXE

Caso 06 de Señales: recuperar el hábito de verse con amigos.

## Qué problema atacamos
Un asado del equipo reunió seis interesados y no ocurrió. Nuestra hipótesis es que parte de la dificultad está en cerrar el plan: pasar del interés a un compromiso explícito y sostenerlo ante una baja. La causa del episodio todavía está por validar. Los personajes y datos de la demo son ficticios.

## Por qué este y no otro
Elegimos una fricción concreta que vivimos y podemos poner a prueba en dos días. El chat sirve para conversar; queremos probar si condiciones privadas, una opción y confirmación explícita ayudan a cerrar el encuentro. No afirmamos haber cambiado el hábito ni que coordinar garantice asistencia.

## Qué construimos
Cada persona carga disponibilidad en privado. El servidor propone una opción que cumple el mínimo e incluye al anfitrión imprescindible. Cada participante confirma esa versión exacta. Si una baja rompe el acuerdo, queda En revisión: la alternativa necesita nuevas confirmaciones, sin heredar aceptaciones. Si no hay opción viable, lo informa sin reducir el mínimo.

## Qué dejamos fuera y por qué
Chat, pagos, reservas, calendarios y notificaciones: limitamos integraciones para probar el cierre y la reparación. Empresas y métricas individuales quedan fuera por foco social y privacidad. El estado de cualquier agente IA se declara según lo efectivamente integrado; no se presenta un diseño como funcionalidad.

## Demo, evidencia y ejecución
[App](https://cruce-senales.vercel.app). Tomi y Luna usan sesiones reales distintas; Mati, Caro, Fede y Sofi son simulaciones rotuladas. No hay reservas ni encuentros reales.

[Recorrido RPC real](tests/e2e/evidencia-recorrido-canonico.md): 3 escenarios, dos ejecuciones consecutivas aprobadas el 23 oct. No certifica el navegador. [Evidencia histórica A1–A5](docs/correcciones-altas-1.md). [Cómo correr y probar](docs/como-correr.md): Node 24, variables públicas de Supabase en `.env`, `npm run dev`.

## Componentes externos
[React](https://react.dev), [Vite](https://vite.dev), [TypeScript](https://www.typescriptlang.org), [Vitest](https://vitest.dev), [Supabase](https://supabase.com), [supabase-js](https://github.com/supabase/supabase-js) y [Vercel](https://vercel.com). Asistentes: [Claude Code](https://claude.com/claude-code) y [Codex](https://openai.com/codex).

## Participantes
[Nico Faingold](https://github.com/nicofaingold066-sketch) y [Juan Morales](https://github.com/JuanMorales10). [PENDIENTE: describir aportes comprobables y explicar autores históricos de sesiones IA; cada integrante usa su cuenta.]
```

## Cierre del corte

Se cumplieron las tres revisiones solicitadas en orden: E2E con evidencia y push, informe UI, informe README. No se cambiaron README, src/, supabase/, configuración ni dependencias. Los cambios propuestos corresponden a sus dueños; quedan como hallazgos y texto revisable. La rama de entrega main no se modificó.
