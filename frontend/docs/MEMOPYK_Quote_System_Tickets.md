# MEMOPYK Quote System — Implementation Tickets

### Ticket 1 – Data Schema Migration
- **Summary:**  
  Create and migrate all database tables and relations defined in the approved ERD (quotes, versions, lines, blocks, products, bundles, tax rates, activities, attachments, etc.).
- **Scope:**  
  - Define Drizzle schema and generate migrations for Supabase.  
  - Apply default constraints and indexes (unique quote number, foreign keys, timestamps).  
  - Seed initial data: 10 products, 4 content blocks, tax rates 0/10/20 %, FX EUR→USD.  
  - Verify RLS and Supabase Auth single-admin role access.
- **Acceptance Criteria:**  
  - All tables exist and link correctly.  
  - Example seed data loads and queries successfully.  
  - Unique quote numbering format `MPK-{YYYY}-{seq}` confirmed.
- **Dependencies/Risks:** none (base layer for all other tickets).

- **Implementation Notes:**
  - Added Drizzle schema definitions covering quotes, versions, lines, blocks, products, bundles, taxes, FX, content blocks, activities, and attachments (`backend/src/db/schema.ts`).
  - Generated initial SQL migration with enums, tables, indexes, and baseline Supabase RLS policies (`backend/drizzle/000_init.sql`).
  - Seed script inserts baseline tax rates, 10 starter products, 4 content blocks, EUR→USD FX snapshot, and a sample bundle (`backend/src/db/seed.ts`).
  - Database client wraps `pg` pool with Drizzle and loads connection details from `DATABASE_URL` (`backend/src/db/client.ts`).

---

### Ticket 2 – API Contracts
- **Summary:**  
  Implement Express endpoints and Supabase Functions that return and accept payloads exactly as defined in the structure spec.
- **Scope:**  
  - `/quotes`, `/versions`, `/public/:token`, `/pdf`, `/sync/outbox`.  
  - Validate inputs with Zod; respect JSON shapes from section 4.  
  - Handle token + optional PIN authentication for public routes.  
  - Implement `PATCH` and `Outbox` envelope handling.
- **Acceptance Criteria:**  
  - All endpoints return 200 OK with JSON identical to samples.  
  - Error codes and messages consistent (409 for conflict, 403 for bad PIN).  
  - Tested round-trip from frontend stub succeeds.

- **Implementation Notes:**
  - Created a modular API structure with routers for `quotes`, `versions`, `public`, `pdf`, and `sync`.
  - Implemented Zod validators for all incoming request bodies and query parameters.
  - Created services to encapsulate business logic for `quoteService`, `versionService`, and `publicQuoteService`.
  - All endpoints are fully implemented, including nested routes for lines and blocks.
  - Placeholder endpoints for PDF generation and offline sync are in place, returning dummy data as specified.
  - Added a global error handler and custom error classes for consistent API responses.

---

### Ticket 3 – Live Mode Mechanics
- **Summary:**  
  Provide an in-person editing mode for rapid quoting sessions with autosave and instant recalculation.
- **Scope:**  
  - Autosave draft every 2–3 s to local cache and Supabase.  
  - Update totals, VAT, deposit instantly on edit.  
  - Add “Enregistré” badge; ensure no full reload on freeze.  
  - Enlarge tap targets ≥ 44 px for iPhone.  
- **Acceptance Criteria:**  
  - Edits persist even if browser/tab closed.  
  - Totals update live; badge toggles correctly.  
  - Works offline (queued in outbox).  
- **Dependencies/Risks:** offline sync (Ticket 8).

- **Implementation Notes:**
  - Added a `PATCH /api/quotes/:quoteId/versions/:v` endpoint to allow partial updates of a version's metadata (title, label, intro, etc.).
  - This endpoint, combined with the existing `PATCH` endpoints for lines and blocks, provides the necessary backend support for the frontend to implement autosaving.

---

### Ticket 4 – Versioning & Labels
- **Summary:**  
  Enable up to 5 versions per quote with custom short labels and full diff comparison.
- **Scope:**  
  - Add `label` field; freeze, duplicate, and lock versions.  
  - Implement compare (lines + blocks + meta).  
  - Public view: latest visible first; “Voir les autres options” shows others marked “Non retenue (verrouillée)”.  
- **Acceptance Criteria:**  
  - 5 versions max enforced.  
  - Labels displayed in editor, switcher, and PDF header.  
  - After acceptance, all unchosen versions locked.  
- **Dependencies/Risks:** depends on Ticket 1 & 2.

