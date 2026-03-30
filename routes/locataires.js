const express = require('express');
const router = express.Router();
const { load, save, nextId } = require('../store');
const { requireRole, denyRoles } = require('../middleware/auth');

const MGR = requireRole('PROPRIETAIRE', 'GESTIONNAIRE', 'AGENT');
const NO_TECH = denyRoles('TECHNICIEN');

router.get('/', NO_TECH, (req, res) => {
    const data = load();
    res.json([...data.locataires].sort((a, b) => a.nom.localeCompare(b.nom)));
});

router.get('/:id', NO_TECH, (req, res) => {
    const data = load();
    const l = data.locataires.find(l => l.id === Number(req.params.id));
    if (!l) return res.status(404).json({ error: 'Non trouvé' });
    const sejours = data.sejours.filter(s => s.locataire_id === l.id).map(s => {
        const unit = data.units.find(u => u.id === s.unit_id) || {};
        const prop = data.properties.find(p => p.id === unit.property_id) || {};
        return { ...s, unit_label: unit.label || '?', property_name: prop.name || '?' };
    });
    res.json({ ...l, sejours });
});

router.post('/', MGR, (req, res) => {
    const { nom, prenom, email, telephone, num_piece_identite, type_piece, caution, notes } = req.body;
    if (!nom) return res.status(400).json({ error: 'nom requis' });
    const data = load();
    const l = {
        id: nextId(data, 'locataires'),
        nom, prenom: prenom || null,
        email: email || null,
        telephone: telephone || null,
        num_piece_identite: num_piece_identite || null,
        type_piece: type_piece || null,
        caution: Number(caution) || 0,
        notes: notes || null,
        created_at: new Date().toISOString(),
    };
    data.locataires.push(l);
    save(data);
    res.status(201).json(l);
});

router.put('/:id', MGR, (req, res) => {
    const { nom, prenom, email, telephone, num_piece_identite, type_piece, caution, notes } = req.body;
    const data = load();
    const idx = data.locataires.findIndex(l => l.id === Number(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'Non trouvé' });
    data.locataires[idx] = {
        ...data.locataires[idx],
        nom, prenom: prenom || null, email: email || null,
        telephone: telephone || null,
        num_piece_identite: num_piece_identite || null,
        type_piece: type_piece || null,
        caution: Number(caution) || 0,
        notes: notes || null,
    };
    save(data);
    res.json(data.locataires[idx]);
});

router.delete('/:id', MGR, (req, res) => {
    const data = load();
    data.locataires = data.locataires.filter(l => l.id !== Number(req.params.id));
    data.sejours = data.sejours.map(s =>
        s.locataire_id === Number(req.params.id) ? { ...s, locataire_id: null } : s
    );
    save(data);
    res.json({ success: true });
});

module.exports = router;
