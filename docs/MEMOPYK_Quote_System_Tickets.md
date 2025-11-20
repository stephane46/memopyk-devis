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

### Ticket 2 – API Contracts ✅ (Backend baseline completed 19 Nov 2025)
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
- **Backend status:** Baseline completed for this Node backend; feature-specific public/PDF/sync behaviors will be implemented in Tickets 4–9 using these contracts.  

- **Implementation Notes (backend baseline):**
  - Confirmed the versioned API is mounted under `/v1` from `server.js` via `backend/src/routes/index.ts` and `backend/src/routes/v1/index.ts`.  
  - Introduced dedicated Express subrouters under `/v1` for `quotes`, `public`, `pdf`, and `sync` in `backend/src/routes/v1` (`quotes.ts`, `public.ts`, `pdf.ts`, `sync.ts`).  
  - Wired the new `public`, `pdf`, and `sync` routers into the `/v1` router without altering any existing `/v1/quotes` route behavior, keeping payload envelopes and error responses stable.  
  - Retained the existing global JSON error handler in `server.js` as the canonical `{ error: { code, message, details? } }` contract for all present and future routes.  

- **Plan (next backend milestone via Tickets 4–9):**
  - Consolidate all quote-related APIs under the `/v1` prefix, reusing existing `/v1/quotes` and adding dedicated routers for public quotes, PDF jobs, and offline sync while keeping response envelopes consistent (`{ data: ... }`, `{ error: ... }`).  
  - Introduce Zod validators and typed DTOs for all new endpoints (public quote view & PIN, online acceptance, PDF job enqueue/poll, outbox sync) so that the frontend can rely on strict, documented contracts.  
  - Ensure error handling for all new routes uses `HttpError` and a stable error code taxonomy (e.g. `pin_required`, `pin_invalid`, `pdf_job_not_found`) compatible with existing frontend error handling patterns.  
  - Avoid breaking existing `/v1/quotes` consumers by keeping all new behavior additive and backward compatible.

- **How to test (backend):**
  1. From `backend/`, run `npm test` and confirm all existing suites still pass, verifying that the new `/v1/public`, `/v1/pdf`, and `/v1/sync` routers compile and mount without affecting `/v1/quotes` behavior.  
  2. Optionally start the server (`npm run dev` or `npm start` after a build) and inspect the `/v1` router snapshot logged at bootstrap to confirm that `quotes`, `public`, `pdf`, and `sync` subrouters are present.  
  3. Hit an existing endpoint such as `GET /v1/quotes` or `GET /v1/quotes/:id` from the frontend or an HTTP client to confirm responses and error formats are unchanged.

---

### Ticket 3 – Quotes Domain Model & Repository ✅ (Completed 13 Nov 2025)
- **Summary:**  
  Implement Drizzle schema, migrations, repositories, validators, and `/v1/quotes` API routes supporting transactional quote/versions/lines CRUD with totals recalculation and structured errors.
- **Scope:**  
  - Define `quotes`, `quote_versions`, `quote_lines`, `quote_number_counters`, activities, and attachments schema + migrations.  
  - Implement repository helpers for numbering, totals recomputation, version duplication/publish, and line CRUD.  
  - Expose `/v1/quotes` router with nested versions/lines endpoints using Zod validators and consistent JSON error shape.  
  - Add Vitest + Supertest integration coverage for create/list/update/delete flows, version duplication, publish, and line operations.
- **Acceptance Criteria:**  
  - Quote numbers generated as `MPK-{YYYY}-{seq}` with transactional reservation.  
  - Version and line mutations recompute totals, enforce ownership, and honor soft delete/restore.  
  - API returns `{ error: { code, message, details? } }` for failures and passes integration suite.  
  - `npm run test` and `npm run build` succeed on CI prior to merge.

- **Implementation Notes:**
  - Added comprehensive Drizzle schema and migration `backend/drizzle/0002_quotes_domain.sql`; wired `backend/src/db/client.ts` + `schema.ts` for repository access.  
  - Implemented services + repositories (`quotes.repo.ts`, `versions.repo.ts`, `lines.repo.ts`, `numbering.service.ts`, `totals.service.ts`) with transactional guards and totals recomputation.  
  - Built `/v1/quotes` router plus validators (`quotes.ts`, `versions.ts`, `lines.ts`) surfaced via `src/routes/index.ts`; updated `server.js` bootstrap.  
  - Authored integration tests `tests/routes/quotes.routes.test.ts` and supporting config (`vitest.config.ts`, `tsconfig.json`) confirming CRUD + version + line scenarios.  
  - PR “Implement /v1/quotes API (Repositories, Validators, Integration Tests)” merged into `develop`; ready for Coolify deployment planning.

- **Next Up:**  
  - Draft Ticket 4 (frontend wiring + admin UI enhancements) leveraging the live `/v1/quotes` endpoints.  
  - Plan Coolify deployment smoke tests for the new API prior to exposing to the frontend.

---

### Ticket 4 – Versioning & Labels ✅ (Backend completed 19 Nov 2025)
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
- **Backend status:** Backend behavior implemented in this Node backend (version limits and locking), building on existing versioning support from Ticket 3.  

- **Implementation Notes (backend completed):**
  - Reused existing `quote_versions` fields (`label`, `status`, `isLocked`) without changing their types or API representation; `/v1/quotes/:quoteId/versions` continues to return full `QuoteVersion` rows including these fields.  
  - Extended the `quote_activity_type` enum and Drizzle schema with two new activity kinds: `version_locked` and `version_limit_reached` (`backend/src/db/schema.ts`), with a dedicated migration `backend/drizzle/0007_quote_activity_types_extend_v2.sql` to alter the Postgres enum.  
  - **Version creation & duplication rules** (`backend/src/repositories/versions.repo.ts`):  
    - `createVersionWithLinesTx` and `duplicateVersionTx` now:  
      - Load the parent `quote` to verify it exists.  
      - Forbid new versions when the quote’s `status` is `accepted`, logging `version_locked` with reason `quote_accepted_no_new_versions` and returning `409 version_creation_forbidden`.  
      - Count non-deleted versions for the quote and enforce a maximum of 5; on the 6th attempt, log `version_limit_reached` with `{ max_versions: 5 }` and return `409 version_limit_reached`.  
  - **Locking non-current versions on acceptance** (`backend/src/repositories/versions.repo.ts` + `quotes.repo.ts`):  
    - Added `lockNonCurrentVersionsForQuoteTx(tx, quoteId)`, which:  
      - Finds the current `currentVersionId` for the quote.  
      - Sets `isLocked = true` on all non-deleted versions except the current one (or all, if there is no current version), and updates `updatedAt`.  
      - Logs a `version_locked` activity for each locked version with metadata `{ reason: 'quote_accepted' }`.  
    - Wired `lockNonCurrentVersionsForQuoteTx` into `updateMeta` (`backend/src/repositories/quotes.repo.ts`) so that when `status` transitions from a non-accepted state to `accepted`, all non-current versions are locked inside the same transaction, before logging the existing status-change/accept activities.  
  - **Protecting archived/locked versions from line edits** (`backend/src/repositories/lines.repo.ts`):  
    - Introduced `assertVersionEditableTx(tx, versionId)` that ensures the target version exists, is not deleted, and is neither `archived` nor `isLocked = true`; otherwise it throws `409 version_locked`.  
    - `createLineTx`, `updateLineTx`, and `softDeleteLineTx` now call `assertVersionEditableTx` (using the line’s `versionId` for updates/deletes), so archived or explicitly locked versions cannot be mutated at the line level.  
  - Kept `setCurrentVersionTx` behavior unchanged: still enforces a single `current` version per quote and archives the rest; the new rules apply in addition to this, primarily around acceptance and explicit locking.

- **Plan / Next steps (beyond this ticket):**
  - Ticket 5 will introduce dedicated acceptance endpoints; those endpoints will rely on the existing `updateMeta` status change to `accepted`, which already triggers `lockNonCurrentVersionsForQuoteTx` and activity logging in a backward-compatible way.  
  - Frontend may later surface `isLocked` and version-status information more prominently in editors and public views, but the backend contract is already stable and requires no breaking changes.

- **How to test (backend):**
  1. **Apply migrations:**  
     - Ensure both `0006_quote_activity_types_extend.sql` and `0007_quote_activity_types_extend_v2.sql` are applied so `quote_activity_type` includes `version_locked` and `version_limit_reached`.  
  2. **Enforce 5-version limit:**  
     - Create a quote (`POST /v1/quotes`) and then create/duplicate versions via `POST /v1/quotes/:quoteId/versions` until you have 5 non-deleted versions.  
     - Attempt to create a 6th version (empty or duplicated); expect `409 version_limit_reached` and a `version_limit_reached` activity for the quote.  
     - Confirm `GET /v1/quotes/:quoteId/versions` returns exactly 5 versions with consistent `status`/`label`/`isLocked` fields.  
  3. **Lock non-current versions on acceptance:**  
     - For a quote with multiple versions, call `PATCH /v1/quotes/:quoteId` with `{ "status": "accepted" }`.  
     - Confirm the response remains `{ data: QuoteFull }` as before.  
     - In the DB, check `quote_versions` for that quote: all non-current versions should have `isLocked = true`, while the current version can remain editable.  
     - Inspect the `activities` table to see `version_locked` entries for each locked version (metadata `{ reason: 'quote_accepted' }`) alongside the existing `status_changed`/`accept` activities.  
  4. **Prevent new versions for accepted quotes:**  
     - After the quote is `accepted`, attempt `POST /v1/quotes/:quoteId/versions` (with or without `from_version_id`).  
     - Expect `409 version_creation_forbidden` and a `version_locked` activity with metadata `{ reason: 'quote_accepted_no_new_versions' }`; no new version row should exist in `quote_versions`.  
  5. **Prevent line edits on archived/locked versions:**  
     - Take an archived or explicitly locked version (e.g. a non-current version after acceptance) and call:  
       - `POST /v1/quotes/:quoteId/versions/:versionId/lines`  
       - `PATCH /v1/quotes/:quoteId/versions/:versionId/lines/:lineId`  
       - `DELETE /v1/quotes/:quoteId/versions/:versionId/lines/:lineId`  
     - Expect each attempt to fail with `409 version_locked` and for no line changes to be persisted; current, non-locked versions should remain fully editable and behave exactly as before.  
  6. **Verify response shapes remain stable:**  
     - Re-run `GET /v1/quotes`, `GET /v1/quotes/:quoteId`, and `GET /v1/quotes/:quoteId/versions` from the frontend or via curl.  
     - Confirm that JSON structures and field names are unchanged, with only the semantics of `status`/`isLocked` on versions updated according to the new rules.

---

### Ticket 5 – Acceptance Workflow ✅ (Backend completed 19 Nov 2025)
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

- **Backend status:** Backend behavior implemented in this Node backend (online + paper acceptance, undo, and summary), building on existing quote and activity infrastructure.  

