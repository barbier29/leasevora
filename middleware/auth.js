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

// Seed compte démo — toujours présent, jamais supprimable
function seedDemo() {
    const data = load();
    const exists = data.users.find(u => u.login === 'demo');
    if (!exists) {
        data.users.push({
            id: nextId(data, 'users'),
            nom: 'Démo',
            prenom: 'Compte',
            email: 'demo@leasevora.com',
            login: 'demo',
            password: hashPwd('demo123'),
            role: 'GESTIONNAIRE',
            permissions: ['dashboard','properties','units','locataires','sejours','calendrier','travaux','compteurs'],
            actif: true,
            is_demo: true,
            created_at: new Date().toISOString(),
        });
        save(data);
        console.log('✅  Compte démo créé — login: demo / mot de passe: demo123');
    }
}

// Middleware: bloquer toutes les modifications pour le compte démo
function requireNotDemo(req, res, next) {
    if (req.user && req.user.login === 'demo') {
        return res.status(403).json({ error: '🔒 Compte démo — lecture seule. Aucune modification possible.' });
    }
    next();
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

module.exports = { hashPwd, createToken, sessions, seedAdmin, seedDemo, requireAuth, requireRole, requireNotDemo };
