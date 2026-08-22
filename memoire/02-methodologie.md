# Méthodologie

## Recommandation : design mixte à cas multiples enchâssés

**Pourquoi pas du purement quantitatif** : sur les marchés africains, les variables les plus intéressantes — marge de dette, ténor, structure de garantie — sont rarement publiques. Un échantillon exploitable dépasse difficilement 150–250 transactions, dont peut-être 40 avec pricing complet. Trop peu pour une identification causale sérieuse, et la sélection sur les seuls deals ayant atteint le financial close est un biais fatal si on prétend au causal.

**Pourquoi pas du purement qualitatif** : la question porte sur un *mécanisme avec effets mesurables* (SQ2). Sans données de transactions, le mémoire retomberait dans la narration descriptive que la revue reproche déjà à la littérature comparative existante.

**Le mixte est donc structurel, pas cosmétique** : le volet quantitatif établit le *pattern* (la corrélation régionale et sponsor), le volet qualitatif établit le *mécanisme* (pourquoi et comment le prêteur change d'avis). Les deux répondent à des sous-questions différentes. Formuler ce point explicitement en Chapitre 4 — c'est ce qui distingue un mixte défendable d'un mixte de façade.

---

## Volet 1 — Base de transactions

### Population
Projets **greenfield** d'énergie renouvelable (solaire PV, éolien terrestre, CSP, stockage sur batterie ; **hydro à exclure** — profil de risque et durée de développement non comparables) en Afrique, ayant atteint le **financial close entre 2015 et 2025**, financés en project finance à recours limité.

Coupe temporelle : **2015–2021 vs 2022–2025** pour tester P3.

### Taille cible
150–250 transactions. En dessous de 100, abandonner l'inférence et se rabattre sur du descriptif + davantage de cas.

### Variables

**Identification** : nom du projet, pays, région (AdN / ASS), technologie, capacité MW, date de signature du PPA, date de financial close, date de mise en service.

**Variable dépendante principale**
- `time_to_FC` = mois entre signature PPA et financial close → modèle de survie
- `leverage` = dette / capitalisation totale
- `tenor` = maturité de la dette senior en années
- `dfi_share` = part DFI dans la dette senior totale
- `spread` = marge sur base rate *(disponible sur un sous-échantillon seulement — analyse secondaire)*

**Variable explicative principale**
- `sponsor_type` : {PE infrastructure spécialisé, développeur stratégique/IPP, utility, plateforme DFI, développeur local, mixte}
- `sponsor_experience` : nombre de projets antérieurs ayant atteint le FC en Afrique par ce sponsor (proxy de réputation, dans l'esprit d'Esty 2002)
- `pe_backed` : binaire, capture l'effet principal

**Contrôles**
- `deal_size` (USD), `capacity_mw`, `technology`, `country_risk` (notation souveraine ou spread EMBI à la date du FC), `offtaker_type` (utility publique / souverain / corporate PPA), `procurement` (enchère / gré à gré / FiT), `guarantee` (présence de PRI, PRG, garantie souveraine — codée par instrument), `esg_standard` (IFC PS appliqués / Equator Principles / national uniquement), `year`, `usd_rate` (SOFR ou Treasury 10 ans au FC, capte le choc post-2022)

### Sources — par ordre d'accessibilité

**Gratuit, à faire en premier**
1. **World Bank PPI Database** (ppi.worldbank.org) — la source la plus importante si vous n'avez pas d'abonnement commercial. Couverture des projets d'infrastructure à participation privée dans les pays en développement, avec date de FC, capacité, sponsors, structure de financement. Export CSV libre. **C'est le socle du plan B.**
2. **IRENA Renewable Capacity Statistics + IRENA/CPI Global Landscape of Renewable Energy Finance**
3. **Rapports annuels DFI** : IFC, AfDB, EBRD, EIB, BII, Proparco, FMO, DEG, Norfund, OPIC/DFC. Les *project summary documents* de l'IFC et les *Project Summary Information* de la BERD donnent structure de dette, sponsors et parfois ténor. Fastidieux mais public et fiable.
4. **MIGA et ATIDI** : listes de contrats de garantie émis, par projet.
5. **AVCA** : rapports annuels d'activité — cadrage agrégé, pas de données transaction par transaction.
6. **Communiqués de presse des sponsors** (Actis, AIIM, Meridiam, Helios, Inspired Evolution, Scatec, Voltalia, Acwa Power, Globeleq) et des conseils juridiques (Clifford Chance, Trinity, White & Case, Norton Rose publient des annonces de deals détaillées).
7. **Convergence Blended Finance** — base de deals blended, accès partiel gratuit.

**Payant — à vérifier auprès de la bibliothèque SKEMA**
- **IJGlobal** — la référence sur les transactions project finance, avec pricing. Si accessible, tout le volet quantitatif s'en trouve transformé.
- **LSEG/Refinitiv Project Finance International**, **Preqin** (côté fonds PE), **Inframation/Infralogic**.

> **Action prioritaire n°1** : contacter la bibliothèque/le learning centre SKEMA cette semaine pour savoir si IJGlobal ou Refinitiv PFI sont dans les abonnements. Toute la faisabilité du volet quantitatif en dépend.

### Stratégie analytique
1. Descriptif : distributions, comparaison AdN/ASS, évolution temporelle
2. Tests de moyennes / Kruskal-Wallis par type de sponsor et par région
3. **Modèle de survie de Cox** sur `time_to_FC` — méthode adaptée, gère la censure (projets annoncés jamais bouclés) et c'est la variable dépendante la plus défendable
4. OLS sur `leverage` et `dfi_share`, erreurs robustes clusterisées par pays
5. Interactions : `sponsor × post2022`, `sponsor × guarantee`, `sponsor × region`
6. Robustesse : exclusion de l'Afrique du Sud (elle domine l'échantillon ASS et peut porter à elle seule tous les résultats — **vérification indispensable**), exclusion du CSP, spécifications alternatives

