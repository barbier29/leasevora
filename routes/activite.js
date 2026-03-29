const express = require('express');
const router = express.Router();
const { load, save } = require('../store');
const { requireAuth, requireRole } = require('../middleware/auth');

// Helper exporté pour que les autres routes puissent logger
function logActivite(data, user, action, details) {
    if (!data.activite) data.activite = [];
    data.activite.unshift({
        id: (data.activite[0]?.id || 0) + 1,
        date: new Date().toISOString(),
        user_login: user?.login || 'système',
        user_nom: user ? ((user.prenom || '') + ' ' + (user.nom || '')).trim() : 'Système',
        action,
        details,
    });
    // garder seulement les 500 dernières entrées
    if (data.activite.length > 500) data.activite = data.activite.slice(0, 500);
}
module.exports.logActivite = logActivite;

router.get('/', requireRole('PROPRIETAIRE'), (req, res) => {
    const data = load();
    const limit = parseInt(req.query.limit) || 50;
    res.json((data.activite || []).slice(0, limit));
});
module.exports.router = router;
