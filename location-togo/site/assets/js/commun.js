/* Outils partagés par toutes les pages : icônes, formats, WhatsApp, calendrier. */
(function () {
  var S = window.SITE;

  /* ---------- Icônes (traits simples, 24x24) ---------- */
  var P = {
    wifi: '<path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><path d="M12 20h.01"/>',
    clim: '<path d="M2 12h20M12 2v20"/><path d="m20 16-4-4 4-4M4 8l4 4-4 4M16 4l-4 4-4-4M8 20l4-4 4 4"/>',
    groupe: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
    droplet: '<path d="M12 2.7 17.7 8.3a8 8 0 1 1-11.3 0z"/>',
    cuisine: '<path d="M3 2v7a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V2M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6a2 2 0 0 0 2 2h3zm0 0v7"/>',
    tv: '<rect x="2" y="7" width="20" height="15" rx="2"/><path d="m17 2-5 5-5-5"/>',
    parking: '<path d="M19 17h2a1 1 0 0 0 1-1v-3a2 2 0 0 0-1.5-1.9L18 10l-2.7-3.6a1 1 0 0 0-.8-.4h-5a1 1 0 0 0-.8.4L6 10l-2.5 1.1A2 2 0 0 0 2 13v3a1 1 0 0 0 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M9 17h6"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    linge: '<rect x="3" y="2" width="18" height="20" rx="2"/><circle cx="12" cy="13" r="5"/><path d="M7 6h.01M10 6h.01"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    bed: '<path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/>',
    bath: '<path d="M9 6 6.5 3.5A1.5 1.5 0 0 0 4 4.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5M2 12h20M7 19v2M17 19v2"/>',
    surface: '<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    message: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/>',
    wallet: '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>',
    key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
    plane: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2a1 1 0 0 0-1.1.5l-.3.5a1 1 0 0 0 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3a1 1 0 0 0 1.3.3l.5-.2a1 1 0 0 0 .5-1.2z"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
    travail: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M2 20h20"/>',
    balcon: '<path d="M4 21V11a8 8 0 0 1 16 0v10M2 21h20M8 21v-6M12 21v-6M16 21v-6"/>',
    star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8"/>',
    video: '<path d="m22 8-6 4 6 4V8z"/><rect x="2" y="6" width="14" height="12" rx="2"/>'
  };
  function icone(nom, cls) {
    return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (P[nom] || P.check) + '</svg>';
  }

  /* Libellés des équipements : la clé utilisée dans biens.js → texte et icône. */
  var EQUIPEMENTS = {
    "clim": { t: "Climatisation", i: "clim" },
    "wifi": { t: "Wifi", i: "wifi" },
    "groupe": { t: "Groupe électrogène", i: "groupe" },
    "forage": { t: "Eau par forage", i: "droplet" },
    "cuisine": { t: "Cuisine équipée", i: "cuisine" },
    "eau-chaude": { t: "Eau chaude", i: "flame" },
    "tv": { t: "Télévision", i: "tv" },
    "lave-linge": { t: "Lave-linge", i: "linge" },
    "parking": { t: "Parking", i: "parking" },
    "gardien": { t: "Gardien", i: "shield" },
    "travail": { t: "Espace de travail", i: "travail" },
    "balcon": { t: "Balcon", i: "balcon" }
  };

  /* ---------- Formats ---------- */
  function fcfa(n) {
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " FCFA";
  }
  function euros(n) {
    return "≈ " + Math.round(n / S.tauxEuro).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " €";
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- Dates (chaînes AAAA-MM-JJ, sans fuseau horaire) ---------- */
  function iso(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function lireDate(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function ajouterJours(s, n) { var d = lireDate(s); d.setDate(d.getDate() + n); return iso(d); }
  function nuits(a, b) { return Math.round((lireDate(b) - lireDate(a)) / 864e5); }
  function aujourdhui() { return iso(new Date()); }
  var MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  function dateLongue(s) { var d = lireDate(s); return (d.getDate() === 1 ? "1er" : d.getDate()) + " " + MOIS[d.getMonth()] + " " + d.getFullYear(); }
  var MOIS_COURT = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  function dateCourte(s) { var d = lireDate(s); return d.getDate() + " " + MOIS_COURT[d.getMonth()]; }

  /* Une nuit est occupée si elle tombe dans [arrivée, départ[ d'une réservation existante. */
  function nuitOccupee(bien, s) {
    return (bien.occupe || []).some(function (r) { return s >= r[0] && s < r[1]; });
  }
  function periodeLibre(bien, a, b) {
    for (var d = a; d < b; d = ajouterJours(d, 1)) if (nuitOccupee(bien, d)) return false;
    return true;
  }

  /* ---------- Prix courte durée ----------
   * Moins de 7 nuits : tarif nuit. 7 à 27 nuits : tarif semaine ramené à la nuit.
   * 28 nuits et plus : tarif mois ramené à la nuit (base 30 jours). */
  function devis(bien, a, b) {
    var n = nuits(a, b), p = bien.prix, parNuit, formule;
    if (n >= 28 && p.mois) { parNuit = p.mois / 30; formule = "Tarif mensuel"; }
    else if (n >= 7 && p.semaine) { parNuit = p.semaine / 7; formule = "Tarif semaine"; }
    else { parNuit = p.nuit; formule = "Tarif nuit"; }
    var hebergement = Math.round(parNuit * n);
    var menage = p.menage || 0;
    var total = hebergement + menage;
    return {
      nuits: n, parNuit: parNuit, formule: formule, hebergement: hebergement, menage: menage, total: total,
      economie: Math.max(0, Math.round(p.nuit * n - hebergement)),
      acompte: Math.round(total * S.acomptePourcent / 100)
    };
  }

  function prixDepart(bien) {
    if (bien.offres.indexOf("courte") > -1 && bien.prix.nuit) return { montant: bien.prix.nuit, unite: "nuit" };
    return { montant: bien.prix.loyer, unite: "mois" };
  }

  /* ---------- WhatsApp ---------- */
  function lienWhatsApp(texte) {
    return "https://wa.me/" + S.whatsapp + "?text=" + encodeURIComponent(texte);
  }

  /* ---------- Visuel « photo à venir » ---------- */
  var TEINTES = [["#C8A27A", "#8C5A3C"], ["#9DB3A0", "#3F6450"], ["#D9B88F", "#B0643B"], ["#B8A99A", "#5E4B3C"], ["#A9B8B5", "#46605B"]];
  function visuel(bien, index, legende, attrs) {
    var photo = bien.photos && bien.photos[index];
    if (photo) {
      return '<img src="' + esc(photo.src || photo) + '" alt="' + esc(photo.alt || bien.nom + ", " + (legende || "photo")) + '" loading="lazy" decoding="async" ' + (attrs || "") + '>';
    }
    var h = 0; for (var i = 0; i < bien.id.length; i++) h += bien.id.charCodeAt(i);
    var t = TEINTES[(h + index) % TEINTES.length];
    return '<div class="ph" style="--a:' + t[0] + ';--b:' + t[1] + '" role="img" aria-label="Photo à venir : ' + esc(legende || bien.nom) + '">' +
      icone("image") + '<span>' + esc(legende || "Photo à venir") + '</span></div>';
  }

  /* ---------- Calendrier de sélection de dates ----------
   * Affiche deux mois (un seul sur téléphone), grise le passé et les nuits occupées,
   * et empêche une période qui chevauche une réservation existante. */
  function Calendrier(conteneur, bien, options) {
    this.el = conteneur; this.bien = bien; this.opt = options || {};
    this.debut = this.opt.debut || null; this.fin = this.opt.fin || null;
    var d = this.debut ? lireDate(this.debut) : new Date();
    this.mois = new Date(d.getFullYear(), d.getMonth(), 1);
    var self = this;
    this.el.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b || b.disabled) return;
      if (b.dataset.nav) { self.mois.setMonth(self.mois.getMonth() + (+b.dataset.nav)); self.rendre(); return; }
      if (b.dataset.jour) self.choisir(b.dataset.jour);
    });
    this.rendre();
  }
  Calendrier.prototype.choisir = function (j) {
    var min = this.bien.minNuits || 1;
    if (!this.debut || this.fin || j <= this.debut) { this.debut = j; this.fin = null; this.message = "Choisissez maintenant la date de départ."; }
    else if (nuits(this.debut, j) < min) { this.message = "Minimum " + min + " nuits pour ce logement."; }
    else if (!periodeLibre(this.bien, this.debut, j)) { this.debut = j; this.fin = null; this.message = "Cette période chevauche une réservation. Nouvelle arrivée choisie."; }
    else { this.fin = j; this.message = nuits(this.debut, j) + " nuits sélectionnées."; }
    this.rendre();
    if (this.opt.onChange) this.opt.onChange(this.debut, this.fin);
  };
  Calendrier.prototype.effacer = function () { this.debut = this.fin = null; this.message = ""; this.rendre(); if (this.opt.onChange) this.opt.onChange(null, null); };
  Calendrier.prototype.moisHtml = function (m) {
    var an = m.getFullYear(), mo = m.getMonth(), auj = aujourdhui();
    var premier = (new Date(an, mo, 1).getDay() + 6) % 7; // lundi = 0
    var total = new Date(an, mo + 1, 0).getDate();
    var h = '<div class="cal-mois"><div class="cal-titre">' + MOIS[mo] + " " + an + '</div><div class="cal-grille">';
    ["L", "M", "M", "J", "V", "S", "D"].forEach(function (x) { h += '<span class="cal-jsem">' + x + "</span>"; });
    for (var i = 0; i < premier; i++) h += "<span></span>";
    for (var j = 1; j <= total; j++) {
      var s = iso(new Date(an, mo, j));
      var occ = nuitOccupee(this.bien, s);
      // Un jour occupé reste cliquable comme date de départ si la période choisie est libre.
      var finPossible = this.debut && !this.fin && s > this.debut && periodeLibre(this.bien, this.debut, s);
      var off = s < auj || (occ && !finPossible);
      var cls = "cal-j";
      if (occ) cls += " occ";
      if (s === this.debut || s === this.fin) cls += " sel";
      if (this.debut && this.fin && s > this.debut && s < this.fin) cls += " dans";
      if (s === auj) cls += " auj";
      h += '<button type="button" class="' + cls + '" data-jour="' + s + '"' + (off ? " disabled" : "") +
        ' aria-label="' + dateLongue(s) + (occ ? ", déjà réservé" : "") + '"' + ((s === this.debut || s === this.fin) ? ' aria-pressed="true"' : "") + ">" + j + "</button>";
    }
    return h + "</div></div>";
  };
  Calendrier.prototype.rendre = function () {
    var m2 = new Date(this.mois.getFullYear(), this.mois.getMonth() + 1, 1);
    var debutMois = new Date(); debutMois = new Date(debutMois.getFullYear(), debutMois.getMonth(), 1);
    this.el.innerHTML =
      '<div class="cal-nav"><button type="button" data-nav="-1" aria-label="Mois précédent"' + (this.mois <= debutMois ? " disabled" : "") + ">" + icone("left") + '</button>' +
      '<button type="button" data-nav="1" aria-label="Mois suivant">' + icone("right") + "</button></div>" +
      '<div class="cal-mois-wrap">' + this.moisHtml(this.mois) + '<div class="cal-second">' + this.moisHtml(m2) + "</div></div>" +
      '<div class="cal-legende"><span><i class="lg-occ"></i>Déjà réservé</span><span><i class="lg-sel"></i>Votre séjour</span></div>' +
      '<p class="cal-msg" aria-live="polite">' + esc(this.message || "") + "</p>";
  };

  /* ---------- Éléments communs de page ---------- */
  function initPage() {
    document.querySelectorAll("[data-site-nom]").forEach(function (e) { e.textContent = S.nom; });
    document.querySelectorAll("[data-annee]").forEach(function (e) { e.textContent = new Date().getFullYear(); });
    document.querySelectorAll("[data-tel]").forEach(function (e) { e.textContent = S.telephoneAffiche; e.href = "tel:+" + S.whatsapp; });
    document.querySelectorAll("[data-email]").forEach(function (e) { e.textContent = S.email; e.href = "mailto:" + S.email; });
    document.querySelectorAll("[data-wa]").forEach(function (e) {
      e.href = lienWhatsApp(e.dataset.wa || ("Bonjour, je vous contacte depuis le site " + S.nom + "."));
      e.target = "_blank"; e.rel = "noopener";
    });
    document.querySelectorAll("[data-ic]").forEach(function (e) { e.insertAdjacentHTML("afterbegin", icone(e.dataset.ic)); });

    if (S.demo) {
      var b = document.createElement("div");
      b.className = "bandeau-demo";
      b.innerHTML = "Version de travail : prix, photos, avis et coordonnées sont des exemples à remplacer avant la mise en ligne.";
      document.body.prepend(b);
    }

    var burger = document.querySelector(".burger"), nav = document.querySelector(".nav");
    if (burger && nav) {
      burger.innerHTML = icone("menu");
      burger.addEventListener("click", function () {
        var ouvert = nav.classList.toggle("ouvert");
        burger.setAttribute("aria-expanded", ouvert);
        burger.innerHTML = icone(ouvert ? "x" : "menu");
      });
      nav.addEventListener("click", function (e) { if (e.target.tagName === "A") { nav.classList.remove("ouvert"); burger.setAttribute("aria-expanded", false); burger.innerHTML = icone("menu"); } });
    }

    var header = document.querySelector(".entete");
    if (header) {
      var maj = function () { header.classList.toggle("defile", window.scrollY > 10); };
      window.addEventListener("scroll", maj, { passive: true }); maj();
    }
  }

  window.U = {
    icone: icone, EQUIPEMENTS: EQUIPEMENTS, fcfa: fcfa, euros: euros, esc: esc,
    iso: iso, ajouterJours: ajouterJours, nuits: nuits, aujourdhui: aujourdhui, dateLongue: dateLongue, dateCourte: dateCourte,
    nuitOccupee: nuitOccupee, periodeLibre: periodeLibre, devis: devis, prixDepart: prixDepart,
    lienWhatsApp: lienWhatsApp, visuel: visuel, Calendrier: Calendrier, initPage: initPage
  };
})();
