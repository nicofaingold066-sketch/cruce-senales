# Auditoría del agente social (GRU / S6): creatividad, coherencia y trato parejo

Sesión **auditoria-agente**, sábado 24 oct 2026, desde las 09:15 (hora del reloj, America/Santiago). Base: `main` = `8fba205`.
Solo lectura de código y una consulta de lectura al catálogo en la base (`select` sobre `cruce.catalogo_agente`). **Cero llamadas al modelo.** No toqué código.

**Cambio de alcance (Nico, 09:2x, en esta sesión):** «no me importa la privacidad ni los costos ni la seguridad; me importa que funcione y que sus respuestas sean creativas, coherentes y que no discriminen a nadie». Después sumó: qué parámetros usa y cuáles le faltan (hora, clima, distancia, presupuesto, horarios, si viene con alguien, reserva, plan B), qué fuentes reales podría usar y con qué costo, e ideas. Las partes de privacidad, costos y seguridad del encargo original quedan **fuera de alcance**; al final dejo tres observaciones que vi de pasada, sin auditar.

## Resumen ejecutivo

| Tema | Semáforo | En una línea |
|---|---|---|
| Creatividad | 🔴 | El modelo solo elige entre **3 opciones de un catálogo fijo de 17 lugares inventados** y escribe 2 frases. Una lista de palabras prohibidas descarta textos normales y vuelve al texto fijo. |
| Fuentes de datos reales | 🔴 | Lo único real es el **clima** (Open-Meteo). Lugares, horarios y precios son de simulación. Google Maps/EasyCancha son enlaces, no datos. ATC apunta a **Mendoza, Argentina**. |
| Coherencia | 🟡 | El cálculo es ordenado y explicable, pero: en grupos sin propósito **no mira cuántas personas son** (pádel para 12), «Asado en casa de Tomi» sale en grupos sin Tomi, y con 4 personas o menos **los gustos no cuentan**. |
| Trato parejo (no discriminar) | 🟢 con matices | Los límites duros protegen a cada uno (presupuesto más bajo, techo, viaje máximo). Lo blando lo decide la mayoría. Quien no cargó preferencias o apagó «usar en el agente» no queda protegido. |
| Que funcione | 🟡 | El camino sin modelo siempre responde. Pero el chip **«Sáb 14 nov» falla hoy siempre** (fuera de los 16 días que acepta el servidor) y ningún texto real del modelo quedó guardado para juzgar la calidad. |

**Lo más importante:** hoy GRU no «busca» planes en el mundo. Ordena con reglas fijas un catálogo de 17 filas y le pide al modelo que elija una de las 3 primeras y la redacte. Para la demo funciona y es seguro. Para que sea creativo hace falta (1) más opciones y lugares reales y (2) aflojar las reglas del texto.

## 1. Cómo arma el plan, paso a paso

```
Organizador toca «Que el agente arme un plan» (AgentePanel.tsx:976)
  │  body: espacio_id, sabado (31 oct / 7 nov / 14 nov), clima_simulado (solo demo), modo:'herramientas'
  ▼
Función agente (supabase/functions/agente/index.ts:302)
  1. get_space → nombres del grupo (para que el texto no nombre a nadie) y si es demo
  2. Clima: Open-Meteo, centro de Santiago (-33.45, -70.66), sábado y domingo → lluvia sí/no + máxima
     (en demo: «Sol» o «Lluvia» de simulación)
  3. Bucle con herramientas (herramientas.ts): el modelo pide ver_clima, buscar_planes, buscar_canchas;
     máx. 4 herramientas, 25 s; termina con elegir_plan
  4. buscar_planes = RPC proponer_plan_borrador (0050_e14_arreglos_revision.sql:72) → hasta 3 candidatas
  5. El modelo elige 1 de esas 3 y escribe explicación (≤240) y mensaje al grupo (≤320, una línea)
  6. validarSalidaModelo (logica.ts:394): id válido + textoValido (largo, sin nombres, sin palabras prohibidas)
     └─ si falla: una corrección; si vuelve a fallar → camino directo con Haiku → si falla → 1.ª opción + texto fijo
  ▼
Pantalla: título, lugar (sin «(Simulación)»), dos franjas, explicación, «Lo redactó la IA» o «Texto fijo»,
enlaces de canchas (pádel/fútbol/tenis), «Usar esta opción» → Nueva propuesta, «Revisar antes de invitar»
```

### Cómo decide el servidor (`proponer_plan_borrador`, 0050:72–363)

