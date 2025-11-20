### Ticket 9 – Admin Panel Enhancements (Frontend)

- **Step 4 – Admin catalog & branding UI (COMPLETED)**

  - **/admin/tax-rates**
    - Liste les taux de TVA actifs exposés par l’API admin (`GET /v1/admin/tax-rates`).
    - Permet d’ajouter un taux (`POST /v1/admin/tax-rates`) et de modifier un taux existant (`PATCH /v1/admin/tax-rates/:id`).
    - Affiche le taux en **%** et un badge “Par défaut” pour le taux marqué `is_default`.
    - **How to test**
      1. Ouvrir l’espace admin : `/admin/tax-rates` (backend Node démarré).
      2. Cliquer sur “Ajouter un taux”, saisir un nom, un code et un taux (ex. 20 %) puis enregistrer → le taux apparaît dans le tableau.
      3. Cliquer sur “Modifier” sur une ligne, changer le taux ou le flag “Par défaut” puis enregistrer → le tableau se met à jour.
      4. Forcer une erreur de validation (ex. effacer nom + code, ou saisir un taux non numérique) → un message d’erreur local s’affiche.
      5. En cas d’erreur API `validation_error` ou `tax_rate_code_conflict`, le message est surfacé sous le formulaire.

  - **/admin/products**
    - Liste les produits actifs avec `internal_code`, nom, prix unitaire HT formaté, taux de TVA par défaut (nom) et badge “Actif”.
    - Permet de créer (`POST /v1/admin/products`) et modifier (`PATCH /v1/admin/products/:id`) un produit.
    - Le champ “Prix unitaire HT” est saisi en **euros** puis converti en `default_unit_price_cents` côté API.
    - Le champ “Taux de TVA par défaut” propose les taux issus de `GET /v1/admin/tax-rates`.
    - **How to test**
      1. Ouvrir `/admin/products` avec le backend en marche.
      2. Cliquer sur “Ajouter un produit”, saisir un nom, un éventuel code interne, un prix en euros et choisir un taux de TVA → valider → la nouvelle ligne apparaît dans le tableau.
      3. Modifier un produit existant (prix, description, taux de TVA) puis enregistrer → la ligne est mise à jour.
      4. Tenter de soumettre sans nom ou avec un prix négatif → message d’erreur local.
      5. Si l’API renvoie `validation_error` ou `invalid_tax_rate_id`, le message d’erreur est affiché sous le formulaire.

  - **/admin/branding**
    - Formulaire unique connecté à `GET /v1/admin/branding` et `POST /v1/admin/branding`.
    - Champs : `company_name`, `logo_url`, `primary_color`, `secondary_color`, `pdf_footer_text`, `default_validity_days`, `default_deposit_pct`.
    - Les valeurs numériques sont validées côté frontend (jours ≥ 0, acompte 0–100) puis envoyées à l’API.
    - **How to test**
      1. Ouvrir `/admin/branding` avec le backend en marche.
      2. Vérifier que les champs sont préremplis si une configuration existe déjà, sinon vides.
      3. Modifier le nom de la société, les couleurs ou le texte de pied de page puis cliquer sur “Enregistrer le branding” → un message de succès apparaît.
      4. Saisir un nombre de jours négatif ou un pourcentage d’acompte hors [0 ; 100] → erreur locale, aucun appel API n’est envoyé.
      5. En cas d’erreur API `validation_error`, le message dédié est affiché sous le formulaire.

- **Step 5 – Branding defaults in new quote form (COMPLETED)**

  - **/admin/quotes/new (Nouveau devis)**
    - La page de création de devis utilise désormais `useAdminBranding()` pour récupérer la configuration de branding courante (`GET /v1/admin/branding`).
    - Affiche, au-dessus du formulaire, des astuces en lecture seule lorsque des defaults sont configurés :
      - `Validité par défaut : X jours` si `default_validity_days` est défini.
      - `Acompte par défaut : Y %` si `default_deposit_pct` est défini.
    - Le payload envoyé à `POST /v1/quotes` **reste inchangé** :
      - `title`, `customer_name`, `notes`, `currency`, `lines[...]` uniquement.
      - Aucun champ supplémentaire `valid_until` ou `deposit_pct` n’est envoyé par la page de création.
    - Les defaults de validité / acompte sont appliqués côté backend (voir Step 5 backend) uniquement lorsque ces champs sont absents du payload.

  - **How to test**
    1. Depuis `/admin/branding`, configurer un branding avec `default_validity_days = 30` et `default_deposit_pct = 50`, puis enregistrer.
    2. Ouvrir `/admin/quotes/new` : vérifier que les textes “Validité par défaut : 30 jours” et “Acompte par défaut : 50 %” apparaissent dans le bandeau d’information.
    3. Renseigner un titre et un client puis créer le devis ; être redirigé vers la page de détail / éditeur et vérifier que la date de validité et l’acompte sont bien cohérents avec ces defaults (via l’API ou la vue publique, selon le flux existant).
    4. Supprimer la configuration de branding ou mettre `default_validity_days` / `default_deposit_pct` à `null`, recharger `/admin/quotes/new` : constater que les astuces n’apparaissent plus mais que la création de devis fonctionne toujours.
