# Revisión Codex 3 — enmienda 2, migraciones 0008–0011

Fecha: 23 oct 2026. Revisión independiente y estática, sin editar código ni ejecutar RPC/SQL.

## Fuente y límites

Reclamado este archivo en `coordinacion`, commit `82d49cb`, antes de escribirlo. Informe en `/Users/macair/cruse/codex-work`, rama `codex/revisiones`. Se leyeron las migraciones nuevas completas desde `/Users/macair/cruse/cruce-senales/supabase/migrations/`: aún no estaban versionadas en el checkout del revisor. Backend y TABLERO informan que están aplicadas; **no consulté la base para corroborarlo**. No encontré `docs/correcciones-altas-1.md` en esa copia durante esta revisión.

Prevalece `docs/contrato-enmienda-2.md`, incluidas las aclaraciones del coordinador sobre `mi_situacion.motivo_aceptar` y los nuevos errores. Este dictamen complementa las revisiones 1 y 2; no certifica pruebas reales ni el código de interfaz.

Huellas SHA-256 de los archivos revisados (líneas referidas a estas copias):

| Archivo | SHA-256 |
|---|---|
| 0008_enmienda2_esquema.sql | `69e0deb8a1c1c07ad0daf7e5a730420d612c7fe2431f2c6935244e43a1f49cb0` |
| 0009_enmienda2_privilegios.sql | `930016cb635908105130dba35bdebfc2f558296299e1b8a400fb310f412b27ca` |
| 0010_enmienda2_espacios.sql | `5450439fe6d3a76cb9b040b83b9048316f2a227f4746685656be4905ced7bc03` |
| 0011_enmienda2_propuestas.sql | `b73e981435e79e306367322af20e447a6c97e5fdc4789e967c6604728e64f795` |

## Dictamen resumido

«Cubre» significa que encontré la protección en el SQL; no equivale a «corregido y verificado» según la puerta de salida de la enmienda.

| Hallazgo | Cobertura estática | Pendiente |
|---|---|---|
| A1 — reserva del imprescindible | **Cubre** | Regresión real con anfitrión último, doble clic y carreras de cupo. |
| A2 — reclamo de simulados | **Cubre**, con restricción adicional | Regresiones tardías/concurrentes; confirmar la exclusión adicional por retiro. |
| A3 — reset/generación | **Parcialmente en la respuesta; protege los datos** | Replay mezcla generación original con espacio actual; ver observación O1. |
| A4 — orden de bloqueos | **Cubre las rutas nuevas examinadas** | Pruebas concurrentes y plazo cruzado durante espera; no demuestra ausencia universal de deadlocks. |
| A5 — privilegios | **Parcialmente en cumplimiento literal; ACL endurecido** | server_info conserva excepción de sesión en su cuerpo; catálogo aplicado y rol creador por comprobar. |

No encontré en estas rutas una persistencia evidente de los bloqueos principales de A1–A3 del informe anterior. Hay **dos observaciones de contrato**, descritas abajo, sin evidencia de pérdida de datos ni de fuga de condiciones. No se ejecutó ninguna reproducción.

## A1 — Reserva implementada en servidor y vistas

- `0011_enmienda2_propuestas.sql:649–660`: cuenta aceptaciones vigentes; si el actor no es imprescindible, este no aceptó/no se retiró y solo queda su cupo, devuelve `cupo_completo/reservado_imprescindible`. La rama común sigue comprobando el máximo total.
- `0011:664–669`: inserta y confirma solo al alcanzar el mínimo con imprescindible aceptado. Las envolturas reales/simuladas siguen llamando al mismo `cruce.op_accept` de 0005.
- `0008_enmienda2_esquema.sql:366–377,393–403`: calcula reserva, libres y puede.aceptar por actor; motivo en `mi_situacion.motivo_aceptar`, conforme a la aclaración del coordinador.
- `0008:447–474`: publica `reservado_imprescindible` y `libres_para_otros`. `0008:588–597`: el trigger también protege la reserva y el máximo.
- `0011:753–787`: la baja invalida aceptación, registra retiro y lleva a revisión cuando rompe imprescindible/mínimo; después del plazo conserva la excepción v1 de pasar a expirado si se rompe un grupo confirmado. La vista quita reserva por retiro.

**Prueba pendiente:** mínimo=máximo=2, tres elegibles; U acepta, V recibe reservado_imprescindible, T acepta último y confirma. Repetir U/V concurrentes y con el imprescindible simulado. Verificar que el motivo y el estado no contradigan el resultado de la RPC.

