# Enmienda 13 al contrato: opinar sin bajarse, rearmar con lo nuevo, baja sin nombre y asado en lugar neutro

Aprobada por Nico el 23 oct 2026 a las 20:51 (en la sesión del coordinador: "acepto lo recomendado"). `contrato` sigue en 2. Diseño de partida: `docs/output-debate.md` §2.2, §2.3 y §3.2 (ux-flujo) y `docs/psicologia-grupo.md` (psico). **Corte: aplicada y con la suite en verde antes de la 01:00 del sábado 24.** Lo que no llegue se descarta sin tocar nada. Ninguna migración después de las 12:00.

## (a) Opinar sobre la versión sin bajarse (E-a)
- RPC nueva `opinar_version(p_propuesta_id uuid, p_version int, p_opinion text, p_intento_id uuid)` con `p_opinion` en `asi_no_puedo` / `retirar_opinion`. (`prefiero_otro` queda para cuando existan dos planes, E-d, después de la demo.) Lista permitida 40 → 41 para `authenticated`, 0 para `anon`.
- Solo un miembro elegible de ESA versión vigente, mientras la propuesta está en `esperando_compromisos`. Versión no vigente → `opcion_desactualizada/version_no_vigente`. Idempotente por `p_intento_id`.
- Con `asi_no_puedo` la persona **no se retira** y no cuenta como baja. Vuelve a poder actualizar su disponibilidad: `mi_situacion.puede.guardar_condiciones = true`. Si ya había aceptado ESA versión, la opinión se rechaza (`no_autorizado/ya_acepto`): primero se retira, como hoy.
- `get_proposal_state` suma `mi_situacion.mi_opinion` (`null` o `asi_no_puedo`) y, SOLO para el organizador, `opiniones_totales = { asi_no_puedo: n }` con `null` cuando es menor que 2. Nunca nombres. Mismas reglas de ocultamiento que E7.

## (b) Rearmar con lo nuevo (E-b)
- `propose_repair` se acepta también desde `esperando_compromisos` cuando la versión vigente NO llegó al mínimo con el imprescindible y hay al menos un `asi_no_puedo` en esa versión.
- La versión N+1 nace con cero aceptaciones y cero opiniones (no hereda nada), usa la disponibilidad actual y no reincorpora a quien se retiró. Si no hay franja viable: `sin_alternativa` sin bajar el mínimo, como hoy.
- Tope: 3 versiones por propuesta. La cuarta → `sin_alternativa/tope_versiones`. El organizador cierra o cancela.
- `siguiente_accion` del organizador en ese caso: código existente `buscar_opcion` con texto "Algunos no pueden así: puedes rearmar con lo nuevo." (solo si `opiniones_totales.asi_no_puedo` no es null; si es null, el texto genérico de siempre).

## (c) Baja sin nombre (H14)
- En toda respuesta compartida (eventos, historial, `siguiente_accion` de otros), la baja se muestra como "Una persona se retiró" sin nombre ni motivo, y sin decir si había confirmado. Quien se retira ve su propio estado como hoy. El organizador ve el total de bajas, no quién.
- Texto para quien se retira (sugerido por psico): "Gracias por avisar. No hace falta contar por qué."

## (d) Asado en lugar neutro (D1)
- Fila nueva de catálogo `lugar-sim-14` exactamente como en `docs/catalogo-ampliado.md` (apertura): "Parrilla del parque (Simulación)", `asado`, `providencia`, barato, techado, algo_tranquilo, tranquilo, 14:00–17:00. Solo datos; sin columna `tipo_lugar` (queda para después).

## Fuera (decidido por Nico, 20:51)
E-c (ronda con plazo), E-d (dos planes con etiqueta y regla "la que más Sí"), D4 (casa privada) y H6 (`personas_que_pueden`): después de la demo. D2 (género y pareja no se piden ni se infieren; la composición es una regla del grupo) y D3 (modalidad en el título) son reglas de producto y textos, sin migración.

## Pruebas mínimas (`tests/backend/enmienda13.test.ts`)
1. `asi_no_puedo` deja actualizar la disponibilidad y no cuenta como baja; aceptar después funciona.
2. Totales al organizador: `null` con 1, `2` con 2; nadie más los ve; ningún nombre en ninguna respuesta compartida.
3. `propose_repair` desde `esperando_compromisos` con la condición → versión N+1 con cero aceptaciones y opiniones; sin la condición → rechazo; cuarta versión → `tope_versiones`.
4. Baja: ninguna respuesta compartida trae el nombre de quien se retiró.
5. `lugar-sim-14` aparece como candidata cuando corresponde.
6. Idempotencia de `opinar_version` por intento; catálogo 41/0; `search_path=''`; `verificar_privilegios()` sin hallazgos; suite completa en verde; recorrido canónico y jurado e2e en verde (el texto de la baja puede cambiar rótulos: avisar a qa-noche antes).

## Interfaz
- front-juan (pantallas): botón "Así no puedo, pero sigo" junto a confirmar en Mi respuesta, el texto de la baja y el "Rearmar con lo nuevo" del organizador. friccion y ux-flujo pueden dejarlo armado como componente nuevo para que Juan lo conecte.

