-- CRUCE · 0038 · Enmienda 10, Parte B (docs/contrato-enmienda-10.md, mejora #86): catálogo más amplio, para no
-- quedar atados al asado. Filas exactas de la sesión apertura (docs/catalogo-ampliado.md, rama wip/apertura,
-- commit ccf168f): cena, bar, juegos en casa, cine, cultura, bowling o escape room, cerro y café. Todo ficticio:
-- cada lugar_nombre termina en "(Simulación)" y ninguna zona es la de una persona.
--   * Se amplía la lista cerrada de actividades del catálogo y de preferencias.me_gustaria a las 13.
--   * Cada fila nueva tiene horario el sábado Y el domingo (las candidatas exigen los dos) y un solo momento del día
--     (mañana, tarde o noche) en los dos días. Una fin menor que el inicio cruza la medianoche (cruce.plan_franjas).
--   * `orden` 6 a 13: ante un empate completo siguen ganando las cinco de antes.
-- Sin cambios de funciones: cruce.validar_preferencias ya valida contra el catálogo, get_my_preferences arma
-- opciones.actividades desde el catálogo y proponer_plan_borrador recorre todo el catálogo. Mismas reglas de
-- privacidad y de "gustos solo con 2 o más". Sin RPC nuevas (31 authenticated, 0 anon).
-- Migración aparte de la Parte A para poder descartarla sola.

alter table cruce.catalogo_agente drop constraint catalogo_agente_actividad_check;
alter table cruce.catalogo_agente add constraint catalogo_agente_actividad_check check (actividad in (
  'asado', 'padel', 'futbol', 'parque', 'fiesta',
  'cena', 'bar', 'juegos_casa', 'cine', 'cultura', 'juegos_salida', 'cerro', 'cafe'));

alter table cruce.preferencias drop constraint preferencias_me_gustaria_check;
alter table cruce.preferencias add constraint preferencias_me_gustaria_check check (
  cardinality(me_gustaria) between 1 and 6
  and me_gustaria <@ array['asado', 'padel', 'futbol', 'parque', 'fiesta',
                           'cena', 'bar', 'juegos_casa', 'cine', 'cultura', 'juegos_salida', 'cerro', 'cafe']
  and cruce.sin_repetidas(me_gustaria));

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

select cruce.verificar_privilegios();
