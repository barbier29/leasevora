const express = require('express');
const router = express.Router();
const { load } = require('../store');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, (req, res) => {
    const q = (req.query.q || '').toLowerCase().trim();
    if (q.length < 2) return res.json({ properties: [], units: [], locataires: [], sejours: [] });
    const data = load();
    const role = req.user?.role;

    // Properties et units : accessibles à tous les rôles (lecture seule)
    const properties = data.properties
        .filter(p => p.name?.toLowerCase().includes(q) || p.address?.toLowerCase().includes(q))
        .slice(0, 5)
        .map(p => ({ id: p.id, name: p.name, type: p.type }));

    const units = data.units
        .filter(u => u.label?.toLowerCase().includes(q) || u.type?.toLowerCase().includes(q))
        .slice(0, 5)
        .map(u => {
            const prop = data.properties.find(p => p.id === u.property_id);
            return { id: u.id, label: u.label, type: u.type, property_name: prop?.name || '' };
        });

    // Locataires et séjours : pas pour TECHNICIEN
    const locataires = role === 'TECHNICIEN' ? [] : data.locataires
        .filter(l => (l.nom + ' ' + (l.prenom||'')).toLowerCase().includes(q) || l.telephone?.includes(q) || l.email?.toLowerCase().includes(q))
        .slice(0, 5)
        .map(l => ({ id: l.id, nom: l.nom, prenom: l.prenom, telephone: l.telephone }));

    const sejours = role === 'TECHNICIEN' ? [] : data.sejours
        .filter(s => s.locataire?.toLowerCase().includes(q) || s.notes?.toLowerCase().includes(q))
        .slice(0, 5)
        .map(s => {
            const unit = data.units.find(u => u.id === s.unit_id);
            return { id: s.id, locataire: s.locataire, unit_label: unit?.label || '', statut: s.statut, date_debut: s.date_debut };
        });

    res.json({ properties, units, locataires, sejours });
});

module.exports = router;