- **Implementation Notes (backend completed):**
  - **Data model:**  
    - Added quote-level acceptance fields on `quotes` in `backend/src/db/schema.ts` + migration `backend/drizzle/0008_acceptance_and_public_links.sql`:  
      - `acceptance_mode` (`acceptanceMode` in code) – nullable text, constrained at runtime to `'online' | 'paper' | null`.  
      - `accepted_at` (`acceptedAt`) – nullable `timestamptz`.  
      - `accepted_by_name` (`acceptedByName`) – nullable text.  
    - Introduced `quote_public_links` table and relations for resolving `publicToken → quoteId` (minimal stub for this ticket):  
      - Columns: `id`, `quote_id`, `token`, `created_at`, with a unique index on `token`.  
  - **Validators** (`backend/src/api/validators/acceptance.ts` + tests):  
    - `parsePublicAcceptance` for `POST /v1/public/quotes/:publicToken/accept`:  
      - Requires non-empty `full_name: string`.  
      - Requires `accept_cgv: boolean` and throws `HttpError(400, 'cgv_not_accepted', ...)` if `false`.  
    - `parseAdminPaperAcceptance` for `POST /v1/quotes/:quoteId/accept-paper`:  
      - Requires non-empty `full_name`.  
      - Optional `accepted_at` ISO string validated as a real date.  
      - Optional `notes` string.  
  - **Acceptance repository** (`backend/src/repositories/acceptance.repo.ts`):  
    - All operations run inside transactions, rely on existing `quotes`/`quote_versions` invariants (including Ticket 4 locking), and log activities via `logActivityTx`.  
    - `acceptQuoteOnlineByToken(publicToken, dto)` (public online):  
      - Resolves `publicToken` via `quote_public_links.token`.  
      - Loads the quote (404 `public_link_not_found` if missing or deleted).  
      - Guards against double acceptance: if `status === 'accepted'`, throws `409 already_accepted`.  
      - Updates quote:  
        - `status = 'accepted'`, `acceptanceMode = 'online'`, `acceptedAt = now`, `acceptedByName = full_name`, bumps `updatedAt`.  
      - Calls `lockNonCurrentVersionsForQuoteTx` to enforce Ticket 4 version-lock invariants.  
      - Logs activities:  
        - `status_changed` `{ from: previousStatus, to: 'accepted' }`.  
        - `accept` `{ mode: 'online', full_name }`.  
      - Returns the updated `QuoteFull` aggregate via existing `getById`, preserving the `{ data: QuoteFull }` envelope.  
    - `acceptQuoteOnPaper(quoteId, dto)` (admin paper acceptance):  
      - Loads the quote by id (404 `quote_not_found` if missing or deleted).  
      - If already accepted, throws `409 already_accepted`.  
      - Determines `acceptedAt` as parsed `dto.accepted_at` or `now`.  
      - Updates quote:  
        - `status = 'accepted'`, `acceptanceMode = 'paper'`, `acceptedAt`, `acceptedByName = full_name`, and `updatedAt = now`.  
      - Calls `lockNonCurrentVersionsForQuoteTx` to lock non-current versions as per Ticket 4.  
      - Logs activities:  
        - `status_changed` `{ from: previousStatus, to: 'accepted' }`.  
        - `accept` `{ mode: 'paper', full_name, accepted_at: acceptedAt.toISOString(), notes }`.  
      - Returns `QuoteFull` via `getById`.  
    - `undoAcceptance(quoteId)` (admin undo):  
      - Loads quote; if not found, 404 `quote_not_found`.  
      - Requires `status === 'accepted'`, otherwise throws `409 acceptance_undo_forbidden`.  
      - Updates quote:  
        - `status = 'sent'`, clears `acceptanceMode`, `acceptedAt`, and `acceptedByName`, sets `updatedAt = now`.  
      - **Does not modify** any `quote_versions.isLocked` flags (as requested; relies on future edits/new versions instead).  
      - Logs activities:  
        - `status_changed` `{ from: 'accepted', to: 'sent' }`.  
        - `decline` `{ previous_status: 'accepted', reason: 'acceptance_undone' }` (reusing existing activity type instead of introducing a new one).  
      - Returns `QuoteFull` via `getById`.  
  - **Routes**:  
    - **Public online acceptance** (`backend/src/routes/v1/public.ts`):  
      - `POST /v1/public/quotes/:publicToken/accept`  
        - Parses payload via `parsePublicAcceptance`.  
        - Delegates to `acceptQuoteOnlineByToken(publicToken, dto)`.  
        - Returns `200 { data: QuoteFull }` on success.  
        - On invalid CGV, returns `400` with `{ error: { code: 'cgv_not_accepted', ... } }`.  
        - On unknown token, returns `404` with `{ error: { code: 'public_link_not_found', ... } }`.  
    - **Admin paper acceptance & undo** (`backend/src/routes/v1/quotes.ts`):  
      - `POST /v1/quotes/:quoteId/accept-paper`  
        - Parses payload via `parseAdminPaperAcceptance`.  
        - Calls `acceptQuoteOnPaper(quoteId, dto)`.  
        - Returns `200 { data: QuoteFull }`.  
      - `POST /v1/quotes/:quoteId/acceptance/undo`  
        - Calls `undoAcceptance(quoteId)` with an empty body.  
        - Returns `200 { data: QuoteFull }`.  
    - **Acceptance summary** (`backend/src/routes/v1/quotes.ts`):  
      - `GET /v1/quotes/:quoteId/acceptance-summary`  
        - Loads aggregate via `getQuoteById`.  
        - On success, returns:  
          - `{ data: { status, acceptance_mode, accepted_at, accepted_by_name } }`  
          - Purely a lightweight wrapper around existing quote fields; no new logic.  
  - **Invariants & contracts:**  
    - Quote status transitions remain consistent with existing `/v1/quotes` flows, now enriched with dedicated acceptance endpoints.  
    - Ticket 4 invariants (max 5 versions, lock non-current versions on acceptance, forbid new versions for accepted quotes, prevent edits on locked versions) are preserved; all acceptance paths rely on the same quote status/locking rules.  
    - Response shapes for existing `/v1/quotes` routes are unchanged; the only additions are new fields on the `quote` object and new endpoints for acceptance and summary.

- **How to test (backend):**
  1. **Apply migrations:**  
     - Run the existing Drizzle migration flow so that `0008_acceptance_and_public_links.sql` is applied and `quotes` has `acceptance_mode`, `accepted_at`, `accepted_by_name`, plus a `quote_public_links` table.  
  2. **Public online acceptance:**  
     - Create a quote and a matching `quote_public_links` row (manual SQL or future tooling) with a known `token`.  
     - Ensure the quote `status` is **not** `accepted`.  
     - Call `POST /v1/public/quotes/:publicToken/accept` with `{ "full_name": "John Doe", "accept_cgv": true }`.  
       - Expect `200 { data: QuoteFull }`.  
       - Verify in DB: quote `status = 'accepted'`, `acceptance_mode = 'online'`, `accepted_at` set, `accepted_by_name = 'John Doe'`.  
       - Check `quote_versions` for that quote: all non-current versions are locked as per Ticket 4; current version remains editable.  
       - In `activities`, confirm a `status_changed` and `accept` activity with `{ mode: 'online', full_name }`.  
     - For `accept_cgv: false`, expect `400` with `error.code = 'cgv_not_accepted'` and no DB changes.  
     - For an unknown token, expect `404` with `error.code = 'public_link_not_found'`.  
  3. **Admin paper acceptance:**  
     - Pick a non-accepted quote and call `POST /v1/quotes/:quoteId/accept-paper` with:  
       - `{ "full_name": "Admin User", "accepted_at": "2024-01-01T00:00:00.000Z", "notes": "Signed on paper" }`.  
     - Expect `200 { data: QuoteFull }`.  
     - Verify in DB: `status = 'accepted'`, `acceptance_mode = 'paper'`, `accepted_at` matches payload (or `now` if omitted), `accepted_by_name` filled.  
     - Check `activities` for `status_changed` and `accept` with `{ mode: 'paper', full_name, accepted_at, notes }`.  
     - Second call on the same quote should return `409 already_accepted`.  
  4. **Undo acceptance:**  
     - Starting from an `accepted` quote (from either public or paper flow), call `POST /v1/quotes/:quoteId/acceptance/undo` with an empty body.  
     - Expect `200 { data: QuoteFull }`.  
     - Verify in DB: quote `status = 'sent'`, and `acceptance_mode`, `accepted_at`, `accepted_by_name` are reset to `null`; `updatedAt` bumped.  
     - Confirm that `quote_versions.isLocked` flags remain unchanged (previously locked versions stay locked).  
     - In `activities`, confirm `status_changed` `{ from: 'accepted', to: 'sent' }` and `decline` `{ previous_status: 'accepted', reason: 'acceptance_undone' }`.  
     - Calling undo on a non-accepted quote should return `409 acceptance_undo_forbidden`.  
  5. **Acceptance summary endpoint:**  
     - With any quote, call `GET /v1/quotes/:quoteId/acceptance-summary`.  
     - Verify the `data` object reflects the current `status`, `acceptance_mode`, `accepted_at`, and `accepted_by_name` from the quote row.  
  6. **Automated tests:**  
     - From `backend/`, run `npm test`.  
     - Confirm suites now include:  
       - `tests/validators/acceptance.validators.test.ts` (validator behavior).  
       - `tests/routes/public.routes.test.ts` (public acceptance endpoint, including `cgv_not_accepted` and `public_link_not_found`).  
       - `tests/routes/quotes.routes.test.ts` extended for `accept-paper`, `acceptance/undo`, and `acceptance-summary`.

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

- **Backend status:** Step 1 (data model & validators) completed in this Node backend; no public link/PIN routes or behavior are exposed yet.  

- **Implementation Notes (backend – Step 1 foundations completed):**
  - **Data model (quote_public_links):**  
    - Extended the `quote_public_links` table in `backend/src/db/schema.ts` to support PIN and basic security, with a dedicated migration `backend/drizzle/0009_public_links_pin_security.sql`:  
      - `pin_hash` (`pinHash` in code) – nullable `TEXT`; when `null`, no PIN is required; when non-null, a hashed PIN will be stored by later steps.  
      - `pin_failed_attempts` (`pinFailedAttempts`) – `INTEGER NOT NULL DEFAULT 0`; tracks recent failed PIN attempts.  
      - `pin_locked_until` (`pinLockedUntil`) – nullable `TIMESTAMPTZ`; when set, indicates the PIN is temporarily locked until this timestamp.  
      - `updated_at` (`updatedAt`) – `TIMESTAMPTZ NOT NULL DEFAULT now()`; complements the existing `created_at` field.  
    - Indices remain as before:  
      - `quote_public_links_quote_id_idx` on `quote_id`.  
      - `quote_public_links_token_unique` on `token` (public token remains the stable external identifier).  
  - **Public links repository helpers** (`backend/src/repositories/public-links.repo.ts`):  
    - Introduced small, transaction-friendly helpers for future admin/public flows:  
      - `getPublicLinkByQuoteIdTx(tx, quoteId)` → returns the first `quote_public_links` row for a quote or `null`.  
      - `getPublicLinkByTokenTx(tx, token)` → returns the first row matching a token or `null`.  
      - `upsertPublicLinkTx(tx, { quoteId, token, pinHash })` →  
        - If a link exists for the quote, updates `token`, `pin_hash`, and `updated_at`.  
        - Otherwise inserts a new row with provided `quoteId`, `token`, `pin_hash` and relies on defaults for `pin_failed_attempts`, `created_at`, `updated_at`.  
    - Re-exported via `backend/src/repositories/index.ts` for easy access in future services/routes.  
  - **Validators for future endpoints** (`backend/src/api/validators/public-links.ts` + tests):  
    - `parseAdminPublicLinkUpdate` – for the future admin public-link configuration endpoint:  
      - Payload shape: `{ enabled: boolean; pin?: string | null }`.  
      - If `pin` is a string, enforces a **4–6 digit numeric** pattern via Zod regex.  
      - Accepts `pin: null` or omitted when disabling PIN or keeping existing PIN; hashing and generation will be handled later.  
    - `parsePublicPinSubmit` – for the future public PIN-submission endpoint:  
      - Payload shape: `{ pin: string }`.  
      - Enforces a **6-digit numeric** PIN via Zod regex (`^\d{6}$`).  
    - Both validators rely on the existing `parseWithSchema` helper so invalid payloads raise `HttpError` with `validation_error` semantics (same contract as other validators).  
  - **Tests**:  
    - Added `backend/tests/validators/public-links.validators.test.ts` to cover:  
      - Valid and invalid admin public-link payloads (including bad PIN formats).  
      - Valid and invalid public PIN submit payloads (non-numeric and wrong length).  
    - No new routes were added; repository and validators are only used in tests for now.

