# Revisión Codex 2 — migraciones 0001–0006 frente a enmienda 2

Fecha: 23 de octubre de 2026. Revisor: Codex, Operador 1.
Base local: commit `b943948`. Lectura de AGENTS.md, contexto-proyecto.md, contrato.md y contrato-enmienda-2.md; esta última prevalece. Referencias a líneas de los archivos locales leídos, no a objetos inspeccionados en producción.

**Alcance:** análisis estático de las seis migraciones solicitadas. Existe `0007_advisors.sql`, fuera de este dictamen; no se atribuye al conjunto 0001–0006 ninguna corrección posterior. No ejecuté SQL, RPC, pruebas, instalaciones, cambios de rama ni commits. Solo creé este informe. Las reproducciones de abajo son procedimientos propuestos, no resultados observados contra Supabase.

## Dictamen por hallazgo

| Hallazgo | Cobertura de la enmienda en 0001–0006 | Motivo principal |
|---|---|---|
| A1 — cupo del imprescindible | **No** | La aceptación compara únicamente confirmados contra máximo; no reserva un cupo. |
| A2 — reclamo de simulados | **Parcialmente** | Hay comprobación de organizador/simulado e historial con actor_tipo, pero se permite reclamar asientos usados y no se comparte el bloqueo exigido. |
| A3 — reinicio/generación | **No** | Reset conserva firma de un parámetro, no hay generación y los intentos se borran por cascada. |
| A4 — atomicidad | **Parcialmente** | Se serializan seed, intentos y propuestas por separado; falta el orden global y el reloj posterior al bloqueo. |
| A5 — permisos de RPC | **Parcialmente** | Helpers privados y search_path vacío, pero las 25 entradas reciben EXECUTE para anon; faltan defaults restrictivos en public. |

**Ninguno queda cubierto por completo.** Esto describe el SQL local solicitado; no prueba qué migraciones están aplicadas ni sustituye las regresiones reales exigidas al final de la enmienda.

## A1 — No: sigue siendo posible dejar sin cupo al imprescindible

**Evidencia:**

- `supabase/migrations/0005_api_motor.sql:150–158`: cuenta aceptaciones vigentes y solo rechaza si `v_conf >= p.maximo`. Inserta sin distinguir anfitrión/invitado. Afecta a `accept_version` y `simulate_accept`, que comparten `cruce.op_accept` (líneas 181–198).
- `0005_api_motor.sql:160–164`: la presencia del imprescindible se comprueba después de consumir el cupo, únicamente para decidir el estado.
- `0002_utilidades.sql:326–327`: `puede.aceptar` solo comprueba capacidad total. `0002_utilidades.sql:393–398`: cupos no incluye `reservado_imprescindible` ni `libres_para_otros`.
- `0002_utilidades.sql:568–572`: el trigger refuerza el máximo total, pero tampoco la reserva. `0004_api_propuestas.sql:121–122` sí valida mínimo/máximo >= 2, lo cual no resuelve A1.

**Reproducción propuesta (determinista, sin concurrencia):** crear espacio de prueba, anfitrión T y dos invitados U/V; mínimo=máximo=2; condiciones completas compatibles para los tres; abrir y publicar v1. Aceptar como U y luego V con intentos nuevos; ambos pueden obtener ok. T acepta último y recibe `cupo_completo/sin_cupo`; la propuesta permanece esperando compromisos. Según la enmienda, V debería recibir `cupo_completo/reservado_imprescindible` y T debería confirmar.

**Corrección pendiente:** aplicar reserva dentro de op_accept antes de insertar; sincronizar trigger, cupos, puede y mensajes con la enmienda. No alcanza con deshabilitar un botón en UI.

## A2 — Parcialmente: el reclamo usado sigue permitido

**Evidencia:**

- `0003_api_espacios.sql:97`: join bloquea el espacio. `0003_api_espacios.sql:111–117`: lee el miembro sin FOR UPDATE y cambia simulado/user_id sin consultar condiciones, elegibles ni aceptaciones. No devuelve `asiento_en_uso`.
- `0004_api_propuestas.sql:25–38`: chequeo_simulacion exige organizador y destino simulado del mismo espacio, pero no bloquea espacio ni miembro.
- `0004_api_propuestas.sql:393–405` y `0005_api_motor.sql:108–122`: guardar condiciones simuladas y aceptar simulado bloquean propuesta y validan simulación; no comparten el protocolo espacio → miembro de join.
- `0001_esquema.sql:152` y `0002_utilidades.sql:171–174,487–489`: se guarda y devuelve `actor_tipo` histórico. Ese origen no se recalcula al reclamar. Sin embargo, el `actor.simulado` se obtiene del miembro actual mediante miembro_ref (`0002:111–114`), por lo que puede aparecer false junto a actor_tipo=simulacion. La enmienda dice `origen`; el SQL usa el campo anterior actor_tipo: hay que fijar si se conserva ese nombre o se necesita un alias.

