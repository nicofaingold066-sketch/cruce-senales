# Revisión Codex 6 · privacidad #29 y red #34

23 oct 2026, Santiago. Revisor independiente. Base de código 92477ef, integración incorporada desde origin/wip/fundamentos. Cambios propios solo en tests/e2e/** y este informe. No se editaron src/, supabase/, configuración ni main; no hay dependencias nuevas.

## Resultado

- #29: **5/5** (8.18 s), RPC real + handler real del agente en runtime local sin clave de modelo. Singleton ausente; segundo voto visible; sin nombres/ids/preferencias individuales; errores de autorización sin datos privados. Cero intentos de modelo. No certifica la función desplegada ni elimina las inferencias documentadas en la enmienda 7.
- #34: **8 regresiones correctas y 1 defecto reproducido**, en Chrome, sin llamadas externas reales. Incluye timeout de lectura/escritura, doble clic, reintento tras respuesta perdida, revisión vieja, rev_vista, desconexión, reinicio y panel de simulación.
- Typecheck y build: exit 0.
- Hallazgos nuevos: **0 altos, 1 medio, 0 bajos**.

## Media · F1 — primera lista válida descartada por inicialización de generación

**Dónde:** src/screens/Espacio.tsx:32–38, 53–69 y 74–82 (base 92477ef). Archivo del dueño de interfaz; no modificado.

**Por qué importa:** al abrir un espacio, cargarTodo lanza get_space y list_proposals en paralelo. cargarLista captura generacion=null. Si get_space responde primero, cargarEspacio establece generacion=1. Al llegar la lista válida, el filtro gen !== generacion.current la descarta. La inicialización desde null no entra en reinicio, así que no pide otra lista. Se ve el espacio cargado junto a «Cargando propuestas…» aunque ambas respuestas fueron exitosas. Puede quedar así hasta el sondeo de 10 s o un cambio de visibilidad, y gastar tiempo de la demo.

**Reproducción ejecutada:** `node tests/e2e/red-controlada.mjs`, caso F1. Monta el Espacio original; get_space devuelve generación 1 tras 20 ms y list_proposals devuelve LISTA_INICIAL_VALIDA tras 180 ms. Tras terminar ambas respuestas se observa el título del espacio, cero tarjetas y «Cargando propuestas…». Emitir visibilitychange dispara una lectura adicional y aparece la tarjeta. No se esperaron los 10 s: ese plazo sale del código; la prueba verificó la recuperación por refresco de visibilidad.

**Cambio concreto propuesto (claude-b-interfaz):** establecer la generación antes de pedir la primera lista (por ejemplo, esperar cargarEspacio antes de cargarLista en la carga inicial), o lanzar una nueva lectura también cuando la generación pasa de null a su primer valor. Mantener el descarte de listas emitidas en una generación anterior y la barrera de state_rev. Convertir F1 en regresión positiva: la primera respuesta válida debe dibujar la lista sin otra petición ni sondeo.

## Archivos y ejecución

- tests/e2e/privacidad-agente.test.ts: suite Vitest, usa cinco identidades ficticias propias; consulta la marca de migración antes de preparar y antes de cada caso real. Lee index.ts sin editarlo, elimina tipos con Node e inyecta imports/runtime; las RPC y JWT son reales. El entorno inyectado nunca devuelve ANTHROPIC_API_KEY y tiene una trampa de construcción de modelo.
- tests/e2e/red-controlada.html, .jsx, .mjs: banco de navegador reutilizable, imports originales, intercepción externa total. El servidor simulado de N2 permite probar que el cliente reutiliza intento; no demuestra idempotencia real del backend.
- tests/e2e/evidencia-privacidad-red.md: comandos, preparación fallida, salidas literales y límites.

#29 pasó antes de que backend reportara 0024. Después avanzó a 0025; no se volvió a cargar la base durante el trabajo de migraciones. No afirmar que este corte valida E7 completa o la producción. No hay llamadas a modelos, comentarios en GitHub ni cambios en datos ajenos.