- **Plan (next backend steps for this ticket):**
  - Implement admin public link management via a `POST /v1/quotes/:quoteId/public-link` endpoint that will:  
    - Create/rotate tokens (40+ characters) and hash/clear PINs using the new `quote_public_links` fields.  
    - Use `parseAdminPublicLinkUpdate` and `public-links.repo` helpers to keep DB logic encapsulated.  
  - Implement public-facing endpoints:  
    - `GET /v1/public/quotes/:publicToken` – public quote view (without PIN check or with it, depending on configuration).  
    - `POST /v1/public/quotes/:publicToken/pin` – use `parsePublicPinSubmit` plus `pin_failed_attempts`/`pin_locked_until` to implement PIN verification and lockout semantics (403 on wrong/locked PIN).  
  - Wire all PIN and public-link changes through the `activities` table in a backward-compatible way (e.g. `set_pin`, `pin_attempt_failed`, `pin_attempt_success`) without altering existing `/v1/quotes` responses.

- **How to test (backend, Step 1 foundations only):**
  1. **Apply migrations:**  
     - Run the Drizzle migration flow so that both `0008_acceptance_and_public_links.sql` and `0009_public_links_pin_security.sql` are applied.  
     - Verify that `quote_public_links` has the following columns: `id`, `quote_id`, `token`, `pin_hash`, `pin_failed_attempts`, `pin_locked_until`, `created_at`, `updated_at`.  
     - Confirm indices: `quote_public_links_quote_id_idx` (on `quote_id`) and `quote_public_links_token_unique` (on `token`).  
  2. **Sanity-check repository helpers (manual DB exercise):**  
     - In a REPL or temporary script, open a transaction and call `upsertPublicLinkTx` with a new `quoteId` and `token`; verify a row is inserted with defaults for `pin_failed_attempts` and timestamps.  
     - Call `upsertPublicLinkTx` again with the same `quoteId` but a different `token` and `pinHash`; verify the same row is updated (same `id`), with new `token`, `pin_hash`, and a later `updated_at`.  
     - Confirm `getPublicLinkByQuoteIdTx` and `getPublicLinkByTokenTx` return the expected row.  
  3. **Run automated tests:**  
     - From `backend/`, run `npm test`.  
     - Confirm `tests/validators/public-links.validators.test.ts` passes and that the total test suite still succeeds, indicating no regressions were introduced.  
  4. **Confirm no API behavior changes:**  
     - Hit existing endpoints (e.g. `GET /v1/quotes`, `GET /v1/quotes/:quoteId`) and confirm responses and error contracts are unchanged; no new routes under `/v1/public` or `/v1/quotes` have been added for this ticket yet.

- **Step 2 – Admin public-link endpoint (COMPLETED):**
  - **Files touched:**  
    - Schema & migrations:  
      - `backend/src/db/schema.ts` – extended `activityTypeEnum` with `public_link_updated`.  
      - `backend/drizzle/0010_quote_activity_public_link.sql` – migration adding the `public_link_updated` value to the `quote_activity_type` enum.  
    - Public links domain:  
      - `backend/src/repositories/public-links.repo.ts` – `upsertPublicLinkTx` now also resets `pin_failed_attempts` to 0 and `pin_locked_until` to `null` when rotating; added `deletePublicLinkByQuoteIdTx(tx, quoteId)` to delete links by quote.  
      - `backend/src/services/pin-hash.service.ts` – new helper `hashPin(pin: string)` using Node `crypto.scryptSync` with a random salt and encoded parameters.  
    - Routes & wiring:  
      - `backend/src/routes/v1/quotes.ts` – new admin endpoint `POST /v1/quotes/:quoteId/public-link` using `parseAdminPublicLinkUpdate`, transactional public-link updates, PIN hashing, and `public_link_updated` activities.  
    - Tests:  
      - `backend/tests/routes/quotes.routes.test.ts` – added test suite for `POST /v1/quotes/:quoteId/public-link` and aligned error handling with the shared Express error middleware.  
  - **Behavior: admin POST /v1/quotes/:quoteId/public-link**  
    - **Validation:**  
      - Payload handled by `parseAdminPublicLinkUpdate` (same schema as Step 1):  
        - `{ enabled: boolean; pin?: string | null }`.  
        - If `pin` is a string, it must be **4–6 numeric digits**; otherwise a `validation_error` `HttpError` is thrown (surfacing as a `422` with `{ error: { code: 'validation_error', ... } }`).  
    - **Quote loading:**  
      - Within a DB transaction, `assertQuoteExistsTx` checks that the quote exists and is not soft-deleted.  
      - If not found: throws `HttpError(404, 'quote_not_found')`, surfaced by the error middleware as `{ error: { code: 'quote_not_found', ... } }`.  
    - **Case A – Disable public link (`enabled === false`):**  
      - Calls `deletePublicLinkByQuoteIdTx(tx, quoteId)` to remove any existing `quote_public_links` row for the quote (simplest way to fully invalidate the link).  
      - Logs an activity in the same transaction via `logActivityTx`:  
        - `type: 'public_link_updated'`.  
        - `metadata: { enabled: false }`.  
      - Returns DTO:  
        ```json
        {
          "data": {
            "enabled": false,
            "token": null,
            "pin_protected": false
          }
        }
        ```  
    - **Case B – Enable or rotate public link (`enabled === true`):**  
      - Generates a fresh, URL-safe token via `randomBytes(32).toString('hex')` (64 hex chars → 32 bytes of entropy).  
      - Computes `pinHash` using the new service:  
        - If `pin` is `null` or omitted → `pinHash = null` (no PIN protection).  
        - If `pin` is a valid 4–6 digit string → `pinHash = hashPin(pin)`; raw PIN is never stored.  
      - Calls `upsertPublicLinkTx(tx, { quoteId, token, pinHash })` to insert or update `quote_public_links`:  
        - On update: also resets `pin_failed_attempts` to 0 and `pin_locked_until` to `null`, and bumps `updated_at`.  
      - Logs an activity via `logActivityTx` in the same transaction:  
        - `type: 'public_link_updated'`.  
        - `metadata: { enabled: true, pin_protected: !!pinHash, rotated: true }`.  
      - Returns DTO (stable backend contract for frontend use):  
        ```json
        {
          "data": {
            "enabled": true,
            "token": "PUBLIC_TOKEN",
            "pin_protected": true
          }
        }
        ```  
        - `pin_protected` reflects whether a PIN hash is stored (`!!link.pinHash`).  
        - Never exposes the PIN or its hash.  
    - **Response DTO summary:**  
      - When `enabled === false`:  
        - `enabled: false`, `token: null`, `pin_protected: false`.  
      - When `enabled === true`:  
        - `enabled: true`, `token: string` (freshly rotated), `pin_protected: boolean` based on presence of PIN hash.  
      - The rest of `/v1/quotes` responses and shapes remain unchanged.  
  - **Tests (backend):**  
    - In `tests/routes/quotes.routes.test.ts`, added `describe('POST /v1/quotes/:quoteId/public-link', ...)` with the following scenarios:  
      - **Enable without PIN:**  
        - `payload = { enabled: true }`.  
        - Mocks `upsertPublicLinkTx` to return a sample link.  
        - Asserts:  
          - Status `200`.  
          - `data.enabled === true`, `data.pin_protected === false`, `data.token` is a non-empty string with length ≥ 32.  
          - `upsertPublicLinkTx` called with `{ quoteId, pinHash: null }`.  
          - `logActivityTx` called with `type: 'public_link_updated'` and `{ enabled: true, pin_protected: false, rotated: true }`.  
      - **Enable with PIN:**  
        - `payload = { enabled: true, pin: '123456' }`.  
        - Mocks `hashPin` to return `'hashed-123456'`.  
        - Asserts:  
          - Status `200`.  
          - `data.enabled === true`, `data.pin_protected === true`.  
          - `hashPin` called with the raw PIN once.  
          - `upsertPublicLinkTx` called with `pinHash: 'hashed-123456'`.  
          - `logActivityTx` metadata includes `{ enabled: true, pin_protected: true, rotated: true }`.  
      - **Disable link:**  
        - `payload = { enabled: false }`.  
        - Asserts:  
          - Status `200`.  
          - `data.enabled === false`, `data.token === null`, `data.pin_protected === false`.  
          - `deletePublicLinkByQuoteIdTx` called with the quoteId.  
          - `logActivityTx` metadata `{ enabled: false }`.  
      - **Quote not found:**  
        - Mocks DB state to have `quote = null`.  
        - Asserts:  
          - Status `404`.  
          - `error.code === 'quote_not_found'`.  
          - No calls to `upsertPublicLinkTx` or `deletePublicLinkByQuoteIdTx`.  
      - **Invalid payload:**  
        - `payload = { enabled: true, pin: 'abcd' }` (fails validator).  
        - Asserts:  
          - Status `422`.  
          - `error.code === 'validation_error'`.  
          - No calls to `upsertPublicLinkTx` or `deletePublicLinkByQuoteIdTx`.  
    - All tests run via `npm test` and pass after Step 2 changes (total: 9 files / 53 tests).

