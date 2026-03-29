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

const VALID_UNIT_TYPES = ['APPARTEMENT','STUDIO','LOCAL_COMMERCIAL','MAISON','BUREAU','PARKING','AUTRE'];

router.post('/', MGR, (req, res) => {
    const { property_id, label, status, expected_rent, type, nb_pieces, surface, etage, description,
            nb_chambres, nb_sdb, meuble, balcon, cave, parking_inclus } = req.body;
    if (!property_id || !label) return res.status(400).json({ error: 'property_id et label requis' });
    const data = load();
    const unit = {
        id: nextId(data, 'units'),
        property_id: Number(property_id),
        label,
        type: VALID_UNIT_TYPES.includes(type) ? type : 'APPARTEMENT',
        status: status || 'VACANT',
        expected_rent: expected_rent || 0,
        nb_pieces: nb_pieces ? Number(nb_pieces) : null,
        surface: surface ? Number(surface) : null,
        etage: etage !== undefined && etage !== '' ? Number(etage) : null,
        description: description || null,
        nb_chambres: nb_chambres ? Number(nb_chambres) : null,
        nb_sdb: nb_sdb ? Number(nb_sdb) : null,
        meuble: meuble === true || meuble === 'true' || false,
        balcon: balcon === true || balcon === 'true' || false,
        cave: cave === true || cave === 'true' || false,
        parking_inclus: parking_inclus === true || parking_inclus === 'true' || false,
        created_at: new Date().toISOString(),
    };
    data.units.push(unit);
    save(data);
    res.status(201).json(unit);
});

router.put('/:id', MGR, (req, res) => {
    const { label, status, expected_rent, type, nb_pieces, surface, etage, description,
            nb_chambres, nb_sdb, meuble, balcon, cave, parking_inclus } = req.body;
    const data = load();
    const idx = data.units.findIndex(u => u.id === Number(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'Non trouvé' });
    data.units[idx] = {
        ...data.units[idx],
        label,
        type: VALID_UNIT_TYPES.includes(type) ? type : (data.units[idx].type || 'APPARTEMENT'),
        status,
        expected_rent: expected_rent || 0,
        nb_pieces: nb_pieces ? Number(nb_pieces) : null,
        surface: surface ? Number(surface) : null,
        etage: etage !== undefined && etage !== '' ? Number(etage) : null,
        description: description || null,
        nb_chambres: nb_chambres ? Number(nb_chambres) : null,
        nb_sdb: nb_sdb ? Number(nb_sdb) : null,
        meuble: meuble === true || meuble === 'true' || false,
        balcon: balcon === true || balcon === 'true' || false,
        cave: cave === true || cave === 'true' || false,
        parking_inclus: parking_inclus === true || parking_inclus === 'true' || false,
    };
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
