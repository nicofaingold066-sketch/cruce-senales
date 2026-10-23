# Enmienda 6 al contrato: versión anterior del plan (mejora #22)

Aprobada por el coordinador. Cambio aditivo: no cambia ninguna operación ni campo existente (`contrato` sigue en 2).

## `EstadoPropuesta.opcion_anterior` (objeto | null)
- **Dónde:** dentro de `propuesta` (`EstadoPropuesta`): en la respuesta completa de `get_proposal_state` y en toda operación que devuelve `propuesta`. La clave siempre está presente. No está en `PropuestaResumen` (`list_proposals`) ni en la respuesta corta `sin_cambios: true`.
- **Valor:** `null` si `opcion` es null o si la versión vigente es la 1. Si no, la opción de la versión publicada inmediatamente anterior a la vigente: `{ version, franja_clave, inicio: Momento, fin: Momento }`, con el mismo formato y zona horaria que `opcion.franja` (`utc` y `local` en America/Santiago).
- **Para qué:** que la interfaz muestre "Sábado → Domingo" tras una reparación (v1 → v2). No cambia reglas: las aceptaciones de la versión anterior siguen sin contar.
- **Audiencia:** la misma que `opcion` (todo miembro del espacio). Es información del plan: sin nombres, sin condiciones, sin preferencias.
- **`rev_vista` (mejora #15):** el campo es parte de la vista, así que entra en el cálculo; si cambia, cambia `rev_vista`.
- **`reset_demo`:** borra las propuestas del demo, así que el campo no aparece hasta que haya una propuesta nueva.
- **A5:** sin funciones públicas nuevas; la lista permitida sigue en 30 para `authenticated` y 0 para `anon`. Migración `0022_opcion_anterior` (helper privado `cruce.opcion_anterior`, solo lectura, sin bloqueos).

## Pruebas mínimas (`tests/backend/mejoras.test.ts`, "mejora #22")
1. Sin opción y con v1 publicada: `opcion_anterior` es null.
2. Baja que rompe + `propose_repair` → v2 en B con `opcion_anterior = { version: 1, franja_clave: "A", inicio, fin }` iguales a la franja de v1.
3. `rev_vista` cambia con la reparación; el sondeo con el `rev_vista` nuevo responde `sin_cambios: true`.
4. Un miembro común ve el mismo `opcion_anterior`; ninguna respuesta compartida trae condiciones ni preferencias.

## Mejora #28 (privacidad): `proponer_plan_borrador` → `perfil_grupo.gustos` solo con `cuantos >= 2`
Una actividad elegida por una sola persona no aparece en `gustos` (ni sumada en otro total); `cuantos` cuenta personas distintas. Lo demás de `perfil_grupo` no cambia (con `personas <= 3`, solo `personas`). Migración `0023_gustos_minimo_dos`; prueba "mejora #28" en `tests/backend/enmienda4.test.ts`.
