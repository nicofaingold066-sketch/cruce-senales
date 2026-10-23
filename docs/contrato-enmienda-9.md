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
