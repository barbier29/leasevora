const express = require('express');
const router = express.Router();
const { load, save, nextId } = require('../store');
const { requireRole, requireAuth, denyRoles } = require('../middleware/auth');

const MGR = requireRole('PROPRIETAIRE', 'GESTIONNAIRE', 'AGENT');
const NO_TECH = denyRoles('TECHNICIEN');

// Calcule le total théorique d'un séjour selon son tarif et ses dates
function computeTotal(s) {
    if (s.type_tarif === 'FORFAIT') return s.montant;
    if (!s.date_fin) return s.montant; // no end date — just return unit price
    const days = Math.max(0, Math.round((new Date(s.date_fin) - new Date(s.date_debut)) / 86400000));
    if (s.type_tarif === 'MENSUEL') {
        const months = Math.max(1, Math.round(days / 30));
        return s.montant * months;
    }
    if (s.type_tarif === 'HEBDOMADAIRE') {
        const weeks = Math.max(1, Math.round(days / 7));
        return s.montant * weeks;
    }
    // JOURNALIER / NUITEE
    return s.montant * Math.max(1, days);
}

// Calcule le statut de paiement depuis les transactions liées
function computePaymentStatus(s, data) {
    const totalDu = s.montant_total_du || computeTotal(s);
    const paiements = (data.transactions || []).filter(t =>
        t.sejour_id === s.id && t.kind === 'IN'
    );
    const totalPaye = paiements.reduce((sum, t) => sum + t.amount, 0);
    const solde = totalDu - totalPaye;
    let statut_paiement;
    if (totalPaye <= 0)           statut_paiement = 'EN_ATTENTE';
    else if (solde <= 0.01)       statut_paiement = 'SOLDE';
    else                          statut_paiement = 'PARTIEL';
    return {
        montant_total_du: totalDu,
        montant_paye: totalPaye,
        solde_restant: Math.max(0, solde),
        statut_paiement,
        nb_paiements: paiements.length,
    };
}

function enrich(s, data) {
    const unit = data.units.find(u => u.id === s.unit_id) || {};
    const prop = data.properties.find(p => p.id === unit.property_id) || {};
    const payment = computePaymentStatus(s, data);
    return {
        ...s,
        unit_label: unit.label || '?',
        property_name: prop.name || '?',
        property_id: unit.property_id || null,
        ...payment,
    };
}

// GET all — tous sauf TECHNICIEN
router.get('/', requireAuth, NO_TECH, (req, res) => {
    const { unit_id, property_id } = req.query;
    const data = load();
    let list = data.sejours;
    if (unit_id) list = list.filter(s => s.unit_id === Number(unit_id));
    if (property_id) {
        const unitIds = data.units.filter(u => u.property_id === Number(property_id)).map(u => u.id);
        list = list.filter(s => unitIds.includes(s.unit_id));
    }
    list = list.sort((a, b) => b.date_debut.localeCompare(a.date_debut));
    res.json(list.map(s => enrich(s, data)));
});

// GET /sejours/cautions — vue d'ensemble des cautions
router.get('/cautions', requireAuth, NO_TECH, (req, res) => {
    const data = load();
    const cautions = data.sejours
        .filter(s => s.caution_montant > 0)
        .map(s => {
            const unit = data.units.find(u => u.id === s.unit_id) || {};
            const prop = data.properties.find(p => p.id === unit.property_id) || {};
            return {
                sejour_id: s.id,
                locataire: s.locataire,
                locataire_id: s.locataire_id,
                unit_label: unit.label || '?',
                property_name: prop.name || '?',
                statut_sejour: s.statut,
                caution_montant: s.caution_montant,
                caution_statut: s.caution_statut,
                caution_date: s.caution_date,
                caution_date_restitution: s.caution_date_restitution,
                caution_montant_utilise: s.caution_montant_utilise || 0,
                caution_notes: s.caution_notes,
                caution_historique: s.caution_historique || [],
                date_debut: s.date_debut,
                date_fin: s.date_fin,
            };
        })
        .sort((a, b) => b.date_debut.localeCompare(a.date_debut));

    const summary = {
        total_cautions: cautions.length,
        total_montant: cautions.reduce((s, c) => s + c.caution_montant, 0),
        en_attente: cautions.filter(c => c.caution_statut === 'EN_ATTENTE').length,
        payees: cautions.filter(c => c.caution_statut === 'PAYEE').length,
        a_restituer: cautions.filter(c => ['PAYEE', 'EN_ATTENTE'].includes(c.caution_statut) && c.statut_sejour === 'TERMINE').length,
        restituees: cautions.filter(c => c.caution_statut === 'RESTITUEE').length,
        retenues: cautions.filter(c => ['UTILISEE_PARTIELLE', 'UTILISEE_TOTALE'].includes(c.caution_statut)).length,
    };

    res.json({ summary, cautions });
});

