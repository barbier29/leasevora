const express = require('express');
const router = express.Router();
const { load, save, scoped } = require('../store');
const { requireRole } = require('../middleware/auth');

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'CAD', 'AED', 'XOF', 'XAF', 'MAD', 'TND', 'DZD', 'NGN', 'GHS', 'KES', 'ZAR', 'GNF', 'JPY', 'BRL', 'MXN', 'XPF'];
const LANGUAGES  = ['fr', 'en'];

// GET settings — tous les utilisateurs authentifiés (nécessaire pour le boot de l'app : devise, langue)
router.get('/', (req, res) => {
    const data = scoped(load(), req.orgId);
    res.json(data.settings);
});

// PUT update settings — PROPRIETAIRE uniquement
router.put('/', requireRole('PROPRIETAIRE'), (req, res) => {
    const { currency, language } = req.body;
    if (currency && !CURRENCIES.includes(currency))
        return res.status(400).json({ error: `Devise invalide. Valeurs acceptées : ${CURRENCIES.join(', ')}` });
    if (language && !LANGUAGES.includes(language))
        return res.status(400).json({ error: 'Langue invalide. Valeurs acceptées : fr, en' });
    const data = scoped(load(), req.orgId);
    data.settings = { ...data.settings, ...req.body };
    save(data);
    res.json(data.settings);
});

module.exports = router;
