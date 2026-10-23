# Enmienda 9 al contrato: entrada por lista de integrantes ("¿Quién eres?")

Aprobada por el coordinador el 23 oct 2026 (pedido de Nico en la sesión Login). `contrato` sigue en 2. Cambio aditivo: ninguna operación existente cambia de significado; se agrega una operación pública (la lista permitida pasa de 30 a 31 para `authenticated`, sigue en 0 para `anon`).

## Por qué
Hoy, para entrar a un espacio hay que escribir el nombre a mano, y reclamar un lugar solo existe en el demo. Al estilo de Tricount: el organizador crea el grupo con los nombres de sus integrantes, comparte el código, y quien abre el enlace elige quién es de una lista.

## Fase 1 (primero; sirve ya con el demo)
### `preview_space_by_code(p_codigo text)` (pública, `authenticated`; no hace falta ser miembro)
- Devuelve SOLO `{ espacio: { nombre, demo }, miembros: [{ miembro_id, nombre, libre }] }`. Ningún otro dato: ni propuestas, ni rol, ni condiciones, ni preferencias, ni ids de sesión.
- `libre = true` para miembros simulados del demo y para miembros pendientes (fase 2) que nadie reclamó; `false` para los demás.
- Errores: `entrada_incompleta/formato_invalido`, `codigo_inexistente` (mismo texto que hoy usa `join_space`). Sin bloqueos.
- **Privacidad aceptada a propósito:** con el código se ven los nombres visibles del grupo (son ficticios, y el código ya es la audiencia). Es una excepción declarada a E7.3; no expone nada privado.

### `join_space(p_codigo text, p_nombre_visible text, p_miembro_id uuid default null)`
- Con `p_miembro_id`: reclama ESE miembro (simulado del demo o pendiente) y la sesión queda ligada a él, conservando `miembro_id`. `p_nombre_visible` se ignora en ese caso (se usa el nombre del miembro).
- Errores nuevos: `no_autorizado/miembro_ya_reclamado` ("Ese lugar ya lo tomó otra persona.") y `entrada_incompleta/miembro_inexistente`. Si quien llama ya es miembro, igual que hoy (`ya_era_miembro`).
- Sin `p_miembro_id`: exactamente como hoy ("No estoy en la lista"). Una sola firma por nombre (A5).
- Bloqueos (A4): espacio, después miembro. Dos reclamos concurrentes del mismo lugar: uno gana, el otro recibe `miembro_ya_reclamado`.

## Fase 2 (si entra en el plazo)
### `create_space(p_nombre, p_tipo, p_nombre_visible, p_integrantes text[] default '{}')`
- Crea además miembros **pendientes**: estado nuevo, distinto de simulado y de real. Sin sesión, sin condiciones, sin preferencias. Tope: 12 nombres, mismas reglas de nombre y de `nombre_en_uso` que `join_space` (también entre ellos y con el organizador).
- **Nunca cuentan**: no son elegibles, no suman interés, aceptaciones, cupos, `personas_con_condiciones` ni quórum; el silencio no es asistencia. `simulate_*` los rechaza (`miembro_no_simulado`); `get_simulation_panel` no los lista. `reset_demo` no los toca (no existen en el demo).
- `get_space` los incluye en `miembros` con `pendiente: true`, para que la interfaz pueda rotularlos "por entrar".
- Al ser reclamados (fase 1, C) pasan a reales con la sesión de quien reclamó.

## Pruebas mínimas (`tests/backend/enmienda9.test.ts`)
1. `preview_space_by_code` sin ser miembro devuelve nombre del espacio y la lista con `libre`, y nada más (comprobar las claves de la respuesta); código inexistente → error.
2. Reclamar un simulado del demo por `p_miembro_id`: la sesión queda como ese miembro (mismo `miembro_id`), el panel de simulación ya no lo lista, `libre` pasa a `false`.
3. Dos sesiones reclaman el mismo lugar a la vez: una gana, otra `miembro_ya_reclamado`.
4. Fase 2: espacio con 3 integrantes pendientes: no aparecen en `elegibles` ni en cupos ni en `personas_con_condiciones`; `simulate_mark_interest` sobre uno → `miembro_no_simulado`; reclamarlo lo vuelve real.
5. Catálogo 31/0, `search_path=''`, `cruce.verificar_privilegios()` sin hallazgos; la suite completa sigue en verde.

## Interfaz (sesión login, `src/login/**`)
- Al abrir `#/unirse/<código>`: "¿Quién eres en «X»?" con los nombres libres como botones; los tomados se ven como "ya entró"; abajo "No estoy en la lista" (campo de nombre, como hoy). Confirmación "Este teléfono queda como Luna". Si el navegador ya tiene sesión en ese espacio, el aviso de #47 de siempre.
- Crear espacio con integrantes (fase 2): solo nombres, sin correos ni teléfonos.
- La ruta `unirse` pasa de `Inicio` a la pantalla de login (una línea en `PantallaRuta`, autorizada a login). Los guiones existentes usan `#/unirse/<código>` + "Tu nombre en el espacio" + "Unirme": ese camino tiene que seguir existiendo con los mismos nombres accesibles ("No estoy en la lista" lo despliega).

## Plazo y salida
Fase 1 aplicada con la suite en verde antes de las **19:00**; fase 2 antes de las **20:00**. Lo que no llegue se descarta sin tocar nada y queda como siguiente paso en el README. Después de las 12:00 del sábado no hay migraciones.

## Implementación (backend)

