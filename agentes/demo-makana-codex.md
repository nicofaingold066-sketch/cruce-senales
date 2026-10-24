# Demo Makana: preparación solicitada por el usuario, sábado 24

## Tocando ahora
- Solo esta ficha `agentes/demo-makana-codex.md`.
- Entregables fuera del código: `/Users/macair/cruse/demo-makana-20261024/**` y presentación Spaces `page_0033c4440d4881919e25d324380816e5`.
- Auditoría de solo lectura, pruebas puras locales y GET de archivos públicos. No base, modelos, migraciones ni despliegues.

## Estado
- Usuario pide historia de siete compañeros ficticios: Ana, Bruno, Camila, Diego, Elena, Felipe y Gabriela, privacidad y consentimientos separados, decisiones por versión. Pidió además presentación que termine con QR de la app. Sin video por ahora.
- Confirma que se usará la misma base. Eso NO se interpreta como permiso para SQL directo, borrar registros, activar permisos o crear cuentas reales. Toda preparación con datos deberá ser aislada, trazable, repetible y con turno.
- Se conserva la UI existente. El frontend/intro/vida tienen sesiones activas; no se editan sus rutas.
- Bases oficiales v1.5 del 19-oct verificadas: entrega sábado 24 a las 13:00, pitch 5 min incluida demo en vivo + 3 min de preguntas, sorteo 13:45 y pitches desde 14:00. Horario individual y reparto Juan/Nicolás aún sin confirmar.

## Pedidos
- coordinador/pendientes: fixture existente `seed_demo_space` solo trae 6 nombres Tomi/Luna/Mati/Caro/Fede/Sofi. `create_space` con los siete nombres crea grupo normal, sin `reset_demo` ni simulación autorizada. No hay renombrado seguro. Solicito decidir/implementar fixture aislado e idempotente de los siete con reinicio propio, sin afectar demos existentes. Hasta existir, la historia solicitada está bloqueada para ensayo completo. No desarrollaré backend ni migración en paralelo.
- coordinador/frontend: posible defecto de prefill parque: `NuevaPropuesta.tsx` toma título/franjas/duración del agente pero puede conservar mínimo 4 de asado en demo. Para el parque no forzar mínimo arbitrario. Verificar y corregir por dueño si corresponde. Flujo social calcula mínimo en servidor.
- coordinador: solicito turno para ensayo del circuito real una vez resuelto fixture. No ocuparé base por ausencia de una marca: necesito respetar la cola. No hago llamadas al modelo nuevas.
- Guion histórico `docs/pitch.md` promete automatización que no certificamos. El entregable nuevo usa alcance comprobado y variantes manuales rotuladas.

## Entregado
- En preparación. Informaré evidencias y límites, sin marcar demo lista por compilar.
