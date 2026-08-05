const express = require('express');
const router = express.Router();
const { load, save, allOrgs } = require('../store');

// ── Vérification de paiement par le locataire ──────────────────────────────
// Route PUBLIQUE (pas d'auth) : le locataire reçoit un lien /v/<token> par
// WhatsApp/SMS et peut confirmer ou contester le montant déclaré par le gérant.
// Le token (32 hex, crypto.randomBytes) est la seule clé — non devinable.
//
// Principe : la fraude solitaire du gérant (encaisser 200 000, déclarer 150 000)
// devient impossible sans que le locataire, qui veut être crédité du vrai
// montant, la voie et la conteste.

// Anti-abus minimal : 30 requêtes / minute / IP (en mémoire, reset au redémarrage)
const hits = new Map();
function rateLimit(req, res, next) {
    const ip = req.ip || req.connection?.remoteAddress || '?';
    const now = Date.now();
    const rec = hits.get(ip) || { count: 0, start: now };
    if (now - rec.start > 60000) { rec.count = 0; rec.start = now; }
    rec.count++;
    hits.set(ip, rec);
    if (rec.count > 30) return res.status(429).json({ error: 'Trop de requêtes, réessayez dans une minute.' });
    next();
}

// Cherche le paiement dans TOUTES les entreprises (le token est la clé,
// il est globalement unique) et renvoie aussi le bucket de son entreprise
// pour résoudre séjour/appartement/locataire dans le bon espace.
function findByToken(data, token) {
    if (!token || typeof token !== 'string' || !/^[a-f0-9]{32}$/.test(token)) return null;
    for (const { org } of allOrgs(data)) {
        const t = (org.transactions || []).find(t => t.verif_token === token);
        if (t) return { t, org };
    }
    return null;
}

// GET /api/verif/:token — détails minimaux du paiement (pas d'IDs internes,
// pas de données du propriétaire, pas d'autres locataires)
router.get('/:token', rateLimit, (req, res) => {
    const data = load();
    const hit = findByToken(data, req.params.token);
    if (!hit) return res.status(404).json({ error: 'Lien invalide ou expiré.' });
    const { t, org } = hit;

    const sejour = org.sejours.find(s => s.id === t.sejour_id) || {};
    const unit = org.units.find(u => u.id === t.unit_id) || {};
    const prop = org.properties.find(p => p.id === unit.property_id) || {};
    const loc = sejour.locataire_id ? org.locataires.find(l => l.id === sejour.locataire_id) : null;

    res.json({
        montant: t.amount,
        date: t.date,
        mode_paiement: t.mode_paiement || null,
        reference_paiement: t.reference_paiement || null,
        description: t.description || null,
        propriete: prop.name || null,
        appartement: unit.label || null,
        locataire_prenom: loc ? (loc.prenom || loc.nom) : null,
        devise: org.settings?.currency || 'XOF',
        statut: t.verif_statut || 'EN_ATTENTE',
        repondu_le: (t.verif_historique || []).filter(h => h.action === 'CONFIRME' || h.action === 'CONTESTE').slice(-1)[0]?.date || null,
    });
});

// POST /api/verif/:token/repondre — { action: 'CONFIRMER'|'CONTESTER', commentaire? }
router.post('/:token/repondre', rateLimit, (req, res) => {
    const { action, commentaire } = req.body || {};
    if (!['CONFIRMER', 'CONTESTER'].includes(action))
        return res.status(400).json({ error: 'action doit être CONFIRMER ou CONTESTER' });

    const data = load();
    const hit = findByToken(data, req.params.token);
    if (!hit) return res.status(404).json({ error: 'Lien invalide ou expiré.' });
    const { t } = hit;

    const nouveau = action === 'CONFIRMER' ? 'CONFIRME' : 'CONTESTE';

    // Un paiement contesté ne peut pas être re-confirmé depuis le lien public :
    // seule une correction par le gérant (qui remet EN_ATTENTE) rouvre le cycle.
    // Évite qu'un gérant ayant accès au téléphone du locataire "efface" une contestation.
    if (t.verif_statut === 'CONTESTE' && nouveau === 'CONFIRME')
        return res.status(409).json({ error: 'Ce paiement a été contesté. Le gestionnaire doit corriger avant une nouvelle confirmation.' });

    t.verif_statut = nouveau;
    t.verif_historique = t.verif_historique || [];
    t.verif_historique.push({
        action: nouveau,
        commentaire: (commentaire || '').toString().slice(0, 500) || null,
        date: new Date().toISOString(),
    });
    save(data);
    res.json({ statut: t.verif_statut });
});

module.exports = router;