- **Step 3 – Public View + PIN Verification + Lockout (COMPLETED, backend-only):**  
  - **Files touched:**  
    - Migrations & schema:  
      - `backend/drizzle/0011_quote_activity_types_pin_security.sql` – adds `pin_failed`, `pin_locked`, `pin_verified` to `quote_activity_type`.  
      - `backend/src/db/schema.ts` – extends `activityTypeEnum` with the same three values.  
    - Services & repos:  
      - `backend/src/services/pin-hash.service.ts` – new `verifyPin(pin, stored)` companion to `hashPin`, using `crypto.scryptSync` and `timingSafeEqual`.  
      - `backend/src/repositories/public-access.repo.ts` – new public-facing domain helpers:  
        - `getPublicQuoteViewByToken(publicToken)` → returns a `QuotePublicView` DTO (sanitised aggregate) or throws `HttpError` with public-link/PIN errors.  
        - `verifyPublicPinByToken(publicToken, dto)` → enforces PIN verification, lockout, and logging.  
      - `backend/src/routes/v1/public.ts` – extended with:  
        - `GET /v1/public/quotes/:token` – public quote view with PIN enforcement.  
        - `POST /v1/public/quotes/:token/pin` – PIN verification endpoint.  
    - Tests:  
      - `backend/tests/services/pin-hash.service.test.ts` – verifies `hashPin` and `verifyPin` interop and salting behavior.  
      - `backend/tests/routes/public.routes.test.ts` – adds scenarios for public quote view and PIN routes.  
  - **QuotePublicView DTO (JSON, no internal details):**  
    - Returned by `GET /v1/public/quotes/:token` when access is allowed (no PIN or PIN already satisfied – although session handling is deferred to a later step):  
      ```json
      {
        "quote": {
          "number": "MPK-2025-001",
          "customer_name": "Acme Corp",
          "status": "sent|accepted|...",
          "acceptance_mode": "online|paper|null",
          "accepted_at": "2024-01-01T00:00:00.000Z" | null,
          "accepted_by_name": "John Doe" | null,
          "created_at": "2024-01-01T00:00:00.000Z",
          "valid_until": "2024-01-31T00:00:00.000Z" | null,
          "currency_code": "EUR"
        },
        "current_version": {
          "id": "...",
          "title": "...",
          "validity_date": "2024-01-31T00:00:00.000Z" | null,
          "totals_net_cents": 0,
          "totals_tax_cents": 0,
          "totals_gross_cents": 0,
          "totals_deposit_cents": 0,
          "totals_balance_cents": 0
        } | null,
        "lines": [
          {
            "id": "...",
            "label": "...",
            "description": "..." | null,
            "quantity": "1.00",
            "unit_price_cents": 10000,
            "tax_rate_pct": "20.0000",
            "discount_pct": "0.0000",
            "optional": false,
            "position": 1,
            "net_amount_cents": 10000,
            "tax_amount_cents": 2000,
            "gross_amount_cents": 12000
          }
        ]
      }
      ```  
      - No internal notes/metadata, no deleted versions, no activities.  
  - **Endpoints & behavior:**  
    - `GET /v1/public/quotes/:token`  
      - Uses `getPublicQuoteViewByToken(token)` which:  
        - Looks up `quote_public_links` via token; if not found → `HttpError(404, 'public_link_not_found')`.  
        - Loads the associated quote aggregate even if soft-deleted; the public link is the source of truth (404 only when the quote row is gone altogether).  
        - **If `pin_hash` is non-null:**  
          - If `pin_locked_until > now` → throws `HttpError(403, 'pin_locked', { unlock_at })`.  
          - Else → throws `HttpError(403, 'pin_required')`.  
          - No automatic bypass; front-end must call the PIN endpoint first (future session/cookie will be layered on later).  
        - **If `pin_hash` is null:**  
          - Returns the `QuotePublicView` DTO.  
          - Logs a `view` activity with `metadata: { source: 'public_view' }`.  
      - Error codes:  
        - `public_link_not_found` (404).  
        - `pin_required` (403).  
        - `pin_locked` (403, with `details.unlock_at`).  
    - `POST /v1/public/quotes/:token/pin`  
      - Validates payload with `parsePublicPinSubmit` (must be a 6-digit numeric PIN).  
      - Uses `verifyPublicPinByToken(token, dto)` which:  
        - Loads the public link; if missing → `public_link_not_found` (404).  
        - If `pin_hash` is null → `HttpError(400, 'pin_not_required')`.  
        - If `pin_locked_until > now` → `HttpError(403, 'pin_locked', { unlock_at })`.  
        - Uses `verifyPin(pin, pinHash)` to check correctness.  
        - **On valid PIN:**  
          - Resets `pin_failed_attempts = 0`, `pin_locked_until = null`, updates `updated_at`.  
          - Logs `pin_verified` activity.  
          - Returns `{ data: { pin_valid: true } }`.  
        - **On invalid PIN:**  
          - Increments `pin_failed_attempts`.  
          - If new count `>= 5`:  
            - Sets `pin_locked_until = now + 15 minutes`, persists attempts & lock timestamp.  
            - Logs `pin_failed` with `{ remaining_attempts: 0 }`.  
            - Logs `pin_locked` with `{ unlock_at }`.  
            - Throws `HttpError(403, 'pin_locked', { unlock_at })`.  
          - Else (still below threshold):  
            - Persists the incremented `pin_failed_attempts`.  
            - Computes `remaining_attempts = max(0, 5 - failedAttempts)`.  
            - Logs `pin_failed` with `{ remaining_attempts }`.  
            - Throws `HttpError(403, 'pin_invalid', { remaining_attempts })`.  
      - Error codes:  
        - `public_link_not_found` (404)  
        - `pin_not_required` (400)  
        - `pin_locked` (403, with `details.unlock_at`)  
        - `pin_invalid` (403, with `details.remaining_attempts`)  
        - `validation_error` (422, from invalid body).  
  - **Activity types used (new vs. existing):**  
    - `pin_failed` – invalid PIN attempt, `metadata: { remaining_attempts }`.  
    - `pin_locked` – lockout enforced, `metadata: { unlock_at }`.  
    - `pin_verified` – successful PIN validation, empty metadata.  
    - `view` (existing) – used when a public quote is successfully rendered via `GET /v1/public/quotes/:token` with `metadata: { source: 'public_view' }`.  
  - **How to test (curl examples):**  
    1. **Public view without PIN:**  
       ```bash
       curl -i "http://localhost:3000/v1/public/quotes/<TOKEN_NO_PIN>"
       ```  
       - Expect `200` + `QuotePublicView` JSON; verify shape matches the DTO.  
    2. **Public view with PIN configured:**  
       ```bash
       curl -i "http://localhost:3000/v1/public/quotes/<TOKEN_WITH_PIN>"
       ```  
       - Expect `403` with `{ error: { code: 'pin_required', ... } }` (unless locked).  
    3. **Submit correct PIN:**  
       ```bash
       curl -i -X POST "http://localhost:3000/v1/public/quotes/<TOKEN_WITH_PIN>/pin" \
         -H "Content-Type: application/json" \
         -d '{ "pin": "123456" }'
       ```  
       - Expect `200` with `{ "data": { "pin_valid": true } }`.  
    4. **Wrong PIN and lockout behavior:**  
       - Repeat POST with a wrong PIN (`000000`) several times:  
         - Attempts 1–4: `403 pin_invalid` with decreasing `remaining_attempts`.  
         - 5th attempt: `403 pin_locked` with `details.unlock_at`.  
       - Subsequent GET on the same token: `403 pin_locked`.  
    5. **PIN not required:**  
       ```bash
       curl -i -X POST "http://localhost:3000/v1/public/quotes/<TOKEN_NO_PIN>/pin" \
         -H "Content-Type: application/json" \
         -d '{ "pin": "123456" }'
       ```  
       - Expect `400` with `{ error: { code: 'pin_not_required', ... } }`.  
    6. **Public link not found:**  
       - Use a random/nonexistent token in either GET or POST → `404 public_link_not_found`.  
  - **Notes / constraints:**  
    - Still strictly backend-only; no session/cookie yet – frontend will orchestrate:  
      - Call `POST /v1/public/quotes/:token/pin` until `{ pin_valid: true }`.  
      - Then call `GET /v1/public/quotes/:token` to fetch the quote.  
    - Ticket 6 is **not fully complete** yet: Step 4 will connect the public acceptance flow to these endpoints and then wire the frontend.

- **Step 4 – Public Acceptance Flow (COMPLETED, backend-only):**  
  - **Goal:**  
    - Wire the existing public online acceptance endpoint so that it uses the secure public-link + PIN infrastructure from Steps 1–3, and so that its response shape matches the sanitized `QuotePublicView` DTO used by the public GET endpoint.  
  - **Files touched:**  
    - `backend/src/repositories/public-access.repo.ts` – exports a transaction-scoped helper `getPublicQuoteViewByQuoteIdTx(tx, quoteId)` that loads a quote aggregate and maps it to the `QuotePublicView` DTO, for reuse by other repositories.  
    - `backend/src/repositories/acceptance.repo.ts` – refactors `acceptQuoteOnlineByToken` to:  
      - Resolve the public link via `getPublicLinkByTokenTx(tx, publicToken)`.  
      - Load the quote via a transaction-local helper that enforces `deletedAt IS NULL` (soft-deleted quotes are treated as not found for acceptance).  
      - Enforce PIN lockout and “PIN validated” requirements using the state on `quote_public_links`.  
      - Apply the acceptance business rules from Ticket 5 (status guard, status update, acceptance fields, version locking, activities) inside the same transaction.  
      - Return the updated public view via `getPublicQuoteViewByQuoteIdTx(tx, quoteId)`, ensuring `POST /v1/public/quotes/:token/accept` now returns `{ data: QuotePublicView }`.  
    - `backend/src/routes/v1/public.ts` – unchanged in structure, but now its `POST /v1/public/quotes/:publicToken/accept` handler returns the `QuotePublicView` DTO instead of a full `QuoteFull` aggregate.  
    - `backend/tests/routes/public.routes.test.ts` – extended to cover the new public acceptance behavior and error scenarios while still mocking repositories and using the shared Express error handler.  
  - **Endpoint behavior – POST /v1/public/quotes/:token/accept:**  
    - **Request payload** (unchanged from Ticket 5):  
      ```json
      {
        "full_name": "John Doe",
        "accept_cgv": true
      }
      ```  
      - Parsed with `parsePublicAcceptance`, which still enforces:  
        - Non-empty `full_name`.  
        - Boolean `accept_cgv`; if `false`, throws `HttpError(400, 'cgv_not_accepted', ...)`.  
        - Structural validation errors (missing/invalid fields) surface as `HttpError(422, 'validation_error', ...)` via `parseWithSchema`.  
    - **Transaction flow in `acceptQuoteOnlineByToken(publicToken, dto)`:**  
      1. **Resolve public link:**  
         - Uses `getPublicLinkByTokenTx(tx, publicToken)`.  
         - If no row found → `HttpError(404, 'public_link_not_found')`.  
      2. **Load quote:**  
         - Uses a local `loadQuoteByIdTx(tx, quoteId)` helper with `deletedAt IS NULL`.  
         - If quote is missing or soft-deleted → `HttpError(404, 'public_link_not_found')` (public cannot revive deleted quotes).  
      3. **PIN enforcement (temporary Step 4 rule):**  
         - If `pin_hash` is `NULL` on the link:  
           - No PIN required → proceed to acceptance.  
         - If `pin_hash` is **non-null**:  
           - If `pin_locked_until > now()` → `HttpError(403, 'pin_locked', { unlock_at })`.  
           - Otherwise, inspect `pin_failed_attempts` (default `0`):  
             - If `pin_failed_attempts !== 0` → `HttpError(403, 'pin_required', 'PIN is required to accept this quote.')`.  
             - If `pin_failed_attempts === 0` and no lock → accept; this is the temporary approximation that assumes the frontend has successfully validated the PIN via `POST /v1/public/quotes/:token/pin` (which resets `pin_failed_attempts` to `0` on success).  
      4. **Acceptance business rules (same as Ticket 5):**  
         - If `quote.status === 'accepted'` → `HttpError(409, 'already_accepted')`.  
         - Otherwise:  
           - Set `status = 'accepted'`.  
           - Set `acceptanceMode = 'online'`.  
           - Set `acceptedAt = now`.  
           - Set `acceptedByName = dto.full_name`.  
           - Bump `updatedAt = now`.  
           - Update is guarded by `deletedAt IS NULL` to avoid accepting deleted quotes.  
      5. **Lock non-current versions (Ticket 4):**  
         - Calls `lockNonCurrentVersionsForQuoteTx(tx, quoteId)` inside the same transaction so that all non-current versions are marked `isLocked = true` and corresponding `version_locked` activities are logged.  
      6. **Activities:**  
         - Logs `status_changed` with metadata `{ from: previousStatus, to: 'accepted' }`.  
         - Logs `accept` with metadata `{ mode: 'online', full_name }`.  
      7. **Return updated public view:**  
         - Uses `getPublicQuoteViewByQuoteIdTx(tx, quoteId)` to recompute the public DTO and returns it.  
         - If, exceptionally, the public view cannot be loaded → `HttpError(500, 'quote_load_failed')`.  
    - **Response DTO:**  
      - On success, the route now returns:  
        ```json
        {
          "data": {
            "quote": {
              "number": "MPK-2025-001",
              "customer_name": "Acme",
              "status": "accepted",
              "acceptance_mode": "online",
              "accepted_at": "2024-01-01T00:00:00.000Z",
              "accepted_by_name": "John Doe",
              "created_at": "2023-12-31T00:00:00.000Z",
              "valid_until": null,
              "currency_code": "EUR"
            },
            "current_version": { /* same shape as in Step 3 */ },
            "lines": [ /* same line DTOs as in Step 3 */ ]
          }
        }
        ```  
      - This **refines** the initial Ticket 5 description, which returned a full `QuoteFull` aggregate; from Step 4 onward, the public acceptance endpoint uses the safer, public-facing DTO.  
  - **Error codes surfaced by POST /v1/public/quotes/:token/accept:**  
    - `public_link_not_found` (404) – unknown token or quote missing/soft-deleted.  
    - `pin_locked` (403) – when `pin_locked_until > now`; includes `details.unlock_at`.  
    - `pin_required` (403) – PIN is configured but `pin_failed_attempts !== 0`, meaning the PIN has failed recently and must be (re-)validated via the PIN endpoint before acceptance.  
    - `already_accepted` (409) – quote status is already `accepted`.  
    - `quote_not_found` (404) – defensive guard when the quote cannot be updated, even though the link existed.  
    - `quote_load_failed` (500) – defensive guard when the public view cannot be recomputed after a successful update.  
    - `cgv_not_accepted` (400) – `accept_cgv` was explicitly `false`.  
    - `validation_error` (422) – structurally invalid payload (e.g. missing `full_name`, wrong field types), raised by the validator.  
  - **Tests (backend: `tests/routes/public.routes.test.ts`):**  
    - Added/updated tests under `describe('v1/public acceptance route', ...)` to assert routing + error handling semantics:  
      - **Successful acceptance (no PIN):** mocks `acceptanceRepo.acceptQuoteOnlineByToken` to return a `QuotePublicView` with `status = 'accepted'` and asserts `200 { data: view }` plus correct repo call.  
      - **Successful acceptance (PIN-protected, PIN validated):** mocks a successful acceptance for a token that would correspond to a PIN-protected link; in the real implementation this is when `pin_hash` is non-null, `pin_locked_until` is not in the future, and `pin_failed_attempts === 0`.  
      - **Missing PIN validation:** mocks a repository-level `HttpError(403, 'pin_required')` and asserts the route surfaces the same status and error code.  
      - **Lockout:** mocks `HttpError(403, 'pin_locked', { unlock_at })` and asserts the error payload is propagated.  
      - **Already accepted:** mocks `HttpError(409, 'already_accepted')` and asserts correct status and code.  
      - **Link not found:** mocks `HttpError(404, 'public_link_not_found')` and asserts correct status and code.  
      - **CGV not accepted:** posts a payload with `accept_cgv: false` and asserts `400 cgv_not_accepted` with no repository call.  
      - **Validation error:** posts a structurally invalid payload (e.g. missing `full_name`) and asserts `422 validation_error` and that the repository is not called.  
    - Existing tests for public view and PIN verification remain unchanged and continue to validate the behavior from Step 3.  
  - **How to test (manual curl examples):**  
    1. **Successful acceptance without PIN:**  
       ```bash
       curl -i -X POST "http://localhost:3000/v1/public/quotes/<TOKEN_NO_PIN>/accept" \
         -H "Content-Type: application/json" \
         -d '{ "full_name": "John Doe", "accept_cgv": true }'
       ```  
       - Expect `200` and a `QuotePublicView` with `status: "accepted"` and acceptance fields filled.  
    2. **Successful acceptance with PIN (after validation):**  
       - First validate PIN via Step 3 endpoint:  
         ```bash
         curl -i -X POST "http://localhost:3000/v1/public/quotes/<TOKEN_WITH_PIN>/pin" \
           -H "Content-Type: application/json" \
           -d '{ "pin": "123456" }'
         ```  
       - Then call the acceptance endpoint with a valid payload as above; expect `200` and updated `QuotePublicView`.  
    3. **Missing PIN validation:**  
       - Reuse a token with `pin_hash` configured and simulate a non-zero `pin_failed_attempts` (e.g. by deliberately submitting a wrong PIN until `pin_failed_attempts > 0`).  
       - Call `POST /v1/public/quotes/:token/accept` → expect `403 pin_required`.  
    4. **PIN lockout path:**  
       - Reuse the Step 3 workflow to reach lockout (`pin_locked_until` in the future).  
       - Attempt acceptance → expect `403 pin_locked` with `details.unlock_at`.  
    5. **Already accepted & link not found:**  
       - For an already accepted quote, repeat the acceptance call → `409 already_accepted`.  
       - For an unknown or orphaned token, call the endpoint → `404 public_link_not_found`.  
    6. **Validation failures:**  
       - Omit `full_name` or send a non-string value → `422 validation_error`.  
       - Send `full_name` but set `accept_cgv: false` → `400 cgv_not_accepted`.  
  - **Notes / Status:**  
    - This step **does not** introduce any frontend changes; it only refines the backend behavior of the existing public acceptance endpoint.  
    - Ticket 6 is still **not fully complete** – a future Step 5 will adapt the frontend to rely on the new token + PIN + public DTO flow (including session/cookie handling for PIN), now that the backend contracts are stable.

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

