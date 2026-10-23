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
| 6 | Recorrido completo en DOS teléfonos reales con el link público | Nico + Juan + coordinador | libre: la versión nueva ya está publicada (14:06) |
| 18 | U2: "Crear y abrir" permite crear dos propuestas (doble envío) | claude-b-interfaz | entregada (a4b1e30), en main |
| 19 | U3: tope de tiempo para peticiones que no terminan | claude-b-interfaz | entregada (10b014d), en main |
| 23 | Clima de simulación en espacios demo (rotulado Simulación; la función lo acepta solo si get_space dice demo) | agente-ia | verificada (función v4) |
| 24 | Prop `demo` en `AgentePanel` para mostrar el selector de clima solo en demos | claude-b-interfaz | entregada (5bea676), en main |
| 28 | PRIVACIDAD: `proponer_plan_borrador` devuelve en `perfil_grupo.gustos` actividades con `cuantos: 1` al llamarlo directo (deja adivinar quién la eligió). Filtrar `cuantos >= 2` en la base | backend | verificada en vivo (66a1910, 0023): el RPC directo devuelve solo Asado 3 y Fútbol 2 |
| 29 | Regresión de privacidad del agente en `tests/e2e/`: ni el RPC ni la función devuelven gustos de una sola persona, nombres ni preferencias individuales (sin clave de modelo: texto fijo) | codex | libre |
| 46 | PRIVACIDAD, enmienda 7 (E7.1 a E7.4, migraciones 0024 a 0027): orden de candidatas en grupos chicos, conteos de la propuesta solo para el organizador, simulación solo en demo, perfil sin quien llama y sin presupuesto | backend | tomada por backend |
| 47 | Navegador compartido (hallazgo 8): si `join_space` responde `ya_era_miembro`, avisar "Este navegador ya está en este espacio como <nombre>" y ofrecer "Entrar como otra persona" (cierra la sesión, crea una nueva y repite `join_space`) | claude-b-interfaz | libre (antes que #43) |
| 48 | Interfaz de la enmienda 7: con `cupos.pendientes` / `personas_con_condiciones` en null no mostrar "Faltan por responder" ni "Con condiciones cargadas"; herramientas de Simulación solo en espacios demo | claude-b-interfaz | libre cuando backend entregue E7.2 y E7.3 |
| 49 | Respaldo del hallazgo 5 (no usar ni mandar `el_mas_elegido` si la actividad no está en `gustosVisibles`) y hallazgo 7 (sin `presupuesto_grupo` en la respuesta, el respaldo ni el modelo; "gratis", "barat*", "económic*" y "presupuesto" a PROHIBIDAS; corregir el doc) | agente-ia | aprobada, libre |
| 43 | Textos que prometen unanimidad (R1 de revision-codex-5): "hasta que ... todas las personas la confirmen de nuevo" (En revisión) y "Cada persona tiene que confirmar de nuevo" (comparación v1 → v2). Decir: se necesitan de nuevo al menos N confirmaciones, incluido el anfitrión; quien participe confirma la versión nueva | claude-b-interfaz | libre |

## P2 — Que se entienda a la primera (UX de la demo)
| # | Mejora | Dueño | Estado |
|---|---|---|---|
| 7 | Primera pantalla: en 5 segundos se entiende qué hace CRUXE y qué tocar | claude-b-interfaz | entregada (764b1cb), integrada |
| 8 | Pantalla de reparación: que la "versión 2 con cero heredadas" se vea obvia (comparación v1 → v2) | claude-b-interfaz | entregada (878caea), integrada |
| 9 | Historial legible para el jurado: quién hizo qué, en qué versión y a qué hora, marcando Simulación | claude-b-interfaz | entregada (460c8b5), integrada en wip/fundamentos |
| 10 | Revisión de la interfaz (autoridad en el cliente, textos prematuros, respuestas viejas, datos privados) | codex | entregada (3718b6b): hallazgos U1-U7 pasados a claude-b |
| 11 | Explicación del agente: que diga por qué ese plan sin revelar a nadie, con la fuente (modelo o texto fijo) visible | agente-ia | entregada (9cfd290), verificada sin clave |
| 20 | U1, U4, U5, U6, U7 de la revisión de Codex | claude-b-interfaz | entregadas todas: U1 188f22e, U4 7f01756, U5–U7 a9fbe42 |
| 25 | "Compartir por WhatsApp" con el mensaje del agente (enlace wa.me, sin integraciones) | agente-ia | entregada (ffcc186), en main |
| 26 | Perfil agregado visible al grupo ("Asado: 5 de 6") solo con 4 o más personas | agente-ia | verificada: 71a0cff + filtro de una sola persona 05b2c46, función v4 |
| 27 | Redesplegar la función del agente en lote | coordinador | hecha: v4 desplegada desde 05b2c46 y probada en vivo |
| 30 | Portada: si la sesión ya tiene la demo, mostrar la propuesta activa con su estado ("Te toca confirmar") para llegar en un toque desde el segundo teléfono (idea de claude-b) | claude-b-interfaz | entregada (5e0a788), publicada en Vercel 14:06 |
| 31 | Tarjetas de propuestas en el espacio con estado destacado (color + punto, "Tu turno") según `siguiente_accion.codigo` (idea de claude-b) | claude-b-interfaz | entregada (a1fa96b), publicada 14:20 |
| 32 | Panel del agente a prueba de demo: estados claros de cargando / falla temporal / sin plan compatible, reintento, y que nunca bloquee la pantalla del espacio | agente-ia | entregada (40710d5), integrada en wip/fundamentos 85c18b1; typecheck y build en verde |
| 44 | Toda la app a 375 px como el panel del agente (#35): toques de 44 px, `aria-live` en cambios de estado de la propuesta, foco útil tras errores, sin desborde | claude-b-interfaz | libre (después de #43) |
| 35 | Panel del agente en el teléfono y accesible: `aria-live` en cargando/errores, foco al botón útil tras un error, toques de 44 px, probado a 375 px | agente-ia | entregada (b49705e), integrada en wip/fundamentos |
| 37 | `docs/agente-ia.md` al día con lo construido (privacidad con mínimo 2, clima simulado solo en demo, respaldo sin clave, fuentes visibles), corto y verificable para el jurado | agente-ia | entregada (71a2628), integrada en wip/fundamentos e415341 |
| 38 | Pruebas de la función sin red ni modelo (textoValido, sinNombres, entradaModelo, filtro de mínimo 2, clima simulado solo en demo) versionadas en `supabase/functions/agente/` y con el comando en `docs/agente-ia.md` | agente-ia | verificada (837a126): 14/14 con `node --test "supabase/functions/agente/*.test.ts"`, integrada 8d2b8be |
| 39 | Redesplegar la función `agente` v5 en lote (index.ts + logica.ts; bloquea "reserv*" y "agend*"). Antes del sábado 10:00 | coordinador | hecha: función v5 desplegada (index.ts + logica.ts de 487d2fc) y probada en vivo |
| 40 | Sin clave de modelo, que el "por qué" con texto fijo use también el ritmo y el ambiente del grupo (solo totales, nunca de una persona), para que la demo sin IA no suene genérica | agente-ia | verificada y publicada (función v5 + pantalla 14:20) |
| 41 | Recorrido del agente en producción desde un teléfono (375 px) con evidencia en `docs/agente-ia.md` (fecha, hora del reloj, versión) | agente-ia | entregada (deeea83): evidencia 14:09–14:11 en producción a 375 px, en main |
| 42 | Revisión de privacidad de solo lectura de toda la app contra el agente: ¿alguna pantalla, respuesta o error deja ver preferencias o condiciones de otra persona? Informe con archivo y línea en `docs/agente-revision-privacidad.md`; los arreglos los hace cada dueño | agente-ia | verificada (a3d74db): 8 hallazgos, ninguna exposición directa; decisiones en docs/contrato-enmienda-7.md |

## P3 — Calidad y robustez
| # | Mejora | Dueño | Estado |
|---|---|---|---|
| 12 | Nombres con tabulador o espacio no separable al inicio: normalizar para que no esquiven `nombre_en_uso` | backend | verificada (0017; 123 pruebas pasan) |
| 13 | ACL por defecto de `supabase_admin` y de tablas en `public`: endurecer si es posible | backend | verificada (0018); los defaults de supabase_admin no se pueden cambiar con nuestro rol |
| 14 | Paquete > 500 KB: dividir el código para que cargue más rápido en el teléfono | claude-b-interfaz | verificada (6d9806c): build en partes, recorrido demo → agente → propuesta probado con la versión compilada |
| 15 | Sondeo liviano (`p_desde_rev`) para no bajar el estado completo cada 3 s | backend + claude-b-interfaz | entregada en ambos lados (0021 + 6df9595), publicada 14:20 |
| 16 | README contra las bases (3 preguntas, componentes, participantes) | codex | verificada (b45c226): README compacto adoptado |
| 17 | Variantes del jurado (`docs/jurado-variantes.md`) verificadas con pruebas reales | codex | verificada en API (f89ab42); falta en el navegador |
| 21 | `simulate_save_preferences` para variantes del jurado en vivo (enmienda 5) | backend | verificada (0019 y 0020, en main) |
| 22 | `opcion_anterior` {version, franja_clave, inicio, fin} en el estado tras una reparación ("Sábado → Domingo" en v1 → v2) | backend, luego claude-b-interfaz | verificada en el navegador (a294210): "Sábado 31 oct 14:00 → Domingo 1 nov 14:00", v2 desde cero; publicada 14:20 |
| 33 | `cruce.verificar_privilegios()` como paso fijo después de cada migración (idea de backend) | coordinador | libre |
| 34 | Respuestas fuera de orden y tope de tiempo probados con red controlada (idea de codex): guion reproducible en `tests/e2e/` o informe | codex | libre (después de #29) |
| 36 | `candidatas` sin señal individual: hoy una actividad elegida por una sola persona puede aparecer como candidata (sin conteo). Evaluar si conviene exigir 2 o completar con catálogo; decidir con el coordinador antes de migrar | backend | descartada: las candidatas también pueden ser actividades que nadie eligió (puntaje por ritmo, ambiente y clima) y no traen conteo; el límite honesto ya está en docs/agente-ia.md |
| 45 | Latencia bajo carga: medir `get_proposal_state`, `accept_version` y `proponer_plan_borrador` con 10 sesiones concurrentes; si algo pasa 1 s o da 57014, proponer índice o ajuste (sin migrar sin aviso) | backend | libre |

## Para Nico (no las toma un agente)
- Vercel: el cupo volvió a las 14:06 y `main` se publicó. Desplegamos solo en lote y por CLI (GitHub sigue desconectado).
- Crear la clave de la API de Anthropic con límite de gasto y cargarla como secreto de la función `agente` en Supabase.
- Elegir el modelo del agente (por defecto `claude-haiku-5-5`; Juan pidió calidad).
- Rotar la clave publishable de Supabase después del evento.

## Ideas por triar (las copia el coordinador desde las secciones "Ideas" de cada agente)
- (agente-ia) Ensayo del agente de 30 segundos para el pitch. → para el sábado: Nico pidió no trabajar el pitch hoy.
- (backend) Correr `cruce.verificar_privilegios()` como paso del despliegue. → candidata P3, dueño coordinador.
- (backend) `simulate_save_preferences` para variantes del jurado en vivo. → candidata P2, dueño backend, después de #12 y #13.
