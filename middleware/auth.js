const crypto = require('crypto');
const { load, save, nextId } = require('../store');

// Simple token store (in-memory; resets on server restart — fine for MVP)
// Sessions stored as: token → { user: { id, nom, role, ... }, createdAt: timestamp }
const sessions = new Map();

// Session expiration: 24 hours in milliseconds
const SESSION_TTL = 24 * 3600 * 1000;

function hashPwd(password) {
    return crypto.createHash('sha256').update('pm_salt_2024:' + password).digest('hex');
}

function createToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Seed admin user if no users exist
function seedAdmin() {
    const data = load();
    if (data.users.length === 0) {
        data.users.push({
            id: nextId(data, 'users'),
            nom: 'Admin',
            prenom: 'Propriétaire',
            email: 'admin@propmanager.fr',
            login: 'admin',
            password: hashPwd('admin123'),
            role: 'PROPRIETAIRE',
            actif: true,
            created_at: new Date().toISOString(),
        });
        save(data);
        console.log('✅  Utilisateur admin créé — login: admin / mot de passe: admin123');
    }
}

// Express middleware: requires valid token
function requireAuth(req, res, next) {
    const header = req.headers['authorization'] || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token || !sessions.has(token)) {
        return res.status(401).json({ error: 'Non authentifié' });
    }
    // AUDIT 1 — Expiration de session : vérification TTL 24h
    const session = sessions.get(token);
    if (Date.now() - session.createdAt > SESSION_TTL) {
        sessions.delete(token);
        return res.status(401).json({ error: 'Session expirée, veuillez vous reconnecter' });
    }
    req.user = session.user;
    req.token = token;
    next();
}

// Middleware: restrict to specific roles
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Accès refusé — droits insuffisants' });
        }
        next();
    };
}

module.exports = { hashPwd, createToken, sessions, seedAdmin, requireAuth, requireRole };
