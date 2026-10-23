# Revisión de privacidad de CRUXE (mejora #42)

Autor: agente-ia. Viernes 23 oct 2026; informe cerrado a las 14:33 (hora del reloj). Revisión de solo lectura de `main` `deeea83`: migraciones vigentes hasta `0023`, `src/`, `supabase/functions/agente/` y contratos. No se editó nada fuera de `docs/agente*.md`.

**Pregunta:** ¿algo deja ver las preferencias o las condiciones de otra persona?

**Método:**
- Cinco revisores independientes, cada uno con un enfoque: RPC del motor, RPC del agente, pantallas, función del agente e inferencias.
- Por cada enfoque, un verificador escéptico que intentó refutar cada hallazgo: 19 confirmados y 5 descartados.
- Los confirmados, agrupados, quedan en 8 hallazgos distintos.
- Dos los comprobé en vivo contra la base real, con espacios nuevos de prueba (prefijo `t-`) y datos ficticios.

## Resultado en una línea
**No hay exposición directa**: ninguna respuesta, pantalla, error ni log entrega las condiciones o las preferencias de otra persona. Pero hay **6 inferencias de gravedad media** que van más allá del límite declarado ("el plan elegido puede dejar inferir algo en grupos chicos") y **2 endurecimientos de gravedad baja**.

## Hallazgos

### 1. El contador de pendientes delata si quien se baja podía (media, verificado en vivo)
- **Qué se filtra y a quién:** si una persona podía en la franja vigente, y si había completado sus condiciones. Lo ve **cualquier miembro**, en un grupo de cualquier tamaño.
- **Camino:**
  - `supabase/migrations/0008_enmienda2_esquema.sql:453-460`: `cupos.pendientes` cuenta a los elegibles no retirados que no aceptaron.
  - `0008:547-551`: `personas_con_condiciones` excluye a los retirados.
  - `0011_enmienda2_propuestas.sql:753-760`: la baja queda con nombre y `habia_aceptado`.
  - `src/screens/PlanTab.tsx:179`: lo muestra como "Faltan por responder".
- **Prueba en vivo** (`t-sonda-…`, 4 sesiones reales, versión 1 en la franja A):
  - Antes de las bajas, `pendientes` = 3.
  - Se baja Beto, que había marcado A = no: `pendientes` sigue en 3.
  - Se baja Ana, que había marcado A = sí: `pendientes` baja a 2.
  - Cata, que solo mira, deduce qué marcó cada uno. Además, `personas_con_condiciones` baja en 1 con cada baja.
- **Variante:** cuando "Faltan por responder" llega a 0, quienes no confirmaron y no figuran en bajas son exactamente los que no podían (`PlanTab.tsx:179` y `190-202`). Contradice el punto 3 de `docs/contrato.md` §3.2.
- **Arreglo** (backend; contrato vía coordinador; claude-b para la pantalla): no descontar retiros que dependan de un dato privado. Por ejemplo, calcular `pendientes` = elegibles − quienes aceptaron alguna vez, o no publicar `pendientes`. Contar `personas_con_condiciones` sin excluir a los retirados. Prueba nueva: la baja de un no elegible y la de un elegible sin aceptar dejan la vista compartida idéntica.

### 2. El motor sirve de oráculo de la disponibilidad de una persona (media)
- **Qué se filtra y a quién:** la disponibilidad por franja de un miembro real elegido como blanco. Le llega al **organizador de la propuesta**.
- **Camino:**
  - `0011:144`: `create_proposal` acepta a cualquier miembro como imprescindible.
  - `0002_utilidades.sql:241-251`: el motor exige que el imprescindible pueda.
  - `0011:547`: tras `sin_opcion` se puede volver a evaluar sin límite.
  - `0011:847-858`: `propose_repair` también se puede repetir.
  - El organizador cambia sus propias condiciones entre evaluación y evaluación.
  - `0017:152-193` y `0004_api_propuestas.sql:25-40`: los simulados se permiten también en espacios que no son demo y sirven de relleno.
- **Escenario:** imprescindible = Sofía, mínimo 2, el organizador pone A = sí y B = no y evalúa. Si se publica A, Sofía puede el sábado. Si sale "Sin opción", el organizador cambia lo suyo y repite.
- **Arreglo** (backend, contrato):
  1. Simulación solo en espacios demo (`add_simulated_member` y `chequeo_simulacion` revisan `e.demo`).
  2. Después de `sin_opcion` o `sin_alternativa`, no volver a evaluar hasta que cambien las condiciones de otro miembro real.
  3. Congelar las condiciones del organizador después de la primera evaluación.
  4. Si no se cambia, declararlo como límite en el contrato.

