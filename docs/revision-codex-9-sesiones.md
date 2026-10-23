# Revisión Codex 9 · recuperación de sesiones (#69)

23 oct 2026, America/Santiago. Asignación del coordinador: TABLERO de `coordinacion`, 16:51; incluye extender #47 a la pantalla #66. Base congelada: `61c5228`, login corte 1 `cd4d885`. Rutas reclamadas en `agentes/codex.md`, push `b1544fd` antes de ejecutar las pruebas.

## Resultado

Objetivo cumplido: sí. Doce casos de navegador pasan con SDK, helpers, Inicio y App/login originales. Cero defectos nuevos observados dentro de este alcance. Evidencia reproducible y salida literal en [evidencia-sesiones-recuperacion.md](../tests/e2e/evidencia-sesiones-recuperacion.md).

Se comprueba la identidad real que conserva el SDK local después de cada intento, además de la copia guardada, los mensajes y el foco. Todas las peticiones externas están interceptadas: Auth y las tres RPC necesarias reciben respuestas ficticias; cualquier otra salida se bloquea y hace fallar el caso. Ninguna petición de logout está permitida por las aserciones.

## Cobertura

| Caso | Comprobación |
|---|---|
| S1 | Guardar el refresh rotado de Tomi, crear Pepe y volver a Tomi desde Inicio, con recarga real. |
| S2 | Otro cambio de persona conserva la copia previa de Tomi. |
| S3 | Refresh rechazado al guardar: identidad actual conservada, sin signup. |
| S4 | Escritura de la copia bloqueada: no se crea otra identidad. |
| S5 | Signup rechazado: conserva Tomi y elimina solamente la copia creada por ese intento. |
| S6 | Fallo de transporte al volver: conserva Pepe y copia; permite reintentar. |
| S7 | Copia inválida y doble clic: un refresh, conserva Pepe, elimina copia y avisa. |
| S8 | Olvidar: cancelar conserva; confirmar elimina solo la copia, sin revocar identidad. |
| S9 | Signup rechazado con copia anterior: conserva Pepe y esa copia. |
| L1 | App/login completo: retorno válido lleva a portada con espacios de Tomi. |
| L2 | Login con copia inválida: conserva Pepe, ofrece las tres entradas y enfoca demo. |
| L3 | Login con HTTP 503: conserva copia e identidad; foco en otra persona. |

El control negativo modifica solo la respuesta del Auth ficticio en S1: devuelve Pepe al pedir volver a Tomi. La aserción de identidad debe fallar (exit 1); no se altera producto para probar el banco.

## Límites y próxima dependencia

Es QA offline a 375 × 812 px en Chrome, con contextos nuevos por caso. No certifica Auth remoto, rotación/reutilización real de tokens, RLS, sesiones vencidas, varias pestañas ni teléfonos físicos. La sesión activa ficticia tiene una hora de vigencia: no generalizar su conservación al caso de acceso vencido. No se invocaron base, función del agente ni modelos; tampoco se ejecutó otra suite en el turno de migración 0032.

Los errores recuperables esperan los reintentos reales del SDK antes del mensaje final (aproximadamente 26 segundos). Conviene que el dueño de interfaz evalúe si el texto de espera explica esa demora; no se cambia aquí el comportamiento del SDK.

El nuevo ingreso por lista de integrantes de enmienda 9 y el rediseño `wip/front-juan` están fuera de esta base. Próxima dependencia: integración del coordinador y nuevo corte asignado para esas pantallas; cualquier prueba con servicios reales requiere turno liberado.

## Entrega

Cambios propios: tres archivos `tests/e2e/sesiones-recuperacion.{mjs,jsx,html}`, su evidencia y este informe. Sin cambios propios en producto, configuración o dependencias. Typecheck, build, sintaxis del runner y revisión de espacios pasan; resultados detallados en la evidencia.
