# Catálogo ampliado (enmienda 10, Parte B): filas exactas

Dueño: apertura. Pedido #95. Para backend (migración de la Parte B, corte 23:00 del viernes 23 oct). Todo ficticio: ningún lugar ni nombre es real; cada `lugar_nombre` termina en ` (Simulación)`.

Base: forma de `cruce.catalogo_agente` de `0014_enmienda4_esquema.sql` (columnas `id, orden, actividad, actividad_etiqueta, lugar_nombre, precio, techado, energia, ambiente, titulo_plantilla, sab_inicio, sab_fin, dom_inicio, dom_fin`) más la columna `zona` de la Parte A.

## Lo que el catálogo exige (leído de 0014 y 0031)
- **Una candidata necesita horario los dos días.** `proponer_plan_borrador` filtra `sab_inicio is not null and dom_inicio is not null`. Por eso las 8 filas nuevas tienen sábado Y domingo (la fila `evento-sim-01` de fiesta tiene domingo vacío y hoy nunca sale como candidata; no la toco).
- **Fin menor o igual al inicio = cruza la medianoche** (`cruce.plan_franjas` suma un día). Lo usa el bar (21:00 a 01:00).
- **`orden` es único** y desempata (después del precio). Las nuevas van de 6 a 13, así que ante un empate ganan las cinco actuales.
- **`precio`** se compara con el presupuesto del grupo (`gratis`=0, `barato`=1, `medio`=2). **`techado=false`** se descarta con lluvia si alguien pidió bajo techo.
- **Un solo momento del día por fila.** Sábado y domingo de cada fila empiezan en el mismo tramo (mañana antes de las 13, tarde de 13 a 19, noche después de las 19), para que la regla de `momento` (enmienda 10, punto 4) no sea ambigua.

## Las ocho filas
| id | orden | actividad | actividad_etiqueta | lugar_nombre | zona | precio | techado | energía | ambiente | titulo_plantilla | sábado | domingo | momento |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `lugar-sim-06` | 6 | `cena` | Cena | Restaurante de la esquina (Simulación) | `providencia` | medio | sí | algo_tranquilo | tranquilo | Cena en un restaurante | 20:30–23:30 | 20:00–22:30 | noche |
| `lugar-sim-07` | 7 | `bar` | Bar | Bar con música en vivo (Simulación) | `nunoa` | medio | sí | con_todo | fiesta | Tragos en un bar | 21:00–01:00 | 20:00–23:00 | noche |
| `lugar-sim-08` | 8 | `juegos_casa` | Juegos en casa | Casa con mesa grande (Simulación) | `la_florida` | barato | sí | algo_tranquilo | tranquilo | Tarde de juegos de mesa en casa | 17:00–21:00 | 16:00–20:00 | tarde |
| `lugar-sim-09` | 9 | `cine` | Cine | Cine del centro comercial (Simulación) | `las_condes` | barato | sí | algo_tranquilo | tranquilo | Ir al cine | 16:00–19:00 | 15:30–18:30 | tarde |
| `lugar-sim-10` | 10 | `cultura` | Cultura | Museo y feria del centro (Simulación) | `santiago_centro` | gratis | sí | algo_tranquilo | tranquilo | Museo o feria de arte | 11:00–14:00 | 11:00–14:00 | mañana |
| `lugar-sim-11` | 11 | `juegos_salida` | Bowling y escape room | Sala de juegos del barrio (Simulación) | `maipu` | medio | sí | con_todo | fiesta | Bowling o escape room | 19:30–22:30 | 19:30–22:30 | noche |
| `lugar-sim-12` | 12 | `cerro` | Cerro | Sendero del cerro (Simulación) | `vitacura` | gratis | no | con_todo | tranquilo | Caminata por el cerro | 09:00–12:30 | 09:00–12:30 | mañana |
| `lugar-sim-13` | 13 | `cafe` | Café y brunch | Café de la plaza (Simulación) | `puente_alto` | barato | sí | algo_tranquilo | tranquilo | Brunch en un café | 10:30–13:00 | 10:30–13:00 | mañana |

Cobertura de momentos entre todas las filas (con las cinco actuales): mañana 3 nuevas + pádel, fútbol y parque; tarde 2 nuevas + asado; noche 3 nuevas + fiesta. Zonas: las ocho comunas aparecen exactamente una vez entre las nuevas.

Las etiquetas (`actividad_etiqueta`) son las que ve la persona en los chips de "Me gustaría" y en la tarjeta, y son las que usa `perfil_grupo.gustos`. Están en español, cortas y sin asumir asado.