- **Backend status:** Step 1 – PDF jobs data model & basic API contract is implemented in this Node backend; later steps will plug in the real renderer and storage but keep these contracts stable.  

- **Step 1 – PDF jobs data model & basic API contract (COMPLETED, backend-only):**  
  - **Data model (`pdf_jobs` table):**  
    - Migration `backend/drizzle/0013_pdf_jobs_queue.sql` creates the queue table:  
      - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`  
      - `quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE`  
      - `version_id UUID NOT NULL REFERENCES quote_versions(id) ON DELETE CASCADE`  
      - `status TEXT NOT NULL` – constrained in code to `'pending' | 'processing' | 'ready' | 'failed'`.  
      - `file_url TEXT` – public/private URL of the generated PDF (nullable, set when `status = 'ready'`).  
      - `error_code TEXT` – short machine code such as `render_failed`, `template_error` (nullable).  
      - `error_message TEXT` – developer-oriented description (nullable).  
      - `attempts INTEGER NOT NULL DEFAULT 0` – number of render attempts.  
      - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`  
      - `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`  
      - `started_at TIMESTAMPTZ` – when a worker actually started processing this job.  
      - `finished_at TIMESTAMPTZ` – when the job reached a terminal state (`ready`/`failed`).  
    - Indexes:  
      - `pdf_jobs_quote_version_idx` on `(quote_id, version_id)`.  
      - `pdf_jobs_status_idx` on `status`.  
    - Drizzle schema (`backend/src/db/schema.ts`):  
      - `export const pdfJobs = pgTable('pdf_jobs', { ... })` mirroring the columns above.  
      - Relations: `pdfJobsRelations` link each job to its `quote` and `quote_version`.  
      - Exported types:  
        - `export type PdfJob = typeof pdfJobs.$inferSelect;`  
        - `export type PdfJobStatus = 'pending' | 'processing' | 'ready' | 'failed';`.  
  - **Repository helpers (`backend/src/repositories/pdf-jobs.repo.ts`):**  
    - All helpers follow the existing `TransactionClient` pattern.  
    - `createPdfJobTx(tx, { quoteId, versionId }): Promise<PdfJob>`  
      - Validates that the quote exists and is not soft-deleted.  
      - Validates that the version belongs to that quote and is not soft-deleted.  
      - Inserts a row with:  
        - `status = 'pending'`, `attempts = 0`, `fileUrl = null`, `errorCode = null`, `errorMessage = null`, and timestamps set from `now`.  
      - Returns the created `PdfJob`; on unexpected insert failure, throws `HttpError(500, 'pdf_job_create_failed')`.  
    - `getPdfJobByIdTx(tx, id: string): Promise<PdfJob | null>`  
      - Looks up a job by `id`; returns `null` when not found.  
    - `findLatestPdfJobForQuoteVersionTx(tx, quoteId, versionId): Promise<PdfJob | null>`  
      - Returns the most recent job for a `(quoteId, versionId)` pair ordered by `created_at DESC`.  
    - `updatePdfJobStatusTx(tx, id, patch): Promise<PdfJob>`  
      - Accepts a patch with optional fields:  
        - `status?: PdfJobStatus`  
        - `fileUrl?: string | null`  
        - `errorCode?: string | null`  
        - `errorMessage?: string | null`  
        - `startedAt?: Date | null`  
        - `finishedAt?: Date | null`  
        - `incrementAttempts?: boolean`  
      - Always bumps `updatedAt` to `now`.  
      - If `incrementAttempts` is true, uses `attempts = attempts + 1` in SQL.  
      - Throws `HttpError(404, 'pdf_job_not_found')` if the job does not exist.  
  - **Validators (`backend/src/api/validators/pdf.ts`):**  
    - `parsePdfJobCreateRequest(payload)`  
      - Payload schema: `{ force_regenerate?: boolean }`.  
      - `.strict()` – rejects unknown keys and surfaces `422 validation_error` via `parseWithSchema`.  
      - For Step 1 the body is effectively optional/empty; `force_regenerate` is reserved for future logic.  
    - `parsePdfJobStatusParams(params)`  
      - Params schema: `{ jobId: string (uuid) }`.  
      - Used by the status endpoint to validate `:jobId`, returning `422 validation_error` for non-UUID values.  
  - **Routes (`backend/src/routes/v1/pdf.ts` mounted under `/v1`):**  
    - **POST `/v1/quotes/:quoteId/pdf` – enqueue a PDF job (stubbed worker):**  
      - Validates `quoteId` with a UUID regex; if it does not match, throws `404 quote_not_found`.  
      - Parses body via `parsePdfJobCreateRequest` (for now typically `{}`).  
      - Inside a DB transaction:  
        - Loads the quote by id ensuring `deleted_at IS NULL`.  
        - If quote missing or deleted → `404 quote_not_found`.  
        - If `current_version_id` is `null` → `409 no_current_version_for_pdf`.  
        - Calls `createPdfJobTx(tx, { quoteId, versionId: currentVersionId })`.  
      - Response (Step 1, no real rendering yet):  
        ```json
        {
          "data": {
            "job_id": "UUID",
            "status": "pending"
          }
        }
        ```  
      - This establishes the enqueue contract for the frontend; the job will remain `pending` until Step 2 introduces a worker.  
    - **GET `/v1/pdf/jobs/:jobId` – poll PDF job status:**  
      - Validates `:jobId` via `parsePdfJobStatusParams` (`uuid` constraint).  
      - Runs `getPdfJobByIdTx` inside a transaction.  
      - If no job: throws `404 pdf_job_not_found`.  
      - Response DTO:  
        ```json
        {
          "data": {
            "job_id": "UUID",
            "status": "pending|processing|ready|failed",
            "file_url": "https://..." | null,
            "error_code": "render_failed" | "template_error" | null,
            "error_message": "string or null"
          }
        }
        ```  
      - Frontend can already rely on this shape for polling, even though Step 1 jobs will generally remain `pending` until worker wiring.  
  - **Tests (`backend/tests/pdf-jobs.routes.test.ts`):**  
    - Uses a mocked `db.transaction` and mocked `pdf-jobs.repo` functions to test route behavior only.  
    - **`POST /v1/quotes/:quoteId/pdf`**  
      - Returns `200` + `{ job_id, status: 'pending' }` when quote and `current_version_id` exist.  
      - Returns `404 quote_not_found` when the quote state is `null`.  
      - Returns `409 no_current_version_for_pdf` when the quote has `current_version_id = null`.  
    - **`GET /v1/pdf/jobs/:jobId`**  
      - Returns `200` with `{ job_id, status, file_url, error_code, error_message }` when job exists.  
      - Returns `404 pdf_job_not_found` when repository returns `null`.  
      - Returns `422 validation_error` for non-UUID `jobId` (validator-level error).  

