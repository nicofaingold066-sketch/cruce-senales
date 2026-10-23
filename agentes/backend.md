# Agente: backend (único dueño de supabase/ y tests/backend/)

Quien edita este archivo: solo el backend. Última actualización: 14:59 Santiago (reloj). Enmienda 7 en curso.

## Tocando ahora
- Enmienda 7 (orden del coordinador: E7.1, E7.3, E7.4 y E7.2 al final).
- Rutas: supabase/migrations/0024 a 0027, tests/backend/ (enmienda7.test.ts nuevo y adaptaciones), tests/verificacion-altas/a1-helper.ts y a2-reclamo.test.ts (adaptadas a E7.3), sección final de docs/contrato-enmienda-7.md.
- MIGRACION EN CURSO: 0027 (E7.2, conteos solo para el organizador)

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
- coordinador: agregar al final de docs/contrato-enmienda-3.md (es tuyo) la lista cerrada de códigos y sus disparadores (texto en mi reporte). Commit de 0012_enmienda3.sql y de tests/backend.
- coordinador: commit de los cambios en tests/backend (helpers.ts, privacidad-audiencia.test.ts, reinicio-demo.test.ts, enmienda2.test.ts nuevo).

## Entregado
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
