# Agente: backend (único dueño de supabase/ y tests/backend/)

Quien edita este archivo: solo el backend. Última actualización: 16:36 Santiago (reloj). Enmienda 7 en curso.

## Tocando ahora
- #62 (enmienda 8, opt-out del agente): supabase/migrations/0031 y tests/backend/enmienda8.test.ts escritos, sin aplicar. Se aplica a las 16:55 por pedido del coordinador; hasta entonces no hay ninguna migración en curso y no toco la base.
- Rutas: supabase/migrations/0031, tests/backend/enmienda8.test.ts, sección Implementación de docs/contrato-enmienda-8.md.

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

## Enmienda 4
0014_enmienda4_esquema (tablas preferencias y catalogo_agente con semilla, semillas en seed/reset y en los demos existentes, A2 con preferencias, mensajes), 0015_enmienda4_api (save_my_preferences, get_my_preferences, proponer_plan_borrador; A5 a 29; agente_insumos no existe) y 0016_enmienda4_candidatas (4.1: candidatas y perfil_grupo) aplicadas. tests/backend/enmienda4.test.ts (9 pruebas: secciones 7.1 a 7.9 y 4.1). Suite completa 36/36 (6 archivos, 34.5 s). errores_internos 0. Sin commitear: 0014, 0015, 0016 y tests.

## Mejora #12 (entregada sin commit)
0017_nombres_normalizados: cruce.normalizar_nombre (NFC, sin ancho cero, tab/NBSP/espacios Unicode/controles → un espacio, colapsa y recorta) en create_space, join_space (nombre y código) y add_simulated_member; restricción NOT VALID para filas nuevas. tests/backend/mejoras.test.ts (3). Suite 39/39 (7 archivos, 36.0 s). Nota: hay 7 filas viejas de prueba ("ver-a2-var-*" con tab/NBSP, de tests/verificacion-altas) que colisionarían al normalizarse; no se tocaron.

## Siguiente
Esperar revisión de Codex (revision-codex-3) e integración del coordinador.

## Bloqueos
Ninguno.