**Reproducción propuesta (determinista):** Tomi ejecuta seed; crea/abre propuesta; carga condiciones y aceptación para Luna mediante simulación, tras publicar opción compatible. Una sesión nueva llama join_space con el código y nombre Luna. El SQL concede el asiento conservando su miembro_id; get_my_conditions y get_proposal_state desde Luna muestran las condiciones y aceptación heredadas. Debería rechazarse con asiento_en_uso. Basta guardar condiciones antes del reclamo para demostrar la violación más simple, sin publicar una versión.

**Carrera adicional a verificar:** si simulate_save_conditions o simulate_accept supera chequeo_simulacion antes de que join cambie simulado, puede continuar después sin revalidarlo. Para aislarla en un entorno de prueba, pausar la simulación justo después de ese chequeo, completar join en otra conexión y reanudar. No se ejecutó esta intercalación.

**Corrección pendiente:** bloquear espacio y miembro en ambas rutas y revalidar las tres prohibiciones después del bloqueo; preservar de forma inequívoca la atribución histórica.

## A3 — No: no hay reinicio idempotente ni tombstones

**Evidencia:**

- `0001_esquema.sql:11–20`: espacios no tiene generacion. `0001_esquema.sql:176–185`: intentos tampoco la tiene; propuesta_id usa ON DELETE CASCADE en línea 181.
- `0003_api_espacios.sql:268`: firma reset_demo(uuid), no reset_demo(uuid,uuid). Líneas 295–305: cada llamada elimina propuestas, actualiza ultimo_reinicio y agrega evento. No consulta ni guarda intento de reset.
- `0002_utilidades.sql:117–133` y `0003_api_espacios.sql:147–154`: get_space y list_my_spaces no devuelven generación.
- `0002_utilidades.sql:531–549`: replay depende de que todavía exista el intento/propuesta; no existe intento_obsoleto. Los nuevos errores de enmienda tampoco están en mensaje (`0002:26–55`).

**Reproducciones propuestas:**

1. Crear propuesta P; llamar reset_demo(E); crear Q; repetir reset_demo(E). Q se borra. No hay id con el que identificar la repetición. Una llamada con los dos parámetros nuevos de la enmienda no coincide con la firma SQL existente.
2. Crear P con intento X, guardar sus parámetros; reset_demo(E); repetir exactamente create_proposal con X, antes de vencer las fechas/plazo. El intento anterior desapareció por cascada y se crea otra propuesta. Debería responder intento_obsoleto sin crear nada.

**Corrección pendiente:** nueva migración con generación, firma nueva sin sobrecarga vieja expuesta, idempotencia del reset y FK SET NULL/tombstones; completar campos de respuesta y errores. No modificar retroactivamente migraciones aplicadas.

## A4 — Parcialmente: garantías locales, sin protocolo global

**Qué sí cubre:** seed usa advisory lock por usuario (`0003:194–199`); intento_previo usa advisory lock por usuario/intento (`0002:531–538`); PK de intentos (`0001:184`); escrituras de propuesta pasan por FOR UPDATE (`0002:208–209`); aceptaciones tienen control de cupo y versión (`0005:131–154`). Esto aporta protección al doble clic, versión vieja y máximo total. Dos seeds por la misma ruta se serializan; no afirmo que esa carrera concreta esté abierta.

**Qué no cubre:**

