# Seguridad de la base: informe final (mejora #81)

Autor: backend. Proyecto Supabase `tjkfdnvzsikncjbskufm` (el único de CRUXE). **Estado final: sábado 24 oct 2026, 02:25 (hora de Santiago), con la última migración aplicada `0056_rediseno_fecha_y_plan` (56 migraciones en total; las de la noche son 0035 a 0056). Repetido por pendientes después de 0051 a 0055: mismas cifras que el corte de las 23:05 (backend).** Las cifras de abajo son las finales; lo medido más temprano está al pie en "Historial del informe". Si después se aplica otra migración, este informe se vuelve a correr y se actualiza la fecha.

## Resumen
| Control | Resultado | Cómo se midió |
|---|---|---|
| Funciones públicas (lista permitida) | **41** en `public`, 41 nombres distintos (una firma por nombre) | catálogo `pg_proc` |
| Ejecutables por `authenticated` | 41 de 41 | `has_function_privilege` |
| Ejecutables por `anon` (sin sesión) | **0** | `has_function_privilege`; y en las pruebas, toda llamada sin sesión da error `42501` |
| `SECURITY DEFINER` con `search_path = ''` | 41 de 41 | `prosecdef` y `proconfig` |
| Funciones internas (`cruce.*`) ejecutables desde el navegador | **0** | `has_function_privilege` para `anon` y `authenticated` |
| Esquema `cruce` usable desde el navegador | **no** | `has_schema_privilege(..., 'USAGE')` |
| Tablas con RLS | **22 de 22** (todas en `cruce`; `public` no tiene tablas) | `relrowsecurity` |
| Políticas RLS | 0 en todas (deny-all: solo se llega a los datos por las 41 funciones) | `pg_policy` |
| `SELECT` de `anon` o `authenticated` en alguna tabla | ninguno | `has_table_privilege` |
| `cruce.verificar_privilegios()` | **sin hallazgos** (no lanza excepción). Corre al final de cada migración del backend: si algo de lo de arriba fallara, la migración entera se revierte | `select cruce.verificar_privilegios()` |
| Suite de pruebas contra la base real | `tests/backend` en serie y sin las pruebas de concurrencia: **106 de 107 y 4 omitidas** a las 02:15–02:18 (19 archivos, con 0051 a 0055 aplicadas; la única falla fue de transporte: `save_my_conditions` sin sesión respondió con código vacío en vez de `42501`, y esa prueba sola da 5/5). Corte anterior (23:05): 93 de 94 | `npx vitest run tests/backend --no-file-parallelism` |

Tablas (22, todas con RLS y sin privilegios del navegador): `aceptaciones`, `bajas`, `catalogo_agente`, `condiciones`, `ejecuciones_agente`, `elegibles`, `errores_internos`, `espacios`, `eventos`, `eventos_espacio`, `franjas`, `intentos`, `invitaciones_agente`, `miembros`, `opciones_agente`, `opiniones`, `participaciones`, `politicas_agente`, `preferencias`, `propuestas`, `tiempos_zona` y `versiones`. Sin políticas (`pg_policy` = 0), sin `SELECT` para `anon` ni `authenticated`, y el esquema `cruce` sin `USAGE` para el navegador.

## Advisors de Supabase (seguridad), 02:20 (final, repetido tras la 0055; idéntico al de las 23:01)
| Aviso | Nivel | Cuántos | Lectura |
|---|---|---|---|
| `rls_enabled_no_policy` (RLS activo sin políticas) | INFO | 22 | **Intencional.** Es el diseño deny-all: ninguna tabla se lee ni se escribe desde el cliente; todo pasa por funciones del servidor que deciden quién ve qué. |
| `authenticated_security_definer_function_executable` | WARN | 41 | **Intencional.** Son exactamente las 41 funciones de la lista permitida del contrato (A5). Cada una valida la sesión (`auth.uid()`), la pertenencia al espacio y el rol antes de leer o escribir, y responde el sobre `{ok, contrato, …}` o un error tipado. Ninguna otra función es ejecutable. |
| `auth_leaked_password_protection` | WARN | 1 | **No aplica.** CRUXE no usa contraseñas: la sesión es anónima (`signInAnonymously`). Si se agregan cuentas con contraseña, hay que activarlo en Auth. |

No hay avisos de nivel ERROR.