// GET single — tous sauf TECHNICIEN
router.get('/:id', requireAuth, NO_TECH, (req, res) => {
    const data = load();
    const s = data.sejours.find(s => s.id === Number(req.params.id));
    if (!s) return res.status(404).json({ error: 'Non trouvé' });
    res.json(enrich(s, data));
});

// GET /sejours/:id/solde — détail des paiements (tous sauf TECHNICIEN)
router.get('/:id/solde', requireAuth, NO_TECH, (req, res) => {
    const data = load();
    const s = data.sejours.find(s => s.id === Number(req.params.id));
    if (!s) return res.status(404).json({ error: 'Non trouvé' });

    const totalDu = s.montant_total_du || computeTotal(s);
    const paiements = (data.transactions || [])
        .filter(t => t.sejour_id === s.id && t.kind === 'IN')
        .sort((a, b) => b.date.localeCompare(a.date))
        .map(t => {
            const cat = data.categories.find(c => c.id === t.category_id) || {};
            return { id: t.id, date: t.date, amount: t.amount, description: t.description || null, category_name: cat.name || '?', source: t.source || 'BANQUE' };
        });
    const totalPaye = paiements.reduce((sum, t) => sum + t.amount, 0);
    const solde = totalDu - totalPaye;

    res.json({
        sejour_id: s.id,
        locataire: s.locataire,
        unit_label: (data.units.find(u => u.id === s.unit_id) || {}).label || '?',
        montant_total_du: totalDu,
        montant_paye: totalPaye,
        solde_restant: Math.max(0, solde),
        statut_paiement: totalPaye <= 0 ? 'EN_ATTENTE' : solde <= 0.01 ? 'SOLDE' : 'PARTIEL',
        paiements,
        caution_montant: s.caution_montant || 0,
        caution_statut: s.caution_statut || 'AUCUNE',
        caution_montant_utilise: s.caution_montant_utilise || 0,
        caution_notes: s.caution_notes || null,
        caution_date: s.caution_date || null,
        caution_date_restitution: s.caution_date_restitution || null,
    });
});

// PATCH /sejours/:id/caution — mettre à jour la caution
router.patch('/:id/caution', MGR, (req, res) => {
    const { caution_statut, caution_montant_utilise, caution_notes, caution_date_restitution } = req.body;
    const data = load();
    const idx = data.sejours.findIndex(s => s.id === Number(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'Non trouvé' });
    const s = data.sejours[idx];

    const VALID = ['AUCUNE', 'EN_ATTENTE', 'PAYEE', 'RESTITUEE', 'UTILISEE_PARTIELLE', 'UTILISEE_TOTALE'];
    if (caution_statut && !VALID.includes(caution_statut))
        return res.status(400).json({ error: 'Statut caution invalide' });

    if (caution_statut !== undefined)          s.caution_statut            = caution_statut;
    if (caution_montant_utilise !== undefined) s.caution_montant_utilise   = Number(caution_montant_utilise);
    if (caution_notes !== undefined)           s.caution_notes             = caution_notes || null;
    if (caution_date_restitution !== undefined) s.caution_date_restitution = caution_date_restitution || null;

    // Track history
    if (!s.caution_historique) s.caution_historique = [];
    s.caution_historique.push({
        date: new Date().toISOString(),
        action: caution_statut || s.caution_statut,
        montant_utilise: s.caution_montant_utilise,
        notes: caution_notes || s.caution_notes || null,
        user: req.user?.login || null,
    });

    save(data);
    res.json(enrich(s, data));
});

