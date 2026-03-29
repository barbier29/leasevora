const express = require('express');
const router = express.Router();
const { load, save, nextId } = require('../store');
const { hashPwd, requireRole } = require('../middleware/auth');

const ROLES = ['PROPRIETAIRE', 'GESTIONNAIRE', 'EMPLOYE'];

// GET all (admin only)
router.get('/', requireRole('PROPRIETAIRE'), (req, res) => {
    const data = load();
    res.json(data.users.map(u => ({ ...u, password: undefined })));
});

// POST create (admin only)
router.post('/', requireRole('PROPRIETAIRE'), (req, res) => {
    const { nom, prenom, email, login, password, role, permissions } = req.body;
    if (!nom || !login || !password || !role) return res.status(400).json({ error: 'nom, login, password, role requis' });
    if (!ROLES.includes(role)) return res.status(400).json({ error: 'Rôle invalide' });

    const data = load();
    if (data.users.find(u => u.login === login)) return res.status(400).json({ error: 'Login déjà utilisé' });

    const user = {
        id: nextId(data, 'users'),
        nom, prenom: prenom || null, email: email || null, login,
        password: hashPwd(password),
        role,
        permissions: Array.isArray(permissions) ? permissions : [],
        actif: true,
        created_at: new Date().toISOString(),
    };
    data.users.push(user);
    save(data);
    res.status(201).json({ ...user, password: undefined });
});

// PUT update
router.put('/:id', requireRole('PROPRIETAIRE'), (req, res) => {
    const { nom, prenom, email, login, password, role, actif, permissions } = req.body;
    const data = load();
    const idx = data.users.findIndex(u => u.id === Number(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'Non trouvé' });

    const updated = {
        ...data.users[idx],
        nom, prenom: prenom || null, email: email || null, login,
        role, actif: actif !== false,
    };
    if (password) updated.password = hashPwd(password);
    if (permissions !== undefined) updated.permissions = Array.isArray(permissions) ? permissions : [];
    data.users[idx] = updated;
    save(data);
    res.json({ ...updated, password: undefined });
});

// PATCH /:id/permissions — mise à jour des permissions uniquement
router.patch('/:id/permissions', requireRole('PROPRIETAIRE'), (req, res) => {
    const d = load();
    const target = d.users.find(u => u.id === parseInt(req.params.id));
    if (!target) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    const { permissions } = req.body;
    if (!Array.isArray(permissions)) return res.status(400).json({ error: 'permissions doit être un tableau' });
    target.permissions = permissions;
    save(d);
    res.json({ ...target, password: undefined });
});

// DELETE
router.delete('/:id', requireRole('PROPRIETAIRE'), (req, res) => {
    const id = Number(req.params.id);
    if (req.user.id === id) return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
    const data = load();
    const target = data.users.find(u => u.id === id);
    if (!target) return res.status(404).json({ error: 'Non trouvé' });
    if (target.role === 'PROPRIETAIRE') {
        const proprietairesRestants = data.users.filter(u => u.role === 'PROPRIETAIRE' && u.id !== id);
        if (proprietairesRestants.length === 0)
            return res.status(400).json({ error: 'Impossible de supprimer le dernier PROPRIETAIRE' });
    }
    data.users = data.users.filter(u => u.id !== id);
    save(data);
    res.json({ success: true });
});

module.exports = router;
