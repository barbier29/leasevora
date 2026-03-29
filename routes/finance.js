const express = require('express');
const router = express.Router();
const { load } = require('../store');
const { requireRole } = require('../middleware/auth');

const MGR = requireRole('PROPRIETAIRE');

/**
 * GET /api/finance/income-statement
 * Compte de résultat global ou filtré par bien / appartement
 */
router.get('/income-statement', MGR, (req, res) => {
    const { property_id, unit_id, date_from, date_to } = req.query;
    const data = load();

    const now  = new Date();
    const from = date_from || `${now.getFullYear()}-01-01`;
    const to   = date_to   || now.toISOString().slice(0, 10);

    let txns = data.transactions.filter(t => t.date && t.date >= from && t.date <= to);
    if (property_id) txns = txns.filter(t => t.property_id === Number(property_id));
    if (unit_id)     txns = txns.filter(t => t.unit_id === Number(unit_id));

    const prop = property_id ? (data.properties.find(p => p.id === Number(property_id)) || null) : null;
    const unit = unit_id     ? (data.units.find(u => u.id === Number(unit_id)) || null) : null;

    const enriched = txns.map(t => {
        const cat  = data.categories.find(c => c.id === t.category_id) || {};
        const prop = data.properties.find(p => p.id === t.property_id) || {};
        const uObj = t.unit_id ? data.units.find(u => u.id === t.unit_id) : null;
        return {
            id: t.id, date: t.date, description: t.description || null,
            kind: t.kind, amount: t.amount, source: t.source || 'BANQUE',
            category_id: t.category_id,
            category_name: cat.name || '?',
            property_name: prop.name || '?',
            unit_label: uObj ? uObj.label : null,
        };
    });

    const revenues = enriched.filter(t => t.kind === 'IN');
    const expenses = enriched.filter(t => t.kind === 'OUT');

    function groupByCategory(list) {
        const groups = {};
        for (const t of list) {
            if (!groups[t.category_id]) groups[t.category_id] = {
                category_id: t.category_id, category_name: t.category_name,
                total: 0, transactions: [],
            };
            groups[t.category_id].total += t.amount;
            groups[t.category_id].transactions.push(t);
        }
        return Object.values(groups).sort((a, b) => b.total - a.total);
    }

    // Ventilation mensuelle pour l'état financier
    function monthlyBreakdown(list) {
        const map = {};
        for (const t of list) {
            const m = t.date.slice(0, 7);
            if (!map[m]) map[m] = { month: m, revenues: 0, expenses: 0 };
            if (t.kind === 'IN')  map[m].revenues += t.amount;
            if (t.kind === 'OUT') map[m].expenses += t.amount;
        }
        return Object.values(map).sort((a, b) => a.month.localeCompare(b.month))
            .map(m => ({ ...m, net: m.revenues - m.expenses }));
    }

    const revenueGroups  = groupByCategory(revenues);
    const expenseGroups  = groupByCategory(expenses);
    const totalRevenues  = revenues.reduce((s, t) => s + t.amount, 0);
    const totalExpenses  = expenses.reduce((s, t) => s + t.amount, 0);
    const monthly        = monthlyBreakdown(enriched);

    res.json({
        property: prop ? { id: prop.id, name: prop.name } : null,
        unit:     unit ? { id: unit.id, label: unit.label } : null,
        date_from: from, date_to: to,
        revenues: revenueGroups, expenses: expenseGroups,
        total_revenues: totalRevenues,
        total_expenses: totalExpenses,
        net_income: totalRevenues - totalExpenses,
        monthly,
    });
});

/**
 * GET /api/finance/property-report
 * Rapport de performance par bien — tous les biens sur une période
 *
 * Query params: date_from, date_to
 */
