const express = require('express');
const router = express.Router();
const { load } = require('../store');
const { requireRole } = require('../middleware/auth');

const MGR = requireRole('PROPRIETAIRE');

/**
 * GET /api/caisse
 * Retourne le suivi de trésorerie par compte (caisse ou banque).
 *
 * Query params:
 *   - compte_id   — filtrer sur un compte précis
 *   - property_id — filtrer sur une propriété
 *   - month       — filtrer sur un mois (YYYY-MM)
 */
router.get('/', MGR, (req, res) => {
    const data = load();
    const { property_id, month, compte_id } = req.query;

    const comptes = (data.comptes || []).filter(c => c.actif);
    const comptesFiltered = compte_id
        ? comptes.filter(c => c.id === Number(compte_id))
        : comptes;

    const props = property_id
        ? data.properties.filter(p => p.id === Number(property_id))
        : data.properties;

    // Vue globale : solde de chaque compte (toutes propriétés, tous mois)
    const comptesStats = comptes.map(c => {
        const txns = data.transactions.filter(t => t.compte_id === c.id);
        const totalIn  = txns.filter(t => t.kind === 'IN').reduce((s, t) => s + t.amount, 0);
        const totalOut = txns.filter(t => t.kind === 'OUT').reduce((s, t) => s + t.amount, 0);
        return {
            id: c.id,
            nom: c.nom,
            type: c.type,
            nom_banque: c.nom_banque || null,
            numero_compte: c.numero_compte || null,
            iban: c.iban || null,
            bic: c.bic || null,
            solde_initial: c.solde_initial || 0,
            solde: (c.solde_initial || 0) + totalIn - totalOut,
            total_in: totalIn,
            total_out: totalOut,
        };
    });

    // Vue détaillée par propriété × compte
    const result = props.map(p => {
        const units = data.units.filter(u => u.property_id === p.id);

        const compteDetails = comptesFiltered.map(c => {
            let txns = data.transactions.filter(t => t.property_id === p.id && t.compte_id === c.id);
            if (month) txns = txns.filter(t => t.date && t.date.startsWith(month));

            const totalIn  = txns.filter(t => t.kind === 'IN').reduce((s, t) => s + t.amount, 0);
            const totalOut = txns.filter(t => t.kind === 'OUT').reduce((s, t) => s + t.amount, 0);

            const historique = txns
                .map(t => {
                    const cat  = data.categories.find(cat => cat.id === t.category_id) || {};
                    const unit = t.unit_id ? data.units.find(u => u.id === t.unit_id) : null;
                    return { ...t, category_name: cat.name || '?', unit_label: unit ? unit.label : null };
                })
                .sort((a, b) => a.date.localeCompare(b.date));

            // Calcul du solde courant pour ce compte × propriété
            let running = 0;
            const releve = historique.map(t => {
                running += t.kind === 'IN' ? t.amount : -t.amount;
                return { ...t, solde_apres: running };
            }).reverse();

            const parUnit = units.map(u => {
                const uTxns = txns.filter(t => t.unit_id === u.id);
                const uIn  = uTxns.filter(t => t.kind === 'IN').reduce((s, t) => s + t.amount, 0);
                const uOut = uTxns.filter(t => t.kind === 'OUT').reduce((s, t) => s + t.amount, 0);
                return { id: u.id, label: u.label, total_in: uIn, total_out: uOut, net: uIn - uOut };
            });

            return {
                compte_id: c.id,
                compte_nom: c.nom,
                compte_type: c.type,
                total_in: totalIn,
                total_out: totalOut,
                releve,
                par_appartement: parUnit,
            };
        });

        // Agrégats toutes caisses / tout compte pour cette propriété
        const allTxns = data.transactions.filter(t => t.property_id === p.id &&
            (compte_id ? t.compte_id === Number(compte_id) : true));
        const allTxnsMonth = month ? allTxns.filter(t => t.date && t.date.startsWith(month)) : allTxns;
        const totalIn  = allTxnsMonth.filter(t => t.kind === 'IN').reduce((s, t) => s + t.amount, 0);
        const totalOut = allTxnsMonth.filter(t => t.kind === 'OUT').reduce((s, t) => s + t.amount, 0);

        return {
            id: p.id, name: p.name, type: p.type,
            total_in: totalIn,
            total_out: totalOut,
            solde: totalIn - totalOut,
            comptes: compteDetails,
        };
    });

    res.json({ comptes: comptesStats, properties: result });
});

module.exports = router;
