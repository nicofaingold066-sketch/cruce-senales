# Enmienda 16: coherencia del borrador del agente (0057)

**Qué pidió Nico (24 oct, 09:4x, vía coordinador, y confirmado en la sesión auditoria-agente a las 09:49):** «arreglá todo tipo de coherencia en las respuestas». Origen: `docs/auditoria-agente.md` §2b, donde 4 de 7 casos simulados contra `proponer_plan_borrador` daban una propuesta incoherente (pádel para 12, fútbol para 3, fiesta de mínimo 6 para 4 que pedían cine, brunch de máximo 6 para 20).

`contrato` sigue en 2. Misma firma (`proponer_plan_borrador(p_espacio_id uuid, p_sabado date, p_clima jsonb)`), mismos campos de respuesta, mismos códigos de frase y mismos textos. No hay RPC nuevas: la lista permitida no cambia. Solo cambian **qué candidatas salen y en qué orden**.

## Qué cambia

**(a) Tamaño del grupo (solo grupos sin propósito).** Tamaño = miembros activos no pendientes (el mismo `v_posibles` de E14). Cada opción del catálogo cae en uno de tres rangos:

| Rango | Condición | Qué pasa |
|---|---|---|
| 0, entra | `personas_min <= tamaño <= personas_max` | va primero |
| 1, cupo chico | `personas_max < tamaño` | **se descarta** si hay alguna opción que entra; si no hay ninguna, va después de las que entran |
| 2, falta gente | `personas_min > tamaño` | va al final |

En grupos con propósito no cambia nada: ya descartaban `personas_min > tamaño` (E14 d) y su rango es siempre 0.

**(b) Las marcas pesan con cualquier tamaño.** «Me gustaría» suma 3 por persona también con 4 personas o menos. Antes valía 0 (regla **E7.1** de la enmienda 7).

**(c) Lo marcado antes que lo no marcado.** Dentro de cada rango, primero van las opciones que alguien marcó y después las que nadie marcó. En un grupo con propósito, su actividad cuenta como marcada (así el +3 de E14 d sigue igual).

El orden completo queda: rango de tamaño → marcada → puntaje de siempre (con las marcas de (b)) → desempates de siempre (viaje máximo, viaje total, precio, orden del catálogo).

## Qué no cambia

- Descartes: presupuesto (el más bajo), techo con lluvia o sin pronóstico, viaje máximo de cada uno, familia y mínimo en grupos con propósito.
- `perfil_grupo`, `el_mas_elegido` y `ritmo_del_grupo` siguen con sus umbrales (más de 3 personas además de quien pide, al menos 2 marcas). Los textos de la respuesta no dicen más que antes.
- `quorum`, `sin_plan_compatible` y sus motivos.

## Lo que se pierde (decisión de Nico)

**E7.1 protegía la privacidad en grupos chicos:** con 2 o 3 personas, el orden de las candidatas podía dejar adivinar qué marcó el otro. Con (b) y (c) eso vuelve a ser posible, por ejemplo: en un grupo de 2, si sale primero algo que yo no marqué, lo marcó el otro. Nico priorizó la coherencia («no me importa la privacidad ahora»). Los textos siguen sin decirlo.

## Pruebas

- Nueva: `tests/backend/coherencia-borrador.test.ts`, los 7 casos de la auditoría.
- Ajustadas con el comentario «E16»: ver la lista al final de esta sección (se completa al correr la suite).

## Migración y reversa

- `supabase/migrations/0057_coherencia_borrador.sql`. Parte de la versión vigente en producción, `20261024115616_actividad_grupo` (0050 más los filtros `salio_en`), **no** de la de 0050.
- `supabase/revertir/0057_coherencia_borrador.sql` vuelve a esa versión.
- Ensayo en seco (24 oct, 09:47): la función nueva y los 7 casos dentro de un bloque que se deshace solo. Resultado: 7/7 coherentes y un control de grupo con propósito (fútbol con 3 personas → tenis más aviso de quórum, igual que antes).