// POST create — tous sauf TECHNICIEN
router.post('/', requireAuth, NO_TECH, (req, res) => {
    const { unit_id, date_debut, date_fin,
            heure_entree, heure_sortie, type_tarif, montant, statut, notes,
            caution_montant, caution_date } = req.body;
    let locataire = req.body.locataire;
    let locataire_id = req.body.locataire_id;

    const needsAutoCreate = req.body.create_locataire && !locataire_id && req.body.nom_locataire;
    if (!unit_id || (!locataire && !needsAutoCreate) || !date_debut || !type_tarif || !montant)
        return res.status(400).json({ error: 'unit_id, locataire, date_debut, type_tarif, montant requis' });
    if (isNaN(Date.parse(date_debut)))
        return res.status(400).json({ error: 'date_debut invalide' });
    if (date_fin) {
        if (isNaN(Date.parse(date_fin)))
            return res.status(400).json({ error: 'date_fin invalide' });
        if (new Date(date_fin) <= new Date(date_debut))
            return res.status(400).json({ error: 'date_fin doit être postérieure à date_debut' });
    }
    const parsedMontant = parseFloat(montant);
    if (isNaN(parsedMontant) || parsedMontant <= 0)
        return res.status(400).json({ error: 'Le montant doit être positif' });

    const data = load();

    // Auto-create locataire if requested
    if (req.body.create_locataire && !locataire_id && req.body.nom_locataire) {
        const newLoc = {
            id: nextId(data, 'locataires'),
            nom: req.body.nom_locataire,
            prenom: req.body.prenom_locataire || null,
            email: req.body.email_locataire || null,
            telephone: req.body.telephone_locataire || null,
            adresse: null,
            num_piece_identite: null,
            type_piece: null,
            caution: Number(req.body.caution_montant) || 0,
            notes: null,
            created_at: new Date().toISOString(),
        };
        data.locataires.push(newLoc);
        locataire_id = newLoc.id;
        if (!locataire) locataire = [req.body.prenom_locataire, req.body.nom_locataire].filter(Boolean).join(' ');
    }

    const cautMontant = caution_montant ? Number(caution_montant) : 0;
    const sejour = {
        id: nextId(data, 'sejours'),
        unit_id: Number(unit_id),
        locataire,
        locataire_id: locataire_id ? Number(locataire_id) : null,
        date_debut,
        date_fin: date_fin || null,
        heure_entree: heure_entree || null,
        heure_sortie: heure_sortie || null,
        type_tarif,
        montant: parsedMontant,
        statut: statut || 'A_VENIR',
        notes: notes || null,
        caution_montant: cautMontant,
        caution_statut: cautMontant > 0 ? 'EN_ATTENTE' : 'AUCUNE',
        caution_date: cautMontant > 0 ? (caution_date || date_debut) : null,
        caution_date_restitution: null,
        caution_montant_utilise: 0,
        caution_notes: null,
        created_at: new Date().toISOString(),
    };
    sejour.long_terme = req.body.long_terme || false;
    sejour.jour_paiement = req.body.jour_paiement ? Number(req.body.jour_paiement) : null;
    data.sejours.push(sejour);
    save(data);
    res.status(201).json(enrich(sejour, data));
});