## SQL listo para pegar (se ajusta al esquema de 0014 más `zona`)
```sql
-- 1) ampliar la lista cerrada de actividades del catálogo y de me_gustaria (nombres de los check según el esquema real)
--    actividad in ('asado','padel','futbol','parque','fiesta','cena','bar','juegos_casa','cine','cultura','juegos_salida','cerro','cafe')
--    me_gustaria <@ array[... las mismas 13 ...]
-- 2) filas nuevas
insert into cruce.catalogo_agente
  (id, orden, actividad, actividad_etiqueta, lugar_nombre, zona, precio, techado, energia, ambiente, titulo_plantilla,
   sab_inicio, sab_fin, dom_inicio, dom_fin) values
  ('lugar-sim-06', 6, 'cena', 'Cena', 'Restaurante de la esquina (Simulación)', 'providencia', 'medio', true, 'algo_tranquilo', 'tranquilo',
   'Cena en un restaurante', '20:30', '23:30', '20:00', '22:30'),
  ('lugar-sim-07', 7, 'bar', 'Bar', 'Bar con música en vivo (Simulación)', 'nunoa', 'medio', true, 'con_todo', 'fiesta',
   'Tragos en un bar', '21:00', '01:00', '20:00', '23:00'),
  ('lugar-sim-08', 8, 'juegos_casa', 'Juegos en casa', 'Casa con mesa grande (Simulación)', 'la_florida', 'barato', true, 'algo_tranquilo', 'tranquilo',
   'Tarde de juegos de mesa en casa', '17:00', '21:00', '16:00', '20:00'),
  ('lugar-sim-09', 9, 'cine', 'Cine', 'Cine del centro comercial (Simulación)', 'las_condes', 'barato', true, 'algo_tranquilo', 'tranquilo',
   'Ir al cine', '16:00', '19:00', '15:30', '18:30'),
  ('lugar-sim-10', 10, 'cultura', 'Cultura', 'Museo y feria del centro (Simulación)', 'santiago_centro', 'gratis', true, 'algo_tranquilo', 'tranquilo',
   'Museo o feria de arte', '11:00', '14:00', '11:00', '14:00'),
  ('lugar-sim-11', 11, 'juegos_salida', 'Bowling y escape room', 'Sala de juegos del barrio (Simulación)', 'maipu', 'medio', true, 'con_todo', 'fiesta',
   'Bowling o escape room', '19:30', '22:30', '19:30', '22:30'),
  ('lugar-sim-12', 12, 'cerro', 'Cerro', 'Sendero del cerro (Simulación)', 'vitacura', 'gratis', false, 'con_todo', 'tranquilo',
   'Caminata por el cerro', '09:00', '12:30', '09:00', '12:30'),
  ('lugar-sim-13', 13, 'cafe', 'Café y brunch', 'Café de la plaza (Simulación)', 'puente_alto', 'barato', true, 'algo_tranquilo', 'tranquilo',
   'Brunch en un café', '10:30', '13:00', '10:30', '13:00');
```

## Zona de las cinco filas existentes (sugerencia, decide backend)
La Parte A pide `zona` en toda fila. Para que la equidad de viaje tenga con qué comparar, conviene repartirlas distinto de las nuevas: `lugar-sim-01` asado → `nunoa`; `lugar-sim-02` pádel → `las_condes`; `lugar-sim-03` fútbol → `maipu`; `lugar-sim-04` parque → `providencia`; `evento-sim-01` fiesta → `santiago_centro`. (El asado del demo sigue siendo "Quincho de Tomi (Simulación)"; la zona es de simulación, no de nadie.)

## Efectos que backend y el resto del equipo deberían revisar
1. **Chips de "Me gustaría"**: ya se arman con `opciones.actividades` que devuelve el servidor (`src/agente/AgentePanel.tsx`), así que las ocho nuevas aparecen solas. El tope de la columna es de 6 marcas por persona; con 13 opciones conviene dejarlo en 6.
2. **Dependen de los nombres de actividad** (no hay que tocarlos, solo no romperlos): `src/agente/canchas.ts` (`padel`, `futbol`, `tenis`: las nuevas no tienen enlace de canchas, y está bien); el panel de gustos usa `actividad_etiqueta`.
3. **Pruebas**: la prueba 8 de la enmienda ("las actividades nuevas se pueden marcar y aparecen como candidatas") pasa con estas filas. Para cada una, una persona que la marque junto con otra (el mínimo de 2 gustos) debería ver la actividad entre las candidatas, salvo que el presupuesto o el techo la descarten: `cerro` cae si alguien pide bajo techo con lluvia; `cena`, `bar` y `juegos_salida` caen con "ojalá gratis"; `cine`, `juegos_casa` y `cafe` caen con "ojalá gratis" pero entran con "algo barato".
4. **Cobertura de privacidad**: ninguna fila nombra a una persona real ni a una dirección. Los nombres de lugar son genéricos y llevan la etiqueta de simulación.
5. **Textos de la tarjeta**: `titulo_plantilla` se muestra tal cual. Ninguno asume asado ni anfitrión.

## Siguiente (no entra hoy)
La ampliación a unas 40 actividades y el cruce con fuentes reales está en `docs/agente-barrido.md` §2 y §5; este catálogo es el primer paso.
