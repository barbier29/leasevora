const express = require('express');
const router = express.Router();
const { load, save, nextId } = require('../store');
const { requireRole, requireAuth } = require('../middleware/auth');

const MGR = requireRole('PROPRIETAIRE', 'GESTIONNAIRE');

function enrich(c, data) {
    const unit = data.units.find(u => u.id === c.unit_id) || {};
    const prop = data.properties.find(p => p.id === unit.property_id) || {};
    return {
        ...c,
        unit_label: unit.label || '?',
        property_name: prop.name || '?',
        property_id: unit.property_id || null,
    };
}

// GET all — tous les rôles
router.get('/', requireAuth, (req, res) => {
    const { unit_id, property_id, type } = req.query;
    const data = load();
    let list = data.compteurs;

    if (unit_id) list = list.filter(c => c.unit_id === Number(unit_id));
    if (property_id) {
        const uids = data.units.filter(u => u.property_id === Number(property_id)).map(u => u.id);
        list = list.filter(c => uids.includes(c.unit_id));
    }
    if (type) list = list.filter(c => c.type === type);

    list = list.sort((a, b) => b.date.localeCompare(a.date));
    res.json(list.map(c => enrich(c, data)));
});

// GET summary — tous les rôles
router.get('/summary', requireAuth, (req, res) => {
    const data = load();
    const types = ['EAU', 'ELECTRICITE', 'GAZ'];

    const summary = data.units.map(u => {
        const prop = data.properties.find(p => p.id === u.property_id) || {};
        const readings = {};
        for (const type of types) {
            const r = data.compteurs
                .filter(c => c.unit_id === u.id && c.type === type)
                .sort((a, b) => b.date.localeCompare(a.date))[0];
            readings[type.toLowerCase()] = r || null;
        }
        return { unit_id: u.id, unit_label: u.label, property_name: prop.name || '?', ...readings };
    });

    res.json(summary);
});

// POST create — tous les rôles (l'employé peut relever les compteurs)
router.post('/', (req, res) => {
    const { unit_id, type, date, valeur, notes } = req.body;
    if (!unit_id || !type || !date || valeur === undefined)
        return res.status(400).json({ error: 'unit_id, type, date, valeur requis' });
    const data = load();
    const c = {
        id: nextId(data, 'compteurs'),
        unit_id: Number(unit_id),
        type,
        date,
        valeur: Number(valeur),
        notes: notes || null,
        created_at: new Date().toISOString(),
    };
    data.compteurs.push(c);
    save(data);
    res.status(201).json(enrich(c, data));
});

// GET single — tous les rôles
router.get('/:id', requireAuth, (req, res) => {
    const data = load();
    const c = data.compteurs.find(c => c.id === Number(req.params.id));
    if (!c) return res.status(404).json({ error: 'Non trouvé' });
    res.json(enrich(c, data));
});

// PUT update — tous les rôles
router.put('/:id', (req, res) => {
    const { unit_id, type, date, valeur, notes } = req.body;
    const data = load();
    const idx = data.compteurs.findIndex(c => c.id === Number(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'Non trouvé' });
    data.compteurs[idx] = { ...data.compteurs[idx], unit_id: Number(unit_id), type, date, valeur: Number(valeur), notes: notes || null };
    save(data);
    res.json(enrich(data.compteurs[idx], data));
});

// DELETE — PROPRIETAIRE + GESTIONNAIRE seulement
router.delete('/:id', MGR, (req, res) => {
    const data = load();
    data.compteurs = data.compteurs.filter(c => c.id !== Number(req.params.id));
    save(data);
    res.json({ success: true });
});

module.exports = router;
