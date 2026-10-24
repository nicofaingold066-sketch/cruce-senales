# CRUXE

CRUXE ayuda a un grupo de amigos a cerrar un plan: cada uno marca en privado cuándo puede, la app propone una sola opción, quienes van confirman esa versión y, si alguien se baja, el plan se rearma. Caso 06 de Señales. **App:** https://cruce-senales.vercel.app

## Qué problema atacamos
Lo vivimos nosotros. En el grupo todos dicen "hay que juntarse", varios dicen que les interesa y el plan nunca llega a tener día y hora. Probamos el grupo de WhatsApp y la encuesta de fechas. El 8 de octubre un asado reunió seis interesados, nadie dijo que no y no se hizo. Creemos, sin haberlo comprobado con los del asado, que falla el cierre: nadie cierra, "me interesa" no es un compromiso, hay condiciones que no se dicen (plata, horario) y si uno se baja nadie rearma el plan.

## Por qué este y no otro
Conversar ya lo resuelve el chat; cerrar y sostener el plan, no. Es una fricción concreta que podíamos poner a prueba en dos días, más acotada que la soledad o la motivación. No afirmamos que coordinar mejor garantice que el grupo se junte.

## Qué construimos
- **Condiciones privadas:** nadie ve las de otro.
- **Una opción, una versión:** la app propone una opción que llega al mínimo de personas e incluye al anfitrión; cada uno confirma esa versión. Interesarse no es confirmar.
- **Reparación:** si una baja deja el plan bajo el mínimo, pasa a "En revisión" y la alternativa empieza sin confirmaciones. Si no hay opción, lo dice sin bajar el mínimo.
- **GRU, el agente del círculo (opcional):** con preferencias privadas y el clima, propone hasta tres planes de un catálogo ficticio que le sirven a todo el grupo (respeta el tamaño del grupo, el presupuesto y el traslado; enmienda 16); quien organiza solo ve totales. Un modelo de Anthropic (vía Vercel AI Gateway) elige entre esas opciones y redacta el porqué y un mensaje para el grupo; sin clave o si falla, va una regla fija y un texto fijo, y la pantalla dice cuál («Lo redactó la IA» o «Texto fijo»). Nunca crea ni confirma nada: la propuesta es un borrador que una persona aprueba. [Auditoría del agente](docs/auditoria-agente.md).

## Qué dejamos fuera y por qué
Chat, pagos, reservas, calendarios y notificaciones: queríamos probar el cierre y la reparación, no integrar servicios. Tampoco empresas ni métricas por persona: el foco es social y la privacidad importa. No prometemos privacidad perfecta; los límites que quedan están en [la enmienda 7](docs/contrato-enmienda-7.md).

## Demo y evidencia
Toca **Probar la demo «El plan que no deja a nadie afuera»**: serás Bastián, quien organiza; Nacho, Carlos, Kai, Charlie, Joaco y Pía son amigos simulados y rotulados, con gustos cargados. Creá un plan con mínimo 4 y «Cargar las respuestas»: la versión 1 cae el sábado; si Joaco se baja, el plan pasa a «En revisión» y la versión 2 (domingo) empieza sin confirmaciones. Cualquiera puede entrar con el enlace de invitación desde otro teléfono y reclamar un asiento. Todo es ficticio.

Lo que se verificó el sábado 24: pruebas de interfaz y servidor contra la base real antes de cada publicación (recorrido de dos sesiones, jurado del caso, red controlada, recuperación de sesión, fricción, propósito), QA de gente y rendimiento con 30 personas a la vez sin sobrecupo ([docs/qa/gente-y-rendimiento.md](docs/qa/gente-y-rendimiento.md)), auditoría del agente ([docs/auditoria-agente.md](docs/auditoria-agente.md)) y el contrato con sus 15 enmiendas ([docs/contrato.md](docs/contrato.md)). [Qué se probó y qué no](docs/evidencia.md) · [Cómo correrlo](docs/como-correr.md) · [Guion del pitch y demo en vivo](docs/pitch/) · [Decisiones del rediseño](docs/rediseno/decisiones.md).

## Componentes externos
[React](https://react.dev), [Vite](https://vite.dev), [Lucide](https://lucide.dev) (íconos), [TypeScript](https://www.typescriptlang.org), [Supabase](https://supabase.com) con [supabase-js](https://github.com/supabase/supabase-js), [Vercel](https://vercel.com), [Open-Meteo](https://open-meteo.com), [SDK de Anthropic](https://github.com/anthropics/anthropic-sdk-typescript) (opcional), enlaces `wa.me` de WhatsApp, enlaces de búsqueda a [Google Maps](https://www.google.com/maps) y [EasyCancha](https://www.easycancha.com) (solo enlaces, sin clave), [Google Fonts](https://fonts.google.com) (Plus Jakarta Sans), [Vitest](https://vitest.dev) y [Playwright](https://playwright.dev). Para el video del pitch (fuera de la app): [Remotion](https://www.remotion.dev) y la API de [ElevenLabs](https://elevenlabs.io) (voz). Asistentes: [Claude Code](https://claude.com/claude-code) y [Codex](https://openai.com/codex). Todo se escribió durante el evento (primer commit: viernes 23, 09:47).

## Participantes
[Nico Faingold](https://github.com/nicofaingold066-sketch) y [Juan Morales](https://github.com/JuanMorales10), que se sumó el viernes al mediodía e hizo con su cuenta el rediseño completo de la interfaz (mobile-first, ingreso, planes, perfil, invitación y cierre). Casi todo el código lo escribieron asistentes de IA dirigidos desde la cuenta de Nico (Claude Code firma "Co-Authored-By: Claude"; Codex, no); ocho commits tempranos figuran con el autor "Claude". El historial muestra lo que cada uno subió con su cuenta.