## Implementación (backend, viernes 23 oct, 21:25)
- **Aplicada** en `tjkfdnvzsikncjbskufm`: `0042_e13_opinar_version` (21:00:45), `0043_e13_rearmar_y_bajas` (21:01:21), `0044_e13_parrilla_del_parque` (21:01:24) la corrección `0045_e13_aceptaciones_de_quien_se_retiro` (21:15:51) y `0046_e13_texto_condiciones_congeladas` (21:29: el mensaje de `no_autorizado/condiciones_congeladas` pasa a "Estás en la versión vigente. Si esta fecha no te sirve, marca «Así no puedo, pero sigo» y podrás cambiar cuándo puedes.", pedido de psico, lote 7). Commits en `wip/backend`: `4022f62` (migraciones, pruebas, cliente) y `85c2ab5` (textos de error del cliente, pedido de psico).
- **Catálogo**: 41 funciones en `public`, 41 nombres, 41 ejecutables por `authenticated`, 0 por `anon`, todas `SECURITY DEFINER` con `search_path=''`; `cruce.verificar_privilegios()` sin hallazgos (corre al final de cada migración). Tabla nueva `cruce.opiniones` con RLS deny-all.
- **Pruebas** (base real, datos ficticios): `tests/backend/enmienda13.test.ts` 5/5 (21:21:40). Archivos tocados por la enmienda, en serie: 48/48 (enmienda4, 5, 7, 10, 11, 13 y aceptacion-reparacion). Pruebas viejas adaptadas al cambio pedido: `aceptacion-reparacion` y `enmienda7` (las bajas de otros llegan sin nombre y sin `habia_aceptado`), `enmienda4`, `enmienda5` y `enmienda10` (la parrilla del parque es candidata del asado y, en el demo, le gana al quincho por viaje). Pendiente: una suite completa en serie y sin concurrencia, que no se corre mientras Nico prueba producción (regla P1 de las 21:16).

### Formas finales
- `opinar_version(p_propuesta_id, p_version, p_opinion, p_intento_id)` → `{resultado: {opinion: "asi_no_puedo" | null, repetido}, propuesta}`. Errores: `entrada_incompleta/opinion_invalida` (otra opinión), `opcion_desactualizada/version_no_vigente`, `opcion_desactualizada/estado_no_admite` (otro estado), `fuera_de_audiencia/no_elegible_en_version`, `no_autorizado/ya_acepto`, `no_autorizado/retirado`, `plazo_vencido/plazo_vencido`, `entrada_incompleta/intento_reutilizado`. Sin evento ni `state_rev` (como las condiciones: es privada).
- `mi_situacion.mi_opinion`: `null` o `"asi_no_puedo"` (deja de valer si la persona acepta esa versión o se retira). `mi_situacion.puede.opinar` (aditivo): elegible de la versión vigente, en `esperando_compromisos`, sin aceptar, sin retirarse y sin vencer. Quien opinó tiene `puede.guardar_condiciones = true` y `save_my_conditions` se lo permite; la versión vigente no cambia (los elegibles quedan fijos al publicar).
- `opiniones_totales` en la raíz del estado: para el organizador de la propuesta `{asi_no_puedo: n}` con `n` null si es menor que 2; para los demás, `null`.
- `propose_repair` desde `esperando_compromisos`: con al menos un "así no puedo" que vale; sin ninguno, `opcion_desactualizada/estado_no_admite`. Tope: con la versión 3 vigente, `sin_alternativa/tope_versiones` (también desde `en_revision`). Sin franja viable, `sin_alternativa/sin_alternativa` y la versión vigente sigue. La versión nueva usa el motor de siempre: cero aceptaciones, cero opiniones, disponibilidad actual y sin quienes se retiraron.
- `puede.proponer_reparacion` en `esperando_compromisos`: true solo con **2 o más** opiniones que valen y versión menor que 3 (el servidor acepta con 1, como dice el contrato, pero el booleano no se prende con 1 para no delatar a una sola persona; acordado con ux-flujo, que lo usa tal cual).
- `siguiente_accion` del organizador en `esperando_compromisos` con `opiniones_totales.asi_no_puedo` no null y versión menor que 3: `buscar_opcion` "Algunos no pueden así: puedes rearmar con lo nuevo." (después de `te_toca_aceptar`, antes de `ya_aceptaste`).
- Baja sin nombre: para cualquier persona que no sea quien se retiró, `bajas[]` trae `miembro = {miembro_id: null, nombre: "Una persona", simulado: false}` y `habia_aceptado: null` (se mantienen `en` y `version`); en `historial[]`, los eventos `baja` y (0045) los eventos `aceptacion` de quien después se retiró llevan ese mismo `actor`. La propia persona ve todo con su nombre. Quien se retiró recibe `siguiente_accion.texto` "Gracias por avisar. No hace falta contar por qué." (mismo código).
- `lugar-sim-14` "Parrilla del parque (Simulación)" en el catálogo, exactamente como la fila de apertura.

### Decisiones de backend que el contrato no fijaba (a confirmar por el coordinador)
1. `puede.opinar` (aditivo), para que la interfaz no calcule cuándo se puede opinar.
2. Umbral de 2 en `puede.proponer_reparacion` (ver arriba).
3. 0045: también las aceptaciones de quien se retiró salen sin nombre; si no, "Caro aceptó la versión 1" junto con "Una persona se bajó (versión 1)" decía quién se fue y que había confirmado.
4. El tope de 3 versiones también aplica desde `en_revision` ("3 versiones por propuesta").

### Límites que quedan (declarados)
- Quien miró la propuesta antes de una baja y recuerda quién había confirmado o mostrado interés puede deducir quién se fue; el servidor no lo dice.
- El panel de Simulación (organizador del demo) sigue mostrando el estado de cada simulado, incluido "se retiró": es la herramienta para manejar personas ficticias.
- Con exactamente 1 "así no puedo", el organizador que intenta rearmar recibe éxito en vez de `estado_no_admite` (lo pide el contrato: "al menos un"); eso le dice que hay al menos una opinión, sin decir de quién.
