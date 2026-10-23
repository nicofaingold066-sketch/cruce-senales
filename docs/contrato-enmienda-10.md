# Enmienda 10 al contrato: zona, movilidad, tiempo de viaje y momento del día (y catálogo más amplio)

Aprobada por Nico el 23 oct 2026 a las 19:11 (en la sesión del coordinador). `contrato` sigue en 2. Cambio aditivo: **sin RPC nuevas ni cambio de firmas** (lista permitida 31 para `authenticated`, 0 para `anon`). **Corte duro: migración aplicada y suite backend en verde antes de las 23:00 del viernes 23.** Lo que no llegue se descarta sin tocar nada y queda como siguiente paso en el README. Detalle de diseño: `docs/agente-barrido.md` §1.1.

## Por qué
El agente hoy elige con gustos, presupuesto y clima. No sabe si el plan le queda lejos a alguien ni si alguien no tiene cómo llegar. La regla nueva: **nadie viaja demasiado y nadie queda sin forma de llegar**, sin que nadie sepa quién vive dónde ni quién no tiene auto.

## Parte A (primero): cuatro preferencias nuevas, privadas y opcionales
Claves nuevas y opcionales dentro de `p_preferencias` de `save_my_preferences` (entran en la lista cerrada de claves). Si una falta, esa persona no aporta esa variable (no filtra ni suma por ella). `get_my_preferences` las devuelve dentro de `preferencias`, solo a la propia persona.

| Clave | Valores |
|---|---|
| `zona` | `providencia`, `nunoa`, `las_condes`, `santiago_centro`, `maipu`, `la_florida`, `puente_alto`, `vitacura` (comunas de Santiago, nunca dirección ni coordenadas) |
| `movilidad` | `auto_con_lugar` (tiene auto y puede llevar gente), `auto_sin_lugar`, `transporte_publico`, `bici_o_pie`, `me_llevan` (necesita que lo lleven) |
| `tiempo_max` | `15`, `30`, `45`, `60` (minutos; 60 = "60 o más") |
| `momento` | `manana` (antes de las 13), `tarde` (13 a 19), `noche` (después de las 19), `da_igual` |

Otro tipo o valor fuera de la lista: `entrada_incompleta/preferencias_invalidas`, como hoy.

### Datos de contexto (privados del servidor, sin personas)
- Cada entrada de `cruce.catalogo_agente` tiene `zona` (una de las 8).
- Tabla `cruce.tiempos_zona (origen, destino, modo, minutos)` con modos `auto`, `transporte_publico`, `bici_o_pie`. Valores **estimados y ficticios** (orden de magnitud razonable para Santiago), sin API externa. Mismo origen y destino: 10 minutos en cualquier modo.

### Cómo decide `proponer_plan_borrador` (reglas fijas, solo filas con `usar_en_agente`)
1. **Minutos de cada persona** con `zona` y `movilidad` hacia la zona de cada candidata: `auto_*` → modo `auto`; `transporte_publico` → `transporte_publico`; `bici_o_pie` → `bici_o_pie`; `me_llevan` → `auto` si las personas con `auto_con_lugar` suman al menos `ceil(N_me_llevan / 3)` (cada auto con lugar lleva hasta 3), si no → `transporte_publico`.
2. **Descarta** la candidata si a alguien con `tiempo_max` sus minutos lo superan (`60` no descarta nunca). Si todas quedan descartadas por viaje, responde `sin_plan_compatible` con `motivo: "sin_lugar_cerca_para_todos"` (sin decir para quién; ver Aclaraciones).
3. **Equidad**: entre las que quedan, a igualdad del puntaje actual gana la de **menor viaje máximo**, y después la de menor suma. Además resta 1 punto por cada 15 minutos de viaje máximo por encima de 30.
4. **Momento del día** (no descarta): suma 2 puntos por cada persona cuyo `momento` coincide con el inicio de la franja de la candidata (`da_igual` no suma).
5. Personas sin `zona` o sin `movilidad` no entran en el cálculo de viaje (no se les inventa nada).

