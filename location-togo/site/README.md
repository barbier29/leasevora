# Site : Résidence Adidogomé (nom provisoire)

Site vitrine et de demande de réservation pour les appartements de Roy à Adidogomé, Lomé.
Site statique : du HTML, du CSS et du JavaScript simples, sans étape de construction. Il est léger (pas de framework, photos chargées à la demande), donc rapide sur une connexion mobile lente.

## Pages
- `index.html` : accueil (recherche par dates, logements, deux offres, quartier, avis, FAQ, contact)
- `appartement.html?id=...` : fiche d'un logement (galerie, équipements, tarifs, calendrier, calcul du prix, demande WhatsApp ou demande de visite)
- `conditions.html`, `mentions-legales.html` : projets de textes à faire valider par le juriste

## Ce qu'il faut remplir avant la mise en ligne
1. `assets/js/config.js` : numéro WhatsApp, téléphone, e-mail, acompte, heures d'arrivée et de départ, temps de trajet vérifiés vers les repères.
2. `assets/js/biens.js` : un bloc par appartement, rempli à partir des fiches `biens/`. Prix validés par Roy. Seuls les équipements réellement présents.
3. Photos : les déposer dans `assets/img/biens/<id>/` (format WebP ou JPG, 1600 px de large au maximum) et les lister dans `photos`, par exemple `{ src: "assets/img/biens/studio-teck/sejour.webp", alt: "Séjour du Studio Teck" }`. L'ordre est : séjour, chambre, cuisine, salle d'eau, extérieur.
4. Passer `demo: false` dans `config.js`. Le bandeau « version de travail » disparaît et les données structurées pour Google s'activent.
5. Remplacer `https://www.exemple.tg/` dans `index.html` par le vrai nom de domaine.

## Mettre à jour les disponibilités
Dans `biens.js`, champ `occupe` : ajouter `["AAAA-MM-JJ arrivée", "AAAA-MM-JJ départ"]`. Le jour du départ reste libre pour une nouvelle arrivée.
Étape suivante prévue : brancher ces données sur le back-office (Leasevora) pour que le calendrier se mette à jour tout seul.

## Tester sur son ordinateur
```
cd site
python3 -m http.server 8000
```
puis ouvrir http://localhost:8000

## Mettre en ligne
N'importe quel hébergeur de site statique convient (Vercel, Netlify, GitHub Pages, Cloudflare Pages) en pointant sur le dossier `site/`. Aucune mise en ligne sans validation de Roy.

## Calcul du prix (courte durée)
- moins de 7 nuits : tarif nuit
- de 7 à 27 nuits : tarif semaine divisé par 7, par nuit
- 28 nuits et plus : tarif mois divisé par 30, par nuit
- plus le ménage de fin de séjour ; acompte = `acomptePourcent` du total

## Testé
Navigateur Chromium, téléphone (390 px) et ordinateur (1366 px) : aucune erreur JavaScript, aucun débordement horizontal, recherche par dates (les logements occupés sont exclus), calendrier (les périodes qui chevauchent une réservation sont refusées), calcul du prix, message WhatsApp prérempli, formulaire de visite à l'année, logement introuvable.
