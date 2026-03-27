const express = require('express');
const router = express.Router();
const { load, save, nextId } = require('../store');
const { requireRole, requireAuth } = require('../middleware/auth');

const MGR = requireRole('PROPRIETAIRE', 'GESTIONNAIRE');

function enrich(s, data) {
    const unit = data.units.find(u => u.id === s.unit_id) || {};
    const prop = data.properties.find(p => p.id === unit.property_id) || {};
    return {
        ...s,
        unit_label: unit.label || '?',
        property_name: prop.name || '?',
        property_id: unit.property_id || null,
    };
}

// GET all — tous les rôles
router.get('/', requireAuth, (req, res) => {
    const { unit_id, property_id } = req.query;
    const data = load();
    let list = data.sejours;

    if (unit_id) list = list.filter(s => s.unit_id === Number(unit_id));
    if (property_id) {
        const unitIds = data.units.filter(u => u.property_id === Number(property_id)).map(u => u.id);
        list = list.filter(s => unitIds.includes(s.unit_id));
    }

    list = list.sort((a, b) => b.date_debut.localeCompare(a.date_debut));
    res.json(list.map(s => enrich(s, data)));
});

// GET single — tous les rôles
router.get('/:id', requireAuth, (req, res) => {
    const data = load();
    const s = data.sejours.find(s => s.id === Number(req.params.id));
    if (!s) return res.status(404).json({ error: 'Non trouvé' });
    res.json(enrich(s, data));
});

// POST create — tous les rôles (l'employé peut enregistrer un séjour)
router.post('/', (req, res) => {
    const { unit_id, locataire, locataire_id, date_debut, date_fin, heure_entree, heure_sortie, type_tarif, montant, statut, notes } = req.body;
    if (!unit_id || !locataire || !date_debut || !type_tarif || !montant)
        return res.status(400).json({ error: 'unit_id, locataire, date_debut, type_tarif, montant requis' });
    const parsedMontant = parseFloat(montant);
    if (isNaN(parsedMontant) || parsedMontant <= 0)
        return res.status(400).json({ error: 'Le montant doit être positif' });

    const data = load();
    const sejour = {
        id: nextId(data, 'sejours'),
        unit_id: Number(unit_id),
        locataire,
        locataire_id: locataire_id ? Number(locataire_id) : null,
        date_debut,
        date_fin: date_fin || null,
        heure_entree: heure_entree || null,
        heure_sortie: heure_sortie || null,
        type_tarif,
        montant: Number(montant),
        statut: statut || 'A_VENIR',
        notes: notes || null,
        created_at: new Date().toISOString(),
    };
    data.sejours.push(sejour);
    save(data);
    res.status(201).json(enrich(sejour, data));
});

// PUT update — tous les rôles (l'employé peut changer le statut)
router.put('/:id', (req, res) => {
    const { unit_id, locataire, locataire_id, date_debut, date_fin, heure_entree, heure_sortie, type_tarif, montant, statut, notes } = req.body;
    const parsedMontant = parseFloat(montant);
    if (isNaN(parsedMontant) || parsedMontant <= 0)
        return res.status(400).json({ error: 'Le montant doit être positif' });
    const data = load();
    const idx = data.sejours.findIndex(s => s.id === Number(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'Non trouvé' });
    data.sejours[idx] = {
        ...data.sejours[idx],
        unit_id: Number(unit_id),
        locataire,
        locataire_id: locataire_id ? Number(locataire_id) : null,
        date_debut, date_fin: date_fin || null,
        heure_entree: heure_entree || null,
        heure_sortie: heure_sortie || null,
        type_tarif, montant: Number(montant),
        statut: statut || 'A_VENIR',
        notes: notes || null,
    };
    save(data);
    res.json(enrich(data.sejours[idx], data));
});

// DELETE — PROPRIETAIRE + GESTIONNAIRE seulement
router.delete('/:id', MGR, (req, res) => {
    const data = load();
    data.sejours = data.sejours.filter(s => s.id !== Number(req.params.id));
    save(data);
    res.json({ success: true });
});

module.exports = router;
