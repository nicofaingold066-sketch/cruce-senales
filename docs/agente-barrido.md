# Barrido: actividades, variables y fuentes para el agente de CRUXE

Dueño: agente-ia. Pedido de Nico. Viernes 23 oct 2026, 17:40 (hora del reloj, Santiago). Es investigación: no cambia el código ni la demo.

**Pregunta:** ¿qué puede proponer el agente a un grupo de amigos, qué tiene que saber para proponerlo bien, y a qué fuentes reales se puede conectar en Santiago y en Mendoza?

**Respuesta corta:**
- El agente hoy decide con **6 variables por persona y 1 de contexto**, sobre un catálogo ficticio de 5 planes. El paso siguiente es agrandar el catálogo (de 5 a unas 40 actividades) y sumar 4 variables de contexto que son gratis y no tocan datos de nadie.
- **Canchas:** no hay ninguna API pública de disponibilidad en Santiago ni en Mendoza. Se puede **enlazar** a la búsqueda real (ATC en Mendoza, EasyCancha en Santiago) y la disponibilidad de verdad requiere un acuerdo.
- **Eventos:** la cartelera oficial del Ministerio de las Culturas (Chile Cultura) se puede leer gratis y sin clave para Santiago. Para Mendoza no hay un feed abierto.
- **Restaurantes y bares "con onda":** Google Places es la única fuente que trae el ambiente ya armado (música en vivo, terraza, bueno para grupos, tragos, precio), con 1.000 consultas gratis al mes. Reservar por API no se puede sin alianza.
- **Contexto:** con la misma consulta de clima que ya usamos se suman puesta de sol, índice UV, viento, sensación térmica y calidad del aire. También hay alertas oficiales y feriados gratis.

Método: cuatro búsquedas web en paralelo sobre fuentes oficiales y actuales (23 oct 2026), con algunas consultas de prueba sin registrarse ni usar claves. Lo que no se pudo confirmar está marcado. Hay detalle por fuente en las tablas.

## 1. Las variables del agente

### Lo que usa hoy (en producción)
| Quién | Variable | Valores | Cómo se usa |
|---|---|---|---|
| Cada persona, privado | Presupuesto | da igual · algo barato · ojalá gratis | El plan más caro que acepta el grupo es el del presupuesto más bajo |
| | Energía | con todo · algo tranquilo | Suma puntos lo que coincide con la mayoría |
| | Ambiente | fiesta · tranquilo · da igual | Ídem |
| | Lugar | da igual · prefiero bajo techo | Si alguien pide techo y llueve, se descarta lo de aire libre |
| | Me gustaría | asado, pádel, fútbol, parque, fiesta (1 a 5) | Cada elección suma 3 puntos a esa actividad |
| | Que el agente las use | sí · no | Desmarcada, cuenta como si no hubiera guardado (enmienda 8) |
| | Disponibilidad por franja | sí · no · pendiente | La usa el plan, no el agente: decide qué horario sirve |
| Contexto | Clima de Santiago | seco · lluvia · desconocido, sábado y domingo | Descarta aire libre con lluvia y suma puntos con sol |
| Oferta | Catálogo (5 planes ficticios) | actividad, precio, techado, energía, ambiente, horarios | Lo que se puede proponer |

Reglas de privacidad que ya rigen y que cualquier variable nueva tiene que respetar:
- Opciones cerradas, sin texto libre.
- Lo de cada persona lo ve solo el servidor.
- El grupo ve totales, y solo con 4 personas o más y con una actividad elegida por al menos 2.
- El modelo de IA recibe opciones ya filtradas y totales, nunca a una persona.

