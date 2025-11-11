# MEMOPYK Frontend — Implementation Tickets

### Ticket 10 – Frontend Foundation (React/Vite)
- **Summary:**  
  Establish the React 18 + Vite + TypeScript frontend base for the MEMOPYK Quote System, providing the structure that will host the Admin Panel, Quote Editor, and Public Client View.
- **Scope:**  
  - Scaffold a Vite React project with TypeScript, ESLint, and project scripts.  
  - Configure Tailwind CSS, shadcn/ui (Radix primitives), lucide-react, Framer Motion, React Router, TanStack Query, React Hook Form, and Zod.  
  - Apply MEMOPYK brand colors and French UI copy.  
  - Create routing, layouts, and placeholder pages for admin sections, quote editor shell, and public view.  
  - Prepare environment variables, service worker scaffold, and documentation for future integration.
- **Acceptance Criteria:**  
  - `npm i && npm run dev` launches the placeholder UI without errors.  
  - All routes render French-labelled placeholder screens following the defined structure.  
  - Tailwind/shadcn styling reflects the MEMOPYK palette.  
  - Base providers (React Router, React Query, form validation) are wired for future data integration.  
  - `.env.example` documents Supabase/API placeholders.
- **Dependencies/Risks:**  
  - Aligns with completed backend APIs (`/api/admin/*`, `/api/quotes/*`).  
  - Future integration will require authentication and live branding preview wiring.  
  - PWA features limited to scaffold; offline logic deferred.

- **Implementation Plan & Status:**
  - [x] Step 1 – Project scaffolding & tooling setup (Vite React TS, ESLint, npm scripts).
  - [x] Step 2 – Base styling configuration (Tailwind, shadcn/ui, brand palette, typography).
  - [x] Step 3 – Application shell (App/main providers, global layout components).
  - [x] Step 4 – Routing & placeholder pages for Admin, Quote Editor, Public view.
  - [x] Step 5 – UI elements & navigation (logo, nav bar, sidebar, placeholder components).
  - [x] Step 6 – State/query scaffolding (React Query client, API helpers, form examples).
  - [x] Step 7 – Localization groundwork (French copy, future bilingual hooks).
  - [x] Step 8 – PWA/service worker scaffold and manifest placeholders.
  - [x] Step 9 – Quality checks (lint configuration, optional tests) and README instructions.
  - [ ] Step 10 – Delivery verification against brief checklist.

- **Implementation Notes (update after each step):**
  - **Step 1:** Generated Vite React TS base (`frontend/`), confirmed npm scripts (`dev`, `build`, `preview`, `lint`) and ESLint setup.
  - **Step 2:** Installed Tailwind + PostCSS pipeline, applied MEMOPYK palette and typography in `tailwind.config.js` and global styles.
  - **Step 3:** Replaced counter app with routed shell using `MainLayout`, `AdminLayout`, React Query provider, and global nav/footer.
  - **Step 4:** Implemented full route table (`/admin/*`, `/devis/:id`, `/p/:token`, 404) with French placeholder content.
  - **Step 5:** Added shadcn-style `Button`, `Card`, `ComingSoon` components, MEMOPYK SVG logo, and navigation scaffolding.
  - **Step 6:** Wired TanStack Query client + devtools, prepared utility helpers, and structured pages for future data hooks.
  - **Step 7:** Ensured all visible UI strings are in French, left code/comments in English, and centralized copy per brief.
  - **Step 8:** Ajout du manifest web + service worker mock, enregistrement dans `main.tsx` pour préparer le mode PWA.
  - **Step 9:** `npm run lint` passes after addressing React Refresh + eslint rules; `.env.example` added with API placeholders.
  - **Step 10:** Pending final checklist review once PWA scaffold lands.
