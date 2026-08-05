const express = require('express');
const router = express.Router();
const { load, save, nextId } = require('../store');
const { hashPwd, requireRole } = require('../middleware/auth');

const ROLES = ['PROPRIETAIRE', 'GESTIONNAIRE', 'AGENT', 'TECHNICIEN'];
const hasHtml = s => typeof s === 'string' && /[<>]/.test(s);

// Cloison multi-entreprise : un PROPRIETAIRE ne voit et ne gère QUE les
// utilisateurs de sa propre entreprise.

// GET all (admin only) — uniquement les utilisateurs de MON entreprise
router.get('/', requireRole('PROPRIETAIRE'), (req, res) => {
    const data = load();
    res.json(data.users
        .filter(u => (u.org_id || 1) === req.orgId)
        .map(u => ({ ...u, password: undefined })));
});

// POST create (admin only) — le nouvel utilisateur rejoint MON entreprise,
// avec un mot de passe provisoire qu'il devra changer à sa première connexion.
router.post('/', requireRole('PROPRIETAIRE'), (req, res) => {
    const { nom, prenom, email, login, password, role, permissions } = req.body;
    if (!nom || !login || !password || !role) return res.status(400).json({ error: 'nom, login, password, role requis' });
    if (password.length < 6) return res.status(400).json({ error: 'Le mot de passe doit faire au moins 6 caractères' });
    if (!ROLES.includes(role)) return res.status(400).json({ error: 'Rôle invalide' });
    if (hasHtml(nom) || hasHtml(prenom)) return res.status(400).json({ error: 'Le nom ne peut pas contenir < ou >' });

    const data = load();
    if (data.users.find(u => u.login.toLowerCase() === login.toLowerCase())) return res.status(400).json({ error: 'Login déjà utilisé' });

    const user = {
        id: nextId(data, 'users'),
        nom, prenom: prenom || null, email: email || null, login,
        password: hashPwd(password),
        role,
        org_id: req.orgId,
        permissions: Array.isArray(permissions) ? permissions : [],
        must_change_password: true, // mot de passe provisoire choisi par un tiers
        actif: true,
        created_at: new Date().toISOString(),
    };
    data.users.push(user);
    save(data);
    res.status(201).json({ ...user, password: undefined });
});

// PUT update — uniquement un utilisateur de MON entreprise
router.put('/:id', requireRole('PROPRIETAIRE'), (req, res) => {
    const { nom, prenom, email, login, password, role, actif, permissions } = req.body;
    if (hasHtml(nom) || hasHtml(prenom)) return res.status(400).json({ error: 'Le nom ne peut pas contenir < ou >' });
    const data = load();
    const idx = data.users.findIndex(u => u.id === Number(req.params.id) && (u.org_id || 1) === req.orgId);
    if (idx === -1) return res.status(404).json({ error: 'Non trouvé' });

    const updated = {
        ...data.users[idx],
        nom, prenom: prenom || null, email: email || null, login,
        role, actif: actif !== false,
    };
    if (password && password.length < 6) return res.status(400).json({ error: 'Le mot de passe doit faire au moins 6 caractères' });
    if (password) {
        updated.password = hashPwd(password);
        // Mot de passe posé par l'admin pour quelqu'un d'autre → provisoire.
        // Posé par l'utilisateur pour lui-même → définitif.
        if (Number(req.params.id) !== req.user.id) updated.must_change_password = true;
        else delete updated.must_change_password;
    }
    if (permissions !== undefined) updated.permissions = Array.isArray(permissions) ? permissions : [];
    data.users[idx] = updated;
    save(data);
    res.json({ ...updated, password: undefined });
});

// PATCH /:id/permissions — mise à jour des permissions uniquement
router.patch('/:id/permissions', requireRole('PROPRIETAIRE'), (req, res) => {
    const d = load();
    const target = d.users.find(u => u.id === parseInt(req.params.id) && (u.org_id || 1) === req.orgId);
    if (!target) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    const { permissions } = req.body;
    if (!Array.isArray(permissions)) return res.status(400).json({ error: 'permissions doit être un tableau' });
    target.permissions = permissions;
    save(d);
    res.json({ ...target, password: undefined });
});

// DELETE — uniquement un utilisateur de MON entreprise
router.delete('/:id', requireRole('PROPRIETAIRE'), (req, res) => {
    const id = Number(req.params.id);
    if (req.user.id === id) return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
    const data = load();
    const target = data.users.find(u => u.id === id && (u.org_id || 1) === req.orgId);
    if (target?.login === 'demo') return res.status(400).json({ error: 'Le compte démo ne peut pas être supprimé' });
    if (!target) return res.status(404).json({ error: 'Non trouvé' });
    if (target.role === 'PROPRIETAIRE') {
        // Le dernier PROPRIETAIRE de l'ENTREPRISE, pas de toute la plateforme
        const proprietairesRestants = data.users.filter(u =>
            u.role === 'PROPRIETAIRE' && (u.org_id || 1) === req.orgId && u.id !== id);
        if (proprietairesRestants.length === 0)
            return res.status(400).json({ error: 'Impossible de supprimer le dernier PROPRIETAIRE' });
    }
    data.users = data.users.filter(u => u.id !== id);
    save(data);
    res.json({ success: true });
});

module.exports = router;
