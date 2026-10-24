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

El cambio se prepara en una rama independiente de la demo Makana. La instrucción más reciente de Nico, «cuando termines subilo lo acepto», autoriza publicarlo después de completar la revisión móvil y las pruebas. Se conserva una vista previa con datos ficticios para mostrar el resultado. No se crean usuarios ni planes reales durante la verificación visual.

## Verificación

Typecheck y build aprobados; 102 pruebas puras aprobadas (13 específicas de participación). Browser con Auth/RPC sintéticos: 320, 375 y 1280 px, en claro y oscuro, sin errores ni desbordes. Desde un integrante común se verificaron nombres visibles, ingreso pendiente y simulación diferenciados, versión nueva sin aceptaciones heredadas y actualización de ingresos/salidas sin abandonar la pantalla. El sondeo del grupo también se verificó a los diez segundos. Toda salida a base o Auth real se interceptó.

El cambio se entrega en `codex/participacion-visible` para integración y publicación coordinadas, autorizadas por Nico. La primera espera de validación visual quedó reemplazada por su autorización de subirlo al terminar. Las capturas locales se identifican como vista previa con datos ficticios; la verificación del cliente publicado se registra por separado.

## Refinamiento móvil

La tarjeta usa los colores, tipografía y espaciado existentes de CRUCE. Los nombres conservan su avatar y los estados combinan icono y texto; el color se concentra en el estado. Versión y totales aparecen bajo el título. En 375–430 px hay dos columnas ligeras; en 320 px, filas compactas. Los nombres largos ocupan una fila completa y nunca se truncan. Las simulaciones mantienen su identificación explícita.

Verificación del refinamiento local sobre main `08aa6e2`: TypeScript/build aprobados y 105 pruebas puras aprobadas. Diez configuraciones de navegador (320, 375, 390, 430 y 1280 px, claro/oscuro), 148 RPC sintéticas y 68 capturas nativas, sin errores ni desbordes. Se verificaron la fuente Plus Jakarta Sans, nombres largos, confirmaciones por versión y actualización de integrantes. Auth/RPC se interceptan antes de navegar; no se contacta la base ni un modelo. Capturas: `/tmp/cruce-participacion-mobile-preview/`. Esta evidencia local no acredita por sí sola publicación.
