# CRUCE: reglas para agentes (Codex, Claude)

Hackatón Señales (Makana), 23-24 oct 2026. CRUCE convierte "nos juntamos" en un encuentro que ocurre: condiciones privadas, una opción compatible, confirmación de una versión del plan y reparación cuando alguien se baja.
Fuente del caso: `docs/caso-canonico.md`. Leerlo antes de cualquier cambio.

## Reglas que no se rompen
- Todo dato es ficticio. Nunca datos de personas reales.
- Ningún secreto en el repo, en el cliente, en capturas ni en logs. Solo la clave pública llega al navegador.
- Sin código previo propio o privado. Solo librerías abiertas y plantillas públicas. Registrar cada componente externo (nombre y enlace) en `docs/componentes-externos.md` para el README.
- Un dueño por carpeta. No tocar carpetas ajenas. Un cambio de contrato se propone a Codex; nadie cambia un nombre o significado por su cuenta.
- No agregar dependencias sin avisar. No usar APIs facturables ni activar créditos o planes.
- No inventar: si falta un dato, preguntar o dejarlo pendiente y rotulado.
- Commits chicos con mensaje claro. No hacer push a `main` sin una prueba pasada. `main` siempre debe poder desplegarse.

## Reglas del producto
- Interés no es confirmación. El silencio nunca es asistencia.
- Las condiciones privadas nunca aparecen en respuestas compartidas, errores ni logs.
- Una confirmación corresponde a UNA versión del plan. Una versión nueva no hereda aceptaciones.
- El servidor decide cupos, plazos, elegibilidad y estado. La interfaz nunca los calcula como autoridad.
- La IA, si se usa, solo explica; nunca confirma ni cambia estados.

## Dueños
- Codex: contrato (`docs/contrato.md`), dependencias comunes, configuración general, integración y pruebas de punta a punta.
- Claude A: backend, base de datos, permisos y reglas (`supabase/`, `server/` o lo que fije el contrato).
- Claude B: interfaz (`src/`).

## Reporte al terminar un corte
Objetivo cumplido (sí/no/parcial) · archivos tocados · pruebas corridas y resultado observado · límites conocidos · próxima dependencia.