- **Implementation Notes:**
  - Added a check in the `duplicateQuoteVersion` service to enforce a maximum of 5 versions per quote.
  - The `acceptQuote` service now locks all other versions of the quote upon acceptance.
  - The `getPublicQuote` service now correctly filters to only show locked versions on the public page.

---

### Ticket 5 – Acceptance Workflow
- **Summary:**  
  Support both online and paper acceptance, with automatic status updates and printable summaries.
- **Scope:**  
  - Online: name + CGV checkbox + signature canvas + timestamp/IP.  
  - Paper: upload scan/photo → auto-mark “Accepté (mode papier)” + undo.  
  - Store `acceptanceMode` and `acceptanceSummary`.  
  - Display printable “Récapitulatif d’acceptation.”  
- **Acceptance Criteria:**  
  - Online and paper paths create correct log entries.  
  - Uploading scan triggers accepted status; undo restores prior state.  
  - Acceptance summary printable and attached to quote.
- **Dependencies/Risks:** Ticket 2 (API), Ticket 7 (PDF).

- **Implementation Notes:**
  - Enhanced the `acceptQuote` service to store a detailed `acceptanceSummary` including a placeholder for the signature URL.
  - Added a new `POST /api/quotes/:id/accept-paper` endpoint for admin-led paper acceptance.
  - Added a `POST /api/quotes/:id/undo-acceptance` endpoint to revert a paper acceptance.
  - Added a `GET /api/quotes/:id/acceptance-summary` endpoint to retrieve the acceptance details for a quote.

---

### Ticket 6 – Public Link & PIN Security
- **Summary:**  
  Implement secure public link access with optional PIN protection.
- **Scope:**  
  - Generate random 40 + character token per quote.  
  - Add optional 6-digit PIN hashed (Argon2) + rate-limit (5 attempts).  
  - Numeric keypad input; lockout after limit.  
  - Default: PIN disabled.  
- **Acceptance Criteria:**  
  - Public view accessible via token alone if PIN off.  
  - When PIN on: correct PIN = success; wrong PIN = 403 and counter message.  
  - Attempt count resets after 1 hour.  
- **Dependencies/Risks:** minor coordination with Ticket 2 (API).

- **Implementation Notes:**
  - Added `pinFailedAttempts` and `pinLockedUntil` columns to the `quotes` table to track rate-limiting.
  - Created a new `POST /api/quotes/:id/pin` endpoint for admins to set, update, or disable a PIN.
  - Implemented full rate-limiting logic in the `getPublicQuote` service, including a 1-hour lockout after 5 failed attempts.
  - Added new activity types (`set_pin`, `pin_attempt_failed`, `pin_attempt_success`) and logged all relevant events.

---

### Ticket 7 – Async PDF Pipeline
- **Summary:**  
  Render PDFs via asynchronous Supabase Function and integrate download/print workflow.
- **Scope:**  
  - Function returns `{ jobId, status }`.  
  - Frontend polls **every 3 seconds for up to 30 seconds** (default cadence).  
  - On `status = ready`, attach PDF to quote and show “Télécharger / Imprimer”.  
  - Include progress state “PDF en préparation…”.  
- **Acceptance Criteria:**  
  - Async jobs don’t block UI.  
  - PDF stored in Supabase Storage with correct link.  
  - Polling stops automatically when done or timeout.  
- **Dependencies/Risks:** Supabase Function availability.

- **Implementation Notes:**
  - Added PDF job infrastructure (`pdf_jobs` table, status enum, version `pdfUrl`/`pdfGeneratedAt`) in the Drizzle schema.
  - Implemented `pdfService` to queue jobs, simulate async processing, attach storage URLs, and log `pdf_requested`/`pdf_ready` activities.
  - Replaced placeholder PDF routes with real endpoints: `POST /api/quotes/:id/pdf` to enqueue and `GET /api/pdf/jobs/:jobId` to poll.
  - Documented request validation via `requestPdfSchema` so the frontend can specify a target version when generating PDFs.
  - Produced manual migration bundle (`release/sql/release_20251110_ticket1-7.sql`) plus verification script; confirmed Supabase execution succeeds.

---

### Ticket 8 – Offline Sync & JSON Backup
- **Summary:**  
  Ensure complete offline editing with outbox queue and plain JSON export/import.
- **Scope:**  
  - IndexedDB outbox + retry logic (5 attempts, backoff).  
  - Last-write-wins using `updatedAt`/`revision`.  
  - Plain JSON export (includes versions, blocks, tax rates, FX snapshot, attachment metadata).  
  - Merge import with duplicate warning; show “Sauvegarde locale active” banner.  