- **Step 2 – PDF job lifecycle (processing, ready, failed) (COMPLETED, backend-only):**  
  - **Service (`backend/src/services/pdf-jobs.service.ts`):**  
    - Introduced `startPdfJobProcessing(jobId: string): Promise<void>`, a minimal synchronous "worker" that drives a job through its lifecycle using `db.transaction` + `updatePdfJobStatusTx`:  
      1. Marks the job as **processing** and increments attempts:  
         - `status = 'processing'`  
         - `started_at = now`  
         - `attempts = attempts + 1`  
      2. Immediately "simulates" successful rendering and marks it **ready** with a placeholder PDF URL:  
         - `status = 'ready'`  
         - `file_url = 'https://example.com/placeholder.pdf'`  
         - `finished_at = now`  
    - For now there is no simulated failure branch; tests still cover the `failed` shape via mocked jobs on the status route.  
  - **Route wiring (enqueue endpoint):**  
    - `backend/src/routes/v1/pdf.ts` `POST /v1/quotes/:quoteId/pdf`:  
      - After creating the job via `createPdfJobTx`, calls `startPdfJobProcessing(job.id)` in a fire-and-forget fashion.  
      - Response remains:  
        ```json
        {
          "data": {
            "job_id": "UUID",
            "status": "pending"
          }
        }
        ```  
        even though the job will typically transition to `processing`/`ready` almost immediately afterward.  
      - The optional `force_regenerate` flag is accepted by the validator but not yet used; a future step may reuse the latest `ready` job instead of always enqueuing a new one.  
  - **Status route behavior (unchanged contract, more realistic data):**  
    - `GET /v1/pdf/jobs/:jobId` now commonly returns:  
      - `status = 'ready'` with a non-null `file_url` for freshly enqueued jobs.  
      - Tests also cover the `failed` state explicitly (via mocks) to validate the error payload shape.  
  - **Tests updated/added:**  
    - `backend/tests/pdf-jobs.routes.test.ts`:  
      - Mocks `startPdfJobProcessing` and asserts it is called once with the new `job_id` when `POST /v1/quotes/:quoteId/pdf` succeeds.  
      - Extends `GET /v1/pdf/jobs/:jobId` tests to cover:  
        - A **ready** job (`status = 'ready'`, non-null `file_url`, `error_code`/`error_message = null`).  
        - A **failed** job (`status = 'failed'`, `file_url = null`, non-null `error_code` and `error_message`).  
    - `backend/tests/services/pdf-jobs.service.test.ts`:  
      - Unit-tests `startPdfJobProcessing` with mocked `db.transaction` and `updatePdfJobStatusTx`.  
      - Asserts two updates: first to `processing` with `incrementAttempts: true` and `startedAt` set, then to `ready` with the placeholder `fileUrl` and `finishedAt` set.  

- **Plan (next backend milestones beyond Step 2):**  
  - Introduce a real PDF rendering worker (Supabase Function or equivalent) that:  
    - Consumes `pdf_jobs` entries in `pending/processing` state.  
    - Writes the generated PDF to Storage and updates `file_url`, `status`, `started_at`, `finished_at`, `error_*`, and `attempts` via `updatePdfJobStatusTx`.  
    - Logs `pdf_requested` / `pdf_ready` / `pdf_failed` activities (new activity types as needed) without breaking existing consumers.  
  - Optionally extend `quote_versions` (or `quotes`) with read-only fields such as `pdf_url` / `last_pdf_generated_at` for convenience, keeping them **optional** in the API.  
  - Coordinate with the frontend so the existing "Générer le PDF" flow enqueues jobs via `POST /v1/quotes/:quoteId/pdf` and polls via `GET /v1/pdf/jobs/:jobId` until `ready` or timeout.

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

- **Backend status:** Planned for next backend milestone before deployment (no sync/outbox or export/import endpoints exist yet in this Node backend).  

- **Implementation Notes (target design for next backend milestone):**
  - Add revision-aware outbox processors plus retry/backoff logic in a `syncService`, logging receipts and conflicts.  
  - Introduce JSON bundle validators (`quoteExport` schemas) and helpers that normalize timestamps/IDs before applying to Drizzle.  
  - Implement `exportQuoteBundle`/`importQuoteBundle` in `quoteService` with merge safeguards (last-write-wins, duplicate detection, attachment/tax/FX reconciliation) and activity logging.

- **Plan (next backend milestone):**
  - Implement `GET /v1/quotes/:quoteId/export` and `POST /v1/quotes/:quoteId/import` endpoints so the existing backup/restore UI can perform JSON round-trips with clear "not encrypted" labelling.  
  - Define an envelope format for offline outbox operations and a `POST /v1/sync/outbox` endpoint that the frontend can call to replay queued mutations after reconnect.  
  - Rely on `updatedAt` plus optional `revision` fields and `activities` metadata to implement last-write-wins and conflict reporting without breaking current `/v1/quotes` consumers.  
  - Optionally add lightweight `sync_receipts` logging in the DB for auditability, keeping the core quotes schema stable.

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

- **Backend status:** Partially implemented (backend-only). Step 1 (schema/repos) and Step 3 (tax rates/products CRUD + branding update) are implemented in this Node backend; remaining admin/catalog entities and admin UI remain planned for a later milestone.  