- El orden requerido es usuario → espacio → intento → miembro → propuesta. create_space no toma advisory de usuario (`0003:38–63`). create_proposal toma intento (`0004:149`), consulta membresía y crea (`0004:154–168`) sin FOR UPDATE explícito del espacio. evaluate/accept/repair toman intento antes de propuesta (`0005:26–30,103–108,369–373`), sin los niveles espacio/miembro.
- join/add/reset sí bloquean espacio (`0003:97,245,283`); reset después bloquea propuestas (`0003:296`). Las simulaciones no toman el mismo bloqueo del espacio. Los bloqueos implícitos de claves foráneas no equivalen al protocolo exigido.
- No hay restricción única de demo por usuario entre espacios: los índices `0001:35–37` solo restringen por espacio. El advisory de seed sí protege esa ruta, pero no cumple la restricción estructural de la enmienda.
- La clave de intentos sigue siendo `(user_id,intento_id)` (`0001:184`), no la triple indicada por enmienda A4. Esto también conserva la prohibición v1 de reutilizar un id entre operaciones: debe reconciliarse explícitamente antes de cambiar la clave.
- vencer usa filtro temporal y FOR UPDATE (`0002:185–196`), por lo que tiene protección local, pero toma `now()`; chequeo_estado también (`0004:14`). El instante no se actualiza después de esperar bloqueos. PostgreSQL define now() como inicio de transacción, mientras clock_timestamp() entrega tiempo real: [documentación oficial](https://www.postgresql.org/docs/current/functions-datetime.html#FUNCTIONS-DATETIME-CURRENT).

**Reproducción propuesta de aceptación fuera de plazo por espera:** propuesta lista, un elegible sin aceptar y cierre próximo. Conexión administrativa de prueba mantiene FOR UPDATE de esa propuesta. Iniciar accept_version desde la sesión elegible antes del cierre; liberar el bloqueo después del cierre, dentro de los 5 s de lock_timeout. Como now() queda anterior al cierre tanto en vencer como en chequeo_estado, el SQL puede aceptar tras obtener el bloqueo. Esperado por enmienda: plazo_vencido. Controlar que no se agote el timeout para no confundir el resultado.

**Otra regresión pendiente:** repetir create_proposal exitoso tras vencer su plazo; `0004:115–132` valida fechas antes de recuperar intento (`149`) y devuelve error temporal de entrada, en vez del replay anterior. No requiere carrera.

**Corrección pendiente:** implementar orden global, revalidar tras bloquear y capturar reloj real de decisión de forma coherente. Añadir las cuatro carreras de la enmienda; las protecciones locales no permiten declarar todo A4 corregido.

## A5 — Parcialmente: aislamiento de helpers correcto, permisos públicos contrarios a enmienda

**Cobertura positiva:** las 25 entradas definidas en 0003–0005 usan SECURITY DEFINER y SET search_path=''. Los accesos a tablas/helpers y auth están calificados. Los helpers se crean en cruce, no como entradas públicas. Se revoca EXECUTE y USAGE privado en `0006:7–8`, además de `0001:213–217`, `0002:592`, `0004:544` y `0005:468`. Las entradas salvo server_info comprueban sesión y autorización aplicable, directamente o mediante helpers privados, como detalla la tabla.

**Incumplimiento común a las 25:** `0006_permisos.sql:41` revoca a PUBLIC, pero `:42` concede EXECUTE a **anon y authenticated**. La enmienda exige revocarlo de anon. Los ALTER DEFAULT PRIVILEGES de `0001:215–217` solo afectan cruce, no public; no se endurecen defaults para futuras funciones públicas del rol creador. La lista tampoco elimina grants preexistentes de otras funciones public: no demuestra que el catálogo final contenga solo las entradas permitidas.

### Inventario de cada función pública

En todas las filas, permiso final solicitado por 0006: PUBLIC revocado; anon **sí**; authenticated **sí**. Esto no es una consulta al ACL desplegado. «Def.» indica archivo/línea de definición; «Lista» la línea individual de 0006 a la que se aplica el grant común 41–42.

| Función/firma | Def. | Lista 0006 | Control de sesión y autorización |
|---|---|---:|---|
| server_info() | 0003:5 | 15 | **Excepción:** 0003:10 informa autenticada=false, no rechaza sesión nula. |
| create_space(text,text,text) | 0003:27 | 16 | 0003:39–41; crea espacio propio. |
| join_space(text,text) | 0003:74 | 17 | 0003:86–88,97–125; código de invitación; falla A2. |
| list_my_spaces() | 0003:138 | 18 | 0003:144–154; filtra user_id. |
| get_space(uuid) | 0003:161 | 19 | 0003:167–175; exige membresía. |
| seed_demo_space() | 0003:184 | 20 | 0003:191–199; usuario y demo propio. |
| add_simulated_member(uuid,text) | 0003:225 | 21 | 0003:235–251; miembro organizador. |
| reset_demo(uuid) | 0003:268 | 22 | 0003:277–293; organizador y demo. **Firma v1.** |
| create_proposal(uuid,text,jsonb,integer,integer,uuid,text,text,uuid) | 0004:54 | 23 | 0004:74–76,155–161; miembro e imprescindible del espacio. |
| open_proposal(uuid) | 0004:184 | 24 | 0004:194–206; membresía y organizador de propuesta. |
| list_proposals(uuid) | 0004:228 | 25 | 0004:236–244; membresía. |
| get_proposal_state(uuid) | 0004:259 | 26 | 0004:266–275; membresía mediante abrir_propuesta. |
| mark_interest(uuid,boolean) | 0004:343 | 27 | Delega auth.uid() en 348; helper 295–320 verifica sesión, miembro y retiro. |
| save_my_conditions(uuid,jsonb) | 0004:443 | 28 | Delega en 448; helper 383–417 verifica sesión, miembro y condiciones congeladas. |
| get_my_conditions(uuid) | 0004:468 | 29 | 0004:477–488; membresía y solo condiciones de v_yo. |
| evaluate_and_publish(uuid,uuid) | 0005:4 | 30 | 0005:19–38; sesión, membresía y organizador. |
| accept_version(uuid,integer,uuid) | 0005:181 | 31 | Delega en 186; helper 90–137 verifica sesión, miembro, retiro y elegibilidad. |
| withdraw_commitment(uuid) | 0005:322 | 32 | Delega en 327; helper 224–261 verifica sesión y membresía. |
| propose_repair(uuid,uuid) | 0005:347 | 33 | 0005:362–381; sesión, miembro y organizador. |
| cancel_proposal(uuid) | 0004:502 | 34 | 0004:511–523; sesión, miembro y organizador. |
| simulate_mark_interest(uuid,uuid,boolean) | 0004:355 | 35 | Delega en 360; helper 295–320 y chequeo_simulacion 25–38. |
| simulate_save_conditions(uuid,uuid,jsonb) | 0004:455 | 36 | Delega en 460; helper 383–417 y chequeo_simulacion. |
| simulate_accept(uuid,uuid,integer,uuid) | 0005:193 | 37 | Delega en 198; helper 90–137 y chequeo_simulacion. |
| simulate_withdraw(uuid,uuid) | 0005:334 | 38 | Delega en 339; helper 224–242 y chequeo_simulacion. |
| get_simulation_panel(uuid) | 0005:417 | 39 | 0005:425–437,461; miembro organizador, solo simulados. |

Delegar a un helper privado pasando auth.uid() no equivale a permitir un actor suministrado por el navegador. No encontré un helper público extra definido por estas seis migraciones. La enmienda dice «25 más server_info», pero el contrato enumera **25 incluyendo server_info**: no inventar una vigésima sexta entrada.

**Reproducción propuesta:** con cliente de clave publishable sin signInAnonymously ni JWT de usuario, llamar server_info. El SQL permite ejecutarla y devuelve ok con autenticada=false, cuando A5 exige denegación de ejecución. Otra RPC sin sesión devuelve sesion_invalida desde el cuerpo: eso demuestra que llegó a ejecutarse, no que el ACL la bloqueó. No se afirma que este permiso por sí solo revele condiciones privadas.

**Comprobación de catálogo propuesta (solo lectura, no ejecutada aquí):**

```sql
select n.nspname as esquema, p.oid::regprocedure as firma,
       p.prosecdef, p.proconfig,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'cruce')
order by n.nspname, p.oid::regprocedure::text;

select pg_get_userbyid(d.defaclrole) as creador, n.nspname,
       d.defaclobjtype, d.defaclacl
from pg_default_acl d
left join pg_namespace n on n.oid = d.defaclnamespace
where d.defaclnamespace = 0 or n.nspname in ('public', 'cruce');
```

Revisar también defaults globales y el rol efectivo que creará las próximas funciones: que no aparezca un default local de public no basta para conocer todo el ACL heredado. La consulta enumera funciones de extensiones si existen; distinguirlas de entradas de la aplicación y documentar la política correspondiente.

## Incompatibilidad transversal que bloquea integración v2

`0002_utilidades.sql:61,68` sigue emitiendo contrato=1 en éxitos y errores. La enmienda exige 2 en todos los sobres. Una UI que espere v2 detectará incompatibilidad aun antes de llegar a las correcciones A1–A5. Reproducción: inspeccionar server_info autenticado o provocar cualquier error de negocio y comparar contrato. Actualizar conjuntamente helpers de sobres, errores nuevos, firma de reset y tipos del cliente en una migración nueva.

## Próxima verificación necesaria

Implementar las diferencias en migraciones nuevas, comprobar el catálogo aplicado y ejecutar las regresiones A1–A5 contra el proyecto de prueba con datos ficticios. Registrar resultados observados en correcciones-altas-1.md. Hasta entonces, este informe no certifica correcciones ni despliegue.