**Quiénes cuentan:** miembros con preferencias y `usar_en_agente = true` (0050:166). Hacen falta al menos 2.

**Descarta** una opción del catálogo si:
1. su precio supera el del **presupuesto más bajo** del grupo (`min`, 0050:153 y 231);
2. es al aire libre, **alguien** pidió bajo techo **y** el clima es lluvia o *desconocido* (0050:232);
3. el viaje supera el tiempo máximo de **cualquiera** que lo cargó (0050:222 y 236);
4. el grupo tiene propósito y la opción es de otra familia o el grupo no llega al mínimo de personas (0050:234).

**Ordena** por puntaje (0050:237–243):
- `3 × personas que la marcaron` en «Me gustaría» (**solo si hay más de 3 personas además de quien pide**);
- +1 si coincide con la energía de la mayoría, +1 con el ambiente, +1 si el lugar va con el clima;
- `+2 × personas` que prefieren ese momento del día (mañana < 13:00, tarde < 19:00, noche);
- +3 si es la actividad del propósito del grupo;
- −1 por cada 15 min de viaje máximo pasados los 30;
- desempates: menor viaje máximo, menor viaje total, más barato, orden del catálogo.

Las **3 primeras** son las candidatas. El modelo recibe por cada una: plan, actividad, lugar, días, viaje máximo y razones en texto; del grupo: cantidad, gustos con 2+ personas, ritmo y ambiente de la mayoría (logica.ts:348).

## 2. Parámetros: los que usa y los que faltan

| Parámetro | Qué usa hoy | Qué le falta | Fuente posible |
|---|---|---|---|
| **Clima** | Lluvia sí/no (prob. ≥ 50 % o código WMO ≥ 51) y máxima, de un solo punto de Santiago. La máxima **se le pasa al modelo pero no pesa en el orden**. | Calor (35° → nada de cerro al mediodía), viento, frío de noche, UV, hora a hora. «Desconocido» se trata como lluvia y saca todo lo de aire libre. | Open-Meteo ya da `hourly` y `uv_index` gratis (CC BY 4.0, uso no comercial ≤ 10 000/día). |
| **Distancia** | 8 zonas fijas (Providencia, Ñuñoa, Las Condes, Centro, Maipú, La Florida, Puente Alto, Vitacura) y una tabla de minutos por zona y modo. Cada lugar del catálogo tiene **una** zona. | Comunas fuera de esas 8, punto de encuentro, «quedar a mitad de camino», tráfico del sábado. | OSRM o GraphHopper sobre OpenStreetMap (gratis), GTFS de Red Metropolitana para transporte público. |
| **Presupuesto** | 3 niveles (`ojala_gratis`, `algo_barato`, `da_igual`) contra 3 precios del catálogo (`gratis`, `barato`, `medio`). Gana el más bajo. | Montos en pesos, «caro» no existe, división de gastos (asado: cada uno trae algo). | Rango de precio de Google Places (`priceLevel`) o carga manual. |
| **Horario** | 3 momentos (mañana, tarde, noche) + `da_igual`. Las horas son **fijas por lugar** (asado 14–17, fiesta 23–03). Siempre sábado y domingo del mismo finde. | Desde/hasta, viernes, feriados, duración, horario real de apertura. El domingo de fiesta cae 22:00–02:00 (noche antes de un lunes). | `opening_hours` de Google Places u OSM. |
| **Gustos** | 16 actividades; «Me gustaria» hasta 6. | Comida (vegetariano en un asado), «no quiero» explícito, gustos nuevos. | Formulario. |
| **Ritmo / ambiente** | `con_todo`/`algo_tranquilo`, `fiesta`/`tranquilo`. Empate de energía → tranquilo. | — | — |
| **Techo** | `bajo_techo` o `da_igual`. | — | — |
| **Tamaño del grupo** | Solo en grupos con propósito (mínimo). **Nunca mira el máximo.** | Pádel (4), tenis (2–4), café (2–6) para 12 personas. | Ya está en el catálogo (`personas_min/max`): falta usarlo siempre. |
| **Viene con alguien** (amigo, pareja, niños, mascota) | **No existe.** | Un «+1» por persona cambia el tamaño, el tipo de plan (bar con niños no) y el cupo. | Formulario: «voy solo / con pareja / con un amigo / con niños / con mascota». |
| **Accesibilidad / edad** | No existe. | Movilidad reducida (cerro), menores (bar, fiesta). | Formulario + `wheelchair` de OSM/Google. |
| **Reserva** | CRUXE no reserva (decisión de producto). Enlaces genéricos para 3 deportes. | Enlace directo al lugar, teléfono, «reservar en…». | Google Places (`websiteUri`, `nationalPhoneNumber`); EasyCancha no tiene API pública. |
| **Plan B** | Solo implícito: con lluvia se descarta lo de aire libre. Las candidatas 2 y 3 se ven, pero con texto fijo. | «Si llueve, nos vamos a…» en el mismo mensaje. | El modelo ya podría escribirlo con las 3 candidatas que recibe. |