## Privacidad en la base
- Condiciones (disponibilidad por franja) y preferencias (presupuesto, energía, ambiente, lugar, gustos, y desde la enmienda 10 zona, movilidad, tiempo máximo y momento del día) solo las devuelve `get_my_conditions` / `get_my_preferences` a la propia persona.
- Lo compartido son agregados con umbrales: `perfil_grupo` sin quien pide, gustos solo con 2 o más personas, nada más que la cantidad con 3 personas o menos (enmiendas 4, 6 y 7); del viaje sale un único número por opción ("queda a menos de N minutos para todos", estimado) y solo con 4 o más personas que lo cargaron (enmienda 10). Nunca zonas, modos, minutos por persona ni quién necesita que lo lleven. Lo comprueban `tests/backend/enmienda10.test.ts` (prueba 4) y `enmienda4.test.ts`/`enmienda7.test.ts`.
- **Enmienda 13** (baja sin nombre, "así no puedo, pero sigo"): una baja es anónima para los demás (`Una persona`, sin `habia_aceptado`, sin estado ni actor en el historial, y las aceptaciones de quien se retiró no salen); `opinar_version` guarda opiniones en `cruce.opiniones` y a la gente le llega solo el total de las de los demás (null con menos de 2, y solo al organizador). Un hallazgo propio se cerró en la 0045 y la revisión independiente encontró cinco más, cerradas en la 0047; la verificación posterior no encontró hallazgos confirmados.
- **Enmienda 14** (propósito del grupo): el propósito y la familia del grupo son públicos para sus miembros y para quien tiene el código (es lo que se ve en "¿Quién eres?"); una actividad fuera de familia se rechaza después de verificar la pertenencia, así que quien no es miembro no descubre el propósito de un grupo ajeno. El aviso de quórum solo usa números públicos (miembros del grupo y mínimo del catálogo). La 0050 cerró el texto que delataba la baja de la persona imprescindible.
- Quien desmarca "que el agente use mis preferencias" (enmienda 8) es indistinguible de quien no guardó.
- Errores: el sobre de error lleva `codigo`, `detalle` y un mensaje fijo; nunca valores de otra persona. Los errores inesperados se guardan en `cruce.errores_internos` (solo función, `sqlstate` y contexto SQL, sin parámetros ni datos de personas) y al cliente le llega `fallo_temporal/reintentar`.
- La tabla de tiempos entre comunas (`cruce.tiempos_zona`) y el catálogo de lugares son datos de contexto ficticios, sin personas, y tampoco se leen desde el cliente.

- **Enmienda 15** (ronda con plazo, dos planes): `ronda {horas, cierra, abierta}` y la `etiqueta` de cada franja son públicas (son la agenda del plan, no dicen nada de nadie). `prefiero` viaja dentro de la disponibilidad pero la disponibilidad que devuelve el servidor sigue siendo `{A, B}`: solo la propia persona lo ve, en `condiciones.prefiero`. `planes_totales` (Sí y preferencias por plan) sale solo al organizador, sin contarlo, y cada número es `null` con menos de 2; en `get_proposal_state` y en `list_proposals` otra persona recibe `null` y ningún JSON contiene `prefiero` ajeno (`tests/backend/enmienda15.test.ts`, prueba 7).
- **0055** (demo): en espacios `demo` los miembros simulados reciben invitaciones del agente; los pendientes y los espacios que no son demo no cambian. La invitación sigue sin ser interés ni asistencia.

## Claves y secretos
- El navegador solo tiene la clave publicable (`VITE_SUPABASE_PUBLISHABLE_KEY`). Las pruebas de backend también usan solo esa clave y sesiones anónimas; nunca `service_role`.
- Las migraciones se aplican desde el conector de Supabase del equipo, no con claves en el repo. `.env` está ignorado por git.

## Errores internos registrados (`cruce.errores_internos`)
El último id es el 21 (19 filas). **Ninguna de las migraciones 0039 a 0055 produjo errores internos.** La única fila nueva desde las 19:35 es la 21 (23:57, antes de las migraciones de pendientes): `seed_demo_space`, `55P03` (lock_timeout de 5 s en `cruce.bloquear_usuario`), con la base cargada por corridas concurrentes; quien llamó recibió `fallo_temporal/reintentar` y repetir resuelve. Las dos anteriores:
- id 20 (19:35): `save_my_preferences`, 23502 (not null). Causa: la validación nueva de la enmienda 10 dejaba pasar un objeto sin claves. Corregido en `0037_e10_validar_sin_claves` y cubierto por pruebas (enmienda 8, prueba 3; enmienda 10, prueba 0).
- id 19 (17:06): `create_space`, 23514 (check) al insertar un integrante pendiente (enmienda 9). Causa: la restricción `miembros_real_con_sesion` no contemplaba a los pendientes. Corregido un minuto después en `0034_e9_pendiente_sin_sesion` y cubierto por `tests/backend/enmienda9.test.ts`.

