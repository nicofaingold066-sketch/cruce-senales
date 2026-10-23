# Revisión independiente de fundamentos — CRUCE

Fecha: 23 de octubre de 2026. Operador 1. Base identificada: `62ea06a`, rama `wip/fundamentos`, con archivos que otros operadores siguieron agregando durante la lectura.

## Alcance y evidencia

Lectura de AGENTS.md, contexto-proyecto.md (incluida sección 7), caso-canonico.md, contrato.md v1, como-correr.md, package.json, lockfile, configuración Vite/Vitest/TypeScript, .gitignore, .env.example, pruebas básicas y piezas del cliente. Lectura complementaria del esquema inicial, sin modificaciones. No se consultó el contenido de .env ni se hicieron llamadas al backend. Los riesgos de contrato no se presentan como vulnerabilidades demostradas de funciones desplegadas.

No instalé dependencias ni ejecuté compilación, tests, migraciones, commits o cambios de rama. La ejecución de build/typecheck puede escribir dist y archivos incrementales; se mantuvo el límite de escribir únicamente este informe. El Node del runtime de la app existe (v24.22.1); que npm no esté en el PATH de esta terminal no demuestra que el proyecto no compile. El contexto afirma que el andamiaje compila y que Auth anónimo está habilitado; no lo verifiqué de forma independiente.

**Resultado: 5 hallazgos de gravedad alta, 7 media y 2 baja.**

## Gravedad alta

### A1. Los demás participantes pueden ocupar el lugar del imprescindible

- **Dónde:** contrato §§1.15, 1.16 y 2.3 (`maximo`, orden de llegada, `aceptar`).
- **Por qué importa:** el motor permite más elegibles que cupos y no reserva sitio al imprescindible. Con mínimo 2, máximo 2 y tres elegibles, dos invitados aceptan primero: quedan dos confirmados, falta el anfitrión, y este recibe `cupo_completo`. Sin una baja voluntaria no hay forma de confirmar ni de pedir reparación desde `esperando_compromisos`.
- **Cambio propuesto:** reservar un cupo para el imprescindible hasta su aceptación. Definir el resultado para un invitado cuando solo queda ese cupo y ajustar `puede.aceptar`. Agregar la prueba con el anfitrión aceptando último; la prueba actual de último cupo lo hace aceptar primero y no descubre este bloqueo.

### A2. Reclamar un asiento puede heredar compromisos que la sesión real nunca confirmó

- **Dónde:** contrato §1.2, regla 2; §§1.6 y 3.2.
- **Por qué importa:** cualquier sesión con código y nombre puede convertir un simulado en real conservando condiciones y aceptaciones anteriores. Si Luna reclama después de una aceptación simulada, queda como persona real con un compromiso que ella no realizó. Además, el organizador ya conocía esas condiciones: la conversión no puede volverlas privadas retroactivamente. El recorrido normal reclama antes de cargar datos, pero la API no exige ese orden.
- **Cambio propuesto:** permitir reclamos únicamente antes de que ese asiento tenga condiciones, elegibilidad o aceptaciones en propuestas; para un asiento usado, rechazar el reclamo o crear un miembro real nuevo sin heredar compromisos. Mantener los eventos simulados históricos como simulación. Probar reclamo tardío y reclamo concurrente con `simulate_accept`/`simulate_save_conditions`.

### A3. Un reintento tardío del reinicio puede borrar una demo nueva

- **Dónde:** contrato §1.7; §0.7 no incluye `reset_demo`; esquema inicial `cruce.intentos.propuesta_id ON DELETE CASCADE`.
- **Por qué importa:** si el reinicio se ejecuta pero se pierde su respuesta, el usuario puede crear otra propuesta y después repetir el reinicio pendiente, borrándola. Asimismo, al borrar los intentos de `create_proposal`, un reintento viejo de creación puede recrear una propuesta eliminada. Un bloqueo por propuesta no resuelve ninguna de las dos situaciones.
- **Cambio propuesto:** añadir identificador de intento al reinicio y una generación del espacio demo. Conservar tombstones de los intentos eliminados o rechazar solicitudes de generaciones anteriores. Definir cómo se responde a una creación repetida cuyo objeto ya fue eliminado. Probar reinicio → propuesta nueva → repetición del reinicio y de una creación vieja.

### A4. Falta cerrar la atomicidad entre espacio, reclamo, seed y propuestas

- **Dónde:** contrato §0.8, §§1.2, 1.5, 1.7, 1.8 y operaciones simuladas.
- **Por qué importa:** la serialización especificada es por propuesta, pero seed aún no tiene propuesta; join cambia la identidad del asiento en todo el espacio; reset borra varias propuestas; create necesita deduplicarse antes de tener un id. Sin una regla adicional, dos seeds pueden crear dos demos para una sesión o una simulación puede autorizarse antes de que se reclame el asiento y escribir después. El índice de intentos evita duplicados almacenados, pero no define qué respuesta recibe la llamada concurrente.
- **Cambio propuesto:** fijar un orden único de bloqueos (espacio/usuario de seed → intento → propuesta, o un orden equivalente documentado), restricciones únicas y revalidación tras adquirirlos. Incluir lecturas que expiran propuestas. Agregar pruebas concurrentes seed/seed, join/simulación, reset/create y create/create con el mismo intento. No se afirma que ya existan estas carreras en RPC desplegadas: faltan garantías y evidencia.

