const express = require('express');
const router = express.Router();
const { load } = require('../store');
const { requireRole } = require('../middleware/auth');

// Caisse — PROPRIETAIRE uniquement
const MGR = requireRole(['PROPRIETAIRE']);

/**
 * GET /api/caisse
 * Retourne le solde de caisse par propriété et par appartement,
 * avec l'historique des mouvements caisse.
 *
 * Query params:
 *   - property_id (optionnel) — filtrer sur une propriété
 */
router.get('/', MGR, (req, res) => {
    const data = load();
    const { property_id, month } = req.query;

    const props = property_id
        ? data.properties.filter(p => p.id === Number(property_id))
        : data.properties;

    const result = props.map(p => {
        const units = data.units.filter(u => u.property_id === p.id);
        const txnsP = data.transactions.filter(t => t.property_id === p.id);
        let txnsCaisse = txnsP.filter(t => t.source === 'CAISSE');
        if (month) txnsCaisse = txnsCaisse.filter(t => t.date && t.date.startsWith(month));

        const totalIn = txnsCaisse.filter(t => t.kind === 'IN').reduce((s, t) => s + t.amount, 0);
        const totalOut = txnsCaisse.filter(t => t.kind === 'OUT').reduce((s, t) => s + t.amount, 0);
        const solde = (p.solde_initial_caisse || 0) + totalIn - totalOut;

        const historique = txnsCaisse
            .map(t => {
                const cat = data.categories.find(c => c.id === t.category_id) || {};
                const unit = t.unit_id ? data.units.find(u => u.id === t.unit_id) : null;
                return { ...t, category_name: cat.name || '?', unit_label: unit ? unit.label : null };
            })
            .sort((a, b) => a.date.localeCompare(b.date));

        let running = p.solde_initial_caisse || 0;
        const releve = historique.map(t => {
            running += t.kind === 'IN' ? t.amount : -t.amount;
            return { ...t, solde_apres: running };
        }).reverse();

        const parUnit = units.map(u => {
            const uTxns = txnsCaisse.filter(t => t.unit_id === u.id);
            const uIn = uTxns.filter(t => t.kind === 'IN').reduce((s, t) => s + t.amount, 0);
            const uOut = uTxns.filter(t => t.kind === 'OUT').reduce((s, t) => s + t.amount, 0);
            return { id: u.id, label: u.label, status: u.status, total_in: uIn, total_out: uOut, net: uIn - uOut };
        });

        const txnsBanque = txnsP.filter(t => t.source === 'BANQUE');
        const banqueIn = txnsBanque.filter(t => t.kind === 'IN').reduce((s, t) => s + t.amount, 0);
        const banqueOut = txnsBanque.filter(t => t.kind === 'OUT').reduce((s, t) => s + t.amount, 0);

        return {
            id: p.id, name: p.name, type: p.type,
            solde_initial: p.solde_initial_caisse || 0,
            caisse_in: totalIn, caisse_out: totalOut, solde_caisse: solde,
            banque_in: banqueIn, banque_out: banqueOut,
            releve, par_appartement: parUnit,
        };
    });

    res.json(result);
});

module.exports = router;
