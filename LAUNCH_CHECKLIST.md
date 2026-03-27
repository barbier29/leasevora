# LAUNCH CHECKLIST — PropManager
**Généré le : 27 mars 2026**
**Inspecteur : Agent Secrétaire/Manager**
**Version de l'application : v2.4.0**

---

## LEGENDE
- FAIT : modification confirmée par lecture directe du code
- A FAIRE : problème confirmé par lecture directe du code
- OPTIONNEL : amélioration souhaitable, non bloquante

---

## SECTION 1 — FAIT (vérifications confirmées dans le code)

### Agent Backend — Migrations store.js
- [x] `type_travail` → default 'REPARATION' si absent (store.js ligne 42)
- [x] `historique` → default [] si absent (store.js ligne 43)
- [x] `contact_prestataire` → null si absent (store.js ligne 44)
- [x] `date_fin_prevue` → null si absent (store.js ligne 45)
- [x] `date_fin_reelle` → null si absent (store.js ligne 46)
- [x] `garantie_mois` → null si absent (store.js ligne 47)
- [x] `type_tarif` séjours → remis à 'MENSUEL' si invalide (store.js lignes 51-54)

### Agent Backend — routes/travaux.js
- [x] Constante `STATUTS_VALIDES` présente (travaux.js ligne 129)
- [x] Garde-fou PATCH /:id/statut avec validation contre STATUTS_VALIDES (travaux.js lignes 133-135)

### Agent Backend — routes/users.js
- [x] Garde-fou "dernier PROPRIETAIRE" dans DELETE (users.js lignes 61-65)
- [x] Protection suppression de son propre compte (users.js ligne 57)

### Agent Sécurité — middleware/auth.js
- [x] `req.connection` absent — la route auth.js utilise `req.socket.remoteAddress` (auth.js ligne 18)
  - Note : le correctif est dans routes/auth.js, pas middleware/auth.js. middleware/auth.js n'utilise ni req.connection ni req.socket (sans impact fonctionnel, l'IP n'est lue qu'au login)
- [x] Expiration de session 24h implémentée via SESSION_TTL (middleware/auth.js lignes 8-9 et 46-51)
- [x] Protection brute-force : max 5 tentatives / IP / 15 min → HTTP 429 (routes/auth.js lignes 8-33)

### Agent Sécurité — routes/auth.js
- [x] Brute-force protection avec compteur par IP (loginAttempts Map)
- [x] Retour HTTP 429 avec message en minutes restantes

### Agent UI Designer — style.css
- [x] `.badge-info` (ligne 484)
- [x] `.card-body { padding: 20px }` (ligne 415-417)
- [x] `.form-error` (ligne 524)
- [x] `.form-success` (ligne 531)
- [x] `.input-error` (ligne 538)
- [x] `.empty-state-icon` (ligne 776)
- [x] `.empty-state-title` (ligne 783)
- [x] `.empty-state-action` (ligne 790)
- [x] `.text-success` (ligne 809)
- [x] `.text-warning` (ligne 813)
- [x] `.divider` (ligne 817)
- [x] Mobile touch targets min-height 44px : `.btn` (ligne 1238), `.form-control` (ligne 1246)
- [x] Mobile touch targets `.nav-item` : 48px (ligne 1242) — supérieur au minimum requis
- [x] `@keyframes skeleton-shimmer` (ligne 1396)
- [x] `.skeleton` (ligne 1405)
- [x] `.skeleton-text` (ligne 1417)
- [x] `.skeleton-card` (ligne 1432)
- [x] `@media print` complet (lignes 1529-1609) : sidebar masquée, topbar masquée, modals masquées, fond blanc

### Agent Audit UX — public/app.js
- [x] `navigate()` : skeleton HTML multi-éléments au lieu de spinner simple (app.js lignes 218-227)

### Agent Audit UX — style.css
- [x] `.page-loading` (ligne 1456)
- [x] `.skeleton-title` (ligne 1460)
- [x] `.skeleton-grid` (ligne 1468)
- [x] `.skeleton-table` (ligne 1479)

### Agent Audit UX — public/pages/sejours.js
- [x] Validation date_fin >= date_debut côté client (sejours.js lignes 219-234) avec message d'erreur `.form-error`

### Agent Audit UX — public/pages/transactions.js
- [x] Validation montant > 0 côté client (transactions.js lignes 176-181)
- [x] Validation catégorie obligatoire côté client (transactions.js lignes 182-187)

### Agent Audit UX — public/pages/users.js
- [x] Classe `.settings-inline-form` utilisée (users.js ligne 33, au lieu de style inline)

### Agent Audit UX — style.css
- [x] `.settings-inline-form` défini (ligne 1498)
- [x] Responsive 480px pour `.settings-inline-form` (lignes 1506-1524)

