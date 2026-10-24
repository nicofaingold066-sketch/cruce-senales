# Codex · preferencias y apariencia

Pedido directo del usuario: ordenar las preferencias, agregar modo Claro/Oscuro, quitar las esquinas violetas y usar el título elegido «GRU · Planes para el grupo». Después autorizó: «cuando teermines publica los cambios e integralos en la app».

## Tocando ahora
Vacío. Implementación, integración, publicación y verificación terminadas. Copia propia `/Users/macair/cruse/cruce-preferencias`, rama `codex/preferencias-visuales`.

## Entregado
Objetivo cumplido: **`main` y `codex/preferencias-visuales` = `8fba205`**, publicación automática Git/Vercel confirmada con estado success del SHA. App: https://cruce-senales.vercel.app/#/perfil . Push atómico normal desde main `27bcc6c`, sin reescribir historia.

Selector Apariencia en Perfil y Mis preferencias: Claro, Oscuro y Sistema, aplicado al instante a toda la app. Persistencia local con respaldo de sesión/memoria, sincronía entre pestañas y cambios del sistema solo en modo Sistema. Inicialización antes de React para evitar destello. Título elegido en cabecera y acceso del grupo. Fondo exterior del formulario neutro, sin degradado violeta.

Archivos finales respecto al main previo: `index.html`, `src/main.tsx`, nuevos `src/lib/tema.ts` y `src/components/PreferenciaTema.{tsx,css}`, montaje mínimo en `src/agente/AgentePanel.tsx` y `src/screens/Perfil.tsx`, rótulos en `src/screens/Espacio.tsx`, selectores oscuros en `src/styles.css`, `src/estilo/seccion-s4.css`, `src/estilo/vida.css`, y contenedor en `src/estilo/seccion-s6.css`. Sin dependencias, contratos, backend o migraciones modificados.

Integración preserva todo el GRU publicado (`07f037c`), su formulario legible (`3cb0c07`), los ajustes de intro/ayuda y vida (`27bcc6c`). Los conflictos de importación y título se resolvieron con ambos imports y el título elegido por el usuario. El CSS inicial de cuadrícula `565d350` se simplificó al integrar: los controles usan `gru-preferencias.css` existente, sin indicadores duplicados. La única modificación a vida es su selector oscuro para respetar la elección manual; paleta y animaciones conservadas.

Verificación final: typecheck/build/diff-check verdes y árbol limpio. Dieciséis escenarios locales de tema/arranque/almacenamiento/teclado/navegación, ocho tamaños-temas incluidos, pasaron; diez rechecks tras integrar GRU y vida, también. El navegador probó **el build real publicado a 375/1280/320 px**, con Claro y Oscuro forzados sobre el sistema opuesto, recargas, navegación Perfil → grupo → GRU → Perfil, Sistema reactivo, título y esquinas corregidas; cero desbordes o errores JS/assets. Tres Auth y 39 RPC completamente mockeadas, cero llamadas reales a base/modelos. No se certifica persistencia remota de gustos; el tema es local.

Producción sirve `index-DHg1mK-A.js` y `index-amv0LR_h.css`, con el script de arranque de tema. Estado Vercel comprobado por GitHub para el SHA exacto (el conector Vercel no tiene acceso al equipo; no hizo falta cambiar permisos). Las discrepancias iniciales del arnés se corrigieron: ruta real `/private/tmp` de Vite, fieldset de Apariencia siempre visible, y equivalencia rgba/hex con alfa tras minificar; no eran defectos del producto.

Evidencia y capturas: `/Users/macair/.codex/visualizations/2026/10/24/01a16da8-de03-7fc0-ba16-59b52a264cc7/preferencias/produccion/`. Reporte: `verificacion-produccion.json`. Arnés: `/tmp/cruxe-preferencias-preview/`. Vista local: http://127.0.0.1:4203/ .

## Pedidos
Ninguno. Publicación ya autorizada y completada. El coordinador puede incorporar el main publicado a su rama de integración habitual preservando este selector y el título elegido.

## Incidente local anterior, resuelto
El wrapper pnpm instaló automáticamente y movió once dependencias compartidas a `.ignored` en el primer corte. Se restauraron los once directorios originales y enlaces de binarios, se retiraron el lockfile/config generados y se repitió typecheck/build con Node directo, todo verde. Ningún cambio de dependencias en Git.