- **Implementation Notes:**
  - **Step 1 – DB schema & repository helpers (COMPLETED, backend-only):**  
    - Added Drizzle schema + SQL migration for the first catalog/branding tables, without exposing any new `/v1/admin/*` routes yet.  
    - **Migration:** `backend/drizzle/0012_catalog_and_branding.sql` creates three tables:  
      - `tax_rates`  
        - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`  
        - `name TEXT NOT NULL` (ex: "TVA 20 %")  
        - `code TEXT NOT NULL` (ex: `TVA20`)  
        - `rate_bps INTEGER NOT NULL` (basis points, ex: `2000` pour 20 %)  
        - `is_default BOOLEAN NOT NULL DEFAULT FALSE`  
        - `is_active BOOLEAN NOT NULL DEFAULT TRUE`  
        - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`  
        - `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`  
        - Indexes:  
          - `tax_rates_code_unique` (UNIQUE sur `code`).  
          - `tax_rates_default_active_idx` (`is_default`, `is_active`) pour retrouver rapidement le taux par défaut actif.  
      - `products`  
        - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`  
        - `internal_code TEXT` (nullable, code interne type `MEMO-FILM-CLASSIC`)  
        - `name TEXT NOT NULL`  
        - `description TEXT` (nullable)  
        - `default_unit_price_cents INTEGER` (nullable, prix unitaire HT par défaut)  
        - `default_tax_rate_id UUID REFERENCES tax_rates(id)` (nullable)  
        - `is_active BOOLEAN NOT NULL DEFAULT TRUE`  
        - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`  
        - `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`  
        - Indexes:  
          - `products_internal_code_unique` (UNIQUE sur `internal_code`).  
          - `products_active_idx` (`is_active`).  
      - `branding_configs`  
        - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`  
        - `label TEXT NOT NULL` (ex: "default")  
        - `company_name TEXT`  
        - `logo_url TEXT`  
        - `primary_color TEXT`  
        - `secondary_color TEXT`  
        - `pdf_footer_text TEXT`  
        - `default_validity_days INTEGER` (nullable)  
        - `default_deposit_pct INTEGER` (nullable, en pourcentage, ex: 50)  
        - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`  
        - `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`  
        - Indexes:  
          - `branding_configs_label_unique` (UNIQUE sur `label`).  
    - **Drizzle schema (`backend/src/db/schema.ts`):**  
      - Ajout des tables typées :  
        - `taxRates` (colonnes camelCase ↔ snake_case)  
        - `products`  
        - `brandingConfigs`  
      - Ajout des types exportés :  
        - `export type TaxRate = typeof taxRates.$inferSelect;`  
        - `export type Product = typeof products.$inferSelect;`  
        - `export type BrandingConfig = typeof brandingConfigs.$inferSelect;`  
      - Aucun lien n’est encore ajouté entre ces tables et le domaine `quotes` (les FK éventuelles vers `products`/`tax_rates` seront exploitées dans de futurs tickets).  
    - **Repositories (`backend/src/repositories`):**  
      - `tax-rates.repo.ts`  
        - `listActiveTaxRatesTx(tx)` → renvoie tous les `TaxRate` avec `isActive = true`, ordonnés par `rateBps` puis `name`.  
        - `getDefaultTaxRateTx(tx)` → renvoie le premier taux avec `isDefault = true` ou `null` s’il n’existe pas encore.  
      - `products.repo.ts`  
        - `listActiveProductsTx(tx)` → renvoie tous les `Product` avec `isActive = true`, triés par `name`.  
        - `getProductByIdTx(tx, id)` → renvoie le produit correspondant à l’`id` ou `null` si introuvable.  
      - `branding.repo.ts`  
        - `getBrandingConfigTx(tx)` → renvoie la **première** ligne de `branding_configs` (ou `null`), utilisée comme configuration active courante.  
        - `upsertBrandingConfigTx(tx, payload)` → helper simple « insert-or-update » :  
          - Si `payload.id` est fourni, la mise à jour se fait par `id`.  
          - Sinon, la mise à jour se fait par `label` (permet de gérer une config "default" globale).  
          - Remplit `companyName`, `logoUrl`, `primaryColor`, `secondaryColor`, `pdfFooterText`, `defaultValidityDays`, `defaultDepositPct` en appliquant `null` lorsque les champs sont absents.  
          - Met toujours à jour `updatedAt`; remplit `createdAt` lors de l’insertion.  
      - Barrel export mis à jour dans `backend/src/repositories/index.ts` pour ré-exporter les nouveaux helpers (`tax-rates.repo`, `products.repo`, `branding.repo`) aux côtés des repos existants.  
    - **Tests légers (`backend/tests/repositories.catalog_and_branding.test.ts`):**  
      - Utilisent des `TransactionClient` factices (objets JS simples) pour tester les helpers sans base réelle :  
        - `tax-rates.repo` : vérifie que `listActiveTaxRatesTx` renvoie les lignes actives et que `getDefaultTaxRateTx` retourne le taux marqué `isDefault`.  
        - `products.repo` : vérifie que `listActiveProductsTx` expose un produit actif et que `getProductByIdTx` renvoie bien le produit attendu.  
        - `branding.repo` :  
          - `getBrandingConfigTx` renvoie la première config quand elle existe.  
          - `upsertBrandingConfigTx` insère une config quand il n’y en a pas puis la met à jour sur un second appel (même `label`).  
    - **Comment appliquer la migration et vérifier rapidement en SQL :**  
      1. Depuis `backend/`, appliquer les migrations Drizzle selon le flux habituel (ex: script `npm run migrate` ou équivalent).  
      2. Vérifier la présence des nouvelles tables et colonnes :  
         - `\d+ tax_rates`  
         - `\d+ products`  
         - `\d+ branding_configs`  
      3. Insérer une ligne de test simple dans chaque table via psql ou un client SQL :  
         - `INSERT INTO tax_rates (name, code, rate_bps, is_default) VALUES ('TVA 20 %', 'TVA20', 2000, TRUE);`  
         - `INSERT INTO products (name, default_unit_price_cents, is_active) VALUES ('Film MEMOPYK Classique', 120000, TRUE);`  
         - `INSERT INTO branding_configs (label, company_name, default_validity_days, default_deposit_pct) VALUES ('default', 'MEMOPYK', 30, 50);`  
      4. Lancer les tests backend : `npm test` depuis `backend/` et vérifier que `repositories.catalog_and_branding.test.ts` passe bien.  
  - **Step 3 – Admin catalog CRUD + Branding update (COMPLETED, backend-only):**  
    - **Routes exposées (`backend/src/routes/v1/admin.ts`) :**  
      - `GET /v1/admin/tax-rates` → liste les taux actifs et renvoie un tableau DTO `{ id, name, code, rate_bps, is_default, is_active }`.  
      - `POST /v1/admin/tax-rates` → crée un taux à partir d’un payload JSON `{ name, code, rate_bps, is_default }` (snake_case) et renvoie le DTO créé.  
      - `PATCH /v1/admin/tax-rates/:id` → met à jour un taux existant (payload partiel) et renvoie le DTO mis à jour.  
      - `GET /v1/admin/products` → liste les produits actifs sous forme de DTO `{ id, internal_code, name, description, default_unit_price_cents, default_tax_rate_id, is_active }`.  
      - `POST /v1/admin/products` → crée un produit avec `{ internal_code?, name, description?, default_unit_price_cents, default_tax_rate_id? }`.  
      - `PATCH /v1/admin/products/:id` → met à jour un produit existant (payload partiel).  
      - `GET /v1/admin/branding` → renvoie la config de branding courante (ou `null` si aucune).  
      - `POST /v1/admin/branding` → met à jour ou insère une config de branding à partir d’un payload `{ label, company_name?, logo_url?, primary_color?, secondary_color?, pdf_footer_text?, default_validity_days?, default_deposit_pct? }`.  
      - Toutes les routes admin renvoient les réponses dans l’enveloppe standard `{ data: ... }` ou `{ error: { code, message, details? } }`.  
    - **Validation (Zod, `backend/src/api/validators/admin-catalog.ts`) :**  
      - `parseAdminTaxRateCreate` / `parseAdminTaxRateUpdate` valident :  
        - `name` et `code` → `string` non vide (trim).  
        - `rate_bps` → entier `0 ≤ rate_bps ≤ 2500`.  
        - `is_default` → `boolean`.  
        - Le schéma d’update est `partial()` avec une contrainte « au moins un champ fourni ».  
      - `parseAdminProductCreate` / `parseAdminProductUpdate` valident :  
        - `name` requis, `internal_code`/`description` optionnels (non vides si présents).  
        - `default_unit_price_cents` → entier `≥ 0`.  
        - `default_tax_rate_id` → `string` non vide ou `null`, optionnel (champ omis = pas de changement).  
      - `parseAdminBrandingUpdate` impose :  
        - `label` requis (string non vide).  
        - `default_validity_days` → entier `≥ 0` si présent.  
        - `default_deposit_pct` → entier `0 ≤ pct ≤ 100` si présent.  
    - **Règles métier & repos (`backend/src/repositories`) :**  
      - `createTaxRateTx` / `updateTaxRateTx` (dans `tax-rates.repo.ts`) :  
        - Utilisent une transaction Drizzle.  
        - Si `is_default = true`, mettent d’abord tous les autres taux par défaut à `false` avant d’insérer / mettre à jour, garantissant un seul taux par défaut actif.  
        - Sur violation d’unicité de `code` (erreur Postgres `23505`), lèvent `HttpError(409, 'tax_rate_code_conflict')`.  
        - Sur `PATCH` d’un id inexistant, lèvent `HttpError(404, 'tax_rate_not_found')`.  
      - `createProductTx` / `updateProductTx` (dans `products.repo.ts`) :  
        - Résolvent `default_tax_rate_id` via `getTaxRateByIdTx`.  
        - Vérifient d’abord un format UUID v4 simple ; si invalide ou si aucun taux correspondant n’est trouvé, lèvent `HttpError(400, 'invalid_tax_rate_id')`.  
        - Écrivent `internalCode`, `description` et `defaultTaxRateId` en `null` lorsque les champs sont absents/vides, et mettent toujours à jour `updatedAt`.  
      - `getBrandingConfigTx` / `upsertBrandingConfigTx` (dans `branding.repo.ts`) :  
        - `getBrandingConfigTx` renvoie la première ligne de `branding_configs` comme config active.  
        - `upsertBrandingConfigTx` choisit la ligne cible par `id` si fourni, sinon par `label`, et applique systématiquement la normalisation (strings trimées côté API + `null` en base pour les champs omis).  
    - **Tests de routes (`backend/tests/routes/admin.routes.test.ts`) :**  
      - `v1/admin tax-rates` :  
        - GET renvoie les DTO attendus.  
        - POST crée un taux et renvoie `201` avec le DTO.  
        - POST invalide → `422 validation_error`.  
        - Conflit d’unicité sur `code` → `409 tax_rate_code_conflict`.  
        - PATCH met à jour un taux et peut basculer `is_default = true`.  
      - `v1/admin products` :  
        - GET renvoie les DTO attendus.  
        - POST crée un produit et renvoie `201`.  
        - PATCH met à jour un produit existant.  
        - POST avec `default_tax_rate_id` non UUID → `400 invalid_tax_rate_id` (aucun appel repo).  
      - `v1/admin branding` :  
        - GET renvoie `{ data: null }` quand aucune config n’existe.  
        - GET renvoie la config courante mappée en snake_case.  
        - POST valide le payload, appelle `upsertBrandingConfigTx` et renvoie la config DTO.  
        - POST vide → `422 validation_error`.  
        - POST avec `default_validity_days < 0` ou `default_deposit_pct > 100` → `422 validation_error`.  
    - **Notes / limitations (Step 3) :**  
      - Aucune modification frontend n’est introduite dans cette étape ; ces routes sont prêtes pour une intégration admin ultérieure.  
      - Ticket 9 n’est pas encore complètement terminé : la gestion des bundles/blocks/currencies et la preview PDF côté admin restent à implémenter.
  - **Step 5 – Branding defaults appliqués à la création de devis (COMPLETED, backend):**  
    - **Objectif :** utiliser la configuration de branding (`branding_configs`) pour appliquer automatiquement une date de validité et un pourcentage d’acompte par défaut lors de la création d’un devis, sans casser les contrats existants de `/v1/quotes`.  
    - **Validation & DTOs (`backend/src/api/validators/quotes.ts`) :**  
      - `quoteCreateSchema` accepte désormais en option :  
        - `valid_until` : chaîne ISO non vide ou `null` (mêmes règles que pour `valid_until` en update),  
        - `deposit_pct` : entier `0–100`.  
      - Ces champs restent **optionnels** ; les payloads existants qui ne les envoient pas continuent de fonctionner à l’identique.  
    - **Logique métier (`backend/src/repositories/quotes.repo.ts`) :**  
      - `createQuote(dto)` ouvre toujours une transaction, réserve un numéro de devis, puis :  
        - Charge la config de branding courante via `getBrandingConfigTx(tx)` (peut retourner `null`).  
        - Délègue le calcul des defaults à un helper pur :  
          - `computeQuoteBrandingDefaults(now, dto, branding)` → `{ validUntil, depositPct }`.  
      - Règles appliquées par `computeQuoteBrandingDefaults` :  
        - **Validité (`validUntil` / `validityDate`) :**  
          - Si `dto.valid_until` est fourni, il est utilisé tel quel (y compris `null` pour désactiver la date de validité).  
          - Sinon, si `branding.defaultValidityDays` est non nul :  
            - Calcule une date à partir de `now` **tronqué au jour UTC** (date-only), ajoute `defaultValidityDays` jours, puis stocke la date ISO `YYYY-MM-DD`.  
          - Sinon, laisse `validUntil = null`.  
        - **Acompte (`depositPct`) :**  
          - Si `dto.deposit_pct` est fourni, il est converti en chaîne (`'30'`, `'50'`, etc.) et utilisé tel quel.  
          - Sinon, si `branding.defaultDepositPct` est non nul, il est converti en chaîne et appliqué.  
          - Sinon, `depositPct` reste `'0'`.  
      - Application des valeurs calculées :  
        - Dans la table `quotes` : `validUntil` et `depositPct` sont initialisés avec ces valeurs en plus des métadonnées existantes (`status = 'draft'`, `currencyCode`, etc.).  
        - Dans la table `quote_versions` (version initiale `versionNumber = 1`) :  
          - `validityDate` est aligné sur `validUntil`,  
          - `depositPct` reçoit la même valeur que sur l’entité `quotes`.  
      - La forme de réponse `QuoteFull` reste inchangée : les consommateurs continuent de lire `quote.validUntil` et `currentVersion.validityDate` comme avant, mais ces champs sont désormais renseignés automatiquement lorsque le branding le permet.  
      - Les routes suivantes ne sont **pas** modifiées :  
        - `GET /v1/quotes`, `GET /v1/quotes/:id`, `PATCH /v1/quotes/:id`. Elles renvoient et mettent à jour les champs existants sans logique de fallback supplémentaire.  
    - **Tests backend (branding defaults) :**  
      - Nouveau fichier `backend/tests/quotes.branding-defaults.test.ts` :  
        - Teste `computeQuoteBrandingDefaults` avec un `BrandingConfig` `{ default_validity_days = 30, default_deposit_pct = 50 }` et un payload de création sans `valid_until` ni `deposit_pct` :  
          - Vérifie que la date remonte à `now + 30 jours` (en UTC, tronqué au jour) et que `depositPct = '50'`.  
        - Vérifie qu’un payload qui fournit déjà `valid_until` et/ou `deposit_pct` n’est **jamais** écrasé par le branding.  
        - Vérifie qu’un `valid_until: null` explicite désactive le fallback de validité tout en permettant l’application d’un `default_deposit_pct`.
  - **Étapes suivantes prévues (au-delà de Step 5)** :  
    - Étendre le schéma pour `bundles`, `bundle_items`, `content_blocks`, `currencies`, `fx_snapshots`.  
    - Brancher `branding_configs` sur le **pipeline PDF** (Ticket 7) pour appliquer les defaults de marque dans les documents générés.

- **Plan (prochaine étape backend pour ce ticket, à venir):**
  - Implémenter `/v1/admin/bundles`, `/v1/admin/blocks`, `/v1/admin/currencies` et les autres entités de catalogue/FX une fois les tables correspondantes ajoutées (les routes `/v1/admin/products`, `/v1/admin/tax-rates` et `/v1/admin/branding` existent déjà dans ce backend).  
  - Brancher `branding_configs` dans le pipeline PDF sans casser les payloads actuels de `/v1/quotes`.  
  - Ajouter un journal d’activité d’admin (nouvelle table ou réutilisation de `activities`) pour tracer les modifications de configuration.

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

  - **Implementation Notes (deferred):**
    - This ticket focuses on frontend layout and visual polish. Given the Phase 1 DEVIS frontend freeze, this work is explicitly deferred to a later UI/UX milestone.
    - No backend changes are introduced for this ticket in the current backend-focused phase.

---

### Ticket 11 – Activity Log & Diff Tracking ✅ (Completed 18 Nov 2025)
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

- **Implementation Notes (backend completed):**
  - Extended the `quote_activity_type` enum to support additional activity kinds required by the quote lifecycle (`freeze`, `send`, `view`, `accept`, `decline`, `sync_conflict`, `offline_write`) while keeping existing values (`created`, `updated`, `status_changed`, `line_changed`, `version_published`, `attachment_added`, `attachment_removed`).  
    - Schema: `backend/src/db/schema.ts`.  
    - Migration: `backend/drizzle/0006_quote_activity_types_extend.sql` alters the existing enum in PostgreSQL.
  - Introduced a dedicated activity repository helper for consistent logging:  
    - `backend/src/repositories/activities.repo.ts` exposes `logActivityTx` (transactional) and `logActivity` (standalone) helpers.  
    - Re-exported via `backend/src/repositories/index.ts` for use by routes and services.
  - Wired activity logging into the main quote flows:  
    - **Quote creation** (`createQuote` in `backend/src/repositories/quotes.repo.ts`): logs a `created` activity with the generated quote number and initial version id.  
    - **Quote metadata/status updates** (`updateMeta` in `quotes.repo.ts`): runs inside a transaction, loads the current quote, applies the patch, and logs:  
      - An `updated` activity with the full patch payload.  
      - A `status_changed` activity when `status` changes, including `{ from, to }`.  
      - A specialized activity for the resulting status: `send` when moving to `sent`, `accept` when moving to `accepted`, `decline` when moving to `declined`.  
      - All activities reference the current version id when available.
    - **Quote view** (`GET /v1/quotes/:quoteId` in `backend/src/routes/v1/quotes.ts`): after successfully loading the aggregate, logs a `view` activity with the current version id and a small `source` metadata flag.  
    - **Version publish** (`POST /v1/quotes/:quoteId/versions/:versionId/publish`): after updating statuses and current version via `setCurrentVersionTx`, logs `version_published` with quote and version ids.  
    - **Line create / update / delete** (`createLineTx`, `updateLineTx`, `softDeleteLineTx` via the respective routes in `v1/quotes.ts`): each line mutation is wrapped in a transaction that logs a `line_changed` activity with `operation` (`create`/`update`/`delete`) and `lineId` metadata.
  - Implemented a backend-only **version diff engine** to support VersionDiff UI:  
    - New service `backend/src/services/version-diff.service.ts` exposes `computeVersionDiffTx(tx, fromVersionId, toVersionId)`.  
    - For each pair of versions, it loads the two `quote_versions` plus their non-deleted `quote_lines` ordered by `position` and returns a structured diff:  
      - **Meta diff** (`meta`): compares `label`, `validityDate`, `depositPct`, `currencyCode` and emits entries `{ field, before, after }` when values differ (dates are normalized to ISO strings).  
      - **Line diff** (`lines`): walks both line lists in order, emitting `added`, `removed` or `changed` entries with snapshots of relevant fields (position, label, description, quantity, unitPriceCents, taxRatePct, net/tax/gross amounts).  
    - Exposed via a new endpoint on the quotes router:  
      - `GET /v1/quotes/:quoteId/versions/:fromVersionId/diff/:toVersionId` validates that both versions belong to the given quote and are not deleted, then returns `{ data: VersionDiff }` where `VersionDiff = { meta: VersionMetaDiff[]; lines: VersionLineDiff[] }`.
  - **Content blocks & UI:** the current backend schema does not yet define separate content blocks for versions, so the diff engine focuses on version meta fields and lines. The API shape is designed so that content-block diffs and a visual `VersionDiff` component can be added later in a dedicated frontend/UX phase without breaking changes.

