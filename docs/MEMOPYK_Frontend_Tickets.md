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
  - [x] Step 10 – Delivery verification against brief checklist.

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
  - **Step 10:** Contrôle final réalisé contre `MEMOPYK_Frontend_Build_Brief.md` : vérification des scripts npm (`dev`, `build`, `preview`, `lint`), de la table de routes (`/`, `/admin/*`, `/devis/:id`, `/p/:token`), de la palette Tailwind MEMOPYK, de la stack (Tailwind + shadcn/ui + React Query + React Hook Form + Zod), du manifest PWA + `service-worker.js`, et de `.env.example` avec les variables requises.

## Ticket 15 — Admin Quote PDF Generation & Download

### Summary
Implement admin-side PDF generation from a quote version, including request, job polling, download once ready, and UI feedback.

### Scope
- Trigger PDF generation for a specific version.
- Poll job status until "ready" or "failed".
- Display job progress and final download link.
- Handle errors and retry.
- Use the existing async PDF API routes.

### Acceptance Criteria
- Button to generate PDF from the current version.
- While pending: visible "pending" state.
- When ready: show download/open link.
- When failed: show error and retry option.
- No blocking or page reload needed; React Query handles state.

### Implementation Notes
#### Step 1 — Basic PDF panel & polling (COMPLETED)
- Added QuotePdfPanel with generation button.
- Added useRequestQuotePdf + useQuotePdfJob hooks.
- Polling every 3s while pending.
- Shows download button when job is ready.
- Error state + retry.

#### Step 2 — PDF panel refinements (COMPLETED)
- Extended the PDF job type to include a `generatedAt` timestamp and wired it through the React Query hooks  
  (`frontend/src/lib/types/quotes.ts`, `frontend/src/lib/useQuotePdf.ts`, `frontend/src/lib/api.ts`).
