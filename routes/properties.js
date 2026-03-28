const express = require('express');
const router = express.Router();
const { load, save, nextId } = require('../store');
const { requireRole } = require('../middleware/auth');

const MGR   = requireRole('PROPRIETAIRE', 'GESTIONNAIRE');
const OWNER = requireRole('PROPRIETAIRE');

// GET all properties (with unit count)
router.get('/', (req, res) => {
    const data = load();
    const result = data.properties.map(p => ({
        ...p,
        unit_count: data.units.filter(u => u.property_id === p.id).length,
    }));
    res.json(result.reverse());
});

// GET single property with units
router.get('/:id', (req, res) => {
    const data = load();
    const id = Number(req.params.id);
    const p = data.properties.find(p => p.id === id);
    if (!p) return res.status(404).json({ error: 'Non trouvé' });
    res.json({ ...p, units: data.units.filter(u => u.property_id === id) });
});

// POST create (PROPRIETAIRE + GESTIONNAIRE)
router.post('/', MGR, (req, res) => {
    const { name, type, address, solde_initial_caisse, nb_etages, annee_construction, surface_totale, description } = req.body;
    if (!name || !type) return res.status(400).json({ error: 'name et type requis' });

    const data = load();
    const now = new Date().toISOString();
    const propId = nextId(data, 'properties');
    const prop = {
        id: propId, name, type,
        address: address || null,
        solde_initial_caisse: Number(solde_initial_caisse) || 0,
        nb_etages: nb_etages ? Number(nb_etages) : null,
        annee_construction: annee_construction ? Number(annee_construction) : null,
        surface_totale: surface_totale ? Number(surface_totale) : null,
        description: description || null,
        created_at: now,
    };
    data.properties.push(prop);

    if (type === 'STANDALONE') {
        const uid = nextId(data, 'units');
        data.units.push({ id: uid, property_id: propId, label: 'Appartement 1', status: 'VACANT', expected_rent: 0, created_at: now });
    }

    save(data);
    res.status(201).json({ ...prop, unit_count: type === 'STANDALONE' ? 1 : 0 });
});

// PUT update (PROPRIETAIRE + GESTIONNAIRE)
router.put('/:id', MGR, (req, res) => {
    const { name, address, solde_initial_caisse, nb_etages, annee_construction, surface_totale, description } = req.body;
    const data = load();
    const id = Number(req.params.id);
    const idx = data.properties.findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Non trouvé' });
    data.properties[idx] = {
        ...data.properties[idx],
        name,
        address: address || null,
        solde_initial_caisse: Number(solde_initial_caisse) || 0,
        nb_etages: nb_etages ? Number(nb_etages) : null,
        annee_construction: annee_construction ? Number(annee_construction) : null,
        surface_totale: surface_totale ? Number(surface_totale) : null,
        description: description || null,
    };
    save(data);
    res.json(data.properties[idx]);
});

// DELETE (PROPRIETAIRE uniquement — action destructive)
router.delete('/:id', OWNER, (req, res) => {
    const data = load();
    const id = Number(req.params.id);
    data.properties = data.properties.filter(p => p.id !== id);
    data.units = data.units.filter(u => u.property_id !== id);
    data.transactions = data.transactions.filter(t => t.property_id !== id);
    save(data);
    res.json({ success: true });
});

module.exports = router;
