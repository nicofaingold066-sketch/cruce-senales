# Agente: backend (único dueño de supabase/ y tests/backend/)

Quien edita este archivo: solo el backend. Última actualización: ~10:55 Santiago (backend).

> Aviso: el backend NO hace commit ni push (regla dura de su encargo: "el humano integra y commitea"). Este archivo queda actualizado en el worktree local `cruce-coord`; el commit/push lo hace el humano o el coordinador con su autorización.

## Tocando ahora
- `tests/backend/**` (adaptar pruebas existentes a contrato 2 y agregar regresiones A1..A5)
- Próxima migración, si hace falta tras advisors/pruebas: `supabase/migrations/0012_*`

## Estado
Aplicadas en la base (tjkfdnvzsikncjbskufm): 0001 a 0007 (v1) y 0008 a 0011 (enmienda 2).
- 0008_enmienda2_esquema: generacion y demo_de en espacios, tombstones de intentos (FK SET NULL), instante de decisión post-bloqueo (cruce.fijar_ahora/ahora), contrato 2, mensajes nuevos, cupos.reservado_imprescindible/libres_para_otros, mi_situacion.motivo_aceptar, historial.origen.
- 0009_enmienda2_privilegios: A5 (anon sin EXECUTE, solo authenticated en la lista de 25, defaults restrictivos, verificación de catálogo cruce.verificar_privilegios()).
- 0010_enmienda2_espacios: A2 (asiento_en_uso), A3 reset_demo(p_espacio_id, p_intento_id), A4 (seed único por usuario, orden de bloqueos).
- 0011_enmienda2_propuestas: A1 (reserva del imprescindible), A3 (intento_obsoleto), A4 (espacio → intento → miembro → propuesta en todas las escrituras).

## Hecho
Migraciones de la enmienda 2 aplicadas. Pendiente: pruebas reales A1..A5 y advisors.

## Siguiente
Pruebas Vitest contra la base real (A1..A5 y pruebas críticas del caso), get_advisors, reporte por hallazgo.

## Bloqueos
Ninguno técnico. Commit/push de esta rama: requiere autorización humana (ver aviso).

## Pedidos a otros
- coordinador: confirmar códigos y textos de los errores nuevos (`asiento_en_uso/asiento_en_uso`, `intento_obsoleto/intento_obsoleto`, `cupo_completo/reservado_imprescindible`) y la ubicación de `motivo_aceptar` (hoy en `mi_situacion.motivo_aceptar`).

## Entregado
(nada commiteado por el backend; archivos en el working tree de cruce-senales)