## Pedidos a otros
- coordinador (15:06): E7.2 ya está en la base y `main` todavía no tiene b2adc4d (#48): hasta que llegue, la interfaz publicada muestra "persona(s)" sin número a quien no organiza.
- claude-b-interfaz (15:14): hecho tu pedido de las 14:50, `mi_situacion.puede.simular` es false fuera del demo (0028).
- coordinador: agregar al final de docs/contrato-enmienda-3.md (es tuyo) la lista cerrada de códigos y sus disparadores (texto en mi reporte). Commit de 0012_enmienda3.sql y de tests/backend.
- coordinador: commit de los cambios en tests/backend (helpers.ts, privacidad-audiencia.test.ts, reinicio-demo.test.ts, enmienda2.test.ts nuevo).

## Entregado
- #45 prueba de carga (16:30): tests/carga/carga.mjs, commit 02efa2d en `wip/fundamentos`, sin push; corrida 16:26:40 a 16:29:51, sin migraciones. A p95 270 ms y 0 errores (988 llamadas); B p95 230 ms (1811); C invariantes ok (11 aceptaciones vigentes, 11 personas, 11 eventos); D p95 225 ms (30). 0 errores 57014/55P03/fallo_temporal; cruce.errores_internos sin filas nuevas (max id 17 antes y después). Los 4 criterios cumplen.
- #59 y #54 (16:09): 0029_texto_confirmaron_minimo (aplicada 16:04) y 0030_ritmo_sin_quien_llama (16:05), commit dda21c6 en `wip/fundamentos`, sin push. tests/backend 55/55 (9 archivos, 16:06 a 16:08). Lista permitida 30/0, verificar_privilegios sin hallazgos.
- a4 y a5 de verificacion-altas adaptadas a E7.3 (15:31): commit 7747bf6 en `wip/fundamentos`, sin push, sin migraciones. a4+a5 en serie (15:20 a 15:25): a5 12/12, a4 21/23 (ráfaga mixta: 2 fallo_temporal por 55P03 y un 57014 en join_space; la prueba de forma de errores cae por ese 57014). Solas (15:26): 2/2. a4 completa otra vez (15:27 a 15:30): 23/23.
- E7.5 (15:14): 0028_e7_simular_solo_demo_y_mensaje aplicada 15:09 (puede.simular false fuera del demo; mensaje general de espacio_no_demo), commit 8545fce en `wip/fundamentos`, sin push. tests/backend 53/53 (9 archivos, 15:10 a 15:13). Lista permitida 30/0, verificar_privilegios sin hallazgos.
- Enmienda 7 (15:06): commits 254f0d9 (E7.1, 0024), 4d88d3a (E7.3, 0025 + pruebas al demo propio), 145e3e8 (E7.4, 0026 + tests/backend/enmienda7.test.ts), 8eb54df (E7.2, 0027 + doc), f33978a (e2e sin cupos.pendientes de Luna), 4721a5a (doc) en `wip/fundamentos`, sin push. Orden aplicado: 0024 E7.1, 0025 E7.3, 0026 E7.4, 0027 E7.2. Lista permitida 30/0, verificar_privilegios sin hallazgos. tests/backend 52/52 (9 archivos, 15:01 a 15:03); tests/e2e 12/12 sumando la corrida de 15:03 (11/12) y la falla de transporte repetida sola (1/1, 15:06). Detalle en la sección Implementación de docs/contrato-enmienda-7.md.
- Mejora #28 (privacidad, `perfil_grupo.gustos` solo con `cuantos >= 2`): commit 66a1910 en `wip/fundamentos` (0023_gustos_minimo_dos.sql aplicada 13:51, tests/backend/enmienda4.test.ts, línea en docs/contrato-enmienda-6.md). enmienda4.test.ts 10/10; suite backend 47/47 (8 archivos, 169 s, 13:53 a 13:56). Sin push.
- Mejora #22 (`opcion_anterior`): commit 52ae246 en `wip/fundamentos` (0022_opcion_anterior.sql aplicada 13:47, tests/backend/mejoras.test.ts, docs/contrato-enmienda-6.md). Prueba #22 1/1; suite backend 46/46 (8 archivos, 94 s, 13:48). Sin push.
- Migraciones 0008 a 0011 (ya commiteadas por el coordinador en d904a93).

## Mejora #13 (entregada sin commit)
0018_acl_por_defecto: revoca los privilegios por defecto de postgres que daban todo a anon/authenticated en tablas y secuencias nuevas de public (y lo mismo en cruce). La migración crea una tabla, una secuencia y una vista de prueba en public, comprueba que nacen cerradas y las borra. cruce.verificar_privilegios ahora también falla si un objeto de public tiene privilegios del navegador o si reaparecen defaults abiertos de postgres. Límite: los defaults de supabase_admin en public siguen abiertos (postgres no es miembro de supabase_admin); la verificación de catálogo es la red. Suite 39/39 (55.3 s).

## Enmienda 5 (entregada sin commit)
0019_enmienda5_preferencias_simuladas (simulate_save_preferences: organizador, demo, simulados; idempotente; A4; evento de espacio sin contenido; A5 a 30) y 0020_reset_limpia_preferencias_simuladas (reset_demo también borra preferencias en vivo de simulados sin semilla, p. ej. Luna, para que vuelvan a poder reclamarse). tests/backend/enmienda5.test.ts (5). Suite 44/44 (8 archivos, 42.5 s).

## Mejora #15 (entregada sin commit)
0021_sondeo_liviano: get_proposal_state(p_propuesta_id, p_desde_rev integer default null). Toda respuesta completa trae rev_vista (hash entero de la vista de quien consulta); con p_desde_rev = rev_vista responde {sin_cambios: true, state_rev, rev_vista}. No se usa state_rev como testigo porque guardar condiciones y el paso del tiempo cambian la vista sin subirlo. Prueba en tests/backend/mejoras.test.ts: pasó en las 3 corridas. Las corridas completas posteriores tuvieron 1 a 4 fallas 57014 (statement timeout) en pruebas viejas, por carga concurrente sobre la base; medido en reposo: seed 251 ms, create_proposal 161 ms, add_simulated_member 4 ms, get_proposal_state 5 ms.

## Ideas
- Correr cruce.verificar_privilegios() al final de cada despliegue de migraciones (ya corre dentro de cada migración del backend; falta para cambios hechos a mano desde el panel). Dueño: coordinador.
- Limpieza de datos de prueba: miles de espacios "t-*" y demos de sesiones de prueba se acumulan en la base real (1564 miembros hoy). Una función privada de limpieza por antigüedad, solo para espacios t- y demos de sesiones anónimas sin actividad. Dueño: backend (pedir aprobación antes de borrar).
- Prueba de catálogo en CI de la base: ejecutar `select cruce.verificar_privilegios()` como paso de la suite (vía una RPC de diagnóstico solo para service_role o en un script de despliegue), para que una función nueva sin grant falle antes de la demo. Dueño: backend + coordinador.
- `simulate_save_preferences` (postergado en la enmienda 4) para las variantes del jurado: hoy las semillas de los simulados son fijas y no se pueden cambiar en vivo. Dueño: backend.
