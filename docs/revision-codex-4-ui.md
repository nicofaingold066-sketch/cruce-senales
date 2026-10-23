# Revisión independiente 4: interfaz CRUXE

23 oct 2026. Codex. Base revisada: `4477919e05fb89584a59b39bc732cbbcc4e5db16`, incorporada en `codex/revisiones` (HEAD antes del test: `7eb5965`). Fuentes: AGENTS, caso canónico, contrato y enmiendas 2 y 3, `docs/correcciones-altas-1.md`, y todos los módulos de `src/`. Líneas referidas a esa base, no a futuras integraciones. Ninguna edición de `src/` ni `supabase/`.

## Resultado

**0 altas, 5 medias, 2 bajas.** Los hallazgos son de lectura estática con secuencias concretas de reproducción; no se ejecutó un navegador ni se afirma haber reproducido estas carreras en la versión publicada. No encontré una contradicción demostrada con las correcciones del backend de `correcciones-altas-1.md`: las observaciones siguientes son sobre el cliente y no reabren A1–A5 como fallas del servidor.

El E2E por RPC real pasó dos veces seguidas (3/3 cada vez, evidencia en `tests/e2e/evidencia-recorrido-canonico.md`): v1 confirmada, baja, v2 sin heredadas, confirmación nueva, sin opción inicial y sin alternativa. Eso valida el servidor observado, no las carreras de render/solicitudes del cliente.

## Medias

### U1. La lista puede retroceder a una revisión anterior o reaparecer después de un reinicio

- **Dónde:** `src/screens/Espacio.tsx:21–45` y `275–282`; `src/lib/hooks.ts:83–100`; `src/lib/types.ts:194` y `222`.
- **Por qué importa:** cada respuesta ejecuta `setEspacio`/`setPropuestas` sin comparar generación ni `state_rev`. El sondeo, la recuperación de visibilidad y el refresco tras reset pueden solaparse. Una lista antigua puede volver a mostrar «Grupo confirmado» después de haber mostrado «En revisión», o una propuesta borrada después del reset. El filtro correcto del detalle no protege la lista.
- **Reproducción:** retener una respuesta de `list_proposals` tomada en revisión N; provocar la baja en otra sesión; disparar otra carga (volver a enfocar la pestaña), entregar N+1 y luego N. La última respuesta reemplaza la lista completa. Variante: retener una lista previa al reset y entregarla después de `onCambio` con lista vacía.
- **Cambio propuesto:** serializar/coalescer TODAS las cargas (incluida visibilidad), descartar respuestas de cargas anteriores e impedir regresión de `state_rev` por propuesta; al observar `espacio.generacion` mayor, invalidar la lista y sus solicitudes pendientes. Leer la generación ACTUAL de `espacio`, según O1, no el eco de reset.

### U2. «Crear y abrir» libera el botón antes de terminar y permite crear dos propuestas

- **Dónde:** `src/screens/NuevaPropuesta.tsx:146–175` y `312–319`; `src/lib/hooks.ts:140–150`.
- **Por qué importa:** `useAccion` borra el intento y quita `ocupado` al terminar `create_proposal`. Después se espera `open_proposal` fuera de esa protección. Durante esa espera la pantalla sigue montada con los botones habilitados: otro clic obtiene otro UUID y crea una segunda propuesta. La idempotencia del servidor funciona para un mismo intento, pero aquí son dos intentos distintos.
- **Reproducción:** responder rápido a `create_proposal`, demorar `open_proposal` 5 segundos, volver a pulsar «Crear y abrir al grupo» antes de que termine. Comprobar dos creaciones con distinto `p_intento_id`. Si abrir queda pendiente indefinidamente, la ventana no se cierra.
- **Cambio propuesto:** mantener un bloqueo del flujo completo hasta navegar. Guardar el ID creado; cualquier reintento posterior solo abre ESA propuesta. Mostrar el error de apertura sin volver a crearla.

### U3. Una petición que nunca termina puede congelar acciones y sondeo

- **Dónde:** `src/lib/api.ts:153–171`; `src/lib/hooks.ts:90–97`, `133–149`, `198–223`.
- **Por qué importa:** las RPC no tienen límite de espera ni abortado. Los manejadores de red solo actúan cuando fetch rechaza; si una conexión queda pendiente, `ocupado` y `enVuelo` permanecen activos, y el sondeo que espera esa llamada no se reprograma. El texto de recuperación de resultado incierto nunca llega a mostrarse. Es especialmente relevante para una demo de 5 minutos.
- **Reproducción:** interceptar `accept_version` o `get_proposal_state` y no resolver ni rechazar la petición; esperar más de un intervalo de sondeo. No aparece error y la acción/carga sigue bloqueada. Esto no es lo mismo que devolver un error HTTP o emitir el evento offline.
- **Cambio propuesto:** timeout con AbortController/abortSignal, limpieza en finally y clasificación de escritura enviada como resultado incierto. Conservar el UUID para reintentar y consultar el estado. Abortar el cliente no revierte una transacción ya recibida por el servidor.

### U4. El panel de simulación ordena por emisión, pero ignora la revisión del servidor

