# Agente social Codex — sesión nueva de Juan

Sesión: `01a16a31-3df5-7220-92d7-d0c8545c403b`. Actualización: 2026-10-23 19:44 UTC.
Encargo: integración social sobre CRUXE existente; Empresa fuera. Todo dato de producto usado es ficticio.

## Tocando ahora
- CORRIENDO PRUEBA: adapter E8 con demo propio desde /tmp; solo RPC existentes y clave pública; cero modelos. Se quitará la marca al terminar.
- Solo esta ficha: `agentes/agente-social-codex.md`.
- No reclamo ni edito rutas de backend, agente-ia, interfaz o QA de otra sesión.
- Preparación y pruebas propias fuera del repo, en `/tmp` (ver entregables).

## Autorización y remoto verificados
Juan autorizó publicar ÚNICAMENTE esta ficha en `coordinacion`. `origin` de este checkout es `https://github.com/nicofaingold066-sketch/cruce-senales.git`, el repo de CRUXE. Sin código, force push, merge de implementación, deploy, claves nuevas ni cambios de seguridad. La autorización NO cubre push de implementación.

## Reparto vigente: no crear una tercera implementación
| Pieza | Dueño actual | Estado observado y rutas |
| --- | --- | --- |
| #62, E8 opt-out | backend | `supabase/migrations/0031`, `tests/backend/enmienda8.test.ts`, implementación en `docs/contrato-enmienda-8.md`; escrito sin aplicar según ficha 16:36; aplicación después de 16:55 y suite verde antes de 20:00 |
| #63, casilla | agente-ia | `src/agente/**`; espera 0031 |
| #64, Gateway | agente-ia | `supabase/functions/agente/**`, `docs/agente-ia.md`; reclamado activamente desde 16:31. No tocar ni aplicar mi parche temporal encima |
| Contratos, configuración e integración | coordinador | `docs/contrato*.md`, package/configuración, mapa de rutas y despliegue |
| QA #53/#17 | sesión `01a16a09-3f3c-7cd1-9937-d4dd4dc5a2b8` | Es QA; no asumir que es dueño del backend. Contactada para aclarar canal y contrato mínimo |

Fuentes: `PROPIEDAD.md`, `TABLERO.md`, `MEJORAS.md`, `agentes/backend.md`, `agentes/pitch-problema.md` de `origin/coordinacion`; E8 leída en `origin/wip/fundamentos:docs/contrato-enmienda-8.md`. El tablero refiere #65 de una sesión llamada Integración agente social CRUCE con corridas 22/24 y 23/24; NO las atribuyo a esta sesión: mi evidencia separada es 7/7 con 56 RPC.

## Contratos existentes
`contrato` continúa en 2; E8 no agrega RPC ni cambia firmas.

| Operación real | Entrada | Salida mínima / límite |
| --- | --- | --- |
| `get_my_preferences` | `p_espacio_id` | Preferencias propias o null. E8 devuelve `usar_en_agente` a nivel raíz; el objeto preferencias no cambia. Adapter ajustado a la entrega real |
| `save_my_preferences` | `p_espacio_id`, `p_preferencias` con opciones cerradas y flag booleano opcional | Persistencia propia; por defecto true. Adapter exige flag explícito y su eco persistido; si no se demuestra, outcome incierto, sin segundo guardado omitiendo el flag |
| `proponer_plan_borrador` | `p_espacio_id`, `p_sabado`, `p_clima` con sábado/domingo seco/lluvia/desconocido | Solo organizador; candidatas y agregados filtrados o sin_plan_compatible. E8 excluye opt-out de descartes, puntajes, totales y umbrales |
| Circuito humano existente | `create_proposal`, `open_proposal`, `save_my_conditions`, `evaluate_and_publish`, `accept_version`, `withdraw_commitment`, `propose_repair` | Backend decide identidad, cupos, plazo, elegibilidad e idempotencia. Cada versión necesita aceptaciones nuevas; el agente no acepta por nadie |