## A2 — Reclamo y simulación comparten bloqueo

- `0010_enmienda2_espacios.sql:80–89`: join bloquea espacio y los miembros correspondientes en orden de id, luego relee.
- `0010:100–107`: consulta asiento_usado antes de convertirlo en real; devuelve asiento_en_uso si corresponde.
- `0008:257–262`: asiento_usado comprueba condiciones, elegibilidad y aceptaciones históricas/vigentes. Además rechaza si hubo retiro; es más restrictivo que las tres condiciones enumeradas en la enmienda, no una vía para heredar compromisos.
- `0011:362–369,595–614,712–719`: condiciones, aceptación y retiro simulado adquieren espacio y miembro/propuesta antes de revalidar simulación. Interés simulado también (`0011:294–301`). El helper común bloquea miembros por id (`0008:200–213`).
- `0008:563–566`: historial agrega origen desde actor_tipo persistido. No se transforma un acto simulado en real al reclamar.

**Pruebas pendientes:** asiento sin actividad reclamable; condiciones guardadas aunque sean pendientes impiden reclamo; aceptación histórica impide reclamo; join contra simulate_save_conditions y simulate_accept devuelve uno de los dos resultados permitidos por enmienda, nunca un real con aceptación heredada. Con una versión publicada, el asiento elegible ya está usado: no esperar que join gane solo porque accept aún no haya ocurrido.

**Decisión menor a confirmar:** asiento retirado sin condiciones/elegibilidad/aceptaciones también responde asiento_en_uso (`0008:262`). Reproducción: seed → propuesta abierta → simulate_withdraw sobre un simulado sin condiciones → join con su nombre. El rechazo evita heredar la baja definitiva, pero conviene incorporarlo expresamente al contrato.

## A3 — Tombstones y deduplicación protegen las propuestas nuevas

- `0008:6–7,20–35`: generación, metadatos del intento y FK SET NULL; conserva la PK usuario/intento y agrega índice único miembro/operación/intento.
- `0010:241–244`: elimina firma reset_demo(uuid) y crea la de dos parámetros.
- `0010:263–284`: reset bloquea espacio → intento → miembro → propuestas ordenadas. `0010:286–300`: conserva los intentos de creación, borra las propuestas y aumenta generación; guarda intento de reset separado, con propuesta_id null.
- `0008:283–294`: replay de reset no borra; creación con propuesta eliminada/generación vieja devuelve intento_obsoleto. `0011:121–142`: busca replay antes de validar futuro contra reloj; arregla también el problema de reintentar una creación ya vencida.
- `0008:104–120` y `0010:140–148`: las respuestas de espacios incluyen generación. `0008:86–100`: contrato=2 en éxitos y errores.

**Regresiones pendientes:** crear P/X, reset/R, crear Q/Y, repetir R: Q permanece; repetir X: intento_obsoleto, sin propuesta nueva. Repetir reset concurrente con el mismo id incrementa generación una sola vez.

### O1 — Media: el replay de reset no devuelve una respuesta enteramente original

**Dónde:** `0008:283–288`. resultado y generacion salen del intento original, pero espacio se reconstruye con espacio_json actual; servidor_ahora también es nuevo. La enmienda A3 pide «respuesta original».

**Reproducción propuesta:** seed con generación 1; reset R1 deja 2; otro reset R2 deja 3; repetir R1. La respuesta contiene generacion=2 y resultado.generacion=2, pero espacio.generacion=3. No borra propuestas ni retrocede el dato persistido; el problema es que el cliente no tiene un único valor de generación en esa respuesta.

**Propuesta al coordinador/backend:** elegir entre guardar y devolver el snapshot original completo, o documentar que se repite solo el resultado de la operación y se devuelve espacio actual, distinguiendo `generacion_del_reinicio` de la generación vigente. Alinear la UI para que un replay viejo no reemplace su generación actual con la original.

## A4 — Orden común y reloj posterior al bloqueo

