-- CRUCE · 0046 · Enmienda 13, texto (pedido de psico, lote 7; aprobado por el coordinador): el mensaje de
-- no_autorizado/condiciones_congeladas quedaba falso con la enmienda 13 (quien dice "así no puedo" sí puede cambiar su
-- disponibilidad). Solo texto; cuerpo de cruce.mensaje copiado de 0042.

create or replace function cruce.mensaje(p_codigo text, p_detalle text) returns text
language sql immutable set search_path = '' as $$
  select case p_codigo || '/' || p_detalle
    when 'sesion_invalida/sin_sesion' then 'No hay una sesión válida. Recarga la página para continuar.'
    when 'entrada_incompleta/campo_faltante' then 'Falta completar un dato obligatorio.'
    when 'entrada_incompleta/formato_invalido' then 'Un dato tiene un formato inválido.'
    when 'entrada_incompleta/franjas_invalidas' then 'Las franjas deben ser exactamente dos, futuras y con fin posterior al inicio.'
    when 'entrada_incompleta/cupos_invalidos' then 'El mínimo debe ser al menos 2 y no superar al máximo; el máximo no puede superar 20.'
    when 'entrada_incompleta/plazo_invalido' then 'El cierre de aceptación debe ser futuro y no posterior al inicio de ninguna franja.'
    when 'entrada_incompleta/zona_horaria_no_soportada' then 'Por ahora solo se admite la zona horaria America/Santiago.'
    when 'entrada_incompleta/imprescindible_invalido' then 'La persona imprescindible debe ser miembro del espacio.'
    when 'entrada_incompleta/disponibilidad_invalida' then 'La disponibilidad solo admite las franjas de la propuesta con los valores si, no o pendiente.'
    when 'entrada_incompleta/nombre_en_uso' then 'Ese nombre ya está en uso en este espacio.'
    when 'entrada_incompleta/intento_reutilizado' then 'Este identificador de intento ya se usó para otra operación.'
    when 'fuera_de_audiencia/no_miembro' then 'No perteneces a este espacio o el elemento no existe.'
    when 'fuera_de_audiencia/codigo_inexistente' then 'El código de invitación no existe.'
    when 'fuera_de_audiencia/no_elegible_en_version' then 'No formas parte de las personas que pueden aceptar esta versión.'
    when 'opcion_desactualizada/version_no_vigente' then 'Esta versión ya no está vigente. Actualiza para ver la versión actual.'
    when 'opcion_desactualizada/estado_no_admite' then 'La propuesta cambió de estado y esta acción ya no aplica. Actualiza la pantalla.'
    when 'cupo_completo/sin_cupo' then 'Ya se completaron los cupos de esta versión.'
    when 'cupo_completo/reservado_imprescindible' then 'El cupo que queda está reservado para la persona imprescindible.'
    when 'plazo_vencido/plazo_vencido' then 'El plazo de aceptación ya cerró.'
    when 'sin_alternativa/sin_alternativa' then 'Sin opción compatible: no hay alternativa con las condiciones actuales.'
    when 'no_autorizado/no_es_organizador' then 'Solo el organizador de la propuesta puede hacer esto.'
    when 'no_autorizado/no_es_organizador_espacio' then 'Solo el organizador del espacio puede hacer esto.'
    when 'no_autorizado/retirado' then 'Te retiraste de esta propuesta y ya no puedes participar en ella.'
    when 'no_autorizado/condiciones_congeladas' then 'Estás en la versión vigente. Si esta fecha no te sirve, marca «Así no puedo, pero sigo» y podrás cambiar cuándo puedes.'
    when 'no_autorizado/espacio_no_demo' then 'Esta acción solo está permitida en espacios de demostración.'
    when 'no_autorizado/miembro_no_simulado' then 'Solo se puede simular a miembros marcados como Simulación.'
    when 'no_autorizado/miembro_ya_reclamado' then 'Ese lugar ya lo tomó otra persona.'
    when 'entrada_incompleta/miembro_inexistente' then 'Ese integrante no existe en este espacio.'
    when 'asiento_en_uso/asiento_en_uso' then 'Ese asiento ya tiene actividad simulada. Únete con otro nombre visible.'
    when 'intento_obsoleto/intento_obsoleto' then 'Esta solicitud pertenece a una demo ya reiniciada y no se puede repetir. Actualiza la pantalla.'
    when 'entrada_incompleta/preferencias_invalidas' then 'Las preferencias solo admiten las opciones de la lista.'
    when 'entrada_incompleta/fecha_invalida' then 'La fecha debe ser un sábado futuro dentro de los próximos 16 días.'
    when 'entrada_incompleta/pocas_preferencias' then 'Todavía no hay suficientes personas con preferencias cargadas.'
    when 'fallo_temporal/reintentar' then 'Falla temporal. Intenta de nuevo.'
    -- E11
    when 'no_autorizado/sin_aprobacion' then 'Este borrador necesita la aprobación del organizador antes de publicarse.'
    when 'opcion_desactualizada/borrador_cambiado' then 'El borrador cambió desde que se preparó. Revísalo de nuevo antes de aprobarlo o publicarlo.'
    when 'opcion_desactualizada/opcion_vencida' then 'Esa opción ya no está disponible para el grupo. Prepara otra.'
    when 'opcion_desactualizada/oportunidad_en_uso' then 'Ya hay una preparación en curso para ese sábado.'
    when 'opcion_desactualizada/ejecucion_cerrada' then 'Esa preparación ya se cerró.'
    when 'opcion_desactualizada/ejecucion_publicada' then 'Esa preparación ya se publicó.'
    when 'sin_alternativa/sin_destinatarios' then 'Nadie del grupo activó las invitaciones del agente.'
    when 'entrada_incompleta/politica_invalida' then 'La política solo admite aprobación o autónoma.'
    when 'entrada_incompleta/oportunidad_invalida' then 'La oportunidad debe ser un sábado futuro dentro de los próximos 16 días.'
    -- E13
    when 'entrada_incompleta/opinion_invalida' then 'Solo se puede decir "así no puedo" o retirar esa opinión.'
    when 'no_autorizado/ya_acepto' then 'Ya confirmaste esta versión. Si no puedes ir, primero retírate.'
    when 'sin_alternativa/tope_versiones' then 'Esta propuesta ya tuvo tres versiones. El organizador puede cerrarla o cancelarla.'
  end
$$;

select cruce.verificar_privilegios();