### A5. El contrato no especifica por completo la frontera de privilegios de las RPC

- **Dónde:** contrato §0.1; contexto §3 (`SECURITY DEFINER`); esquema inicial (tablas privadas y funciones futuras).
- **Por qué importa:** bloquear tablas es una buena base, pero las funciones privilegiadas son el acceso efectivo a esos datos. El contrato no fija `search_path`, permisos de helpers ni prohíbe exponer helpers que reciban un miembro arbitrario. Una RPC auxiliar pública mal autorizada puede eludir toda la privacidad de las tablas. No es una fuga observada: las funciones públicas aún deben revisarse.
- **Cambio propuesto:** declarar una lista permitida de RPC públicas; helpers en esquema privado sin EXECUTE para roles del navegador; `search_path` seguro y referencias calificadas; autorización de actor y pertenencia dentro de cada entrada privilegiada. Verificar permisos reales, funciones auxiliares y consultas directas desde una sesión ajena antes de C0/C3. Referencia: [seguridad de funciones de Supabase](https://supabase.com/docs/guides/database/functions), que distingue ejecución como invocador/definidor y permisos de ejecución.

## Gravedad media

### M1. `state_rev` no ordena todos los datos que viajan en una respuesta

- **Dónde:** contrato §§1.13, 4 y tabla 5.1; cliente `src/lib/hooks.ts`, `usePropuestaViva`.
- **Por qué importa:** guardar condiciones cambia `personas_con_condiciones` y `mi_situacion`, pero mantiene la revisión. Una lectura anterior que llegue tarde con la misma revisión puede sobrescribir la respuesta posterior al guardado. Reclamar un asiento también cambia nombres/indicadores `simulado` sin una política de revisión de las propuestas. La regla «aplicar si es mayor o igual» no distingue estas respuestas.
- **Cambio propuesto:** versionar todos los datos representados (incluido el agregado), o separar una revisión privada/de miembros y una secuencia de respuestas. Definir precedencia entre sondeo y mutación a revisión igual. Probar respuesta anterior entregada después del guardado y actualización de un simulado reclamado.

### M2. Las cantidades agregadas permiten inferir condiciones individuales

- **Dónde:** contrato §§3.1–3.2 (`personas_con_condiciones`, `cupos.pendientes`); espacios de prueba de dos personas y panel de simulación.
- **Por qué importa:** en un espacio de dos personas, quien ya completó sus condiciones sabe si la otra las completó por el total. Si solo cambia una persona desconocida, la cantidad de pendientes y la franja publicada pueden revelar su elegibilidad. El organizador conoce las condiciones de todos los simulados y puede aislar la información del único miembro real restante. Ocultar nombres de elegibles no garantiza ausencia de inferencias.
- **Cambio propuesto:** explicitar que la garantía es no entregar condiciones individuales ni motivos, y documentar la inferencia inevitable de una coordinación compartida; si se exige privacidad frente a inferencia, suprimir/desdibujar agregados en grupos pequeños y revisar la evaluación como canal de información. Añadir casos adversariales de dos personas y un real entre simulados.

### M3. Un error de red se presenta como garantía de que nada quedó registrado

- **Dónde:** `src/lib/api.ts`, `MENSAJE_SIN_CONEXION` y tratamiento de fetch fallido; `src/lib/types.ts`, comentario `sinConexion`.
- **Por qué importa:** la petición puede confirmar en el servidor y perderse la respuesta. El texto «La acción no quedó registrada» puede inducir a repetir con un intento nuevo o tomar una decisión equivocada sobre el compromiso.
- **Cambio propuesto:** distinguir falta de conexión detectada antes de enviar de resultado desconocido después del envío. Mostrar «No pudimos confirmar el resultado» en el segundo caso; refrescar estado y conservar el intento original para reintentar.

### M4. El momento del plazo y su precedencia en reintentos quedan abiertos

- **Dónde:** contrato §§0.5–0.8, 1.8 y 1.16.
- **Por qué importa:** no se fija si el plazo se evalúa al iniciar la transacción o después de esperar el bloqueo. Una aceptación puede empezar antes y obtener el bloqueo después del cierre. Además, una creación repetida tras vencer su plazo debe recuperar el resultado guardado, pero validar primero «plazo futuro» podría rechazarla. Las reglas generales de plazo y las de replay requieren una precedencia inequívoca.
- **Cambio propuesto:** definir el instante de decisión del servidor después del bloqueo y usarlo coherentemente. Validar forma antes del replay, pero rangos temporales dependientes del reloj después de recuperar intentos. Añadir pruebas de espera de bloqueo cruzando el cierre y replay exitoso después del plazo.

### M5. Las pruebas actuales pueden dar verde sin probar ninguna RPC

- **Dónde:** `tests/andamiaje.test.ts`, package.json (`test:backend`), vitest.config.ts; contrato §§6–7.
- **Por qué importa:** `test:backend` ejecuta `tests/`, que actualmente incluye una suma y presencia de variables. Una URL que contenga `supabase.co` y cualquier clave no vacía pasan sin conexión, contrato, privacidad ni identidad verificadas. No se ejecutaron estas pruebas en esta revisión.
- **Cambio propuesto:** separar pruebas de andamiaje de `tests/backend/` y hacer que el comando de backend exija una prueba C0 real. Agregar por cortes las pruebas del contrato con pocas sesiones reutilizadas y limpieza aislada. Asegurar que un backend inexistente falle, en vez de dar verde por pruebas triviales.

### M6. Crear espacios y simulados no tiene una recuperación segura de resultado desconocido

- **Dónde:** contrato §§1.1 y 1.6 frente a §0.7.
- **Por qué importa:** `create_space` y `add_simulated_member` no reciben intento. Tras perder la respuesta, repetir create_space crea otro espacio; repetir la creación del simulado devuelve `nombre_en_uso` aunque la primera haya funcionado. El cliente no puede aplicar el mismo protocolo de recuperación que a las propuestas.
- **Cambio propuesto:** añadir `p_intento_id` o definir una recuperación explícita por lectura con identidad estable. Fijar también normalización de nombres para la creación del simulado. Probar commit exitoso con respuesta perdida en ambas operaciones.

### M7. El contraejemplo no se puede ejecutar linealmente después del final feliz

- **Dónde:** caso canónico paso 7; contrato §§1.13, 1.18 y 5.1; estado inicial visible en `src/App.tsx`.
- **Por qué importa:** después de confirmar v2, Tomi no puede cambiar condiciones por estar congeladas, y `propose_repair` exige `en_revision`. El contrato aclara que el contraejemplo es una rama desde la baja de Caro, pero el caso sigue pareciendo un séptimo paso consecutivo. En cinco minutos, descubrirlo en vivo obliga a rehacer el recorrido. Al momento de la lectura App aún renderiza el andamiaje, aunque hay pantallas en desarrollo: su existencia no demuestra un flujo integrado.
- **Cambio propuesto:** fijar un guion cronometrado con dos ramas: ejecutar el contraejemplo en revisión, luego restituir disponibilidad y reparar; o usar un segundo espacio preparado. Reclamar Luna antes de simular datos, conservar las dos sesiones, verificar ruta de entrada e integración completa antes del ensayo. Marcar lo pendiente como tal, sin tratar archivos en construcción como defectos terminados.

## Gravedad baja

### B1. El caso y las decisiones del contexto todavía no son una fuente consistente

- **Dónde:** caso canónico pasos 3 y 6, condiciones privadas y costo; contrato §§5 y 8; contexto §6.
- **Por qué importa:** el contexto ya decide Sofi elegible en B, dos participantes reales más simulación y costo fuera de alcance. El contrato aún las llama decisiones a confirmar y el caso habla de sesiones distintas por persona. Un operador que siga solo el caso puede implementar o narrar algo distinto.
- **Cambio propuesto:** actualizar caso y pendientes del contrato para incorporar esas decisiones ya tomadas, distinguir elegibles de aceptantes y dejar explícito qué personajes se simulan. No reabrir esas decisiones como si faltara aprobación.

### B2. Falta cerrar la receta reproducible de ejecución y dependencias

- **Dónde:** como-correr.md, package.json, package-lock.json, .env.example y AGENTS.md.
- **Por qué importa:** Node 24 está solo en la guía, no en `engines` ni en un archivo de versión. La guía usa `npm install` aunque existe lockfile. El ejemplo no identifica el proyecto permitido y las pruebas no detectan una clave de tipo incorrecto. No aparece aún el inventario `docs/componentes-externos.md` exigido por AGENTS. No hay evidencia de incompatibilidad de paquetes: las versiones instaladas no se consideran fallas por su número.
- **Cambio propuesto:** documentar `npm ci`, fijar Node 24 y registrar componentes externos; indicar la URL de proyecto esperada y comprobar tipo de clave sin imprimirla. Mantener el lockfile versionado. `.gitignore` cubre `.env`, variantes locales, node_modules, dist y archivos incrementales correctamente; no requiere ampliar ignorados sin una necesidad concreta.

## Condiciones para dar por cerrada esta revisión

Resolver A1–A4 en el contrato antes de consolidar RPC/UI; concretar y auditar A5 al publicar funciones. Después exigir C0 real y el recorrido en dos sesiones, incluyendo doble clic, último cupo con anfitrión último, versión vieja, cierre mientras se espera un bloqueo, reclamo tardío y reintento después de reset. Las propuestas de cambio de este informe no fueron aplicadas.
