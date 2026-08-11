const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { load, save, nextId, newOrg } = require('../store');
const { hashPwd, verifyPwd, isLegacyHash, createToken, sessions, requireAuth } = require('../middleware/auth');

const hasHtml = s => typeof s === 'string' && /[<>]/.test(s);
const isEmail = s => typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);

// ── Envoi d'email plateforme (mot de passe oublié) ─────────────────────────
// SMTP global via variables d'environnement Render : SMTP_HOST, SMTP_PORT,
// SMTP_USER, SMTP_PASS. Sans configuration, le lien est écrit dans les logs
// serveur (récupérable par l'admin dans le dashboard Render) — le flux reste
// donc utilisable avant même d'avoir branché un SMTP.
async function sendPlatformEmail(to, subject, html) {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return false;
    try {
        const transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: Number(SMTP_PORT) || 465,
            secure: (Number(SMTP_PORT) || 465) === 465,
            auth: { user: SMTP_USER, pass: SMTP_PASS },
        });
        await transporter.sendMail({ from: `"Leasevora" <${SMTP_USER}>`, to, subject, html });
        return true;
    } catch (e) {
        console.error('⚠️  Envoi email échoué:', e.message);
        return false;
    }
}

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
    // L'utilisateur peut se connecter avec son identifiant OU son email
    const id = login.toLowerCase();
    const user = data.users.find(u =>
        (u.login.toLowerCase() === id || (u.email && u.email.toLowerCase() === id)) && u.actif !== false);
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
    const payload = { id: user.id, nom: user.nom, prenom: user.prenom, email: user.email, login: user.login, role: user.role, org_id: user.org_id || 1, permissions: user.permissions || [] };
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
    // Email obligatoire : c'est la seule porte de sortie en cas de mot de passe oublié
    if (!isEmail(email))
        return res.status(400).json({ error: 'Une adresse email valide est requise (pour récupérer votre compte en cas d\'oubli du mot de passe)' });
    if (password.length < 6)
        return res.status(400).json({ error: 'Le mot de passe doit faire au moins 6 caractères' });
    if (login.length < 3 || !/^[a-zA-Z0-9_.@-]+$/.test(login))
        return res.status(400).json({ error: 'Identifiant invalide (3 caractères min., lettres/chiffres/._@- uniquement)' });
    if (hasHtml(entreprise) || hasHtml(nom) || hasHtml(prenom))
        return res.status(400).json({ error: 'Les noms ne peuvent pas contenir < ou >' });

    const data = load();
    if (data.users.find(u => u.login.toLowerCase() === login.toLowerCase()))
        return res.status(409).json({ error: 'Cet identifiant est déjà utilisé. Choisissez-en un autre.' });
    if (data.users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase()))
        return res.status(409).json({ error: 'Un compte existe déjà avec cet email. Utilisez « Mot de passe oublié » sur la page de connexion.' });

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
    const payload = { id: user.id, nom: user.nom, prenom: user.prenom, email: user.email, login: user.login, role: user.role, org_id: orgId, permissions: [] };
    sessions.set(token, { user: payload, createdAt: Date.now() });
    res.status(201).json({ token, user: payload });
});

// ── Mot de passe oublié ────────────────────────────────────────────────────
// POST /api/auth/forgot-password { identifiant } — identifiant OU email.
// Réponse TOUJOURS identique (pas de fuite d'existence de compte). Le lien
// de réinitialisation expire au bout d'1 heure et ne sert qu'une fois.
const forgotAttempts = new Map();
router.post('/forgot-password', async (req, res) => {
    const ip = req.ip || req.socket.remoteAddress;
    const now = Date.now();
    const rec = forgotAttempts.get(ip) || { count: 0, resetAt: now + 3600000 };
    if (now >= rec.resetAt) { rec.count = 0; rec.resetAt = now + 3600000; }
    if (rec.count >= 5) return res.status(429).json({ error: 'Trop de demandes. Réessayez plus tard.' });
    rec.count += 1;
    forgotAttempts.set(ip, rec);

    const { identifiant } = req.body || {};
    const generic = { success: true, message: 'Si un compte existe avec cet identifiant ou cet email, un lien de réinitialisation a été envoyé.' };
    if (!identifiant || !identifiant.toString().trim()) return res.json(generic);

    const data = load();
    const id = identifiant.toString().trim().toLowerCase();
    const user = data.users.find(u =>
        (u.login.toLowerCase() === id || (u.email && u.email.toLowerCase() === id)) &&
        u.actif !== false && u.login !== 'demo');

    if (user && user.email) {
        user.reset_token = crypto.randomBytes(32).toString('hex');
        user.reset_expires = new Date(Date.now() + 3600000).toISOString();
        save(data);

        const host = req.headers.origin || `${req.protocol}://${req.get('host')}`;
        const link = `${host}/reset/${user.reset_token}`;
        const sent = await sendPlatformEmail(user.email, '🔑 Réinitialisation de votre mot de passe Leasevora', `
            <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#faf9f5;border-radius:16px">
              <h2 style="margin:0 0 8px;color:#1c1b18;font-size:22px">Réinitialiser votre mot de passe</h2>
              <p style="color:#524f47;font-size:15px;margin:0 0 24px">Quelqu'un (vous, normalement) a demandé un nouveau mot de passe pour le compte <strong>${user.login}</strong>.</p>
              <a href="${link}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:600;font-size:15px">Choisir un nouveau mot de passe</a>
              <p style="color:#8a8780;font-size:12px;margin:24px 0 0">Ce lien expire dans 1 heure. Si vous n'avez rien demandé, ignorez cet email — votre mot de passe actuel reste valable.</p>
            </div>`);
        if (!sent) {
            // SMTP non configuré : le lien reste récupérable par l'admin dans les logs Render
            console.log(`🔑 Lien de réinitialisation pour ${user.login} (email non envoyé — SMTP non configuré) : ${link}`);
        }
    } else if (user && !user.email) {
        console.log(`🔑 Demande de réinitialisation pour ${user.login} : IMPOSSIBLE, aucun email enregistré sur ce compte`);
    }

    res.json(generic);
});

// POST /api/auth/reset-password { token, newPassword }
router.post('/reset-password', (req, res) => {
    const { token, newPassword } = req.body || {};
    if (!token || !/^[a-f0-9]{64}$/.test(token))
        return res.status(400).json({ error: 'Lien invalide.' });
    if (!newPassword || newPassword.length < 6)
        return res.status(400).json({ error: 'Le nouveau mot de passe doit faire au moins 6 caractères' });

    const data = load();
    const user = data.users.find(u => u.reset_token === token);
    if (!user)
        return res.status(404).json({ error: 'Lien invalide ou déjà utilisé.' });
    if (!user.reset_expires || new Date(user.reset_expires) < new Date())
        return res.status(410).json({ error: 'Ce lien a expiré. Refaites une demande depuis « Mot de passe oublié ».' });

    user.password = hashPwd(newPassword);
    delete user.reset_token;
    delete user.reset_expires;
    delete user.must_change_password;
    save(data);
    res.json({ success: true, message: 'Mot de passe réinitialisé. Vous pouvez vous connecter.' });
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
