# Mejoras (la bola de nieve) — la edita solo el coordinador

Lista viva y priorizada. Cada agente toma la PRIMERA mejora sin tomar que sea de sus rutas (`PROPIEDAD.md`), la reclama en su archivo de `agentes/`, la hace, la verifica y propone nuevas en su sección "Ideas". El coordinador, en cada ciclo (cada ~20 min), integra lo entregado, prueba, despliega y reordena esta lista con las ideas nuevas.

Estados: `libre` · `tomada por <agente>` · `entregada (commit)` · `verificada` · `descartada (motivo)`.

## P1 — Que la demo no falle (lo primero siempre)
| # | Mejora | Dueño | Estado |
|---|---|---|---|
| 1 | Prueba automática del recorrido canónico completo (dos sesiones reales + simulados, baja, reparación, sin opción), corrida dos veces | codex | verificada (1511b34; 7 pruebas e2e pasan al integrar) |
| 2 | Botones repetidos por persona en Simulación con nombre ("Se baja: Caro") y aria-label | claude-b-interfaz | tomada por claude-b-interfaz |
| 3 | Base del agente (enmienda 4: preferencias, catálogo, proponer_plan_borrador) con pruebas | backend | verificada (0014-0016, 36 pruebas) |
| 4 | Enganche de la pantalla del agente en el espacio y precarga del borrador en Nueva propuesta | claude-b-interfaz | entregada (dd66806), probada en vivo por agente-ia |
| 5 | Desplegar la función del agente en Supabase y probarla en vivo (con y sin clave) | coordinador + agente-ia | desplegada y verificada SIN clave (2,3 s); falta con clave |
| 6 | Recorrido completo en DOS teléfonos reales con el link público | Nico + Juan + coordinador | libre |

| 18 | U2: "Crear y abrir" permite crear dos propuestas (doble envío) | claude-b-interfaz | libre |
| 19 | U3: tope de tiempo para peticiones que no terminan | claude-b-interfaz | libre |

| 23 | Clima de simulación en espacios demo ("Clima real / Simular sol / Simular lluvia", rotulado Simulación; la función lo acepta solo si get_space dice demo) | agente-ia | desplegada y verificada (b709369, función v2) |
| 24 | Prop `demo` en `AgentePanel` para mostrar el selector de clima solo en demos | claude-b-interfaz | entregada (5bea676), en main dfc010b; falta publicar en Vercel |

## P2 — Que se entienda a la primera (UX de la demo)
| 20 | U1, U4, U5, U6, U7 de la revisión de Codex | claude-b-interfaz | libre |
| # | Mejora | Dueño | Estado |
|---|---|---|---|
| 7 | Primera pantalla: en 5 segundos se entiende qué hace CRUXE y qué tocar | claude-b-interfaz | entregada (764b1cb), integrada |
| 8 | Pantalla de reparación: que la "versión 2 con cero heredadas" se vea obvia (comparación v1 → v2) | claude-b-interfaz | entregada (878caea), integrada |
| 9 | Historial legible para el jurado: quién hizo qué, en qué versión y a qué hora, marcando Simulación | claude-b-interfaz | libre |
| 10 | Revisión de la interfaz (autoridad en el cliente, textos prematuros, respuestas viejas, datos privados) | codex | entregada (3718b6b): hallazgos U1-U7 pasados a claude-b |
| 11 | Explicación del agente: que diga por qué ese plan sin revelar a nadie, con la fuente (modelo o texto fijo) visible | agente-ia | entregada (9cfd290), verificada sin clave |

| 25 | "Compartir por WhatsApp" con el mensaje del agente (enlace wa.me con el texto, sin integraciones) | agente-ia | entregada (ffcc186), en main dfc010b; falta publicar en Vercel |
| 26 | Perfil agregado visible al grupo ("Asado: 5 de 6") solo con 4 o más personas | agente-ia | entregada (71a0cff) y función v3 desplegada; en main dfc010b |
| 27 | Redesplegar la función del agente con los textos corregidos de wip/agente-ia (lote con el próximo cambio; antes del sábado 11:00) | coordinador | hecha: función agente v3 desplegada desde 71a0cff y probada en vivo |

## P3 — Calidad y robustez
| # | Mejora | Dueño | Estado |
|---|---|---|---|
| 12 | Nombres con tabulador o espacio no separable al inicio: normalizar para que no esquiven `nombre_en_uso` | backend | verificada (0017; 123 pruebas pasan) |
| 13 | ACL por defecto de `supabase_admin` y de tablas en `public`: endurecer si es posible | backend | verificada (0018); los defaults de supabase_admin no se pueden cambiar con nuestro rol |
| 14 | Paquete > 500 KB: dividir el código para que cargue más rápido en el teléfono | claude-b-interfaz | libre |
| 21 | `simulate_save_preferences` para variantes del jurado en vivo (enmienda 5) | backend | verificada (0019 y 0020, en main dfc010b; corrida completa 126/129, las 3 restantes pasan solas) |
| 22 | `opcion_anterior` {version, franja_clave} en el estado tras una reparación, para mostrar "Sábado → Domingo" en la comparación v1 → v2 (idea de claude-b) | backend, luego claude-b-interfaz | libre (después de #21) |
| 15 | Sondeo liviano (`p_desde_rev`) para no bajar el estado completo cada 3 s | backend + claude-b-interfaz | backend verificada (0021, en main dfc010b); claude-b-interfaz: libre para usar p_desde_rev/rev_vista |
| 16 | README contra las bases (3 preguntas, componentes, participantes) | codex | verificada (b45c226): README compacto adoptado |
| 17 | Variantes del jurado (`docs/jurado-variantes.md`) verificadas con pruebas reales | codex | verificada en API (f89ab42); falta en el navegador |

## Para Nico (no las toma un agente)
- Crear la clave de la API de Anthropic con límite de gasto y cargarla como secreto de la función `agente` en Supabase.
- Elegir el modelo del agente (por defecto `claude-haiku-5-5`; Juan pidió calidad).
- Rotar la clave publishable de Supabase después del evento.

## Ideas por triar (las copia el coordinador desde las secciones "Ideas" de cada agente)
- (backend) Correr `cruce.verificar_privilegios()` como paso del despliegue. → candidata P3, dueño coordinador.
- (backend) `simulate_save_preferences` para variantes del jurado en vivo. → candidata P2, dueño backend, después de #12 y #13.
