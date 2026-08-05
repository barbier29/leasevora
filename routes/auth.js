const express = require('express');
const router = express.Router();
const { load, save, nextId, newOrg } = require('../store');
const { hashPwd, verifyPwd, isLegacyHash, createToken, sessions, requireAuth } = require('../middleware/auth');

const hasHtml = s => typeof s === 'string' && /[<>]/.test(s);

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
    if (!user || !verifyPwd(password, user.password)) {
        // Incrémenter le compteur d'échecs
        const current = loginAttempts.get(ip) || { count: 0, resetAt: now + BRUTE_WINDOW };
        current.count += 1;
        loginAttempts.set(ip, current);
        return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    // Authentification réussie : réinitialiser le compteur
    loginAttempts.delete(ip);

    // Migration transparente : hash legacy sha256 → bcrypt au premier login réussi
    if (isLegacyHash(user.password)) {
        user.password = hashPwd(password);
        save(data);
    }

    const token = createToken();
    const payload = { id: user.id, nom: user.nom, prenom: user.prenom, email: user.email, login: user.login, role: user.role, org_id: user.org_id || 1 };
    // AUDIT 1 — Stocker { user, createdAt } pour la gestion de l'expiration de session
    sessions.set(token, { user: payload, createdAt: Date.now() });

    // Mot de passe d'usine encore actif sur un compte non-démo → alerte affichée au front
    const response = { token, user: payload };
    if (user.login !== 'demo' && (password === 'admin123' || password === user.login + '123')) {
        response.warning = '⚠️ Vous utilisez encore le mot de passe par défaut. Changez-le immédiatement : il est connu de tous.';
    }
    // Compte créé par un collègue avec mot de passe provisoire → changement imposé au front
    if (user.must_change_password) response.must_change_password = true;
    res.json(response);
});

// ── Inscription publique : crée une ENTREPRISE + son premier compte ────────
// C'est le point d'entrée des nouveaux clients (ex : propriétaires de GALAXY,
// ATK). Chaque inscription = un espace de données totalement étanche.
const signupAttempts = new Map();
router.post('/signup', (req, res) => {
    // Anti-abus : 5 inscriptions max par IP par heure
    const ip = req.ip || req.socket.remoteAddress;
    const now = Date.now();
    const rec = signupAttempts.get(ip) || { count: 0, resetAt: now + 3600000 };
    if (now >= rec.resetAt) { rec.count = 0; rec.resetAt = now + 3600000; }
    if (rec.count >= 5) return res.status(429).json({ error: 'Trop d\'inscriptions depuis cette adresse. Réessayez plus tard.' });

    const { entreprise, nom, prenom, email, login, password } = req.body || {};
    if (!entreprise || !entreprise.toString().trim())
        return res.status(400).json({ error: 'Le nom de votre entreprise ou de votre patrimoine est requis' });
    if (!nom || !login || !password)
        return res.status(400).json({ error: 'nom, login et password requis' });
    if (password.length < 6)
        return res.status(400).json({ error: 'Le mot de passe doit faire au moins 6 caractères' });
    if (login.length < 3 || !/^[a-zA-Z0-9_.@-]+$/.test(login))
        return res.status(400).json({ error: 'Identifiant invalide (3 caractères min., lettres/chiffres/._@- uniquement)' });
    if (hasHtml(entreprise) || hasHtml(nom) || hasHtml(prenom))
        return res.status(400).json({ error: 'Les noms ne peuvent pas contenir < ou >' });

    const data = load();
    if (data.users.find(u => u.login.toLowerCase() === login.toLowerCase()))
        return res.status(409).json({ error: 'Cet identifiant est déjà utilisé. Choisissez-en un autre.' });

    rec.count += 1;
    signupAttempts.set(ip, rec);

    const orgId = newOrg(data, entreprise.toString().trim().slice(0, 80));
    const user = {
        id: nextId(data, 'users'),
        nom: nom.toString().slice(0, 80),
        prenom: prenom ? prenom.toString().slice(0, 80) : null,
        email: email || null,
        login,
        password: hashPwd(password),
        role: 'PROPRIETAIRE', // le créateur du compte est propriétaire de son espace
        org_id: orgId,
        permissions: [],
        actif: true,
        created_at: new Date().toISOString(),
    };
    data.users.push(user);
    save(data);

    // Connexion immédiate
    const token = createToken();
    const payload = { id: user.id, nom: user.nom, prenom: user.prenom, email: user.email, login: user.login, role: user.role, org_id: orgId };
    sessions.set(token, { user: payload, createdAt: Date.now() });
    res.status(201).json({ token, user: payload });
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

    if (!verifyPwd(currentPassword, user.password))
        return res.status(401).json({ error: 'Mot de passe actuel incorrect' });

    user.password = hashPwd(newPassword);
    delete user.must_change_password; // le mot de passe provisoire a été remplacé
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
