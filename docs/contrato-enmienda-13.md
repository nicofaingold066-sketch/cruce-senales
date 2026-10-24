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