// PUT update — tous sauf TECHNICIEN
router.put('/:id', requireAuth, NO_TECH, (req, res) => {
    const { unit_id, locataire, locataire_id, date_debut, date_fin,
            heure_entree, heure_sortie, type_tarif, montant, statut, notes,
            caution_montant, caution_date } = req.body;
    if (date_debut && isNaN(Date.parse(date_debut)))
        return res.status(400).json({ error: 'date_debut invalide' });
    if (date_fin) {
        if (isNaN(Date.parse(date_fin)))
            return res.status(400).json({ error: 'date_fin invalide' });
        if (date_debut && new Date(date_fin) <= new Date(date_debut))
            return res.status(400).json({ error: 'date_fin doit être postérieure à date_debut' });
    }
    const parsedMontant = parseFloat(montant);
    if (isNaN(parsedMontant) || parsedMontant <= 0)
        return res.status(400).json({ error: 'Le montant doit être positif' });
    const data = load();
    const idx = data.sejours.findIndex(s => s.id === Number(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'Non trouvé' });

    const cautMontant = caution_montant !== undefined ? Number(caution_montant) : data.sejours[idx].caution_montant;
    // If caution amount changes from 0 to >0, set status to EN_ATTENTE unless already set
    let cautStatut = data.sejours[idx].caution_statut;
    if (cautMontant > 0 && cautStatut === 'AUCUNE') cautStatut = 'EN_ATTENTE';
    if (cautMontant === 0) cautStatut = 'AUCUNE';

    data.sejours[idx] = {
        ...data.sejours[idx],
        unit_id: Number(unit_id),
        locataire,
        locataire_id: locataire_id ? Number(locataire_id) : null,
        date_debut,
        date_fin: date_fin || null,
        heure_entree: heure_entree || null,
        heure_sortie: heure_sortie || null,
        type_tarif,
        montant: parsedMontant,
        statut: statut || 'A_VENIR',
        notes: notes || null,
        caution_montant: cautMontant,
        caution_statut: cautStatut,
        caution_date: cautMontant > 0 ? (caution_date || data.sejours[idx].caution_date || date_debut) : null,
    };
    data.sejours[idx].long_terme = req.body.long_terme || false;
    data.sejours[idx].jour_paiement = req.body.jour_paiement ? Number(req.body.jour_paiement) : null;
    save(data);
    res.json(enrich(data.sejours[idx], data));
});

// DELETE — PROPRIETAIRE + GESTIONNAIRE seulement
router.delete('/:id', MGR, (req, res) => {
    const data = load();
    data.sejours = data.sejours.filter(s => s.id !== Number(req.params.id));
    save(data);
    res.json({ success: true });
});

// GET /sejours/:id/facture — données pour la facture
router.get('/:id/facture', requireAuth, NO_TECH, (req, res) => {
    const data = load();
    const s = data.sejours.find(s => s.id === Number(req.params.id));
    if (!s) return res.status(404).json({ error: 'Non trouvé' });
    const unit = data.units.find(u => u.id === s.unit_id) || {};
    const prop = data.properties.find(p => p.id === unit.property_id) || {};
    const loc = s.locataire_id ? data.locataires.find(l => l.id === s.locataire_id) : null;
    const payment = computePaymentStatus(s, data);

    // Numéro de facture : FAC-{year}-{sejour_id padded}
    const year = new Date().getFullYear();
    const numFacture = `FAC-${year}-${String(s.id).padStart(4, '0')}`;

    res.json({
        num_facture: numFacture,
        date_emission: new Date().toISOString().slice(0, 10),
        sejour: s,
        unit,
        property: prop,
        locataire: loc,
        payment,
    });
});

