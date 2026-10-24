-- CRUCE · 0044 · Enmienda 13 (d) (docs/contrato-enmienda-13.md; D1 aprobada por Nico 20:51): asado en lugar neutro.
-- Fila de catálogo `lugar-sim-14` exactamente como en docs/catalogo-ampliado.md (apertura). Solo datos: sin columna
-- tipo_lugar ni cambios de funciones. Con la regla de equidad de viaje (E10), en el demo la parrilla (Providencia)
-- puede ganarle al quincho (Ñuñoa) a igual puntaje.
insert into cruce.catalogo_agente
  (id, orden, actividad, actividad_etiqueta, lugar_nombre, zona, precio, techado, energia, ambiente, titulo_plantilla,
   sab_inicio, sab_fin, dom_inicio, dom_fin) values
  ('lugar-sim-14', 14, 'asado', 'Asado', 'Parrilla del parque (Simulación)', 'providencia', 'barato', true, 'algo_tranquilo', 'tranquilo',
   'Asado en una parrilla del parque', '14:00', '17:00', '14:00', '17:00');

select cruce.verificar_privilegios();