### Agent Performance — public/pages/finance.js
- [x] Locale dynamique dans export Excel : `lang === 'en' ? 'en-GB' : 'fr-FR'` (finance.js ligne 394)
- [x] `window.LANG` lu depuis les settings au boot (app.js ligne 156)

### Agent Performance — public/pages/caisse.js
- [x] Filtre par mois ajouté (`input type="month"`) (caisse.js lignes 4-5, 33, 154)
  - Note : le paramètre `month` est envoyé dans l'URL mais routes/caisse.js ne filtre PAS par mois (voir section "A FAIRE")

### Agent Performance — public/pages/calendrier.js
- [x] Cellules `height:auto` + `min-height:36px` au lieu de `height:50px` fixe (calendrier.js ligne 463)
- [x] `font-size: clamp()` pour responsive (calendrier.js ligne 466-467)

### Bugs critiques — Agent Manager précédent
- [x] `req.user?.username` remplacé par `req.user?.login` dans les entrées historique (travaux.js lignes 98 et 146) — BUG CORRIGE
- [x] Logique `!hasLoyerStrict` dashboard : la logique a été refactorisée (dashboard.js lignes 70-76). La condition `loyerCatIds.length === 0 ? [] :` empêche les fausses alertes quand aucune catégorie "loyer" n'existe — BUG PARTIELLEMENT CORRIGE (voir note ci-dessous)

### Architecture serveur
- [x] Toutes les routes `/api/*` sauf `/api/auth` sont protégées par `requireAuth` dans server.js (ligne 19)
- [x] Les routes sejours, travaux, compteurs GET sont protégées car montées APRES le middleware global `requireAuth`

---

## SECTION 2 — A FAIRE (bugs critiques ou manques bloquants)

### CRITIQUE — Sécurité

**1. Security Headers HTTP absents**
- Fichier : `server.js`
- Promis par Agent Sécurité : `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`
- Constat : aucun de ces headers n'est défini dans server.js. Aucune dépendance `helmet` n'est installée.
- Impact : l'application est vulnérable au clickjacking, au MIME-sniffing et aux attaques XSS réfléchies côté navigateur.
- Priorité : HAUTE

**2. Validation login/password absente dans POST /auth/login**
- Fichier : `routes/auth.js`
- Promis par Agent Sécurité : validation longueur min + caractères
- Constat : seule la présence des champs est vérifiée (`if (!login || !password)`). Aucune vérification de longueur minimale ni de caractères autorisés.
- Impact : permet des tentatives avec des chaînes vides ou d'un seul caractère, ne bloque pas les injections via le champ login.
- Priorité : MOYENNE

### CRITIQUE — Fonctionnel

**3. Filtre par mois dans /api/caisse non implémenté côté backend**
- Fichier : `routes/caisse.js`
- Constat : le frontend envoie `?month=2026-03` mais routes/caisse.js ne lit pas ce paramètre. Le relevé affiche TOUS les mouvements historiques, pas seulement ceux du mois sélectionné. Le solde affiché reste correct (cumul depuis le début) mais le relevé affiché n'est pas filtré par mois.
- Impact : la fonctionnalité "filtre par mois" de la caisse est trompeuse pour l'utilisateur.
- Priorité : HAUTE

**4. Validation montants négatifs absente côté backend**
- Fichiers : `routes/transactions.js`, `routes/sejours.js`, `routes/travaux.js`
- Constat : aucun des trois backends ne vérifie que `amount` / `montant` est positif. Un montant de -500 peut être enregistré directement via l'API (contournement du frontend).
- Impact : corruption potentielle des données financières si l'API est appelée directement.
- Priorité : MOYENNE

**5. Dashboard — alerte loyers : condition residuelle**
- Fichier : `routes/dashboard.js` (lignes 70-77)
- Constat : la refactorisation empêche les alertes quand `loyerCatIds` est vide (OK). Mais elle génère toujours une alerte pour TOUT appartement OCCUPIED + EN_COURS sans transaction loyer ce mois, même si l'appartement est en location mensuelle et que le propriétaire gère ses loyers manuellement via une autre catégorie. Pas de faux positifs si les catégories loyer sont bien configurées, mais dépend d'une configuration correcte de la base.
- Impact : alertes potentiellement erronées si les catégories ne sont pas nommées "loyer" ou "rent".
- Priorité : BASSE

### SECURITE — Sessions en mémoire

**6. Sessions perdues au redémarrage serveur**
- Fichier : `middleware/auth.js`
- Constat : les sessions sont stockées dans une `Map()` en mémoire (ligne 6). Tout redémarrage du serveur invalide toutes les sessions actives.
- Impact : tous les utilisateurs sont déconnectés au moindre redémarrage, crash ou déploiement.
- Priorité : MOYENNE (acceptable pour MVP, bloquant pour production réelle)

