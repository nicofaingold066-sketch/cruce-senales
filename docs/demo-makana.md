# Demo Makana: El plan que no deja a nadie afuera

Caso social solicitado por Nico el sábado 24 de octubre de 2026. Siete compañeros adultos ficticios, sin relaciones de jefatura. El título expresa una aspiración del producto. Participar sigue siendo voluntario.

La entrada «Probar la demo» abre esta variante. Los grupos anteriores conservan sus datos y su circuito. No se convierte un grupo existente ni se renombran personas reales. La aplicación identifica el caso con `demo_caso: "makana"`, enviado por el servidor.

## Estado y activación

El cambio incluye una migración aditiva, `0057_demo_makana.sql`, y una nueva RPC `seed_demo_makana()`. La migración debe integrarse y aplicarse por el circuito de backend autorizado **antes de publicar el cliente** que utiliza esa RPC. Esta guía no autoriza escribir en producción. No editar migraciones anteriores ni ejecutar SQL de preparación sobre usuarios existentes.

Los resultados de las comprobaciones están en el reporte de entrega. Una prueba con PostgreSQL local verifica reglas SQL; una prueba de navegador con RPC interceptados verifica interfaz. Ninguna de ellas acredita por sí sola Auth/PostgREST, modelos o el despliegue remoto.

## Preparación reproducible

1. En el entorno de demo autorizado, abrir «Probar la demo». La RPC crea un grupo exclusivo del usuario y del caso, o devuelve el mismo si ya existe: Ana, Bruno, Camila, Diego, Elena, Felipe y Gabriela. Sin condiciones, preferencias, interés ni aceptaciones precargadas. Ambos permisos del agente comienzan apagados.
2. Antes de cargar actividad simulada en los asientos, usar el código del grupo desde dos sesiones separadas y reclamar **Camila** y **Felipe**. El operador usa como máximo tres perfiles: Ana, Camila y Felipe. No crear siete cuentas ni enviar correos. El resto queda marcado como simulación.
3. En Camila, guardar su preferencia privada «Ojalá gratis», eligiendo explícitamente los demás campos requeridos. Activar «Que el agente use mis preferencias» solo mediante su propio control. El permiso para recibir invitaciones se decide aparte. Si se enseña el agente, Ana también debe aportar preferencias autorizadas: el motor exige al menos dos personas autorizadas.
4. Desde Ana, comprobar que las preferencias individuales de Camila no aparecen en `get_space`, `get_proposal_state`, `list_proposals` ni en mensajes compartidos. El acceso de Ana a `get_my_preferences` devuelve únicamente sus datos. No decir que el agente utilizó una preferencia si no se ejecutó y verificó ese camino.
5. Abrir «Nuevo plan». La precarga pública propone **Parque del Encuentro (ficticio), acceso norte, encuentro gratuito**, sábado 31 de octubre o domingo 1 de noviembre de 2026, de 16:00 a 18:00, mínimo 2, máximo 7, actividad `parque`. Revisar y publicar como persona. No hay pronóstico consultado ni disponibilidad implícita. El caso sigue funcionando por el flujo manual si el agente no está disponible.
6. Cada uno de los tres perfiles responde explícitamente a esta propuesta: **Ana A sí / B sí; Felipe A sí / B no; Camila A no / B sí**. Son decisiones ficticias recogidas en el formulario; no se infieren de sus gustos. Bruno, Diego, Elena y Gabriela no responden ni cuentan como confirmados.
7. Ana busca y publica la opción. El motor elige A, la primera franja viable. Ana y Felipe aceptan la **versión 1** por separado: dos confirmados. Mostrar que Gabriela sigue pendiente.
8. Felipe se retira mediante su propia sesión. Queda una sola confirmación: se pierde el mínimo real de dos del parque y el servidor pasa a revisión. No se aumenta el mínimo para fabricar este efecto.
9. Ana revisa y pulsa el rearmado disponible. La alternativa B, el domingo, admite a Ana y Camila. La **versión 2 empieza con cero aceptaciones**. Ana y Camila vuelven a decidir y aceptan expresamente esta versión. Felipe sigue retirado y Gabriela pendiente.

La simulación manual de otros integrantes se identifica siempre como tal en la interfaz y el historial. El caso nuevo no ofrece el atajo masivo de respuestas del asado ni una aceptación de todos con un solo clic.

## Los siete personajes y el esquema real

| Persona | Papel ficticio | Campos que puede completar voluntariamente |
|---|---|---|
| Ana | Organiza, quiere caminar y conversar | `energia: algo_tranquilo`, `ambiente: tranquilo`, `me_gustaria: [parque, cafe]` |
| Bruno | Suele proponer pádel o fútbol; también acepta parque | `me_gustaria: [padel, futbol, parque]` |
| Camila | Prefiere opciones gratuitas o económicas | `presupuesto: ojala_gratis`; nunca se publica una explicación sobre sus finanzas |
| Diego | Necesita un traslado sencillo | Zona aproximada del catálogo, movilidad y máximo de viaje, solo si decide aportarlos; sin dirección real |
| Elena | Prefiere un encuentro tranquilo | `energia: algo_tranquilo`, `ambiente: tranquilo`; sin inferencias médicas |
| Felipe | Acepta la v1 y después se baja | Disponibilidad y aceptación propias; no necesita habilitar al agente |
| Gabriela | Al comienzo no respondió | Sin condiciones, preferencias, interés ni aceptación |

Guardar gustos exige completar presupuesto, energía, ambiente, lugar y entre una y seis actividades; la ficha narrativa no es un payload completo. La variante no agrega campos para diagnósticos, finanzas, razones privadas en texto libre ni disponibilidad inferida.

## Reinicio

«Reiniciar demo» afecta únicamente el grupo elegido. Conserva sus personas, código, sesiones reclamadas y las preferencias y permisos elegidos por esas personas; borra sus propuestas y aceptaciones, y limpia los recibos y opciones del agente de ese grupo para permitir repetir la oportunidad. Los perfiles todavía simulados vuelven a no tener preferencias ni permiso de invitaciones.

Un mismo intento de reinicio no borra dos veces. La generación cambia, por lo que una solicitud antigua no puede aplicarse a la demo reiniciada. Antes del próximo ensayo, revisar los permisos de las tres sesiones: el reinicio no actúa en su nombre ni los modifica. Las demos antiguas y otros grupos no se borran.

## Relato breve y límites

«Siempre proponen pádel y comida. Hay ganas de encontrarse, pero ese plan no encaja con todos. CRUXE permite aportar preferencias en privado, revisar una propuesta y confirmar una versión concreta. Cuando Felipe se baja, Ana revisa otra alternativa; cada persona vuelve a decidir.»

Usar la frase «el sistema tuvo en cuenta una restricción sin exponer a la persona» solamente cuando se haya verificado en el entorno de presentación el agente real, los datos autorizados y las respuestas compartidas. El circuito manual acredita propuesta, estados y decisiones por versión; no acredita inferencia del modelo.

La demo no acredita autonomía continua, reparación automática, una integración con Makana ni resultados comerciales. Makana es una hipótesis de piloto voluntario para evaluar aceptación de invitaciones, encuentros comprobados después, recuperación de planes y valoración voluntaria de la coordinación. El clima es opcional y se identifica como real, simulado o no disponible según la respuesta efectiva.

Las [bases oficiales](https://hack.makana.cl/bases.html), versión 1.5 del 19 de octubre, fijan el cierre de entrega para el sábado 24 a las 13:00 de Santiago. Eso no establece el turno individual de exposición.
