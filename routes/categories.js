const express = require('express');
const router = express.Router();
const { load, save, nextId } = require('../store');
const { requireRole } = require('../middleware/auth');

const OWNER = requireRole('PROPRIETAIRE');

router.get('/', (req, res) => {
    const data = load();
    res.json([...data.categories].sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name)));
});

router.post('/', OWNER, (req, res) => {
    const { name, kind } = req.body;
    if (!name || !kind) return res.status(400).json({ error: 'name et kind requis' });
    const data = load();
    const cat = { id: nextId(data, 'categories'), name, kind, created_at: new Date().toISOString() };
    data.categories.push(cat);
    save(data);
    res.status(201).json(cat);
});

router.put('/:id', OWNER, (req, res) => {
    const { name, kind } = req.body;
    const data = load();
    const idx = data.categories.findIndex(c => c.id === Number(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'Non trouvé' });
    data.categories[idx] = { ...data.categories[idx], name, kind };
    save(data);
    res.json(data.categories[idx]);
});

router.delete('/:id', OWNER, (req, res) => {
    const data = load();
    data.categories = data.categories.filter(c => c.id !== Number(req.params.id));
    save(data);
    res.json({ success: true });
});

module.exports = router;
