# Enmienda 4 al contrato: el agente del círculo (BORRADOR)

Estado: **borrador de agente-ia, sin aprobar.** Lo aprueba el coordinador y lo implementa solo el backend. Prevalece sobre `docs/contrato.md` y las enmiendas 2 y 3 donde haya conflicto. Agrega tablas y operaciones, no cambia ninguna existente, así que el campo `contrato` sigue en 2.

Fuente del diseño: `docs/agente-ia.md` (secciones 4, 5, 7.1 y 8).

## Resumen
- 2 tablas privadas nuevas y 1 tabla de catálogo ficticio.
- 3 operaciones públicas nuevas para `authenticated`: `save_my_preferences`, `get_my_preferences` y `proponer_plan_borrador`. La lista permitida de A5 pasa de 26 a 29.
- 1 operación de insumos, `agente_insumos`, concedida **solo a `service_role`**. No entra en la lista de `authenticated` y la prueba de catálogo tiene que verificar que `anon` y `authenticated` no la ejecutan. Ver la nota del punto 6: agente-ia propone poder omitirla.
- Ninguna operación nueva escribe una propuesta ni cambia `state_rev`. El agente nunca crea, confirma ni repara nada: el borrador se usa después con el `create_proposal` de siempre.

## 1. Tablas (esquema `cruce`, RLS activado y sin políticas para `anon` ni `authenticated`)

### 1.1 `cruce.preferencias` (privada, una fila por miembro y espacio)
| columna | tipo | notas |
|---|---|---|
| `miembro_id` | uuid PK, FK a `cruce.miembros` ON DELETE CASCADE | |
| `espacio_id` | uuid, FK a `cruce.espacios` ON DELETE CASCADE | redundante, para bloquear por espacio |
| `presupuesto` | text | `da_igual` · `algo_barato` · `ojala_gratis` |
| `energia` | text | `con_todo` · `algo_tranquilo` |
| `ambiente` | text | `fiesta` · `tranquilo` · `da_igual` |
| `lugar` | text | `da_igual` · `bajo_techo` |
| `me_gustaria` | text[] | actividades del catálogo, de 1 a 6, sin repetidas |
| `actualizadas_en` | timestamptz | |

Todos los campos son obligatorios, con `check` sobre los valores. No hay texto libre.

Las preferencias son **por espacio, no por propuesta**: el agente las usa antes de que exista una propuesta. `reset_demo` **no** las borra. Si un miembro se va o se elimina el espacio, caen en cascada.

### 1.2 `cruce.catalogo_agente` (solo lectura, ficticio, sembrado por migración)
| columna | tipo | notas |
|---|---|---|
| `id` | text PK | `lugar-sim-01` … |
| `orden` | int | desempate final |
| `actividad` | text | `asado` · `padel` · `futbol` · `parque` · `fiesta` |
| `actividad_etiqueta` | text | "Asado", "Pádel", … |
| `lugar_nombre` | text | siempre termina en " (Simulación)" |
| `precio` | text | `gratis` < `barato` < `medio` |
| `techado` | boolean | |
| `energia` | text | `con_todo` · `algo_tranquilo` |
| `ambiente` | text | `fiesta` · `tranquilo` |
| `titulo_plantilla` | text | p. ej. "Asado en casa de Tomi" |
| `sab_inicio`, `sab_fin`, `dom_inicio`, `dom_fin` | time | hora local de Santiago; `null` si no abre ese día |

Semilla, exactamente la de `docs/agente-ia.md` 7.1, más los dos campos que el puntaje necesita:

