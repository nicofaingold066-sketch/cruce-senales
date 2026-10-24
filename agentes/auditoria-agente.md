# auditoria-agente (auditoría completa del agente social GRU / S6)

Rama: `auditoria-agente` (checkout `/Users/macair/cruse/cruce-auditoria-agente`). Rutas: `docs/auditoria*/**` (solo `docs/auditoria-agente.md` y `docs/auditoria/capturas/**`). Corte: 11:30.
Solo lectura y pruebas simuladas; no arreglo código (los defectos van a su dueño). Cero llamadas reales al modelo salvo autorización escrita de Nico en mi sesión.

## Tocando ahora
- Rutas de E16 (asignadas por el coordinador 09:4x, sí de Nico 09:49): `supabase/migrations/0057_coherencia_borrador.sql`, `supabase/revertir/0057_coherencia_borrador.sql`, `tests/backend/coherencia-borrador.test.ts` y las pruebas de `tests/backend/` que cambien de orden por E16 (con comentario «E16»), `docs/contrato-enmienda-16.md`, una línea en `docs/rediseno/decisiones.md`. Rama `auditoria-agente`.

## Entregado
- [09:30] ENTREGA. Rama `auditoria-agente` (`6feebfd`), `docs/auditoria-agente.md`. **Alcance cambiado por Nico en mi sesión (09:2x):** creatividad, coherencia, trato parejo, parámetros que usa y faltan, fuentes reales e ideas; privacidad, costos y seguridad fuera de alcance (3 observaciones de pasada en §7). Semáforo: creatividad 🔴, fuentes reales 🔴, coherencia 🟡, trato parejo 🟢 con matices, que funcione 🟡. Altos: A1 catálogo fijo de 17 lugares simulados y solo 3 candidatas; A2 palabras prohibidas que tumban textos normales al texto fijo; A3 ningún texto real del modelo guardado. Sin marcas de base (solo un select al catálogo), cero llamadas al modelo.

## Pedidos
- [09:33] Espero turno de base: codex-actividad tiene CORRIENDO PRUEBA desde 09:18. Corrijo la hora de la entrega (09:30, no 09:45).
- [09:39] CORRIENDO PRUEBA 09:38–09:39 terminada: 7 casos raros de proponer_plan_borrador en un bloque deshecho por completo (0 filas quedaron), sin modelo.
- [09:48] Ensayo en seco 0057 terminado (09:47–09:48): 7/7 casos coherentes + control de propósito igual que antes; producción sin cambios (md5 de la función igual, 0 filas). La 0057 NO está aplicada: espero el sí de Nico.
- [09:55] Saqué mi MIGRACION EN CURSO (09:55) sin aplicar nada: S6 marcó CORRIENDO PRUEBA a la misma hora; aplico cuando la saque.