## 3. Hallazgos por gravedad

### Altos

**A1. El catálogo es fijo, chico e inventado: el modelo no puede ser creativo con lo que recibe.** · Dueño: servidor (vía coordinador) + S6 agente-ia
- Evidencia: `cruce.catalogo_agente` tiene **17 filas**, todas con `lugar_nombre like '% (Simulación)'` (0014:13, restricción `check`). Ejemplos: «Club de pádel», «Restaurante de la esquina», «Fiesta de un bar», «Parque de la comuna». Horarios fijos por fila. El servidor manda **máximo 3** (0050:243, `limit 3`; logica.ts:385, `slice(0, 3)`). El prompt dice «no inventes datos que no te dieron» (index.ts:88) y «ante la duda, la primera» (index.ts:85).
- Efecto: para el mismo grupo y el mismo clima, el plan sale siempre igual. El modelo elige entre 3 opciones genéricas y casi siempre confirma la primera.
- Hoy (mínimo): nada en el catálogo (backend cerrado). Sí se puede, en la función (S6): pedir al modelo una idea concreta *dentro* de la actividad (qué llevar, un detalle del plan), rotulada como sugerencia y no como dato.
- Después: lugares reales por actividad y zona (§4), con nombre, horario y enlace.

**A2. Las palabras prohibidas descartan textos normales y el agente vuelve al texto fijo.** · Dueño: S6 agente-ia
- Evidencia: `PROHIBIDAS` (logica.ts:160–176) se compara como palabra o prefijo. Caen frases comunes y sin riesgo: «¿hay **ánimo**?», «**agéndense** el sábado», «**reserven** la tarde», «se **vive** distinto», «si **alguien** quiere traer algo», «es **gratis**» (el picnic en el parque *es* gratis), «**barato**». Si el modelo usa una, la salida se descarta (logica.ts:319), hay una sola corrección en el bucle (herramientas.ts:247) y después va el texto fijo «¡Hola! Les propongo…» (logica.ts:292).
- Además el registro solo dice «salida del modelo rechazada» sin el motivo (index.ts:234): no se puede medir cuántas veces pasa.
- Hoy (mínimo): sacar de la lista las palabras que no delatan a nadie: `ánimo/animo`, `agend*`, `reserv*` (dejar «está reservado»), `vive` (dejar «donde vive»), `gratis`, `barat*`. Registrar *qué regla* falló (el código de la regla, no el texto).
- Después: medir la tasa de caída al texto fijo con 20 corridas simuladas.

**A3. Ningún texto real del modelo quedó guardado: hoy no hay forma de juzgar la creatividad con evidencia.** · Dueño: S6 agente-ia
- Evidencia: la función no registra los textos (a propósito, index.ts:236). La única llamada real documentada (`docs/agente-ia.md:215`, 23 oct 23:59) anota los pasos y «texto válido», no el texto.
- Hoy (mínimo): con autorización escrita de Nico, **5 llamadas reales** en un demo propio (sol, lluvia, grupo de 4, grupo de 8, grupo con propósito) y guardar los textos en este informe. Cada llamada gasta créditos del Gateway.

### Medios

**M1. En grupos sin propósito no se mira cuántas personas son.** · Dueño: servidor
- Evidencia: el filtro de tamaño solo corre si `v_fam <> 'libre'` (0050:234) y `personas_max` no se usa nunca. Un grupo libre de 12 puede recibir «Pádel el fin de semana» (máx. 4) o «Tenis en parejas» (2–4); uno de 3 puede recibir «Fútbol en la cancha» (mín. 10).
- Hoy: el prompt (S6) puede decirle al modelo «no elijas una opción con `personas.max` menor que el tamaño del grupo», porque `personas` ya llega en cada candidata. Después: el filtro en la base.

