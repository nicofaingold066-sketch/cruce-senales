-- Reversa de la 0051 (fiesta con domingo). NO es una migración: se corre a mano solo si rompe producción.
begin;
update cruce.catalogo_agente
   set dom_inicio = null, dom_fin = null, titulo_plantilla = 'Fiesta del sábado'
 where id = 'evento-sim-01';
commit;
