# Enmienda 7 al contrato: menos inferencias sobre condiciones y preferencias

Aprobada por el coordinador el 23 oct 2026, a partir de `docs/agente-revision-privacidad.md` (mejora #42). `contrato` sigue en 2. Cada punto es una migración aparte, en este orden, con el protocolo de siempre ("MIGRACION EN CURSO" en `agentes/backend.md`).

## E7.1 · El orden de las candidatas no delata gustos en grupos chicos (hallazgo 5)
- `proponer_plan_borrador`: la frase `el_mas_elegido` solo se agrega si `perfil_grupo.personas > 3` **y** la actividad la eligieron 2 o más personas.
- Con 3 personas o menos, el orden de las candidatas no usa las marcas de gustos: se ordena como si nadie hubiera marcado actividades (el resto del puntaje y el catálogo quedan igual).
- Prueba: grupo de 2 reales (una marca fiesta, otra parque): ninguna candidata trae `el_mas_elegido` y el orden es el mismo que con gustos vacíos.

## E7.2 · Los conteos de la propuesta solo los ve el organizador (hallazgos 1 y 3)
- En `EstadoPropuesta`, `cupos.pendientes` y `personas_con_condiciones` son `null` para quien no es organizador de la propuesta. El organizador los sigue viendo.
- `personas_con_condiciones` no descuenta a quienes se bajaron (una baja no cambia ese número).
- Todo lo demás (aceptaciones, mínimo, máximo, disponibles, bajas con nombre) sigue igual para todos.
- Entra en `rev_vista`. Interfaz (claude-b-interfaz): si llegan `null`, no mostrar "Faltan por responder" ni "Con condiciones cargadas"; mostrar solo "N de M necesarias".
- Pruebas: un miembro común recibe `null` en los dos campos; la baja de un no elegible y la de un elegible sin aceptar dejan idéntica la vista de un miembro común.

## E7.3 · Simulación solo en espacios demo (hallazgos 2 y 3)
- `add_simulated_member` y todas las `simulate_*` responden `no_autorizado / espacio_no_demo` si el espacio no es demo. Los simulados ya existentes en espacios no demo no se borran.
- Si las pruebas existentes crean simulados en espacios no demo, se adaptan (por ejemplo, con `seed_demo_space` por sesión); no se debilita la regla para que pasen.
- Interfaz: las herramientas del organizador con Simulación solo aparecen en espacios demo.

## E7.4 · El perfil del grupo no cuenta a quien lo pide (hallazgo 4)
- `perfil_grupo` se calcula sobre los miembros con preferencias **distintos de quien llama**: `personas`, los umbrales (`personas > 3`, `cuantos >= 2`) y los totales de `gustos`, energía y ambiente.
- Así, el voto propio del organizador no puede hacer visible una actividad que eligió una sola persona más.
- `presupuesto_grupo` sale de `perfil_grupo` (hallazgo 7): el servidor ya descarta por presupuesto y nadie más lo necesita.
- En el demo, Tomi pide y quedan los simulados con preferencias (4: Luna no tiene semilla): el perfil se sigue viendo (4 personas).

## E7.5 · Ajustes de cierre (migración 0028)
- `mi_situacion.puede.simular` es `false` fuera de espacios demo (pedido de claude-b), coherente con E7.3.
- El mensaje de `no_autorizado / espacio_no_demo` pasa a ser general: "Esta acción solo está permitida en espacios de demostración." (también en `docs/contrato.md`), porque ahora lo devuelven la simulación y el reinicio.

## Límites declarados (no se arreglan en este corte)
- **El organizador puede usar el motor como oráculo** (hallazgo 2): eligiendo a alguien como imprescindible y repitiendo evaluaciones, puede deducir si esa persona puede en una franja. CRUXE oculta las condiciones a los demás miembros, no al motor que el organizador opera.
- **Comparar dos pedidos del perfil** (hallazgo 6) deja ver qué cargó quien guardó entre medio. Los totales son exactos a propósito: el agente los necesita.
- **En el espacio demo** los simulados tienen semillas conocidas: una persona real que reclama un lugar no debe cargar preferencias reales.
- **Una baja que deja el plan En revisión** dice algo de quien se bajó: si no había confirmado y aun así el plan quedó bajo el mínimo, esa persona podía en la franja vigente (`0011`, transición de la baja). Se mantiene: pasar a En revisión cuando ya no se llega al mínimo es la regla del producto.
- Navegador compartido (hallazgo 8): se arregla en la interfaz (#47), no en el contrato.

## Implementación (backend, 23 oct, 14:44 a 15:00 por el reloj)
- **Migraciones**, aplicadas una por vez y numeradas en el orden en que se aplicaron (el coordinador pidió E7.2 al final):
  - `0024_e7_orden_candidatas` (E7.1)
  - `0025_e7_simulacion_solo_demo` (E7.3)
  - `0026_e7_perfil_sin_quien_llama` (E7.4)
  - `0027_e7_conteos_solo_organizador` (E7.2)
- **Lista permitida**: sigue en 30 para `authenticated` y 0 para `anon`. Todas siguen con `SECURITY DEFINER` y `search_path=''`. `cruce.verificar_privilegios()` no da hallazgos.
- **Pruebas**: `tests/backend/enmienda7.test.ts`, con un `describe` por punto.
- **Precisiones y diferencias con lo de arriba:**
  - **E7.1 + E7.4: las "personas" de todos los umbrales son las demás.** Desde 0026, quien llama no cuenta para ninguno: el orden por marcas (sin marcas con 3 o menos), `presupuesto_todos`, `ritmo_del_grupo` y `el_mas_elegido`. Para `el_mas_elegido` hacen falta más de 3 personas, que 2 o más hayan elegido la actividad y que sea la más elegida, siempre contando solo a los demás.
  - **Lo que sigue contando a quien llama:** el puntaje (marcas, energía y ambiente), los descartes por precio y techo, `personas_consideradas` y `pocas_preferencias`. El plan es para todo el grupo.
  - **Grupos de 3 o menos (sin contar a quien llama):** la energía y el ambiente siguen pesando en el orden de las candidatas. La spec dice que el resto del puntaje queda igual.
  - **E7.4: `ambiente_mayoritario` puede venir en `null` si hay empate**, como antes. Cambia el caso de la prueba 4.1, el demo con Tomi y Luna: sin Tomi quedan empatados tranquilo (Caro) y fiesta (Fede), y antes salía "tranquilo" gracias al voto de Tomi.
  - **E7.4: `presupuesto_grupo` ya no viene** en `perfil_grupo`.
  - **E7.3: el texto del error no calza con la simulación.** `no_autorizado/espacio_no_demo` mantiene el de la tabla de `docs/contrato.md`: "El reinicio solo está permitido en espacios de demostración.". Cambiarlo le toca al coordinador.
  - **E7.3: `get_simulation_panel` no cambió.** Si en un espacio no demo quedaron simulados de antes, el organizador los sigue viendo, pero ya no puede operarlos.
  - **E7.3: `mi_situacion.puede.simular` no cambió.** Fuera del demo puede seguir en `true` si quedaron simulados de antes, aunque el servidor ahora rechaza la operación (pedido de claude-b-interfaz, pendiente).
  - **E7.2: el `null` depende de quién llama.** Se decide con `propuestas.organizador_id`, el organizador de la propuesta, en `cruce.vista_propuesta`. Así sale igual en `get_proposal_state` (y en `rev_vista`) y en la `propuesta` que devuelve cualquier escritura.
  - **E7.2: el organizador sigue viendo `pendientes` con las bajas descontadas**, como hasta ahora.
  - **E7.2: `siguiente_accion` se arma antes de ocultar los conteos.** El único texto que usa el conteo es "buscar_opcion", y solo lo recibe quien puede evaluar.
- **Pruebas existentes adaptadas a E7.3:** las que creaban simulados en espacios no demo ahora usan el demo propio de su sesión (`demoPrueba` en `tests/backend/helpers.ts`; en `tests/verificacion-altas`, `a1CrearEspacio`, el motor de `a4` con `a4EspacioDemo`, y en `a5` el espacio de A y el ajeno de B). `a5` (adv2) sigue probando la confusión de espacios entre dos demos de sesiones distintas, y suma el caso de simulación en un espacio no demo, que devuelve `espacio_no_demo`. En `a2-reclamo` ya no se puede armar desde la API el caso "simulado en espacio no demo que alguien reclama". La prueba ahora verifica que no se puede crear y que quien entra con ese nombre no reclama nada.
- **Pruebas existentes adaptadas a E7.2:**
  - `privacidad-audiencia`: Luna recibe `null` en `personas_con_condiciones` y Tomi recibe 3.
  - `tests/e2e/recorrido-canonico` y `jurado-variantes`: la opción de Luna y la de Tomi se siguen exigiendo idénticas salvo `cupos.pendientes`, que en Luna es `null` y en Tomi un número.
- **Pruebas existentes adaptadas a E7.4** (`enmienda4`): los perfiles esperados ya no cuentan a quien pide. La prueba de #28 suma un cuarto miembro, y Pádel recién aparece con dos personas además del organizador.
- **E7.5 (`0028_e7_simular_solo_demo_y_mensaje`, aplicada a las 15:09):**
  - `cruce.situacion` agrega la condición "espacio demo" a `puede.simular`. Las propuestas activas de espacios no demo que tenían simulados de antes pasaron de `true` a `false` (comprobado en la base, antes y después).
  - `cruce.mensaje` devuelve el texto general para `no_autorizado/espacio_no_demo`.
  - Prueba: `describe('E7.5')` en `tests/backend/enmienda7.test.ts`. En un espacio no demo nuevo, `puede.simular` ya era `false` porque no puede tener simulados; el caso de los simulados de antes se comprobó con la consulta directa.
- **Después de la enmienda, sin cambio de contrato (16:04 a 16:06):**
  - `0029_texto_confirmaron_minimo` (#59): el texto de `esperando_compromisos` con más confirmaciones que el mínimo pasa a decir "Versión N: confirmaron X (mínimo MIN)." en lugar de "X de MIN necesarias". En la base no hay otro texto con el patrón "X de MIN".
  - `0030_ritmo_sin_quien_llama` (#54): `ritmo_del_grupo` usa la misma mayoría de energía y ambiente que el perfil, sin quien pide. Si los demás empatan en ambiente, la frase no sale. El puntaje y el orden no cambian.
