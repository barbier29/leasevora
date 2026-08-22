# Plan détaillé du mémoire

**Cible** : ~20 000 mots hors bibliographie et annexes (à ajuster selon la norme SKEMA).
**Langue** : anglais.
**Style** : APA 7 (continuité avec la revue de littérature).

---

## Question de recherche

> **How does private equity sponsorship transform greenfield renewable energy projects in Africa into bankable propositions under post-2022 macro-financial stress, and how does this transformation differ between North African and Sub-Saharan African ecosystems?**

### Sous-questions

- **SQ1 — Mécanisme.** Par quels canaux concrets l'equity PE absorbe-t-elle le risque de la phase de développement (coûts irrécupérables, réputation, capacité technique, itération sur les termes) ?
- **SQ2 — Effet mesurable.** Cette absorption se traduit-elle par des conditions de dette observablement meilleures : levier, ténor, marge, part DFI, délai jusqu'au financial close ?
- **SQ3 — Interaction.** Les instruments publics (PRI, garanties partielles, concessionnel) sont-ils **substituts** ou **compléments** de la qualité du sponsor ? Le choc post-2022 a-t-il modifié cet arbitrage ?
- **SQ4 — Comparaison.** Le PE remplit-il une fonction différente en Afrique du Nord (co-investisseur dans des enchères adossées au souverain) et en Afrique subsaharienne (constructeur de plateforme et porteur de risque) ? Avec quelles conséquences sur la mobilisation de dette ?

---

## Propositions testables

| # | Proposition | Test |
|---|---|---|
| **P1** | Un sponsor PE infrastructure spécialisé (vs stratégique, utility, ou développeur local) est associé à un **délai jusqu'au financial close plus court** et à un **levier plus élevé**, à technologie, taille et pays contrôlés. | Modèle de survie (Cox) sur le délai PPA → FC ; OLS sur D/E |
| **P2** | La fonction du PE diverge par région : en AdN, part DFI plus faible et levier plus élevé (le souverain porte le risque off-taker) ; en ASS, part DFI et incidence des garanties nettement supérieures. | Comparaison de moyennes + interaction région × type de sponsor |
| **P3** | Publics et privés sont **complémentaires, non substituables** : la présence d'une garantie n'annule pas l'effet sponsor. Et l'effet marginal de la qualité du sponsor **augmente après 2022**. | Terme d'interaction sponsor × garantie ; interaction sponsor × période post-2022 |
| **P4** | La maturité ESG au stade développement (ESAP conforme IFC PS, standards de prêteurs appliqués) réduit le délai jusqu'au FC. | Variable ordinale ESG dans le modèle de survie ; triangulation par entretiens |

**Contre-hypothèse à traiter explicitement** (Gabor 2021 ; Bayliss & Van Waeyenberge 2018 ; Léon 2025) : la synergie observée n'est pas une création de valeur mais un **transfert de risque vers le public et les consommateurs**, où le PE capte le rendement pendant que garanties souveraines et concessionnel absorbent la queue de distribution. Un mémoire qui ignore cette lecture sera jugé promotionnel. Elle doit avoir sa section en Discussion, et si possible un test : les deals à fort soutien public affichent-ils des **tarifs plus élevés** ou une exposition budgétaire supérieure ?

---

## Structure

### Chapter 1 — Introduction *(~1 500 mots)*
Contexte (transition énergétique africaine, déficit d'infrastructure, resserrement post-2022), énoncé du problème, question de recherche et sous-questions, contributions académique et pratique, périmètre et limites, plan du mémoire.

### Chapter 2 — Literature Review *(~4 500 mots)*
Reprise de la revue existante, **restructurée en entonnoir** plutôt qu'en huit sections juxtaposées :
- 2.1 Théorie du project finance et concept de bankability
- 2.2 Le PE infrastructure comme classe d'actifs — des marchés matures aux frontières
- 2.3 Le contexte africain : réforme du secteur électrique, IPPs, coût du capital
- 2.4 Architecture de de-risking : instruments publics et blended finance
- 2.5 ESG comme condition d'accès à la dette *(à étoffer — section la plus mince)*
- 2.6 Lectures critiques : financiarisation et Wall Street Consensus *(section nouvelle)*
- 2.7 Synthèse et gap

Intégrer ici les corrections et les références manquantes listées dans `00-etat-des-lieux.md`.

### Chapter 3 — Conceptual Framework *(~1 500 mots)*
Le modèle du **transfert séquentiel de risque** en trois étapes (développement → construction → opération/refinancement), formalisé en schéma. Qui porte quel risque à quel stade, et quel instrument couvre quoi. Dérivation des quatre propositions. C'est le chapitre qui fait la contribution originale : la revue le décrit en prose, le mémoire doit en faire un cadre analytique explicite.

### Chapter 4 — Methodology *(~2 000 mots)*
Voir `02-methodologie.md`. Design mixte à cas multiples enchâssés, construction de l'échantillon, variables, sources, protocole d'entretiens, stratégie analytique, validité et biais.

### Chapter 5 — Quantitative Findings *(~3 000 mots)*
Statistiques descriptives du portefeuille de transactions, comparaison AdN/ASS, résultats des modèles, coupe pré/post-2022. Tableaux et graphiques.

### Chapter 6 — Case Studies *(~3 500 mots)*
4 à 6 cas appariés, même grille d'analyse pour chacun. Voir `03-donnees.md` pour la sélection.

### Chapter 7 — Discussion *(~2 500 mots)*
- 7.1 Retour sur les quatre propositions
- 7.2 Le PE comme couche d'ingénierie du risque en amont de la dette — ce que les données confirment et infirment
- 7.3 Divergence régionale : deux modèles, une même logique ?
- 7.4 **La critique distributive** : qui porte le risque, qui capte la valeur (Gabor, Bayliss & Van Waeyenberge, Léon)
- 7.5 Implications pour les sponsors, les DFI, les régulateurs

### Chapter 8 — Conclusion *(~1 500 mots)*
Réponse synthétique à la question de recherche, contributions, limites, pistes de recherche.

**References** *(APA 7)* — **Appendices** : grille d'entretien, dictionnaire des variables, tableau récapitulatif des transactions, sorties de modèles complètes.

---

## Rétroplanning (12 semaines — à caler sur la date de rendu réelle)

| Sem. | Livrable |
|---|---|
| 1 | Corrections de la revue + intégration des références manquantes ; validation du design de recherche |
| 2–3 | Construction de la base de transactions (le poste le plus coûteux en temps — ne pas le sous-estimer) |
| 3–5 | Prise de contact et conduite des entretiens *(à lancer dès la semaine 2 : les délais de réponse sont longs)* |
| 4 | Rédaction Chapitres 1 et 3 |
| 5–6 | Réécriture du Chapitre 2 |
| 6–7 | Analyse quantitative + Chapitre 5 |
| 7–9 | Études de cas + Chapitre 6 |
| 9–10 | Chapitre 7 |
| 10–11 | Chapitre 8, mise en forme, bibliographie, annexes |
| 12 | Relecture complète, contrôle anti-plagiat, mise en page |

**Chemin critique** : la disponibilité des données (semaines 2–3) et les entretiens. Les deux doivent démarrer immédiatement, avant même la réécriture de la revue.
