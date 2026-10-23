# Mejoras (la bola de nieve) — la edita solo el coordinador

Lista viva y priorizada. Cada agente toma la PRIMERA mejora sin tomar que sea de sus rutas (`PROPIEDAD.md`), la reclama en su archivo de `agentes/`, la hace, la verifica y propone nuevas en su sección "Ideas". El coordinador, en cada ciclo (cada ~20 min), integra lo entregado, prueba, despliega y reordena esta lista con las ideas nuevas.

Estados: `libre` · `tomada por <agente>` · `entregada (commit)` · `verificada` · `descartada (motivo)`.

## P1 — Que la demo no falle (lo primero siempre)
| # | Mejora | Dueño | Estado |
|---|---|---|---|
| 1 | Prueba automática del recorrido canónico completo (dos sesiones reales + simulados, baja, reparación, sin opción), corrida dos veces | codex | verificada (1511b34; e2e 9/9 al integrar 1c5c37e) |
| 2 | Botones repetidos por persona en Simulación con nombre ("Se baja: Caro") y aria-label | claude-b-interfaz | entregada, integrada |
| 3 | Base del agente (enmienda 4: preferencias, catálogo, proponer_plan_borrador) con pruebas | backend | verificada (0014-0016, 36 pruebas) |
| 4 | Enganche de la pantalla del agente en el espacio y precarga del borrador en Nueva propuesta | claude-b-interfaz | entregada (dd66806), probada en vivo por agente-ia |
| 5 | Desplegar la función del agente en Supabase y probarla en vivo (con y sin clave) | coordinador + agente-ia | función v4 desplegada y verificada SIN clave; falta con clave (decisión de Nico) |
| 6 | Recorrido completo en DOS teléfonos reales con el link público | Nico + Juan + coordinador | libre (después de publicar main en Vercel) |
| 18 | U2: "Crear y abrir" permite crear dos propuestas (doble envío) | claude-b-interfaz | entregada (a4b1e30), en main |
| 19 | U3: tope de tiempo para peticiones que no terminan | claude-b-interfaz | entregada (10b014d), en main |
| 23 | Clima de simulación en espacios demo (rotulado Simulación; la función lo acepta solo si get_space dice demo) | agente-ia | verificada (función v4) |
| 24 | Prop `demo` en `AgentePanel` para mostrar el selector de clima solo en demos | claude-b-interfaz | entregada (5bea676), en main |
| 28 | PRIVACIDAD: `proponer_plan_borrador` devuelve en `perfil_grupo.gustos` actividades con `cuantos: 1` al llamarlo directo (deja adivinar quién la eligió). Filtrar `cuantos >= 2` en la base | backend | en curso por backend (0023 aplicada 13:51; falta commit y pruebas) |
| 29 | Regresión de privacidad del agente en `tests/e2e/`: ni el RPC ni la función devuelven gustos de una sola persona, nombres ni preferencias individuales (sin clave de modelo: texto fijo) | codex | libre |