### Variables que convendría sumar
| Variable | Para qué | Cómo pedirla sin exponer a nadie | Prioridad |
|---|---|---|---|
| **Zona** (comuna en Santiago, departamento en Mendoza) | Elegir un lugar que les quede a todos | Se guarda solo el código de la zona, nunca una dirección ni coordenadas | Alta (ver §1.1) |
| **Cómo se mueve** | Que nadie quede afuera por no tener cómo llegar | Auto · transporte público · bici o a pie · necesito que me lleven (§1.1) | Alta |
| Tiempo máximo de viaje | Descartar lo que queda lejos | 15 · 30 · 45 · 60+ minutos | Alta (§1.1) |
| Puedo llevar gente | Cubrir a quien no tiene movilidad | Si tiene auto: 0 · 1 · 2 · 3 o más lugares | Media (§1.1) |
| Momento del día | Mañana, tarde o noche | Opción cerrada | Alta |
| Comida | Vegetariano, vegano o sin gluten, para elegir restaurante | Solo como filtro del servidor ("que tenga opción vegetariana"), nunca como total visible: en un grupo chico delata a alguien. Sin gluten roza un dato de salud: pedirlo como "necesito opción sin gluten" y tratarlo igual | Media |
| Alcohol | Bar o no bar | sí · prefiero sin · da igual | Media |
| Acompañantes | Niños o mascota | Opción cerrada | Baja |
| **Lo que el grupo hizo antes** | No repetir siempre el asado; variar | Es del grupo, no de una persona: "hace 3 juntas que es asado" | Alta |
| Cada cuánto se juntan | Medir si el plan "volvió a pasar" (el problema del caso) | Lo calcula el servidor con las propuestas confirmadas | Media |
| Cómo les fue | "¿Se juntaron? ¿Les gustó?" después de la fecha | Una pregunta cerrada al grupo; es el dato propio más valioso para mejorar las propuestas | Alta (después de la demo) |

### 1.1 Distancia y movilidad (pedido de Nico)
**La idea:** el agente mira cuánto tiene que viajar cada integrante y prefiere el plan en el que **nadie viaja demasiado**, en vez del que queda bien para la mayoría y lejísimos para uno. Además, si alguien no tiene cómo moverse, el plan tiene que quedarle a mano o tiene que haber quién lo lleve.

**Qué marca cada uno (en privado, opciones cerradas):**
- **Zona:** su comuna (Santiago) o departamento (Mendoza). Nunca la dirección ni la ubicación del teléfono.
- **Cómo se mueve:** auto · transporte público · bici o a pie · necesito que me lleven.
- **Hasta cuánto viaja:** 15 · 30 · 45 · 60 o más minutos.
- **Si tiene auto, a cuántos puede llevar:** 0 · 1 · 2 · 3 o más.

**Cómo decide el servidor (reglas fijas, como hoy con el presupuesto y el techo):**
1. Para cada lugar candidato calcula el tiempo de viaje de cada persona **según cómo se mueve**: auto con la tabla de auto, transporte público con la de micro y metro, bici o a pie con la suya. La tabla es de zona a zona y se calcula una sola vez (§3, Contexto).
2. **Descarta** el lugar si a alguien le supera su tiempo máximo.
3. **No deja a nadie sin cómo llegar.** Sea N la cantidad de personas que marcaron "necesito que me lleven":
   - El plan sirve si queda dentro de su tiempo a pie o en transporte público, o si las personas con auto ofrecen en total al menos N lugares.
   - Si no hay lugares suficientes, se descarta.
   - Un asado en casa de alguien del grupo usa la zona de esa casa, con permiso de quien la ofrece.
4. **Ordena por equidad:** primero el plan cuyo viaje más largo es el más corto ("nadie viaja más de 30 minutos"), y después el de menos minutos sumados. Esto se suma a los puntos de gustos, ritmo y clima que ya existen.
5. Más adelante: si las últimas juntas le quedaron lejos siempre a la misma zona, la próxima le da prioridad a esa zona (el servidor lo sabe por las propuestas confirmadas).

**Qué ve el grupo y qué no:**
- El grupo ve **un solo número**: "queda a menos de 35 minutos para todos". Nunca el tiempo de cada uno, ni quién vive dónde, ni quién no tiene auto.
- La explicación del agente no dice "porque alguien no tiene auto". El modelo de IA recibe solo "viaje máximo: 35 minutos" y "hay lugar en auto para quien lo necesita", nunca una zona ni una persona.
- "Necesito que me lleven" puede decir algo de la situación de alguien (como el presupuesto), así que se trata igual que el presupuesto: solo lo ve el servidor y nunca aparece en totales.
- Organizar el viaje en sí (quién pasa a buscar a quién) lo hacen ellos, por fuera del agente, si quieren. Más adelante, un botón opcional "pido que me lleven" que la persona decide mostrar.
- **Límite que hay que aceptar:** en un grupo chico, si el plan siempre cae cerca de una misma comuna, alguien puede sospechar por qué. El agente no lo confirma ni lo explica, y la equidad del punto 5 reparte los lugares.

