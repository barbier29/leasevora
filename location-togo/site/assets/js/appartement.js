/* Page d'un logement : présentation, calendrier, calcul du prix, demande WhatsApp. */
(function () {
  var S = window.SITE, u = window.U;
  u.initPage();

  var q = new URLSearchParams(location.search);
  var bien = window.BIENS.filter(function (b) { return b.id === q.get("id"); })[0];
  if (!bien) {
    document.getElementById("contenu").innerHTML = '<div class="page-texte"><h1>Logement introuvable</h1><p>Ce lien ne correspond à aucun de nos logements.</p><a class="btn btn-principal" href="./#logements">Voir tous les logements</a></div>';
    document.getElementById("barre-mobile").remove();
    return;
  }

  var aCourte = bien.offres.indexOf("courte") > -1, aLongue = bien.offres.indexOf("longue") > -1;
  var etat = {
    offre: (q.get("offre") === "longue" && aLongue) || !aCourte ? "longue" : "courte",
    debut: null, fin: null,
    voyageurs: Math.min(+q.get("voyageurs") || Math.min(2, bien.voyageurs), bien.voyageurs),
    erreur: ""
  };
  // Dates reçues depuis la recherche de l'accueil, gardées seulement si la période est libre.
  var qa = q.get("arrivee"), qd = q.get("depart");
  if (qa && qd && qa >= u.aujourdhui() && qd > qa && u.periodeLibre(bien, qa, qd) && u.nuits(qa, qd) >= (bien.minNuits || 1)) { etat.debut = qa; etat.fin = qd; }

  /* ---------- En-tête du logement ---------- */
  document.title = bien.nom + " · " + bien.type + " à Adidogomé, Lomé | " + S.nom;
  document.querySelector('meta[name="description"]').content = bien.resume + " " + bien.type + ", " + bien.surface + " m², jusqu'à " + bien.voyageurs + " personnes, à Adidogomé (Lomé).";
  document.getElementById("nom").textContent = bien.nom;
  document.getElementById("fil-nom").textContent = bien.nom;
  document.getElementById("sous-titre").innerHTML =
    "<span>" + u.icone("pin") + "Adidogomé, Lomé</span><span>" + u.esc(bien.type) + "</span><span>" + bien.surface + " m²</span><span>" + bien.voyageurs + " personnes max</span>";
  document.getElementById("resume").textContent = bien.resume;
  document.getElementById("wa-flottant").href = u.lienWhatsApp("Bonjour, j'ai une question sur le logement « " + bien.nom + " ».");

  var legendes = ["Séjour", "Chambre", "Cuisine", "Salle d'eau", "Extérieur"];
  document.getElementById("galerie").innerHTML = legendes.map(function (l, i) {
    return u.visuel(bien, i, l, 'class="' + (i ? "g-autre" : "g0") + '"').replace('<div class="ph"', '<div class="ph ' + (i ? "g-autre" : "g0") + '"');
  }).join("");

  document.getElementById("chiffres").innerHTML = [
    ["surface", bien.surface + " m²", "Surface"],
    ["users", bien.voyageurs + " pers.", "Capacité"],
    ["bed", bien.chambres ? bien.chambres + " chambre" + (bien.chambres > 1 ? "s" : "") : "Studio", bien.lits],
    ["bath", bien.sdb + " salle" + (bien.sdb > 1 ? "s" : "") + " d'eau", bien.etage || ""]
  ].map(function (c) { return '<div class="chiffre">' + u.icone(c[0]) + "<strong>" + u.esc(c[1]) + "</strong><span>" + u.esc(c[2]) + "</span></div>"; }).join("");

  document.getElementById("description").innerHTML = bien.description.map(function (p) { return "<p>" + u.esc(p) + "</p>"; }).join("");
  document.getElementById("equipements").innerHTML = bien.equipements.map(function (k) {
    var e = u.EQUIPEMENTS[k]; return e ? "<li>" + u.icone(e.i) + u.esc(e.t) + "</li>" : "";
  }).join("");

  /* ---------- Tableau des tarifs ---------- */
  var p = bien.prix, lignes = [];
  if (aCourte) {
    lignes.push(["Nuit", p.nuit, "Dès " + (bien.minNuits || 1) + " nuits"]);
    if (p.semaine) lignes.push(["Semaine (7 nuits)", p.semaine, "Soit " + u.fcfa(p.semaine / 7) + " la nuit"]);
    if (p.mois) lignes.push(["Mois meublé (30 nuits)", p.mois, "Soit " + u.fcfa(p.mois / 30) + " la nuit"]);
    if (p.menage) lignes.push(["Ménage de fin de séjour", p.menage, "Une fois par séjour"]);
  }
  if (aLongue) {
    lignes.push(["Loyer à l'année (par mois)", p.loyer, "Bail longue durée"]);
    if (p.caution) lignes.push(["Caution", p.caution, "Rendue en fin de bail"]);
  }
  document.getElementById("tarifs").innerHTML = "<thead><tr><th>Formule</th><th>Prix</th></tr></thead><tbody>" + lignes.map(function (l) {
    return "<tr><td>" + l[0] + "<small>" + l[2] + "</small></td><td><strong>" + u.fcfa(l[1]) + "</strong><small>" + u.euros(l[1]) + "</small></td></tr>";
  }).join("") + "</tbody>";

  var regles = [];
  if (aCourte) {
    regles.push("Arrivée à partir de " + S.arrivee + ", départ avant " + S.depart + ".");
    regles.push("Séjour de " + (bien.minNuits || 1) + " nuits minimum.");
    regles.push("Acompte de " + S.acomptePourcent + " % pour confirmer, solde à l'arrivée.");
  }
  if (aLongue) regles.push("À l'année : bail écrit, caution de " + u.fcfa(p.caution || 0) + (bien.libreLe ? ", libre à partir du " + u.dateLongue(bien.libreLe) : "") + ".");
  regles.push("Accueil et remise des clés par notre équipe sur place.");
  document.getElementById("regles").innerHTML = regles.map(function (r) { return "<li>" + u.icone("check") + "<span>" + u.esc(r) + "</span></li>"; }).join("");

  /* ---------- Calendriers (page + fenêtre) synchronisés ---------- */
  var calPage = null, calModale = null;
  function surDates(d, f) {
    etat.debut = d; etat.fin = f; etat.erreur = "";
    [calPage, calModale].forEach(function (c) { if (c && (c.debut !== d || c.fin !== f)) { c.debut = d; c.fin = f; c.message = ""; c.rendre(); } });
    rendreResa();
  }
  if (aCourte) {
    calPage = new u.Calendrier(document.getElementById("cal-page"), bien, { debut: etat.debut, fin: etat.fin, onChange: surDates });
    calModale = new u.Calendrier(document.getElementById("cal-modale"), bien, { debut: etat.debut, fin: etat.fin, onChange: function (d, f) { surDates(d, f); if (d && f) setTimeout(function () { modale.close(); }, 250); } });
  } else {
    document.getElementById("bloc-dispo").remove();
  }
  var modale = document.getElementById("modale-dates");
  modale.querySelectorAll("[data-fermer]").forEach(function (b) { if (!b.textContent.trim()) b.innerHTML = u.icone("x"); b.addEventListener("click", function () { modale.close(); }); });
  modale.addEventListener("click", function (e) { if (e.target === modale) modale.close(); });
  document.getElementById("effacer-dates").addEventListener("click", function () { calModale.effacer(); });
  function ouvrirDates() { if (modale.showModal) modale.showModal(); else document.getElementById("bloc-dispo").scrollIntoView(); }

  /* ---------- Carte de réservation ---------- */
  var zone = document.getElementById("carte-resa");

  function htmlCourte() {
    var h = '<p class="resa-prix">' + u.fcfa(p.nuit) + " <small>/ nuit</small></p><p class=\"resa-eur\">" + u.euros(p.nuit) + " · tarifs dégressifs à la semaine et au mois</p>";
    if (bien.inclus && bien.inclus.length) h += '<p class="note" style="margin:-8px 0 14px">Compris : ' + bien.inclus.map(u.esc).join(", ") + ".</p>";
    h += '<div class="dates"><button type="button" data-dates><small>Arrivée</small>' + (etat.debut ? "<strong>" + u.dateCourte(etat.debut) + "</strong>" : '<span class="vide-date">Ajouter</span>') + "</button>" +
      '<button type="button" data-dates><small>Départ</small>' + (etat.fin ? "<strong>" + u.dateCourte(etat.fin) + "</strong>" : '<span class="vide-date">Ajouter</span>') + "</button></div>";
    h += '<div class="champ-resa"><label for="voy">Voyageurs</label><select id="voy">';
    for (var i = 1; i <= bien.voyageurs; i++) h += '<option value="' + i + '"' + (i === etat.voyageurs ? " selected" : "") + ">" + i + " voyageur" + (i > 1 ? "s" : "") + "</option>";
    h += "</select></div>";
    h += '<div class="champ-resa"><label for="prenom">Votre prénom</label><input id="prenom" autocomplete="given-name" placeholder="Pour personnaliser la demande"></div>';
    h += '<button class="btn btn-principal btn-large" type="button" id="envoyer">' + u.icone("message") + (etat.debut && etat.fin ? "Demander sur WhatsApp" : "Choisir mes dates") + "</button>";
    if (etat.erreur) h += '<p class="erreur" role="alert">' + u.esc(etat.erreur) + "</p>";
    if (etat.debut && etat.fin) {
      var d = u.devis(bien, etat.debut, etat.fin);
      h += '<div class="detail-prix">' +
        "<div><span>" + u.fcfa(d.parNuit) + " × " + d.nuits + " nuits <small>(" + d.formule.toLowerCase() + ")</small></span><span>" + u.fcfa(d.hebergement) + "</span></div>" +
        (d.economie ? '<div class="eco"><span>Économie vs tarif nuit</span><span>−' + u.fcfa(d.economie) + "</span></div>" : "") +
        (d.menage ? "<div><span>Ménage de fin de séjour</span><span>" + u.fcfa(d.menage) + "</span></div>" : "") +
        '<div class="total"><span>Total</span><span>' + u.fcfa(d.total) + "</span></div>" +
        '<div class="acompte"><span>' + u.euros(d.total) + "</span><span></span></div>" +
        '<div class="acompte"><span>Acompte pour confirmer (' + S.acomptePourcent + " %)</span><span>" + u.fcfa(d.acompte) + "</span></div></div>";
    }
    h += '<p class="rassure-mini">Aucun paiement maintenant. Nous confirmons d\'abord la disponibilité.</p>';
    return h;
  }

  function htmlLongue() {
    var h = '<p class="resa-prix">' + u.fcfa(p.loyer) + " <small>/ mois</small></p><p class=\"resa-eur\">" + u.euros(p.loyer) + " · caution " + u.fcfa(p.caution || 0) + "</p>";
    var libre = !bien.libreLe || bien.libreLe <= u.aujourdhui();
    h += '<p class="dispo ' + (libre ? "oui" : "non") + '" style="margin:0 0 14px">' + u.icone(libre ? "check" : "calendar") + (libre ? "Libre dès maintenant" : "Libre à partir du " + u.dateLongue(bien.libreLe)) + "</p>";
    h += '<form id="form-longue" novalidate>' +
      '<div class="champ-resa"><label for="l-prenom">Votre prénom</label><input id="l-prenom" autocomplete="given-name" required></div>' +
      '<div class="champ-resa"><label for="l-date">Emménagement souhaité</label><input id="l-date" type="date" min="' + (bien.libreLe && bien.libreLe > u.aujourdhui() ? bien.libreLe : u.aujourdhui()) + '"></div>' +
      '<div class="champ-resa"><label for="l-duree">Durée envisagée</label><select id="l-duree"><option>1 an</option><option>2 ans</option><option>3 ans ou plus</option><option>Je ne sais pas encore</option></select></div>' +
      '<div class="champ-resa"><label for="l-visite">Visite</label><select id="l-visite"><option>Sur place à Lomé</option><option>En vidéo sur WhatsApp</option></select></div>' +
      '<button class="btn btn-wa btn-large" type="submit">' + u.icone("message") + "Demander une visite</button>" +
      '<p class="erreur" id="l-erreur" role="alert" hidden>Indiquez votre prénom pour envoyer la demande.</p></form>';
    h += '<p class="rassure-mini">Votre demande part sur WhatsApp. Rien n\'est enregistré sur ce site.</p>';
    return h;
  }

  function rendreResa() {
    var h = "";
    if (aCourte && aLongue) {
      h += '<div class="onglets" role="tablist"><button type="button" role="tab" data-offre="courte" aria-selected="' + (etat.offre === "courte") + '">Séjour meublé</button>' +
        '<button type="button" role="tab" data-offre="longue" aria-selected="' + (etat.offre === "longue") + '">À l\'année</button></div>';
    }
    h += etat.offre === "courte" ? htmlCourte() : htmlLongue();
    zone.innerHTML = h;
    rendreBarre();
  }

  // Les écouteurs sont posés une seule fois sur le conteneur, la carte étant redessinée souvent.
  zone.addEventListener("click", function (e) {
    var t = e.target.closest("button");
    if (!t) return;
    if (t.dataset.offre) { etat.offre = t.dataset.offre; rendreResa(); return; }
    if (t.hasAttribute("data-dates")) { ouvrirDates(); return; }
    if (t.id === "envoyer") envoyerCourte();
  });
  zone.addEventListener("change", function (e) { if (e.target.id === "voy") etat.voyageurs = +e.target.value; });
  zone.addEventListener("submit", function (e) { e.preventDefault(); envoyerLongue(); });

  function envoyerCourte() {
    if (!etat.debut || !etat.fin) {
      etat.erreur = etat.debut ? "Choisissez votre date de départ." : "";
      if (etat.erreur) rendreResa();
      ouvrirDates();
      return;
    }
    var d = u.devis(bien, etat.debut, etat.fin);
    var prenom = (document.getElementById("prenom").value || "").trim();
    var texte = "Bonjour" + (prenom ? ", je suis " + prenom : "") + ".\n" +
      "Je souhaite réserver « " + bien.nom + " » (" + bien.type + ") à Adidogomé :\n" +
      "Arrivée : " + u.dateLongue(etat.debut) + "\nDépart : " + u.dateLongue(etat.fin) + " (" + d.nuits + " nuits)\n" +
      "Voyageurs : " + etat.voyageurs + "\n" +
      "Total affiché sur le site : " + u.fcfa(d.total) + " (" + u.euros(d.total) + ")\n" +
      "Est-ce bien disponible ?";
    window.open(u.lienWhatsApp(texte), "_blank", "noopener");
  }

  function envoyerLongue() {
    var prenom = document.getElementById("l-prenom").value.trim();
    var err = document.getElementById("l-erreur");
    if (!prenom) { err.hidden = false; document.getElementById("l-prenom").focus(); return; }
    err.hidden = true;
    var date = document.getElementById("l-date").value;
    var texte = "Bonjour, je suis " + prenom + ".\n" +
      "Je suis intéressé(e) par la location à l'année de « " + bien.nom + " » (" + bien.type + ", " + u.fcfa(p.loyer) + " par mois) à Adidogomé.\n" +
      (date ? "Emménagement souhaité : " + u.dateLongue(date) + "\n" : "") +
      "Durée envisagée : " + document.getElementById("l-duree").value + "\n" +
      "Visite : " + document.getElementById("l-visite").value + "\n" +
      "Quand pourrions-nous organiser la visite ?";
    window.open(u.lienWhatsApp(texte), "_blank", "noopener");
  }

  /* ---------- Barre de réservation (téléphone) ---------- */
  function rendreBarre() {
    var barre = document.getElementById("barre-mobile"), info;
    if (etat.offre === "courte" && etat.debut && etat.fin) {
      var d = u.devis(bien, etat.debut, etat.fin);
      info = "<strong>" + u.fcfa(d.total) + "</strong><br>" + u.dateCourte(etat.debut) + " → " + u.dateCourte(etat.fin) + " · " + d.nuits + " nuits";
    } else if (etat.offre === "courte") {
      info = "<strong>" + u.fcfa(p.nuit) + "</strong> / nuit<br><span class=\"note\">" + u.euros(p.nuit) + "</span>";
    } else {
      info = "<strong>" + u.fcfa(p.loyer) + "</strong> / mois<br><span class=\"note\">Location à l'année</span>";
    }
    barre.innerHTML = '<div class="info">' + info + '</div><button class="btn btn-principal" type="button">' +
      (etat.offre === "courte" ? (etat.debut && etat.fin ? "Réserver" : "Choisir les dates") : "Demander une visite") + "</button>";
    barre.querySelector("button").onclick = function () {
      if (etat.offre === "courte" && !(etat.debut && etat.fin)) ouvrirDates();
      else if (etat.offre === "courte") envoyerCourte();
      else document.getElementById("resa").scrollIntoView({ behavior: "smooth", block: "start" });
    };
  }

  /* ---------- Données structurées (activées hors mode démonstration) ---------- */
  if (!S.demo) {
    var ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.textContent = JSON.stringify({
      "@context": "https://schema.org", "@type": "Apartment", name: bien.nom, description: bien.resume,
      floorSize: { "@type": "QuantitativeValue", value: bien.surface, unitCode: "MTK" },
      numberOfRooms: bien.chambres + 1, occupancy: { "@type": "QuantitativeValue", maxValue: bien.voyageurs },
      amenityFeature: bien.equipements.map(function (k) { return { "@type": "LocationFeatureSpecification", name: (u.EQUIPEMENTS[k] || {}).t, value: true }; }),
      address: { "@type": "PostalAddress", addressLocality: S.ville, streetAddress: S.quartier, addressCountry: "TG" }
    });
    document.head.appendChild(ld);
  }

  rendreResa();
})();
