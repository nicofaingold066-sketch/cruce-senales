-- CRUCE · 0051 · Fiesta candidata del agente (pedido de Nico 00:01, vía coordinador; levanta el límite del ajuste 8 de
-- la enmienda 14). Solo datos: `evento-sim-01` tenía solo sábado (23:00–03:00) y las candidatas exigen sábado Y
-- domingo, así que la fiesta nunca salía. Se le suma domingo 22:00–02:00 (fin al día siguiente: cruce.plan_franjas
-- suma un día cuando fin <= inicio) y un título que sirve para los dos días. Mismo formato que 0038: lugar ficticio
-- terminado en "(Simulación)", un solo momento del día (noche). Sin funciones ni firmas nuevas (41/0).
update cruce.catalogo_agente
   set dom_inicio = '22:00', dom_fin = '02:00', titulo_plantilla = 'Fiesta en un bar'
 where id = 'evento-sim-01';

select cruce.verificar_privilegios();