### Fase 1 (`0032_e9_lista_de_integrantes`, aplicada a las 17:00)
Lista permitida: 31 para `authenticated`, 0 para `anon`; `join_space` tiene una sola firma; `cruce.verificar_privilegios()` sin hallazgos. Pruebas: `tests/backend/enmienda9.test.ts`.

**`preview_space_by_code(p_codigo text)`** (cualquier sesión, sin ser miembro; no inscribe; sin bloqueos):
```json
{ "ok": true, "contrato": 2, "servidor_ahora": {...},
  "espacio": { "nombre": "Los del asado", "demo": true },
  "miembros": [ { "miembro_id": "uuid", "nombre": "Luna", "libre": true }, ... ] }
```
- `miembros` viene en el orden del espacio (el mismo que `get_space`), con TODOS los integrantes, también los que no están libres. Esas tres son las únicas claves de cada uno.
- `libre = true`: simulado del demo sin actividad (reclamable), o integrante pendiente (fase 2) que nadie reclamó. `false` para los reales, para los simulados con actividad (semilla de preferencias incluida: en el demo canónico solo Luna está libre) y para los simulados fuera del demo.
- Errores: código vacío → `entrada_incompleta/formato_invalido`; no existe → `fuera_de_audiencia/codigo_inexistente` ("El código de invitación no existe."). El código se normaliza igual que en `join_space` (mayúsculas, sin espacios).

**`join_space(p_codigo, p_nombre_visible, p_miembro_id uuid default null)`**: `resultado` siempre trae seis claves:
```json
{ "espacio_id": "uuid", "miembro_id": "uuid", "reclamo_asiento_simulado": false, "reclamo_pendiente": false,
  "ya_era_miembro": false, "repetido": false }
```
- Con `p_miembro_id`: la sesión queda como ese integrante, con el mismo `miembro_id` y SU nombre (`p_nombre_visible` se ignora, pero igual hay que mandar algo; sirve `""`). `reclamo_asiento_simulado: true` si era un simulado del demo, `reclamo_pendiente: true` si era un pendiente.
- Errores con `p_miembro_id`: no existe o es de otro espacio → `entrada_incompleta/miembro_inexistente` ("Ese integrante no existe en este espacio."); es una persona real, o un simulado fuera del demo → `no_autorizado/miembro_ya_reclamado` ("Ese lugar ya lo tomó otra persona."); simulado del demo con actividad → `asiento_en_uso/asiento_en_uso` (igual que por nombre). Dos reclamos a la vez del mismo lugar: uno gana, el otro recibe `miembro_ya_reclamado`.
- Si la sesión ya era miembro del espacio, responde `ya_era_miembro: true` con su `miembro_id` de siempre, aunque mande otro `p_miembro_id` (la sesión no cambia de persona).
- Sin `p_miembro_id`: idéntico a antes ("No estoy en la lista"), salvo la clave nueva `reclamo_pendiente: false`. Escribir el nombre de un pendiente por ese camino da `nombre_en_uso`, como cualquier nombre tomado: para entrar como un pendiente se usa `p_miembro_id`.

### Fase 2 (`0033_e9_integrantes_pendientes` y `0034_e9_pendiente_sin_sesion`, aplicadas a las 17:06 y 17:07)
0034 es una corrección de 0033: la restricción de `cruce.miembros` de 0001 exigía sesión a todo miembro no simulado y rechazaba a los pendientes (`create_space` con integrantes devolvía `fallo_temporal`). Ahora hay tres estados disjuntos: real (con sesión), simulado y pendiente (ambos sin sesión). Catálogo 31/0, `create_space` con una sola firma.

**`create_space(p_nombre, p_tipo, p_nombre_visible, p_integrantes text[] default '{}')`**: `resultado` siempre trae cuatro claves:
```json
{ "espacio_id": "uuid", "codigo_invitacion": "ABCDEFGH", "miembro_id": "uuid",
  "pendientes": [ { "miembro_id": "uuid", "nombre": "Ana" }, ... ] }
```
- `pendientes` va en el orden recibido, con los nombres ya normalizados (espacios colapsados, NFC); `[]` sin el parámetro o con la lista vacía. `null` cuenta como lista vacía.
- Errores, antes de crear nada: más de 12 nombres → `entrada_incompleta/formato_invalido`; un nombre vacío → `campo_faltante`; más de 30 caracteres → `formato_invalido`; repetido entre ellos (sin mayúsculas) o igual al del organizador → `nombre_en_uso`.

**`get_space` y toda respuesta con `espacio`**: cada miembro suma `pendiente` (booleano). Un pendiente viene como `{ miembro_id, nombre, rol: "miembro", simulado: false, pendiente: true, es_yo: false }`.

**Qué hacen los pendientes**: nada. No tienen sesión, condiciones ni preferencias, así que no aparecen en `elegibles`, `interesados`, `aceptaron`, `cupos` (ni en `pendientes` de cupos) ni en `personas_con_condiciones`; el quórum no los espera. `get_simulation_panel` no los lista. `simulate_*` sobre un pendiente responde `no_autorizado/espacio_no_demo` (E7.3 se evalúa antes; fuera del demo nunca hay simulación) y, si alguna vez hubiera pendientes en un demo, `miembro_no_simulado`. En `preview_space_by_code` salen con `libre: true` hasta que alguien los reclama con `join_space(..., p_miembro_id)`; ahí pasan a reales (`pendiente: false`, `es_yo: true` para quien reclamó) con el mismo `miembro_id` y su nombre, y responden `reclamo_pendiente: true`. Escribir el nombre de un pendiente en "No estoy en la lista" da `nombre_en_uso`.
