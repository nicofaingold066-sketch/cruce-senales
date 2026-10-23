# QA en vivo de la enmienda 9 (mejora #77)

Dueño: agente-ia. Viernes 23 oct 2026. Pedido del coordinador: probar la fase 2 de la enmienda 9 (`docs/contrato-enmienda-9.md`, sección Implementación) solo por RPC, sin interfaz ni modelo, con un espacio propio y datos ficticios.

## Cómo se corrió
- **Cuándo:** de 17:26:09 a 17:26:12 (hora del reloj, Santiago), con la base sin migración en curso (última aplicada: 0034) y "CORRIENDO PRUEBA" anotado en `agentes/pitch-problema.md`. Hubo una corrida anterior, de 17:25:45 a 17:25:51, con 38 de 38. La repetí porque en ese orden la última integrante pendiente ya estaba reclamada cuando se publicó la versión: no probaba que una persona pendiente no cuente en los cupos.
- **Con qué:** un guion de Node con `@supabase/supabase-js` y la clave pública del `.env`, contra el proyecto real. Cuatro sesiones anónimas: Tomi organiza y R1, R2 y R3 abren la invitación. Espacio `t-qa77-ee3d1e`, con los integrantes Ana, Beto y Caro (nombres ficticios). Al final se canceló la propuesta.
- **Resultado: 40 de 40.** El guion está en mi carpeta temporal; si se quiere como prueba versionada, se pasa.

## Qué se comprobó
| Tema | Qué se vio |
|---|---|
| `create_space` con integrantes: errores antes de crear | 13 nombres → `formato_invalido`; un nombre vacío → `campo_faltante`; "Ana" y "ana" → `nombre_en_uso`; "tomi" con el organizador Tomi → `nombre_en_uso`. Ninguno de esos intentos dejó un espacio creado |
| `create_space` con `['Ana', '  Beto  ', 'Caro']` | `resultado` con 4 claves (`codigo_invitacion`, `espacio_id`, `miembro_id`, `pendientes`). `pendientes` en el orden recibido, con el nombre normalizado ("Beto") y solo `miembro_id` y `nombre` |
| `get_space` | Los 3 vienen con `pendiente: true`, `rol: "miembro"`, `simulado: false` y `es_yo: false`, y solo esas seis claves. El organizador viene con `pendiente: false` |
| `preview_space_by_code` sin ser miembro | Solo `espacio: { nombre, demo }` y `miembros` (además de `ok`, `contrato` y `servidor_ahora`). Cada miembro trae solo `miembro_id`, `nombre` y `libre`. Ana, Beto y Caro salen libres y Tomi no. No inscribe a quien mira. Código inexistente → `fuera_de_audiencia/codigo_inexistente`; vacío → `formato_invalido`; en minúsculas y con espacios lo encuentra igual |
| Pendientes en una propuesta (mínimo 2) | `simulate_mark_interest` sobre Beto → `no_autorizado/espacio_no_demo`. Con Tomi solo y 3 pendientes: interés 1 y `personas_con_condiciones` 1; evaluar da `sin_opcion`, porque el quórum no cuenta a los pendientes |
| Reclamar Ana con `p_miembro_id` | `resultado` con 6 claves, `reclamo_pendiente: true`, `reclamo_asiento_simulado: false` y el mismo `miembro_id`. En `get_space` de R1 Ana queda real (`pendiente: false`, `es_yo: true`, nombre "Ana") y el preview la muestra no libre. Si Ana pide además a Caro: `ya_era_miembro` con su propio `miembro_id`, sin cambiar de persona |
| Errores de reclamo | Tomi (real) → `no_autorizado/miembro_ya_reclamado`; un id inexistente → `entrada_incompleta/miembro_inexistente`; escribir "caro" en "No estoy en la lista" → `nombre_en_uso` |
| Doble reclamo concurrente de Beto (R2 y R3 a la vez) | Uno gana (`reclamo_pendiente: true`, `miembro_id` de Beto) y el otro recibe `no_autorizado/miembro_ya_reclamado`. El que perdió no quedó inscripto en el espacio |
| Cupos con una pendiente todavía sin reclamar | Tomi y Ana cargan condiciones. Beto está reclamado pero sin condiciones, y Caro sigue pendiente (comprobado en `get_space`). Se publica la versión 1 con interés 2, `personas_con_condiciones` 2 y `cupos.pendientes` 2 (Tomi y Ana); ni Caro ni Beto suman. Para un miembro (R2), los conteos de la enmienda 7 siguen en `null`. Con Tomi y Ana confirmados queda **Grupo confirmado**, sin esperar a nadie más |
| Reclamar después de publicar | El que perdió el reclamo de Beto toma a Caro (`reclamo_pendiente: true`). Caro no forma parte de la versión 1 (`puede.aceptar: false`) y puede marcar interés y cargar condiciones |
| Nada de más en lo compartido | Ni el preview ni el estado de la propuesta que ve un miembro traen las palabras "disponibilidad", "preferencias", "user_id" o "auth", ni el id de sesión de nadie |

## Límites
- El doble reclamo se probó una vez por corrida (dos en total, una con Beto en cada una): dos llamadas en paralelo desde el mismo proceso. No es una prueba de carga. Lo cubre también `tests/backend/enmienda9.test.ts`.
- No se probó la interfaz ("¿Quién eres?"), que es de la sesión login, ni el caso de pendientes dentro de un demo (no existen ahí).
- Quedan en la base los dos espacios de prueba `t-qa77-…` (con sus propuestas canceladas) y las sesiones anónimas que se usaron, con datos ficticios.
