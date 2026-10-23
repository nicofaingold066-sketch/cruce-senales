# CRUXE

CRUXE ayuda a un grupo de amigos a cerrar un plan: cada uno marca en privado cuándo puede, la app propone una sola opción, quienes van confirman esa versión y, si alguien se baja, el plan se rearma. Caso 06 de Señales: recuperar el hábito de verse con amigos. **App:** https://cruce-senales.vercel.app

## Qué problema atacamos
Lo vivimos nosotros. En nuestro grupo todos dicen "hay que juntarse": alguien propone, varios dicen que les interesa y el plan no llega a tener día y hora. Probamos el grupo de WhatsApp y la encuesta de fechas. El 8 de octubre un asado reunió seis interesados, nadie dijo que no, dejaron de responder y no se hizo. Creemos, sin haberlo comprobado todavía con los del asado, que falla el cierre: nadie lo cierra, "me interesa" no es un compromiso, hay condiciones que nadie dice en voz alta (plata, horario) y, si uno se baja, nadie rearma el plan.

## Por qué este y no otro
Conversar ya lo resuelve el chat; cerrar y sostener el plan, no. Es una fricción concreta que podíamos poner a prueba en dos días, en vez de la soledad o la motivación, que son más amplias. No afirmamos que coordinar mejor garantice que el grupo se junte ni que cambie el hábito por sí solo.

## Qué construimos
- **Condiciones privadas:** cada uno marca cuándo puede; ninguna pantalla ni respuesta muestra las de otro.
- **Una opción, una versión:** la app propone una sola opción que llega al mínimo de personas e incluye a la persona imprescindible (el anfitrión). Cada uno confirma esa versión; interesarse no es confirmar.
- **Reparación:** si una baja deja el plan bajo el mínimo, pasa a "En revisión" y la alternativa es una versión nueva que empieza sin confirmaciones. Si no hay opción posible, lo dice sin bajar el mínimo.
- **Agente del círculo (opcional):** con preferencias privadas y el clima, el servidor descarta lo que no le sirve a alguien (presupuesto, techo si llueve) y ofrece hasta tres planes de un catálogo ficticio. Quien organiza solo ve totales del grupo. La app publicada corre sin clave de IA: elige una regla fija y el porqué es un texto fijo (la pantalla dice "Texto fijo"). La parte en que un modelo de Anthropic elegiría y redactaría está programada pero no se probó con el modelo real. El agente nunca crea ni confirma nada.

## Qué dejamos fuera y por qué
Chat, pagos, reservas, calendarios y notificaciones: queríamos probar el cierre y la reparación, no integrar servicios. Tampoco una versión para empresas ni métricas por persona: el foco es social y la privacidad importa. No prometemos privacidad perfecta: quien organiza puede deducir algo repitiendo pruebas con el motor, y una baja que deja el plan "En revisión" dice algo de quien se bajó. Esos límites están en [docs/contrato-enmienda-7.md](docs/contrato-enmienda-7.md).

## Demo y evidencia
Toca **Probar la demo «Los del asado»**: serás Tomi, quien organiza. Luna puede entrar con el código del espacio desde otro navegador o ventana privada (lo probamos así; todavía no con dos teléfonos físicos). Mati, Caro, Fede y Sofi son personas simuladas, rotuladas como tales, con preferencias fijas; el clima se puede simular. Todo es ficticio. [Qué se probó y qué no](docs/evidencia.md) · [Cómo correrlo](docs/como-correr.md).

## Componentes externos
[React](https://react.dev), [Vite](https://vite.dev), [TypeScript](https://www.typescriptlang.org), [Supabase](https://supabase.com) y [supabase-js](https://github.com/supabase/supabase-js), [Vercel](https://vercel.com), [Open-Meteo](https://open-meteo.com) (pronóstico), [SDK de Anthropic](https://github.com/anthropics/anthropic-sdk-typescript) (opcional), enlaces `wa.me` de WhatsApp (solo abren el chat con el texto), [Vitest](https://vitest.dev) y [Playwright](https://playwright.dev) (pruebas). Asistentes: [Claude Code](https://claude.com/claude-code) y [Codex](https://openai.com/codex). Todo se escribió durante el evento: el primer commit es del viernes 23 a las 09:47.

## Participantes
[Nico Faingold](https://github.com/nicofaingold066-sketch) y [Juan Morales](https://github.com/JuanMorales10), que se sumó el viernes al mediodía. Casi todo el código lo escribieron asistentes de IA dirigidos desde la cuenta de Nico: los commits de Claude Code llevan "Co-Authored-By: Claude" y los de Codex (pruebas y revisiones) no; ocho commits tempranos de la interfaz figuran con el autor "Claude". El historial muestra lo que cada uno subió con su cuenta.