### Limites à énoncer honnêtement
- **Biais de sélection sur le survivant** : seuls les deals ayant atteint le FC sont observés. Atténuation partielle : recenser les projets annoncés et abandonnés via les bases de pipeline et la presse, et les traiter comme observations censurées dans le modèle de survie. C'est la réponse méthodologique la plus solide disponible.
- **Endogénéité du choix de sponsor** : les bons sponsors sélectionnent les bons projets. Sans instrument, les résultats sont **associatifs, pas causaux**. À écrire noir sur blanc — un jury pardonne une limite assumée, pas une causalité surclamée.
- **Données de pricing lacunaires** → l'analyse sur les marges est secondaire et exploratoire.
- **Petit N en Afrique du Nord** (le Maroc et l'Égypte concentrent peu de transactions, mais de grande taille) → la comparaison régionale s'appuie autant sur les cas que sur les régressions.

---

## Volet 2 — Entretiens semi-directifs

**Cible** : 12 à 15 entretiens, 45–60 minutes, si l'accès le permet. En dessous de 8, présenter le volet comme illustratif et non comme saturant.

**Échantillonnage raisonné, quatre profils** :
1. Sponsors PE infrastructure (Actis, AIIM, Meridiam, Helios, Inspired Evolution, Africa50)
2. Prêteurs et investisseurs DFI (IFC, Proparco, BII, FMO, AfDB) — chargés de crédit, pas communication
3. Conseils juridiques project finance et lender's technical advisers
4. Assureurs risque politique (MIGA, ATIDI) et développeurs indépendants

**Guide d'entretien — quatre blocs** :
- A. Séquence de développement : quels jalons débloquent quoi, et à quelle date
- B. Ce que le prêteur regarde chez le sponsor — au-delà du bilan
- C. Ce qui a changé depuis 2022 : taux, détresse souveraine, FX
- D. Différences perçues entre Afrique du Nord et subsaharienne

**Traitement** : enregistrement avec consentement écrit, anonymisation (« Interviewee 3, DFI credit officer »), codage thématique (Gioia ou codage ouvert/axial), triangulation systématique avec les données de transactions. Grille complète en annexe.

**Conformité** : formulaire de consentement, conformité RGPD, approbation éthique SKEMA si la procédure l'exige — à vérifier tôt.

---

## Volet 3 — Études de cas

Sélection **appariée**, pour que la comparaison isole la variable régionale :

| Afrique du Nord | Afrique subsaharienne | Ce que la paire isole |
|---|---|---|
| **Noor Ouarzazate** (Maroc, CSP) | **Redstone / Kathu** (Afrique du Sud, CSP) | Même technologie, garantie souveraine vs enchère REIPPPP |
| **Benban** (Égypte, solaire, FiT) | **Scaling Solar Sénégal** ou **Zambie** | Solaire utility-scale, FiT vs package standardisé IFC |
| — | **Lake Turkana Wind** (Kenya) ou une plateforme **Globeleq / AIIM** | Le rôle de constructeur de plateforme, sans équivalent nord-africain |

Grille d'analyse identique pour chaque cas : chronologie du développement, structure de l'actionnariat et de la dette, séquence des jalons, instruments de mitigation mobilisés, traitement ESG, issue et refinancement le cas échéant. Les cas doivent **alimenter le Chapitre 3** (le modèle de transfert séquentiel), pas seulement illustrer le Chapitre 5.
