# Benchmark des sites de location meublée et longue durée

Auteurs : agents `analyste-marche` et `designer-ux-ui`
Date du relevé : 30 octobre 2026

## Comment lire ce document

- Chaque chiffre a son lien. Quand aucune source sérieuse n'a été trouvée, c'est écrit « à vérifier ».
- Limite importante de ce relevé : l'outil d'ouverture des pages web était bloqué par les réglages réseau de la session. Les informations viennent donc des extraits renvoyés par le moteur de recherche pour chaque page citée, pas d'une lecture complète des pages. Les prix sont des prix affichés (prix demandés), pas des prix réellement payés. Plusieurs annonces de Lomé sont anciennes (certaines datent de 2021 à 2023). Avant toute décision de prix, il faut rouvrir chaque lien.
- Trois types d'information sont distingués :
  - donnée vérifiée : affichée sur la page source citée ;
  - estimation : moyenne calculée par une plateforme, qui varie selon les dates ;
  - hypothèse : déduction de notre part, signalée comme telle.
- Sigles utilisés :
  - FCFA (ou XOF) : franc CFA d'Afrique de l'Ouest. Parité fixe : 1 euro = 655,957 FCFA, inchangée depuis 1999 selon la BCEAO, la banque centrale des États d'Afrique de l'Ouest ([source BCEAO](https://www.bceao.int/fr/content/histoire-du-franc-cfa), [communiqué BCEAO](https://www.bceao.int/index.php/fr/communique-presse/fausse-information-faisant-etat-dune-devaluation-du-franc-cfa)).
  - T1, T2, T3 : studio, une chambre + salon, deux chambres + salon. Au Togo on dit plutôt « chambre-salon » (T2) et « deux chambres-salon » (T3).
  - UX : User Experience, la facilité d'usage. UI : User Interface, l'apparence.
  - OTA : Online Travel Agency, les plateformes comme Airbnb ou Booking.com.
  - Mobile money : porte-monnaie électronique sur le téléphone, géré par un opérateur télécom.
  - Agrégateur de paiement : société qui permet à un site d'encaisser plusieurs moyens de paiement (mobile money, carte) avec une seule intégration technique.

---

## 1. Plateformes de référence

### 1.1 Airbnb

Lien : https://www.airbnb.fr/togo/stays et la page Lomé https://www.airbnb.com/lome-togo/stays/apartments

Ce qu'ils font bien :
- Prix total affiché dès la recherche. Depuis avril 2025, Airbnb affiche par défaut dans le monde entier le prix total avec tous les frais (hors taxes), et garde le détail ligne par ligne avant paiement ([annonce Airbnb, avril 2025](https://news.airbnb.com/total-price-display-is-now-standard-globally)). Leçon : afficher le prix total du séjour, pas un prix d'appel suivi de frais surprises.
- Remises à la durée visibles : remise semaine à partir de 7 nuits, remise mois à partir de 28 nuits, affichées à côté du prix barré ([centre d'aide Airbnb](https://www.airbnb.com/resources/hosting-homes/a/setting-a-price-for-longer-stays-379)). Leçon : une grille nuit / semaine / mois bien lisible est un standard attendu.
- Badge « Coup de cœur voyageurs » (Guest Favorites) qui met en avant les logements les mieux notés ([résultats T1 2025 Airbnb](https://news.airbnb.com/airbnb-q1-2025-financial-results)). Leçon : les avis sont le premier élément de confiance.
- Pages par ville et par catégorie (appartements, résidences de services, villas) qui servent aussi au référencement naturel ([exemple Lomé](https://www.airbnb.com/lome-togo/stays/serviced-apartments)).

À éviter ou à faire mieux qu'eux :
- Prix en dollars ou en euros pour les voyageurs étrangers, rarement en FCFA : un client local ou de la diaspora doit faire la conversion lui-même (constat sur les pages Lomé citées ci-dessus).
- Pas de paiement mobile money pour le client togolais (hypothèse à vérifier sur la page de paiement Airbnb pour le Togo).
- Annonces de Lomé souvent pauvres en détails pratiques : coupures d'électricité, groupe électrogène, eau, sécurité. C'est notre occasion de faire mieux (hypothèse issue de la lecture des titres d'annonces).

### 1.2 Booking.com

Lien : https://www.booking.com/apartments/city/tg/lome.html

Ce qu'ils font bien :
- Conditions d'annulation affichées clairement sur chaque offre, avec une date limite précise (« annulation gratuite jusqu'au… ») et mention explicite quand un acompte est demandé ([FAQ Booking.com](https://secure.booking.com/faq.en-us.html?aid=330843), [politiques côté partenaire](https://partner.booking.com/en-us/solutions/cancellation-deposit-and-prepayment-policies)). Leçon : nos conditions d'annulation doivent tenir en une phrase, visible avant de réserver.
- Possibilité d'accepter une annulation gratuite dans les 24 heures après réservation ([aide partenaire](https://partner.booking.com/en-us/help/reservations/reduce-cancellations/handling-cancellation-fees-and-commission)). Bon outil pour rassurer.
- Page de comparaison par ville avec prix moyen affiché.

À éviter :
- Commission prélevée sur chaque séjour confirmé ([aide partenaire](https://partner.booking.com/en-us/help/reservations/reduce-cancellations/handling-cancellation-fees-and-commission)). Taux exact pour le Togo : à vérifier.
- Pages très chargées (bandeaux, promotions, urgence artificielle) : pour un petit site de propriétaire, mieux vaut la sobriété (avis de design, pas une donnée).

### 1.3 Blueground (meublé premium moyen et long séjour)

Lien : https://www.theblueground.com/why-blueground

Ce qu'ils font bien :
- Un seul loyer mensuel tout compris : meubles, charges, Wi-Fi, ménage, linge ([comparatif Blueground](https://www.theblueground.com/blog/mobility/blueground-vs-airbnb/)). Leçon directe pour notre offre au mois : afficher « tout compris » et lister ce qui l'est (eau, électricité ou forfait, Wi-Fi, ménage).
- Séjours de 1 mois à 1 an ou plus, avec une offre dédiée aux entreprises et un portail pour les responsables RH (ressources humaines) et voyages ([même source](https://www.theblueground.com/blog/mobility/blueground-vs-airbnb/)). Leçon : une page « Entreprises et ONG » avec devis et facture.
- Assistance 24 h/24 via l'application client ([même source](https://www.theblueground.com/blog/mobility/blueground-vs-airbnb/)). Chez nous, WhatsApp joue ce rôle.

À éviter :
- Un avis client sur l'App Store signale une application où il est impossible d'envoyer une demande de maintenance ([fiche App Store](https://apps.apple.com/app/id1183301329)). Leçon : ne pas promettre un outil qu'on ne sait pas faire fonctionner ; un numéro WhatsApp qui répond vaut mieux.

### 1.4 Edgar Suites (appart-hôtels, Paris et Bordeaux)

Lien : présentation [hospitality-on.com](https://hospitality-on.com/fr/ouverture/edgar-suites-ouvre-une-nouvelle-residence-haut-de-gamme-paris)

Ce qu'ils font bien :
- Du T1 au T4, pour court ou moyen séjour, familles et voyageurs d'affaires ([hospitality-on.com](https://hospitality-on.com/fr/hotellerie/edgar-suites-se-developpe-paris-avec-louverture-dun-nouvel-appart-hotel-durable)).
- Pas de réception sur place : arrivée en ligne et messages automatisés, avec 80 % des clients qui font leur enregistrement en ligne selon l'étude de cas de leur prestataire ([étude de cas Duve](https://www.casestudies.com/company/duve/case-study/edgar-suites-automates-80-of-guest-inquiries-with-duve)). Leçon pour Roy, qui pilote depuis la France : un parcours d'arrivée écrit (photos de l'entrée, code ou remise de clés par le relais, Wi-Fi) envoyé automatiquement avant l'arrivée.
- Moteur de réservation qui cherche sur plusieurs appartements à la fois et pré-autorise le paiement ([étude de cas Mews](https://www.mews.com/fr/clients/edgar-suites)).
- Durée minimale de 3 nuits signalée dans un article (non daté, à vérifier) ([Paris Select Book](https://www.parisselectbook.com/?p=72286)).

À éviter : rien de spécifique relevé ; leurs outils (Mews, Duve) sont dimensionnés pour des dizaines de résidences, trop lourds pour quelques appartements.

### 1.5 Zoku (hybride logement et bureau)

Lien : [communiqué Zoku Copenhague](https://livezoku.com/press/the-end-of-the-hotel-room-as-you-know-it-zoku-opens-new-home-office-hybrid-in-copenhagen/)

Ce qu'ils font bien :
- Logement pensé pour vivre et travailler : vraie table de travail, cuisine équipée, rangements ([communiqué Vienne](https://livezoku.com/wp-content/uploads/2023/03/VIE-opening-press-release.pdf)). Leçon pour la cible affaires et ONG : montrer en photo le coin bureau et annoncer le débit Wi-Fi.
- Prix dégressif selon la durée : à l'ouverture d'Amsterdam en 2016, environ 150 euros la nuit, et environ 100 euros la nuit pour un mois ([Business Traveller](https://www.businesstraveller.com/news/new-lifestyle-hotel-brand-zoku-launches/)). Chiffre ancien, utile seulement pour la logique de dégressivité.

### 1.6 Sonder : contre-exemple

Marriott a mis fin à son accord de licence avec Sonder en novembre 2025 pour défaut de Sonder, et les logements Sonder ont été retirés des canaux Marriott ([communiqué Marriott](https://marriott.gcs-web.com/news-releases/news-release-details/marriott-international-announces-termination-agreement-sonder)). Un média allemand a annoncé l'arrêt immédiat de l'activité de Sonder ([tageskarte.io](https://www.tageskarte.io/hotellerie/detail/marriott-trennung-besiegelt-sonder-holdings-meldet-sofortiges-ende-des-geschaeftsbetriebs.html), information non recoupée, à vérifier). Leçon : le beau site ne suffit pas, la rentabilité par appartement compte d'abord. À transmettre au `controleur-financier`.

---

## 2. Acteurs d'Afrique de l'Ouest avec leur propre site

### 2.1 Groupe Espoir, Adidogomé (Lomé) : concurrent direct

Liens : https://groupeespoir.com/?lang=en , fiche https://groupeespoir.com/residences/espoir

- Adresse : Adidogomé, Wonyomé, non loin de l'EPP (école primaire publique) Wonyomé ([page contact](https://groupeespoir.com/contact/)). C'est le même quartier que les biens de Roy.
- Offre classée par type : studios, chambre-salon, deux chambres-salon, chaque logement porte un prénom (Delali, Espoir, Hope, Lolonyo…) ([accueil](https://groupeespoir.com/?lang=en)).
- Prix affichés par nuit sur l'accueil : studios de 10 000 à 15 000 FCFA, chambre-salon de 20 000 à 25 000 FCFA, deux chambres-salon de 30 000 à 50 000 FCFA ([accueil](https://groupeespoir.com/?lang=en)).
- Forfaits dégressifs sur certaines fiches : par exemple 40 000 FCFA la nuit, 150 000 la semaine, 275 000 la quinzaine, 450 000 le mois, le forfait mois ne s'appliquant qu'après 21 jours ([fiche ancienne Espoir](https://www.groupeespoir.com/detailsChambre.php?id=2)) ; 50 000 la nuit, 200 000 la semaine, 500 000 le mois ([fiche Hope](https://groupeespoir.com/detailsChambre.php?id=14)).
- Inclus annoncés sur la nouvelle fiche : Wi-Fi, climatisation, ménage, sécurité 24 h/24, et 30 000 FCFA par jour pour la même unité Espoir ([nouvelle fiche](https://groupeespoir.com/residences/espoir)).
- Contact WhatsApp mis en avant ([accueil](https://groupeespoir.com/?lang=en)).

Ce qu'ils font bien : prix en FCFA visibles, forfaits semaine / quinzaine / mois, WhatsApp, inclus listés, site bilingue.
À éviter : deux versions du site coexistent avec des prix contradictoires pour le même logement (40 000 contre 30 000 FCFA la nuit pour « Espoir »). Un client qui voit deux prix perd confiance. Chez nous : une seule source de prix, une seule URL par logement, anciennes pages redirigées.

### 2.2 Résidence FANYK, Kégué (Lomé)

Lien : https://www.residencefanyk.com/

- Appartements et studios meublés, Wi-Fi et climatisation, « à partir de 40 000 FCFA par semaine » ; les données techniques de la page indiquent une fourchette de 40 000 à 200 000 FCFA sans préciser à quoi elle correspond ([accueil](https://www.residencefanyk.com/)).
- Site simple en 4 pages : accueil, logements, conditions de location, contact ([logements](https://www.residencefanyk.com/apartments), [conditions](https://www.residencefanyk.com/conditions), [contact](https://www.residencefanyk.com/contacts)).

Ce qu'ils font bien : page « conditions » séparée, prix d'appel en FCFA.
À éviter : pas de prix par logement ni de calendrier de disponibilité visibles dans les extraits relevés ; le client doit écrire pour tout savoir.

### 2.3 Kwarleyz Residence, Accra (Ghana)

Lien indiqué par un annuaire professionnel : www.kwarleyzresidence.com ([fiche Northstar Meetings](https://www.northstarmeetingsgroup.com/Meeting-Event-Venues/Accra-Ghana/Convention-Hotel/Kwarleyz-Residence-Accra-p59882105), site non vérifié).

- Résidence de services de 40 logements, du studio au 3 chambres, lancée en 2018, premier établissement géré par le groupe Ascott en Afrique ([communiqué CapitaLand](https://www.capitaland.com/en/about-capitaland/newsroom/news-releases/international/2017/dec/nr20171218-ascott-caps-record-growth-year-with-its-first-foray-into-Africa.html), [Arab News](https://arabnews.com/node/1388296/)).
- Vendu à la fois en direct et sur les OTA (Expedia, Hotels.com, Airbnb) ([Expedia](https://www.expedia.com/Accra-Hotels-Kwarleyz-Residence-Accra.h30299127.Hotel-Information)).

Ce qu'ils font bien : positionnement « résidence de services » qui rassure la clientèle d'affaires et les ONG ; double distribution direct + plateformes.
À éviter : prix en direct non trouvés, à vérifier.

### 2.4 Ascott Riviera Golf, Abidjan (Côte d'Ivoire)

Lien : https://www.capitaland.com/en/find-a-property/global-property-listing/lodging/ascott-riviera-golfabidjan.html

- Studios, 1 et 2 chambres, première résidence Ascott en Côte d'Ivoire ([fiche CapitaLand](https://www.capitaland.com/en/find-a-property/global-property-listing/lodging/ascott-riviera-golfabidjan.html)). Date d'ouverture effective : à vérifier ([Voyages d'Affaires](https://www.voyages-d-affaires.com/developpement-ascott-adagio-2022)).

Intérêt : montre que les grands groupes ciblent la même clientèle (affaires, longue mission) en Afrique de l'Ouest avec le format studio à 2 chambres.

### 2.5 Dakar : Locabiss et Marina Appart Hôtel

- Locabiss : 5 appartements meublés et équipés à Dakar, à partir de 25 000 FCFA la nuit ([fiche au-senegal.com](https://au-senegal.com/locabiss,6750.html)).
- Marina Appart Hôtel (Jet d'Eau) : F2 à 75 000 FCFA et F4 à 115 000 FCFA ([fiche au-senegal.com](https://au-senegal.com/marina-appart-hotel,6934.html)).
- Contexte : article du Soleil (juin 2026) sur l'essor du meublé courte durée à Dakar, studios équipés de 25 000 à 45 000 FCFA la nuit, haut standing de 50 000 à 120 000 FCFA ([Le Soleil](https://lesoleil.sn/actualites/societe-fait-divers/business-des-chambres-et-appartements-meubles-discret-mais-rentable/), [AllAfrica](https://fr.allafrica.com/stories/202606150442.html)).
- Sites propres de ces résidences et moyens de paiement : à vérifier.

### 2.6 Abidjan : Les Résidences Appart TE

- Résidences meublées à Cocody et Zone 4, Wi-Fi, à partir de 25 000 FCFA par jour (Riviera) et 35 000 FCFA (Zone 4), contact par formulaire plutôt que réservation en ligne ([annuaire CI](https://annuaireci.com/entreprises/les-residences-appart-te-abidjan-cote-divoire/)). Site propre : à vérifier.
- Plusieurs agences d'Abidjan n'utilisent que WhatsApp comme canal ([annonce Expat.com Plateau](https://www.expat.com/fr/immobilier/afrique/cote-d-ivoire/40-appartement-a-louer/803845-appartement-entierement-meuble-disponible-a-la-location-mensuelle-dans-le-quartier-des-affaires-dabidjan-plateau.html)).
- Une agence d'Abidjan met en avant « annonces vérifiées, sans arnaque », réservation de visite en ligne et paiement mobile money ([annuaire CI](https://annuaireci.com/entreprises/bogbes-groupe-abidjan-cote-divoire/)). Leçon : la peur de l'arnaque est un sujet, il faut y répondre de front.

### 2.7 Ce qui manque dans la région (opportunité)

Constat de recherche : nous n'avons trouvé aucun site de résidence meublée à Lomé qui combine à la fois prix en FCFA et en euros, calendrier de disponibilité, paiement d'acompte en ligne par mobile money et carte, et WhatsApp. C'est une absence de résultat, pas une preuve ; à confirmer par une recherche manuelle sur Google Maps à Lomé.

---

## 3. Fourchettes de prix observées

Rappel : prix demandés relevés via le moteur de recherche le 30 octobre 2026, certaines annonces sont anciennes. À rouvrir avant usage.

### 3.1 Meublé courte durée, Lomé (par nuit)

| Type | Prix observé | Source |
|---|---|---|
| Studio, Adidogomé | 10 000 à 15 000 FCFA | [Groupe Espoir, accueil](https://groupeespoir.com/?lang=en) |
| Chambre-salon (T2), Adidogomé | 20 000 à 25 000 FCFA | [Groupe Espoir, accueil](https://groupeespoir.com/?lang=en) |
| Chambre-salon meublée, Adidogomé Technocrate | 20 000 FCFA | [CoinAfrique](https://tg.coinafrique.com/annonce/appartements-meubles/location-appartement-meuble-2-pieces-adidogome-technocrate-3750385) |
| Deux chambres-salon (T3), Adidogomé | 30 000 à 50 000 FCFA | [Groupe Espoir, accueil](https://groupeespoir.com/?lang=en), [fiche Hope](https://groupeespoir.com/detailsChambre.php?id=14) |
| Appartement 1 chambre, Lomé (près de l'aéroport) | 30 000 FCFA par jour | [Keur-Immo, meublés Lomé](https://keur-immo.com/en/togo/furnished-apartments-for-rent-in-lome/) (annonce précise à retrouver sur la page) |
| Appartements Lomé, tous types, Airbnb | dès 10 dollars, moyenne environ 36 à 40 dollars (estimation plateforme, hors taxes et frais) | [Airbnb Lomé appartements](https://www.airbnb.com/lome-togo/stays/apartments) |
| Appartements Lomé, Booking.com | moyenne de 35 à 52 dollars selon la page et la date (estimation plateforme) | [Booking.com Lomé](https://www.booking.com/apartments/city/tg/lome.html) |

### 3.2 Meublé au mois, Lomé et Adidogomé

| Type | Prix observé | Source |
|---|---|---|
| Studio meublé, Adidogomé (près de l'hôtel Eli Palace), eau et Wi-Fi inclus | 150 000 FCFA (170 000 sur une autre version de l'annonce) | [Habitat-Afrik](https://tg.habitat-afrik.com/detail-annonce.php?annonce=20849978) |
| Chambre-salon meublée, Adidogomé Technocrate | 200 000 FCFA | [CoinAfrique](https://tg.coinafrique.com/annonce/appartements-meubles/location-appartement-meuble-2-pieces-adidogome-technocrate-3750385) |
| Chambre-salon meublée, Adidogomé Amadahomé (eau, Wi-Fi, gaz inclus) | 250 000 FCFA | annonces Habitat-Afrik Adidogomé, lien exact à vérifier ([annonce Madiba rail](https://tg.habitat-afrik.com/detail-annonce.php?annonce=17437449), [annonce carrefour AISED](https://tg.habitat-afrik.com/detail-annonce.php?annonce=15855524)) |
| Appartement 1 chambre, Lomé (près de l'aéroport) | 400 000 FCFA le mois, 220 000 FCFA les 2 semaines | [Keur-Immo](https://keur-immo.com/en/togo/furnished-apartments-for-rent-in-lome/) |
| Deux chambres-salon meublé, Adidogomé Zion-to (Wi-Fi, eau, gaz, Canal+ inclus) | 450 000 FCFA | [Habitat-Afrik](https://tg.habitat-afrik.com/detail-annonce.php?annonce=13231083) |
| Deux chambres-salon, Groupe Espoir, Adidogomé | 450 000 à 500 000 FCFA | [fiche Espoir](https://www.groupeespoir.com/detailsChambre.php?id=2), [fiche Hope](https://groupeespoir.com/detailsChambre.php?id=14) |
| Trois chambres meublé, Lomé (près de l'aéroport) | 500 000 FCFA | [Keur-Immo](https://keur-immo.com/en/togo/furnished-apartments-for-rent-in-lome/) |

Synthèse prudente (estimation) : à Adidogomé, studio meublé autour de 150 000 FCFA par mois, T2 meublé de 200 000 à 250 000, T3 meublé de 450 000 à 500 000. Par nuit : studio 10 000 à 15 000, T2 20 000 à 25 000, T3 30 000 à 50 000 FCFA. Le `revenue-manager` doit confirmer sur un échantillon plus large.

### 3.3 Longue durée non meublée, Adidogomé (loyer mensuel)

| Type | Prix observé | Source |
|---|---|---|
| Pièce avec douche, WC et cuisine (Logoté) | 20 000 FCFA, caution d'un mois | [Habitat-Afrik](https://tg.habitat-afrik.com/detail-annonce.php?annonce=87959014) |
| Chambre-salon (Wognomé, cour unique) | 60 000 FCFA | [Habitat-Afrik](https://tg.habitat-afrik.com/detail-annonce.php?annonce=87590684) |
| Chambre-salon (Amadahomé) | 45 000 FCFA, honoraires d'un mois | [Habitat-Afrik](https://tg.habitat-afrik.com/detail-annonce.php?annonce=98906191) (montant à revérifier sur la page) |
| Chambres-salons, petites annonces Adidogomé | 50 000 à 70 000 FCFA | [CoinAfrique, chambres](https://tg.coinafrique.com/categorie/chambres) (page liste, contenu changeant) |
| Deux chambres-salon (T3) non meublé, Adidogomé | à vérifier (une annonce à Apédokoè affiche 300 000 FCFA mais le statut meublé n'est pas clair : [Habitat-Afrik](https://tg.habitat-afrik.com/detail-annonce.php?annonce=87818168)) | à vérifier |

Pratiques d'entrée relevées dans ces annonces (à vérifier une par une) : avance de loyer de 8 à 10 mois, honoraires d'agence d'environ un mois, frais de visite de 3 000 à 5 000 FCFA, compteur électrique prépayé. Le cadre légal de ces avances au Togo doit être vérifié par le `juriste-conformite`.

### 3.4 Comparaison régionale (par nuit)

- Cotonou, Fidjrossè : duplex 2 chambres meublé 85 000 FCFA, minimum 3 nuits, électricité en sus ([Expat.com](https://www.expat.com/fr/immobilier/afrique/benin/40-appartement-a-louer/803568-duplex-meuble-de-2-chambres-salon-a-fidjrosse.html)) ; 3 pièces meublé 50 000 FCFA la nuit ou 600 000 FCFA le mois ([Expat.com](https://www.expat.com/fr/immobilier/afrique/benin/40-appartement-a-louer/799324-location-appartement-meuble-3-pieces-fidjrosse-plage-cotonou.html)).
- Abidjan : à partir de 25 000 FCFA par jour (Riviera) ([annuaire CI](https://annuaireci.com/entreprises/les-residences-appart-te-abidjan-cote-divoire/)).
- Dakar : studios 25 000 à 45 000 FCFA ([Le Soleil](https://lesoleil.sn/actualites/societe-fait-divers/business-des-chambres-et-appartements-meubles-discret-mais-rentable/)).

Lomé, et Adidogomé en particulier, se situe nettement en dessous de Cotonou, Abidjan et Dakar (constat sur ces seules sources).

---

## 4. Paiement mobile money au Togo

### 4.1 Opérateurs et noms commerciaux actuels

| Opérateur | Nom commercial actuel | Ancien nom | Source |
|---|---|---|---|
| Yas Togo (ex-Togocom, groupe Axian) | Mixx by Yas | T-Money (TMoney) | [Axian, communiqué nov. 2025](https://www.axian-telecom.com/2025/11/26/yas-and-mixx-mark-first-anniversary-a-transformational-year-of-connection-innovation-and-pan-african-impact/), [CIO Mag](https://cio-mag.com/togocom-rejoint-la-team-africa-daxian-et-devient-yas), [application Mixx Togo](https://apps.apple.com/us/app/mixx-togo/id6443914936) |
| Moov Africa Togo | Moov Money (souvent écrit « Moov Money Flooz ») | Flooz | [application Moov Money TG](https://apps.apple.com/us/app/-/id6747830756), [ARCEP Togo 2023](https://arcep.tg/wp-content/uploads/2023/10/CP20231025-Ouverture-procedure-de-sanction-MAT-service-flooz.pdf). Changement officiel de nom : à vérifier |
| Gozem (avec NSIA Banque) | Gozem Money | nouveau, lancé en octobre 2025 | [TechCabal](https://techcabal.com/2025/10/14/togos-gozem-expands-into-mobile-money-with-new-fintech-platform/) |
| Wave | Wave | recrutement et activité annoncés au Togo, lancement grand public à vérifier | [TYN Magazine](https://tynmagazine.com/mobile-money-wave-launches-recruitment-process-in-togo/) |

Parts de marché : environ 60 % pour TMoney (Mixx by Yas) et 40 % pour Flooz (Moov Money) selon TechCabal en octobre 2025 ([TechCabal](https://techcabal.com/2025/10/14/togos-gozem-expands-into-mobile-money-with-new-fintech-platform/)). Environ 6,07 millions de comptes actifs selon un article d'avril 2026 ([AllAfrica](https://fr.allafrica.com/stories/202604010688.html)).

Point de vigilance : Moov Africa Togo a connu une panne totale de son mobile money du 19 au 24 octobre 2023, avec procédure de sanction de l'ARCEP (Autorité de régulation des communications électroniques et des postes) ([communiqué ARCEP](https://arcep.tg/wp-content/uploads/2023/10/CP20231025-Ouverture-procedure-de-sanction-MAT-service-flooz.pdf)). Leçon : toujours proposer au moins deux moyens de paiement.

### 4.2 Agrégateurs : lesquels couvrent le Togo

| Agrégateur | Togo ? | Moyens annoncés au Togo | Source | Niveau de preuve |
|---|---|---|---|---|
| FedaPay | Oui | Moov Money, T-Money | [documentation FedaPay](https://docs-v1.fedapay.com/payments/payment-methods), [support FedaPay](https://support.fedapay.com/portal/en/kb/articles/fedapay-fonctionne-t-il-dans-mon-pays) | Documentation officielle (vue en extrait). Prise en charge du nom Mixx à vérifier |
| PayDunya | Oui, depuis mars 2022 | T-Money, Flooz | [TechCabal 2022](https://techcabal.com/2022/03/02/paydunya-expands-to-togo/) | Presse ; liste actuelle à vérifier sur paydunya.com |
| Kkiapay | Oui | mobile money et carte bancaire | [republicoftogo.com](https://www.republicoftogo.com/toutes-les-rubriques/high-tech/paiements-simplifies), [extension WordPress](https://fr-ca.wordpress.org/plugins/kkiapay-woocommerce/) | Presse, année de lancement non précisée ; à vérifier |
| CinetPay | Oui selon des sources secondaires | TMoney, Moov Money, carte | [extension Bubble](https://bubble.io/plugin/cinetpay-live-api-1700654790774x810252154360037400) | Source secondaire seulement, à vérifier sur la documentation CinetPay |

Commissions : seules des sources de blogs non officiels ont été trouvées (environ 1,5 à 2,2 %) ; à vérifier au contrat marchand. Choix final : `developpeur-backend`, validation de Roy.

Pour la diaspora qui paie depuis la France : il faut aussi la carte bancaire. Kkiapay et CinetPay annoncent la carte (sources ci-dessus) ; à confirmer pour chaque agrégateur, avec les frais sur carte européenne.

---

## 5. Bonnes pratiques à appliquer au site (priorisées)

1. Prix total visible tout de suite, en FCFA, avec l'équivalent en euros calculé à 655,957 FCFA pour 1 euro (taux fixe, [BCEAO](https://www.bceao.int/fr/content/histoire-du-franc-cfa)). Pas de frais cachés au dernier écran, comme Airbnb depuis 2025 ([Airbnb](https://news.airbnb.com/total-price-display-is-now-standard-globally)).
2. Grille nuit / semaine / mois sur chaque fiche, avec la remise affichée en clair (modèle Airbnb 7 et 28 nuits, [source](https://www.airbnb.com/resources/hosting-homes/a/setting-a-price-for-longer-stays-379) ; modèle local Groupe Espoir, [source](https://www.groupeespoir.com/detailsChambre.php?id=2)).
3. Bouton WhatsApp fixe en bas d'écran sur mobile, avec message prérempli (nom du logement, dates). Tous les acteurs locaux le mettent en avant ([Groupe Espoir](https://groupeespoir.com/?lang=en)).
4. Une seule URL et un seul prix par logement. Ne jamais laisser une ancienne page avec un autre prix (erreur observée chez Groupe Espoir, [ancienne fiche](https://www.groupeespoir.com/detailsChambre.php?id=2) contre [nouvelle fiche](https://groupeespoir.com/residences/espoir)).
5. Liste « tout compris » claire sous le prix, comme Blueground ([source](https://www.theblueground.com/blog/mobility/blueground-vs-airbnb/)) : Wi-Fi (avec débit), eau, électricité (forfait ou compteur prépayé), climatisation, ménage, linge, gardiennage.
6. Bloc « Vie pratique à Adidogomé » : groupe électrogène ou non, réserve d'eau, sécurité, distance à l'aéroport, au centre et aux commerces. Information rare chez les concurrents (hypothèse issue de ce relevé), donc différenciante.
7. Conditions d'annulation et d'acompte en une phrase, visibles avant la réservation, à la manière de Booking.com ([source](https://secure.booking.com/faq.en-us.html?aid=330843)).
8. Paiement de l'acompte par au moins deux canaux : Mixx by Yas et Moov Money via un agrégateur couvrant le Togo, plus la carte pour la diaspora. Raison : panne Moov de 5 jours en 2023 ([ARCEP](https://arcep.tg/wp-content/uploads/2023/10/CP20231025-Ouverture-procedure-de-sanction-MAT-service-flooz.pdf)).
9. Réassurance anti-arnaque explicite : « photos réelles prises le [date] », nom et photo du relais à Lomé, entreprise identifiée, jamais de paiement demandé hors du site ou du numéro officiel. La peur de l'arnaque est un argument utilisé par les agences d'Abidjan ([annuaire CI](https://annuaireci.com/entreprises/bogbes-groupe-abidjan-cote-divoire/)).
10. Avis clients visibles sur l'accueil et sur chaque fiche, avec possibilité de renvoyer vers les avis Airbnb ou Google tant que le site en a peu ([logique Guest Favorites](https://news.airbnb.com/airbnb-q1-2025-financial-results)).
11. Calendrier de disponibilité sur chaque fiche, pour éviter l'aller-retour « c'est libre ? » sur WhatsApp. Absent des sites locaux relevés (FANYK, Groupe Espoir, d'après les extraits).
12. Page « Entreprises et ONG » : séjours d'un mois et plus, devis, facture, contrat simple, comme Blueground for Business ([source](https://www.theblueground.com/blog/mobility/blueground-vs-airbnb/)).
13. Guide d'arrivée envoyé automatiquement avant le séjour (accès, clés, Wi-Fi, numéro du relais), inspiré d'Edgar Suites qui n'a pas de réception ([étude de cas](https://www.casestudies.com/company/duve/case-study/edgar-suites-automates-80-of-guest-inquiries-with-duve)). Indispensable puisque Roy est en France.
14. Deux entrées dès l'accueil : « Séjour meublé (nuit, semaine, mois) » et « Location longue durée (bail) », avec deux parcours différents (réserver contre demander une visite).
15. Photo du coin bureau et débit Wi-Fi annoncé pour la cible affaires, comme Zoku ([source](https://livezoku.com/wp-content/uploads/2023/03/VIE-opening-press-release.pdf)). Site bilingue français et anglais (Groupe Espoir l'est déjà, [source](https://groupeespoir.com/?lang=en)), utile pour les ONG et les voisins ghanéens.

---

## 6. Trois recommandations pour le DG

1. Se positionner face à Groupe Espoir, concurrent installé dans le même quartier avec des prix publics : soit même gamme de prix avec un service plus fiable (calendrier, paiement en ligne, prix cohérents), soit montée en gamme justifiée (photos, équipement, bureau, électricité de secours). À trancher par Roy avec le `revenue-manager`.
2. Faire valider par le `developpeur-backend` un agrégateur couvrant Mixx by Yas, Moov Money et la carte (FedaPay et PayDunya sont les mieux sourcés), avec frais réels demandés par écrit.
3. Faire rouvrir tous les liens de prix de ce document par une personne sur place ou avec un accès web complet, et compléter l'échantillon (au moins 10 annonces par type à Adidogomé) avant de fixer la grille.

---

## Ce qui est fait

- Benchmark de 2 plateformes (Airbnb, Booking.com), 3 acteurs du meublé premium (Blueground, Edgar Suites, Zoku) et un contre-exemple (Sonder).
- 7 acteurs d'Afrique de l'Ouest relevés, dont 2 à Lomé avec leur propre site (Groupe Espoir à Adidogomé, Résidence FANYK à Kégué).
- Fourchettes de prix sourcées pour Adidogomé et Lomé (nuit, mois, longue durée non meublée).
- Liste des opérateurs mobile money et des agrégateurs couvrant le Togo.
- 15 bonnes pratiques priorisées pour le design et le contenu.

## Ce qui bloque

- L'ouverture directe des pages web était bloquée par les réglages réseau de la session (domaines non autorisés : groupeespoir.com, residencefanyk.com, docs.fedapay.com, paydunya.com, kkiapay.me, republicoftogo.com, entre autres). Les données viennent des extraits du moteur de recherche. Pour une vérification complète, ces domaines doivent être autorisés dans les paramètres réseau de la session.
- Annonces parfois anciennes et prix contradictoires (Groupe Espoir, Habitat-Afrik).
- Loyer longue durée d'un T3 non meublé à Adidogomé : pas de source fiable trouvée, à vérifier.
- Commissions des agrégateurs : aucune grille officielle trouvée.

## Ce qui est attendu de qui

- Roy : autoriser l'accès réseau aux domaines ci-dessus ou demander au relais de Lomé de relever 10 annonces récentes par type à Adidogomé (prix, date, lien ou photo de l'annonce) ; arbitrer le positionnement face à Groupe Espoir.
- `revenue-manager` : bâtir la grille nuit / semaine / mois à partir des fourchettes du point 3, après vérification.
- `developpeur-backend` : contacter FedaPay, PayDunya, Kkiapay et CinetPay pour confirmer couverture (Mixx by Yas, Moov Money, carte européenne) et frais.
- `designer-ux-ui` et `chef-de-produit` : intégrer les 15 bonnes pratiques au cahier des charges et aux maquettes.
- `juriste-conformite` : vérifier le cadre légal des avances de loyer et des cautions au Togo avant de publier les conditions longue durée.
