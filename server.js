try { require('dotenv').config(); } catch {}

const express = require('express');
const cors = require('cors');
const path = require('path');

require('./db');

const { seedAdmin, requireAuth } = require('./middleware/auth');
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

// All other /api routes require authentication
app.use('/api', requireAuth);
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
app.use('/api/search', require('./routes/search'));
app.use('/api/activite', require('./routes/activite').router);

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;

if (!process.env.JWT_SECRET) {
    console.warn('⚠️  JWT_SECRET non défini dans .env — utilisation de la clé par défaut (non sécurisé en production)');
}

const { syncFromSupabase } = require('./store');

app.listen(PORT, async () => {
    // 1. Restaurer les données depuis Supabase EN PREMIER
    await syncFromSupabase();
    // 2. Créer l'admin seulement si aucun utilisateur n'existe (après sync)
    seedAdmin();
    console.log(`\n🏢  Leasevora disponible sur http://localhost:${PORT}\n`);
});