| id | actividad | lugar_nombre | precio | techado | energia | ambiente | sáb | dom | titulo_plantilla |
|---|---|---|---|---|---|---|---|---|---|
| lugar-sim-01 | asado | Quincho de Tomi (Simulación) | barato | sí | algo_tranquilo | tranquilo | 14:00-17:00 | 14:00-17:00 | Asado en casa de Tomi |
| lugar-sim-02 | padel | Club de pádel (Simulación) | medio | sí | con_todo | tranquilo | 10:00-12:00 | 10:00-12:00 | Pádel el fin de semana |
| lugar-sim-03 | futbol | Cancha de barrio (Simulación) | barato | no | con_todo | fiesta | 11:00-13:00 | 11:00-13:00 | Fútbol en la cancha |
| lugar-sim-04 | parque | Parque de la comuna (Simulación) | gratis | no | algo_tranquilo | tranquilo | 12:00-15:00 | 12:00-15:00 | Picnic en el parque |
| evento-sim-01 | fiesta | Fiesta de un bar (Simulación) | medio | sí | con_todo | fiesta | 23:00-03:00 | — | Fiesta del sábado |

`evento-sim-01` no tiene domingo, así que nunca puede producir dos franjas y siempre queda descartado. Es a propósito: muestra que el catálogo puede tener cosas que no sirven.

### 1.3 Semilla de preferencias de la demo
`seed_demo_space` y `reset_demo` cargan las preferencias de `docs/agente-ia.md` 7.1 **solo para los miembros que siguen `simulado = true`** entre Mati, Caro, Fede y Sofi. Si ya existen, se sobrescriben. Tomi y Luna cargan las suyas desde la app, en vivo: así se muestra la privacidad.

Relación con A2: el asiento de Luna **no** recibe semilla. Si en algún reclamo un asiento simulado ya tiene preferencias, A2 lo trata igual que si tuviera condiciones (`asiento_en_uso`). Así nadie hereda preferencias que no cargó.

## 2. `save_my_preferences(p_espacio_id uuid, p_preferencias jsonb)` (pública, `authenticated`)
- **Quién:** cualquier miembro real del espacio, sobre sus propias preferencias. Actor = `auth.uid()`.
- **Entrada:** `p_preferencias = { "presupuesto", "energia", "ambiente", "lugar", "me_gustaria": [..] }`, todos obligatorios. Si falta un campo o un valor no está en la lista: `entrada_incompleta / preferencias_invalidas`.
- **Efectos:** inserta o reemplaza la fila. Es naturalmente idempotente, sin `p_intento_id`. No toca propuestas ni `state_rev`. No registra eventos con contenido.
- **Respuesta:** `{ ok, contrato, servidor_ahora, resultado: { repetido: boolean }, preferencias: <igual a la entrada>, actualizadas_en: Momento }`.
- **Errores:** `sesion_invalida`, `entrada_incompleta` (`formato_invalido`, `preferencias_invalidas`), `fuera_de_audiencia / no_miembro`, `fallo_temporal`.
- **Bloqueos (A4):** espacio, después miembro.

Mensaje nuevo para la tabla 0.5: `entrada_incompleta / preferencias_invalidas` → "Las preferencias solo admiten las opciones de la lista." (reintentable: false).

## 3. `get_my_preferences(p_espacio_id uuid)` (pública, `authenticated`)
- **Quién:** cualquier miembro real del espacio. Devuelve solo las propias.
- **Respuesta:** `{ ok, contrato, servidor_ahora, preferencias: {...} | null, actualizadas_en: Momento | null, opciones: { actividades: [{ clave, etiqueta }] }, personas_con_preferencias: integer }`.
  - `opciones.actividades` sale del catálogo, para que la interfaz no invente la lista.
  - `personas_con_preferencias` es solo un conteo del espacio, sin nombres.
- **Errores:** `sesion_invalida`, `fuera_de_audiencia / no_miembro`, `fallo_temporal`.

## 4. `proponer_plan_borrador(p_espacio_id uuid, p_sabado date, p_clima jsonb)` (pública, `authenticated`)
Calcula el plan con reglas fijas (`docs/agente-ia.md` sección 5), **sin IA**. No escribe nada.

