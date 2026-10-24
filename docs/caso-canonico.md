# Caso de la demo Makana: «El plan que no deja a nadie afuera»

Por pedido de Nico del 24 de octubre, la entrada de demostración pasa al caso social de siete compañeros ficticios: Ana, Bruno, Camila, Diego, Elena, Felipe y Gabriela. El recorrido y la preparación están en [demo-makana.md](demo-makana.md). La aplicación conserva su identidad visual y usa el mismo motor de versiones.

Parque ficticio gratuito, mínimo real de dos personas: Ana y Felipe aceptan el sábado; Felipe se baja; Ana revisa el domingo y la versión nueva comienza con cero aceptaciones; Ana y Camila deciden otra vez. Gabriela sigue pendiente. Preferencias y permisos se aportan por separado y voluntariamente; no se carga disponibilidad desde los perfiles.

La variante `makana` requiere activar la migración 0057 antes del cliente. El caso anterior se conserva para sus grupos existentes y pruebas de regresión; no se transforman ni borran esos datos. Las pruebas locales no certifican un despliegue remoto ni inferencia del modelo.

# Caso anterior conservado (legacy): «Los del finde»

Todo ficticio. Los personajes son inventados y no corresponden a personas reales.

## Problema que atacamos (caso 06 del hackatón)
Recuperar el hábito de verse con amigos. Un asado previsto tuvo seis interesados que dejaron de responder y no se hizo. Hipótesis a validar: no falta ganas ni amigos; falta cerrar la coordinación (condiciones, compromiso explícito y reparación cuando alguien se baja). La causa real del episodio está por investigar y no se afirma.

## Escenario
- Espacio: "Los del finde" (amigos). Caso histórico para regresiones; la demo Makana actual mantiene el enfoque social.
- Propuesta: asado en casa de Tomi. Tomi es el anfitrión y es imprescindible.
- Invitados con interés: Luna, Mati, Caro, Fede, Sofi.
- Zona horaria visible en pantalla: America/Santiago.
- Franjas candidatas: A = sábado 31 oct 2026, 14:00-17:00. B = domingo 1 nov 2026, 14:00-17:00.
- Cupos: mínimo 4 contando a Tomi, máximo 6.
- Cierre de aceptación: jueves 29 oct 2026, 20:00 (decide el servidor).
- Costo: aporte fijo conocido por persona, o costo cero. No se calcula reparto en este corte.
- Modalidad: presencial. No se reserva nada real.

## Condiciones privadas (cada persona carga solo las suyas)
Disponibilidad por franja (A y/o B). Opcional y desconocido permanece pendiente, no se inventa.
- Tomi: A y B. Luna: A y B. Mati: A y B. Caro: solo A. Fede: solo B. Sofi: solo B.

## Recorrido canónico (golden path)
1. Reiniciar la demo en el espacio de prueba: datos ficticios, versión inicial, ninguna confirmación.
2. Tomi crea la propuesta con las dos franjas y los cupos. Mostrar que "me interesa" no suma confirmados.
3. Cada persona carga sus condiciones en privado (sesiones distintas). El motor evalúa y elige la franja más temprana viable: A con Tomi, Luna, Mati y Caro (versión 1). Mostrar qué se sabe, qué falta aceptar y la hora de cierre.
4. Tomi, Luna, Mati y Caro aceptan la versión 1. Estado: grupo confirmado, visible en dos dispositivos.
5. Caro se baja. Quedan 3, por debajo del mínimo: estado "En revisión". La baja queda registrada. Caro no vuelve a ser elegible en esta propuesta.
6. Buscar alternativa: B como versión 2, con Tomi, Luna, Mati y Fede. Cero aceptaciones heredadas. Los cuatro aceptan y el grupo vuelve a confirmarse. Nunca mostrar "Reparado" antes de las nuevas confirmaciones.
7. Contraejemplo: si Tomi deja de estar disponible, el sistema responde "Sin opción compatible". No baja el mínimo ni finge una reparación.
No marcar "encuentro realizado" como hecho: es coordinación de una actividad futura.

## Estados
Borrador -> Reuniendo interés -> Esperando compromisos -> Grupo confirmado -> En revisión (baja que rompe el mínimo o la presencia del anfitrión) -> Esperando compromisos (nueva versión) ... Expirado / Cancelado. "Sin opción" es un resultado de evaluación, no un estado de confirmación. Toda transición registra actor, versión y momento (hora del servidor).

## Regla del motor (corte mínimo)
- Elegible: pertenece a la audiencia, no pasó, tiene condiciones completas y su disponibilidad cubre la franja.
- Viable: al menos 4 elegibles incluido Tomi. Máximo 6. Orden: franja más temprana; empate, orden de la propuesta.
- Aceptar: el servidor revalida identidad, versión, condiciones, plazo y cupo. Solo cuentan aceptaciones vigentes de esa versión.
- Una baja que no rompe mínimo ni anfitrión ni cambia condiciones del resto puede conservar el acuerdo; queda registrada y visible.

## Pruebas críticas (mínimo para dar por terminado)
Privacidad (otra sesión no lee condiciones ajenas) · interés sin compromiso = 0 confirmados · confirmación solo con Tomi presente · doble clic no duplica · baja pasa a revisión · reparación sin aceptaciones heredadas · versión vieja rechazada · último cupo con dos sesiones · aceptación fuera de plazo rechazada · reinicio de demo aislado.

## Fuera de alcance de este corte
Pagos, reservas reales, calendarios, mapas y traslados, chat, notificaciones push, IA dentro del producto, ranking o estadísticas individuales, datos reales.