**Qué hace falta:**
- **Datos:** las tablas zona a zona. En auto, bici y a pie, con OSRM u OpenRouteService (gratis). En micro y metro de Santiago, con el GTFS de la DTPM. Mendoza no tiene GTFS público vigente: ahí se usaría el tiempo en auto por un factor, rotulado como estimado.
- **Producto:** las 4 preguntas nuevas en "Mis preferencias".
- **Catálogo:** la zona de cada lugar.
- **Base:** una enmienda al contrato y una migración. No entra antes de la demo: después del sábado a las 12:00 no hay migraciones.

**Para el pitch:** "El agente no elige el lugar que le queda bien a la mayoría: elige el que le queda razonable a todos, incluida la persona que no tiene auto, sin contarle a nadie quién es."

**Bienestar (lo que pidió Nico, "si se siente mal"):** no conviene preguntar salud ni ánimo; son datos sensibles y en un grupo de amigos se adivina quién fue. Hoy se cubre con "energía: algo tranquilo", que dice lo mismo para el plan sin decir por qué. Se puede sumar "esta semana prefiero algo corto" con la misma lógica.

### Contexto nuevo, gratis y sin datos personales
| Variable | Regla posible | Fuente |
|---|---|---|
| Puesta de sol | Un cerro o un parque terminan antes de que oscurezca | Open-Meteo (la misma consulta de hoy) |
| Índice UV y sensación térmica | UV muy alto o calor: sombra, bajo techo o al atardecer | Open-Meteo |
| Ráfagas de viento | En Mendoza, el zonda baja la prioridad de lo de aire libre | Open-Meteo + alertas del SMN |
| Calidad del aire | Mala calidad del aire en Santiago: deporte bajo techo | Open-Meteo Air Quality (aproximación, no dato oficial) |
| Alertas oficiales | Alerta de calor, tormenta o viento: nada de cerros | DMC (Chile) y SMN (Argentina), feeds públicos |
| Feriados y fines de semana largos | Un fin de semana largo permite una escapada | Boostr (Chile) y ArgentinaDatos (Argentina) |
| Fin de mes o quincena | Heurística de presupuesto, no un dato | No es una API |

## 2. Barrido de actividades para un grupo de amigos
Cada actividad con lo que la decide: costo, si depende del clima y la hora, si necesita reserva, de qué tamaño de grupo es y qué fuente podría alimentarla. Hoy el catálogo tiene solo las cinco marcadas con ★.

| Tipo | Actividades | Costo | Clima / hora | Reserva | Grupo | Fuente posible |
|---|---|---|---|---|---|---|
| **En casa** | ★ Asado; cocinar juntos (pizzas, sushi); once o brunch; completada; juegos de mesa; ver un partido o una película; karaoke en casa | gratis a barato | Bajo techo (asado: quincho o patio) | No | 3 a 15 | Propia: lugar de alguien del grupo, con permiso |
| **Comer y tomar afuera** | Restaurante; picada; cervecería; bar de tragos; wine bar; terraza; café; feria gastronómica o food trucks; bodega y cata (Mendoza) | barato a caro | Terraza con buen tiempo | A veces | 2 a 12 | Google Places (ambiente, precio, horario, "bueno para grupos"); bodegas curadas a mano |
| **Deporte con cancha** | ★ Pádel; tenis; ★ fútbol 5 / 7 / 11; básquet; vóley; squash; golf y driving range | barato a medio | Techadas o al aire libre; mañana o tarde | Sí | 2 a 22, según el deporte | ATC (Mendoza) y EasyCancha (Santiago) por enlace; Google Places como directorio |
| **Juegos y experiencias** | Bowling; karting; escape room; laser tag o paintball; escalada en muro; trivia de bar; arcade | medio | Bajo techo | Casi siempre | 4 a 10 | Google Places (directorio) y enlace |
| **Aire libre sin reserva** | ★ Parque y picnic; cerro o trekking (San Cristóbal, Manquehue; Cerro Arco en Mendoza); bici o CicloRecreoVía; running; playa en el día | gratis | Depende del clima, el UV y la luz | No (parques nacionales: entrada con cupo) | 2 a 20 | OpenStreetMap (parques, senderos, ciclovías) + clima ampliado y alertas |
| **Naturaleza fuera de la ciudad** | Cajón del Maipo; Valle de Uco; termas (Cacheuta); rafting (Potrerillos); nieve en invierno | medio a caro | Muy dependiente del clima y la temporada | A veces | 2 a 10 | Curado a mano; CONAF no tiene API de apertura |
| **Cultura y charlas** | Charlas y meetups; museos y exposiciones; teatro; stand-up; cine; talleres (cerámica, cocina); visitas guiadas; ferias | gratis a medio | Bajo techo; horario fijo | A veces (entrada) | 2 a 10 | **Chile Cultura** (Santiago, muchos gratis); TMDB para cartelera de cine; enlaces a ticketeras |
| **Música y noche** | ★ Fiesta; recitales; bar con música en vivo; karaoke; peña; salsa | medio | Noche | Entrada | 2 a 15 | Google Places (música en vivo, horario de cierre); enlaces a ticketeras (Puntoticket, Passline, Ticketplus, Entradaweb) |
| **Ver deporte** | Partido en el estadio; ver el partido en un bar | barato a medio | Fecha fija | Entrada | 2 a 20 | **API-Football** (fixture de Chile y Argentina, gratis con registro) |
| **Escapadas** | Fin de semana en una cabaña o en la costa | caro | Fin de semana largo | Sí | 2 a 10 | Feriados + curado a mano |
| **Tranquilo** | Caminata suave; yoga en el parque; spa o termas; café largo | gratis a caro | Bajo techo o día lindo | A veces | 2 a 8 | Mismas fuentes que arriba |

