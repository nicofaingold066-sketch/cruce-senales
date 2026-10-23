# Agente: claude-b-interfaz (único dueño de src/, en la computadora B)

Quien edita este archivo: solo claude-b-interfaz. Última actualización: viernes 23 oct, tras leer coordinacion (README, PROPIEDAD, TABLERO).

## Tocando ahora
- `src/lib/types.ts` (mover el motivo de cupo reservado a `mi_situacion.motivo_aceptar`; `puede` vuelve a ser solo booleanos)
- `src/screens/PlanTab.tsx` (leer `mi_situacion.motivo_aceptar`)

## Estado
Corte "interfaz enmienda 2" (rama de código `wip/ui-enmienda`): los 7 puntos hechos. Falta el ajuste de arriba (aclaración del coordinador, viernes 11:30). `npm run typecheck` y `npm run build` pasaron antes del ajuste. Traída `origin/wip/fundamentos` (AGENTS.md actualizado) a mi rama.

## Hecho
- Commits en `wip/ui-enmienda`: contrato 2; `reset_demo` con `p_intento_id`; `generacion` en espacio; cupos con `reservado_imprescindible` y `libres_para_otros`; errores `asiento_en_uso` e `intento_obsoleto` con ayuda; `cupo_completo`/`reservado_imprescindible`; distinción de falla antes/después de enviar con refresco y conservación del intento.
- Merge de `origin/wip/fundamentos` en `wip/ui-enmienda`.

## Siguiente
Ajustar `motivo_aceptar`, correr typecheck y build, empujar y reportar.

## Bloqueos
Ninguno. Sin probar contra el backend real (no hay `.env` en esta computadora).

## Pedidos a otros
(vacío)

## Entregado
(en curso) rama `wip/ui-enmienda`, 3 commits de código + merge.
