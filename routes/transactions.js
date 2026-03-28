const express = require('express');
const router = express.Router();
const { load, save, nextId } = require('../store');
const { requireRole } = require('../middleware/auth');

// Transactions financières — PROPRIETAIRE uniquement
const MGR = requireRole('PROPRIETAIRE');

function enrich(t, data) {
    const cat = data.categories.find(c => c.id === t.category_id) || {};
    const prop = data.properties.find(p => p.id === t.property_id) || {};
    const unit = t.unit_id ? data.units.find(u => u.id === t.unit_id) : null;
    return {
        ...t,
        category_name: cat.name || '?',
        category_kind: cat.kind || '?',
        property_name: prop.name || '?',
        unit_label: unit ? unit.label : null,
    };
}

function monthOf(date) { return date ? date.slice(0, 7) : ''; }

router.get('/', MGR, (req, res) => {
    const { property_id, unit_id, month, source, sejour_id } = req.query;
    const data = load();
    let txns = data.transactions;
    if (property_id) txns = txns.filter(t => t.property_id === Number(property_id));
    if (unit_id) txns = txns.filter(t => t.unit_id === Number(unit_id));
    if (month) txns = txns.filter(t => monthOf(t.date) === month);
    if (source) txns = txns.filter(t => t.source === source);
    if (sejour_id) txns = txns.filter(t => t.sejour_id === Number(sejour_id));
    txns = txns.sort((a, b) => b.date.localeCompare(a.date));
    res.json(txns.map(t => enrich(t, data)));
});

router.get('/:id', MGR, (req, res) => {
    const data = load();
    const t = data.transactions.find(t => t.id === Number(req.params.id));
    if (!t) return res.status(404).json({ error: 'Non trouvé' });
    res.json(enrich(t, data));
});

router.post('/', MGR, (req, res) => {
    const { date, description, kind, amount, category_id, property_id, unit_id, source, sejour_id } = req.body;
    if (!date || !kind || !amount)
        return res.status(400).json({ error: 'date, kind, amount requis' });
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0)
        return res.status(400).json({ error: 'Le montant doit être positif' });
    const data = load();

    // Auto-dériver property_id et unit_id depuis le séjour si non fournis
    let resolvedPropertyId = property_id ? Number(property_id) : null;
    let resolvedUnitId = unit_id ? Number(unit_id) : null;
    if (sejour_id) {
        const sej = data.sejours.find(s => s.id === Number(sejour_id));
        if (sej) {
            if (!resolvedUnitId) resolvedUnitId = sej.unit_id || null;
            if (!resolvedPropertyId && sej.unit_id) {
                const u = data.units.find(u => u.id === sej.unit_id);
                if (u) resolvedPropertyId = u.property_id || null;
            }
        }
    }
    // property_id obligatoire sauf si la transaction est liée à un séjour
    if (!resolvedPropertyId && !sejour_id)
        return res.status(400).json({ error: 'property_id requis (ou lier à un séjour)' });

    const txn = {
        id: nextId(data, 'transactions'),
        date,
        description: description || null,
        kind,
        amount: parsedAmount,
        category_id: category_id ? Number(category_id) : null,
        property_id: resolvedPropertyId,
        unit_id: resolvedUnitId,
        sejour_id: sejour_id ? Number(sejour_id) : null,
        source: source || (kind === 'IN' ? 'BANQUE' : 'CAISSE'),
        created_at: new Date().toISOString(),
    };
    data.transactions.push(txn);
    save(data);
    res.status(201).json(enrich(txn, data));
});

router.put('/:id', MGR, (req, res) => {
    const { date, description, kind, amount, category_id, property_id, unit_id, source, sejour_id } = req.body;
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0)
        return res.status(400).json({ error: 'Le montant doit être positif' });
    const data = load();
    const idx = data.transactions.findIndex(t => t.id === Number(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'Non trouvé' });
    data.transactions[idx] = {
        ...data.transactions[idx],
        date, description: description || null, kind,
        amount: Number(amount),
        category_id: Number(category_id),
        property_id: Number(property_id),
        unit_id: unit_id ? Number(unit_id) : null,
        sejour_id: sejour_id ? Number(sejour_id) : (data.transactions[idx].sejour_id || null),
        source: source || data.transactions[idx].source || 'BANQUE',
    };
    save(data);
    res.json(enrich(data.transactions[idx], data));
});

router.delete('/:id', MGR, (req, res) => {
    const data = load();
    data.transactions = data.transactions.filter(t => t.id !== Number(req.params.id));
    save(data);
    res.json({ success: true });
});

module.exports = router;
