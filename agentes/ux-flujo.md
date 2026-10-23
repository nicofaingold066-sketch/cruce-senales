# ux-flujo (sesión de la noche: flujo completo de información y de usuario)

Guía: `prompts/equipo-noche.md`. Rama: `wip/ux` (copia `/Users/macair/cruse/cruce-ux`). Rutas: `docs/flujo-usuario.md`, `docs/front-back-puente.md`, archivos NUEVOS en `src/componentes-nuevos/**`. Puerto de preview: 4183.

## Tocando ahora
- [19:30] #98 recorrido "convencer a uno" con Playwright (guion en mi carpeta temporal, fuera del repo) y `docs/flujo-usuario.md`. Después #94 `docs/front-back-puente.md`, #91 mapa con enmienda 10, #89 `src/componentes-nuevos/RecordarFaltan.tsx` (+ prueba).

## Entregado
(nada todavía)

## Pedidos a otros
Evidencia de todos: recorrido real 19:24-19:27 (build propio 4183, 375 px, grupo ficticio "Los del pádel": Vale organiza, Ana, Beto, Coni, Diego y Ema entran por el enlace). Detalle en `docs/flujo-usuario.md` §3 (rama `wip/ux`).
- front-juan [19:35] (P1): `PlanTab.tsx:546-560` (`BuscarOpcion`): si `p.imprescindible.miembro_id === p.mi_situacion.miembro_id` y `p.mi_situacion.condiciones !== 'completas'`, no ofrecer "Buscar opción compatible" como acción principal: mostrar antes `<Aviso tono="aviso">Primero marca tu disponibilidad: eres quien no puede faltar. Sin eso no hay opción posible.</Aviso>` con el botón "Ir a Mi respuesta". Visto: Vale tocó "Buscar" sin sus condiciones (la próxima acción del servidor se lo pedía) y recibió "Sin opción compatible". Es solo cliente, no expone nada de otros.
- front-juan [19:35] (P1): `RespuestaTab.tsx:35-37`: orden `<MisCondiciones/>` primero y `<Interes/>` después, y "Me interesa" como botón secundario. Hoy el botón negro grande de la pantalla es "Me interesa" (no lo usa el motor) y "Guardar condiciones" queda bajo el pliegue a 375 px. Sin cambiar rótulos.
- front-juan [19:35] (P1): `Espacio.tsx` para quien NO organiza: con una propuesta vigente, la tarjeta del plan va antes del bloque del código (Compartir/Copiar/WhatsApp), y el botón fijo "Nueva propuesta" no es la acción principal del invitado (Ana lo ve tapando la tarjeta del plan, captura 012). Si friccion entrega #88 (`#/e/<id>/responder`), esto pesa menos, pero sigue para quien vuelve.
- front-juan [19:35] (P2): `PlanTab.tsx:132` y `Inicio.tsx` (tarjeta "Tu plan"): a quien no es elegible en la versión (Coni respondió No a la A; Ema dejó B en Pendiente), la portada le dice "Grupo confirmado · Cupos disponibles: 2" y la órbita "4 se juntan" sin decirle que no está. Pedido: arriba de la propuesta, si `mi_situacion.elegible_en_version === false`, un aviso visible "Esta versión es sin ti: con lo que marcaste no te queda bien esta fecha." y en la tarjeta de la portada no usar el texto de "Te toca".
- front-juan [19:35] (P2): `PlanTab.tsx` (bloque de opción publicada y de reparación): botón "Avisar al grupo por WhatsApp" para el organizador cuando se publica una versión nueva. Lo armo como componente en `src/componentes-nuevos/` (#89) y te aviso la forma exacta.
- front-juan [19:35] (P3): "Imprescindible (anfitrión)" y "Anfitrión (Vale)" en la ficha y en las aceptaciones (`PlanTab.tsx:84,134,202,222-224,282`) para un pádel; la creación ya dice "No puede faltar". Y `Inicio.tsx:462`: "Si usas el nombre de una persona simulada de la demo (por ejemplo "Luna")…" sale también en grupos reales.
- friccion [19:35]: para tu #88 (`Responder.tsx`): condiciones primero, "Me interesa" aparte y secundario, y si queda una franja en "Pendiente" decirlo ANTES de guardar ("Si dejas una en Pendiente, quedas fuera de la búsqueda"). Hoy Ema guarda con una en Pendiente, ve "Guardado" y queda fuera del motor sin saberlo (captura 018). Y `App.tsx:82`: el chip "Datos ficticios" sale en grupos reales; mostrarlo solo si el espacio es demo. `QuienEres.tsx:370`: el mismo texto de "Luna".
- backend [19:35] (P2, no urgente, después de E10): `siguiente_accion` del organizador en `reuniendo_interes` dice "Ya hay N personas con condiciones. Busca una opción compatible." aunque el imprescindible no cargó las suyas (0013/0029). Si quien consulta ES el imprescindible y no tiene condiciones completas: "Primero marca tu disponibilidad: eres quien no puede faltar." No toca el caso en que el organizador no es el imprescindible (no revelar el estado de otra persona).
- apertura [19:35]: en `NuevaPropuesta.tsx` el primer atajo es "Asado" (después Fútbol, Cena, Juntada, Cine, Cumple, Paseo): en un grupo "Los del pádel" el plan salió titulado "Asado". Para tu #92: ejemplos y orden de atajos que no arranquen por asado y alguno de raqueta (pádel/tenis).

## Ideas
(en preparación)
