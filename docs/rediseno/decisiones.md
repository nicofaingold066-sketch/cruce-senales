# Decisiones del rediseño (las toma quien hace el rol de diseno; Nico y Juan duermen)

Cada decisión: qué, por qué y qué pasa si no gusta. Las de la fase 1 las tomó la sesión frontend en el rol de diseno (sábado 24 oct, 02:15–03:00). Las secciones agregan las suyas abajo, con hora y sección.

## Fase 1

1. **La tipografía entra por Google Fonts en `index.html`** (Plus Jakarta Sans, pesos 400, 500, 600, 700 y 800, `display=swap`), con `system-ui` de respaldo. Sin dependencia de npm. Si no hay red (guiones sin red, teléfono sin señal), se ve la fuente del sistema y nada se rompe. Registrada en `docs/componentes-externos.md`.
2. **Cuatro tamaños de letra, y solo cuatro:** título 24 px, subtítulo 18 px, cuerpo 16 px, nota 13 px (`--t-titulo`, `--t-subtitulo`, `--t-cuerpo`, `--t-nota` en `src/estilo/sistema.css`). Los números grandes del resultado (una cifra, la fecha) usan el tamaño título; no hay un quinto. La cuenta de hoy en `styles.css` es de 30 tamaños distintos: **la fase 1 define los cuatro y la fuente; cada sección migra sus tamaños en la fase 2** en su `seccion-sN.css`. Lo que no se migre antes de las 09:00 queda como está; nada se rompe por estar a medio camino, porque los tokens solo se suman.
3. **La paleta se queda** (neutros cálidos, brasa para lo que es tuyo o urgente, la escena oscura). Es sobria, ya tiene modo oscuro y los guiones de rincones la verificaron. Cambio puntual: `--tinta-3` en modo claro pasa de `#8b857e` (3,6:1 sobre blanco, no llega a AA) a `#6f6962` (5,2:1). Los demás pares cumplen AA (ver `sistema.md`).
4. **El botón primario sigue siendo el negro (tinta) y la brasa queda reservada para «te toca»** (`variante="turno"`, la acción que marca el servidor con `te_toca_aceptar`). Razón: Nico pidió «sobrio, que no se note hecho por IA»; un naranja por pantalla en cada acción se vería ruidoso, y hoy la brasa ya significa «es tu turno», que es el momento más importante de la app. La regla que sí cambia: **un solo botón primario (negro o brasa) por pantalla**; todo lo demás es secundario. Cada sección deja uno.
5. **No se rediseña `styles.css` entero en la fase 1.** Cambiar 5.700 líneas sin verlas a 320 px rompería la demo. `sistema.css` se importa primero (desde `styles.css`) y define tokens y componentes base; cada sección trae su `src/estilo/seccion-sN.css` y reemplaza solo lo suyo.
6. **Los componentes base se suman a `ui.tsx`, no reemplazan los que hay.** `Card`, `Chip` y `EncabezadoSeccion` son nuevos; `Boton` y `Aviso` ya existían y se documentan. Las pantallas de hoy siguen compilando y los guiones siguen encontrando sus rótulos.
7. **La entrada animada se va** (S1). Son tres segundos y un toque antes de la primera pantalla; Tricount no tiene intro. Si rincones la busca (R00), el guion pasa a aceptar que no esté.
8. **Una sola portada** (S1): la de sesión nueva (`login/Entrar.tsx`) y la de sesión con grupos (`screens/Inicio.tsx`) se fusionan. Arriba lo que me toca; abajo crear un grupo, tengo un código, ver la demo. «Tengo un código» aparece una sola vez (E8, O-04).
9. **Crear grupo lleva directo a Nueva propuesta** (S2). Hoy cae en el grupo vacío con un botón; eso es un toque y una pantalla de más para quien organiza (flujo-usuario §3.1). La invitación se manda igual desde el plan y desde el grupo.
10. **«Crear solo el borrador» se va** (S3). Ningún guion lo toca y el borrador solo agrega un paso; «Crear y abrir al grupo» queda como único cierre del formulario.
11. **Mis planes y la portada con sesión son la misma lista** (S1/S2). Si no da el tiempo para fusionar rutas, Mis planes queda como pestaña con la misma tarjeta; no se duplica diseño.
12. **«Espacio» pasa a «grupo» en todos los textos de pantalla, salvo los rótulos que buscan los guiones** («Tu nombre en el espacio», «Personas del espacio» si algún guion lo lee), que cambian solo cuando el guion acepte los dos. Igual con «Franja A/B» → «Opción A/B» en el frente (la ficha conserva «Franja»).
13. **La accesibilidad de la noche no se pierde:** `Confirmacion` y `useVolverFoco` viven en `src/components/Confirmacion.tsx` (no en `ui.tsx`) y usan `Aviso` con `ref` y `tabIndex`; la `Aviso` nueva conserva esas props. Las confirmaciones de «Entrar como otra persona» (Perfil) y «Olvidarla» (Sesiones) quedan para la sección S1 con el sistema nuevo.
14. **Horario:** si el sistema no está publicado a las 03:15, las secciones arrancan igual sobre los tokens de `wip/diseno` (están en GitHub) y el coordinador publica todo junto. A las 09:00, la sección que no esté en verde queda como hoy (`main` tiene la etiqueta `demo-segura`).

## Fase 2 (las agregan los dueños de sección)

- (sección, hora) decisión · por qué · alternativa descartada
