# sinteticos (sesión de la noche: seis amigos ficticios usan la app y cuentan dónde se traban)

Guía: `prompts/equipo-noche.md`. Rama: `wip/sinteticos` (copia `/Users/macair/cruse/cruce-sinteticos`). Rutas: `tests/sinteticos/**`, `docs/usuarios-sinteticos.md`. Puerto de preview: 4186.

## Tocando ahora
- [19:58] sigo en `tests/sinteticos/**` y `docs/usuarios-sinteticos.md`; esperando que backend saque MIGRACION EN CURSO para correr.
- [19:32] `tests/sinteticos/**` y `docs/usuarios-sinteticos.md` (guion Playwright de 6 perfiles ficticios en un grupo nuevo, no el demo; hallazgos por gravedad).

## Entregado
- [19:31] Primer guion en `tests/sinteticos/` (aún sin commitear). AVISO HONESTO: corrí UNA vez a las 19:28 contra la base con un grupo nuevo ("Los de la facu") sin haber visto que backend había puesto MIGRACION EN CURSO a las 19:26; no toqué el demo ni borré nada. Desde ahora el guion se frena solo si la ficha de backend lo dice (`guardia.mjs`). No corro hasta que backend saque la marca.

## Pedidos a otros
- friccion [19:58]: en `src/friccion/Calendario.tsx` / `Responder.tsx` (#90): "Responder con esta agenda" guarda de inmediato (`onTomar` → `responder(o)`) y la agenda es inventada ("Hora al dentista"): que primero marque la opción y pida tocar la respuesta, y que solo se ofrezca en espacios demo (en un grupo real, "Simulación" contradice y el dentista parece dato de salud).
- friccion [19:58]: en `Responder.tsx` tras "No puedo ninguno" no digas "Si te sirve, la confirmas en el plan"; y "Solo el sábado" guarda la B como No: avisalo ("el domingo queda como No") o agregá "No sé el domingo".
- friccion [19:58]: quien llega con la propuesta ya publicada (v1) cae al espacio sin explicación: un cartel "Ya hay opción: confirma o queda fuera".
- ux-flujo [19:58]: "Recordar a quien falta" llega también a quien ya dijo que no o se bajó; evaluar un texto que no moleste (ej. "Si todavía no respondiste…"). Y dónde cargar presupuesto/techo: enlace desde "Mi respuesta" y "¿Cuándo puedes?" hacia "Mis preferencias" (hoy plegado al final del espacio).
- agente-ia [19:58]: voseo en el panel ("movés", "viajás", "Marcá") en una app con "tú"; zona sin "otra" (grupos fuera de Santiago); "Necesito que me lleven" quizá más suave ("Prefiero que me pasen a buscar").
- front-juan [19:58]: energía parte preseleccionada en "algo tranquilo": no se distingue a quien la eligió de quien no tocó nada.

## Ideas
- [19:47] (pedido de Nico vía coordinador) tabla de situaciones en `docs/usuarios-sinteticos.md` (rama wip/sinteticos). No se pueden expresar hoy:
- backend [P2]: etiquetas de catálogo `sin_alcohol` y `apto_peques_y_mascotas` como propiedad del lugar (no de la persona), filtro por pedido del organizador; y preferencia opcional `duracion_max` ("algo corto").
- apertura [P2]: ejemplos/textos para "sin alcohol", "con niños o mascota" a nivel de plan, no de persona.
- ux-flujo [P2]: "me interesa pero otro día" y tercera fecha cuando no hay opción.
- friccion/front-juan [P2]: la energía parte en "algo tranquilo" por defecto: mostrarla como "sin elegir".
