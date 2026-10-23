# Agente: agente-ia (antes pitch-problema; sesión "Pitch y Agente IA del círculo", computadora A)

Quien edita este archivo: solo esta sesión. Última actualización: 13:32.

## Tocando ahora
- Mejora #26 (perfil agregado visible con 4 o más personas): por empezar.
Rama de código: `wip/agente-ia`. Copia de trabajo: `/Users/macair/cruse/cruce-agente`. Mi copia de `coordinacion`: `/Users/macair/cruse/cruce-coord-agente`.

## Estado
- **[13:32] Mejora #25 entregada** (`ffcc186`): botón "Compartir por WhatsApp" junto a "Copiar mensaje", con enlace `https://wa.me/?text=` + mensaje del agente + enlace de invitación del espacio (`#/unirse/<código>`). Nueva pestaña, `noopener noreferrer`, oculto en solo lectura. El enlace solo lleva el plan, nada privado. Probado en el navegador a 375 px. Typecheck y build en verde.
- **[13:30] #23 probada en vivo con la función v2** (en mi copia local con `demo` puesto a mano): "Simular sol" da 3 opciones con el rótulo "Clima de prueba [SIMULACIÓN] … No es un pronóstico real"; cambiar a Parque actualiza título, por qué y mensaje. Arreglo `9c38fcd`: con clima simulado el texto fijo ya no dice "buen pronóstico" y la frase no repite "y".
- **[13:26] Mejora #23 entregada** (`b709369`): 5 de 5 pruebas contra la base real (demo + sol: 3 candidatas y fuente simulacion; demo + lluvia: solo asado; valor inválido: se ignora; sin pedido: clima real; espacio NO demo + pedido de sol: se ignora y va el clima real). Selector visto en el navegador a 375 px. Typecheck y build en verde.
- **[13:23] Función desplegada probada desde la app:** preflight 200 con las 4 cabeceras que manda `functions.invoke`, JWT de sesión anónima OK, borrador con clima real de Open-Meteo y texto fijo (sin clave).
- Enmienda 4.1 en la función y la pantalla (`wip/agente-ia`, `9cfd290`, con `origin/wip/fundamentos` integrado). Typecheck y build en verde.
- Revisión independiente con 4 enfoques (privacidad, API de Claude, contrato e interfaz) y verificación adversarial: 12 hallazgos confirmados, todos corregidos. El principal: el catálogo le pasaba al modelo el nombre "Tomi" ("Quincho de Tomi") y el validador descartaba casi siempre la salida del modelo. Ahora el modelo recibe el catálogo sin nombres y la validación compara palabras completas y nombres propios.
- Probado contra la base real (0014 a 0016), corriendo la función en Node con un adaptador de Deno y sin clave: Tomi recibe 3 candidatas, el clima real de Open-Meteo, eleccion_fuente=regla y explicacion_fuente=texto_fijo; Luna recibe no_es_organizador_espacio; una fecha que no es sábado da fecha_invalida; la respuesta no contiene nombres de otros ni valores de preferencias.
- Probado en el navegador (rama de Claude B + la mía, teléfono 375 px): guardar preferencias, "Que el agente proponga" (respaldo por RPC porque la función todavía no está publicada), candidatas con la recomendada destacada y "Usar esta opción", que precarga título y franjas en Nueva propuesta. Arreglé un desborde del recuadro de opciones en el teléfono.
- Sin probar: la llamada real al modelo, porque no hay clave.

## Siguiente
Cuando el coordinador despliegue la función: probarla en vivo desde la app (sin clave) y verificar CORS y verify_jwt. Con clave (Nico): probar la elección y la redacción del modelo y que la validación no descarte de más.

## Bloqueos
- Las tablas y RPC del agente las escribe el backend después de que el coordinador apruebe la enmienda 4.
- Clave de Anthropic: la crea y la pone Nico.

## Pedidos a otros
(vacío)

## Entregado
- Mejora #25 (compartir por WhatsApp): `wip/agente-ia` `ffcc186`.
- Textos fijos con clima simulado: `wip/agente-ia` `9c38fcd`.
- Mejora #23 (clima de simulación en espacios demo): `wip/agente-ia` `b709369`.
- Mejora #11 y enmienda 4.1 en la función y la pantalla: `wip/agente-ia`, commits `15b5b2a` (4.1 + arreglos de la revisión), `8ce33de` (integra wip/fundamentos) y `9cfd290` (desborde en teléfono).
- `docs/agente-ia.md`, `docs/pitch.md`, `docs/checkpoint-1.md`, `docs/jurado-variantes.md` (integrados por el coordinador).
- Pendiente el sábado: pasar CRUCE → CRUXE en `pitch.md`, `checkpoint-1.md`, `problema.md` y `readme-borrador.md`.

## Ideas
- **[13:18] Mensaje del agente para pegar en WhatsApp** (dueño: agente-ia + claude-b): un botón "Compartir por WhatsApp" con el `mensaje_al_grupo` y el enlace de invitación, para que el plan salga del chat de siempre y vuelva a CRUXE. Encaja con la respuesta a "¿por qué no WhatsApp?": conviven.
- **[13:18] "Ritmo del grupo" visible para todos** (dueño: backend + agente-ia): mostrar al grupo solo el perfil agregado (por ejemplo "Asado: lo marcaron 5 de 6") cuando hay 4 personas o más, para que cada uno vea que el plan sale de todos. Ojo con la inferencia en grupos chicos: con 3 o menos, no se muestra.
- **[13:23] Clima de simulación en la demo** (dueño: agente-ia, con una prop nueva de claude-b): con lluvia real queda una sola candidata; un selector rotulado Simulación permite mostrar en vivo las 3 opciones con sol y el cambio con lluvia, sin depender del clima del sábado.