// GET /sejours/:id/echeancier — échéancier mensuel pour séjours long terme
router.get('/:id/echeancier', requireAuth, NO_TECH, (req, res) => {
    const data = load();
    const s = data.sejours.find(s => s.id === Number(req.params.id));
    if (!s) return res.status(404).json({ error: 'Non trouvé' });

    const montantMensuel = s.montant;
    const dateDebut = new Date(s.date_debut);
    const dateFin = s.date_fin ? new Date(s.date_fin) : new Date(); // if no end, up to today
    const jourPaiement = s.jour_paiement || dateDebut.getDate();

    // Generate monthly periods from start to now (or end date)
    const periodes = [];
    let current = new Date(dateDebut);
    const limit = s.date_fin ? new Date(s.date_fin) : new Date();
    // Add one month buffer after today to show upcoming
    limit.setMonth(limit.getMonth() + 1);

    let idx = 0;
    while (current <= limit && idx < 120) { // max 10 years
        const periodStart = new Date(current.getFullYear(), current.getMonth(), jourPaiement);
        // Clamp to actual days in month
        const maxDay = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
        if (periodStart.getDate() > maxDay) periodStart.setDate(maxDay);

        const periodEnd = new Date(periodStart);
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        periodEnd.setDate(periodEnd.getDate() - 1);

        const monthKey = `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, '0')}`;

        periodes.push({
            index: idx,
            mois: monthKey,
            label: `${periodStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — ${periodEnd.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`,
            debut: periodStart.toISOString().slice(0, 10),
            fin: periodEnd.toISOString().slice(0, 10),
            montant_du: montantMensuel,
            paye: 0,
            statut: 'IMPAYE', // will be updated below
            paiements: [],
        });

        current.setMonth(current.getMonth() + 1);
        idx++;
    }

    // Match transactions to periods
    const txns = (data.transactions || []).filter(t => t.sejour_id === s.id && t.kind === 'IN');

    for (const t of txns) {
        const tDate = new Date(t.date);
        // Find which period this payment belongs to
        let matched = false;
        for (const p of periodes) {
            if (tDate >= new Date(p.debut) && tDate <= new Date(p.fin)) {
                p.paye += t.amount;
                p.paiements.push({ id: t.id, date: t.date, amount: t.amount, description: t.description });
                matched = true;
                break;
            }
        }
        // If no period matched, add to the closest prior period
        if (!matched && periodes.length > 0) {
            for (let i = periodes.length - 1; i >= 0; i--) {
                if (tDate >= new Date(periodes[i].debut)) {
                    periodes[i].paye += t.amount;
                    periodes[i].paiements.push({ id: t.id, date: t.date, amount: t.amount, description: t.description });
                    break;
                }
            }
        }
    }

    // Cascade surplus payments to next periods
    for (let i = 0; i < periodes.length; i++) {
        const p = periodes[i];
        if (p.paye > p.montant_du && i + 1 < periodes.length) {
            const surplus = p.paye - p.montant_du;
            periodes[i + 1].paye += surplus;
            p.paye = p.montant_du;
        }
    }

    // Update statuts
    const today = new Date().toISOString().slice(0, 10);
    for (const p of periodes) {
        if (p.paye >= p.montant_du) p.statut = 'PAYE';
        else if (p.paye > 0) p.statut = 'PARTIEL';
        else if (p.debut > today) p.statut = 'A_VENIR';
        else p.statut = 'IMPAYE';
    }

    const totalDu = periodes.filter(p => p.debut <= today).reduce((s, p) => s + p.montant_du, 0);
    const totalPaye = periodes.reduce((s, p) => s + p.paye, 0);
    const moisImpayes = periodes.filter(p => p.statut === 'IMPAYE').length;

    res.json({
        sejour_id: s.id,
        locataire: s.locataire,
        montant_mensuel: montantMensuel,
        jour_paiement: jourPaiement,
        total_du: totalDu,
        total_paye: totalPaye,
        solde: totalDu - totalPaye,
        mois_impayes: moisImpayes,
        periodes,
    });
});

// POST /sejours/:id/resilier — résilier un contrat long terme
router.post('/:id/resilier', MGR, (req, res) => {
    const data = load();
    const idx = data.sejours.findIndex(s => s.id === Number(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'Non trouvé' });
    const s = data.sejours[idx];

    const dateFin = req.body.date_fin || new Date().toISOString().slice(0, 10);
    s.date_fin = dateFin;
    s.statut = 'TERMINE';
    s.long_terme = false;

    save(data);
    res.json(enrich(s, data));
});

