/*
 * Les appartements. EXEMPLES À REMPLACER à partir des fiches du dossier biens/.
 * Un équipement absent de la fiche ne doit pas figurer ici.
 *
 * offres      : "courte" (nuitée, semaine, mois meublé) et/ou "longue" (bail classique)
 * prix        : en FCFA. nuit / semaine / mois = courte durée meublée ; loyer / caution = longue durée.
 *               Exemples calés sur les fourchettes relevées à Adidogomé (docs/marche/benchmark-sites.md),
 *               à remplacer par la grille du revenue-manager validée par Roy.
 * inclus      : ce qui est compris dans le prix courte durée (affiché sous le prix)
 * occupe      : périodes déjà réservées [arrivée, départ] (le jour du départ est libre pour une nouvelle arrivée)
 * libreLe     : date à partir de laquelle le bien est libre en longue durée
 * photos      : chemins vers assets/img/biens/... (vide = emplacements « photo à venir »)
 * equipements : clés de la liste EQUIPEMENTS dans commun.js
 */
window.BIENS = [
  {
    id: "studio-teck",
    nom: "Studio Teck",
    type: "Studio",
    surface: 32,
    voyageurs: 2,
    chambres: 0,
    lits: "1 lit double (160 cm)",
    sdb: 1,
    etage: "1er étage",
    offres: ["courte", "longue"],
    prix: { nuit: 15000, semaine: 90000, mois: 170000, menage: 5000, loyer: 80000, caution: 160000 },
    inclus: ["Wifi", "Eau", "Électricité", "Linge de maison"],
    minNuits: 2,
    resume: "Un studio lumineux et calme, pensé pour un séjour seul ou à deux.",
    description: [
      "Coin nuit, petite cuisine équipée et salle d'eau privée : tout est sur place pour poser ses valises quelques jours ou quelques semaines.",
      "Idéal pour un déplacement professionnel ou un retour au pays en solo."
    ],
    equipements: ["clim", "wifi", "cuisine", "eau-chaude", "tv", "gardien", "travail"],
    occupe: [["2026-11-12", "2026-11-16"], ["2026-12-20", "2027-01-03"]],
    libreLe: "2027-01-05",
    photos: []
  },
  {
    id: "appartement-iroko",
    nom: "Appartement Iroko",
    type: "2 pièces (1 chambre)",
    surface: 55,
    voyageurs: 3,
    chambres: 1,
    lits: "1 lit double (160 cm) + 1 canapé-lit",
    sdb: 1,
    etage: "Rez-de-chaussée",
    offres: ["courte"],
    prix: { nuit: 25000, semaine: 150000, mois: 250000, menage: 7500 },
    inclus: ["Wifi", "Eau", "Électricité", "Linge de maison"],
    minNuits: 2,
    resume: "Un vrai salon, une chambre fermée et une cuisine complète, pour vivre comme à la maison.",
    description: [
      "Le salon s'ouvre sur la cuisine et accueille un canapé-lit pour une troisième personne.",
      "La chambre est séparée et climatisée. Parfait pour un couple, un parent en visite ou une mission de quelques semaines."
    ],
    equipements: ["clim", "wifi", "groupe", "cuisine", "eau-chaude", "tv", "lave-linge", "parking", "gardien"],
    occupe: [["2026-11-05", "2026-11-09"], ["2026-11-24", "2026-12-01"], ["2026-12-22", "2027-01-02"]],
    libreLe: null,
    photos: []
  },
  {
    id: "appartement-baobab",
    nom: "Appartement Baobab",
    type: "3 pièces (2 chambres)",
    surface: 85,
    voyageurs: 5,
    chambres: 2,
    lits: "2 lits doubles + 1 lit simple",
    sdb: 2,
    etage: "2e étage",
    offres: ["courte", "longue"],
    prix: { nuit: 40000, semaine: 240000, mois: 480000, menage: 10000, loyer: 180000, caution: 360000 },
    inclus: ["Wifi", "Eau", "Électricité", "Linge de maison"],
    minNuits: 3,
    resume: "Deux chambres, deux salles d'eau et de la place pour toute la famille.",
    description: [
      "Pensé pour les familles de la diaspora pendant les fêtes ou les vacances : chacun a son espace, et le grand séjour réunit tout le monde.",
      "Disponible aussi en bail à l'année pour un foyer qui s'installe à Lomé."
    ],
    equipements: ["clim", "wifi", "groupe", "forage", "cuisine", "eau-chaude", "tv", "lave-linge", "parking", "gardien", "balcon"],
    occupe: [["2026-12-18", "2027-01-06"]],
    libreLe: "2027-02-01",
    photos: []
  }
];
