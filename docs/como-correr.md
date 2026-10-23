# Cómo correr CRUCE

1. Instalar: `npm install` (Node 24).
2. Variables: copiá `.env.example` a `.env` y completá `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` (solo clave publishable, nunca service_role). `.env` está ignorado por git.
3. Desarrollo: `npm run dev`.
4. Compilar: `npm run build` (typecheck + vite build). Solo tipos: `npm run typecheck`.
5. Pruebas: `npm test` (vitest, lee las variables VITE_* del `.env`); `npm run test:backend` corre `tests/`.
