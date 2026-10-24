# Sistema de diseño (rediseño de la noche)

Fase 1, sábado 24 oct 2026. Código: `src/estilo/sistema.css` (tokens y componentes base, importado primero desde `src/styles.css`) y `src/components/ui.tsx` (componentes base). Solo diseno (esta noche, la sesión frontend en ese rol) toca esos dos archivos; cada sección escribe lo suyo en `src/estilo/seccion-sN.css`.

## Tipografía

**Plus Jakarta Sans** (Google Fonts, licencia OFL; registrada en `docs/componentes-externos.md`), con `system-ui` de respaldo. Pesos: 400 texto, 500 chips y rótulos, 600 botones y subtítulos, 700 títulos de tarjeta, 800 títulos de pantalla y cifras.

**Cuatro tamaños, y solo cuatro** (en toda la app; cada sección migra los suyos en la fase 2):

| Token | Tamaño | Interlineado | Uso |
|---|---|---|---|
| `--t-titulo` | 24 px (1.5rem) | 1.2 | título de pantalla (h1), la cifra o la fecha del resultado |
| `--t-subtitulo` | 18 px (1.125rem) | 1.3 | título de tarjeta (h2), el dato importante de una tarjeta |
| `--t-cuerpo` | 16 px (1rem) | 1.45 | texto, botones, campos, chips, pestañas |
| `--t-nota` | 13 px (0.8125rem) | 1.4 | notas, metadatos, rótulos de campo, «suave» |

Reglas: nada por debajo de 13 px (ni en chips ni en avatares: las iniciales de un avatar chico usan 13 px); los números grandes de la escena usan `--t-titulo` con peso 800, no un quinto tamaño; `clamp()` y `vw` quedan fuera.

## Espaciado, radios, sombras, toques

| Token | Valor | Uso |
|---|---|---|
| `--e-1` … `--e-6` | 4, 8, 12, 16, 24, 32 px | separación dentro y entre piezas (`--e-4` = relleno de tarjeta y margen de pantalla; `--e-5` entre tarjetas) |
| `--r-s`, `--r-m`, `--r-l` | 10, 16, 24 px | chips y campos; tarjetas; hojas y botones grandes (ya existían, se conservan) |
| `--sombra-flota`, `--sombra-hoja` | (ya existían) | tarjeta flotante / hoja sobre la escena |
| `--toque` | 44 px | alto mínimo de todo lo que se toca (botones, chips, pestañas, filas de lista) |
| `--margen` | 16 px | gutter en el teléfono (ya existía); en 1280 px el contenido va en una columna de 640 px centrada (ya existía) |

## Color (se conserva la paleta; contraste AA)

Neutros cálidos (`--fondo`, `--hoja`, `--relleno`, `--linea`, `--tinta`, `--tinta-2`, `--tinta-3`), marca `--brasa` (solo para lo que es tuyo o urgente), escena `--noche` (siempre oscura), estados `--ok`, `--revision`, `--error`, `--info`, `--sim` (siempre con texto o ícono, nunca solo color). Modo oscuro por `prefers-color-scheme`.

Contraste sobre el fondo de tarjeta (calculado a mano, aproximado):

| Par | Claro | Oscuro |
|---|---|---|
| `--tinta` / hoja | 18:1 | 16:1 |
| `--tinta-2` / hoja | 7,6:1 | 9,5:1 |
| `--tinta-3` / hoja | **5,2:1** (antes 3,6:1; corregido en la fase 1) | 4,6:1 |
| `--brasa` / hoja (texto) | 5,0:1 | 7,9:1 |
| `--ok`, `--revision`, `--error`, `--info` / hoja (texto) | 4,9 · 5,5 · 5,9 · 6,1 | ≥ 7 |
| `--noche-texto` / `--noche` | 17:1 | — |
| `--noche-suave` / `--noche` | 8,7:1 | — |

## Componentes base (`src/components/ui.tsx`)