### 3. El panel de simulación más los contadores dejan aislar a la única persona real (media)
- **Qué se filtra y a quién:** la disponibilidad exacta de la persona real que entra a un espacio con simulados. Le llega al **organizador del espacio**, aunque esa persona nunca acepte.
- **Camino:** `0011:906-924` (`get_simulation_panel` da elegibilidad y estado de cada simulado) menos `cupos.pendientes` y `personas_con_condiciones` (`0008:453-460` y `547-551`) menos los datos propios del organizador.
- **Escenario** (demo con Luna real, que marca A = no y B = sí): en la versión 1, en A, `pendientes` = 3. Restando los simulados elegibles y al propio Tomi queda 0, así que Luna no puede en A. En la versión 2, en B, la resta da 1: Luna sí puede en B.
- Ya estaba señalado en `docs/revision-codex-1.md` (M2) y sigue sin mitigar.
- **Arreglo** (backend): con simulados y menos de 2 personas reales además de quien mira, no devolver cantidades exactas que mezclen simulados con reales. Agregar la prueba "una persona real entre simulados".

### 4. Los umbrales del perfil del grupo cuentan al organizador y a los simulados (media)
- **Qué se filtra y a quién:** las preferencias de otra persona (actividades, energía y ambiente). Le llegan al **organizador**.
- **Camino:** `0023_gustos_minimo_dos.sql:63-71` (universo), `:135` ("más de 3 personas") y `:150` (`cuantos >= 2`). Las semillas de los simulados son conocidas (`0020:16-21`) o las fija el organizador (`simulate_save_preferences`). En pantalla: `src/agente/AgentePanel.tsx:224-233`.
- **Escenarios:**
  - *Demo con una persona real:* el perfil "Asado 5 de 6 · Fútbol 2 de 6 · Parque 2 de 6", menos las semillas y menos Tomi, deja ver exactamente qué marcó la persona real.
  - *Cualquier espacio:* el organizador marca una actividad y con su propio voto hace visible una que eligió una sola persona más. Si marca todas y vuelve a pedir, obtiene los conteos exactos de los demás. Alternando su energía, ve cuándo cambia la mayoría.
- **Arreglo** (backend, enmienda): calcular los umbrales y los totales solo sobre los miembros reales distintos de quien llama. Mostrar el perfil solo si son 4 o más, y exigir `cuantos >= 2` también sin contar al organizador ni a los simulados.

### 5. Con 2 o 3 personas, las candidatas delatan los gustos del otro (media, verificado en vivo)
- **Qué se filtra y a quién:** las actividades que eligió la otra persona. Le llegan al **organizador**. Con 3 personas o menos el perfil se oculta, pero cada candidata conserva el orden por marcas y la frase `el_mas_elegido`.
- **Camino:**
  - `0023:113` y `:78-86`: `el_mas_elegido` sin corte por cantidad de personas ni por `v_max_marcas >= 2`.
  - `0023:46-50`: `p_clima` se acepta del cliente en cualquier espacio. Sirve para sondear lo de techo, aunque esto está permitido por la decisión 4 de la enmienda 4.
- **Prueba en vivo** (`t-sonda-agente-…`, 2 personas reales: Tere marca fiesta y Ana marca parque):
  - Con seco: `perfil_grupo` = `{"personas":2}`, pero la primera candidata es `parque[…, el_mas_elegido]`, por delante de fútbol y pádel.
  - Con lluvia: lo mismo.
  - Tere sabe que Ana eligió parque.
- **Variante:** si nadie comparte actividad (`v_max_marcas` = 1), todas las candidatas con 1 marca llevan `el_mas_elegido` y el panel dice "Es lo que más eligieron" en cada una. Eso deja ver lo que la mejora #28 quiso esconder.
- **Arreglo:**
  - Backend: `el_mas_elegido` solo si hay más de 3 personas y `v_max_marcas >= 2`. Con 3 personas o menos, devolver las candidatas en el orden del catálogo, no por marcas.
  - Agente-ia, como respaldo en mis rutas: no usar ni mandar al modelo `el_mas_elegido` si la actividad no está en `gustosVisibles` (`logica.ts` en `textoFrase` y `entradaModelo`; `src/agente/api.ts` en `frase`).

### 6. Comparar dos pedidos deja ver qué cargó quien acaba de guardar (media)
- **Qué se filtra y a quién:** las preferencias de quien recién guardó o editó. Le llegan al **organizador**.
- **Camino:** el perfil se calcula en vivo en cada pedido (`0023:140`), y `personas_con_preferencias` (`0015:136`) avisa cuándo cambia el total.
- **Escenario:** Ana pide y ve "Asado 3 de 4 · Fútbol 2 de 4". Caro avisa que ya cargó. Ana vuelve a pedir y ve "Asado 4 de 5 · Fútbol 2 de 5 · Parque 2 de 5": Caro marcó asado y parque.
- **Arreglo** (backend; decisión del coordinador): totales más gruesos (la actividad más elegida y "la mayoría", sin conteos exactos), o una foto del perfil que solo se renueva cuando cambiaron al menos 2 personas. Si no, declararlo como límite.

