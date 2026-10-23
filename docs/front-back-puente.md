# Puente front ↔ back de CRUXE

Dueño: ux-flujo (rama `wip/ux`). Se actualiza con cada entrega del equipo. Flujo y fricciones: `docs/flujo-usuario.md`.
Base: `wip/fundamentos`, migraciones `0001` a `0041` (E10 0035-0038, E12 0039-0040, E11 0041). Actualizado: viernes 23 oct 2026, 20:58.

Reglas que valen para todo lo de abajo: el servidor decide cupos, plazos, elegibilidad y estado; la interfaz solo muestra. Todas las respuestas tienen la forma `{ok:true, contrato:2, servidor_ahora, …}` o `{ok:false, error:{codigo, detalle, mensaje}}`. Las escrituras que pueden repetirse llevan `p_intento_id`. Lista permitida: 40 funciones para `authenticated` (31 + 9 del agente social), 0 para `anon`.

## 1. Por pantalla: qué llama y qué usa

| Pantalla (dueño) | RPC | Campos que usa de la respuesta |
|---|---|---|
| Responder en un paso `src/friccion/Responder.tsx` (friccion, #88, en `wip/friccion` `efede20`, sin integrar) | `list_proposals`, `get_space`, `get_proposal_state`, `save_my_conditions`, `mark_interest` | propuestas en `reuniendo_interes` sin `plazo_vencido` ni `retirado`; `mi_situacion.{puede.guardar_condiciones, condiciones, interesado, puede.marcar_interes}`, `franjas[].{clave, inicio, fin}`. Si no hay exactamente una propuesta para responder, vuelve al espacio |
| Agente social (enmienda 11, agente-ia, en `src/agente/**` y la función `agente`; interfaz en curso) | `agente_social_contexto`, `agente_social_candidatos`, `set_recibir_invitaciones_agente` (cada persona), `set_politica_agente_social`, `iniciar_ejecucion_agente`, `guardar_borrador_agente`, `aprobar_borrador_agente`, `publicar_borrador_agente`, `cerrar_ejecucion_agente` | conteos `personas_autorizadas`/`destinatarios` (solo organizador); `opciones[].{opcion_ref, actividad_etiqueta, titulo, franjas, viaje}`; `borrador.plan` para mostrar ANTES de aprobar; `propuesta.id` e `invitados` (cuántos). Lista permitida 31 → 40. El agente no confirma por nadie: cada invitado responde y confirma como siempre |
| Arranque (`App.tsx`, friccion) | `server_info` | `contrato` (si no es 2, aviso de versión) |
| Portada `Inicio.tsx` (front-juan) | `list_my_spaces`, `list_proposals` (de hasta 4 espacios, para "Tu plan"), `seed_demo_space`, `join_space` (formulario "Unirme con un código", sin `p_miembro_id`) | `espacios[].{id,nombre,tipo,demo,mi_rol,cantidad_miembros}`; de cada propuesta `estado`, `version`, `siguiente_accion.{codigo,texto}`, conteos y `plazo` |
| ¿Quién eres? `QuienEres.tsx` (friccion) | `preview_space_by_code`, `join_space(código, nombre, miembro_id)` | `espacio.{nombre,demo}`, `miembros[].{miembro_id,nombre,libre}`; de `join_space`: `resultado.{espacio_id, ya_era_miembro, reclamo_pendiente, reclamo_asiento_simulado}`; errores `miembro_ya_reclamado`, `asiento_en_uso`, `codigo_inexistente`, `nombre_en_uso` |
| Crear un grupo `CrearGrupo.tsx` (front-juan; lista de integrantes de login) | `create_space(nombre, 'amigos', nombre_visible, integrantes)` | `resultado.espacio_id` (después navega) |
| Espacio `Espacio.tsx` (front-juan) | `get_space`, `list_proposals` (cada 10 s), `add_simulated_member`, `reset_demo` (solo demo) | `espacio.{nombre,demo,codigo_invitacion}`, `miembros[].{nombre,rol,simulado,pendiente,es_yo}`, `mi_rol`; propuestas con `estado`, `siguiente_accion`, `minimo`, `maximo`, `plazo` |
| Agente `AgentePanel.tsx` (agente-ia) | `get_space`, `get_my_preferences`, `save_my_preferences`, función `agente` → si falla `proponer_plan_borrador` | `preferencias`, `usar_en_agente`; borrador: `candidatas[]`, `perfil_grupo`, clima, `resultado.tipo` (`sin_plan_compatible`, `pocas_preferencias`), fuentes (`modelo`/`regla`/`texto_fijo`) |
| Nueva propuesta `NuevaPropuesta.tsx` (front-juan) | `get_space`, `create_proposal`, `open_proposal` | `miembros[]` (para "No puede faltar"), `demo` (valores del caso); errores `plazo_invalido`, `imprescindible_invalido`, etc. marcan el campo |
| Propuesta `Propuesta.tsx` + `PlanTab.tsx` (front-juan) | `get_space`, `get_proposal_state(p_desde_rev)` cada 3 s, `open_proposal`, `evaluate_and_publish`, `accept_version`, `propose_repair`, `cancel_proposal` | `estado`, `version`, `opcion_vigente`, `opcion_anterior`, `cupos.{confirmados, disponibles, faltan_para_minimo, imprescindible_acepto, pendientes (null si no organiza), reservado_imprescindible, libres_para_otros}`, `imprescindible`, `personas_con_condiciones` (solo organizador; `null` para el resto), `siguiente_accion`, `mi_situacion.{condiciones, elegible_en_version, acepte_version, motivo_aceptar, puede.*}`, `rev_vista` / `sin_cambios` |
| Mi respuesta `RespuestaTab.tsx` (front-juan) | `mark_interest`, `get_my_conditions`, `save_my_conditions`, `withdraw_commitment` | `condiciones` (A/B: `si`/`no`/`pendiente`), `mi_situacion.{interesado, condiciones, retirado, puede.*}`, `efecto` de la baja |
| Historial `HistorialTab.tsx` (front-juan) | (usa el estado de la propuesta) | `historial[].{tipo, actor, actor_tipo, ejecutado_por, en, estado_previo, …}` |
| Simulación `SimulacionTab.tsx` (front-juan, solo demo) | `get_simulation_panel`, `simulate_load_case`, `simulate_mark_interest`, `simulate_save_conditions`, `simulate_accept`, `simulate_withdraw` | `miembros simulados`, `cargados`, `omitidos[].motivo` |
| Perfil, Planes (front-juan) | `list_my_spaces`, `list_proposals` | como la portada |

## 2. Lo que el back expone y el front no usa

| Qué | Dónde | Para qué serviría | Estado |
|---|---|---|---|
| `simulate_save_preferences` | 0019 | cambiar en vivo las preferencias de los simulados del demo (variantes del jurado) | sin pantalla; lo usan las pruebas |
| `join_space(…, p_miembro_id)` desde la portada | 0032 | que "Unirme con un código" también reclame un integrante anotado (hoy da `nombre_en_uso`) | `Inicio.tsx:384` no lo pasa; sí `QuienEres.tsx` |
| `resultado.motivo = "sin_lugar_cerca_para_todos"` **[E10: en la base, sin pantalla]** | 0035 (backend #85) | decir "No hay lugar cerca para todos" en vez de "sin plan compatible" | agente-ia #87 (en `wip/agente-ia` `1eaf510`, sin integrar) |
| `candidatas[i].viaje = {max_minutos, estimado}` **[E10: en la base, sin pantalla]** | 0035 | "Queda a menos de N minutos para todos (estimado)" | agente-ia #87: hecho en `wip/agente-ia` `1eaf510` (probado 19:40 contra la base), sin integrar |
| Preferencias `zona`, `movilidad`, `tiempo_max` (texto), `momento` **[E10: en la base, sin pantalla]** | 0035 | las cuatro preguntas en "Mis preferencias" | agente-ia #87: hecho en `wip/agente-ia` `1eaf510`, sin integrar. Leído: el panel manda las ocho claves juntas en un solo formulario, así que guardar no borra las de viaje (el riesgo de "reemplazar" queda cubierto) |
| Actividades nuevas en `me_gustaria` (cena, bar, juegos_casa, cine, cultura, juegos_salida, cerro, cafe) **[E10 parte B: en la base, sin pantalla]** | 0036 (backend #86) | chips nuevos en preferencias | agente-ia; apertura propone el catálogo (#95) |

| `opinar_version(p_propuesta_id, p_version, p_opinion 'asi_no_puedo' / 'retirar_opinion', p_intento_id)` **[E13, pendiente de aplicar; corte 01:00]** | 0042 (backend) | botón "Así no puedo, pero sigo" junto a confirmar | componente de friccion (por armar); conecta front-juan |
| `mi_situacion.mi_opinion` y, solo al organizador, `opiniones_totales.asi_no_puedo` (null con menos de 2) **[E13]** | 0042 | aviso "Marcaste que así no puedes" y texto de "Rearmar con lo nuevo" | `AvisoParaMi` y `RearmarConLoNuevo` HECHOS (`40481b6`), sin conectar |
| `propose_repair` desde `esperando_compromisos` (con `puede.proponer_reparacion`), tope de 3 versiones (`sin_alternativa/tope_versiones`) **[E13]** | 0042 | "Rearmar con lo nuevo" del organizador | `RearmarConLoNuevo` HECHO, sin conectar. Forma pedida a backend 20:53 (si `puede.proponer_reparacion` refleja la condición) |
| Baja sin nombre en respuestas compartidas ("Una persona se retiró") **[E13]** | 0042 | `PlanTab.tsx` "Bajas registradas" e Historial sin nombres | pedido a front-juan |

## 3. Lo que le falta al front y habría que pedir al back

| Necesidad (vista en el recorrido) | Pedido | Estado |
|---|---|---|
| El organizador que no puede faltar busca opción antes de responder: el texto del servidor lo invita ("Busca una opción compatible") | `siguiente_accion` del organizador: si quien consulta es el imprescindible y no completó condiciones, decirlo primero. No revela nada de otros | pedido a backend 19:30 (P2, después de E10) |
| Avisar al grupo que hay versión nueva o reparación (WhatsApp) | nada del back: alcanza con `version`, `opcion_vigente` y el código del espacio | entregado: `<RecordarFaltan motivo="version_nueva" …/>` (`419ac2a`); falta que front-juan lo conecte |
| Recordar a quien falta sin nombres ni conteos | nada del back (el mensaje es genérico, para todo el grupo) | entregado: `<RecordarFaltan motivo="faltan" …/>` (`419ac2a`) |
| Reenviar la invitación solo a quien está "por entrar" | no hay contacto por persona (solo nombres, a propósito). Se reenvía el mismo enlace al grupo | sin pedido: decisión de producto |

## 4. Lo que le falta al back y habría que pedir al front

| Qué tiene el back | Qué falta en pantalla | Pedido |
|---|---|---|
| `mi_situacion.elegible_en_version = false` | decirle claro a quien quedó fuera de la versión que es sin él/ella (hoy la portada le dice "Grupo confirmado") | front-juan 19:30 (P2); componente listo `AvisoParaMi` (`59685eb`) |
| `p.imprescindible` + `mi_situacion.condiciones` | aviso "Primero marca tu disponibilidad" si soy el imprescindible | front-juan 19:30 (P1); componente listo `AvisoParaMi` (`59685eb`) |
| `miembros[].pendiente` | no ofrecer a un "por entrar" como "No puede faltar" sin aviso | front-juan 19:30 (P2) |
| `espacio.demo` | chip "Datos ficticios" y textos del demo solo en el demo | friccion (`App.tsx`), front-juan (`Inicio.tsx:462`) 19:30 |

## 5. Registro de entregas que cambian el puente

| Hora | Quién | Qué | Efecto en este documento |
|---|---|---|---|
| 19:31 | apertura `87d4a62` (`wip/apertura`) | `src/lib/ejemplos.ts`: `ATAJOS` y `atajosParaGrupo(nombreGrupo)` | sin RPC; front-juan lo conecta en `NuevaPropuesta.tsx` |
| 19:34 | ux-flujo `419ac2a` (`wip/ux`) | `src/componentes-nuevos/RecordarFaltan.tsx` + `recordar.ts` (prueba 7/7) | sin RPC; usa `espacio.codigo_invitacion`, `titulo` y la franja vigente |
| 19:3x | friccion `efede20`, `3c07fe3`, `8d881d9` (`wip/friccion`) | ruta `#/e/<id>/responder`; entrada por código que reclama al integrante anotado; volver con el mismo enlace → "Seguir como X" | fila nueva en §1; resuelve en la interfaz el "`join_space` sin `p_miembro_id`" de §2 (sin verificar por mí) |
| 19:49 | ux-flujo `59685eb` (`wip/ux`) | `src/componentes-nuevos/AvisoParaMi.tsx` + `avisoPersonal.ts` (prueba) | sin RPC; usa `estado`, `imprescindible`, `mi_situacion` |
| 19:28-19:41 | backend `c63200d`, `aef9c7d` (`wip/backend`) | E10 Parte A (0035-0037) y Parte B (0038, 13 actividades) aplicadas en la base; enmienda10 9/9 | §2: las filas E10 pasan a "en la base, sin pantalla". Las claves nuevas salen en `get_my_preferences.preferencias` solo si tienen valor; `save_my_preferences` reemplaza (la clave que falta queda vacía); `get_my_preferences.opciones.actividades` ya trae las 13 |
| 19:50 | ux-flujo `c535212` | merge de `wip/fundamentos`; `recorrido-dos-sesiones.mjs` 23/23 contra el build 4183 | — |
| 19:37-19:40 | agente-ia `d5d913e`, `1eaf510` (`wip/agente-ia`) | interfaz de E10: cuatro preguntas opcionales ("Prefiero no responder" saca la clave) y "Queda a menos de N minutos para todos (estimado)" | §2: filas E10 con pantalla en su rama, sin integrar. Textos en voseo ("Cómo te movés", "Hasta cuánto viajás") en una app en tuteo |
| 20:32 | coordinador / backend | enmienda 11 (agente social) autorizada; 0041 en curso (lista permitida 31 → 40) | cuando se aplique: 9 funciones nuevas que usa solo el agente (`src/agente/**`, función `agente`); ninguna pantalla de `src/screens/**` las llama. Pendiente de registrar en §1 |
| 20:52-20:57 | coordinador `3ace04e` (contrato E13) · ux-flujo `40481b6` | enmienda 13 aprobada por Nico (opinar sin bajarse, rearmar, baja sin nombre, asado en lugar neutro); `RearmarConLoNuevo` y avisos sin nombre listos | §2: cuatro filas nuevas de E13; lista permitida pasará a 41 |
