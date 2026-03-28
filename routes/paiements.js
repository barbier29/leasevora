const express = require('express');
const router = express.Router();
const { load } = require('../store');
const { requireRole, requireAuth } = require('../middleware/auth');

const MGR = requireRole('PROPRIETAIRE', 'GESTIONNAIRE');

// Duplicated from routes/sejours.js — cannot be imported from there
function computeTotal(s) {
    if (s.type_tarif === 'FORFAIT') return s.montant;
    if (!s.date_fin) return s.montant;
    const days = Math.max(0, Math.round((new Date(s.date_fin) - new Date(s.date_debut)) / 86400000));
    if (s.type_tarif === 'MENSUEL') return s.montant * Math.max(1, Math.round(days / 30));
    if (s.type_tarif === 'HEBDOMADAIRE') return s.montant * Math.max(1, Math.round(days / 7));
    return s.montant * Math.max(1, days);
}

function computePaymentStatus(s, data) {
    const totalDu = s.montant_total_du || computeTotal(s);
    const paiements = (data.transactions || []).filter(t => t.sejour_id === s.id && t.kind === 'IN');
    const totalPaye = paiements.reduce((sum, t) => sum + t.amount, 0);
    const solde = totalDu - totalPaye;
    let statut_paiement;
    if (totalPaye <= 0) statut_paiement = 'EN_ATTENTE';
    else if (solde <= 0.01) statut_paiement = 'SOLDE';
    else statut_paiement = 'PARTIEL';
    return { montant_total_du: totalDu, montant_paye: totalPaye, solde_restant: Math.max(0, solde), statut_paiement, nb_paiements: paiements.length };
}

// GET /api/paiements/suivi — tableau de bord de suivi des paiements
router.get('/suivi', MGR, (req, res) => {
    const { statut, locataire_id } = req.query;
    const data = load();

    // Build a lookup for units and properties
    const unitMap = {};
    for (const u of (data.units || [])) unitMap[u.id] = u;
    const propMap = {};
    for (const p of (data.properties || [])) propMap[p.id] = p;

    // Build per-locataire data from all locataires
    const locataires = data.locataires || [];
    const sejours = data.sejours || [];

    const clientRows = [];

    for (const loc of locataires) {
        const locSejours = sejours.filter(s => s.locataire_id === loc.id);

        // Build enriched sejour list, skipping zero-value sejours
        const enrichedSejours = [];
        for (const s of locSejours) {
            const payment = computePaymentStatus(s, data);

            // Skip sejours with no monetary value at all
            if (payment.montant_total_du <= 0) continue;

            const unit = unitMap[s.unit_id] || {};
            const prop = propMap[unit.property_id] || {};

            const paiementsList = (data.transactions || [])
                .filter(t => t.sejour_id === s.id && t.kind === 'IN')
                .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
                .map(t => ({ id: t.id, date: t.date, amount: t.amount, description: t.description || null }));

            enrichedSejours.push({
                id: s.id,
                property_name: prop.name || '?',
                unit_label: unit.label || '?',
                date_debut: s.date_debut,
                date_fin: s.date_fin || null,
                statut: s.statut,
                type_tarif: s.type_tarif,
                montant: s.montant,
                montant_total_du: payment.montant_total_du,
                montant_paye: payment.montant_paye,
                solde_restant: payment.solde_restant,
                statut_paiement: payment.statut_paiement,
                nb_paiements: payment.nb_paiements,
                caution_montant: s.caution_montant || 0,
                caution_statut: s.caution_statut || 'AUCUNE',
                paiements: paiementsList,
            });
        }

        // Skip locataires with no qualifying sejours
        if (enrichedSejours.length === 0) continue;

        const total_du = enrichedSejours.reduce((sum, s) => sum + s.montant_total_du, 0);
        const total_paye = enrichedSejours.reduce((sum, s) => sum + s.montant_paye, 0);
        const solde = enrichedSejours.reduce((sum, s) => sum + s.solde_restant, 0);

        let statut_global;
        if (solde <= 0.01) statut_global = 'SOLDE';
        else if (total_paye <= 0) statut_global = 'EN_ATTENTE';
        else statut_global = 'PARTIEL';

        clientRows.push({
            id: loc.id,
            prenom: loc.prenom,
            nom: loc.nom,
            tel: loc.tel || null,
            email: loc.email || null,
            nb_sejours: enrichedSejours.length,
            total_du,
            total_paye,
            solde,
            statut_global,
            sejours: enrichedSejours,
        });
    }

    // Compute summary from ALL data (unfiltered)
    const nb_sejours_en_attente = clientRows.reduce((n, c) => n + c.sejours.filter(s => s.statut_paiement === 'EN_ATTENTE').length, 0);
    const nb_sejours_partiels   = clientRows.reduce((n, c) => n + c.sejours.filter(s => s.statut_paiement === 'PARTIEL').length, 0);
    const nb_sejours_soldes     = clientRows.reduce((n, c) => n + c.sejours.filter(s => s.statut_paiement === 'SOLDE').length, 0);
    const total_a_encaisser     = clientRows.reduce((sum, c) => sum + c.solde, 0);
    const nb_clients_debiteurs  = clientRows.filter(c => c.solde > 0.01).length;

    const summary = {
        total_a_encaisser,
        nb_clients_debiteurs,
        nb_sejours_en_attente,
        nb_sejours_partiels,
        nb_sejours_soldes,
    };

    // Apply filters
    let filtered = clientRows;

    if (locataire_id) {
        filtered = filtered.filter(c => c.id === Number(locataire_id));
    }

    if (statut) {
        filtered = filtered.filter(c => c.statut_global === statut);
    }

    // Sort: EN_ATTENTE first, then PARTIEL, then SOLDE; within same status sort by solde desc
    const statutOrder = { EN_ATTENTE: 0, PARTIEL: 1, SOLDE: 2 };
    filtered.sort((a, b) => {
        const diff = (statutOrder[a.statut_global] ?? 3) - (statutOrder[b.statut_global] ?? 3);
        if (diff !== 0) return diff;
        return b.solde - a.solde;
    });

    res.json({ summary, clients: filtered });
});

module.exports = router;
