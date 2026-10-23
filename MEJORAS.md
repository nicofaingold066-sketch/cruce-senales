# Mejoras (la bola de nieve) — la edita solo el coordinador

Lista viva y priorizada. Cada agente toma la PRIMERA mejora sin tomar que sea de sus rutas (`PROPIEDAD.md`), la reclama en su archivo de `agentes/`, la hace, la verifica y propone nuevas en su sección "Ideas". El coordinador, en cada ciclo (cada ~20 min), integra lo entregado, prueba, despliega y reordena esta lista con las ideas nuevas.

Estados: `libre` · `tomada por <agente>` · `entregada (commit)` · `verificada` · `descartada (motivo)`.

## P1 — Que la demo no falle (lo primero siempre)
| # | Mejora | Dueño | Estado |
|---|---|---|---|
| 1 | Prueba automática del recorrido canónico completo (dos sesiones reales + simulados, baja, reparación, sin opción), corrida dos veces | codex | tomada por codex |
| 2 | Botones repetidos por persona en Simulación con nombre ("Se baja: Caro") y aria-label | claude-b-interfaz | tomada por claude-b-interfaz |
| 3 | Base del agente (enmienda 4: preferencias, catálogo, proponer_plan_borrador) con pruebas | backend | verificada (0014-0016, 36 pruebas) |
| 4 | Enganche de la pantalla del agente en el espacio y precarga del borrador en Nueva propuesta | claude-b-interfaz | tomada por claude-b-interfaz |
| 5 | Desplegar la función del agente en Supabase y probarla en vivo (con y sin clave) | coordinador + agente-ia | libre (espera a 3) |
| 6 | Recorrido completo en DOS teléfonos reales con el link público | Nico + Juan + coordinador | libre |

## P2 — Que se entienda a la primera (UX de la demo)
| # | Mejora | Dueño | Estado |
|---|---|---|---|
| 7 | Primera pantalla: en 5 segundos se entiende qué hace CRUXE y qué tocar | claude-b-interfaz | libre |
| 8 | Pantalla de reparación: que la "versión 2 con cero heredadas" se vea obvia (comparación v1 → v2) | claude-b-interfaz | libre |
| 9 | Historial legible para el jurado: quién hizo qué, en qué versión y a qué hora, marcando Simulación | claude-b-interfaz | libre |
| 10 | Revisión de la interfaz (autoridad en el cliente, textos prematuros, respuestas viejas, datos privados) | codex | libre |
| 11 | Explicación del agente: que diga por qué ese plan sin revelar a nadie, con la fuente (modelo o texto fijo) visible | agente-ia | libre |

## P3 — Calidad y robustez
| # | Mejora | Dueño | Estado |
|---|---|---|---|
| 12 | Nombres con tabulador o espacio no separable al inicio: normalizar para que no esquiven `nombre_en_uso` | backend | libre |
| 13 | ACL por defecto de `supabase_admin` y de tablas en `public`: endurecer si es posible | backend | libre |
| 14 | Paquete > 500 KB: dividir el código para que cargue más rápido en el teléfono | claude-b-interfaz | libre |
| 15 | Sondeo liviano (`p_desde_rev`) para no bajar el estado completo cada 3 s | backend + claude-b-interfaz | libre |
| 16 | README contra las bases (3 preguntas, componentes, participantes) | codex | libre |
| 17 | Variantes del jurado (`docs/jurado-variantes.md`) verificadas con pruebas reales | codex | libre |

## Para Nico (no las toma un agente)
- Crear la clave de la API de Anthropic con límite de gasto y cargarla como secreto de la función `agente` en Supabase.
- Elegir el modelo del agente (por defecto `claude-haiku-5-5`; Juan pidió calidad).
- Rotar la clave publishable de Supabase después del evento.

## Ideas por triar (las copia el coordinador desde las secciones "Ideas" de cada agente)
- (backend) Correr `cruce.verificar_privilegios()` como paso del despliegue. → candidata P3, dueño coordinador.
- (backend) `simulate_save_preferences` para variantes del jurado en vivo. → candidata P2, dueño backend, después de #12 y #13.
