/* Page d'accueil : recherche, liste des logements, quartier, avis. */
(function () {
  var S = window.SITE, B = window.BIENS, u = window.U;
  u.initPage();

  var etat = { filtre: "tous", mode: "courte", arrivee: "", depart: "", voyageurs: 0, emmenagement: "", chambres: 0, cherche: false };
  var grille = document.getElementById("grille-biens");

  /* ---------- Cartes de logements ---------- */
  function carte(b) {
    var p = u.prixDepart(b);
    var badges = '<div class="badges">' +
      (b.offres.indexOf("courte") > -1 ? '<span class="badge">Séjour meublé</span>' : "") +
      (b.offres.indexOf("longue") > -1 ? '<span class="badge badge-longue">À l\'année</span>' : "") + "</div>";
    var params = [];
    var dispo = "";
    if (etat.cherche && etat.mode === "courte" && etat.arrivee && etat.depart) {
      params.push("arrivee=" + etat.arrivee, "depart=" + etat.depart);
      var d = u.devis(b, etat.arrivee, etat.depart);
      dispo = '<div class="dispo oui">' + u.icone("check") + "Libre · " + u.fcfa(d.total) + " pour " + d.nuits + " nuits</div>";
    }
    if (etat.cherche && etat.mode === "courte" && etat.voyageurs) params.push("voyageurs=" + etat.voyageurs);
    if (etat.filtre === "longue") params.push("offre=longue");
    if (etat.cherche && etat.mode === "longue") {
      dispo = !b.libreLe || b.libreLe <= (etat.emmenagement || u.aujourdhui())
        ? '<div class="dispo oui">' + u.icone("check") + "Libre à cette date</div>"
        : '<div class="dispo non">' + u.icone("calendar") + "Libre à partir du " + u.dateLongue(b.libreLe) + "</div>";
    }
    var lignePrix = '<p class="prix-ligne">' + (p.unite === "nuit" ? "À partir de " : "") + "<strong>" + u.fcfa(p.montant) + "</strong> / " + p.unite + ' <span class="eur">' + u.euros(p.montant) + "</span></p>";
    if (b.prix.loyer && etat.filtre === "longue") {
      lignePrix = '<p class="prix-ligne">Loyer <strong>' + u.fcfa(b.prix.loyer) + "</strong> / mois <span class=\"eur\">" + u.euros(b.prix.loyer) + "</span></p>";
    }
    var meta = [b.type, b.surface + " m²", b.voyageurs + " pers. max"].join(" · ");
    return '<a class="carte-bien" href="appartement.html?id=' + encodeURIComponent(b.id) + (params.length ? "&" + params.join("&") : "") + '">' +
      '<div class="media">' + u.visuel(b, 0, b.nom) + badges + "</div>" +
      '<div class="corps"><h3>' + u.esc(b.nom) + '</h3><p class="meta">' + u.esc(meta) + "</p>" + lignePrix + dispo + "</div></a>";
  }

  function afficher() {
    var liste = B.filter(function (b) {
      if (etat.filtre !== "tous" && b.offres.indexOf(etat.filtre) < 0) return false;
      if (!etat.cherche) return true;
      if (etat.mode === "courte") {
        if (b.offres.indexOf("courte") < 0) return false;
        if (etat.voyageurs && b.voyageurs < etat.voyageurs) return false;
        if (etat.arrivee && etat.depart && !u.periodeLibre(b, etat.arrivee, etat.depart)) return false;
      } else {
        if (b.offres.indexOf("longue") < 0) return false;
        if (b.chambres < etat.chambres) return false;
      }
      return true;
    });
    grille.innerHTML = liste.length ? liste.map(carte).join("") :
      '<div class="vide"><h3>Rien de libre pour cette recherche</h3><p>Essayez d\'autres dates, ou écrivez-nous : une place se libère parfois.</p>' +
      '<a class="btn btn-wa" href="' + u.lienWhatsApp("Bonjour, je cherche un logement à Adidogomé" + (etat.arrivee ? " du " + u.dateLongue(etat.arrivee) + " au " + u.dateLongue(etat.depart || etat.arrivee) : "") + ". Avez-vous une disponibilité ?") + '" target="_blank" rel="noopener">' + u.icone("message") + " Demander sur WhatsApp</a></div>";
  }

  function choisirFiltre(f) {
    etat.filtre = f;
    document.querySelectorAll("[data-filtre]").forEach(function (x) { x.setAttribute("aria-pressed", x.dataset.filtre === f); });
    afficher();
  }
  document.querySelectorAll("[data-filtre]").forEach(function (x) { x.addEventListener("click", function () { choisirFiltre(x.dataset.filtre); }); });
  document.querySelectorAll("[data-filtre-lien]").forEach(function (x) { x.addEventListener("click", function () { choisirFiltre(x.dataset.filtreLien); }); });

  /* ---------- Recherche ---------- */
  var form = document.getElementById("recherche");
  var arr = document.getElementById("r-arrivee"), dep = document.getElementById("r-depart"), emm = document.getElementById("r-emm");
  arr.min = dep.min = emm.min = u.aujourdhui();
  arr.addEventListener("change", function () {
    if (!arr.value) return;
    dep.min = u.ajouterJours(arr.value, 1);
    if (!dep.value || dep.value <= arr.value) dep.value = u.ajouterJours(arr.value, 3);
  });
  form.querySelectorAll("[data-mode]").forEach(function (o) {
    o.addEventListener("click", function () {
      etat.mode = o.dataset.mode;
      form.querySelectorAll("[data-mode]").forEach(function (x) { x.setAttribute("aria-selected", x === o); });
      form.querySelectorAll("[data-champs]").forEach(function (c) { c.hidden = c.dataset.champs !== etat.mode; });
    });
  });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    etat.cherche = true;
    var resume = document.getElementById("resume-recherche");
    if (etat.mode === "courte") {
      etat.arrivee = arr.value; etat.depart = dep.value;
      if (etat.arrivee && etat.depart && etat.depart <= etat.arrivee) { etat.depart = u.ajouterJours(etat.arrivee, 1); dep.value = etat.depart; }
      etat.voyageurs = +document.getElementById("r-voy").value;
      resume.textContent = etat.arrivee && etat.depart
        ? "Logements libres du " + u.dateLongue(etat.arrivee) + " au " + u.dateLongue(etat.depart) + ", pour " + etat.voyageurs + " voyageur" + (etat.voyageurs > 1 ? "s" : "") + "."
        : "Logements pour " + etat.voyageurs + " voyageur" + (etat.voyageurs > 1 ? "s" : "") + ". Ajoutez vos dates pour voir le prix total.";
      choisirFiltre("courte");
    } else {
      etat.emmenagement = emm.value; etat.chambres = +document.getElementById("r-ch").value;
      resume.textContent = "Logements à l'année" + (etat.emmenagement ? " pour un emménagement à partir du " + u.dateLongue(etat.emmenagement) : "") + ".";
      choisirFiltre("longue");
    }
    document.getElementById("logements").scrollIntoView();
  });

  /* ---------- Quartier ---------- */
  document.getElementById("reperes").innerHTML = S.reperes.map(function (r) {
    return "<li>" + u.icone(r.icone) + "<div>" + u.esc(r.nom) + "</div>" + (r.trajet ? "<span>" + u.esc(r.trajet) + "</span>" : "") + "</li>";
  }).join("");
  // La carte n'est chargée qu'à la demande : page plus légère sur une connexion lente.
  document.getElementById("btn-carte").addEventListener("click", function () {
    var c = S.carte, d = 0.02;
    var bbox = [c.lon - d * 1.6, c.lat - d, c.lon + d * 1.6, c.lat + d].join(",");
    document.getElementById("carte-geo").innerHTML = '<iframe title="Carte du quartier d\'Adidogomé" loading="lazy" src="https://www.openstreetmap.org/export/embed.html?bbox=' + bbox + '&layer=mapnik"></iframe>';
  });

  /* ---------- Avis (uniquement des avis réels) ---------- */
  var zone = document.getElementById("zone-avis");
  if (S.avis.length) {
    zone.innerHTML = '<div class="avis-grille">' + S.avis.map(function (a) {
      return '<figure class="avis"><div class="etoiles" aria-label="' + a.note + ' sur 5">' + new Array(a.note + 1).join(u.icone("star")) + "</div><blockquote>" + u.esc(a.texte) + "</blockquote><figcaption><strong>" + u.esc(a.prenom) + "</strong>, " + u.esc(a.date) + "</figcaption></figure>";
    }).join("") + "</div>";
  } else {
    zone.innerHTML = '<div class="avis-vide"><div><h3>Nos premiers avis arrivent</h3><p>Nous publions uniquement les avis de vrais voyageurs, avec leur accord. En attendant, posez-nous toutes vos questions et demandez une visite en vidéo du logement.</p></div>' +
      '<a class="btn btn-contour" href="' + u.lienWhatsApp("Bonjour, est-il possible de voir un logement en vidéo sur WhatsApp ?") + '" target="_blank" rel="noopener">' + u.icone("video") + " Demander une visite vidéo</a></div>";
  }

  /* ---------- Textes issus des réglages ---------- */
  document.querySelectorAll("[data-acompte]").forEach(function (e) { e.textContent = S.acomptePourcent; });
  document.querySelectorAll("[data-heure-arrivee]").forEach(function (e) { e.textContent = S.arrivee; });
  document.querySelectorAll("[data-heure-depart]").forEach(function (e) { e.textContent = S.depart; });
  document.getElementById("pied-biens").innerHTML = B.map(function (b) { return '<li><a href="appartement.html?id=' + encodeURIComponent(b.id) + '">' + u.esc(b.nom) + "</a></li>"; }).join("");

  /* ---------- Données structurées pour Google ---------- */
  var ld = document.createElement("script");
  ld.type = "application/ld+json";
  ld.textContent = JSON.stringify({
    "@context": "https://schema.org", "@type": "LodgingBusiness", name: S.nom, description: S.accroche,
    telephone: S.telephoneAffiche, email: S.email, priceRange: "FCFA",
    address: { "@type": "PostalAddress", addressLocality: S.ville, addressRegion: "Maritime", addressCountry: "TG", streetAddress: S.quartier },
    geo: { "@type": "GeoCoordinates", latitude: S.carte.lat, longitude: S.carte.lon },
    checkinTime: S.arrivee.replace("h", ":"), checkoutTime: S.depart.replace("h", ":")
  });
  if (!S.demo) document.head.appendChild(ld);

  afficher();
})();
