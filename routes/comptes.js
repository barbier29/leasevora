const express = require('express');
const router = express.Router();
const { load, save } = require('../store');
const { requireRole, requireAuth, denyRoles } = require('../middleware/auth');

const PROP = requireRole('PROPRIETAIRE');
const NO_AGENT_TECH = denyRoles('AGENT', 'TECHNICIEN');

// GET /api/comptes — PROPRIETAIRE + GESTIONNAIRE uniquement
router.get('/', requireAuth, NO_AGENT_TECH, (req, res) => {
    const data = load();
    res.json((data.comptes || []).sort((a, b) => a.id - b.id));
});

// POST /api/comptes — créer un compte
router.post('/', PROP, (req, res) => {
    const { nom, type, solde_initial, nom_banque, numero_compte, iban, bic, description } = req.body;
    if (!nom || !['CAISSE', 'BANQUE'].includes(type))
        return res.status(400).json({ error: 'nom et type (CAISSE|BANQUE) requis' });
    const data = load();
    const maxId = (data.comptes || []).reduce((m, c) => Math.max(m, c.id), 0);
    const compte = {
        id: maxId + 1,
        nom,
        type,
        solde_initial: Number(solde_initial) || 0,
        nom_banque: nom_banque || null,
        numero_compte: numero_compte || null,
        iban: iban || null,
        bic: bic || null,
        description: description || null,
        actif: true,
        created_at: new Date().toISOString(),
    };
    data.comptes.push(compte);
    save(data);
    res.status(201).json(compte);
});

// PUT /api/comptes/:id — modifier un compte
router.put('/:id', PROP, (req, res) => {
    const { nom, type, solde_initial, actif, nom_banque, numero_compte, iban, bic, description } = req.body;
    const data = load();
    const idx = data.comptes.findIndex(c => c.id === Number(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'Non trouvé' });
    const prev = data.comptes[idx];
    data.comptes[idx] = {
        ...prev,
        nom: nom || prev.nom,
        type: ['CAISSE','BANQUE'].includes(type) ? type : prev.type,
        solde_initial: solde_initial !== undefined ? Number(solde_initial) : prev.solde_initial,
        nom_banque: nom_banque !== undefined ? (nom_banque || null) : prev.nom_banque,
        numero_compte: numero_compte !== undefined ? (numero_compte || null) : prev.numero_compte,
        iban: iban !== undefined ? (iban || null) : prev.iban,
        bic: bic !== undefined ? (bic || null) : prev.bic,
        description: description !== undefined ? (description || null) : prev.description,
        actif: actif !== undefined ? actif : prev.actif,
    };
    save(data);
    res.json(data.comptes[idx]);
});

// DELETE /api/comptes/:id — désactiver un compte (soft delete)
router.delete('/:id', PROP, (req, res) => {
    const data = load();
    const idx = data.comptes.findIndex(c => c.id === Number(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'Non trouvé' });
    // Vérifier qu'aucune transaction n'utilise ce compte
    const used = data.transactions.some(t => t.compte_id === Number(req.params.id));
    if (used) {
        data.comptes[idx].actif = false;
        save(data);
        return res.json({ success: true, desactivated: true });
    }
    data.comptes.splice(idx, 1);
    save(data);
    res.json({ success: true });
});

module.exports = router;