- **Acceptance Criteria:**  
  - Offline edits resync correctly on reconnect.  
  - JSON round-trip restores identical quote.  
  - Export clearly states “not encrypted.”  
- **Dependencies/Risks:** relies on Ticket 2 (API).

- **Implementation Notes:**
  - Added revision-aware outbox processors plus retry/backoff in `syncService`, logging operation receipts for every attempted merge.
  - Introduced JSON bundle validators (`quoteExport` schemas) and service helpers that normalize timestamps before handing off to Drizzle.
  - Implemented `exportQuoteBundle`/`importQuoteBundle` in `quoteService` with merge safeguards (last-write-wins, duplicate detection, attachment/tax/FX reconciliation) and activity logging.
  - Exposed REST endpoints: `GET /api/quotes/:id/export` returns "Plain JSON backup – not encrypted" payload, `POST /api/quotes/:id/import` validates and executes merge, returning warning-rich summary.
  - Confirmed round-trip via integration smoke test scenario (export → truncate local → import) restoring identical versions/lines/blocks metadata.

---

### Ticket 9 – Admin Panel Enhancements
- **Summary:**  
  Expand Admin area for catalog configuration and PDF branding.
- **Scope:**  
  - Manage products, bundles, content blocks, tax rates, currencies/FX, numbering.  
  - Add **live PDF branding preview** that refreshes instantly when logo or colors change.  
  - Save and apply branding defaults to all new quotes.  
- **Acceptance Criteria:**  
  - CRUD works for all config entities.  
  - Branding preview updates immediately on change.  
  - New quotes use latest branding defaults.  
- **Dependencies/Risks:** none major; connects to Ticket 7 for branding render.

- **Implementation Notes (backend completed):**
  - Extended schema with `currencies`, `branding_configs`, and `admin_activities` tables for persistent admin metadata and auditing.
  - Added comprehensive admin validators covering products, bundles (with atomic item arrays), content blocks, tax rates, currencies, FX snapshots, and branding config.
  - Implemented `adminService` handling CRUD for all catalog entities, FX snapshot replacement, branding config normalization, and activity logging per change.
  - Exposed REST endpoints under `/api/admin/*` with consistent Zod validation + error handling (products, bundles, content blocks, tax rates, currencies, FX snapshot, branding GET/PUT).
  - Bundle save path runs in a single transaction (delete + reinsert items) to guarantee atomic updates; FX snapshot replaces entire table before logging snapshot activity.
  - Next: Frontend admin UI & live branding preview will consume these endpoints and reuse branding config in PDF pipeline.

---

### Ticket 10 – UI / UX Polish
- **Summary:**  
  Implement responsive, accessible design consistent with MEMOPYK palette and French copy.
- **Scope:**  
  - Sticky recap always visible on iPhone.  
  - Numeric keypad for price fields.  
  - Load all text constants from copy inventory.  
  - Respect color contrast (navy / cream / sky blue) and spacing.  
- **Acceptance Criteria:**  
  - Layout validated on mobile and desktop.  
  - All labels in French; colors + contrast AA+.  
  - No overlap or scroll jank in mobile view.  
- **Dependencies/Risks:** minor; visual QA needed.

---

### Ticket 11 – Activity Log & Diff Tracking
- **Summary:**  
  Record all key user actions and enhance version comparison visibility.
- **Scope:**  
  - Log events: freeze, send, view, accept, decline, sync-conflict, offline-write.  
  - Extend diff engine to include content blocks + meta (validity, acompte %, devise, label).  
  - Display differences visually in VersionDiff.  
- **Acceptance Criteria:**  
  - Activity records written with timestamps.  
  - Diff view highlights every change type (add/remove/edit).  
  - No false positives or missed changes.  
- **Dependencies/Risks:** Ticket 4 (Versioning).

---

### Ticket 12 – Testing & Validation
- **Summary:**  
  Verify reliability through automated tests across backend and frontend.
- **Scope:**  
  - Unit tests for Drizzle models, diff logic, acceptance flows.  
  - Integration tests for API endpoints and PDF jobs.  
  - UI smoke tests for Live Mode, offline, and acceptance.  
- **Acceptance Criteria:**  
  - All test suites pass without regression.  
  - PDF and offline tests confirm real file creation & sync.  
  - Core flows freeze → share → accept → PDF 100 % operational.  
- **Dependencies/Risks:** requires all prior tickets.

---
