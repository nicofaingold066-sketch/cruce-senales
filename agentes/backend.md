# Agente: backend (único dueño de supabase/ y tests/backend/)

Quien edita este archivo: solo el backend. Última actualización: ~12:20 Santiago (backend), enmienda 3 aplicada. El backend no hace commit/push; el coordinador sincroniza este archivo.

## Tocando ahora
(vacío: 0013 cerrada; esperando enmienda 4, sin empezarla)

## Estado
Enmienda 2 aplicada en la base (tjkfdnvzsikncjbskufm) con migraciones 0008 a 0011, sobre 0001 a 0007. Pruebas reales: 23/23 en 4 archivos (`npx vitest run tests/backend`, 56 s, 10:59:54). Typecheck de tests ok.

## Hecho (por hallazgo: migración · prueba)
- A5: 0009_enmienda2_privilegios (+ verificación en 0010 y 0011) · enmienda2.test.ts "A5: sin sesión ninguna de las 25..." y "A5: una sesión ajena..."; catálogo: 25 en public, anon 0, authenticated 25, helpers ejecutables 0.
- Contrato 2: 0008 (cruce.ok/err) · privacidad-audiencia "C0" y enmienda2 A5 (las 25 responden contrato 2).
- A1: 0008 (cupos y motivo_aceptar) + 0011 (op_accept y trigger) · enmienda2 "A1: mínimo 2, máximo 2..." y "A1: si el imprescindible se retira...".
- A2: 0010 (join_space, asiento_en_uso) + 0008 (asiento_usado, origen) · enmienda2 "A2: reclamo tardío..." y "A2/A4: reclamo concurrente...".
- A3: 0008 (generacion, tombstones SET NULL) + 0010 (reset_demo(p_espacio_id, p_intento_id)) + 0011 (intento_obsoleto) · enmienda2 "A3: repetir el MISMO reinicio..." y reinicio-demo.
- A4: 0008 (fijar_ahora, vencer revalidado, bloqueos) + 0010 + 0011 · enmienda2 "A4: seed/seed...", "A4: reset/create...", "A2/A4..."; experimento de bloqueo que cruza el cierre: plazo_vencido.

## Enmienda 3
0012_enmienda3 aplicada: siguiente_accion personal (te_toca_aceptar / ya_aceptaste / buscar_opcion), simulate_load_case atómico (26 públicas; verificación de catálogo actualizada). Pruebas: tests/backend/enmienda3.test.ts (4) + ajustes; suite completa 27/27 (5 archivos, 34.7 s). errores_internos 0. 0013_enmienda3_singular aplicada ("Falta 1" / "Faltan X"); suite 27/27 (32.5 s). Sin commitear: 0012, 0013 y tests.

## Siguiente
Esperar revisión de Codex (revision-codex-3) e integración del coordinador.

## Bloqueos
Ninguno.

## Pedidos a otros
- coordinador: agregar al final de docs/contrato-enmienda-3.md (es tuyo) la lista cerrada de códigos y sus disparadores (texto en mi reporte). Commit de 0012_enmienda3.sql y de tests/backend.
- coordinador: commit de los cambios en tests/backend (helpers.ts, privacidad-audiencia.test.ts, reinicio-demo.test.ts, enmienda2.test.ts nuevo).

## Entregado
Migraciones 0008 a 0011 (ya commiteadas por el coordinador en d904a93). Tests en el working tree sin commitear.