- **Quién:** el organizador del espacio. Si no lo es: `no_autorizado / no_es_organizador_espacio`.
- **Entrada:**
  - `p_sabado`: un sábado. Tiene que ser posterior a hoy en Santiago y estar a 16 días o menos, que es el horizonte del pronóstico. Si no: `entrada_incompleta / fecha_invalida`. El domingo es `p_sabado + 1`.
  - `p_clima`: `{ "sabado": "seco"|"lluvia"|"desconocido", "domingo": "seco"|"lluvia"|"desconocido" }`. Lo llena la función del servidor con Open-Meteo; si la interfaz llama directo, manda `"desconocido"`. Si el formato es inválido: `entrada_incompleta / formato_invalido`.
- **Universo:** miembros del espacio con preferencias cargadas, reales o simulados. Con menos de 2: `entrada_incompleta / pocas_preferencias`, mensaje "Todavía no hay suficientes personas con preferencias cargadas." (reintentable: false).
- **Regla, en orden:**
  1. **Descarte.** Se descarta una entrada del catálogo si:
     - no abre el sábado o no abre el domingo;
     - su precio supera el presupuesto más restrictivo del universo (`ojala_gratis` admite `gratis`; `algo_barato` admite `gratis` y `barato`; `da_igual` admite todo);
     - no es techada, alguien eligió `bajo_techo` y el clima de cualquiera de los dos días es `lluvia` o `desconocido`.
  2. **Puntaje** de cada entrada que queda:
     - 3 puntos por cada persona que marcó esa actividad en `me_gustaria`;
     - +1 si su `energia` coincide con la energía mayoritaria del universo (en empate, `algo_tranquilo`);
     - +1 si su `ambiente` coincide con el ambiente mayoritario entre quienes no eligieron `da_igual` (en empate o si todos eligieron `da_igual`, no suma);
     - +1 si el clima la favorece: no techada con los dos días `seco`, o techada con algún día `lluvia`.
  3. **Elección:** mayor puntaje. En empate, el precio más bajo. Si sigue el empate, el `orden` del catálogo.
  4. **Sin nada que pase el descarte:** `{ ok: true, resultado: { tipo: "sin_plan_compatible" } }`, sin motivo. Igual que "Sin opción" del motor: no se relaja ninguna regla.
- **Respuesta con plan:**
  ```json
  { "ok": true, "contrato": 2, "servidor_ahora": {...},
    "resultado": {
      "tipo": "borrador",
      "actividad": "asado", "actividad_etiqueta": "Asado",
      "lugar": { "id": "lugar-sim-01", "nombre": "Quincho de Tomi (Simulación)", "simulado": true },
      "titulo": "Asado en casa de Tomi",
      "franjas": [ { "inicio": "2026-10-31T14:00", "fin": "2026-10-31T17:00" },
                   { "inicio": "2026-11-01T14:00", "fin": "2026-11-01T17:00" } ],
      "clima": { "sabado": "seco", "domingo": "seco" },
      "frases_grupo": ["presupuesto_todos", "bajo_techo", "el_mas_elegido"],
      "personas_consideradas": 6 } }
  ```
  - `franjas` tiene el formato exacto de `create_proposal` (HoraLocal). Si un horario cruza la medianoche, `fin` es del día siguiente.
  - **Nunca** incluye nombres, ids de miembros, preferencias individuales, puntajes ni candidatas descartadas.
  - No elige imprescindible, mínimo, máximo ni plazo. Eso lo completa el organizador en `create_proposal`.
- **`frases_grupo`** es una lista cerrada de códigos, siempre afirmativos sobre el plan elegido:
  - `presupuesto_todos`: siempre que haya plan, porque el descarte lo garantiza. Se omite si `personas_consideradas <= 3`.
  - `bajo_techo`: si es techado.
  - `al_aire_libre_con_buen_tiempo`: si no es techado y los dos días están `seco`.
  - `el_mas_elegido`: si su actividad es la que más marcaron, aunque esté empatada con otra.
  - `ritmo_del_grupo`: si sumó por energía y por ambiente. Se omite si `personas_consideradas <= 3`.