- **Dónde:** `src/screens/SimulacionTab.tsx:21–39`; `src/lib/api.ts:77`.
- **Por qué importa:** `get_simulation_panel` devuelve `state_rev`, pero se usa solo un contador local de solicitud. Una consulta emitida más tarde puede ser atendida antes en el servidor y traer un snapshot anterior; luego se acepta por tener mayor secuencia. Puede mostrar permisos/aceptaciones antiguos junto a un encabezado nuevo. El backend rechazará acciones obsoletas, pero la demo queda contradictoria.
- **Reproducción:** hacer dos consultas: solicitud 1 obtiene revisión N+1 y solicitud 2, emitida después pero procesada primero, obtiene N. Entregar primero 1 y después 2. Ambas pasan el filtro actual y N sustituye a N+1. También una respuesta anterior a una mutación puede aplicarse mientras se espera la recarga del panel.
- **Cambio propuesto:** conservar máximo `state_rev` del panel y compararlo también con el estado padre. El número de emisión sirve como desempate, no sustituye la revisión. Las condiciones pueden cambiar con igual revisión: para esas respuestas usar una barrera de mutaciones/recarga, además de la revisión.

### U5. «Saltar al contenido» cambia la ruta y abandona la propuesta

- **Dónde:** `src/App.tsx:37–39`; `src/lib/shell.tsx:61–69` y `84–89`.
- **Por qué importa:** la navegación usa el hash. El enlace accesible escribe `#contenido`; el router no lo reconoce y vuelve al inicio. Quien usa teclado pierde la pantalla y puede perder un borrador de condiciones. No llega al contenido de la ruta actual.
- **Reproducción:** abrir una propuesta, editar condiciones sin guardar, enfocar el primer enlace con Tab y activarlo. `parseRuta('#contenido')` devuelve `inicio`.
- **Cambio propuesto:** impedir la navegación del enlace y enfocar/desplazar `main#contenido` con JS manteniendo el hash de la ruta (el main ya tiene tabIndex -1).

## Bajas

### U6. Una invitación con escape inválido lanza una excepción sin recuperación

- **Dónde:** `src/lib/shell.tsx:63` y `85`.
- **Por qué importa:** `decodeURIComponent` puede lanzar URIError durante el render inicial. Un enlace mal copiado como `#/unirse/%` puede dejar la aplicación sin pantalla útil. Los enlaces que genera la aplicación son válidos; no se afirma que el recorrido normal lo produzca.
- **Reproducción:** abrir `#/unirse/%` o `#/unirse/%E0%A4%A`. La decodificación falla antes de mostrar el formulario.
- **Cambio propuesto:** capturar el error, validar el código y mostrar una invitación inválida con regreso al inicio.

### U7. El mensaje del cupo reservado promete que bastará la aceptación del anfitrión

- **Dónde:** `src/screens/PlanTab.tsx:129–130`; `src/lib/api.ts:338–339`.
- **Por qué importa:** con máximo 2 y un invitado ya aceptado, el segundo invitado ve «Podrás confirmar cuando él confirme». Si el anfitrión confirma, quedan 2/2: el segundo invitado sigue sin cupo. La explicación puede provocar clics y preguntas innecesarias aunque el servidor mantenga la reserva correctamente.
- **Reproducción:** escenario A1, mínimo/máximo 2, anfitrión pendiente y un invitado aceptado. Mirar el texto desde otro elegible; aceptar con el anfitrión y verificar que el segundo sigue sin cupo.
- **Cambio propuesto:** «El último cupo está reservado al anfitrión; podrás confirmar si se libera un cupo para otros», sin prometer que la aceptación del anfitrión cree capacidad adicional.

## Cobertura de los puntos pedidos

| Punto | Resultado de la inspección |
|---|---|
| Autoridad de elegibilidad/cupos/confirmación | Los botones consumen `mi_situacion.puede` o `m.puede`; la aceptación usa la versión mostrada (`PlanTab.tsx:141–143`, `SimulacionTab.tsx:174–176`). Los puntos de progreso y la cuenta regresiva son presentación; no se usan para confirmar ni autorizar. |
| «Reparado»/«Confirmado» anticipados | `PlanTab.tsx:139–151` depende de `p.estado`; `30–34` explica alternativa pendiente de nuevas confirmaciones. No encontré confirmación optimista. U1 puede restaurar un estado viejo en la lista. |
| Respuestas atrasadas | El detalle filtra revisiones menores (`hooks.ts:187–194`) y se remonta al cambiar propuesta (`Propuesta.tsx:13–15`). Huecos: U1/U4. Igual revisión se acepta conforme al contrato; no garantiza frescura de condiciones que no suben revisión. |
| Privacidad | La vista común no renderiza disponibilidades ajenas. `RespuestaTab.tsx:87–93` carga solo las propias; panel y edición de simulados aparecen solo al organizador (`Propuesta.tsx:75–80,167`). No encontré una fuga nueva demostrada. Esto depende de la autorización del servidor, también comprobada para Luna en el E2E. No se promete ausencia total de inferencia. |
| Nuevos errores | `api.ts:336–346` orienta asiento_en_uso/intento_obsoleto/cupo reservado; `ui.tsx:55–82` los muestra. `hooks.ts:239–249` refresca ante versión vieja, cupo, plazo, intento obsoleto o resultado incierto. U7 corrige la orientación del reservado. |

## Cambios ya publicados fuera de la base revisada

`08a87c3` en `wip/ui-enmienda` elimina la carga persona por persona y muestra cargados/omitidos. No se incorpora ni modifica código de interfaz en esta revisión. El respaldo individual de `4477919` no se cuenta como hallazgo abierto porque ya tiene una corrección publicada; conviene integrar esa corrección. U1–U7 no dependen de ese respaldo.

## Validación sugerida al dueño de la interfaz

Prioridad: U1/U2/U3, luego U4/U5. Probar las reproducciones con red controlada y respuestas fuera de orden, además del recorrido normal en dos contextos de navegador independientes. Dos pestañas ordinarias del mismo perfil comparten la sesión persistida de Supabase; no sustituyen las dos identidades del E2E.