## 3. Fuentes a las que se puede conectar
Leyenda de factibilidad para un equipo chico: **ya** (horas), **con trabajo** (días), **con acuerdo** (hay que hablar con la empresa), **no**.

### Canchas (pádel, tenis, fútbol)
| Fuente | Dónde sirve | Qué da | Factibilidad |
|---|---|---|---|
| **ATC Sports (AlquilaTuCancha)** | Mendoza: 52 clubes de pádel (210 canchas), 38 de fútbol, más squash, tenis y básquet (contado hoy). Santiago: nada | Sin API pública. **Enlace probado** con deporte, día y hora que abre los turnos reales: `atcsports.io/results?tipoDeporte=7&dia=2026-10-31&horario=20:00&placeId=66phckevp&locationName=Mendoza` (pádel = 7, tenis = 8, fútbol 5 = 2, fútbol 7 = 3) | Enlace: **ya**. Disponibilidad: **con acuerdo** |
| **EasyCancha** | Santiago: 181 clubes en la RM (Las Condes, Colina, Lo Barnechea, La Reina, Maipú, Huechuraba…). Mendoza: nada | Sin API pública. Sus términos **prohíben** recolectar datos de forma automática y el uso comercial del contenido. Enlace solo al buscador general | **Con acuerdo**. No raspar |
| Playtomic | Casi no tiene clubes en las dos ciudades | API solo para el propio club | **No** |
| Google Places | Las dos | Directorio: nombre, lugar, horario y rating, sin disponibilidad. Tiene el tipo `tennis_court`; pádel y fútbol se buscan por texto | **Ya**, con clave y tope de gasto |

Lo que el agente puede decir hoy: "posibles canchas cerca: ver disponibilidad", nunca "hay cancha".

### Eventos, charlas y fiestas
| Fuente | Dónde sirve | Qué da | Factibilidad |
|---|---|---|---|
| **Chile Cultura** (Ministerio de las Culturas) | Santiago: 210 eventos en la RM, consultados hoy | Acceso público y sin clave, no documentado, que se encontró en el sitio. Filtra por comuna, fecha, disciplina y gratis; trae enlace a cada evento. No trae precio ni entradas disponibles | **Ya**, pidiendo permiso o al menos atribuyendo, porque puede cambiar |
| API-Football | Chile y Argentina (Mendoza: Godoy Cruz e Independiente Rivadavia) | Fixture con fecha y estadio | **Ya** (gratis con registro, 100 consultas por día) |
| Ticketmaster Discovery | Chile y Argentina figuran, pero no se confirmó que tenga eventos de acá | Fechas, salas, precios | **Con trabajo** (clave gratis; hay que probarlo) |
| TMDB | Las dos | Películas en cartelera (sin horarios) | **Ya**, pero gratis solo sin fines comerciales |
| Eventbrite, Meetup, Luma | Santiago y Mendoza tienen eventos | La búsqueda pública cerró (Eventbrite) o pide plan pago (Meetup) | Solo **enlace** |
| Puntoticket, Passline, Ticketplus, Entradaweb, Ticketek | Las dos | Sin API; algunas prohíben el acceso automático | Solo **enlace**; feed **con acuerdo** |
| Agenda de Mendoza (gobierno provincial) | Mendoza | Tiene el sistema pero el acceso está cerrado | **Con acuerdo** (pedir el feed) |
| SerpApi (Google Events) | Las dos | Lo que Google tenga indexado | Técnicamente fácil, **riesgo legal** (juicio de Google en curso). No usar como base |

