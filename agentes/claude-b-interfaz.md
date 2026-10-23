# Agente: claude-b-interfaz (único dueño de src/, en la computadora B)

Quien edita este archivo: solo claude-b-interfaz. Última actualización: viernes 23 oct, tras leer coordinacion (README, PROPIEDAD, TABLERO).

## Tocando ahora
(vacío)

## Estado
11:2x: trabajando el plan sin red (aviso 11:21). Integrada mi rama en wip/fundamentos por el coordinador; yo traje `origin/wip/fundamentos` a `wip/ui-enmienda`.
Corte "interfaz enmienda 2" (rama de código `wip/ui-enmienda`): los 7 puntos hechos. Ajuste de `mi_situacion.motivo_aceptar` hecho. `npm run typecheck` y `npm run build` pasan. Traída `origin/wip/fundamentos` (AGENTS.md actualizado) a mi rama.

## Hecho
- Corte enmienda 2 (rama `wip/ui-enmienda`): contrato 2, `reset_demo` con intento, cupos reservados (`mi_situacion.motivo_aceptar`), errores `asiento_en_uso`/`intento_obsoleto`/`cupo_completo` con ayuda, falla antes/después de enviar.
- Plan sin red (aviso 11:21), verificado con un banco descartable (fuera del repo) que intercepta la red con datos ficticios del caso y abre las 4 pantallas a 320, 390 y 430 px en escenarios normal / cupo reservado / en revisión:
  1. Teléfono: sin desborde horizontal en ningún caso. Único hallazgo: enlaces de texto (logo, "Restablecer valores del caso", "Ver historial completo") con 24 px de alto; arreglado con zona tocable de 44 px (commit `e7d868d`).
  2. Estados vacío / error del servidor / sin conexión / sin opción: presentes y con texto en inicio, espacio, nueva propuesta y propuesta (ErrorCaja con Reintentar, banner "Sin conexión", "Sin opción compatible").
  3. Accesibilidad: foco visible (outline 3 px), enlace "Saltar al contenido", 0 botones sin texto.
  4. Textos del caso: Tomi, Luna, Mati, Caro, Fede, Sofi, franjas A y B 14:00 a 17:00, America/Santiago presentes.
- LÍMITE: todo eso con respuestas ficticias interceptadas, NO contra el servidor real. El recorrido en vivo sigue bloqueado por la red (ver Bloqueos).

## Siguiente
Esperar indicaciones del coordinador (probar contra el backend con migraciones 0008-0011 requiere `.env`).

## Bloqueos
- 11:2x: la tarea del aviso de las 11:19 (recorrido en vivo) NO se pudo empezar. El entorno cloud de esta computadora bloquea `tjkfdnvzsikncjbskufm.supabase.co`: el proxy responde `CONNECT tunnel failed, response 403` (curl a `/auth/v1/health`, código 000). El `.env` ya está creado con `entorno-publico.txt`. Nico tiene que habilitar el dominio en Network access del entorno (o darme otro entorno con salida a Supabase). Sin esto no hay respuestas del servidor que reportar y no voy a inventarlas.

## Pedidos a otros
- Al coordinador/Nico: habilitar `tjkfdnvzsikncjbskufm.supabase.co` en la red del entorno de claude-b-interfaz (ver Bloqueos). Mientras tanto avanzo solo con lo que no necesita red.

## Entregado
Rama `wip/ui-enmienda`: 4 commits de código + merge de `origin/wip/fundamentos` (ver `git log`).