**M2. «Asado en casa de Tomi» sale en cualquier grupo.** · Dueño: servidor (catálogo) + S6
- Evidencia: fila `lugar-sim-01` con `titulo_plantilla = 'Asado en casa de Tomi'` y lugar «Quincho de Tomi». `sinNombres` lo limpia solo para el modelo y solo si en el grupo hay un Tomi (logica.ts:301, 371). La pantalla y «Usar esta opción» usan el título crudo (AgentePanel.tsx:546, 563). En un grupo sin Tomi, el plan dice «en casa de Tomi»: ¿quién es Tomi?
- Hoy: que la pantalla muestre «Asado en casa» (pasar `sinNombres` siempre, no solo con los del grupo). Después: título neutro en el catálogo.

**M3. Con 4 personas o menos, los gustos no pesan.** · Dueño: servidor (decisión de privacidad E7.1)
- Evidencia: `3 * (case when v_n_otros > 3 then k.marcas else 0 end)` (0050:237). En grupos chicos (lo más común entre amigos) el orden lo deciden energía, ambiente, clima y momento: puede salir una actividad que **nadie** marcó.
- Es una decisión de privacidad (que no se adivine quién eligió qué). Como Nico prioriza la coherencia: contar las marcas para ordenar y no *decirlas* en el texto mantiene la privacidad del texto y mejora la elección.

**M4. El chip «Sáb 14 nov» falla siempre hoy.** · Dueño: S6 agente-ia
- Evidencia: el panel ofrece 31 oct, 7 nov y 14 nov (AgentePanel.tsx:50 y 791). El servidor rechaza un sábado a más de 16 días (0050:133): hoy 24 oct + 16 = 9 nov. 14 nov devuelve `fecha_invalida`. Después del 31 oct, el primer chip queda en el pasado.
- Hoy: armar los chips desde el próximo sábado y solo los que entran en 16 días.

**M5. Las canchas apuntan a Mendoza y a buscadores genéricos.** · Dueño: S6 agente-ia
- Evidencia: canchas.ts:16 y 44–47, «Ver turnos en ATC (Mendoza)» con el `placeId` de Mendoza, Argentina, en una app chilena. EasyCancha va a su buscador general (sin deporte ni comuna). Google Maps busca «canchas de pádel» cerca de quien toca. `buscar_canchas` solo devuelve los tres nombres de sitio (index.ts:68, 421): el modelo «buscó canchas», pero no recibió ninguna cancha.
- Hoy: sacar ATC o cambiarlo a Santiago si existe; el paso no debe decir «Busqué canchas reales» si solo hay enlaces (herramientas.ts:133).

**M6. El clima casi no influye y «sin pronóstico» castiga lo de aire libre.** · Dueño: servidor + S6
- Evidencia: la máxima llega al modelo pero no al puntaje (0050:212–213 solo mira seco/lluvia). `desconocido` cuenta como clima malo (0050:172): si alguien pidió techo y Open-Meteo falla, se va todo lo de aire libre.

**M7. El camino «social» (Revisar antes de invitar) escribe con todavía menos datos.** · Dueño: S6 / codex-gru
- Evidencia: `SISTEMA_SOCIAL` (modelo-social.ts:18) y `proyectar` (modelo-social.ts:28): el modelo recibe solo código de actividad, franjas, viaje, familia y personas; ni lugar, ni clima, ni gustos. El mensaje al grupo de ese camino sale genérico por diseño.

### Bajos

- **B1.** Solo la destacada lleva texto del modelo; las otras dos candidatas muestran el texto fijo (AgentePanel.tsx:541). Al tocar otra opción el tono cambia de golpe.
- **B2.** Empate de energía → `algo_tranquilo`; empate de ambiente → ninguno (0050:170–171). Razonable, pero conviene decirlo.
- **B3.** El momento del día se mide solo con la hora de inicio del sábado (0050:214–217), también para el domingo.
- **B4.** «Fiesta en un bar» el domingo 22:00–02:00 (noche antes de un lunes).
- **B5.** Nombres del grupo que son palabras comunes con mayúscula («Luna», «Sol», «Paz») pueden hacer descartar un texto al inicio de frase (logica.ts:321–324). Es raro.

## 4. Trato parejo: ¿discrimina a alguien?

