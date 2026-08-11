const express = require('express');
const router = express.Router();
const { load, save, scoped } = require('../store');
const { requireRole } = require('../middleware/auth');

const ALLOWED_KEYS = ['currency', 'language', 'email_enabled', 'email_to', 'smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass'];
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
    // Liste blanche : ne jamais stocker de clés arbitraires
    const clean = {};
    for (const k of ALLOWED_KEYS) if (k in req.body) clean[k] = req.body[k];
    data.settings = { ...data.settings, ...clean };
    save(data);
    res.json(data.settings);
});

module.exports = router;