### Restaurantes, bares y lugares "con onda"
| Fuente | Qué da para la "vibra" | Costo y términos | Factibilidad |
|---|---|---|---|
| **Google Places (New)** | `goodForGroups`, `liveMusic`, `outdoorSeating`, `servesCocktails`, `servesBeer`, `servesWine`, `reservable`, `priceLevel`, horario, rating y un resumen de reseñas en español. Tipos nuevos: `cocktail_bar`, `brewpub`, `live_music_venue`, `chilean_restaurant`, `argentinian_restaurant`, `winery` | Búsqueda con esos campos: 1.000 gratis al mes y después unos 40 dólares cada 1.000. Solo se puede guardar el identificador del lugar; no se puede mostrar en un mapa que no sea de Google; hay que atribuir. Pasar ese contenido a un modelo para redactar es zona gris | **Ya**, con clave y tope de gasto |
| Maps Grounding Lite (Google) | Lo mismo, pensado para que un modelo de IA lo use (incluye clima y rutas) | 10.000 eventos gratis al mes; es la vía que los términos de Google permiten para generar texto | **Con trabajo** |
| Foursquare | Gustos, atributos, precio, horas pico (todo en el plan pago) | 18,75 dólares cada 1.000 | Con trabajo; menos cobertura |
| OpenStreetMap | Ubica 4.471 lugares en Santiago y 692 en Mendoza, pero casi sin datos de ambiente (8 % con horario, 6 % con terraza, 0 % con música en vivo; medido hoy) | Gratis y se puede guardar | Sirve para ubicar, no para elegir por ambiente |
| Reservas: Woki, Meitre, CoverManager | Mesas disponibles | Sin API pública | **Con acuerdo**. TheFork se fue de la región; OpenTable no está |
| Bodegas de Mendoza | Unas 230 abiertas al turismo; Wineobs reúne más de 100 | Sin API | Curar unas 20 a mano |

**Cómo se traduce "vibra" a datos concretos:**
- **Fiesta:** bar, bar de tragos, pub, cervecería, discoteca o karaoke, con música en vivo o tragos y que cierre después de la 1:00.
- **Tranquilo:** café, casa de té o wine bar, sin música en vivo.
- **Grupo:** "bueno para grupos" más "acepta reservas".
- **Presupuesto:** nivel de precio.
- **Lluvia:** sin cervecería al aire libre.
- **Sol:** suma la terraza.
- **Calidad:** rating mínimo y una cantidad mínima de reseñas.

### Contexto
| Fuente | Qué da | Costo y términos | Factibilidad |
|---|---|---|---|
| **Open-Meteo** (ya la usamos) | Puesta de sol, UV, ráfagas, sensación térmica, probabilidad de lluvia; calidad del aire aparte. Una consulta trae Santiago y Mendoza | Sin clave. **El plan gratis es solo para uso no comercial**: si CRUXE cobra o tiene publicidad, hace falta un plan pago. Pide atribución con enlace: hoy la pantalla dice "(pronóstico de Open-Meteo)", sin enlace | **Ya** |
| Alertas DMC (Chile) y SMN (Argentina) | Avisos oficiales de calor, viento y tormenta | Gratis, sin clave (probado) | **Ya** |
| Feriados: Boostr (Chile) y ArgentinaDatos (Argentina) | Feriados y fines de semana largos, al día | Gratis (la API de feriados del gobierno chileno está caída) | **Ya** |
| Tiempos de viaje: OSRM u OpenRouteService; GTFS de la DTPM para micro y metro en Santiago | Tabla de tiempos comuna a comuna, calculada una sola vez | Gratis; Google no sirve para esto porque prohíbe guardar la tabla | **Con trabajo** |
| Cortes de tránsito, marchas, estado de parques nacionales | — | No hay fuentes abiertas | **No** |

