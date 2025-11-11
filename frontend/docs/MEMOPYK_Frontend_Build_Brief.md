# MEMOPYK Frontend Build Brief

## 🧭 Context
MEMOPYK is a service that transforms clients’ photos and videos into personalized “films souvenirs.”  
The **backend** for MEMOPYK’s Quote System is already complete and running.  
It provides secure API endpoints for:
- Quote creation, versioning, acceptance, and PDF generation  
- Offline sync and JSON backups  
- Admin management (products, bundles, content blocks, taxes, currencies, branding)

Your task is to create the **frontend foundation (React/Vite app)** that will later connect to this backend.

---

## 🎯 Objective
Build a clean, modern, bilingual-ready **frontend base** (React + Vite + TypeScript) for the MEMOPYK Quote System.

This stage focuses on a solid foundation that future developers can extend for:
1. The **Admin Panel**
2. The **Quote Editor**
3. The **Public Client View**

---

## 🧱 Tech Stack
- **Framework:** React 18 + Vite + TypeScript  
- **Styling:** Tailwind CSS + shadcn/ui (Radix primitives)  
- **Icons:** lucide-react  
- **Animations:** Framer Motion  
- **Routing:** React Router  
- **State/query:** TanStack Query (React Query)  
- **Forms:** React Hook Form + Zod  
- **Language:** UI = French (fr-FR); comments/code = English  
- **PWA-ready:** Include service worker scaffold (no offline logic yet)  

---

## 🎨 MEMOPYK Brand Colors
Add to `tailwind.config.js` under `theme.extend.colors`:

| Token | Hex | Usage |
|--------|------|--------|
| memopyk-navy | `#011526` | main background / text on light |
| memopyk-dark-blue | `#2A4759` | headings, panels |
| memopyk-sky-blue | `#89BAD9` | accents / links |
| memopyk-blue-gray | `#8D9FA6` | secondary text |
| memopyk-cream | `#F2EBDC` | backgrounds / surfaces |
| memopyk-orange | `#D67C4A` | CTA buttons / highlights |

---

## 📁 Folder Structure
```
frontend/
├── src/
│   ├── components/
│   ├── pages/
│   │   ├── admin/
│   │   │   ├── Products.tsx
│   │   │   ├── Bundles.tsx
│   │   │   ├── ContentBlocks.tsx
│   │   │   ├── TaxRates.tsx
│   │   │   ├── CurrenciesFx.tsx
│   │   │   ├── Branding.tsx
│   │   ├── quotes/QuoteEditor.tsx
│   │   ├── public/PublicQuoteView.tsx
│   │   └── Home.tsx
│   ├── layouts/
│   ├── lib/
│   ├── hooks/
│   ├── App.tsx
│   └── main.tsx
├── public/
│   └── logo.svg
├── index.html
└── tailwind.config.js
```

---

## 🌐 Routes (placeholders)
| Path | Purpose |
|------|----------|
| `/` | Home page |
| `/admin` | menu to access admin sections |
| `/admin/products` | placeholder table/list |
| `/admin/bundles` | placeholder |
| `/admin/content-blocks` | placeholder |
| `/admin/tax-rates` | placeholder |
| `/admin/currencies-fx` | placeholder |
| `/admin/branding` | placeholder with “Live preview coming soon” |
| `/devis/:id` | quote editor shell |
| `/p/:token` | public quote view |

---

## 🧩 Environment Variables
Create a `.env` file:

```
VITE_SUPABASE_URL=https://supabase.memopyk.org
VITE_SUPABASE_ANON_KEY=placeholder
VITE_API_BASE_URL=https://api.memopyk.com
```

---

## 🖥️ UI Expectations
- Texts and labels in **French** (e.g., *Produits*, *Packs*, *Blocs de contenu*, *TVA*, *Devises / FX*, *Branding*)  
- Layout: clean, light background (`memopyk-cream`), dark text (`memopyk-navy`)  
- Navigation bar with MEMOPYK logo top-left, section links top or left  
- All pages navigable; content areas can show “Écran à venir”

---

## ⚙️ Scripts
Add these to `package.json`:
```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "lint": "eslint . --ext .ts,.tsx"
}
```

---

## ✅ Deliverables
- `frontend/` folder (or repo) running with `npm i && npm run dev`  
- Tailwind + shadcn configured  
- Routes and placeholder pages render correctly  
- French labels visible  
- Brand colors applied  
- Clean structure ready for backend integration

---

## 🔒 Integration Notes (for later)
- Backend API is already implemented under `/api/admin/*`, `/api/quotes/*`, etc.  
- You’ll connect later using TanStack Query or fetch.  
- No backend wiring or authentication yet.

---

### When finished
Deliver the repo or zipped `/frontend` folder.  
Next sprint will connect Admin UI to backend endpoints and activate the live branding preview.
