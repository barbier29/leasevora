const express = require('express');
const router = express.Router();
const { load, save, nextId, scoped } = require('../store');
const { requireRole } = require('../middleware/auth');

const MGR   = requireRole('PROPRIETAIRE', 'GESTIONNAIRE');
const OWNER = requireRole('PROPRIETAIRE');
const hasHtml = s => typeof s === 'string' && /[<>]/.test(s);

// GET all properties (with unit count)
router.get('/', (req, res) => {
    const data = scoped(load(), req.orgId);
    const result = data.properties.map(p => ({
        ...p,
        unit_count: data.units.filter(u => u.property_id === p.id).length,
    }));
    res.json(result.reverse());
});

// GET single property with units
router.get('/:id', (req, res) => {
    const data = scoped(load(), req.orgId);
    const id = Number(req.params.id);
    const p = data.properties.find(p => p.id === id);
    if (!p) return res.status(404).json({ error: 'Non trouvé' });
    res.json({ ...p, units: data.units.filter(u => u.property_id === id) });
});

// POST create (PROPRIETAIRE + GESTIONNAIRE)
router.post('/', MGR, (req, res) => {
    const { name, type, address, solde_initial_caisse, nb_etages, annee_construction, surface_totale, description } = req.body;
    if (hasHtml(name)) return res.status(400).json({ error: 'Le nom ne peut pas contenir < ou >' });
    if (!name || !type) return res.status(400).json({ error: 'name et type requis' });

    const data = scoped(load(), req.orgId);
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
    if (hasHtml(name)) return res.status(400).json({ error: 'Le nom ne peut pas contenir < ou >' });
    const data = scoped(load(), req.orgId);
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
    const data = scoped(load(), req.orgId);
    const id = Number(req.params.id);
    // Cascade COMPLÈTE : supprimer un immeuble supprime tout son historique.
    // Avant, les séjours/travaux/compteurs/notes restaient orphelins (« ? »
    // partout, faux impayés au dashboard) pendant que les transactions,
    // elles, disparaissaient — le pire des deux mondes.
    const unitIds = new Set(data.units.filter(u => u.property_id === id).map(u => u.id));
    const sejourIds = new Set(data.sejours.filter(s => unitIds.has(s.unit_id)).map(s => s.id));
    data.properties = data.properties.filter(p => p.id !== id);
    data.units = data.units.filter(u => u.property_id !== id);
    data.sejours = data.sejours.filter(s => !unitIds.has(s.unit_id));
    data.transactions = data.transactions.filter(t => t.property_id !== id && !sejourIds.has(t.sejour_id));
    data.travaux = data.travaux.filter(t => t.property_id !== id);
    data.compteurs = (data.compteurs || []).filter(c => c.property_id !== id && !unitIds.has(c.unit_id));
    data.notes = (data.notes || []).filter(n => n.property_id !== id);
    data.declarations = (data.declarations || []).filter(d => !sejourIds.has(d.sejour_id));
    save(data);
    res.json({ success: true });
});

module.exports = router;
