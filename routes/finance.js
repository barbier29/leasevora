const express = require('express');
const router = express.Router();
const { load } = require('../store');
const { requireRole } = require('../middleware/auth');

const MGR = requireRole(['PROPRIETAIRE']);

/**
 * GET /api/finance/income-statement
 * Compte de résultat / Income Statement
 *
 * Query params:
 *   property_id  — filtrer sur une propriété (optionnel)
 *   unit_id      — filtrer sur un appartement (optionnel)
 *   date_from    — YYYY-MM-DD (défaut : 1er janvier de l'année courante)
 *   date_to      — YYYY-MM-DD (défaut : aujourd'hui)
 */
router.get('/income-statement', MGR, (req, res) => {
    const { property_id, unit_id, date_from, date_to } = req.query;
    const data = load();

    const now = new Date();
    const from = date_from || `${now.getFullYear()}-01-01`;
    const to   = date_to   || now.toISOString().slice(0, 10);

    // Filtrer les transactions sur la période
    let txns = data.transactions.filter(t => t.date && t.date >= from && t.date <= to);
    if (property_id) txns = txns.filter(t => t.property_id === Number(property_id));
    if (unit_id)     txns = txns.filter(t => t.unit_id === Number(unit_id));

    // Contexte propriété / appartement
    const prop = property_id ? (data.properties.find(p => p.id === Number(property_id)) || null) : null;
    const unit = unit_id     ? (data.units.find(u => u.id === Number(unit_id)) || null) : null;

    // Enrichir chaque transaction
    const enriched = txns.map(t => {
        const cat  = data.categories.find(c => c.id === t.category_id) || {};
        const prop = data.properties.find(p => p.id === t.property_id) || {};
        const uObj = t.unit_id ? data.units.find(u => u.id === t.unit_id) : null;
        return {
            id: t.id,
            date: t.date,
            description: t.description || null,
            kind: t.kind,
            amount: t.amount,
            source: t.source || 'BANQUE',
            category_id: t.category_id,
            category_name: cat.name || '?',
            property_name: prop.name || '?',
            unit_label: uObj ? uObj.label : null,
        };
    });

    const revenues = enriched.filter(t => t.kind === 'IN');
    const expenses = enriched.filter(t => t.kind === 'OUT');

    // Grouper par catégorie, triées par montant décroissant
    function groupByCategory(list) {
        const groups = {};
        for (const t of list) {
            if (!groups[t.category_id]) {
                groups[t.category_id] = {
                    category_id: t.category_id,
                    category_name: t.category_name,
                    total: 0,
                    transactions: [],
                };
            }
            groups[t.category_id].total   += t.amount;
            groups[t.category_id].transactions.push(t);
        }
        return Object.values(groups).sort((a, b) => b.total - a.total);
    }

    const revenueGroups = groupByCategory(revenues);
    const expenseGroups = groupByCategory(expenses);
    const totalRevenues = revenues.reduce((s, t) => s + t.amount, 0);
    const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0);

    res.json({
        property:       prop ? { id: prop.id, name: prop.name }       : null,
        unit:           unit ? { id: unit.id, label: unit.label }     : null,
        date_from:      from,
        date_to:        to,
        revenues:       revenueGroups,
        expenses:       expenseGroups,
        total_revenues: totalRevenues,
        total_expenses: totalExpenses,
        net_income:     totalRevenues - totalExpenses,
    });
});

module.exports = router;
