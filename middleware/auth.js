const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { load, save, nextId, orgOf, newOrg } = require('../store');

// Simple token store (in-memory; resets on server restart — fine for MVP)
// Sessions stored as: token → { user: { id, nom, role, ... }, createdAt: timestamp }
const sessions = new Map();

// Session expiration: 24 hours in milliseconds
const SESSION_TTL = 24 * 3600 * 1000;

// Ancien schéma (SHA-256 + sel statique) — conservé UNIQUEMENT pour vérifier
// les hashs existants ; tout nouveau hash passe par bcrypt. Au premier login
// réussi d'un utilisateur legacy, son hash est migré vers bcrypt (routes/auth.js).
function legacySha256Pwd(password) {
    return crypto.createHash('sha256').update('pm_salt_2024:' + password).digest('hex');
}

function hashPwd(password) {
    return bcrypt.hashSync(password, 10);
}

// Vérifie un mot de passe contre un hash bcrypt OU legacy sha256
function verifyPwd(password, stored) {
    if (!stored) return false;
    if (stored.startsWith('$2')) return bcrypt.compareSync(password, stored);
    return stored === legacySha256Pwd(password);
}

// Le hash est-il encore au format legacy (à migrer) ?
function isLegacyHash(stored) {
    return !!stored && !stored.startsWith('$2');
}

function createToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Seed admin user if no users exist (confort de dev local — en production,
// les comptes se créent via l'inscription publique /api/auth/signup)
function seedAdmin() {
    const data = load();
    if (data.users.length === 0) {
        orgOf(data, 1); // s'assurer que l'entreprise 1 existe
        if (!data._seq.orgs) data._seq.orgs = 1;
        data.users.push({
            id: nextId(data, 'users'),
            nom: 'Admin',
            prenom: 'Propriétaire',
            email: 'admin@propmanager.fr',
            login: 'admin',
            password: hashPwd('admin123'),
            role: 'PROPRIETAIRE',
            org_id: 1,
            actif: true,
            created_at: new Date().toISOString(),
        });
        save(data);
        console.log('✅  Utilisateur admin créé — login: admin / mot de passe: admin123');
    }
}

// Seed compte démo — toujours présent, jamais supprimable.
// Le démo vit dans SA PROPRE entreprise vide : ses GET connus sont interceptés
// par demo-data.js, et pour tout le reste il ne voit que du vide — jamais les
// données réelles d'une vraie entreprise.
function seedDemo() {
    const data = load();
    const exists = data.users.find(u => u.login === 'demo');
    if (!exists) {
        const demoOrgId = newOrg(data, 'Entreprise de démonstration');
        data.users.push({
            id: nextId(data, 'users'),
            nom: 'Démo',
            prenom: 'Compte',
            email: 'demo@leasevora.com',
            login: 'demo',
            password: hashPwd('demo123'),
            role: 'GESTIONNAIRE',
            org_id: demoOrgId,
            permissions: ['dashboard','properties','units','locataires','sejours','calendrier','travaux','compteurs'],
            actif: true,
            is_demo: true,
            created_at: new Date().toISOString(),
        });
        save(data);
        console.log('✅  Compte démo créé — login: demo / mot de passe: demo123');
    } else if (exists.org_id === 1) {
        // Démo hérité de l'époque mono-entreprise : l'isoler dans sa propre org
        exists.org_id = newOrg(data, 'Entreprise de démonstration');
        save(data);
        console.log('✅  Compte démo isolé dans sa propre entreprise');
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
    req.orgId = session.user.org_id || 1; // cloison multi-entreprise
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

// Middleware: deny specific roles (blacklist approach)
function denyRoles(...roles) {
    return (req, res, next) => {
        if (roles.includes(req.user?.role)) {
            return res.status(403).json({ error: 'Accès refusé — droits insuffisants' });
        }
        next();
    };
}

module.exports = { hashPwd, verifyPwd, isLegacyHash, createToken, sessions, seedAdmin, seedDemo, requireAuth, requireRole, requireNotDemo, denyRoles };
