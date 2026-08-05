try { require('dotenv').config(); } catch {}

const express = require('express');
const cors = require('cors');
const path = require('path');

require('./db');

const { seedAdmin, seedDemo, requireAuth, requireNotDemo } = require('./middleware/auth');
// seedAdmin() est appelé APRÈS syncFromSupabase() dans app.listen

const app = express();
const corsOptions = process.env.NODE_ENV === 'production'
    ? { origin: process.env.ALLOWED_ORIGIN || true, credentials: true }
    : { origin: true, credentials: true };
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), {
    etag: false,
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js') || filePath.endsWith('.html') || filePath.endsWith('.css')) {
            res.setHeader('Cache-Control', 'no-store');
        }
    }
}));

app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// Public routes (no auth required)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/invite', require('./routes/invite')); // gère son propre auth en interne
app.use('/api/verif', require('./routes/verif'));     // vérification locataire — public par design (token = clé)
app.use('/api/portail', require('./routes/portail')); // portail locataire — public par design (token = clé)

// Page publique de vérification d'un paiement (lien envoyé au locataire)
app.get('/v/:token', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'verif.html'));
});

// Portail locataire (lien permanent envoyé au locataire)
app.get('/l/:token', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'portail.html'));
});

// All other /api routes require authentication
app.use('/api', requireAuth);

// Compte démo : lecture seule — bloquer toutes les écritures
app.use('/api', (req, res, next) => {
    if (req.user?.login === 'demo' && ['POST','PUT','PATCH','DELETE'].includes(req.method)) {
        return res.status(403).json({ error: '🔒 Compte démo — lecture seule. Aucune modification possible.' });
    }
    next();
});

// Compte démo : données fictives isolées — intercepter les GET
const demoData = require('./demo-data');
app.use('/api', (req, res, next) => {
    if (req.user?.login === 'demo' && req.method === 'GET') {
        // Extraire le nom de la route (ex: /properties -> "properties", /finance/income-statement -> "finance")
        const route = req.path.replace(/^\//, '').split('/')[0];
        if (demoData[route]) {
            const handler = demoData[route];
            // Les handlers peuvent être des fonctions (dynamiques) ou des données statiques
            const result = typeof handler === 'function' ? handler(req.query?.month) : handler;
            return res.json(result);
        }
    }
    next();
});
app.use('/api/settings', require('./routes/settings'));
app.use('/api/properties', require('./routes/properties'));
app.use('/api/units', require('./routes/units'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/sejours', require('./routes/sejours'));
app.use('/api/caisse', require('./routes/caisse'));
app.use('/api/comptes', require('./routes/comptes'));
app.use('/api/locataires', require('./routes/locataires'));
app.use('/api/travaux', require('./routes/travaux'));
app.use('/api/compteurs', require('./routes/compteurs'));
app.use('/api/users', require('./routes/users'));
app.use('/api/finance', require('./routes/finance'));
app.use('/api/notes', require('./routes/notes'));
app.use('/api/paiements', require('./routes/paiements'));
app.use('/api/declarations', require('./routes/declarations'));
app.use('/api/search', require('./routes/search'));
app.use('/api/activite', require('./routes/activite').router);

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3002;

if (!process.env.JWT_SECRET) {
    console.warn('⚠️  JWT_SECRET non défini dans .env — utilisation de la clé par défaut (non sécurisé en production)');
}

const { syncFromSupabase, migrateVerifTokens } = require('./store');

app.listen(PORT, async () => {
    // 1. Restaurer les données depuis Supabase EN PREMIER
    await syncFromSupabase();
    // 2. Créer l'admin si nécessaire (après sync)
    seedAdmin();
    // 3. Toujours s'assurer que le compte démo existe
    seedDemo();
    // 4. Doter les anciens paiements d'un token de vérification (une fois)
    migrateVerifTokens();
    console.log(`\n🏢  Leasevora disponible sur http://localhost:${PORT}\n`);
});