- **How to test (backend, manual API checks):**
  1. **Apply the enum migration:**  
     - Run the Drizzle migrations or apply `backend/drizzle/0006_quote_activity_types_extend.sql` to your Postgres database so that `quote_activity_type` includes the new values.
  2. **Create a quote and verify `created` activity:**  
     - `POST /v1/quotes` with a valid payload (customer_name, title, notes?, currency, lines).  
     - Confirm `201` and a returned quote aggregate.  
     - Inspect the `activities` table: you should see a `created` entry with the new quote id, current version id, and `metadata.number` set to the quote number.
  3. **Update metadata and status, verify `updated` / `status_changed` / `send` / `accept` / `decline`:**  
     - `PATCH /v1/quotes/:quoteId` with a payload that changes only title/notes: verify a single `updated` activity with the `patch` payload in metadata.  
     - Then patch `status` from `draft` → `sent`: expect additional `status_changed` and `send` activities with `{ from: 'draft', to: 'sent' }`.  
     - Similarly patch to `accepted` and `declined` in turn and confirm `accept` / `decline` activities are logged with the correct `from`/`to`.
  4. **View a quote and verify `view` activity:**  
     - `GET /v1/quotes/:quoteId` for an existing quote.  
     - Confirm `200` and that a `view` activity is appended with the current version id and `metadata.source = 'v1/quotes/:quoteId'`.
  5. **Publish a version and verify `version_published`:**  
     - Use `POST /v1/quotes/:quoteId/versions` to create an additional version for the same quote.  
     - `POST /v1/quotes/:quoteId/versions/:versionId/publish` on that version.  
     - Confirm the quote’s `currentVersionId` changes and a `version_published` activity is logged referencing the new version id.
  6. **Create / update / delete lines and verify `line_changed`:**  
     - `POST /v1/quotes/:quoteId/versions/:versionId/lines` → expect a `line_changed` activity with `operation: 'create'` and the new `lineId`.  
     - `PATCH /v1/quotes/:quoteId/versions/:versionId/lines/:lineId` → expect `line_changed` with `operation: 'update'`.  
     - `DELETE /v1/quotes/:quoteId/versions/:versionId/lines/:lineId` → expect `line_changed` with `operation: 'delete'`.
  7. **Compute a version diff and inspect response:**  
     - Ensure you have a quote with at least two versions that differ (e.g. different `label`, `validityDate`, `depositPct`, currency, or line set).  
     - Call `GET /v1/quotes/:quoteId/versions/:fromVersionId/diff/:toVersionId`.  
     - Confirm the response contains:  
       - `data.meta` entries for each changed meta field, with `before`/`after` values.  
       - `data.lines` entries marking added/removed lines and `changed` entries when line labels, quantities, unit price, tax, or totals differ.

---

### Ticket 12 – Testing & Validation ✅ (Backend completed 18 Nov 2025)
- **Summary:**  
  Strengthen reliability of the quote backend through targeted automated tests around validators, diff logic, and the `/v1/quotes` API, without changing runtime behavior.
- **Scope (backend phase):**  
  - Unit-style tests for request validators (quotes, lines, versions).  
  - Unit-style tests for the version diff service.  
  - Integration tests for core `/v1/quotes` flows, including the new diff endpoint.  
  - Additional assertions that activity logging wiring (view, publish, line create/update/delete) does not break existing responses.  
  - **Out of scope in this backend-only pass:** PDF pipeline tests, offline/outbox tests, and frontend/UI smoke tests (no corresponding code exists in this backend package yet).
- **Acceptance Criteria (backend):**  
  - `npm test` in `backend/` passes with all backend suites green.  
  - Validators reject clearly invalid payloads and queries with `HttpError`.  
  - Version diff service correctly reports meta changes and line added/removed/changed cases.  
  - `/v1/quotes` routes continue to behave as before (status codes and payloads unchanged) while calling the new diff and activity helpers as expected.
- **Dependencies/Risks:** relies on Tickets 3 and 11 for `/v1/quotes` domain and diff/activity plumbing.

- **Implementation Notes (backend tests):**
  - Confirmed Vitest backend configuration:  
    - `backend/vitest.config.ts` runs Node-environment tests under `tests/**/*.test.ts` with no PostCSS or Vite frontend coupling.
  - Added **validator tests** to lock in request/DTO parsing behavior:  
    - `backend/tests/validators/quotes.validators.test.ts` covers:  
      - `parseQuoteCreate` happy-path payloads (valid `customer_name`, `title`, `currency`, and at least one line).  
      - Rejection of structurally invalid create payloads (empty strings, unsupported currency, missing lines) as `HttpError`.  
      - `parseQuoteUpdate` for valid partial updates including `valid_until` as ISO string and disallowing invalid dates.  
      - `parseQuoteListQuery` for `status`, `q`, `from`, `to`, `limit`, `offset` including invalid `status` tokens raising `HttpError`.  
    - `backend/tests/validators/lines.validators.test.ts` covers:  
      - `parseLineCreate` with valid quantities, tax rate bps, and optional `position`.  
      - Rejection of invalid line create payloads (e.g. non-positive `qty`).  
      - `parseLineUpdate` accepting partial patches and rejecting completely empty objects.  
    - `backend/tests/validators/versions.validators.test.ts` covers:  
      - `parseVersionCreate` with valid `quote_id` / `from_version_id` UUIDs.  
      - Rejection of malformed UUIDs as `HttpError`.
  - Added **version diff service tests** around the newly introduced diff logic:  
    - `backend/tests/services/version-diff.service.test.ts` uses a lightweight in-memory transaction mock over `quoteVersions` and `quoteLines` to exercise `computeVersionDiffTx`:  
      - Meta diffs: verifies changes for `label`, `validityDate`, `depositPct`, and `currencyCode` are surfaced as `{ field, before, after }` with dates normalised to ISO strings.  
      - Line diffs – `changed`: same index, different snapshots (label, description, quantity, unit price, totals) produce a single `changed` entry with `before`/`after`.  
      - Line diffs – `added` / `removed`: tests when lines exist only in the target or source version respectively.  
      - Error handling: ensures a missing version id results in a `HttpError('version_not_found')` as in the implementation.
  - Extended **quotes routes integration tests** while preserving all existing behavior:  
    - `backend/tests/routes/quotes.routes.test.ts` continues to spin up an Express app with the real `/v1/quotes` router and uses `supertest`, but now also:  
      - Mocks `activities.repo` (`logActivity`, `logActivityTx`) and `version-diff.service` (`computeVersionDiffTx`).  
      - In `GET /v1/quotes/:quoteId` test, uses a non-null `currentVersion` to assert a `view` activity is logged with the correct `quoteId`, `versionId`, and `source` metadata, while keeping the response body identical.  
      - Adds a dedicated test for `GET /v1/quotes/:quoteId/versions/:fromVersionId/diff/:toVersionId` that:  
        - Provides a fake diff object,  
        - Asserts HTTP `200` and `{ data: diff }` response,  
        - Verifies `computeVersionDiffTx` receives the transaction object and version ids in the right order.  
      - Extends the publish test (`POST /v1/quotes/:quoteId/versions/:versionId/publish`) to assert that `logActivityTx` is called with:  
        - `type: 'version_published'`,  
        - `quoteId`, `versionId`,  
        - `metadata: { source: 'v1/quotes:publish' }`,  
        - Without changing the `204` status or payload.  
      - Enhances the lines CRUD test (`POST`/`PATCH`/`DELETE /v1/quotes/:quoteId/versions/:versionId/lines/:lineId`) to assert that for each operation the router calls `logActivityTx` with:  
        - `type: 'line_changed'`,  
        - Appropriate `metadata.operation` (`create` / `update` / `delete`) and matching `lineId`.  
    - Existing expectations around repository calls (e.g. `createQuote`, `list`, `softDelete`, `restore`, `createVersionWithLinesTx`, `duplicateVersionTx`, `setCurrentVersionTx`, `createLineTx`, `updateLineTx`, `softDeleteLineTx`) and HTTP responses were preserved unchanged.
  - Kept tests **purely backend**: no new runtime code paths, no reliance on a real Postgres instance (the `db/client` module is fully mocked in route tests), and no new HTTP endpoints were added in this ticket.

- **Files touched (backend tests):**
  - `backend/vitest.config.ts` (read/relied on, unchanged).  
  - `backend/tests/totals.service.test.ts` (existing, unchanged).  
  - `backend/tests/validators/quotes.validators.test.ts` (**new**).  
  - `backend/tests/validators/lines.validators.test.ts` (**new**).  
  - `backend/tests/validators/versions.validators.test.ts` (**new**).  
  - `backend/tests/services/version-diff.service.test.ts` (**new**).  
  - `backend/tests/routes/quotes.routes.test.ts` (extended to mock `activities.repo` and `version-diff.service` and assert logging/diff calls).  
  - Runtime backend files such as `backend/src/services/version-diff.service.ts`, `backend/src/repositories/activities.repo.ts`, `backend/src/repositories/quotes.repo.ts`, and `backend/src/routes/v1/quotes.ts` are **read-only** in this ticket: no behavioral changes were introduced, only additional tests.

- **How to test (backend):**
  1. From the `backend/` directory, run the full suite:  
     - `npm test`  
     - Expected: Vitest reports all 6 backend test files passing (totals service, validators, diff service, quotes routes) with zero failures.
  2. To focus on validators only:  
     - `npx vitest run tests/validators/*.test.ts`  
     - Confirms request validation errors surface as `HttpError` and that list query parsing behaves as documented.
  3. To focus on the diff engine:  
     - `npx vitest run tests/services/version-diff.service.test.ts`  
     - Confirms meta and line diffs match expectations for changed/added/removed cases and that missing versions yield `version_not_found` errors.
  4. To focus on `/v1/quotes` routing and activity wiring:  
     - `npx vitest run tests/routes/quotes.routes.test.ts`  
     - Confirms existing flows still return the same HTTP responses while exercising:  
       - `GET /v1/quotes/:quoteId` view logging,  
       - `POST /v1/quotes/:quoteId/versions/:versionId/publish` version publish logging,  
       - Line create/update/delete logging,  
       - The version diff endpoint calling `computeVersionDiffTx`.

---