## 4. Cómo se arma, sin romper la privacidad
1. **El servidor sigue decidiendo.** Las fuentes nuevas alimentan el catálogo de candidatas; el servidor descarta y ordena con reglas fijas, como hoy.
2. **El modelo sigue viendo solo opciones y totales.** Si se usa Google para lugares, que el texto lo arme el servidor con datos propios, o usar Grounding Lite, que es la vía que Google permite para un modelo.
3. **Ubicación por zona, no por persona.** Cada uno elige su comuna o departamento y cómo se mueve. Se calcula una tabla de tiempos zona a zona y se elige el lugar que minimiza el viaje más largo del grupo, sin dejar afuera a quien no tiene movilidad (§1.1).
4. **Enlazar, no reservar.** Hasta que haya acuerdos, el agente propone y deriva con un enlace a la búsqueda real (ATC, EasyCancha, la ticketera, Google Maps). Nunca dice "disponible" ni "reservado", como hoy.
5. **Lo que se puede guardar es lo propio.** El catálogo curado, los identificadores de lugares y la respuesta del grupo después del plan ("¿se juntaron?"). Los datos de Google o Foursquare no se guardan.

## 5. Propuesta por etapas
**Para la demo (sábado):** no tocar nada. El agente está probado en producción con el modelo real. En el pitch se puede contar que el catálogo es de simulación y que las fuentes reales están estudiadas: canchas por enlace, eventos de Chile Cultura y lugares con ambiente vía Google. Si sobra tiempo antes del corte de las 10:00, lo único chico, sin costo y sin riesgo es poner el enlace a Open-Meteo en "(pronóstico de Open-Meteo)".

**Primeras semanas:**
1. Agrandar el catálogo a unas 40 actividades de la tabla 2, con los mismos atributos de hoy más duración, momento del día y tamaño de grupo.
2. Sumar el clima ampliado, las alertas y los feriados.
3. Sumar los eventos gratis de Chile Cultura como candidatas, con enlace y atribución.
4. Sumar el fixture de fútbol.
5. Sumar distancia y movilidad (§1.1: zona, cómo se mueve, tiempo máximo, a cuántos puede llevar), momento del día y comida, con las reglas de privacidad de siempre.
6. Restaurantes y bares con Google Places, con tope de gasto.
7. Botones "ver canchas" con el enlace de ATC (Mendoza) y de Google Maps o EasyCancha (Santiago).
8. Preguntar "¿se juntaron?" después de cada plan.

**Con alianzas:**
- EasyCancha y ATC, para disponibilidad real de canchas. El argumento: CRUXE les lleva grupos ya decididos.
- Ticketeras locales, para feeds de eventos a cambio de tráfico.
- Woki, Meitre o CoverManager, para reservas de mesa.
- Gobierno de Mendoza, para su agenda cultural.

## 6. Decisiones para Nico
- **Ciudad primero:** Santiago (EasyCancha, Chile Cultura, más datos) o Mendoza (ATC con enlace a turnos reales, bodegas).
- **Gasto:** Google Places cuesta después de las 1.000 consultas gratis por mes. Hay que poner un tope de gasto en Google Cloud, como con el Gateway.
- **Si CRUXE cobra:** Open-Meteo, TMDB y el plan gratis de algunas fuentes pasan a pago o a licencia.
- **Contactos:** quién escribe a EasyCancha y ATC, y al Ministerio de las Culturas por el uso de su cartelera.

## Sin confirmar
- Si Ticketmaster tiene eventos de Chile o Argentina.
- Si el plan gratis de API-Football incluye la temporada actual de las dos ligas.
- La cobertura real de Foursquare y Tripadvisor en estas ciudades.
- Si el plan gratis de OpenRouteService permite uso comercial.
- Cómo se obtiene el acceso a la API de la Dirección Meteorológica.
- Los parámetros del enlace de ATC, que no están documentados y pueden cambiar.
