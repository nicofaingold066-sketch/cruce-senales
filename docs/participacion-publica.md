# Participación visible para el grupo

Pedido de Nico del 24 de octubre: los integrantes necesitan reconocer de forma visual quién entró al grupo y quién se sumó al plan. No deben buscar esos nombres en una ficha plegada ni depender de un avatar sin nombre.

La participación pública se muestra para organizadores e integrantes por igual:

- En el grupo: avatares, nombres y rótulos de quienes ya entraron, personas de simulación identificadas y nombres todavía por entrar en un bloque separado. Estar anotado como pendiente no significa que se ingresó al grupo.
- Antes de una versión del plan: nombres que marcaron interés, identificado como interés y no como asistencia confirmada.
- En una versión vigente: nombres de quienes confirmaron esa versión y nombres sin confirmación para ella. «Sin confirmar» no significa «no viene», «no puede» ni «no respondió».
- En revisión: se conservan las confirmaciones que el servidor aún considera vigentes. Una versión nueva muestra únicamente su propia lista de aceptaciones; nunca hereda nombres de la anterior.
- La actividad del grupo continúa mostrando ingresos, salidas y bajas con nombre, sin razones personales.

Siguen privados los gustos, presupuesto, disponibilidad por franja y motivos personales. Los controles del agente y sus consentimientos son independientes de la visibilidad de participación. No se publican preferencias individuales para explicar quién confirmó o quién no.

El cambio usa los datos públicos que el backend ya devuelve (`get_space.miembros`, actividad, interés y `opcion.aceptaron`). No agrega tablas, RPC ni una migración. El espacio se refresca durante el sondeo del plan para reflejar cambios de integrantes sin recargar la página. Las confirmaciones y estados los decide siempre el servidor.

El cambio se prepara en una rama independiente de la demo Makana para poder integrarlo sin esperar la activación de su fixture. La publicación se comprueba sobre el cliente que efectivamente sirve el dominio, sin crear usuarios ni planes reales durante la verificación visual.

## Verificación

Typecheck y build aprobados; 102 pruebas puras aprobadas (13 específicas de participación). Browser con Auth/RPC sintéticos: 320, 375 y 1280 px, en claro y oscuro, sin errores ni desbordes. Desde un integrante común se verificaron nombres visibles, ingreso pendiente y simulación diferenciados, versión nueva sin aceptaciones heredadas y actualización de ingresos/salidas sin abandonar la pantalla. El sondeo del grupo también se verificó a los diez segundos. Toda salida a base o Auth real se interceptó.

El cambio queda en `codex/participacion-visible` para la integración del coordinador. El aviso de coordinación de las 10:04 pide no avanzar `main` hasta la publicación de su tanda; este cambio no ocupa la base ni se cruza con esa migración. Las capturas locales están identificadas como prueba y no acreditan publicación.