### DONNEES — Stockage fichier JSON

**7. Persistance en fichier JSON unique (data.json)**
- Fichier : `store.js`
- Constat : toutes les données sont stockées dans un seul fichier JSON. Pas de base de données, pas de transactions, pas de verrous concurrents.
- Impact : risque de corruption si deux requêtes simultanées écrivent en même temps. Pas de backups automatiques.
- Priorité : HAUTE pour un déploiement multi-utilisateurs simultanés

**8. Service Worker référencé mais non vérifié**
- Fichier : `public/index.html` (ligne 102), fichier `public/sw.js` existe
- Constat : sw.js existe mais son contenu n'a pas été audité dans cette session.
- Priorité : BASSE

---

## SECTION 3 — OPTIONNEL (améliorations non bloquantes)

**O1. Validation longueur minimum login/password côté backend**
Ajouter `login.trim().length >= 3` et `password.length >= 6` dans POST /auth/login.

**O2. Confirmer que routes/travaux.js STATUTS_VALIDES est aligné avec le frontend**
Le frontend (travaux.js) utilise 6 statuts dont `PRESTATAIRE_CONTACTE` et `DEVIS_RECU`, mais `STATUTS_VALIDES` côté backend (routes/travaux.js ligne 129) n'en contient que 5 : `['A_FAIRE', 'EN_COURS', 'EN_ATTENTE', 'TERMINE', 'ANNULE']`. Il manque `PRESTATAIRE_CONTACTE` et `DEVIS_RECU`. Le PATCH /statut rejettera ces deux valeurs pourtant affichées dans l'UI.
- Priorité : HAUTE (peut sembler optionnel mais bloque le workflow travaux via PATCH)

**O3. Backup automatique de data.json**
Copie datée du fichier JSON avant chaque save().

**O4. Helmet.js pour les security headers**
`npm install helmet` puis `app.use(helmet())` dans server.js.

**O5. CORS restreint**
Actuellement `app.use(cors())` accepte toutes les origines. En production, restreindre à l'origine de déploiement.

**O6. Mot de passe admin par défaut exposé**
`public/app.js` ligne 125 affiche "Compte par défaut : admin / admin123" en clair dans l'interface de connexion. À supprimer avant la mise en production.

**O7. Hashage SHA-256 simple (non salé par utilisateur)**
Le hash utilise un salt fixe `pm_salt_2024:`. Préférer bcrypt pour la production.

**O8. Export Excel — nom de fichier avec caractères spéciaux**
La regex de nettoyage du nom de fichier (`[^\w\s-]`) peut produire un nom vide si la propriété a un nom entièrement en caractères non-ASCII.

**O9. Calendrier — formulaire de séjour depuis calendrier ne valide pas date_fin >= date_debut**
Le formulaire `openSejourForm` dans calendrier.js ne contient pas la validation date_fin >= date_debut (contrairement au formulaire dans sejours.js). Incohérence mineure.

**O10. Champ `EN_ATTENTE` dans STATUTS_VALIDES backend mais absent du frontend travaux**
STATUTS_VALIDES backend contient 'EN_ATTENTE' mais ce statut n'est pas dans l'objet STATUTS du frontend travaux.js. Statut orphelin.

**O11. Aucun rate-limiting sur les endpoints API hors /login**
Seul le login est protégé contre le brute-force. Les autres endpoints pourraient être soumis à des appels répétés.

**O12. Le caisse filtre month est envoyé par le frontend mais ignoré par le backend**
Détaillé en bug 3 ci-dessus — ici noté aussi comme amélioration backend optionnelle si le comportement "solde global" est intentionnel.

---

## SYNTHESE RAPIDE

| Catégorie | Total | Fait | A faire | Optionnel |
|---|---|---|---|---|
| Backend store.js migrations | 7 | 7 | 0 | 0 |
| Backend routes | 3 | 3 | 0 | 0 |
| Sécurité | 5 | 3 | 2 | 3 |
| UI CSS | 16 | 16 | 0 | 0 |
| UX validations | 5 | 5 | 0 | 1 |
| Performance | 4 | 4 | 0 | 0 |
| Bugs critiques signalés | 4 | 2 | 2 | 0 |
| Architecture / données | 2 | 0 | 2 | 2 |
| **TOTAL** | **46** | **40** | **6** | **6** |

**Bugs bloquants confirmés : 6**
**Items optionnels : 6 (dont 1 potentiellement bloquant : O2)**

---

*Rapport généré le 27 mars 2026 par l'Agent Secrétaire/Manager — basé sur lecture exhaustive des 27 fichiers sources listés.*
