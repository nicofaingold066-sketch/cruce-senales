# Seguridad de la base: informe final (mejora #81)

Autor: backend. Proyecto Supabase `tjkfdnvzsikncjbskufm` (el único de CRUXE). Corte: viernes 23 oct 2026, 19:51 (hora de Santiago), con la última migración aplicada `0038_e10_catalogo_ampliado`. Si después se aplica otra migración, este informe se vuelve a correr y se actualiza la fecha.

## Resumen
| Control | Resultado | Cómo se midió |
|---|---|---|
| Funciones públicas (lista permitida) | **31** en `public`, 31 nombres distintos (una firma por nombre) | catálogo `pg_proc` |
| Ejecutables por `authenticated` | 31 de 31 | `has_function_privilege` |
| Ejecutables por `anon` (sin sesión) | **0** | `has_function_privilege`; y en las pruebas, toda llamada sin sesión da error `42501` |
| `SECURITY DEFINER` con `search_path = ''` | 31 de 31 | `prosecdef` y `proconfig` |
| Funciones internas (`cruce.*`) ejecutables desde el navegador | **0** | `has_function_privilege` para `anon` y `authenticated` |
| Esquema `cruce` usable desde el navegador | **no** | `has_schema_privilege(..., 'USAGE')` |
| Tablas con RLS | **17 de 17** (todas en `cruce`; `public` no tiene tablas) | `relrowsecurity` |
| Políticas RLS | 0 en todas (deny-all: solo se llega a los datos por las 31 funciones) | `pg_policy` |
| `SELECT` de `anon` o `authenticated` en alguna tabla | ninguno | `has_table_privilege` |
| `cruce.verificar_privilegios()` | **sin hallazgos** (no lanza excepción). Corre al final de cada migración del backend: si algo de lo de arriba fallara, la migración entera se revierte | `select cruce.verificar_privilegios()` |
| Suite de pruebas contra la base real | `tests/backend` **75/75** (12 archivos, 19:45:07 a 19:49:15) | `npx vitest run tests/backend --no-file-parallelism` |

Tablas (todas con RLS y sin privilegios del navegador): `aceptaciones`, `bajas`, `catalogo_agente`, `condiciones`, `elegibles`, `errores_internos`, `espacios`, `eventos`, `eventos_espacio`, `franjas`, `intentos`, `miembros`, `participaciones`, `preferencias`, `propuestas`, `tiempos_zona` (nueva, enmienda 10) y `versiones`.

## Advisors de Supabase (seguridad), 19:38
| Aviso | Nivel | Cuántos | Lectura |
|---|---|---|---|
| `rls_enabled_no_policy` (RLS activo sin políticas) | INFO | 17 | **Intencional.** Es el diseño deny-all: ninguna tabla se lee ni se escribe desde el cliente; todo pasa por funciones del servidor que deciden quién ve qué. |
| `authenticated_security_definer_function_executable` | WARN | 31 | **Intencional.** Son exactamente las 31 funciones de la lista permitida del contrato (A5). Cada una valida la sesión (`auth.uid()`), la pertenencia al espacio y el rol antes de leer o escribir, y responde el sobre `{ok, contrato, …}` o un error tipado. Ninguna otra función es ejecutable. |
| `auth_leaked_password_protection` | WARN | 1 | **No aplica.** CRUXE no usa contraseñas: la sesión es anónima (`signInAnonymously`). Si se agregan cuentas con contraseña, hay que activarlo en Auth. |

No hay avisos de nivel ERROR.

## Privacidad en la base
- Condiciones (disponibilidad por franja) y preferencias (presupuesto, energía, ambiente, lugar, gustos, y desde la enmienda 10 zona, movilidad, tiempo máximo y momento del día) solo las devuelve `get_my_conditions` / `get_my_preferences` a la propia persona.
- Lo compartido son agregados con umbrales: `perfil_grupo` sin quien pide, gustos solo con 2 o más personas, nada más que la cantidad con 3 personas o menos (enmiendas 4, 6 y 7); del viaje sale un único número por opción ("queda a menos de N minutos para todos", estimado) y solo con 4 o más personas que lo cargaron (enmienda 10). Nunca zonas, modos, minutos por persona ni quién necesita que lo lleven. Lo comprueban `tests/backend/enmienda10.test.ts` (prueba 4) y `enmienda4.test.ts`/`enmienda7.test.ts`.
- Quien desmarca "que el agente use mis preferencias" (enmienda 8) es indistinguible de quien no guardó.
- Errores: el sobre de error lleva `codigo`, `detalle` y un mensaje fijo; nunca valores de otra persona. Los errores inesperados se guardan en `cruce.errores_internos` (solo función, `sqlstate` y contexto SQL, sin parámetros ni datos de personas) y al cliente le llega `fallo_temporal/reintentar`.
- La tabla de tiempos entre comunas (`cruce.tiempos_zona`) y el catálogo de lugares son datos de contexto ficticios, sin personas, y tampoco se leen desde el cliente.

## Claves y secretos
- El navegador solo tiene la clave publicable (`VITE_SUPABASE_PUBLISHABLE_KEY`). Las pruebas de backend también usan solo esa clave y sesiones anónimas; nunca `service_role`.
- Las migraciones se aplican desde el conector de Supabase del equipo, no con claves en el repo. `.env` está ignorado por git.

## Errores internos registrados (`cruce.errores_internos`)
20 filas en total desde el inicio. Las dos últimas:
- id 20 (19:35): `save_my_preferences`, 23502 (not null). Causa: la validación nueva de la enmienda 10 dejaba pasar un objeto sin claves. Corregido en `0037_e10_validar_sin_claves` y cubierto por pruebas (enmienda 8, prueba 3; enmienda 10, prueba 0).
- id 19 (17:06): `create_space`, 23514 (check) al insertar un integrante pendiente (enmienda 9). Pendiente de revisar: un nombre de integrante que viola una restricción debería volver como error de validación y no como `fallo_temporal`. Anotado en las ideas del backend.

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
-- Esperado: 31, 31, 31, 0, 31, 0, 0, 0.
```
