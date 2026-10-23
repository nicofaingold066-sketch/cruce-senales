# Usuarios sintéticos de CRUXE

Seis amigos ficticios usan la app como lo haría gente real, para contar dónde se traban, qué no entienden y qué responden mal. Todo ficticio: los nombres no corresponden a personas reales. Cada corrida crea un grupo nuevo ("Los de la facu"); nunca se usa el demo «Los del asado».

- Guion: `tests/sinteticos/seis-amigos.mjs` (más `lib.mjs`, `revisar.mjs`, `guardia.mjs`).
- Correr contra un build propio: `npx vite build && npx vite preview --port 4186` y `node tests/sinteticos/seis-amigos.mjs http://localhost:4186`. Contra producción: sin argumento.
- Salida (no se commitea): `tests/sinteticos/salida/<sello>/` con una captura por pantalla importante, `textos.md` (el texto de cada pantalla que vio cada persona) y `resultados.json`.
- La guardia (`guardia.mjs`) frena el guion si la ficha de backend dice «MIGRACION EN CURSO».
- Los toques cuentan solo lo que la persona toca (no escribir, ni deslizar, ni las redirecciones automáticas). Los segundos son de máquina: son una cota inferior de lo que tarda una persona; un toque humano con lectura ronda 1,5 s.

## Los seis perfiles

| # | Persona | Ancho | Qué quiere | Qué hace el guion |
|---|---|---|---|---|
| 1 | **Vale**, la organizadora. Convence al resto. | 375 px | Que el grupo cierre una cena de egresados el finde que viene. | Entra a la portada, escribe su nombre, «Crear un grupo» con los 5 nombres, crea la propuesta («Cena de egresados», mínimo 3), responde ella, busca la opción, confirma, ve la baja y busca alternativa. |
| 2 | **Joaco**, el apurado. Abre el enlace en el colectivo y quiere responder en 10 segundos. | **320 px** (alto 640) | Contestar y guardar el teléfono. | Enlace → su nombre → «Sí, soy Joaco» → plan → «Mi respuesta» → Sí / Sí → Guardar. Más tarde confirma la versión desde la portada. |
| 3 | **Renata**, la que no puede ninguna franja. | 375 px | Decir que no puede sin quedar mal ni perderse el aviso. | Contesta «No puedo» en las dos franjas y mira qué ve del plan. |
| 4 | **Bruno**, el que tiene condiciones (presupuesto bajo, prefiere bajo techo). | 375 px | Que su límite cuente, pero hoy solo sabe la franja A. | Contesta solo la franja A y deja la B en «Pendiente». Después vuelve, ve que quedó fuera, completa la B y busca dónde cargar presupuesto y techo. |
| 5 | **Gonza**, el que dice que le interesa y después se baja. | 375 px | Quedar bien: «me interesa» primero, confirma, y después no puede. | «Me interesa», Sí / Sí, confirma la versión 1, y se retira con «No voy». |
| 6 | **Pili**, la que nunca abre el enlace. | — | Nada: no ve el mensaje. | No hace nada. Se comprueba que el silencio no cuenta como asistencia y cómo la ve el grupo. |

Escenario: mínimo 3, máximo 6, franjas por defecto (sábado y domingo siguientes, 20:00). Los elegibles de la versión 1 son Vale, Joaco y Gonza; Renata dijo que no, Bruno quedó incompleto, Pili no existe para el servidor hasta que abra el enlace. Con la baja de Gonza el grupo baja de 3 a 2 y pasa a «En revisión».

## Hallazgos

(Se completa con cada corrida; ordenados por gravedad.)
