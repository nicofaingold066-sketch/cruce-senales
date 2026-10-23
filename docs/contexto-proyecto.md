# Contexto del proyecto CRUXE (para Codex, Juan y cualquier agente)

Última actualización: viernes 23 oct 2026. Este archivo describe el estado real; si algo no está acá, no está hecho.

## 1. Qué es esto
Hackatón Señales de Makana (23 y 24 oct 2026, Las Condes). Equipo: Nico Faingold (`nicofaingold066-sketch`) y Juan Morales (`JuanMorales10`, llega al mediodía). Un jurado de producto puntúa de 1 a 7 tres criterios iguales: Problema, Solución, Convicción. La demo en vivo pesa mucho más que las láminas. Entrega: sábado 24 a las 13:00, se guarda el último commit de `main`. Pitch: 5 minutos con demo en vivo y 3 de preguntas.

## 2. Problema y solución
Caso 06 (problema propio): recuperar el hábito de verse con amigos. Origen: un asado con seis interesados que dejaron de responder y no se hizo. Hipótesis (sin demostrar): no faltan amigos ni ganas, falta cerrar la coordinación.
CRUXE: cada persona carga condiciones PRIVADAS; el servidor propone UNA opción compatible; cada uno confirma esa VERSIÓN exacta del plan; si alguien se baja y se rompe el mínimo, el plan pasa a "En revisión" y se propone una alternativa que todos deben volver a aceptar, con cero aceptaciones heredadas. Interés no es confirmación; el silencio nunca es asistencia.
Detalle del escenario y del recorrido: `docs/caso-canonico.md`. Reglas de trabajo: `AGENTS.md`.

## 3. Arquitectura
- Frontend: React + Vite + TypeScript (`src/`). No calcula elegibilidad, cupos ni confirmación: muestra lo que devuelve el servidor.
- Backend: Supabase, proyecto `cruce-senales` (ref `tjkfdnvzsikncjbskufm`, región sa-east-1). Toda la lógica son funciones Postgres (RPC) SECURITY DEFINER, con RLS en todas las tablas y sin acceso directo a tablas privadas.
- Identidad: sesiones anónimas de Supabase (una por dispositivo). El actor siempre es `auth.uid()`.
- Contrato entre ambos: `docs/contrato.md` (25 operaciones, envoltorio de respuesta, errores tipados, estados, tres contadores: versión del contrato, versión de la opción, `state_rev`).
- Migraciones: `supabase/migrations/` (versionadas; las ya aplicadas no se editan, se agregan nuevas).
- Tests: Vitest en `tests/` contra el proyecto real, con sesiones anónimas independientes.

## 4. Quién es dueño de qué
- Contrato y configuración general: Operador 1 (coordinación). Backend (`supabase/`, `tests/backend/`): Operador 2. Interfaz (`src/`): Operador 3.
- Un dueño por carpeta. Los cambios de contrato se proponen, no se hacen por cuenta propia.
- Ningún agente hace commit ni push a `main`; integra un humano. `main` debe poder desplegarse siempre.

## 5. Estado actual (honesto)
- Hecho: repo público y registrado; Supabase creado; inicios de sesión anónimos activados y límite subido a 500/hora; andamiaje que compila; contrato v1 escrito.
- En curso (workflow de agentes de Claude): backend e interfaz construyéndose en paralelo contra el contrato. Hay una migración inicial escrita (`0001_esquema.sql`) que puede no estar aplicada todavía: confirmar con `list_tables` antes de asumirlo.
- Pendiente: integración con pruebas reales, revisión adversarial, correcciones, despliegue, README (se escribe el sábado).
- Esta rama (`wip/fundamentos`) es una foto del trabajo en curso: puede tener archivos incompletos. No es la entrega.

## 6. Decisiones ya tomadas sobre el contrato
Sofi también es elegible para la franja B y queda pendiente. El estado compartido muestra quién aceptó y cuántos faltan, no los nombres de todos los elegibles. El costo queda fuera de este corte (se declara en el README como lo dejado fuera a propósito). Una baja que rompe el mínimo lleva a "En revisión" con versión nueva. Cada propuesta tiene dos franjas. `create_space` recibe además el nombre visible del creador.

## 7. Qué se pide a Codex ahora (revisión independiente)
Rol: revisor, solo lectura. Escribí únicamente `docs/revision-codex-1.md`. No edites `src/`, `supabase/`, `tests/`, configuración ni dependencias; no hagas commits.
Revisá: (1) ambigüedades del contrato que obliguen a adivinar; (2) contradicciones con `docs/caso-canonico.md`; (3) huecos de privacidad (campos compartidos que filtren condiciones ajenas); (4) operaciones no idempotentes o con carreras (último cupo, doble clic, versión vieja, plazo vencido); (5) problemas del andamiaje (dependencias, scripts, `.env`, `.gitignore`, configuración de TypeScript y Vitest); (6) lo que haría fallar una demo en vivo de 5 minutos.
Entregable: hallazgos ordenados por gravedad (alta, media, baja), cada uno con dónde está, por qué importa y el cambio concreto que proponés.

## 8. Reglas que no se rompen
Datos solo ficticios. Ningún secreto en el repo ni en el navegador (solo la clave publishable). Sin código previo de proyectos anteriores. Cada integrante commitea con su propia cuenta. No usar el proyecto viejo de Supabase.