- `0008:172–215`: helpers usuario, espacio, miembros ordenados, propuesta y reloj real después de bloquear. fijar_ahora usa clock_timestamp (`0008:38–45`).
- `0010:38–44,166–177`: create_space/seed usan mismo advisory de usuario. Índice `0008:16` garantiza un demo por usuario además de la serialización; seed repetido encuentra ese demo.
- `0011:121–136`: create bloquea espacio, intento y miembro; luego valida reloj. `0011:517–532,595–626,827–842`: evaluate, accept y repair respetan espacio → intento → actor/propuesta. open, interés, condiciones, retiro y cancelación usan el mismo protocolo sin nivel de intento cuando no aplica.
- `0010:282–284` y `0011:235–237`: reset/listado recorren propuestas por id. `0008:143–159`: vencer primero comprueba, luego bloquea, fija reloj y revalida. Las lecturas pueden bloquear propuesta sin espacio/miembro conforme a la excepción explícita de la enmienda; no declaro eso una inversión indebida por sí solo.
- `0008:274–280`: advisory del intento protege la deduplicación. La PK v1 más estricta se conserva deliberadamente (`0008:33–35`); usar advisory más inserción única en vez de ON CONFLICT no demuestra una carrera por sí mismo.

**Pruebas pendientes:** seed/seed; join/simulación; reset/create; create/create mismo intento; último cupo; versión vieja; retener bloqueo del espacio/propuesta antes del cierre y liberarlo después, dentro del timeout: la aceptación debe usar el reloj posterior y rechazar plazo vencido. También comprobar replay de intento exitoso después del plazo: recupera resultado sin repetir efecto.

**Límite del reset/create:** si es la primera vez que una creación llega al servidor después de reset, no hay tombstone para ese intento. Puede ejecutarse en la generación nueva. La API no recibe generación esperada y la enmienda no promete rechazar ese caso; no confundirlo con la recreación de un intento que ya se había ejecutado.

## A5 — ACL corregido; falta comprobación del catálogo real

- `0009_enmienda2_privilegios.sql:7–9`: restringe defaults del rol postgres globalmente y en public/cruce. Comprobar que sea efectivamente el rol creador de todas las migraciones siguientes.
- `0009:87–101`: revoca de PUBLIC, anon y authenticated en cada función public y concede solo authenticated a los 25 nombres permitidos. Esto corrige el grant a anon de 0006.
- `0009:28–76`: verificar_privilegios rechaza funciones fuera de lista, ausencias/sobrecargas, EXECUTE de anon, ausencia de EXECUTE de authenticated, definer/search_path incorrectos y helpers accesibles. Se ejecuta al finalizar 0009, 0010 y 0011.
- CREATE OR REPLACE de funciones existentes conserva sus ACL; para la nueva firma de reset se revoca y concede explícitamente (`0010:311–312`). Helpers nuevos se revocan al final (`0008:603`, `0010:313`, `0011:935`). Las demás envolturas reutilizan los controles privados de actor y membresía; no reciben auth.uid como parámetro del navegador.

La lista es la misma de 25 entradas revisada en revision-codex-2, **incluyendo** server_info. Para todas se espera anon=false y authenticated=true tras aplicar el conjunto. No hay una entrada 26 adicional.

### O2 — Baja: server_info conserva la excepción al chequeo interno de sesión

**Dónde:** `0003_api_espacios.sql:5–10`, función no reemplazada por 0008–0011. Conceder ejecución solo a authenticated bloquea al cliente anon normal, pero el cuerpo no rechaza auth.uid nulo, mientras enmienda A5 exige ese chequeo en cada entrada.

**Reproducción propuesta:** en conexión SQL administrativa de prueba, SET LOCAL ROLE authenticated con claims de usuario vacíos; llamar public.server_info(). El cuerpo devuelve ok y autenticada=false. Esto no prueba acceso de un cliente anon remoto ni expone condiciones privadas. Es diferencia literal con la enmienda, de impacto bajo.

**Propuesta:** añadir el guard o documentar explícitamente la excepción diagnóstica de server_info. No relajar el ACL de anon para resolverlo.

**Pendiente de evidencia real A5:** ejecutar consultas de catálogo de revision-codex-2; probar cada RPC sin JWT (denegación de permiso), con sesión ajena (sin acceso a otro espacio/propuesta) y probar helpers privados inaccesibles. La presencia de SELECT verificar_privilegios en un archivo no demuestra que se haya ejecutado en el proyecto ni que coincida con su estado actual.

## Entrega y dependencias

La revisión estática encuentra las protecciones centrales de A1–A5 incorporadas, con O1/O2 y la aclaración de retiro pendientes del coordinador. Ningún hallazgo se marca cerrado por pruebas: todavía falta evidencia real registrada y un commit estable del backend con estas huellas. No se modificaron migraciones, UI, tests ni contratos.
