/*
 * Réglages généraux du site. C'est le premier fichier à remplir.
 * Tout ce qui est marqué « À REMPLACER » est un exemple.
 */
window.SITE = {
  // Nom provisoire : la marque définitive sera proposée par le directeur artistique et validée par Roy.
  nom: "Résidence Adidogomé",
  accroche: "Appartements meublés et logements à l'année à Lomé",

  // Mode démonstration : affiche un bandeau « version de travail » tant que les vraies données ne sont pas saisies.
  // Passer à false uniquement quand prix, photos et coordonnées sont réels et validés par Roy.
  demo: true,

  ville: "Lomé",
  quartier: "Adidogomé",
  pays: "Togo",

  // Numéro WhatsApp au format international, sans + ni espaces. À REMPLACER.
  whatsapp: "22890000000",
  telephoneAffiche: "+228 90 00 00 00", // À REMPLACER
  email: "contact@exemple.tg",          // À REMPLACER

  // Parité fixe FCFA (XOF) / euro : 1 EUR = 655,957 FCFA.
  // Source : BCEAO, https://www.bceao.int/fr/content/presentation-de-la-bceao
  tauxEuro: 655.957,

  arrivee: "14h00",
  depart: "11h00",
  acomptePourcent: 30, // part demandée pour confirmer une réservation courte durée (à valider par Roy)

  // Centre approximatif du quartier pour la carte. Ne jamais mettre l'adresse exacte en public.
  carte: { lat: 6.1770, lon: 1.1700, zoom: 14 },

  // Lieux de repère autour du quartier. Le temps de trajet reste vide tant qu'il n'a pas été vérifié sur place.
  reperes: [
    { nom: "Aéroport international Gnassingbé Eyadéma", icone: "plane", trajet: "" },
    { nom: "Grand Marché et centre-ville de Lomé", icone: "home", trajet: "" },
    { nom: "Université de Lomé", icone: "briefcase", trajet: "" },
    { nom: "Plage de Lomé (boulevard du Mono)", icone: "droplet", trajet: "" }
  ],

  // Avis clients réels uniquement (prénom + mois + texte), jamais inventés.
  avis: [],

  reseaux: { instagram: "", facebook: "", tiktok: "" }
};
