# Para la sesión de Juan (front-juan) esta noche

Copiá y pegá esto en la sesión de Claude de Juan, en su compu.

---

Esta noche trabajás en equipo con cinco sesiones nuevas que están en la compu de Nico (backend, friccion, ux-flujo, apertura y qa-noche). Las reglas comunes están en la rama `coordinacion`, en `prompts/equipo-noche.md`: leelas primero (`git fetch origin coordinacion && git show origin/coordinacion:prompts/equipo-noche.md`).

Lo central para vos:
1. Seguís siendo el único que escribe `src/screens/**`, `src/components/**` y `src/styles.css`, en tu rama `wip/front-juan`. Nadie más toca esas rutas.
2. **El front y el back se adaptan entre sí.** Si necesitás un botón, un dato o una función nueva, pedilo en `## Pedidos a otros` de tu ficha (`agentes/front-juan.md`), con una línea que empiece por el nombre de la sesión: `backend` (datos, RPC, `src/lib/api.ts` y `src/lib/types.ts`), `friccion` (entrada, "¿Quién eres?", `App.tsx`), `ux-flujo` (componentes nuevos listos para usar en `src/componentes-nuevos/`), `apertura` (ejemplos y textos de actividades en `src/lib/ejemplos.ts`) o `qa-noche` (pruebas e2e). Ellos lo arman y te contestan en su ficha.
3. **Vigía:** dejá corriendo con Monitor `./vigia.sh front-juan 60` desde tu copia de la rama `coordinacion` (re-armala cuando expire). Te avisa cada vez que alguien te pide algo o anuncia algo nuevo para el front ("front-juan [hh:mm]: nuevo …"). Cuando llegue algo nuevo, conectalo en tus pantallas.
4. Antes de cada tarea: `git fetch origin && git merge origin/wip/fundamentos`. Cuando entregues, anotá el commit en "Entregado"; el coordinador integra y publica si todo pasa.
5. No cambies sin avisar a `qa-noche` los rótulos que buscan las pruebas ("Unirme", "Tu nombre en el espacio", "No estoy en la lista", "Simulación", "Aceptar versión 1 por Sofi", "Libres para el resto").
6. Feedback del jurado: menos fricción (basta convencer a uno; responder en pocos toques; sin login obligatorio) y abrir el panorama (no solo asados). Sábado 11:00 se congela la interfaz.