- **Errores:** `sesion_invalida`, `entrada_incompleta` (`formato_invalido`, `fecha_invalida`, `pocas_preferencias`), `fuera_de_audiencia / no_miembro`, `no_autorizado / no_es_organizador_espacio`, `fallo_temporal`.
- **Bloqueos:** solo lectura, sin bloqueos. Es volátil por `now()`.

Mensaje nuevo para la tabla 0.5: `entrada_incompleta / fecha_invalida` → "La fecha debe ser un sábado futuro dentro de los próximos 16 días." (reintentable: false).

## 5. Lista permitida (A5)
Pasa de 26 a **29** funciones públicas ejecutables por `authenticated`: las 26 de hoy más `save_my_preferences`, `get_my_preferences` y `proponer_plan_borrador`. Las tres con `SECURITY DEFINER`, `SET search_path = ''`, referencias calificadas, comprobación de `auth.uid()`, de rol y de pertenencia dentro de la función, `REVOKE EXECUTE ... FROM PUBLIC, anon` y `GRANT EXECUTE ... TO authenticated`. Hay que actualizar la prueba de catálogo del backend.

## 6. `agente_insumos(p_user_id uuid, p_espacio_id uuid, p_sabado date, p_clima jsonb)` (solo `service_role`)
- **Qué hace:** igual que `proponer_plan_borrador`, pero recibe el usuario como parámetro, porque la llama la función del servidor con la clave de servicio después de verificar el JWT. Además devuelve `nombres_miembros: [string]`, los nombres visibles del espacio, que no son privados. Sirven solo para que la función rechace una explicación del modelo que nombre a alguien.
- **Privilegios:** `REVOKE EXECUTE ... FROM PUBLIC, anon, authenticated` y `GRANT EXECUTE ... TO service_role`. Vive en el esquema `cruce`, no en `public`, para que no aparezca en la API del navegador. La prueba de catálogo verifica que `anon` y `authenticated` no la ejecutan.
- **Nota de agente-ia:** la función del servidor puede llamar a `proponer_plan_borrador` y a `get_space` **con el JWT del propio usuario**, y en ese caso no necesita clave de servicio ni esta RPC. Es más chico y no reparte privilegios. La función que entrego hoy está escrita así. Si el coordinador prefiere omitir `agente_insumos`, alcanza con no crearla.

## 7. Pruebas mínimas (backend)
1. **Privacidad:** `get_my_preferences` de Luna devuelve solo las suyas. Ninguna respuesta de `proponer_plan_borrador` contiene nombres, ids de miembros ni valores individuales. Una consulta directa a `cruce.preferencias` desde el cliente devuelve 0 filas o error.
2. **Semilla:** con 7.1 cargado (Tomi y Luna vía `save_my_preferences`, el resto por la semilla), con el clima `seco/seco` y con `lluvia/lluvia` sale `asado`, `lugar-sim-01`, franjas sábado y domingo de 14:00 a 17:00.
3. **Presupuesto:** si alguien eligió `ojala_gratis`, nunca sale una entrada `barato` ni `medio`.
4. **Sin plan:** con todo descartado, `tipo = sin_plan_compatible` sin motivo.
5. **Rol:** un no organizador recibe `no_autorizado / no_es_organizador_espacio`.
6. **Pocas preferencias:** con menos de 2, `pocas_preferencias`.
7. **Lista permitida:** 29 funciones para `authenticated`, 0 para `anon`; `agente_insumos`, si existe, solo para `service_role`.
8. **Reinicio:** `reset_demo` conserva las preferencias de Tomi y Luna y vuelve a cargar las semillas de los simulados.

## Postergado
- `simulate_save_preferences`, para que el organizador cambie en vivo las preferencias de un simulado (variantes del jurado). Se suma solo si sobra tiempo.