### 7. `presupuesto_grupo` llega al navegador y al modelo, y el documento dice "nunca" (baja)
- **Qué llega y a quién:** que al menos una persona pidió algo barato o gratis. Le llega al **organizador**, en la respuesta de red, y al modelo.
- **Camino:**
  - `0023:153` lo calcula.
  - `supabase/functions/agente/logica.ts:239` (`perfilParaRespuesta`) y `src/agente/api.ts` (`normalizar`) lo dejan pasar.
  - `logica.ts:253` se lo manda al modelo.
  - `docs/agente-ia.md` dice que el organizador "nunca" ve el presupuesto. La pantalla no lo muestra (`AgentePanel.tsx:220`), pero el dato llega.
- La enmienda 4.1 lo aprobó como agregado, así que es de gravedad baja. Además, `PROHIBIDAS` no incluye "gratis", "barato", "económico" ni "presupuesto", y el modelo podría escribirlo en el mensaje para WhatsApp.
- **Arreglo:**
  - Agente-ia: quitarlo de la respuesta de la función y del respaldo, no mandarlo al modelo, sumar esas palabras a `PROHIBIDAS` y corregir el documento.
  - Backend: quitarlo de `perfil_grupo` si el coordinador lo aprueba.

### 8. Navegador compartido: quien entra después hereda la identidad anterior (baja)
- **Qué se filtra y a quién:** las preferencias y condiciones de la persona A, que quedan a la vista de la persona B en el mismo navegador. Lo que B guarde sobrescribe lo de A.
- **Camino:**
  - `src/lib/supabase.ts:10-11`: la sesión anónima persiste y no hay forma de cerrarla.
  - `0017:113-120`: `join_space` con alguien que ya es miembro responde ok e ignora el nombre.
  - `src/screens/Inicio.tsx:214-221`: no mira `ya_era_miembro` y entra en silencio.
- **Escenario:** en la notebook de la demo está la sesión de Tomi. Un jurado abre el enlace de invitación de WhatsApp, escribe "Ana" y entra como Tomi.
- **Arreglo** (claude-b-interfaz): si `ya_era_miembro`, avisar "Este navegador ya está en este espacio como <nombre>" y ofrecer "Entrar como otra persona", que cierra la sesión, crea una nueva y repite `join_space`.

## Lo que se revisó y está bien
- **Funciones públicas:** ninguna devuelve condiciones de otro. `get_my_conditions` y `get_my_preferences` devuelven solo las propias. `mi_situacion` es solo de quien mira.
- **Respuestas compartidas:** el historial de eventos, `opcion_anterior` y `rev_vista` no llevan condiciones ni preferencias.
- **Panel de simulación:** solo lo ve el organizador del espacio y solo con simulados. Quien reclama un asiento desaparece del panel.
- **Errores y logs:** los errores (`cruce.fallo`) guardan solo `sqlstate` y contexto. Los logs de la función solo registran `e.name`.
- **Datos que no se exponen:** las tablas privadas no son accesibles desde el navegador. La URL y el enlace `wa.me` llevan solo el plan y el código de invitación.
- **Modelo y clave:** el modelo recibe candidatas sin nombres de integrantes (`sinNombres`). El clima simulado solo lo acepta la función si `get_space` dice demo. No se usa la clave de servicio.

## Descartados por el verificador (no son fugas)
- `p_clima` sin validar en la RPC directa: permitido por la decisión 4 de la enmienda 4, y no agrega una fuga propia.
- El mensaje del modelo para WhatsApp: hoy, sin clave, es siempre el texto fijo. Con clave, solo recibe totales; lo de "gratis" y "barato" quedó en el hallazgo 7.
- El orden de las candidatas en grupos de 4 o más: cubierto por el límite declarado.

## Qué puedo arreglar yo (rutas de agente-ia), si el coordinador lo aprueba
- **Respaldo del hallazgo 5:** no usar `el_mas_elegido` si la actividad no está en `gustosVisibles`, en la función, en el modelo y en la pantalla.
- **Hallazgo 7:** quitar `presupuesto_grupo` de la respuesta de la función, del respaldo y de la entrada del modelo; sumar "gratis", "barat*", "económic*" y "presupuesto" a `PROHIBIDAS`; corregir el documento.

Lo demás es del backend (hallazgos 1 a 6, con enmienda) o de claude-b-interfaz (1, en la pantalla, y 8).