## Cómo repetir este informe
1. `select cruce.verificar_privilegios();` (no debe lanzar excepción).
2. Advisors de seguridad del proyecto (panel de Supabase o el conector).
3. `npx vitest run tests/backend --no-file-parallelism` con el `.env` local (solo clave publicable).
4. La consulta de catálogo de este informe:

```sql
select
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public') as publicas,
  (select count(distinct proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public') as nombres,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and has_function_privilege('authenticated', p.oid, 'EXECUTE')) as authenticated,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'EXECUTE')) as anon,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef and 'search_path=""' = any (p.proconfig)) as definer_sin_search_path,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'cruce'
    and (has_function_privilege('anon', p.oid, 'EXECUTE') or has_function_privilege('authenticated', p.oid, 'EXECUTE'))) as internas_expuestas,
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public', 'cruce') and c.relkind = 'r' and not c.relrowsecurity) as tablas_sin_rls,
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public', 'cruce') and c.relkind in ('r', 'v', 'm')
      and (has_table_privilege('anon', c.oid, 'SELECT') or has_table_privilege('authenticated', c.oid, 'SELECT'))) as tablas_legibles;
-- Esperado (final): 41, 41, 41, 0, 41, 0, 0, 0.
```

## Límites declarados (finales)
**Enmienda 13**
- Quien miró la propuesta antes de una baja y recuerda quién había confirmado o mostrado interés puede deducir quién se fue; el servidor no lo dice.
- El panel de Simulación (organizador del demo) sigue mostrando el estado de cada simulado, incluido "se retiró": es la herramienta para manejar personas ficticias.
- Con exactamente 1 "así no puedo", el organizador que intenta rearmar recibe éxito en vez de `estado_no_admite` (lo pide el contrato: "al menos un"); eso dice que hay al menos una opinión, sin decir de quién.

**Enmienda 14**
- `confirmados` y `mínimo` siguen en el estado de una propuesta en revisión (son públicos desde la enmienda 7): con el mínimo cumplido, quien compara los números puede deducir que se retiró la persona imprescindible. El texto ya no lo dice (0050); el resto es de la interfaz.
- El servidor acepta `p_proposito = 'fiesta'` (cae en la familia `salida_noche`); la interfaz no lo ofrece y nunca es candidata porque no tiene domingo. Decisión del coordinador: límite documentado, sin migración.
- El quórum solo mira a las personas no pendientes del grupo. Interés no es asistencia: es un mínimo de tamaño, no de confirmaciones.

**Generales**
- `auth_leaked_password_protection` no aplica (sesión anónima). Si se agregan cuentas con contraseña, hay que activarla.
- Las pruebas de concurrencia (ráfagas) no se corrieron esta noche por la regla del equipo (la base es compartida con producción): las cifras de suite de arriba son sin esas pruebas.

## Historial del informe
- 19:51: corte inicial con la 0038 (31 funciones, 17 tablas, 78/78). 19:38: advisors de ese corte (INFO 17, WARN 31).
- 20:39: enmienda 11, agente social (0041): 40 funciones, 21 tablas, suite 84/84.
- 21:00 a 21:48: enmienda 13 (0042 a 0047): 41 funciones (`opinar_version`), 22 tablas (`opiniones`).
- 22:03 a 22:48: enmienda 14 (0048, 0049, 0050): ninguna función nueva ni firma duplicada (se cambiaron dos firmas con un parámetro opcional al final); `verificar_privilegios()` sin hallazgos al final de cada migración.
- 00:27 a 02:14 (pendientes): 0051 (fiesta con domingo, solo datos), 0052 y 0053 (enmienda 15: `create_proposal` suma dos parámetros opcionales al final, una sola firma; sin RPC nuevas), 0054 (demo "Los del finde", solo nombre) y 0055 (simulados de la demo reciben invitaciones). Catálogo, RLS, advisors y `verificar_privilegios()` iguales al corte de las 23:05. Cada una con su reversa en `supabase/revertir/`.
- 03:18 (pendientes): 0056 (rediseño: `fecha_local` en `list_proposals` y `list_my_spaces`; `organizador` y `plan {titulo, fecha_local}` en `preview_space_by_code`; solo lectura, sin datos privados ni conteos). 41/0, 0 internas expuestas, `verificar_privilegios()` sin hallazgos; suite en serie 109/109 (03:17–03:21). Última migración: 0056 (56 en total).
