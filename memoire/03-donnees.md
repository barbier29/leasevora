# Sources de données — fiches pratiques

## A. À faire cette semaine (bloquant pour la suite)

1. **Vérifier les abonnements SKEMA** : IJGlobal, LSEG/Refinitiv Project Finance International, Preqin, Infralogic, Bloomberg. Passer par le learning centre. → détermine le scénario A ou B ci-dessous.
2. **Télécharger la World Bank PPI Database** (gratuit, immédiat) et filtrer : secteur Electricity, sous-secteur Renewables, région Sub-Saharan Africa + Middle East & North Africa, FC 2015–2025. Cela donne en une heure une idée du N réellement atteignable.
3. **Lancer les demandes d'entretien** — délai de réponse typique 2 à 4 semaines. À faire avant toute rédaction.

---

## B. Deux scénarios

### Scénario A — accès à IJGlobal ou Refinitiv PFI
Volet quantitatif complet, avec pricing. N attendu 200–300. Les quatre propositions sont testables, y compris sur les marges. C'est le mémoire dans sa version forte.

### Scénario B — sources publiques uniquement
Base construite à la main à partir de PPI + documents DFI + communiqués. N attendu 100–150, pricing quasi absent.
**Adaptations** :
- Abandonner `spread` comme variable dépendante ; se concentrer sur `time_to_FC`, `leverage`, `dfi_share` — toutes trois reconstituables depuis les sources publiques.
- Renforcer le volet cas : 6 cas au lieu de 4, avec une grille plus fine.
- Repositionner la contribution : le mémoire produit alors **un jeu de données original construit à la main sur des sources publiques**, ce qui est en soi une contribution défendable devant un jury — à condition de documenter le protocole de construction en annexe (règles de codage, arbitrages, sources par transaction).

Le scénario B reste un bon mémoire. Ne pas l'aborder comme un repli mais comme un design assumé.

---

## C. Sources publiques, détail

| Source | Contenu | Accès | Utilité |
|---|---|---|---|
| **World Bank PPI Database** | Projets infra à participation privée : FC, capacité, sponsors, sources de financement | Gratuit, export CSV | **Socle de la base** |
| **IFC Disclosure Portal** | Project Summary Documents : structure, montants, sponsors, catégorie E&S | Gratuit | Structure de dette, ESG |
| **EBRD Project Summary Documents** | Idem, avec ténor souvent indiqué | Gratuit | Égypte, Maroc surtout |
| **AfDB Project Portal** | Documents d'évaluation de projet | Gratuit | ASS |
| **BII / Proparco / FMO / DEG / Norfund** | Bases d'investissements, montants et dates | Gratuit | Part DFI |
| **MIGA Projects** | Contrats de garantie émis, par projet et par risque couvert | Gratuit | Codage `guarantee` |
| **ATIDI** | Rapports annuels, transactions couvertes | Gratuit | Codage `guarantee` |
| **Convergence** | Base de deals blended finance | Partiellement gratuit | Blended, ratios de mobilisation |
| **IRENA** | Capacités installées, coûts (LCOE) | Gratuit | Contrôles, contexte |
| **AVCA** | Rapports d'activité private capital Afrique | Gratuit sur inscription | Cadrage agrégé, section 4 |
| **IEA Africa Energy Outlook** | Flux d'investissement | Gratuit | Contexte post-2022 |
| **World Bank RISE / Doing Business archives** | Qualité du cadre réglementaire énergie | Gratuit | Contrôle institutionnel |
| **IMF WEO / Regional Economic Outlook SSA** | Notations, EMBI, détresse souveraine | Gratuit | `country_risk`, argument post-2022 |
| **Communiqués sponsors et cabinets d'avocats** | Détail transaction par transaction | Gratuit | Comblement des trous |

---

## D. Structure de fichier proposée

`data/transactions.csv` — une ligne par transaction, une colonne `source_url` **par variable financière**. Sans traçabilité des sources, la base n'est pas défendable en soutenance et impossible à corriger à trois semaines du rendu.

Champs minimaux :

```
project_id, project_name, country, region, technology, capacity_mw,
ppa_signature_date, financial_close_date, cod_date,
total_cost_usd, debt_usd, equity_usd, leverage, tenor_years, spread_bps,
sponsor_1, sponsor_2, sponsor_3, sponsor_type, pe_backed, sponsor_prior_deals,
lender_list, dfi_debt_usd, dfi_share, commercial_debt_usd,
offtaker, offtaker_type, procurement_type, tariff_usd_kwh,
guarantee_pri, guarantee_prg, guarantee_sovereign, guarantee_provider,
esg_standard, ifc_ps_applied,
source_url_financials, source_url_sponsors, source_url_guarantees, notes
```

---

## E. Points de vigilance sur la construction

- **Dates de financial close** : les sources divergent souvent de plusieurs mois (signature vs premier tirage). Fixer une règle unique et l'appliquer partout ; documenter l'arbitrage.
- **Taille de deal** : distinguer coût total du projet et montant financé. Ne pas mélanger.
- **Sponsors multiples** : la plupart des deals ont 2 à 4 sponsors. Règle proposée pour `sponsor_type` : type du **détenteur majoritaire de l'equity au FC** ; conserver la liste complète en colonnes séparées pour les tests de robustesse.
- **Afrique du Sud** : elle représentera probablement 30–40 % de l'échantillon ASS via le REIPPPP. Tourner systématiquement les modèles avec et sans, et rapporter les deux.
- **Deals en devise locale** (surtout Afrique du Sud, rands) : convertir au taux du jour du FC, et le signaler — c'est précisément le point FX de la section 9.
