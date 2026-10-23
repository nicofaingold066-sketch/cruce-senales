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
- En el demo, Tomi pide y quedan los 5 simulados: el perfil se sigue viendo (5 personas).

## Límites declarados (no se arreglan en este corte)
- **El organizador puede usar el motor como oráculo** (hallazgo 2): eligiendo a alguien como imprescindible y repitiendo evaluaciones, puede deducir si esa persona puede en una franja. CRUXE oculta las condiciones a los demás miembros, no al motor que el organizador opera.
- **Comparar dos pedidos del perfil** (hallazgo 6) deja ver qué cargó quien guardó entre medio. Los totales son exactos a propósito: el agente los necesita.
- **En el espacio demo** los simulados tienen semillas conocidas: una persona real que reclama un lugar no debe cargar preferencias reales.
- **Una baja que deja el plan En revisión** dice algo de quien se bajó: si no había confirmado y aun así el plan quedó bajo el mínimo, esa persona podía en la franja vigente (`0011`, transición de la baja). Se mantiene: pasar a En revisión cuando ya no se llega al mínimo es la regla del producto.
- Navegador compartido (hallazgo 8): se arregla en la interfaz (#47), no en el contrato.