- **Lo que protege a cada persona por igual (bien):** presupuesto = el más bajo del grupo; techo = basta con una persona; viaje = nadie pasa su máximo; propósito y quórum sin culpas («hace falta un grupo más grande», nunca «falta X»). El prompt prohíbe nombrar a alguien o hablar de su dinero, salud, ánimo o disponibilidad (index.ts:87–90), y el validador lo hace cumplir.
- **Lo que decide la mayoría (aceptable, pero hay que saberlo):** gustos, energía, ambiente y momento suman por cantidad de personas. La minoría pierde siempre ante la misma mayoría: no hay rotación («la vez pasada se hizo lo de ustedes»).
- **Quién queda afuera sin aviso:** quien no cargó preferencias o apagó «usar en el agente» no cuenta ni en los límites duros (0050:166). Si esa persona tiene poco presupuesto, el plan puede no servirle. La respuesta trae `personas_consideradas`; mostrar «pensé en 5 de 7» ayudaría.
- **Nada en el cálculo usa género, edad, nombre ni quién es la pareja de quién.** No encontré reglas que traten distinto a una persona por quién es. El riesgo de sesgo está en el texto libre del modelo, y ese texto pasa por el validador.

## 5. Fuentes reales: qué sirve, costo, frescura, licencia

Sin activar nada facturable. Cifras de precio a verificar en la página oficial antes de usar.

| Fuente | Sirve para | Costo | Frescura | Licencia / límites | Veredicto |
|---|---|---|---|---|---|
| **Open-Meteo** (ya en uso) | Clima por día y por hora, UV | Gratis no comercial | Horaria | CC BY 4.0, ≤ 10 000 llamadas/día; atribución ya en pantalla (AgentePanel.tsx:611) | Usar más: hora a hora y calor |
| **OpenStreetMap / Overpass** | Parques, parrillas (`amenity=bbq`), canchas (`leisure=pitch` + `sport=padel`), cines, bares, horarios (`opening_hours`) | Gratis | Variable según la comunidad | ODbL: «© OpenStreetMap contributors». El servidor público pide cache y pocas consultas | **La mejor opción gratis**: precargar Santiago una vez y guardar en una tabla |
| **Google Places API (New)** | Lugares reales con horario, precio aproximado, rating, web, teléfono | Text Search Pro ~US$32 por 1 000 tras ~5 000 gratis al mes (fuentes de terceros); Place Details Essentials ~US$5 por 1 000 tras 10 000 gratis | Muy alta | Reglas de cache y atribución de Google; facturable | La de más calidad; **requiere activar facturación: decisión de Nico** |
| **Foursquare Places** | Lugares y categorías | Primeras ~500 llamadas gratis, luego ~US$15 por 1 000 (página oficial) | Alta | Facturable | Alternativa a Google, menos datos en Chile |
| **Ticketmaster Discovery** | Conciertos y eventos con fecha | Clave gratis con límite | Alta | Cobertura de Chile **sin verificar** | Probar con `countryCode=CL` antes de prometer |
| **Eventbrite** | Eventos | — | — | Quitó la búsqueda pública en 2019–2020 | No sirve para buscar |
| **Passline / Puntoticket / agendas municipales** | Eventos chilenos | — | — | Sin API pública encontrada | Lista curada a mano para la demo |
| **EasyCancha** | Canchas de pádel, fútbol y tenis en Chile (450+ clubes) | — | — | Sin API pública encontrada | Mantener el enlace; pedir convenio después |
| **OSRM / GTFS Red** | Minutos reales de viaje | Gratis | Estática | ODbL / datos abiertos | Reemplaza la tabla de 8 zonas |

### Muestra gratis de OpenStreetMap (Región Metropolitana, 24 oct 09:34)

Una consulta de conteo a Overpass (servidor público, gratis, ODbL). Los datos existen, pero hay que limpiarlos antes de usarlos.

| Qué | Cuántos hay en OSM | Lectura |
|---|---|---|
| Canchas o centros con `sport=padel` | **242** | Hay base para «canchas de pádel reales cerca de la zona del grupo». Falta medir cuántas tienen nombre y horario: la segunda consulta la rechazó el servidor público (está sobrecargado) y no insistí. |
| Parrillas (`amenity=bbq`) | **26**, solo 1 con nombre | Pobre: varias son el mismo punto repetido. Para «Asado en una parrilla del parque» no alcanza; mejor parques grandes conocidos + carga manual. |
| Parques (`leisure=park`) | **5 461** | Sobra; incluye plazas chicas. Filtrar por superficie o por nombre. |
| Restaurantes | **3 326**, solo **224** con horario (7 %) | Sirve para «hay un lugar»; no sirve para saber si está abierto. Para horario, Google Places. |
| Bares | **225** | Pocos para Santiago: OSM está incompleto en vida nocturna. |
| Cines | **42** | Bien cubierto. |