Errores existentes relevantes: `sesion_invalida`, `fuera_de_audiencia/no_miembro`, `no_autorizado/no_es_organizador_espacio`, `entrada_incompleta/preferencias_invalidas`, `entrada_incompleta/pocas_preferencias`, `opcion_desactualizada/version_no_vigente`, `cupo_completo`, `fallo_temporal`. Nunca reflejar datos privados ni textos inesperados de errores.

## Brecha respecto del encargo de Juan
- E8 es OPT-OUT: las filas existentes quedan true. NO equivale a opt-in explícito para recibir invitaciones ni a aprobación de publicaciones autónomas.
- El agente actual calcula borradores con preferencias; no descubre personas por disponibilidad autorizada. La disponibilidad se carga después y por propuesta.
- Localidad del clima: Santiago fija. No existe contexto/localidad del espacio configurable para este fin.
- Las propuestas humanas visibles a miembros existen. No hay contrato de invitaciones dirigidas ni publicación del agente con política/aprobación persistida.
- Aceptación humana, cupos, baja y reparación por versión existen y fueron probados. No deben reimplementarse ni recibir accept_version como herramienta del modelo.
- No hay contrato ni dueño de tarea asignado para runs/recibos persistentes, unicidad por oportunidad, política de autonomía o aprobación de borrador por hash. Que backend sea dueño de rutas no significa que esas tareas estén asignadas.

## Pedidos al coordinador/backend (sin cambios por cuenta propia)
1. Confirmar quién implementará la brecha anterior, dentro o fuera de esta demo, y los nombres definitivos/entradas/salidas/errores de cada operación nueva. No inventaré endpoints operativos.
2. Contexto mínimo permitido: JWT + espacio, política y opt-ins revocables; salida con localidad y oportunidades opacas, nunca condiciones individuales al modelo.
3. Corrida: actor/intento UUID + hash de parámetros; recibo consultable y unicidad por oportunidad para dos intentos distintos. Concurrencia devuelve recibo o pendiente, no dos efectos. No guardar prompts privados.
4. Borrador: opción validada por servidor + run_id; draft_id/hash de contenido y versión. El modelo solo elige/explica opciones autorizadas.
5. Publicación: revalidar política/opt-ins y aprobación persistida del hash exacto. Transacción única de propuesta + audiencia/invitaciones + recibo. Retry/fallback recupera misma propuesta.
6. Reparación: reusar motor actual, versión esperada e intento; excluir retirados/opt-out, sin heredar aceptación. Solo las personas aceptan su nueva versión.
7. Errores nuevos solo tras acuerdo, reusando códigos actuales cuando corresponda. Nunca explicar la restricción u opt-out de otra persona.

## Pieza no conflictiva propuesta para esta sesión
Verificación independiente del consentimiento e integración, sin migraciones ni otro runner de modelos. Adapter temporal solo sobre RPC existentes; capacidades aún sin contrato fallan antes de red. Propongo asumir adapter y pruebas de integración en rutas disjuntas que asigne el coordinador; hasta esa asignación quedan fuera del repo. No modificaré #62/#63/#64 ni la QA ajena.

## Entregables y resultados ciertos
- `/tmp/cruxe-social-vertical-20261023.mjs` y `.log`: exit 0, 7 comprobaciones, 56 RPC reales antes de cleanup, 30 perfiles ficticios en cinco círculos, seis sesiones autenticadas, cero modelos. Borrador real → creación humana idempotente → propuesta visible en Luna → v1/A confirmada → baja → v2/B con cero heredadas → nuevas aceptaciones. Cuatro accesos ajenos rechazados. Propuesta propia cancelada y sesiones cerradas; quedan demos ficticios. Clima desconocido enviado por RPC, no caída real de Open-Meteo. No prueba autonomía o invitaciones dirigidas.
- `/tmp/cruxe-social-contract-adapter-20261023.ts` y `.test.mjs`: typecheck estricto pasó; 11/11 mocks. Detecta backend legacy, exige flag explícito, no reintenta quitando opt-out, conserva resultados inciertos y rechaza publicación/recibo sin contrato. NO prueba E8 aplicada.
- `/tmp/cruxe-social-e8-contract-live-20261023.mjs`: runner real preparado, sintaxis válida y guardia por defecto comprobada con cero red/DB. NO ejecutado en modo real: espera confirmación de 0031 y ventana acordada. Comparará opt-out con no guardar, usará control positivo true, probará revocación, rol, acceso ajeno e idempotencia. No modifica esquema.
- `/tmp/cruxe-agente-gateway-20261023.patch`: solo referencia, NO aplicado ni canónico; #64 está activo por su dueño. 13/13 mocks y apply --check pasaron, pero no Deno/SDK real, inferencia o failover real del proveedor. No usarlo para duplicar #64.
- `/tmp/cruxe-social-entrega-20261023.txt`: manifiesto del corte anterior. Lógica actual 17/17 y cuatro archivos existentes contra DB 22/22; typecheck/build del proyecto pasaron antes de la reconexión. Sin script lint configurado. No son pruebas de nueva autonomía.

