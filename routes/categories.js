const express = require('express');
const router = express.Router();
const { load, save, nextId, scoped } = require('../store');
const { requireRole, denyRoles } = require('../middleware/auth');

const OWNER = requireRole('PROPRIETAIRE');
const NO_TECH = denyRoles('TECHNICIEN');

router.get('/', NO_TECH, (req, res) => {
    const data = scoped(load(), req.orgId);
    res.json([...data.categories].sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name)));
});

router.post('/', OWNER, (req, res) => {
    const { name, kind } = req.body;
    if (!name || !kind) return res.status(400).json({ error: 'name et kind requis' });
    const data = scoped(load(), req.orgId);
    const cat = { id: nextId(data, 'categories'), name, kind, created_at: new Date().toISOString() };
    data.categories.push(cat);
    save(data);
    res.status(201).json(cat);
});

router.put('/:id', OWNER, (req, res) => {
    const { name, kind } = req.body;
    const data = scoped(load(), req.orgId);
    const idx = data.categories.findIndex(c => c.id === Number(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'Non trouvé' });
    data.categories[idx] = { ...data.categories[idx], name, kind };
    save(data);
    res.json(data.categories[idx]);
});

// La suppression d'une catégorie encore utilisée casserait l'affichage («?»)
// et les regroupements du compte de résultat.
router.delete('/:id', OWNER, (req, res) => {
    const data = scoped(load(), req.orgId);
    const catId = Number(req.params.id);
    const nbUsages = (data.transactions || []).filter(t => t.category_id === catId).length;
    if (nbUsages > 0)
        return res.status(400).json({ error: `Impossible : cette catégorie est utilisée par ${nbUsages} transaction(s). Réaffectez-les d'abord.` });
    data.categories = data.categories.filter(c => c.id !== Number(req.params.id));
    save(data);
    res.json({ success: true });
});

module.exports = router;