- Updated `QuotePdfPanel` to:
  - Prefer the backend `generatedAt` timestamp (fallback to React Query's `dataUpdatedAt`) and display  
    **"PDF prêt – généré le JJ/MM/AAAA à HH:MM"** when available.
  - Use clearer French copy for all states: no PDF yet, generation in progress, ready, failed, or missing version.
  - Keep a primary **"Générer le PDF"** action and show a **"Télécharger le PDF"** button when `status === 'ready'` and a URL exists.
  - Surface a friendly red error banner when generation or polling fails, with a simple **"Réessayer"** action that either refetches the job or restarts generation.  
  (`frontend/src/pages/admin/quotes/QuotePdfPanel.tsx`)

#### Step 2b — Acceptance badge & sidebar metadata (COMPLETED)
- Added acceptance metadata to the quote aggregate (`acceptanceMode`, `acceptedAt`) and mapped both camelCase and snake_case backend fields into the frontend type  
  (`frontend/src/lib/types/quotes.ts`, `frontend/src/lib/api.ts`).
- Enhanced the admin quote detail page to:
  - Show a small badge next to the status in the header:
    - **"En attente"** when the quote is not accepted and has no acceptance mode.
    - **"Accepté en ligne"** when `status === 'accepted'` and `acceptanceMode === 'online'`.
    - **"Accepté (papier)"** when `status === 'accepted'` and `acceptanceMode === 'paper'`.
  - Add an info block in the details grid with:
    - **"Mode d’acceptation"**: "En ligne", "Sur papier", or "—".
    - **"Accepté le"**: formatted acceptance timestamp when available, or "—" otherwise.  
  (`frontend/src/pages/admin/quotes/Detail.tsx`)

#### Step 3 — Rappel "Dernière génération PDF" en récap (COMPLETED)
- Utilisé la métadonnée `pdf_generated_at` de la version courante pour exposer, côté admin, un rappel simple de la dernière génération du PDF.  
  (`frontend/src/lib/types/quotes.ts`, `frontend/src/lib/api.ts`)
- Ajouté une ligne **"Dernière génération PDF"** dans la grille d’infos du détail de devis, alignée visuellement sur les autres champs (client, dates, devise, acceptation) et affichant la date formatée lorsque disponible (sinon `—`).  
  (`frontend/src/pages/admin/quotes/Detail.tsx`)

## Ticket 16 – Public Quote View & Acceptance (Web Client)

### Summary
Expose a secure public view of a quote (`/p/:token`) allowing clients to consulter le devis and, lorsqu’il est actif, l’accepter en ligne avec confirmation des CGV.

### Scope
- Afficher le devis public à partir d’un token, avec option de protection par PIN à 6 chiffres.
- Afficher la version courante (lignes, quantités, montants TTC) et les informations principales (client, dates, devise).
- Permettre l’acceptation en ligne via formulaire (nom + case CGV), en s’appuyant sur l’API publique.
- Gérer les états d’erreur et les devis déjà acceptés.

### Acceptance Criteria
- `/p/:token` affiche un écran client clair avec entête MEMOPYK, référence du devis, et récapitulatif.
- Si un PIN est requis : formulaire PIN → erreur en cas de code incorrect, accès au devis en cas de code valide.
- La version courante affiche les lignes et un total TTC cohérent avec l’admin.
- Le formulaire d’acceptation en ligne requiert nom + case CGV avant envoi.
- Après acceptation réussie, un message de confirmation est visible et le formulaire n’est plus proposé.

### Implementation Notes
#### Step 1 — Vue publique basique & acceptation en ligne (COMPLETED)
- Créé les hooks React Query pour le devis public et l’acceptation :
  - `usePublicQuote(token, pin?)` pour récupérer le devis courant avec gestion de l’option PIN.
  - `useAcceptQuoteOnline(token)` pour soumettre l’acceptation en ligne et invalider le cache.
  (`frontend/src/lib/hooks/usePublicQuote.ts`, `frontend/src/lib/api.ts`, `frontend/src/lib/types/quotes.ts`)
- Ajouté les endpoints frontend pour le devis public et l’acceptation :
  - `getPublicQuote(token, pin?)` → `GET /api/public/:token?pin=…`
  - `acceptQuoteOnline(token, payload)` → `POST /api/public/:token/accept`.
- Géré les principaux états : lien invalide, 404 (devis introuvable), 403 (PIN requis / incorrect), erreur réseau générique, succès.

#### Step 2 — Layout public, bloc CGV & copy (COMPLETED)
- Remplacé le placeholder par une vue publique complète dans `PublicQuoteViewPage` :
  (`frontend/src/pages/public/PublicQuoteViewPage.tsx`)
  - Entête "Espace client sécurisé" avec titre et référence du devis.
  - Bloc "Résumé du projet" (client, dates, devise) aligné sur les champs de l’agrégat.
  - Bloc "Détail du devis" reprenant la table de lignes (position, description, quantité, unitaire, TVA %, total TTC) + bandeau de total TTC.
- Intégré la gestion du PIN et des erreurs côté UI :
  - Formulaire PIN 6 chiffres avec validation côté frontend, message d’erreur en cas de 403.
  - Messagerie claire pour les liens expirés (404) et erreurs réseau, avec bouton "Réessayer".
- Raffiné la section d’acceptation en ligne :
  - Formulaire "Nom et prénom" + case à cocher CGV, avec message d’erreur si le nom ou la case manquent.
  - Bouton principal "Accepter le devis en ligne" avec état "Validation en cours…".
  - Messages d’erreur techniques en cas d’échec de l’API.
  - Lorsque le devis est déjà accepté, affichage d’un message de confirmation et texte expliquant que le formulaire n’est plus disponible.
- Ajouté un bloc CGV / mentions légales en bas de page :
  - Texte de rappel que le résumé de la page ne remplace pas les CGV complètes.
  - Indication que la version détaillée des CGV est fournie avec le devis et disponible sur demande.

#### Step 3 — Reçu d’acceptation public (COMPLETED)
- Étendu l’agrégat de devis avec le nom saisi lors de l’acceptation (`acceptedByName`) et mappé les variantes camelCase/snake_case renvoyées par l’API.  
  (`frontend/src/lib/types/quotes.ts`, `frontend/src/lib/api.ts`)
- Remplacé le simple bandeau de confirmation par un véritable **"Reçu d’acceptation"** dans la vue publique :
  - Carte verte en tête de page affichant un résumé lisible de l’acceptation (en ligne / papier).
  - Détail structuré : **mode d’acceptation**, **date d’acceptation**, et **nom de la personne ayant accepté** lorsque disponible.
  - S’appuie sur les métadonnées `status`, `acceptanceMode`, `acceptedAt` et `acceptedByName` exposées par le backend.  
  (`frontend/src/pages/public/PublicQuoteViewPage.tsx`)

#### Step 4 — Téléchargement public du PDF (COMPLETED)
- Enrichi l’agrégat de version avec les métadonnées de PDF (`pdf_url`, `pdf_generated_at`) et mappé les champs `pdfUrl`/`pdfGeneratedAt` renvoyés par l’API de version.  
  (`frontend/src/lib/types/quotes.ts`, `frontend/src/lib/api.ts`)
- Ajouté un bloc dédié dans la vue publique permettant au client de récupérer le devis en PDF :
  - Si un PDF est déjà attaché à la version (`pdf_url` ou URL de job prêt), le bouton "Télécharger le PDF" ouvre directement le document.
  - Sinon, un clic sur "Préparer le PDF" déclenche la création asynchrone via le même pipeline que l’admin (hooks `useRequestQuotePdf` / `useQuotePdfJob`), puis permet le téléchargement une fois le job terminé.
  - Un petit texte indique la date/heure de dernière génération lorsque disponible, ainsi qu’un message d’erreur convivial en cas d’échec ponctuel.  
  (`frontend/src/pages/public/PublicQuoteViewPage.tsx`, `frontend/src/lib/useQuotePdf.ts`)

#### Step 5 — Liste des versions (lecture seule) (COMPLETED)
- Étendu la forme de l’agrégat public pour accepter, lorsque l’API le fournit, une liste de versions associées au devis (`versions: QuoteVersionSummary[]`).  
  (`frontend/src/lib/types/quotes.ts`, `frontend/src/lib/api.ts`)
- Ajouté un bloc "Voir les autres options" dans la vue publique :
  - Met en avant la version courante déjà affichée dans la section "Détail du devis".
  - Liste les autres versions comme cartes purement informatives (numéro de version, label, date de création, statut courant/verrouillé).
  - Aucune action de changement de version côté client : il n’y a **pas** de bouton pour "sélectionner" ou "basculer" vers une autre version.
- Clarifié le comportement d’acceptation :
  - Seul l’admin peut changer la version active via l’interface d’administration.
  - L’acceptation en ligne depuis la vue publique s’applique **uniquement** à la version actuellement active du devis telle que publiée par l’admin.
  - Le texte de la section de validation le précise explicitement afin d’éviter toute ambiguïté côté client.  
  (`frontend/src/pages/public/PublicQuoteViewPage.tsx`)

#### Step 6 — Composant "Prochaines étapes" (COMPLETED)
- Créé un composant réutilisable `Steps` pour afficher une liste verticale d’étapes numérotées avec titre et sous-texte optionnel, stylé selon la charte MEMOPYK (pastilles arrondies en bleu ciel, titres en bleu foncé, texte en bleu-gris).  
  (`frontend/src/components/common/Steps.tsx`, `frontend/src/lib/utils.ts`)
- Intégré ce composant dans la vue publique du devis comme section "Prochaines étapes", détaillant le déroulé après la validation (échanges pratiques, préparation des médias, organisation de la collecte/montage).  
  (`frontend/src/pages/public/PublicQuoteViewPage.tsx`)

#### Step 7 — Intégration du lien public sécurisé (Ticket 6 – Step 5, COMPLETED)
- Aligné la vue publique sur les nouveaux endpoints sécurisés du backend (Ticket 6) :  
  - `GET /v1/public/quotes/:token` → récupération du devis public via un token opaque.  
  - `POST /v1/public/quotes/:token/pin` → vérification du code PIN à 6 chiffres.  
  - `POST /v1/public/quotes/:token/accept` → acceptation en ligne avec payload `{ full_name, accept_cgv }` et renvoi du DTO public.  
- Côté frontend, la logique est désormais encapsulée dans des hooks dédiés TanStack Query :  
  - `usePublicQuoteGet(token)` (exporté aussi en alias `usePublicQuote(token)` pour compatibilité) :  
    - Appelle `getPublicQuote(token)` qui consomme `GET /v1/public/quotes/:token`.  
    - Expose un agrégat de type `QuoteAggregate` dérivé du DTO `QuotePublicView` (nombre, client, statut, métadonnées d’acceptation, version courante + lignes).  
    - Gère les erreurs HTTP structurées remontées par l’API (`public_link_not_found`, `pin_required`, `pin_locked`, etc.).  
  - `usePublicPinSubmit(token)` :  
    - Wrap `submitPublicPin(token, pin)` sur `POST /v1/public/quotes/:token/pin`.  
    - Sur succès (`{ data: { pin_valid: true } }`), invalide la query `['public-quote', token]` pour rafraîchir la vue.  
    - Sur erreur, expose les codes `pin_invalid`, `pin_locked`, `pin_not_required`, `public_link_not_found` et les détails (`remaining_attempts`, `unlock_at`).  
  - `usePublicAcceptQuote(token)` (exporté aussi via `useAcceptQuoteOnline(token)`) :  
    - Envoie le payload aligné sur le backend :  
      - `OnlineAcceptancePayload = { full_name: string; accept_cgv: boolean }`.  
    - Utilise `acceptQuoteOnline(token, payload)` branché sur `POST /v1/public/quotes/:token/accept`.  
    - Invalide `['public-quote', token]` en cas de succès afin de réafficher le reçu d’acceptation à partir du DTO public mis à jour.  
- La page `PublicQuoteViewPage` a été adaptée pour consommer ces nouveaux hooks sans changer la structure visuelle :  
  - **Chargement initial** :  
    - Utilise `usePublicQuote(token)` pour charger le devis ou identifier les erreurs `404 public_link_not_found` et `403 pin_required/pin_locked`.  
  - **Écran PIN** (quand `403 pin_required` et aucun devis chargé) :  
    - Affiche un formulaire PIN 6 chiffres identique à la version précédente.  
    - Soumet via `usePublicPinSubmit(token)` au lieu de passer le PIN directement dans l’URL.  
    - Affiche des messages plus précis selon le code d’erreur backend :  
      - `pin_invalid` + compteur de tentatives restantes.  
      - `pin_locked` + horodatage de déverrouillage (`details.unlock_at`) lorsque fourni.  
      - `pin_not_required` (cas défensif) et `public_link_not_found`.  
  - **Acceptation en ligne** :  
    - Le formulaire continue d’imposer nom + case CGV côté frontend.  
    - Le payload envoyé à `useAcceptQuoteOnline(token)` utilise désormais `{ full_name, accept_cgv }`, aligné sur `parsePublicAcceptance`.  
    - Les erreurs backend sont traduites en messages lisibles :  
      - `cgv_not_accepted` / `validation_error` → rappel sur le nom et la case CGV.  
      - `already_accepted` → message indiquant que le devis est déjà accepté.  
      - `pin_required` / `pin_locked` → rappel de la protection PIN et/ou du verrouillage temporaire.  
      - `public_link_not_found` → message cohérent avec l’écran "Devis introuvable".  
    - En cas de succès, la section "Reçu d’acceptation" est rafraîchie via l’agrégat public retourné.  
- Les tests `PublicQuoteViewPage.test.tsx` ont été étendus pour couvrir au moins :  
  - La présence de l’écran PIN lorsque le hook public renvoie une erreur `403 pin_required`.  
  - Le fait que la soumission du formulaire d’acceptation appelle la mutation avec `{ full_name, accept_cgv }`.  
  - La compatibilité des mocks avec le nouveau hook `usePublicPinSubmit`.  
- Les anciens endpoints `/api/public/:token` et `/api/public/:token/accept` ne sont plus utilisés côté frontend : toute la vue publique passe désormais par les routes versionnées `/v1/public/quotes` et le DTO `QuotePublicView`.

## Ticket 19 — Admin version history polishing

### Summary
Affiner l’historique des versions côté admin pour rendre la barre de versions plus lisible, en mettant mieux en avant la version active et les métadonnées clés (statut, date de création, verrouillage).

### Scope
- Garder le comportement existant de liste / création / publication de version côté admin.
- Améliorer la présentation visuelle des pastilles de version dans `QuoteVersionsBar`.
- Afficher pour chaque version : numéro, label éventuel, date de création, statut (brouillon / actif / archivé) et indicateur de verrouillage lorsque pertinent.

### Acceptance Criteria
- La version active est clairement identifiable visuellement (couleur, pilule de statut "Actif").
- Chaque pastille de version affiche au minimum le numéro de version et, lorsque disponible, le label saisi.
- La date de création de la version est visible sur les écrans ≥ `sm` (copie du type "Créé le JJ/MM/AAAA").
- Les versions verrouillées affichent un badge "Verrouillé" lorsqu’elles ne sont pas actives.
- Les états de chargement et d’erreur existants sont conservés.

### Implementation Notes
#### Step 1 — Affinage de la barre de versions (COMPLETED)
- Mis à jour le composant `QuoteVersionsBar` pour transformer chaque pastille de version en puce multi-lignes :
  - Colonne gauche : numéro de version (`V1`, `V2`, …) et label éventuel tronqué si trop long.
  - Colonne droite : date de création ("Créé le …") sur les écrans `sm` et plus, + pilule de statut.
- Mappé les statuts techniques vers des libellés lisibles :
  - `current` → **"Actif"**
  - `archived` → **"Archivé"**
  - `draft` → **"Brouillon"**
- Conservé la mise en avant visuelle de la version active : fond orange MEMOPYK, texte blanc, puce de statut claire.
- Affiché un badge supplémentaire **"Verrouillé"** pour les versions `is_locked` qui ne sont pas actives, en bleu foncé discret.
- Préservé le wiring existant des hooks (`useQuoteVersions`, `useCreateQuoteVersion`, `usePublishQuoteVersion`) et la gestion d’erreur locale/remote.  
  (`frontend/src/pages/admin/quotes/QuoteVersionsBar.tsx`)

## Ticket 20 — Quote editor UX foundation

### Summary
Mettre en place la fondation UX de l’éditeur de devis accessible via `/devis/:id`, en s’appuyant sur l’agrégat de devis existant. L’objectif est de fournir un écran structuré, cohérent avec le panneau admin et la vue publique, prêt à accueillir les futures fonctionnalités d’édition (lignes, blocs éditoriaux, notes).

### Scope
- Utiliser le hook `useQuote(id)` et l’API d’agrégat pour charger les données du devis ciblé.
- Gérer les principaux états de chargement et d’erreur (loading, 404, hors ligne, erreur générique).
- Structurer la page en trois zones principales :
  - En-tête MEMOPYK avec numéro de devis, titre, client et statut/acceptation.
  - Colonne de gauche : résumé du devis (métadonnées) et synthèse de la version courante.
  - Colonne de droite : canvas d’édition futur sous forme de composant `ComingSoon` avec actions désactivées.
- Ne pas implémenter encore la logique d’édition (pas de formulaires ni de mutations), uniquement la fondation UX et le chargement des données.

### Acceptance Criteria
- La route `/devis/:id` charge le devis via `useQuote(id)` et reflète les états :
  - **Chargement** : message central « Chargement de l’éditeur de devis… ».
  - **404** : écran "Devis introuvable" avec explication et boutons **"Réessayer"** + **"Retour à la liste des devis"**.
  - **Erreur générique / hors ligne** : texte différencié selon la connectivité, et mêmes actions (réessayer / retour liste).
- Lorsque les données sont disponibles :
  - L’en-tête affiche le numéro de devis, le titre (ou "Sans titre"), le nom du client, le statut (Brouillon / Envoyé / Accepté / Refusé / Archivé) et un rappel du mode d’acceptation + date d’acceptation.
  - Un bouton "Voir la fiche admin" renvoie vers `/admin/quotes/:quoteId`.
  - Deux boutons supplémentaires sont présents mais désactivés : "Voir la version PDF" et "Sauvegarder (à venir)".
  - La colonne de gauche affiche un bloc "Résumé du devis" (client, dates, devise) et un bloc "Version courante" (titre de version, total TTC, nombre de lignes, texte explicatif), plus un encart "Plan de l’éditeur" listant les futures sections.
  - La colonne de droite contient un composant `ComingSoon` dédié à la construction de devis, avec texte explicatif et actions désactivées **"Ajouter une ligne"** et **"Ajouter un bloc de texte"**.
- Aucune action d’édition réelle n’est encore possible dans cette étape.

### Implementation Notes
#### Step 1 — Shell d’éditeur data-aware (COMPLETED)
- Remplacé le placeholder statique de `QuoteEditorPage` par un écran data-aware connectant `/devis/:id` à l’agrégat de devis :
  - Utilisation de `useQuote(id)` pour récupérer le devis et gérer les états `isLoading` / `isError`.
  - Gestion dédiée du cas 404 (devis introuvable) et d’un cas générique avec détection hors ligne.
- Structuré la vue principale en :
  - En-tête MEMOPYK avec :
    - Label "Éditeur de devis".
    - Numéro de devis en titre principal.
    - Ligne de sous-titre avec titre ou "Sans titre" + nom du client.
    - Ligne de métadonnées (statut lisible, mode d’acceptation, date d’acceptation).  
    - Groupe d’actions : **"Voir la fiche admin"** (lien vers `/admin/quotes/:quoteId`), **"Voir la version PDF"** (désactivé) et **"Sauvegarder (à venir)"** (désactivé).
  - Colonne de gauche (aside) :
    - Carte **"Résumé du devis"** (client, créé le, valide jusqu’au, devise).
    - Carte **"Version courante"** avec :
      - Titre de version (`V{version_number}` + label éventuel).
      - Total TTC et nombre de lignes lorsque la version courante existe.
      - Texte explicatif si aucune version active n’est encore disponible.
      - Petit paragraphe décrivant que les lignes/blocs éditoriaux seront éditables ici avec autosave et historique.
    - Encart "Plan de l’éditeur" listant les futures sections (métadonnées, versions, lignes, blocs éditoriaux, notes internes).
  - Colonne de droite (main) : composant `ComingSoon` avec :
    - Titre "Construction de devis en direct".
    - Description expliquant le futur éditeur interactif et la synchronisation offline.
    - Deux boutons d’action désactivés : **"Ajouter une ligne (à venir)"** et **"Ajouter un bloc de texte (à venir)"**.
- Aucune mutation ou logique d’édition n’est encore implémentée ; le ticket pose uniquement la fondation UX et les états de chargement/erreur.  
  (`frontend/src/pages/quotes/QuoteEditorPage.tsx`, `frontend/src/lib/hooks/useQuotes.ts`, `frontend/src/lib/format.ts`, `frontend/src/components/ComingSoon.tsx`)

## Ticket 21 — Editable Quote Sections (Phase 1 / Metadata panel)

### Summary
Première phase d’édition dans l’éditeur de devis : permettre la modification des métadonnées principales (nom du client, titre, notes internes) directement depuis `/devis/:id`, tout en conservant la date de validité en lecture seule pour l’instant.

### Scope
- Étendre `QuoteEditorPage` pour afficher un panneau d’édition des métadonnées dans la colonne de gauche.
- Champs éditables côté frontend :
  - Nom du client (`customer_name`).
  - Titre du devis (`title`).
  - Notes internes (stockées côté backend dans `summary`, exposées via `quote.summary` et envoyées via `notes` dans le PATCH).
- Ne **pas** toucher à la date de validité dans cette phase :
  - Afficher `validity_date` (mappée depuis `validUntil`) en lecture seule.
  - Ajouter une aide indiquant que la date de validité n’est pas encore modifiable depuis l’éditeur.
- Conserver la devise en lecture seule.
- Utiliser `useUpdateQuote(quoteId)` pour envoyer les PATCHs vers `/v1/quotes/:id` avec le payload minimal supporté par l’API (`title`, `customer_name`, `notes`).
- Désactiver l’édition lorsque le devis est **accepté** ou **archivé**.

### Acceptance Criteria
- Dans `/devis/:id`, la colonne de gauche contient un panneau "Informations principales" avec :
  - Un champ **Nom du client** éditable.
  - Un champ **Titre du devis** éditable.
  - Une zone de texte **Notes internes (non visibles par le client)** éditable.
  - Une section récapitulant :
    - **Créé le** (formaté via `formatISO`).
    - **Valide jusqu’au** (formaté via `formatISO`, affiché en lecture seule).
    - Un texte d’aide expliquant que la date de validité n’est pas encore modifiable dans l’éditeur.
    - La **Devise** en lecture seule.
- Un bouton **"Enregistrer"** dans l’entête :
  - Active uniquement lorsqu’il y a des modifications par rapport aux valeurs initiales et que le devis n’est ni accepté ni archivé.
  - Passe à **"Enregistrement…"** pendant le `useUpdateQuote.isPending`.
  - Est désactivé lorsque le devis est accepté/archivé.
- Lors du clic sur **"Enregistrer"** :
  - Si le titre ou le nom du client sont vides → affiche une erreur inline expliquant que ces champs sont obligatoires.
  - Le payload envoyé à `/v1/quotes/:id` ne contient **que** les champs modifiés parmi `title`, `customer_name`, `notes`.
  - Aucun champ de date de validité n’est envoyé (pas de `validUntil` / `valid_until`).
  - En cas d’erreur backend (HTTP 4xx/5xx), un bandeau d’erreur rouge s’affiche dans le panneau de métadonnées.
- Lorsque le devis est en statut `accepted` ou `archived` :
  - Les champs de métadonnées sont affichés mais désactivés.
  - Le bouton **"Enregistrer"** est désactivé.

### Implementation Notes
#### Step 1 — Panneau de métadonnées éditable (COMPLETED)
- Ajouté un panneau "Informations principales" dans la colonne de gauche de `QuoteEditorPage` :
  - Utilise `useState` pour gérer les entrées locales : `customerNameInput`, `titleInput`, `notesInput`.
  - Initialise ces valeurs à partir de l’agrégat de devis (`quote.customer_name`, `quote.title`, `quote.summary`) via un `useEffect` qui se déclenche lorsque le devis est chargé.
  - Calcule un booléen `hasChanges` pour activer/désactiver le bouton **"Enregistrer"** seulement s’il y a une différence par rapport aux valeurs initiales.
- Intégré `useUpdateQuote(id)` pour envoyer un payload minimal :
  - Les champs `title`, `customer_name`, `notes` ne sont inclus que s’ils ont réellement changé.
  - N’envoie **jamais** de champ de date de validité, conformément à la décision de phase 1.
- Gestion des erreurs UX :
  - Validation locale : si le titre ou le nom du client sont vides, un message explique que ces champs sont obligatoires.
  - Bannières d’erreur inline :
    - `localError` pour les erreurs de validation côté frontend.

### Scope
- Intégrer le composant existant `QuoteLinesPanel` dans `QuoteEditorPage` pour la version courante :
  - Utiliser `quote.current_version.id` comme `versionId` et `quote.current_version.lines` comme tableau de lignes.
  - Passer `quote.currency_code` pour l’affichage des montants.
- Conserver le comportement complet de `QuoteLinesPanel` :
  - Ajout de lignes.
  - Modification des quantités, prix unitaires HT et taux de TVA.
  - Enregistrement par ligne (avec indicateur de modification locale et mutation ciblée).
  - Suppression de ligne.
- Gater l’édition des lignes via le statut du devis :
  - Si le devis est `accepted` ou `archived`, afficher un panneau explicatif et désactiver l’édition des lignes.
  - Si aucune `current_version` n’est disponible, afficher un panneau indiquant qu’aucune version active n’est encore disponible et que les lignes apparaîtront une fois une version créée.
- Laisser le bloc `ComingSoon` en dessous comme placeholder pour les futurs outils d’édition avancée (blocs éditoriaux, options, collaboration).

### Acceptance Criteria
- Dans `/devis/:id`, lorsque `quote.current_version` existe et que le devis n’est ni accepté ni archivé :
  - Un tableau **"Lignes du devis"** apparaît dans la colonne principale.
  - L’UI permet d’ajouter une ligne, modifier les champs d’une ligne (description, quantité, PU HT, TVA %), enregistrer chaque ligne et supprimer des lignes, avec un comportement identique au panneau admin.
  - Les erreurs de création/mise à jour/suppression de ligne sont affichées dans un bandeau d’erreur rouge au-dessus du tableau, comme dans l’admin.
  - Après une mutation réussie, les données de devis sont rafraîchies via l’invalidation React Query (`['quote', quoteId]`).
- Lorsque le devis est en statut `accepted` ou `archived` :
  - À la place de l’éditeur de lignes interactif, un panneau texte est affiché avec le titre **"Lignes du devis"** et un texte expliquant que l’édition est désactivée pour les devis acceptés/archivés, en invitant à consulter la fiche admin pour le détail.
- Lorsque le devis n’a pas de `current_version` :
  - Un panneau **"Lignes du devis"** s’affiche avec un message indiquant qu’aucune version active n’est disponible et que les lignes apparaîtront dès qu’une version sera créée.
- Le bloc `ComingSoon` reste présent sous la section des lignes, avec un texte orienté vers les futures fonctionnalités d’éditeur avancé.

### Implementation Notes
#### Step 1 — Intégration du panneau de lignes (COMPLETED)
- Ajouté l’import `QuoteLinesPanel` dans `QuoteEditorPage` depuis `../admin/quotes/QuoteLinesPanel`.
- Calculé un booléen `canEditLines` basé sur le statut du devis et la présence d’une version courante :
  - `canEditLines = !!version && !isReadOnlyMetadata` où `isReadOnlyMetadata` est vrai pour les statuts `accepted` et `archived`.
- Branchements de `QuoteLinesPanel` dans la colonne principale de l’éditeur :
  - Lorsque `version` existe et `canEditLines === true`, `QuoteLinesPanel` est rendu avec :
    - `quoteId={quote.id}`
    - `versionId={version.id}`
    - `lines={version.lines}`
    - `currencyCode={quote.currency_code}`
  - Lorsque `version` existe mais `canEditLines === false` (devis accepté ou archivé), un panneau texte remplace le tableau avec un message explicite sur l’édition désactivée.
  - Lorsque `version` est null, un panneau texte indique qu’aucune version active n’est encore disponible pour ce devis.
- La logique métier de `QuoteLinesPanel` reste inchangée et continue d’utiliser les hooks `useCreateLine`, `useUpdateLine`, `useDeleteLine` :
  - Ces hooks invalident la requête `['quote', quoteId]` après chaque mutation, ce qui met automatiquement à jour les lignes et totaux de l’agrégat utilisé par l’éditeur.
- Maintenu en dessous un bloc `ComingSoon` dans la colonne principale, ajusté pour décrire plus précisément le futur éditeur avancé (organisation des blocs éditoriaux, options, outils de collaboration, autosave, offline, etc.).
  (`frontend/src/pages/quotes/QuoteEditorPage.tsx`, `frontend/src/pages/admin/quotes/QuoteLinesPanel.tsx`, `frontend/src/lib/useQuoteLines.ts`)

## Ticket 23 — Quote editor version bar

### Summary
Troisième tranche de l’éditeur de devis : intégrer la barre d’historique des versions dans l’éditeur (`/devis/:id`) afin de permettre à l’admin de consulter, créer et activer des versions directement depuis l’éditeur, en réutilisant le composant `QuoteVersionsBar` déjà utilisé côté admin.

### Scope
- Réutiliser `QuoteVersionsBar` dans la colonne latérale de `QuoteEditorPage`, sous la carte "Version courante".
- Passer les bonnes props :
  - `quoteId={quote.id}`.
  - `currentVersionId={version?.id ?? null}` en se basant sur `quote.current_version`.
- Conserver tout le comportement existant du composant :
  - Chargement de la liste des versions (`useQuoteVersions`).
  - Création d’une nouvelle version à partir de la version courante (`useCreateQuoteVersion`).
  - Publication / activation d’une version (`usePublishQuoteVersion`) avec invalidation des queries React Query.
- Garantir que le changement de version met bien à jour l’éditeur (métadonnées, lignes, totaux) via la réutilisation du cache `['quote', quoteId]`.

### Acceptance Criteria
- Dans `/devis/:id`, la colonne de gauche affiche désormais, sous le bloc "Version courante" :
  - La même barre de versions que dans la fiche admin (`QuoteVersionsBar`), avec :
    - Pastilles de versions (numéro, label, statut, date de création, verrouillage) telles que définies au Ticket 19.
    - Bouton "+ Nouvelle version".
    - Possibilité de cliquer sur une version pour la rendre active (sauf version déjà active ou pendant une mutation).
  - Les états de chargement et d’erreur de la barre sont gérés comme en admin (message de chargement, bannière d’erreur en cas d’échec, message "Aucune autre version pour le moment.").
- Lorsqu’une version est publiée depuis l’éditeur :
  - Le hook `usePublishQuoteVersion` invalide `['quote', quoteId]`.
  - Le composant `QuoteEditorPage` se met à jour automatiquement pour refléter la nouvelle version courante (totaux, lignes, nombre de lignes, etc.), sans rechargement manuel.
- Lorsque l’API renvoie une erreur lors de la création ou de la publication d’une version, la barre affiche un message d’erreur explicite, sans casser le reste de l’éditeur.

### Implementation Notes
#### Step 1 — Intégration de la barre de versions dans l’éditeur (COMPLETED)
- Ajouté l’import `QuoteVersionsBar` dans `QuoteEditorPage` depuis `../admin/quotes/QuoteVersionsBar`.
- Placé `QuoteVersionsBar` dans la colonne latérale, juste après la carte "Version courante" :
  - ` <QuoteVersionsBar quoteId={quote.id} currentVersionId={version?.id ?? null} />`
- Appuyé sur le comportement existant de `QuoteVersionsBar` :
  - Les hooks `useQuoteVersions`, `useCreateQuoteVersion` et `usePublishQuoteVersion` encapsulent la logique d’appel API, d’invalidation et de gestion des erreurs.
  - Les invalidations ciblent `['quote', quoteId]`, ce qui met à jour l’agrégat utilisé dans l’éditeur (métadonnées, version courante, lignes, totaux).
- Vérifié que le changement de version dans l’éditeur se comporte de façon transparente  - `QuoteLinesPanel` reçoit les nouvelles lignes via `quote.current_version.lines` et se resynchronise grâce à son `useEffect` interne.
  - Le panneau "Version courante" affiche les nouveaux totaux et le nouveau nombre de lignes.
- Aucun changement apporté à la logique métier des versions elle-même : l’éditeur n’expose que les actions déjà permises en admin (créer, publier une version existante), tout en offrant une expérience unifiée dans la colonne latérale.
  (`frontend/src/pages/quotes/QuoteEditorPage.tsx`, `frontend/src/pages/admin/quotes/QuoteVersionsBar.tsx`, `frontend/src/lib/hooks/useQuotes.ts`)

## Ticket 24 — Quote editor save-state indicator

### Summary
Ajouter un indicateur discret d’état de sauvegarde dans l’en-tête de l’éditeur de devis afin de rendre explicite pour l’utilisateur si les métadonnées (nom du client, titre, notes internes) contiennent des modifications non enregistrées ou si tout est à jour.

### Scope
- Étendre `QuoteEditorPage` pour afficher, à côté des boutons d’action de l’en-tête, un indicateur textuel basé sur l’état local et le statut de la mutation `useUpdateQuote` :
  - Lorsque des modifications locales existent (champ différent de la valeur initiale) et qu’aucune sauvegarde n’est en cours → afficher une pastille orange **"Modifications non enregistrées"**.
  - Lorsque aucune modification n’est en attente et qu’il n’y a pas d’erreur → afficher un texte léger **"Toutes les modifications sont enregistrées."**.
  - Pendant la sauvegarde (`updateMutation.isPending`), ne pas afficher cet indicateur (le bouton **"Enregistrement…"** étant déjà explicite).
- Ne pas modifier la logique de sauvegarde elle-même ni le payload envoyé au backend.

### Acceptance Criteria
- Dans `/devis/:id`, après modification d’une métadonnée (nom du client, titre, notes internes) sans encore cliquer sur **"Enregistrer"** :
  - L’en-tête montre une petite pastille orange avec le texte **"Modifications non enregistrées"**.
- Après avoir cliqué sur **"Enregistrer"** et une fois la mutation réussie :
  - L’indicateur se met à jour et affiche **"Toutes les modifications sont enregistrées."** tant qu’aucune autre modification n’est apportée.
- Pendant `updateMutation.isPending` :
  - Le bouton affiche **"Enregistrement…"**.
  - L’indicateur d’état de sauvegarde n’est pas affiché (pour éviter les messages contradictoires).
- En cas d’erreur de sauvegarde (bannière rouge dans le panneau "Informations principales") :
  - L’indicateur d’état n’est pas affiché, afin de laisser la bannière d’erreur prendre le dessus.
- Aucun appel supplémentaire au backend n’est déclenché ; l’indicateur s’appuie uniquement sur l’état local (`hasChanges`, `updateMutation.isPending`, `metadataError`).

### Implementation Notes
#### Step 1 — Indicateur d’état de sauvegarde (COMPLETED)
- Ajouté une section conditionnelle dans l’en-tête de `QuoteEditorPage`, à côté du bouton **"Enregistrer"** :
  - Affiche une pastille orange **"Modifications non enregistrées"** lorsque `hasChanges === true`, qu’il n’y a pas de mutation en cours et qu’aucune erreur (`metadataError`) n’est présente.
  - Affiche **"Toutes les modifications sont enregistrées."** lorsque `hasChanges === false`, l’éditeur n’est pas en cours de sauvegarde et aucune erreur n’est présente.
  - Cache l’indicateur lorsque `updateMutation.isPending === true` ou qu’un message d’erreur est affiché.
- L’indicateur s’appuie sur l’état déjà présent :
  - `hasChanges` (comparaison entre valeurs initiales et valeurs courantes des inputs).
  - `updateMutation.isPending` pour l’état de sauvegarde en cours.
  - `metadataError` pour masquer l’indicateur en cas d’erreur.
- Aucun changement fonctionnel apporté à la mutation ou aux payloads ; il s’agit exclusivement d’un complément UX visant à clarifier l’état de sauvegarde.
  (`frontend/src/pages/quotes/QuoteEditorPage.tsx`)

## Ticket 25 — Quote editor PDF panel

### Summary
Intégrer la gestion du PDF directement dans l’éditeur de devis (`/devis/:id`) en réutilisant le composant `QuotePdfPanel` déjà présent côté admin, afin de permettre la génération et le téléchargement du PDF de la version courante sans quitter l’éditeur.

### Scope
- Réutiliser le composant `QuotePdfPanel` dans la colonne latérale de `QuoteEditorPage`, sous la carte "Version courante" et au-dessus de la barre des versions.
- Passer les props suivantes :
  - `quoteId={quote.id}`.
  - `versionId={version?.id ?? null}` en se basant sur `quote.current_version`.
- Conserver tout le comportement existant de `QuotePdfPanel` :
  - Utilise `useRequestQuotePdf` pour lancer la génération asynchrone du PDF pour `quoteId` / `versionId`.
  - Utilise `useQuotePdfJob` pour suivre l’avancement du job (`pending` / `ready` / `failed`).
  - Affiche les états de génération (aucun PDF, en cours, prêt, échec) avec texte explicite et bannière d’erreur en cas de problème.
  - Propose un bouton **"Générer le PDF"** (ou **"Génération…"** lorsque la demande est en cours) et un lien **"Télécharger le PDF"** lorsque le job est en statut `ready` avec une URL disponible.
- Gérer l’absence de version active :
  - Si `versionId` est `null`, laisser `QuotePdfPanel` afficher son message de guidance existant ("Aucune version active — générez un PDF une fois une version disponible.") et désactiver le bouton de génération.

### Acceptance Criteria
- Dans `/devis/:id`, lorsque `quote.current_version` existe :
  - La colonne de gauche affiche un bloc **"PDF du devis"** sous **"Version courante"**, utilisant le même layout que côté admin.
  - Le bouton **"Générer le PDF"** lance une génération asynchrone pour la version courante, avec état **"Génération…"** pendant la requête.
  - Une fois le PDF prêt, un lien **"Télécharger le PDF"** apparaît et ouvre le document dans un nouvel onglet.
  - Le texte d’état affiche la dernière date/heure de génération lorsque disponible ("PDF prêt – généré le JJ/MM/AAAA à HH:MM").
  - En cas d’erreur lors de la génération ou du suivi du job, une bannière rouge avec un bouton **"Réessayer"** s’affiche.
- Lorsque `quote.current_version` est `null` :
  - Le bloc **"PDF du devis"** est visible mais le bouton est désactivé.
  - Un texte indique qu’aucune version active n’est disponible et qu’un PDF pourra être généré une fois une version créée.
- Aucun comportement spécifique supplémentaire côté éditeur (pas d’automatisation sur changement de version) :
  - `QuotePdfPanel` continue de s’appuyer uniquement sur `quoteId`, `versionId` et ses hooks internes.

### Implementation Notes
#### Step 1 — Intégration du panneau PDF dans l’éditeur (COMPLETED)
- Ajouté l’import `QuotePdfPanel` dans `QuoteEditorPage` depuis `../admin/quotes/QuotePdfPanel`.
- Inséré `QuotePdfPanel` dans la colonne latérale de l’éditeur, juste après la carte **"Version courante"** et avant `QuoteVersionsBar` :
  - `<QuotePdfPanel quoteId={quote.id} versionId={version?.id ?? null} />`.
- Conservé intégralement la logique interne de `QuotePdfPanel` :
  - Gestion du job courant via `currentJobId` et état local `localError`.
  - Appels à `useRequestQuotePdf` / `useQuotePdfJob` avec invalidation et suivi d’état.
  509→  - Gestion des textes d’état et du lien de téléchargement.
  510→- Vérifié que le panneau se comporte de façon cohérente dans l’éditeur comme dans la fiche admin :
  511→  - Pas de génération possible tant qu’aucune version active n’est présente.
  512→  - Comportement identique lorsque plusieurs générations sont lancées successivement (le dernier job pris en compte est celui renvoyé par `useRequestQuotePdf`).
  513→  (`frontend/src/pages/quotes/QuoteEditorPage.tsx`, `frontend/src/pages/admin/quotes/QuotePdfPanel.tsx`, `frontend/src/lib/useQuotePdf.ts`)
  514→
## Ticket 26 — Quote editor acceptance summary

### Summary
Ajouter dans la colonne principale de l’éditeur `/devis/:id` un bloc de récapitulatif de l’acceptation, en lecture seule, qui reprend les informations clés déjà exposées côté admin : statut d’acceptation, mode (en ligne / sur papier), date d’acceptation et nom de la personne ayant accepté lorsque disponible.

### Scope
- Étendre `QuoteEditorPage` pour insérer, au-dessus du panneau de lignes, une section **"Suivi d’acceptation"** qui :
  - Utilise les métadonnées déjà présentes dans l’agrégat : `status`, `acceptanceMode`, `acceptedAt`, `acceptedByName`.
  - Ne propose **aucune** action d’édition ou de correction : il s’agit uniquement d’un bloc de résumé.
- Comportement ciblé :
  - Lorsque `quote.status === 'accepted'` :
    - Afficher une phrase résumant l’acceptation : **"Ce devis a été accepté"** avec, lorsque disponible :
      - Le mode d’acceptation (en ligne / sur papier) entre parenthèses.
      - La date d’acceptation formatée via `formatISO`.
    - Afficher, si disponible, le nom de la personne ayant accepté (`acceptedByName`).
    - Ajouter un texte d’aide indiquant que toute correction doit être effectuée depuis la fiche admin.
  - Lorsque le devis n’est pas accepté :
    - Afficher un texte indiquant que le devis n’est pas encore accepté, en rappelant le statut courant (Brouillon / Envoyé / Refusé / Archivé).
    - Préciser que l’acceptation est pilotée depuis l’admin et que ce bloc sert uniquement de récapitulatif.
- Ne pas modifier la logique de calcul ou de stockage de ces métadonnées ; le bloc se contente de les afficher.

### Acceptance Criteria
- Dans `/devis/:id`, au-dessus du panneau **"Lignes du devis"**, un bloc **"Suivi d’acceptation"** est visible :
  - Lorsque le devis est accepté :
    - Le bloc indique clairement qu’il est **accepté**, le cas échéant avec le mode (en ligne / sur papier), la date d’acceptation et le nom de la personne ayant accepté.
    - Un texte d’aide explique que ce bloc est en lecture seule et que toute correction doit passer par la fiche admin.
  - Lorsque le devis n’est pas accepté :
    - Le bloc affiche : **"Ce devis n’est pas encore accepté. Statut actuel : …"** en réutilisant le `statusLabel` déjà calculé dans l’en-tête.
    - Un court texte rappelle que l’acceptation est gérée via l’admin.
- Aucune action (bouton, lien) n’est ajoutée dans ce bloc : il ne déclenche aucun appel API.
- Le bloc se comporte correctement sur tous les statuts (`draft`, `sent`, `accepted`, `rejected`, `archived`) et reste cohérent avec les informations affichées dans l’entête et dans la fiche admin.

### Implementation Notes
#### Step 1 — Bloc de suivi d’acceptation en lecture seule (COMPLETED)
- Ajouté une section `"Suivi d’acceptation"` dans la colonne principale de `QuoteEditorPage`, juste au-dessus du panneau des lignes :
  - Utilise `quote.status`, `acceptanceModeLabel`, `acceptedAtLabel` déjà dérivés dans le composant.
  - Introduit `acceptedByName = quote.acceptedByName ?? null` pour afficher le nom si disponible.
- Comportement :
  - Si `quote.status === 'accepted'` :
    - Affiche un texte principal indiquant que le devis a été accepté, avec le mode entre parenthèses lorsque `acceptanceModeLabel !== '—'`.
    - Affiche la date d’acceptation lorsque `acceptedAtLabel !== '—'`.
    - Affiche une ligne supplémentaire si `acceptedByName` est renseigné.
    - Ajoute une note en petit : **"Ce bloc est en lecture seule. Pour corriger le statut ou les informations d’acceptation, passez par la fiche admin du devis."**
  - Sinon :
    - Affiche une phrase indiquant que le devis n’est pas encore accepté, en mentionnant le `statusLabel` courant.
    - Ajoute un texte rappelant que l’acceptation en ligne ou sur papier est pilotée depuis la fiche admin.
- Aucun changement sur les mutations ou les hooks :
  - Le bloc ne modifie ni `useQuote`, ni `useUpdateQuote`, ni les endpoints d’acceptation.
  - Il se contente d’exploiter les métadonnées exposées par l’agrégat pour offrir un résumé lisible dans le contexte de l’éditeur.
  (`frontend/src/pages/quotes/QuoteEditorPage.tsx`)

## Ticket 27 — Quote editor validity date editing

### Summary
Permettre l’édition de la date de validité d’un devis directement depuis l’éditeur `/devis/:id`, en s’appuyant sur le champ existant `validUntil` côté base/API, tout en gardant un comportement cohérent avec la fiche admin et la vue publique. La date reste non modifiable pour les devis **acceptés** ou **archivés**.

### Scope
- **Backend**
  - Confirmer l’existence de la colonne `validUntil` dans la table `quotes` (colonne `valid_until`).
  - Étendre le schéma de validation PATCH pour accepter un champ optionnel `valid_until` :
    - Soit une chaîne de date valide (format ISO compatible),
    - Soit `null` pour effacer la date de validité,
    - Le champ reste optionnel pour ne pas casser les appels existants.
  - Brancher `valid_until` dans la fonction de repository `updateMeta` afin de persister la mise à jour dans `quotes.validUntil`.
  - Ne pas modifier la route HTTP : `PATCH /v1/quotes/:quoteId` continue d’utiliser le même endpoint, avec un DTO enrichi.
- **Frontend**
  - Étendre le type `UpdateQuotePayload` dans `frontend/src/lib/api.ts` pour ajouter `valid_until?: string | null`.
  - Dans `QuoteEditorPage.tsx` :
    - Ajouter un état local `validityDateInput` (string) initialisé à partir de `quote.validity_date` (mappé depuis `validUntil`) tronqué au format `YYYY-MM-DD` pour le champ `<input type="date">`.
    - Inclure `validityDateInput` dans le calcul de `hasChanges` afin que le bouton **"Enregistrer"** reflète aussi les modifications de date.
    - Mettre à jour `handleSaveMetadata` pour :
      - N’inclure `valid_until` dans le payload que si la valeur a effectivement changé.
      - Envoyer une chaîne de date (trimée) lorsque le champ est renseigné.
      - Envoyer `null` lorsque le champ est vidé afin d’effacer la date de validité côté backend.
    - Afficher la date de validité comme champ éditable dans la carte **"Informations principales"** :
      - Utiliser un `<input type="date">` aligné à droite, relié à `validityDateInput`.
      - Réutiliser le flag `isReadOnlyMetadata` pour désactiver **toutes** les métadonnées, y compris la date, lorsque le devis est `accepted` ou `archived`.
      - Garder un texte d’aide indiquant que la date est ajustable pour les devis en cours, mais figée pour les devis acceptés/archivés.
  - Ne pas modifier les vues admin/public, qui consomment déjà `validity_date` et afficheront automatiquement la nouvelle date après sauvegarde.

### Acceptance Criteria
- Dans `/devis/:id`, pour un devis en statut `draft` ou `sent` :
  - Le panneau **"Informations principales"** contient un champ **"Valide jusqu’au"** éditable au format date (`<input type="date">`).
  - Modifier cette date, puis cliquer sur **"Enregistrer"**, met à jour la date de validité côté backend.
  - Après rechargement, la nouvelle date est reflétée :
    - Dans l’éditeur (`quote.validity_date`),
    - Dans la fiche admin (`/admin/quotes/:id`),
    - Dans la vue publique (`/p/:token`) lorsque applicable.
  - Vider le champ puis enregistrer efface la date de validité (le backend reçoit `valid_until: null`).
  - Le bouton **"Enregistrer"** reste désactivé tant qu’aucun changement n’a été apporté, y compris sur la date de validité.
- Pour un devis en statut `accepted` ou `archived` :
  - Les champs métadonnées (nom du client, titre, notes, date de validité) sont affichés mais désactivés.
  - Le bouton **"Enregistrer"** est désactivé et `handleSaveMetadata` ne déclenche aucune mutation.
- Côté API :
  - Le schéma de validation accepte un champ optionnel `valid_until`.
  - Une date mal formée est rejetée par le backend avec une erreur de validation ; l’éditeur affiche cette erreur dans le bandeau rouge existant du panneau **"Informations principales"**.
  - Les appels existants qui ne fournissent pas de `valid_until` continuent de fonctionner sans changement.

### Implementation Notes
#### Step 1 — Extension du contrat backend (COMPLETED)
- Confirmé la colonne `validUntil` dans le schéma Drizzle (`backend/src/db/schema.ts`).
- Étendu `quoteUpdateSchema` dans `backend/src/api/validators/quotes.ts` pour accepter `valid_until` comme champ optionnel `string | null` avec validation de date.
- Branché `valid_until` dans `updateMeta` (`backend/src/repositories/quotes.repo.ts`) en l’assignant à `updatePayload.validUntil` lorsque présent (ou `null` pour effacer la date).
- Vérifié que la route `PATCH /v1/quotes/:quoteId` utilise toujours ce schéma via `parseQuoteUpdate`.

#### Step 2 — Payload frontend et wiring React Query (COMPLETED)
- Ajouté `valid_until?: string | null` à `UpdateQuotePayload` dans `frontend/src/lib/api.ts`.
- Conservé le mapping existant `validity_date` dans `mapQuoteAggregate`, qui expose déjà `quote.validity_date` à partir de `validUntil`.
- La mutation `useUpdateQuote` continue d’invalider la query `['quote', quoteId]`, ce qui rafraîchit l’agrégat après mise à jour de la date.

#### Step 3 — Champ date éditable dans l’éditeur (COMPLETED)
- Ajouté un état local `validityDateInput` dans `QuoteEditorPage` initialisé via `useEffect` à partir de `quote.validity_date` (tronqué à `YYYY-MM-DD`).
- Inclus `validityDateInput` dans `hasChanges` pour que le bouton **"Enregistrer"** reflète les changements de date.
- Mis à jour `handleSaveMetadata` pour construire un payload minimal :
  - `title`, `customer_name`, `notes` uniquement s’ils diffèrent des valeurs initiales.
  - `valid_until` uniquement lorsque `validityDateInput` diffère de `quote.validity_date` tronquée :
    - Chaîne de date trimée lorsqu’une valeur est saisie.
    - `null` lorsque le champ est vidé.
- Ajouté un `<input type="date">` pour **"Valide jusqu’au"** dans la carte **"Informations principales"**, avec :
  - `value={validityDateInput}`.
  - `disabled={isReadOnlyMetadata || updateMutation.isPending}` pour aligner le comportement avec les autres champs.
  - Un texte d’aide expliquant que la date est ajustable pour les devis en cours, mais figée pour les devis acceptés/archivés.
- Conserver l’affichage de la devise, ainsi que la note sur les **Notes internes** (non visibles par le client).
  (`backend/src/db/schema.ts`, `backend/src/api/validators/quotes.ts`, `backend/src/repositories/quotes.repo.ts`, `frontend/src/lib/api.ts`, `frontend/src/pages/quotes/QuoteEditorPage.tsx`)

## Ticket 28 — Validity date frontend validation

### Summary
Ajouter une validation légère côté frontend pour la date de validité dans l’éditeur `/devis/:id` afin de bloquer les dates manifestement invalides (avant la date de création du devis), tout en conservant la possibilité de vider le champ et en laissant le backend comme garde-fou final.

### Scope
- Ne concerne que l’éditeur de devis (`frontend/src/pages/quotes/QuoteEditorPage.tsx`).
- Aucun changement côté backend : même champ `valid_until`, même route `PATCH /v1/quotes/:id`, même schéma de validation Zod.
- Ajouter uniquement une validation locale et des messages d’erreur UX explicites.

### Acceptance Criteria
- Dans `/devis/:id`, pour un devis en statut `draft` ou `sent` :
  - Si l’utilisateur choisit une date **"Valide jusqu’au"** antérieure à **"Créé le"** :
    - Le clic sur **"Enregistrer"** est bloqué côté frontend.
    - Un message d’erreur clair apparaît dans le bandeau rouge du panneau **"Informations principales"** :
      - « La date de validité ne peut pas être antérieure à la date de création du devis. »
    - Aucune requête réseau n’est envoyée.
  - Si l’utilisateur choisit une date parsable et **postérieure ou égale** à la date de création :
    - La sauvegarde se comporte comme au Ticket 27 (envoi de `valid_until` si changé, refetch, admin/public à jour).
  - Si l’utilisateur vide le champ de date :
    - Le comportement reste celui du Ticket 27 : envoi de `valid_until: null` lorsque la valeur a changé.
    - Aucune validation supplémentaire n’est appliquée sur le cas « champ vide ».
- Pour un devis en statut `accepted` ou `archived` :
  - Le champ date reste désactivé comme précédemment.
  - Aucune nouvelle validation ni mutation n’est déclenchée.
- Aucun autre garde-front supplémentaire n’est ajouté (pas de limite sur l’horizon futur, pas de durée max, etc.).

### Implementation Notes
#### Step 1 — Comparaison date de validité vs date de création (COMPLETED)
- Rappel : `QuoteAggregate` expose `created_at: string` et `validity_date?: string | null` (mapping de `validUntil`).
- Dans `QuoteEditorPage.tsx` :
  - Réutilisé l’état existant `validityDateInput` (valeur `YYYY-MM-DD` issue de l’`<input type="date">`).
  - Dans `handleSaveMetadata` :
    - Ajouté un `trimmedValidityDate = validityDateInput.trim()`.
    - Lorsque `trimmedValidityDate.length > 0` :
      - Normalise les dates en mode **date-only** pour éviter les effets de fuseau horaire :
        - `createdAtDateOnly = quote.created_at.slice(0, 10)`.
        - `validityDate = new Date(`${trimmedValidityDate}T00:00:00.000Z`).
        - `createdAtDate = new Date(`${createdAtDateOnly}T00:00:00.000Z`).
      - Si les deux dates sont valides et que `validityDate < createdAtDate` :
        - Définir `localError` sur :
          - « La date de validité ne peut pas être antérieure à la date de création du devis. »
        - Retourner immédiatement sans construire de payload ni appeler la mutation.
    - Si `trimmedValidityDate.length === 0` : aucun contrôle supplémentaire n’est appliqué (cas « effacement de la date » inchangé).
  - Le reste de la logique reste identique au Ticket 27 :
    - `title` / `customer_name` restent obligatoires.
    - `valid_until` n’est inclus dans le payload que si la valeur a changé, avec `null` pour le cas champ vidé.
    - `isReadOnlyMetadata` continue d’empêcher les mutations pour les devis `accepted` / `archived`.
- La bannière d’erreur réutilise `metadataError = localError || remoteErrorMessage`, garantissant que la nouvelle validation locale est affichée dans le même bloc que les autres erreurs de métadonnées.
  (`frontend/src/lib/types/quotes.ts`, `frontend/src/pages/quotes/QuoteEditorPage.tsx`)

## Ticket 29 — Quote editor editorial sections placeholder

### Summary
Ajouter, dans la colonne principale de l’éditeur `/devis/:id`, une section en lecture seule **"Sections éditoriales"** qui présente les futurs blocs d’histoire / éditoriaux du devis. L’objectif est de rendre explicite pour l’utilisateur qu’une zone dédiée aux blocs narratifs et pratiques arrivera, sans encore implémenter de logique d’édition ou d’API.

### Scope
- Route concernée : `/devis/:id`.
- Fichier : `frontend/src/pages/quotes/QuoteEditorPage.tsx`.
- Ajouter une nouvelle carte (section) dans la colonne de droite (main), **sous** :
  - Le bloc **"Suivi d’acceptation"**.
  - La section **"Lignes du devis"** (quel que soit son état : éditable, read-only ou sans version).
- Contenu purement statique :
  - Titre **"Sections éditoriales"**.
  - Une phrase d’introduction expliquant que cette zone accueillera bientôt les blocs éditoriaux qui structurent l’histoire du devis et les options proposées.
  - Une petite liste de types de blocs à venir (introduction, histoire, options/variantes, pratiques).
  - Une note de bas de carte précisant que la section est pour l’instant en lecture seule, mais sera éditable avec sauvegarde automatique et historique.
- Style visuel cohérent avec les autres cartes de l’éditeur (coins arrondis, bordure légère, fond blanc, texte navy/blue-gray).
- Ne pas ajouter de nouveaux appels API ni de logique de mutation.
- Conserver le composant `ComingSoon` existant sous cette nouvelle section.

### Acceptance Criteria
- Dans `/devis/:id`, une fois le devis chargé avec succès (quel que soit son statut) :
  - La colonne principale (droite) affiche, sous la section **"Lignes du devis"**, une carte **"Sections éditoriales"**.
  - La carte contient :
    - Un titre clair **"Sections éditoriales"**.
    - Une phrase d’introduction du type :
      - « Cette zone accueillera bientôt les blocs éditoriaux qui structurent l’histoire du devis et les options proposées au client. »
    - Une liste de 3–4 puces décrivant les types de blocs prévus (introduction, histoire à raconter, options/variantes, blocs pratiques).
    - Une phrase de conclusion expliquant que ces blocs seront éditables, avec sauvegarde automatique et historique, mais que la section est actuellement en lecture seule.
  - Cette section est visible pour tous les statuts de devis (`draft`, `sent`, `accepted`, `rejected`, `archived`).
  - Aucun champ, bouton ou formulaire n’est interactif dans cette carte.
- Le composant `ComingSoon` reste présent **sous** cette nouvelle carte et conserve son comportement actuel.
- Aucun nouvel appel réseau n’est déclenché par cette section.

### Implementation Notes
#### Step 1 — Carte "Sections éditoriales" en lecture seule (COMPLETED)
- Ajouté une nouvelle `<section>` dans la colonne principale de `QuoteEditorPage`, juste après le bloc **"Lignes du devis"` (qu’il s’agisse du panneau éditable ou du fallback read-only / sans version) et avant le composant `ComingSoon` :
  - Titre : **"Sections éditoriales"**.
  - Texte d’introduction : explique que cette zone accueillera les futurs blocs éditoriaux structurant l’histoire du devis et les options proposées.
  - Liste à puces (`<ul>` + `<li>`) décrivant les types de blocs prévus :
    - Bloc d’introduction.
    - Blocs "histoire à raconter".
    - Blocs "options et variantes".
    - Blocs pratiques (lieux, dates, délais, livrables).
  - Phrase de conclusion en petit : rappelle que ces blocs seront éditables avec sauvegarde automatique et historique, et que la section est en lecture seule pour l’instant.
- Style :
  - Reprise des classes Tailwind des autres cartes de l’éditeur :
    - `rounded-3xl border border-memopyk-dark-blue/10 bg-white p-6 shadow-sm`.
    - Typographie MEMOPYK (titres en navy, texte en blue-gray, tailles cohérentes avec les autres panneaux).
- Comportement :
  - Pas d’état React, pas de `useState` supplémentaire.
  - Aucune mutation ni appel API ; la carte est purement statique.
  - Rendu inconditionnel dès que `quote` est disponible, y compris pour les devis acceptés/archivés.
  (`frontend/src/pages/quotes/QuoteEditorPage.tsx`)

## Ticket 30 — DEVIS frontend pre-release polish (admin + editor + public)

### Summary
Effectuer une passe de finition avant mise en production sur les écrans principaux Devis (admin, éditeur, vue publique) pour harmoniser les libellés de statut/mode, consolider les messages d’erreur/états vides, vérifier la lisibilité sur mobile et documenter les ajustements réalisés. Aucune modification backend.

### Scope
- Frontend uniquement (React / TypeScript / Tailwind).
- Aucun changement sur les schémas ou endpoints backend.
- Écrans concernés :
  - `/admin/quotes` (liste des devis).
  - `/admin/quotes/:id` (détail admin).
  - `/devis/:id` (éditeur).
  - `/p/:token` (vue publique client).
- Axes :
  - Cohérence des libellés de statut et de mode d’acceptation en français.
  - Messages d’erreur et d’états vides clairs, avec action de sortie (réessayer / retour / contact).
  - Vérification visuelle du layout sur mobile / desktop (overflow, scroll horizontal, espacements).
  - (Optionnel) Titres de page / `document.title` — non implémenté dans cette tranche, laissé pour une itération ultérieure.

### Acceptance Criteria
- Les statuts techniques (`draft`, `sent`, `accepted`, `rejected`, `archived`) sont affichés avec les mêmes libellés lisibles en français partout :
  - `draft` → **Brouillon**
  - `sent` → **Envoyé**
  - `accepted` → **Accepté**
  - `rejected` → **Refusé**
  - `archived` → **Archivé**
- Les modes d’acceptation sont affichés de manière cohérente :
  - `online` → **En ligne**
  - `paper` → **Sur papier**
- Sur les écrans principaux (admin liste/détail, éditeur, vue publique) :
  - Les messages d’erreur / états vides sont en français.
  - Chaque cas d’erreur / état exceptionnel propose au moins une action claire :
    - Bouton **"Réessayer"** lorsque pertinent.
    - Lien de retour vers la liste (`/admin/quotes`) côté admin/éditeur.
    - Ou consigne explicite invitant à contacter MEMOPYK côté public.
- Vue publique `/p/:token` et éditeur `/devis/:id` :
  - Lisibles sur mobile (pas d’éléments majeurs qui débordent, tables scrollables horizontalement lorsque nécessaire, marges cohérentes).
  - Les ajustements CSS se limitent à des tweaks Tailwind mineurs si nécessaires.
- Ticket 30 est documenté dans `MEMOPYK_Frontend_Tickets.md` avec un récapitulatif des changements, et l’entrée TODO `ticket30-frontend-polish` est marquée comme complétée.

### Implementation Notes
#### Step 1 — Cohérence des statuts et modes d’acceptation (COMPLETED)
- Éditeur `/devis/:id` :
  - Utilise déjà une table de correspondance pour afficher les statuts lisibles :
    - `draft` → "Brouillon", `sent` → "Envoyé", `accepted` → "Accepté", `rejected` → "Refusé", `archived` → "Archivé".
  - Les modes d’acceptation sont déjà normalisés : `online` → "En ligne", `paper` → "Sur papier" (via `acceptanceModeLabel`).
- Vue publique `/p/:token` :
  - Réutilise les mêmes libellés pour le mode d’acceptation dans le **Reçu d’acceptation** (`acceptanceModeLabel`).
  - Le statut en lui-même n’est pas affiché textuellement dans cet écran, ce qui évite les doublons.
- Admin — détail `/admin/quotes/:id` :
  - Ajouté un mapping local `statusLabel` pour convertir `quote.status` vers les libellés français (Brouillon / Envoyé / Accepté / Refusé / Archivé).
  - Le header affiche désormais **"Statut : {statusLabel}"** au lieu de la valeur brute.
  - Le label de mode d’acceptation était déjà cohérent (`En ligne` / `Sur papier`).
- Admin — liste `/admin/quotes` :
  - Le filtre par statut expose déjà les bons libellés dans la `<select>`.
  - La colonne **"Statut"** du tableau utilisait encore la valeur brute (`quote.status`).
  - Ajouté une conversion inline pour afficher les libellés :
    - `draft` → "Brouillon", `sent` → "Envoyé", `accepted` → "Accepté", `rejected` → "Refusé", `archived` → "Archivé" (fallback = `quote.status` si inconnu).

#### Step 2 — Messages d’erreur & états vides (COMPLETED)
- Admin — liste `/admin/quotes` :
  - Erreur réseau : déjà doté d’un message clair en français + bouton **"Réessayer"** (inchangé).
  - État vide sans filtres : texte revu pour rester en vouvoiement et cohérent avec le reste de l’app :
    - Avant : "Crée ton premier devis… Tu pourras ensuite…" (tutoiement).
    - Après : "Créez votre premier devis MEMOPYK pour un client. Vous pourrez ensuite le dupliquer, gérer plusieurs versions et l’envoyer directement par lien sécurisé."
  - État vide avec filtres : message français simple, déjà en place (inchangé).
- Admin — détail `/admin/quotes/:id` :
  - 404 / not found : message **"Devis introuvable"** + lien **"Retour à la liste"** vers `/admin/quotes` (inchangé).
  - Erreur générique / hors ligne : messages différenciés selon la connectivité, avec un bouton **"Réessayer"** (inchangé).
- Éditeur `/devis/:id` :
  - Cas 404 : "Devis introuvable" + **"Réessayer"** + **"Retour à la liste des devis"** (inchangé, déjà aligné).
  - Erreur générique / hors ligne : message clair en français, avec les mêmes deux actions (inchangé).
  - Cas "Aucune donnée de devis" : message explicite et lien de retour vers la liste admin (inchangé).
- Vue publique `/p/:token` :
  - Lien invalide / token absent : message **"Lien invalide"** invitant à vérifier l’adresse ou contacter MEMOPYK (pas de bouton, mais une action explicite est proposée).
  - 404 (token expiré ou inexistant) : message **"Devis introuvable"** + consigne de contact en cas d’erreur.
  - PIN incorrect / 403 : message **"Code PIN incorrect. Vérifiez le code et réessayez."** + bouton de soumission du PIN.
  - Erreur générique de chargement : message clair en français + bouton **"Réessayer"** (inchangé).
  - Erreurs lors de l’acceptation en ligne ou de la génération de PDF : messages français explicites, avec recommandation de réessayer (inchangé).

#### Step 3 — Layout & responsive checks (COMPLETED)
- Vue publique `/p/:token` :
  - La page est déjà contrainte par un conteneur `max-w-3xl` avec marges verticales, évitant les textes bord à bord.
  - Les tableaux (détail des lignes) sont enveloppés dans des conteneurs `overflow-x-auto`, garantissant un scroll horizontal propre sur mobile.
  - Les sections principales (résumé, détail, PDF, validation, "Prochaines étapes") utilisent des `space-y-*` cohérents ; aucune surcharge visuelle notable en bas de page.
  - Aucun ajustement CSS additionnel n’a été nécessaire dans cette tranche.
- Admin — liste et détail :
  - Disposition grid/flex déjà adaptée aux largeurs mobiles (cartes en une colonne, puis 2 colonnes sur `md`+).
  - Les tables sont encapsulées dans des conteneurs `overflow-x-auto` avec bordures et ombres, ce qui évite les débordements horizontaux sur petits écrans.
  - Espacements (`space-y-*`, `py-*`) vérifiés et jugés suffisants ; aucun ajustement Tailwind supplémentaire requis.
- Éditeur `/devis/:id` :
  - Layout principal `grid gap-6 lg:grid-cols-[0.9fr_1.1fr]` : en dessous de `lg`, les sections passent en pile verticale avec des marges suffisantes.
  - Les panneaux latéraux et principaux réutilisent des cartes arrondies cohérentes ; pas de débordement horizontal observé.
  - Les tables de lignes (réutilisées depuis l’admin) restent scrollables horizontalement si besoin.

#### Step 4 — Titres de page / document.title (NOT IMPLEMENTED IN THIS SLICE)
- Aucune logique de mise à jour de `document.title` n’a été ajoutée dans cette tranche pour éviter de modifier la structure des hooks existants dans les pages.
- Recommandation pour une itération ultérieure :
  - Normaliser les titres de page via un petit hook utilitaire (ex. `usePageTitle`) ou dans un layout dédié, avec un pattern du type :
    - `MEMOPYK Devis – Liste des devis` pour `/admin/quotes`.
    - `MEMOPYK Devis – {quote.number}` pour `/admin/quotes/:id`.
    - `MEMOPYK Devis – Éditeur {quote.number}` pour `/devis/:id`.
    - `MEMOPYK Devis – Espace client` pour `/p/:token`.

## Ticket 31 — usePageTitle hook & document titles

### Summary
Introduire un petit hook React `usePageTitle` pour centraliser la mise à jour de `document.title` et l’appliquer aux vues principales Devis (admin, éditeur, vue publique, accueil), afin que l’application affiche des titres d’onglet cohérents et lisibles.

### Scope
- Frontend uniquement (React / TypeScript).
- Aucun changement backend ou schéma de données.
- Vues ciblées :
  - `/admin/quotes` (liste des devis).
  - `/admin/quotes/:id` (détail admin d’un devis).
  - `/devis/:id` (éditeur de devis).
  - `/p/:token` (vue publique client).
- Optionnel mais implémenté :
  - `/` (HomePage).
  - `/admin` (AdminDashboardPage).

### Acceptance Criteria
- Un hook partagé `usePageTitle(title: string)` existe dans `frontend/src/lib/usePageTitle.ts` et encapsule la mise à jour de `document.title` via un `useEffect`.
- Les pages suivantes utilisent `usePageTitle` pour définir un titre d’onglet cohérent avec le pattern **"MEMOPYK Devis — …"** :
  - `/admin/quotes` → `MEMOPYK Devis — Liste des devis`.
  - `/admin/quotes/:id` →
    - `MEMOPYK Devis — Admin — {quote.number}` lorsque le numéro de devis est connu.
    - `MEMOPYK Devis — Admin — Détail du devis` lorsque les données ne sont pas encore chargées ou absentes.
  - `/devis/:id` →
    - `MEMOPYK Devis — Éditeur — {quote.number}` lorsque le devis est chargé.
    - `MEMOPYK Devis — Éditeur de devis` pendant le chargement ou en cas d’erreur/absence de données.
  - `/p/:token` →
    - `MEMOPYK Devis — Devis client — {quote.number}` lorsque le devis public est chargé.
    - `MEMOPYK Devis — Devis client` pendant le chargement, en cas de lien invalide, d’erreur ou avant l’entrée du PIN.
- Pages optionnelles :
  - `/` → `MEMOPYK Devis — Accueil`.
  - `/admin` → `MEMOPYK Devis — Tableau de bord`.
- Aucun titre n’est géré "à la main" via `document.title` ailleurs que dans `usePageTitle`.
- Aucun impact sur les flux métiers existants (lecture/édition de devis, vue publique, etc.).

### Implementation Notes
#### Step 1 — Hook `usePageTitle` (COMPLETED)
- Créé `frontend/src/lib/usePageTitle.ts` :
  - `export function usePageTitle(title: string)`.
  - Utilise `useEffect` pour appliquer `document.title = title || 'MEMOPYK Devis'`.
  - Protège l’accès à `document` (`typeof document === 'undefined'`) pour éviter tout souci hors navigateur.
- Aucun reset explicite du titre à la désactivation du composant — l’onglet conserve le dernier titre défini, ce qui reste acceptable pour cette application single-page.

#### Step 2 — Titres des vues admin (COMPLETED)
- `frontend/src/pages/admin/quotes/List.tsx` :
  - Importé `usePageTitle` depuis `../../../lib/usePageTitle`.
  - Ajouté `usePageTitle('MEMOPYK Devis — Liste des devis')` au début du composant `QuotesListPage`.
- `frontend/src/pages/admin/quotes/Detail.tsx` :
  - Importé `usePageTitle` depuis `../../../lib/usePageTitle`.
  - Déplacé la dérivation de `quote` juste après le hook `useQuote`.
  - Déduit un `pageTitle` :
    - Si `quote?.number` est présent : `MEMOPYK Devis — Admin — ${quote.number}`.
    - Sinon : `MEMOPYK Devis — Admin — Détail du devis`.
  - Appelé `usePageTitle(pageTitle)` avant les branches `isLoading` / `isError` / `!quote`.
  - Les écrans d’erreur (404, erreur générique, aucune donnée) utilisent donc le titre générique "Détail du devis".
- `frontend/src/pages/admin/AdminDashboardPage.tsx` :
  - Importé `usePageTitle` depuis `../../lib/usePageTitle`.
  - Ajouté `usePageTitle('MEMOPYK Devis — Tableau de bord')` au début du composant.

#### Step 3 — Titres de l’éditeur et de la vue publique (COMPLETED)
- `frontend/src/pages/quotes/QuoteEditorPage.tsx` :
  - Importé `usePageTitle` depuis `../../lib/usePageTitle`.
  - Dérivé `quote = data?.data` puis un `pageTitle` :
    - Avec devis chargé : `MEMOPYK Devis — Éditeur — ${quote.number}`.
    - Sinon : `MEMOPYK Devis — Éditeur de devis`.
  - Appelé `usePageTitle(pageTitle)` au début du composant, avant les rendus conditionnels (chargement, erreur, absence de données).
- `frontend/src/pages/public/PublicQuoteViewPage.tsx` :
  - Importé `usePageTitle` depuis `../../lib/usePageTitle`.
  - La requête `usePublicQuote` est maintenant appelée même si `token` est potentiellement `undefined`, mais reste désactivée grâce à `enabled: !!token`.
  - Dérivé `quote` à partir de `publicQuoteQuery.data?.data ?? null`.
  - Calculé un `pageTitle` :
    - Si `quote?.number` est connu : `MEMOPYK Devis — Devis client — ${quote.number}`.
    - Sinon : `MEMOPYK Devis — Devis client`.
  - Appelé `usePageTitle(pageTitle)` avant les différentes branches (`!token`, 404, 403/PIN, erreur générique, rendu normal).
  - L’ancien early-return `if (!token)` est conservé en tant que cas d’affichage, mais intervient après l’appel à `usePageTitle`.

#### Step 4 — Titres des pages d’accueil / admin (COMPLETED)
- `frontend/src/pages/HomePage.tsx` :
  - Importé `usePageTitle` depuis `../lib/usePageTitle`.
  - Ajouté `usePageTitle('MEMOPYK Devis — Accueil')` au début du composant `HomePage`.
- `frontend/src/pages/admin/AdminDashboardPage.tsx` :
  - Voir Step 2 ci-dessus — titre `MEMOPYK Devis — Tableau de bord`.

## Ticket 32 — Tests for usePageTitle and page titles

### Summary
Ajouter des tests Vitest/RTL pour le hook `usePageTitle` et pour les vues principales, afin de vérifier que `document.title` est correctement mis à jour et que les pages clés exposent bien les titres attendus.

### Scope
- Frontend uniquement (Vitest + React Testing Library).
- Aucun changement de comportement runtime ni backend.
- Couvre :
  - Le hook `usePageTitle` (tests unitaires).
  - Les pages :
    - `/admin/quotes` (liste des devis).
    - `/admin/quotes/:id` (détail admin).
    - `/devis/:id` (éditeur de devis).
    - `/p/:token` (vue publique).
  - Optionnel mais implémenté :
    - `/` (HomePage).
    - `/admin` (AdminDashboardPage).

### Acceptance Criteria
- `usePageTitle` dispose d’un fichier de tests dédié avec au minimum :
  - Un test "sets title on mount".
  - Un test "updates on change".
  - Un test "falls back to base title".
- Pour chaque page clé suivante, un test RTL vérifie `document.title` après rendu :
  - `/admin/quotes` → `MEMOPYK Devis — Liste des devis`.
  - `/admin/quotes/:id` → `MEMOPYK Devis — Admin — {quote.number}` dans le cas nominal.
  - `/devis/:id` → `MEMOPYK Devis — Éditeur — {quote.number}` dans le cas nominal.
  - `/p/:token` → `MEMOPYK Devis — Devis client — {quote.number}` dans le cas nominal.
- Optionnel (implémenté) :
  - HomePage : `MEMOPYK Devis — Accueil`.
  - AdminDashboardPage : `MEMOPYK Devis — Tableau de bord`.
- Ticket 32 est documenté avec les fichiers de test correspondants, et l’entrée TODO `ticket32-page-title-tests` est marquée comme complétée.

### Implementation Notes
- Hook `usePageTitle` — tests unitaires
  - Fichier : `frontend/src/lib/usePageTitle.test.tsx`.
  - Utilise un composant de test minimal qui appelle `usePageTitle(title)`.
  - Tests :
    - Titre défini au montage (`"MEMOPYK Devis — Test"`).
    - Titre mis à jour après `rerender` avec une nouvelle valeur.
    - Appel avec chaîne vide : fallback vers `"MEMOPYK Devis"` (valeur de base).
- Pages admin — titres
  - `frontend/src/pages/admin/quotes/List.test.tsx` :
    - Ajout d’un test qui mocke `useQuotesList` avec une réponse vide et vérifie `document.title === 'MEMOPYK Devis — Liste des devis'` après rendu.
  - `frontend/src/pages/admin/quotes/Detail.test.tsx` :
    - Ajout d’un test qui mocke `useQuote` avec un devis `number: 'DEV-2025-001'` et vérifie que `document.title === 'MEMOPYK Devis — Admin — DEV-2025-001'`.
- Éditeur et vue publique — titres
  - `frontend/src/pages/quotes/QuoteEditorPage.test.tsx` :
    - Mock de `useQuote` / `useUpdateQuote` pour renvoyer un devis `DEV-2025-002`.
    - Vérifie que `document.title === 'MEMOPYK Devis — Éditeur — DEV-2025-002'` après rendu via `MemoryRouter`.
  - `frontend/src/pages/public/PublicQuoteViewPage.test.tsx` :
    - Mock de `usePublicQuote`, `useAcceptQuoteOnline`, `useQuotePdfJob`, `useRequestQuotePdf`.
    - Fournit un devis public `DEV-2025-003` et une version courante minimale.
    - Vérifie que `document.title === 'MEMOPYK Devis — Devis client — DEV-2025-003'` après rendu.
- Home & Admin dashboard — titres
  - `frontend/src/pages/HomePage.test.tsx` :
    - Rend `HomePage` dans un `MemoryRouter` et vérifie `document.title === 'MEMOPYK Devis — Accueil'`.
  - `frontend/src/pages/admin/AdminDashboardPage.test.tsx` :
    - Rend `AdminDashboardPage` dans un `MemoryRouter` et vérifie `document.title === 'MEMOPYK Devis — Tableau de bord'`.

## TODO / Open Items

- [x] ticket28-validity-validation — Completed
- [x] ticket29-editorial-blocks — Completed
- [x] ticket30-frontend-polish — Completed
- [x] ticket31-page-titles — Completed
- [x] ticket32-page-title-tests — Completed
