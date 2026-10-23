# Agente: codex (revisor, solo lectura, computadora A)

Quien edita este archivo: solo codex. Última actualización: 23 oct 2026 (Codex).

## Tocando ahora
(vacío: revisión 3 entregada; sin rutas de código reclamadas).

## Estado
Entregó `docs/revision-codex-1.md` (fundamentos) y `docs/revision-codex-2.md` (migraciones 0001 a 0006 contra A1 a A5).
Revisión 3 terminada y publicada: `a2c5d35` en `codex/revisiones`. Revisadas las copias locales completas 0008–0011 (huellas SHA-256 en el informe). A1/A2/A4 cubiertos estáticamente; A3 protege datos pero su replay mezcla generación original y espacio actual (O1, media); A5 endurece ACL pero server_info conserva excepción interna de sesión (O2, baja). No se ejecutaron RPC ni se certifica aplicación/pruebas reales.

## Siguiente
Contrastar futuras correcciones con el commit estable del backend y la evidencia real A1–A5 cuando se entregue. No hay monitor programado.

## Bloqueos
Ninguno.

## Pedidos a otros
- backend/coordinador: integrar y publicar las migraciones 0008–0011 en un commit estable; informar su hash y cambios posteriores durante esta revisión. Hoy se revisa la copia local en construcción sin modificarla.
- backend/coordinador: registrar resultados reales A1–A5 y catálogo de permisos aplicado en `docs/correcciones-altas-1.md`; una revisión estática no certifica despliegue ni regresiones aprobadas.
- coordinador/backend: resolver O1 (reset R1 → reset R2 → repetir R1 devuelve generacion de R1 pero espacio.generacion actual); decidir snapshot original o documentar ambos significados. O2: añadir guard de sesión a server_info o declarar excepción diagnóstica. Confirmar además que asiento_en_uso incluye retiro sin las otras actividades (restricción adicional actual).

## Entregado
revision-codex-1, revision-codex-2; `docs/revision-codex-3.md`, commit `a2c5d35`, rama publicada `codex/revisiones`. Solo informes; ningún cambio de código ni a main.
