# MEMOPYK Devis — Monorepo

## Structure
- **/frontend** — React + Vite (public app at https://devis.memopyk.com)
- **/backend** — Node/Express + Drizzle (API at https://api.devis.memopyk.com)
- **/docs** — Product briefs, tickets, and tech notes

## Branching
- **main** — production
- **develop** — active development

## Frontend (Vite)
- Local: cd frontend && npm i && npm run dev
- Build: 
pm run build → dist/
- Docker (prod): Dockerfile serves dist/ via Nginx with SPA fallback.

## Backend (Express)
- Port: 3001 (internal). Exposed via Traefik on https://api.devis.memopyk.com
- Health: GET /healthz → { ok: true }
- Drizzle migrations against Supabase.

## Environment
- Frontend (public):  
  - VITE_SUPABASE_URL  
  - VITE_SUPABASE_ANON_KEY
- Backend (server-only, set in Coolify):  
  - SUPABASE_URL  
  - SUPABASE_SERVICE_ROLE_KEY  
  - NODE_ENV=production

## Deploy (Coolify)
1. **Frontend** app points to /frontend, builds Docker image from rontend/Dockerfile, Traefik routes devis.memopyk.com.
2. **Backend** app points to /backend, exposes 3001, Traefik routes pi.devis.memopyk.com.
3. Secrets configured in Coolify, not in Git.

## Tickets
See /docs for:
- *MEMOPYK_Frontend_Tickets.md*
- *MEMOPYK_Quote_System_Tickets.md*
- *MEMOPYK_Frontend_Build_Brief.md*
- *MEMOPYK_App_Online_Offline_Guide.md*
