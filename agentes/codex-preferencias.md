# Codex · preferencias más ordenadas

Pedido directo del usuario: «quiero que cambiemos en la parte de preferencias de cada uno, que sea mas ordenado visualmente y sea mas estetico». Alcance: presentación de las preferencias privadas, en rama aislada; sin publicar producción.

## Tocando ahora
- Ampliación directa del usuario: selector claro/oscuro en preferencias, quitar esquinas violetas y título elegido «GRU · Planes para el grupo».
- Nuevos `src/lib/tema.ts`, `src/components/PreferenciaTema.tsx`, `src/components/PreferenciaTema.css`; `index.html` y una importación en `src/main.tsx` para tema persistente desde el arranque.
- `src/styles.css`, `src/estilo/seccion-s4.css`: solo transformar los selectores del modo oscuro; `src/estilo/seccion-s6.css`: neutralizar fondo externo de preferencias.
- `src/screens/Perfil.tsx`: montar Apariencia. Excepción puntual del pedido nuevo: importación y montaje de Apariencia en `src/agente/AgentePanel.tsx` y tres rótulos del título en `src/screens/Espacio.tsx`. Esos dos archivos tienen trabajo de GRU en su otra copia: solo se tocan estos fragmentos en la rama aislada; no se modifica su checkout ni sus funciones. Al integrar, conservar «GRU · Planes para el grupo» y Apariencia junto con el personaje.
- Rama `codex/preferencias-visuales`, copia `/Users/macair/cruse/cruce-preferencias`; pruebas locales con fixtures, sin base ni modelos.

## Pedidos
- Coordinador: entrega de preferencias lista para integrar en el circuito habitual: `codex/preferencias-visuales` `565d350`. Único archivo `src/estilo/seccion-s6.css`; no se editó AgentePanel.tsx, que está reclamado por GRU. No se publicó producción ni se solicita trabajo a otras conversaciones.

## Entregado
Objetivo visual cumplido. Actividades en cuadrícula, selección con marca además de color, bloques suaves para presupuesto/energía/ambiente/lugar, viaje y permisos con espaciado uniforme, acciones separadas y resumen más cuidado. Estilos limitados a `#agente-preferencias`, cuadrícula por ancho del contenedor, modos claro/oscuro existentes, alto contraste con controles nativos. Sin JSX, lógica, contratos, dependencias ni archivos de configuración modificados.

Typecheck y build finales verdes con ejecutables originales restaurados; `git diff --check` correcto. Quince casos de navegador local verificados: 320/375/768/1280 en claro y oscuro; opciones abiertas/cerradas, validación vacía con foco, guardar/resumen/editar/cancelar, consentimiento independiente, solo lectura, teclado, movimiento reducido y alto contraste. Cero desbordes, objetivos visibles >=44 px, errores JS o solicitudes externas. La primera expectativa de duración exactamente 0 falló por la política global de 1e-06s; se ajustó a umbral de movimiento imperceptible y el caso pasó. Red y datos completamente ficticios; no certifica persistencia remota.

Vista previa interactiva: `http://127.0.0.1:4203/`. Arnés fuera del repo: `/tmp/cruxe-preferencias-preview/`. Capturas y salidas: `/Users/macair/.codex/visualizations/2026/10/24/01a16da8-de03-7fc0-ba16-59b52a264cc7/preferencias/`.

Incidente local resuelto: el wrapper pnpm instaló automáticamente y movió once dependencias compartidas a `.ignored`. Se restauraron los once directorios originales y enlaces de binarios, se retiraron el lockfile/config generados y se repitió typecheck/build con Node directo, todo verde. Ningún cambio de dependencias en Git.
