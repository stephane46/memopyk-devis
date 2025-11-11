# MEMOPYK Devis Monorepo

## Structure
- /frontend – React + Vite (TypeScript), Tailwind, shadcn/ui
- /backend  – (reserved) Express + Drizzle + Supabase
- /docs     – Product specs & tickets

## Local dev (frontend)
cd frontend
npm install
npm run dev   # http://localhost:5173

## Production build (frontend)
npm run build # outputs to /frontend/dist

## Deploy (Coolify)
- Frontend: Dockerfile in /frontend builds static site (nginx) with SPA fallback.
- Domain: https://devis.memopyk.com (Traefik handles TLS).
- Backend (soon): https://api.devis.memopyk.com

## Environment
Frontend uses:
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

Backend (server-only) will use:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- NODE_ENV=production

