const express = require('express');
const router = express.Router();
const { load, save } = require('../store');
const { hashPwd, createToken, sessions, requireAuth } = require('../middleware/auth');

// AUDIT 4 — Protection brute-force : compteur d'échecs par IP
// Structure : ip → { count: number, resetAt: timestamp }
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const BRUTE_WINDOW = 15 * 60 * 1000; // 15 minutes en ms

// POST /api/auth/login
router.post('/login', (req, res) => {
    const { login, password } = req.body;
    if (!login || !password || password.length < 6) return res.status(400).json({ error: 'Identifiants invalides' });

    // AUDIT 4 — Vérification du rate limiting par IP
    const ip = req.ip || req.socket.remoteAddress;
    const now = Date.now();
    const attempts = loginAttempts.get(ip);

    if (attempts) {
        if (now < attempts.resetAt && attempts.count >= MAX_ATTEMPTS) {
            const minutesLeft = Math.ceil((attempts.resetAt - now) / 60000);
            return res.status(429).json({
                error: `Trop de tentatives échouées. Réessayez dans ${minutesLeft} minute(s).`
            });
        }
        // Réinitialiser le compteur si la fenêtre est expirée
        if (now >= attempts.resetAt) {
            loginAttempts.delete(ip);
        }
    }

    const data = load();
    const user = data.users.find(u => u.login === login && u.actif !== false);
    if (!user || user.password !== hashPwd(password)) {
        // Incrémenter le compteur d'échecs
        const current = loginAttempts.get(ip) || { count: 0, resetAt: now + BRUTE_WINDOW };
        current.count += 1;
        loginAttempts.set(ip, current);
        return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    // Authentification réussie : réinitialiser le compteur
    loginAttempts.delete(ip);

    const token = createToken();
    const payload = { id: user.id, nom: user.nom, prenom: user.prenom, email: user.email, login: user.login, role: user.role };
    // AUDIT 1 — Stocker { user, createdAt } pour la gestion de l'expiration de session
    sessions.set(token, { user: payload, createdAt: Date.now() });
    res.json({ token, user: payload });
});

// POST /api/auth/change-password
router.post('/change-password', requireAuth, async (req, res) => {
    // Bloquer le changement de mot de passe pour le compte démo
    if (req.user?.login === 'demo') {
        return res.status(403).json({ error: '🔒 Compte démo — modification du mot de passe interdite.' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword)
        return res.status(400).json({ error: 'Mot de passe actuel et nouveau requis' });

    if (newPassword.length < 6)
        return res.status(400).json({ error: 'Le nouveau mot de passe doit faire au moins 6 caractères' });

    const d = load();
    const user = d.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    if (user.password !== hashPwd(currentPassword))
        return res.status(401).json({ error: 'Mot de passe actuel incorrect' });

    user.password = hashPwd(newPassword);
    save(d);

    res.json({ success: true, message: 'Mot de passe modifié avec succès' });
});

// POST /api/auth/logout
router.post('/logout', requireAuth, (req, res) => {
    sessions.delete(req.token);
    res.json({ success: true });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
    res.json(req.user);
});

module.exports = router;
