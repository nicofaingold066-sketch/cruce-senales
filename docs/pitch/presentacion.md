# Presentación para el jurado (Makana)

Sesión **presentacion**, sábado 24 oct 2026. Fuente editable: Figma Slides «CRUXE — Pitch Makana» (https://www.figma.com/slides/OLK75B9kmObV6t1P3cG2gN, privado de la cuenta de Nico). Copia exportada: [`presentacion.pdf`](presentacion.pdf) (8 diapositivas, 1920×1080). Las notas del orador están en Figma (vista de presentador).

Sigue la guía de bolsillo de Nico y el guion de la sesión **pitch** (`docs/pitch/guion-pitch.md`, rama `pitch`). El caso de ejemplo es «El plan que no deja a nadie afuera» (siete amigos), texto dado por Nico. Los pasos de la demo en la diapositiva 5 no nombran personas, para que sirvan con cualquier demo (la de hoy es Makana). El chat de la diapositiva 1 es del grupo ficticio «Los amigos Makana». No se usa el asado como ejemplo en pantalla. Todo ficticio.

Cada diapositiva tiene el mismo encabezado (logo CRUXE a la izquierda, número y nombre del bloque a la derecha) y, abajo, tres pistas «Para decir» para no trabarse. Componentes en Figma: «Encabezado CRUXE», «Etiqueta de bloque», «Pista para decir».

| # | Bloque · minuto del guion (no se muestra) | En pantalla | Para decir (pistas) |
|---|---|---|---|
| 1 | Gancho · 0:00 | «Che, ¿cuándo nos juntamos?» | Manos arriba · déjenla arriba si nunca pasó · pausa 2 s |
| 2 | Problema · 0:30 | Siete amigos: «Siempre la misma propuesta: pádel y comida» + lo que nadie dice (Carlos: algo gratis; Kai: un traslado simple; Charlie: algo más tranquilo) | El plan no le sirve a todos · nadie explica sus razones · 8 de octubre: 6 interesados, 0 encuentros |
| 3 | Conflicto · 1:10 | «WhatsApp sirve para hablar del plan. No para cerrarlo.» Privado · Compromiso · Reparar | Con los dedos · «las que probamos» · el cierre |
| 4 | Solución · 1:50 | «Que el encuentro ocurra.» 4 pasos | La frase lenta · un paso por dedo · «Juan, mostrémoslo» |
| 5 | Demo en vivo · 2:10 | Pasos de la demo sin nombres (la demo en vivo es Makana) + 2 capturas de producción | Pausa antes de que alguien se baje; narrar con los nombres de la demo en pantalla (`docs/pitch/demo-en-vivo.md`, rama `pitch`) |
| 6 | Distinto · 3:50 | 36 h · 30 a la vez sin sobrecupo · 152 verificaciones | El servidor manda · GRU propone, no confirma · se corta si vas largo |
| 7 | Para Makana · 4:10 | «El último metro» Makana → CRUXE → Encuentro + 3 métricas del piloto | De tener a usar · la empresa vería solo totales (propuesta) · qué no decir |
| 8 | Cierre · 4:40 | Logo, «Gracias por escucharnos.», «Que juntarse no dependa de uno solo.», QR | Frase final de memoria |

## Fuentes de cada dato

- 8 de octubre, 6 interesados, 0 encuentros: `README.md` («Qué problema atacamos»; el plan real fue un asado, no se nombra).
- 43 % tiene entre 3 y 5 amigos (solo dicho, opcional): `docs/problema.md`, Encuesta Bicentenario UC vía prensa, fuente secundaria.
- 152 verificaciones, 0 defectos graves, 30 personas a la vez, 30 confirmaciones con cupo 20 sin sobrecupo: `docs/qa/gente-y-rendimiento.md` (corridas c1–c6). La QA dejó 7 hallazgos medios y bajos: no decir «sin errores».
- 36 h: primer commit vie 23, 09:47 (`README.md`); 1 088 commits en `origin/main` (`git rev-list --count`, 24 oct).
- GRU propone y nunca confirma; gustos privados: `README.md`, `docs/agente-ia.md`, `docs/auditoria-agente.md` (rama `auditoria-agente`).
- Piloto y «la empresa ve solo totales»: propuesta; hoy no existe vista de empresa (`docs/pitch/guion-pitch.md`, ajustes).
- Capturas de la diapositiva 5: `docs/rediseno/capturas/produccion/s5-responder-375.png` (recortada sin el título del plan) y `docs/rediseno/capturas/s4/revision-org-375.png`.
- QR: apunta a https://cruce-senales.vercel.app; verificado leyendo la diapositiva 8 exportada con un lector de QR (jsQR).

Transiciones: la 1 entra con fundido, de la 2 a la 7 entran moviéndose desde la derecha y el cierre sube desde abajo (0,6 s, al hacer clic). Solo se ven en Figma (Present); el PDF no las tiene.

## Cambio de formato (24 oct, 12:30, pedido de Nico vía coordinador)

Se presenta sin video ni demo en vivo: el deck tiene 19 diapositivas. 1–4 gancho, problema, conflicto y solución; 5–16 la demo paso a paso, una captura real de producción por diapositiva (390×844 a 2×, `cruce-video/capturas-demo-2x/` 02, 06, 08, 10, 13, 16, 17, 19, 21, 23, 25, 26) con título corto, una línea y barra de avance; 17–19 lo que no se ve, Makana y cierre con QR (verificado de nuevo en el PDF). La diapositiva de demo anterior quedó oculta en Figma, no borrada.

## Versión final de 10 diapositivas (24 oct, 12:37, pedido de Nico)

1 gancho · 2 problema · 3 las tres trabas + qué hace CRUXE · 4–9 demo con iPhone y bullets (06-minimo-4, 10-puedo-los-dos, 16-opcion-v1, 19-aceptar-todos, 26-gru y la tarjeta de GRU `docs/rediseno/capturas/s6/gru/gru-card-375-light.png`, «Pádel en Club Providencia»; no se usó la versión «abierta» porque muestra un asado) · 10 cierre con QR y «36 h · 30 personas a la vez, sin sobrecupo». Las demás quedan ocultas en Figma, no borradas.