### Qué sale y qué no
- El borrador suma `viaje`: `{ "max_minutos": 35, "estimado": true }` **solo si al menos 4 personas** aportaron zona y movilidad; si no, `viaje: null`. Nunca minutos por persona, zonas, modos, ni quién necesita que lo lleven, en ninguna respuesta compartida ni de error.
- `perfil_grupo` **no** suma totales de zona, movilidad ni momento (en un grupo chico delatan).
- La función `agente` puede pasar al modelo **solo** `viaje.max_minutos`. Nada de zonas, modos ni "alguien necesita que lo lleven".
- `simulate_save_preferences` y las semillas del demo: los simulados del demo reciben zona, movilidad, tiempo y momento ficticios para que el demo muestre "queda a menos de N minutos para todos". `reset_demo` los repone. Luna (reclamable) sigue sin semillas.

### Aclaraciones de forma (coordinador, a pedido de agente-ia, antes de migrar)
- **`tiempo_max` va como texto** (`"15"`, `"30"`, `"45"`, `"60"`), igual que las demás claves de lista cerrada. Un número (`15`) da `preferencias_invalidas`.
- **`viaje` va en cada candidata**: `candidatas[i].viaje = { "max_minutos": n, "estimado": true }` o `null`, con la misma regla de 4 personas. El `viaje` de arriba del borrador es igual al de la primera candidata. La interfaz muestra el de la candidata elegida; la función `agente` pasa al modelo solo el `max_minutos` de cada opción.
- **Sin candidatas por viaje**: `resultado = { "tipo": "sin_plan_compatible", "motivo": "sin_lugar_cerca_para_todos" }`. Si no quedan candidatas por otra razón, `resultado` sigue siendo `{ "tipo": "sin_plan_compatible" }` sin `motivo` (como hoy).

## Parte B (si entra antes de las 23:00): catálogo más amplio
Para no quedar atados al asado: se amplía `catalogo_agente.actividad` y la lista cerrada de `me_gustaria` con, como mínimo: `cena` (restaurante), `bar`, `juegos_casa` (juegos de mesa o cocinar en casa), `cine`, `cultura` (museo, feria, charla), `juegos_salida` (bowling o escape room), `cerro` (trekking urbano), `cafe` (once o brunch). Una entrada ficticia por actividad, con `lugar_nombre` terminado en `(Simulación)`, zona, precio, techado, energía, ambiente y horarios (que haya de mañana, tarde y noche). Mismas reglas de privacidad y de "gustos solo con 2 o más". Migración aparte de la Parte A, para poder descartarla sola.

## Pruebas mínimas (`tests/backend/enmienda10.test.ts`)
1. Una persona con `tiempo_max: 15` lejos de una candidata la descarta; con `60` no.
2. `me_llevan` sin autos con lugar usa transporte público y puede descartar; con un `auto_con_lugar` usa auto.
3. Equidad: con dos candidatas de igual puntaje gana la de menor viaje máximo.
4. `viaje` es `null` con 3 personas con zona y aparece con 4; ninguna respuesta compartida trae zona, modo ni minutos por persona (buscar las claves y los valores en el JSON).
5. `momento` suma pero no descarta.
6. Opt-out (`usar_en_agente: false`): sus datos de viaje y momento no cuentan.
7. Catálogo 31/0, `search_path=''`, `cruce.verificar_privilegios()` sin hallazgos, suite completa en verde.
8. (Parte B) las actividades nuevas se pueden marcar en `me_gustaria` y aparecen como candidatas.

## Interfaz (agente-ia, solo `src/agente/`; función `agente` si hace falta)
- En "Mis preferencias": las cuatro preguntas con opciones cerradas, todas opcionales, con el texto "Solo lo usa el servidor para elegir un lugar que te quede a mano. Nadie del grupo ve tu zona ni cómo te movés."
- En la tarjeta del borrador: "Queda a menos de N minutos para todos (estimado)" cuando `viaje` no es null.
- Parte B: los chips de "Me gustaría" con las actividades nuevas.
- Plazo de la interfaz: 23:45, contra la base ya migrada.

## Orden y avisos
Backend anuncia "MIGRACION EN CURSO" en `agentes/backend.md` antes de aplicar y lo saca al terminar; nadie corre suites contra la base mientras tanto. Después de las 12:00 del sábado no hay migraciones.