| Componente | Clase | Uso |
|---|---|---|
| `Card` (`titulo?`, `accion?`, `id?`, `className?`, `children`) | `tarjeta` + `tarjeta-cabeza` | la unidad de contenido; una pregunta o un resultado por tarjeta; título en `--t-subtitulo` |
| `Boton` (`variante`: `primario` · `secundario` · `peligro`; además `turno` para «te toca» y `claro` sobre la escena) | `btn btn-*` | **un solo primario por pantalla** (negro, o brasa si es `turno`); `ocupado` en vez de `disabled` mientras trabaja (mejora #44) |
| `Chip` (`tono`: `neutro` · `ok` · `aviso` · `info` · `sim`; `activo?`, `onClick?`) | `chip chip-*` (`chip-activo`, `chip-tocable`) | estado, rótulo o filtro; 13 px, 500, 28 px de alto (44 si se toca). No confundir con `.pastilla`, que ya existía en la escena |
| `Aviso` (`tono`: `info` · `aviso` · `error` · `ok`; `titulo?`, `accion?`, `ref?`, `tabIndex?`) | `aviso aviso-*` | una sola cosa que decir; `role=status` (o `alert` si es error) |
| `EncabezadoSeccion` (`titulo`, `nota?`, `accion?`) | `encabezado-seccion` | separa bloques dentro de una pantalla; título en `--t-subtitulo`, nota en `--t-nota`, una acción secundaria a la derecha |
| `Confirmacion` (en `src/components/Confirmacion.tsx`) | `aviso aviso-aviso` con foco | pregunta antes de una acción que no se deshace |

Los demás componentes de `ui.tsx` (Avatar, AvatarPila, Progreso, ErrorCaja, Vacio, DiaTile, Nombre, InsigniaEstado, Cargando) siguen como están y adoptan los tokens cuando su sección los toque.

## Movimiento (pedido de Nico, 02:40; sin librería)

Cinco movimientos, y solo estos. Las secciones los usan con estas clases y no inventan otros. Todo en `src/estilo/sistema.css`; con `prefers-reduced-motion` queda quieto.

| Qué | Cómo se usa | Dura |
|---|---|---|
| Presión del dedo | automático en `.btn`, chips, opciones, pestañas y la tarjeta del plan (`:active` encoge 3 %) | `--dur-1` 120 ms |
| Aparecer | automático en `.hoja .tarjeta` y `.lista-planes > li`, escalonado de a 40 ms (hasta 8); `.sd-aparecer` para otra pieza; `.sd-escalonado` escalona a sus hijos | `--dur-2` 220 ms |
| La hoja sube | automático en `.hoja` al abrir cada pantalla | `--dur-3` 380 ms |
| Confirmación | `className="sd-exito"` en la tarjeta de «¡Se juntan!», «Ya confirmaste» y «Respuesta guardada» (no en un contenedor con barra fija adentro: lleva `transform`) | 460 ms |
| Trabajando | `<ul className="sd-pasos">` con `<li className="sd-paso-hecho">` / `sd-paso-activo`; `.sd-pulso` para una espera sin pasos | late a 1 s |

Además (02:55): `.sd-respira` (el resultado del plan respira una vez al cambiar de estado; poner con `key={estado}`), `.sd-confirmado` (late una vez al confirmar), chips y opciones activos laten 180 ms, y la **hoja desde abajo** `.sd-hoja-modal` (240 ms) con `.sd-velo` detrás, para el «+» de Mi espacio. `IconoGrupo` (ui.tsx) marca el nivel Grupo. Aire: `--margen` 20 px en el teléfono y 40 en computadora, `--entre-tarjetas` 12 px, `--entre-bloques` 24 px.

Las de la hoja y las tarjetas se mueven con `top`, no con `transform`: un transform en un contenedor vuelve relativa a la barra fija de abajo y la hace saltar.

## Reglas de composición (las revisa diseno en cada entrega)

1. Una pantalla = un resultado arriba, una acción primaria, el resto plegado o secundario.
2. Jerarquía solo con los cuatro tamaños y dos pesos (400 / 600–800); el color no es jerarquía.
3. Nada se pisa a 320, 375 ni 1280 px: toda tira horizontal desplaza (`overflow-x: auto`) o envuelve (`flex-wrap`); todo texto largo corta con `overflow-wrap: anywhere`.
4. 44 px para tocar; foco visible (`--foco`) en todo lo que se toca.
5. Textos al hueso: ninguna frase que explique lo que la pantalla ya muestra; los avisos de privacidad que importan, en una línea.
6. Lo privado nunca aparece; «Datos ficticios», «Simulación» y «Lo redactó la IA» se mantienen.
7. Los rótulos que buscan los guiones no cambian, o el guion acepta los dos en la misma entrega.

## Cómo entrega una sección

Rama propia (`wip/rediseno-sN` o la del dueño), `src/estilo/seccion-sN.css` importado desde la pantalla que lo usa (`import '../estilo/seccion-s2.css'`), tsc + `npx vitest run src $(ls tests/*.test.ts)` + build en verde, capturas a 320, 375 y 1280 px en `docs/rediseno/capturas/sN/`, cuenta de toques de la tarea de la sección, y la lista de rótulos cambiados con el guion que los acepta. diseno revisa con las reglas de arriba y la pasa al coordinador.