router.get('/property-report', MGR, (req, res) => {
    const { date_from, date_to } = req.query;
    const data = load();

    const now  = new Date();
    const from = date_from || `${now.getFullYear()}-01-01`;
    const to   = date_to   || now.toISOString().slice(0, 10);

    // Toutes les transactions de la période
    const allTxns = data.transactions.filter(t => t.date && t.date >= from && t.date <= to);

    // Calcul du nombre de jours dans la période (pour taux occupation)
    const msFrom = new Date(from).getTime();
    const msTo   = new Date(to).getTime();
    const totalDays = Math.max(1, Math.round((msTo - msFrom) / 86400000) + 1);

    const result = data.properties.map(prop => {
        const propUnits = data.units.filter(u => u.property_id === prop.id);
        const propTxns  = allTxns.filter(t => t.property_id === prop.id);

        const revenues = propTxns.filter(t => t.kind === 'IN');
        const expenses = propTxns.filter(t => t.kind === 'OUT');
        const totalRev = revenues.reduce((s, t) => s + t.amount, 0);
        const totalExp = expenses.reduce((s, t) => s + t.amount, 0);

        // Par unité
        const unitBreakdown = propUnits.map(u => {
            const uTxns = propTxns.filter(t => t.unit_id === u.id);
            const uRev  = uTxns.filter(t => t.kind === 'IN').reduce((s, t) => s + t.amount, 0);
            const uExp  = uTxns.filter(t => t.kind === 'OUT').reduce((s, t) => s + t.amount, 0);

            // Séjours de l'unité sur la période
            const uSejours = data.sejours.filter(s => {
                if (s.unit_id !== u.id) return false;
                const se = s.date_entree, ss = s.date_sortie;
                return se && ss && se <= to && ss >= from;
            });

            // Jours occupés (intersection avec la période)
            const jOccupes = uSejours.reduce((tot, s) => {
                const deb = new Date(Math.max(new Date(s.date_entree), new Date(from)));
                const fin = new Date(Math.min(new Date(s.date_sortie), new Date(to)));
                return tot + Math.max(0, Math.round((fin - deb) / 86400000));
            }, 0);

            return {
                id: u.id, label: u.label, type: u.type,
                revenues: uRev, expenses: uExp, net: uRev - uExp,
                sejours_count: uSejours.length,
                jours_occupes: jOccupes,
                taux_occupation: totalDays > 0 ? Math.round((jOccupes / totalDays) * 100) : 0,
            };
        });

        // Par catégorie revenus
        function groupByCat(list) {
            const m = {};
            list.forEach(t => {
                const cat = data.categories.find(c => c.id === t.category_id) || {};
                const k   = t.category_id || 0;
                if (!m[k]) m[k] = { name: cat.name || '?', total: 0, count: 0 };
                m[k].total += t.amount;
                m[k].count++;
            });
            return Object.values(m).sort((a, b) => b.total - a.total);
        }

        // Ventilation mensuelle
        const monthlyMap = {};
        propTxns.forEach(t => {
            const m = t.date.slice(0, 7);
            if (!monthlyMap[m]) monthlyMap[m] = { month: m, revenues: 0, expenses: 0 };
            if (t.kind === 'IN')  monthlyMap[m].revenues += t.amount;
            if (t.kind === 'OUT') monthlyMap[m].expenses += t.amount;
        });
        const monthly = Object.values(monthlyMap)
            .sort((a, b) => a.month.localeCompare(b.month))
            .map(m => ({ ...m, net: m.revenues - m.expenses }));

        // Séjours de la propriété sur la période
        const propSejours = data.sejours.filter(s => {
            const u = data.units.find(u => u.id === s.unit_id);
            if (!u || u.property_id !== prop.id) return false;
            return s.date_entree && s.date_sortie &&
                   s.date_entree <= to && s.date_sortie >= from;
        });

        // Taux d'occupation global (jours occupés / (jours * nb_unités))
        const totalUnitDays = totalDays * Math.max(1, propUnits.length);
        const totalOccDays  = unitBreakdown.reduce((s, u) => s + u.jours_occupes, 0);
        const tauxOccupation = totalUnitDays > 0 ? Math.round((totalOccDays / totalUnitDays) * 100) : 0;

        return {
            id: prop.id, name: prop.name, address: prop.address || null,
            units_count: propUnits.length,
            total_revenues: totalRev,
            total_expenses: totalExp,
            net_income: totalRev - totalExp,
            margin_pct: totalRev > 0 ? Math.round((( totalRev - totalExp) / totalRev) * 100) : 0,
            revenue_by_category: groupByCat(revenues),
            expense_by_category: groupByCat(expenses),
            sejours_count: propSejours.length,
            taux_occupation: tauxOccupation,
            units: unitBreakdown,
            monthly,
        };
    });

    const grandTotals = {
        revenues: result.reduce((s, p) => s + p.total_revenues, 0),
        expenses: result.reduce((s, p) => s + p.total_expenses, 0),
        net:      result.reduce((s, p) => s + p.net_income,     0),
    };
    grandTotals.margin_pct = grandTotals.revenues > 0
        ? Math.round((grandTotals.net / grandTotals.revenues) * 100) : 0;

    res.json({ date_from: from, date_to: to, properties: result, totals: grandTotals });
});

module.exports = router;