// GET quittance de loyer — tous sauf TECHNICIEN
router.get('/:id/quittance', requireAuth, NO_TECH, (req, res) => {
    const data = load();
    const s = data.sejours.find(s => s.id === Number(req.params.id));
    if (!s) return res.status(404).json({ error: 'Non trouvé' });
    const unit = data.units.find(u => u.id === s.unit_id) || {};
    const prop = data.properties.find(p => p.id === unit.property_id) || {};
    const loc = s.locataire_id ? data.locataires.find(l => l.id === s.locataire_id) : null;
    const txns = data.transactions.filter(t => t.sejour_id === s.id && t.kind === 'IN');
    const totalPaye = txns.reduce((sum, t) => sum + t.amount, 0);

    // Compute period coverage based on payments
    const montantMensuel = s.montant || 0;
    const jourPaiement = s.jour_paiement || new Date(s.date_debut).getDate();
    let periodes_couvertes = [];

    if (montantMensuel > 0 && (s.type_tarif === 'MENSUEL' || s.long_terme || s.statut === 'LONG_TERME')) {
        // Generate periods and mark which ones are covered
        const dateDebut = new Date(s.date_debut);
        let current = new Date(dateDebut);
        let remaining = totalPaye;
        let idx = 0;

        while (remaining > 0 && idx < 120) {
            const jp = s.jour_paiement || dateDebut.getDate();
            const maxDay = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
            const day = Math.min(jp, maxDay);
            const periodStart = new Date(current.getFullYear(), current.getMonth(), day);
            const periodEnd = new Date(periodStart);
            periodEnd.setMonth(periodEnd.getMonth() + 1);
            periodEnd.setDate(periodEnd.getDate() - 1);

            const couvert = Math.min(remaining, montantMensuel);
            const pct = Math.round((couvert / montantMensuel) * 100);

            periodes_couvertes.push({
                debut: periodStart.toISOString().slice(0, 10),
                fin: periodEnd.toISOString().slice(0, 10),
                label: `${periodStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} — ${periodEnd.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`,
                montant_du: montantMensuel,
                montant_couvert: couvert,
                pourcentage: pct,
                statut: pct >= 100 ? 'COMPLET' : 'PARTIEL',
            });

            remaining -= couvert;
            current.setMonth(current.getMonth() + 1);
            idx++;
        }
    } else if (totalPaye > 0) {
        // Non-mensuel: single period = séjour dates
        periodes_couvertes.push({
            debut: s.date_debut,
            fin: s.date_fin || null,
            label: `${new Date(s.date_debut).toLocaleDateString('fr-FR')} — ${s.date_fin ? new Date(s.date_fin).toLocaleDateString('fr-FR') : 'En cours'}`,
            montant_du: computeTotal(s),
            montant_couvert: totalPaye,
            pourcentage: Math.round((totalPaye / Math.max(1, computeTotal(s))) * 100),
            statut: totalPaye >= computeTotal(s) ? 'COMPLET' : 'PARTIEL',
        });
    }

    res.json({ sejour: s, unit, property: prop, locataire: loc, paiements: txns, total_paye: totalPaye, periodes_couvertes });
});

// POST renouveler un séjour — tous sauf TECHNICIEN
router.post('/:id/renouveler', requireAuth, NO_TECH, (req, res) => {
    const data = load();
    const s = data.sejours.find(s => s.id === Number(req.params.id));
    if (!s) return res.status(404).json({ error: 'Non trouvé' });
    res.json({
        unit_id: s.unit_id,
        locataire_id: s.locataire_id,
        locataire: s.locataire,
        montant: s.montant,
        type_tarif: s.type_tarif,
        date_debut: s.date_fin,
        caution: s.caution,
    });
});

module.exports = router;
