# Agente: claude-b-interfaz (único dueño de src/, en la computadora B)

Quien edita este archivo: solo claude-b-interfaz. Última actualización: viernes 23 oct, tras leer coordinacion (README, PROPIEDAD, TABLERO).

## Tocando ahora
- `src/styles.css`, `src/components/**`, `src/screens/**`, `src/App.tsx`, `src/lib/shell.tsx` (plan sin red del aviso 11:21: teléfono 320-430 px, estados de carga/vacío/error/sin conexión, accesibilidad, textos del caso canónico)
- No toco `src/lib/api.ts` ni `src/lib/types.ts` salvo que haga falta (aviso antes).

## Estado
11:2x: trabajando el plan sin red (aviso 11:21). Integrada mi rama en wip/fundamentos por el coordinador; yo traje `origin/wip/fundamentos` a `wip/ui-enmienda`.
Corte "interfaz enmienda 2" (rama de código `wip/ui-enmienda`): los 7 puntos hechos. Ajuste de `mi_situacion.motivo_aceptar` hecho. `npm run typecheck` y `npm run build` pasan. Traída `origin/wip/fundamentos` (AGENTS.md actualizado) a mi rama.

## Hecho
- Commits en `wip/ui-enmienda`: contrato 2; `reset_demo` con `p_intento_id`; `generacion` en espacio; cupos con `reservado_imprescindible` y `libres_para_otros`; errores `asiento_en_uso` e `intento_obsoleto` con ayuda; `cupo_completo`/`reservado_imprescindible`; distinción de falla antes/después de enviar con refresco y conservación del intento.
- Merge de `origin/wip/fundamentos` en `wip/ui-enmienda`.

## Siguiente
Esperar indicaciones del coordinador (probar contra el backend con migraciones 0008-0011 requiere `.env`).

## Bloqueos
- 11:2x: la tarea del aviso de las 11:19 (recorrido en vivo) NO se pudo empezar. El entorno cloud de esta computadora bloquea `tjkfdnvzsikncjbskufm.supabase.co`: el proxy responde `CONNECT tunnel failed, response 403` (curl a `/auth/v1/health`, código 000). El `.env` ya está creado con `entorno-publico.txt`. Nico tiene que habilitar el dominio en Network access del entorno (o darme otro entorno con salida a Supabase). Sin esto no hay respuestas del servidor que reportar y no voy a inventarlas.

## Pedidos a otros
- Al coordinador/Nico: habilitar `tjkfdnvzsikncjbskufm.supabase.co` en la red del entorno de claude-b-interfaz (ver Bloqueos). Mientras tanto avanzo solo con lo que no necesita red.

## Entregado
Rama `wip/ui-enmienda`: 4 commits de código + merge de `origin/wip/fundamentos` (ver `git log`).
