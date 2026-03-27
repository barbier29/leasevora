const express = require('express');
const router = express.Router();
const { load, save } = require('../store');
const { requireRole } = require('../middleware/auth');

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'CAD', 'AED', 'XOF', 'XAF', 'MAD', 'TND', 'DZD', 'NGN', 'GHS', 'KES', 'ZAR', 'GNF', 'JPY', 'BRL', 'MXN', 'XPF'];
const LANGUAGES  = ['fr', 'en'];

// GET settings — tous les utilisateurs authentifiés
router.get('/', (req, res) => {
    const data = load();
    res.json(data.settings);
});

// PUT update settings — PROPRIETAIRE uniquement
router.put('/', requireRole('PROPRIETAIRE'), (req, res) => {
    const { currency, language } = req.body;
    if (currency && !CURRENCIES.includes(currency))
        return res.status(400).json({ error: `Devise invalide. Valeurs acceptées : ${CURRENCIES.join(', ')}` });
    if (language && !LANGUAGES.includes(language))
        return res.status(400).json({ error: 'Langue invalide. Valeurs acceptées : fr, en' });
    const data = load();
    data.settings = { ...data.settings, ...req.body };
    save(data);
    res.json(data.settings);
});

module.exports = router;