## P2 — Que se entienda a la primera (UX de la demo)
| # | Mejora | Dueño | Estado |
|---|---|---|---|
| 7 | Primera pantalla: en 5 segundos se entiende qué hace CRUXE y qué tocar | claude-b-interfaz | entregada (764b1cb), integrada |
| 8 | Pantalla de reparación: que la "versión 2 con cero heredadas" se vea obvia (comparación v1 → v2) | claude-b-interfaz | entregada (878caea), integrada |
| 9 | Historial legible para el jurado: quién hizo qué, en qué versión y a qué hora, marcando Simulación | claude-b-interfaz | libre |
| 10 | Revisión de la interfaz (autoridad en el cliente, textos prematuros, respuestas viejas, datos privados) | codex | entregada (3718b6b): hallazgos U1-U7 pasados a claude-b |
| 11 | Explicación del agente: que diga por qué ese plan sin revelar a nadie, con la fuente (modelo o texto fijo) visible | agente-ia | entregada (9cfd290), verificada sin clave |
| 20 | U1, U4, U5, U6, U7 de la revisión de Codex | claude-b-interfaz | U1 (188f22e) y U4 (7f01756) en main; U5 tomada; U6 y U7 libres |
| 25 | "Compartir por WhatsApp" con el mensaje del agente (enlace wa.me, sin integraciones) | agente-ia | entregada (ffcc186), en main |
| 26 | Perfil agregado visible al grupo ("Asado: 5 de 6") solo con 4 o más personas | agente-ia | verificada: 71a0cff + filtro de una sola persona 05b2c46, función v4 |
| 27 | Redesplegar la función del agente en lote | coordinador | hecha: v4 desplegada desde 05b2c46 y probada en vivo |
| 30 | Portada: si la sesión ya tiene la demo, mostrar la propuesta activa con su estado ("Te toca confirmar") para llegar en un toque desde el segundo teléfono (idea de claude-b) | claude-b-interfaz | libre |
| 31 | Tarjetas de propuestas en el espacio con estado destacado (color + punto, "Tu turno") según `siguiente_accion.codigo` (idea de claude-b) | claude-b-interfaz | libre |
| 32 | Panel del agente a prueba de demo: estados claros de cargando / falla temporal / sin plan compatible, reintento, y que nunca bloquee la pantalla del espacio | agente-ia | entregada (40710d5), integrada en wip/fundamentos 85c18b1; typecheck y build en verde |

## P3 — Calidad y robustez
| # | Mejora | Dueño | Estado |
|---|---|---|---|
| 12 | Nombres con tabulador o espacio no separable al inicio: normalizar para que no esquiven `nombre_en_uso` | backend | verificada (0017; 123 pruebas pasan) |
| 13 | ACL por defecto de `supabase_admin` y de tablas en `public`: endurecer si es posible | backend | verificada (0018); los defaults de supabase_admin no se pueden cambiar con nuestro rol |
| 14 | Paquete > 500 KB: dividir el código para que cargue más rápido en el teléfono | claude-b-interfaz | libre |
| 15 | Sondeo liviano (`p_desde_rev`) para no bajar el estado completo cada 3 s | backend + claude-b-interfaz | backend verificada (0021, en main); claude-b-interfaz: libre (después de U5–U7) |
| 16 | README contra las bases (3 preguntas, componentes, participantes) | codex | verificada (b45c226): README compacto adoptado |
| 17 | Variantes del jurado (`docs/jurado-variantes.md`) verificadas con pruebas reales | codex | verificada en API (f89ab42); falta en el navegador |
| 21 | `simulate_save_preferences` para variantes del jurado en vivo (enmienda 5) | backend | verificada (0019 y 0020, en main) |
| 22 | `opcion_anterior` {version, franja_clave, inicio, fin} en el estado tras una reparación ("Sábado → Domingo" en v1 → v2) | backend, luego claude-b-interfaz | entregada por backend (52ae246, 0022 aplicada); verificación del coordinador pendiente |
| 33 | `cruce.verificar_privilegios()` como paso fijo después de cada migración (idea de backend) | coordinador | libre |
| 34 | Respuestas fuera de orden y tope de tiempo probados con red controlada (idea de codex): guion reproducible en `tests/e2e/` o informe | codex | libre (después de #29) |

## Para Nico (no las toma un agente)
- DECIDIR cómo publicamos `main` en Vercel: el plan gratis agotó los 100 despliegues del día (Vercel Pro de Juan o esperar a que se libere el cupo).
- Crear la clave de la API de Anthropic con límite de gasto y cargarla como secreto de la función `agente` en Supabase.
- Elegir el modelo del agente (por defecto `claude-haiku-5-5`; Juan pidió calidad).
- Rotar la clave publishable de Supabase después del evento.

## Ideas por triar (las copia el coordinador desde las secciones "Ideas" de cada agente)
- (backend) Correr `cruce.verificar_privilegios()` como paso del despliegue. → candidata P3, dueño coordinador.
- (backend) `simulate_save_preferences` para variantes del jurado en vivo. → candidata P2, dueño backend, después de #12 y #13.