## Entregado / próxima dependencia
Objetivo: PARCIAL. Esta ficha publica diagnóstico, reparto y pedidos, no código. No hay commit de implementación propio ni despliegue. Próximo: respuesta del coordinador sobre tareas faltantes/rutas disjuntas y entrega de E8 antes de correr su adapter contra la base. No se imprimieron secretos ni se crearon credenciales; pruebas con clave pública y sesiones ficticias.

## Verificación independiente de la entrega #64 (19:51 UTC)
- #64 ya entregada por agente-ia: `fd89382`; no se aplica mi parche temporal. Código leído directamente de ese commit sin modificarlo.
- Extracción propia en `/tmp/cruxe-verificacion-fd89382/`: 34/34 pruebas de lógica y typecheck estricto de logica.ts/logica.test.ts. Handler real extraído del mismo commit: 8/8 con SDK, DB y clima simulados. Cero red/modelos/DB en esta verificación. Logs `pruebas.log` y `handler.log`.
- Se comprobó: prioridad Gateway, respaldo a API directa sin clave Gateway según contrato del coordinador, regla sin claves, payload sin nombres/claves, candidato cerrado, descarte de ID ajeno, log sin contenido del proveedor, clima desconocido, acceso ajeno y ausencia de sesión; segundo clic no crea una segunda inferencia en la misma instancia. Solo RPC get_space/proponer_plan_borrador, ninguna escritura.
- Brecha de configuración respecto del encargo de Juan: el principal por defecto es `anthropic/claude-haiku-5.5`, no `anthropic/claude-opus-5.5`; se verificó que AGENTE_MODELO acepta Opus. No hay providerOptions.gateway.models ni otra cadena de respaldo `openai/gpt-6-astra`: un error del modelo va a texto fijo. Esto es una diferencia de alcance/configuración, no una comparación medida de calidad; no hubo benchmark ni inferencia real.
- Pedido a coordinador/agente-ia: resolver explícitamente la configuración provisional Opus 5.5 → Astra solicitada por Juan, manteniendo validación y efectos fuera del modelo. No cambiaré su código o secretos. Las limitaciones de 8 s y 1500 tokens necesitan prueba con la configuración elegida antes de prometer elección/redacción real.
- Backend adelantó 0031: la marca MIGRACION EN CURSO fue observada desde 16:46. Runner real E8 sigue SIN ejecutar hasta final confirmado y ventana. No asumir el horario anterior 16:55.
- Publicación anterior de esta ficha verificada: `d01a15879403e1fcae0f8c3515a811de1058e510`, un solo archivo; remoto y SHA256 del contenido coincidieron. Autorización sigue limitada a esta ficha, no implementación.

## E8 entregada y verificación en curso (19:54 UTC)
Backend confirmó 0031 aplicada y base libre (ficha 16:51); docs/contrato-enmienda-8.md aclara flag a nivel raíz en get/save, y dentro de p_preferencias solo en la entrada de save. Adapter corregido ANTES de usar la base: typecheck y 12/12 mocks pasan. Inicio runner /tmp/cruxe-social-e8-contract-live-20261023.mjs --run-after-e8, con comprobación de marcas de backend/agente-ia/codex antes de auth. No se llama a la función con IA ni se usa ninguna clave de modelo.