Conclusión: OSM sirve para parques, cines y canchas de pádel (lugares que no cambian). Para restaurantes, bares y horarios hace falta Google Places (facturable) o una lista curada.

### «Viene con alguien»: ya existe algo, pero el agente no lo lee

friccion dejó «¿Quién viene?» (D3, aprobada por Nico): el organizador marca el grupo o el plan como «Solo el grupo / Con parejas / Abierta», y queda escrito al final del nombre («Los del pádel · con parejas», `src/lib/compartir.ts`). El agente no usa esa marca: no suma las parejas al tamaño del grupo ni cambia el tipo de plan. Para hoy, el prompt podría recibir esa marca como dato del grupo (no es privada: está en el nombre).

## 6. Ideas para que sea creativo (ordenadas por esfuerzo)

1. **Hoy, solo prompt y validador (S6):** aflojar A2; pedir en el mensaje un detalle concreto del plan («cada uno trae algo para la parrilla», «después del cerro, completos») y un **plan B** con la candidata techada; usar la máxima del clima («con 31° mejor temprano»); variar el tono según el ambiente del grupo (fiesta / tranquilo).
2. **Hoy, pantalla (S6):** «Asado en casa» sin Tomi (M2); chips de fecha válidos (M4); sacar ATC Mendoza (M5); mostrar «pensé en N de M».
3. **Después del hackatón, servidor:** filtro por tamaño del grupo (M1); marcas que cuentan en grupos chicos (M3); campo «voy con…» (pareja, amigo, niños, mascota) que suma al cupo y filtra lugares.
4. **Después, datos:** precargar lugares reales de OpenStreetMap por zona (gratis) para que buscar_planes devuelva «Parque Bustamante», «Canchas de pádel de X» con horario; evaluar Google Places si Nico activa facturación.
5. **Después, eventos:** una herramienta `buscar_eventos` con una lista curada semanal (y Ticketmaster si cubre Chile) para que GRU proponga «la feria del domingo en el Parque Forestal».

## 7. Observaciones fuera de alcance (vistas de pasada, sin auditar)

- Con `modo: 'herramientas'`, la primera llamada al modelo sale **antes** de que la base compruebe que quien llama es organizador del grupo (index.ts:402–426 vs. 0050:137–142). Cualquier sesión anónima con un `espacio_id` cualquiera dispara al menos una llamada.
- El límite de llamadas es por instancia y en memoria (logica.ts:627; el propio comentario lo dice).
- CORS `*` (index.ts:76). Con JWT en la cabecera es de bajo riesgo.

## Dueños propuestos

| Hallazgo | Dueño | Hoy | Después |
|---|---|---|---|
| A1 catálogo fijo | servidor → coordinador; S6 | prompt: detalle del plan | lugares reales (OSM) |
| A2 palabras prohibidas | S6 agente-ia | aflojar lista + registrar regla | medir tasa |
| A3 sin textos reales | S6 agente-ia (con permiso de Nico) | 5 llamadas reales | — |
| M1 tamaño del grupo | servidor; S6 | regla en el prompt | filtro en la base |
| M2 Tomi | S6 agente-ia | `sinNombres` siempre | título neutro |
| M3 gustos en grupos chicos | servidor (decisión de Nico) | — | contar sin decir |
| M4 chip 14 nov | S6 agente-ia | chips dinámicos | — |
| M5 canchas Mendoza | S6 agente-ia | sacar ATC | convenio EasyCancha |
| M6 clima | servidor; S6 | máxima en el prompt | puntaje por calor |
| M7 camino social | S6 / codex-gru | — | pasar lugar y clima |

## Fuentes consultadas (relevamiento)

- [Google Maps Platform, precios](https://developers.google.com/maps/billing-and-pricing/pricing) y [análisis de precios de Places 2026 (tercero)](https://openplacesapi.com/blog/google-places-api-pricing)
- [Foursquare, precios](https://foursquare.com/pricing/)
- [Open-Meteo, términos](https://open-meteo.com/en/terms)
- [Overpass API, wiki de OSM](https://wiki.openstreetmap.org/wiki/Overpass_API)
- [Ticketmaster, getting started](https://developer.ticketmaster.com/products-and-docs/apis/getting-started/)
- [Eventbrite: retiro de la búsqueda pública](https://github.com/Automattic/eventbrite-api/issues/83)
- [EasyCancha en Pauta (escala en Chile)](https://www.pauta.cl/ciudad/2023/07/21/easycancha-start-up-encontrar-cancha-deportes-40-disciplinas-app.html)
