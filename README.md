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
- **Agente del círculo (opcional):** con preferencias privadas y el clima, propone hasta tres planes de un catálogo ficticio que le sirven a todos; quien organiza solo ve totales. La app publicada corre sin clave de IA (regla fija y "Texto fijo"); elegir y redactar con un modelo de Anthropic está programado pero no probado. Nunca crea ni confirma nada.

## Qué dejamos fuera y por qué
Chat, pagos, reservas, calendarios y notificaciones: queríamos probar el cierre y la reparación, no integrar servicios. Tampoco empresas ni métricas por persona: el foco es social y la privacidad importa. No prometemos privacidad perfecta; los límites que quedan están en [la enmienda 7](docs/contrato-enmienda-7.md).

## Demo y evidencia
Toca **Probar la demo «Los del asado»**: serás Tomi, quien organiza. Luna puede entrar con el código desde otra ventana o navegador; Mati, Caro, Fede y Sofi son simuladas y rotuladas. Todo es ficticio. [Qué se probó y qué no](docs/evidencia.md) · [Cómo correrlo](docs/como-correr.md).

## Componentes externos
[React](https://react.dev), [Vite](https://vite.dev), [TypeScript](https://www.typescriptlang.org), [Supabase](https://supabase.com) con [supabase-js](https://github.com/supabase/supabase-js), [Vercel](https://vercel.com), [Open-Meteo](https://open-meteo.com), [SDK de Anthropic](https://github.com/anthropics/anthropic-sdk-typescript) (opcional), enlaces `wa.me` de WhatsApp, [Vitest](https://vitest.dev) y [Playwright](https://playwright.dev). Asistentes: [Claude Code](https://claude.com/claude-code) y [Codex](https://openai.com/codex). Todo se escribió durante el evento (primer commit: viernes 23, 09:47).

## Participantes
[Nico Faingold](https://github.com/nicofaingold066-sketch) y [Juan Morales](https://github.com/JuanMorales10), que se sumó el viernes al mediodía. Casi todo el código lo escribieron asistentes de IA dirigidos desde la cuenta de Nico (Claude Code firma "Co-Authored-By: Claude"; Codex, no); ocho commits tempranos figuran con el autor "Claude". El historial muestra lo que cada uno subió con su cuenta.
