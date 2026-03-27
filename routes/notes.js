const express = require('express');
const router = express.Router();
const { load, save, nextId } = require('../store');
const { requireAuth } = require('../middleware/auth');

// All routes require auth (notes are visible to everyone)

// GET — liste des notes (optionnel: filtrer par property_id, unit_id, sejour_id)
router.get('/', requireAuth, (req, res) => {
    const { property_id, unit_id, sejour_id } = req.query;
    const data = load();
    let list = data.notes || [];
    if (property_id) list = list.filter(n => n.property_id === Number(property_id));
    if (unit_id)     list = list.filter(n => n.unit_id === Number(unit_id));
    if (sejour_id)   list = list.filter(n => n.sejour_id === Number(sejour_id));
    // Enrichir avec les noms
    list = list.map(n => enrich(n, data));
    // Trier du plus récent au plus ancien
    list.sort((a, b) => b.created_at.localeCompare(a.created_at));
    res.json(list);
});

// GET single
router.get('/:id', requireAuth, (req, res) => {
    const data = load();
    const n = (data.notes || []).find(n => n.id === Number(req.params.id));
    if (!n) return res.status(404).json({ error: 'Note introuvable' });
    res.json(enrich(n, data));
});

// POST — créer une note
router.post('/', requireAuth, (req, res) => {
    const { content, property_id, unit_id, sejour_id, pinned } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ error: 'Contenu requis' });
    const data = load();
    const note = {
        id: nextId(data, 'notes'),
        content: content.trim(),
        property_id: property_id ? Number(property_id) : null,
        unit_id:     unit_id     ? Number(unit_id)     : null,
        sejour_id:   sejour_id   ? Number(sejour_id)   : null,
        pinned: !!pinned,
        author_id:    req.user.id,
        author_login: req.user.login,
        author_name:  (req.user.prenom ? req.user.prenom + ' ' : '') + (req.user.nom || req.user.login),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
    if (!data.notes) data.notes = [];
    data.notes.push(note);
    save(data);
    res.status(201).json(enrich(note, data));
});

// PATCH — modifier le contenu ou épingler
router.patch('/:id', requireAuth, (req, res) => {
    const data = load();
    const idx = (data.notes || []).findIndex(n => n.id === Number(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'Note introuvable' });
    const note = data.notes[idx];

    // Seul l'auteur ou un PROPRIETAIRE peut modifier
    if (note.author_id !== req.user.id && req.user.role !== 'PROPRIETAIRE') {
        return res.status(403).json({ error: 'Non autorisé' });
    }

    if (req.body.content !== undefined) note.content = req.body.content.trim();
    if (req.body.pinned !== undefined)  note.pinned  = !!req.body.pinned;
    note.updated_at = new Date().toISOString();
    save(data);
    res.json(enrich(note, data));
});

// DELETE
router.delete('/:id', requireAuth, (req, res) => {
    const data = load();
    const idx = (data.notes || []).findIndex(n => n.id === Number(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'Note introuvable' });
    const note = data.notes[idx];

    // Seul l'auteur ou un PROPRIETAIRE peut supprimer
    if (note.author_id !== req.user.id && req.user.role !== 'PROPRIETAIRE') {
        return res.status(403).json({ error: 'Non autorisé' });
    }

    data.notes.splice(idx, 1);
    save(data);
    res.json({ ok: true });
});

function enrich(n, data) {
    const prop  = n.property_id ? data.properties.find(p => p.id === n.property_id) : null;
    const unit  = n.unit_id     ? data.units.find(u => u.id === n.unit_id)           : null;
    const sejour = n.sejour_id  ? data.sejours.find(s => s.id === n.sejour_id)        : null;
    return {
        ...n,
        property_name: prop   ? prop.name    : null,
        unit_label:    unit   ? unit.label   : null,
        sejour_label:  sejour ? `Séjour #${sejour.id}` : null,
    };
}

module.exports = router;
