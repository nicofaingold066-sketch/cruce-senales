# CRUXE

Caso 06 de Señales: recuperar el hábito de verse con amigos.

## Qué problema atacamos
Un asado del equipo reunió seis interesados y no ocurrió. Nuestra hipótesis es que parte de la dificultad está en cerrar el plan: pasar del interés a un compromiso explícito y sostenerlo ante una baja. La causa del episodio todavía está por validar. Los personajes y datos de la demo son ficticios.

## Por qué este y no otro
Elegimos una fricción concreta que vivimos y podemos poner a prueba en dos días. El chat sirve para conversar; queremos probar si condiciones privadas, una opción y confirmación explícita ayudan a cerrar el encuentro. No afirmamos haber cambiado el hábito ni que coordinar garantice asistencia.

## Qué construimos
Cada persona carga disponibilidad en privado. El servidor propone una opción que cumple el mínimo e incluye al anfitrión imprescindible. Cada participante confirma esa versión exacta. Si una baja rompe el acuerdo, queda En revisión: la alternativa necesita nuevas confirmaciones, sin heredar aceptaciones. Si no hay opción viable, lo informa sin reducir el mínimo.

## Qué dejamos fuera y por qué
Chat, pagos, reservas, calendarios y notificaciones: limitamos integraciones para probar el cierre y la reparación. Empresas y métricas individuales quedan fuera por foco social y privacidad. El agente de IA que propone el plan se declara según lo efectivamente integrado al momento de la entrega; un diseño no se presenta como funcionalidad.

## Demo, evidencia y ejecución
[App](https://cruce-senales.vercel.app). Tomi y Luna usan sesiones reales distintas; Mati, Caro, Fede y Sofi son simulaciones rotuladas. No hay reservas ni encuentros reales.

[Recorrido RPC real](tests/e2e/evidencia-recorrido-canonico.md): 3 escenarios, dos ejecuciones consecutivas aprobadas el 23 oct. No certifica el navegador. [Evidencia histórica A1–A5](docs/correcciones-altas-1.md). [Cómo correr y probar](docs/como-correr.md): Node 24, variables públicas de Supabase en `.env`, `npm run dev`.

## Componentes externos
[React](https://react.dev), [Vite](https://vite.dev), [TypeScript](https://www.typescriptlang.org), [Vitest](https://vitest.dev), [Supabase](https://supabase.com), [supabase-js](https://github.com/supabase/supabase-js) y [Vercel](https://vercel.com). Asistentes: [Claude Code](https://claude.com/claude-code) y [Codex](https://openai.com/codex).

## Participantes
[Nico Faingold](https://github.com/nicofaingold066-sketch) y [Juan Morales](https://github.com/JuanMorales10). Cada integrante commitea con su cuenta. Parte del código lo escribieron asistentes de IA (Claude Code y Codex) dentro de sesiones de los integrantes; algunos commits tempranos de la interfaz figuran con el autor "Claude" porque se hicieron así antes de configurar la identidad de la sesión.
