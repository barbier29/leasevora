const express = require('express');
const router = express.Router();
const { load, save, nextId } = require('../store');
const { requireRole } = require('../middleware/auth');

const MGR = requireRole('PROPRIETAIRE', 'GESTIONNAIRE');

function withPropName(unit, data) {
    const prop = data.properties.find(p => p.id === unit.property_id);
    return { ...unit, property_name: prop ? prop.name : '?' };
}

router.get('/', (req, res) => {
    const data = load();
    const { property_id } = req.query;
    let units = property_id
        ? data.units.filter(u => u.property_id === Number(property_id))
        : data.units.map(u => withPropName(u, data));
    res.json(units.sort((a, b) => a.label.localeCompare(b.label)));
});

router.get('/:id', (req, res) => {
    const data = load();
    const unit = data.units.find(u => u.id === Number(req.params.id));
    if (!unit) return res.status(404).json({ error: 'Non trouvé' });
    res.json(withPropName(unit, data));
});

router.post('/', MGR, (req, res) => {
    const { property_id, label, status, expected_rent } = req.body;
    if (!property_id || !label) return res.status(400).json({ error: 'property_id et label requis' });
    const data = load();
    const unit = {
        id: nextId(data, 'units'),
        property_id: Number(property_id),
        label,
        status: status || 'VACANT',
        expected_rent: expected_rent || 0,
        created_at: new Date().toISOString(),
    };
    data.units.push(unit);
    save(data);
    res.status(201).json(unit);
});

router.put('/:id', MGR, (req, res) => {
    const { label, status, expected_rent } = req.body;
    const data = load();
    const idx = data.units.findIndex(u => u.id === Number(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'Non trouvé' });
    data.units[idx] = { ...data.units[idx], label, status, expected_rent: expected_rent || 0 };
    save(data);
    res.json(data.units[idx]);
});

router.delete('/:id', MGR, (req, res) => {
    const data = load();
    const id = Number(req.params.id);
    data.units = data.units.filter(u => u.id !== id);
    data.transactions = data.transactions.map(t => t.unit_id === id ? { ...t, unit_id: null } : t);
    save(data);
    res.json({ success: true });
});

module.exports = router;
