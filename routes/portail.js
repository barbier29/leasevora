const express = require('express');
const router = express.Router();
const { load } = require('../store');

// ── Portail locataire ──────────────────────────────────────────────────────
// Route PUBLIQUE : le locataire accède à son espace via un lien permanent
// /l/<portal_token> envoyé par WhatsApp. Pas de compte, pas de mot de passe —
// le token (32 hex) est la clé. Il voit UNIQUEMENT ses propres données :
// ses locations, ses paiements, ses reçus, son solde. Rien d'autre.

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

function computeTotal(s) {
    if (s.type_tarif === 'FORFAIT') return s.montant;
    if (!s.date_fin) return s.montant;
    const days = Math.max(0, Math.round((new Date(s.date_fin) - new Date(s.date_debut)) / 86400000));
    if (s.type_tarif === 'MENSUEL') return s.montant * Math.max(1, Math.round(days / 30));
    if (s.type_tarif === 'HEBDOMADAIRE') return s.montant * Math.max(1, Math.round(days / 7));
    return s.montant * Math.max(1, days);
}

// GET /api/portail/:token — l'espace du locataire
router.get('/:token', rateLimit, (req, res) => {
    const token = req.params.token;
    if (!token || !/^[a-f0-9]{32}$/.test(token))
        return res.status(404).json({ error: 'Lien invalide.' });

    const data = load();
    const loc = (data.locataires || []).find(l => l.portal_token === token);
    if (!loc) return res.status(404).json({ error: 'Lien invalide.' });

    const sejours = (data.sejours || [])
        .filter(s => s.locataire_id === loc.id)
        .map(s => {
            const unit = data.units.find(u => u.id === s.unit_id) || {};
            const prop = data.properties.find(p => p.id === unit.property_id) || {};
            const paiements = (data.transactions || [])
                .filter(t => t.sejour_id === s.id && t.kind === 'IN')
                .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
                .map(t => ({
                    date: t.date,
                    montant: t.amount,
                    mode_paiement: t.mode_paiement || null,
                    verif_statut: t.verif_statut || null,
                    verif_token: t.verif_token || null, // lien vers son propre reçu — pas une fuite
                }));
            const totalDu = s.montant_total_du || computeTotal(s);
            const totalPaye = paiements.reduce((sum, p) => sum + p.montant, 0);
            return {
                propriete: prop.name || '?',
                appartement: unit.label || '?',
                date_debut: s.date_debut,
                date_fin: s.date_fin || null,
                loyer_mensuel: (s.type_tarif === 'MENSUEL' || s.long_terme) ? s.montant : null,
                jour_paiement: s.jour_paiement || null,
                total_du: totalDu,
                total_paye: totalPaye,
                solde_restant: Math.max(0, totalDu - totalPaye),
                caution_montant: s.caution_montant || 0,
                caution_statut: s.caution_statut || 'AUCUNE',
                paiements,
            };
        });

    res.json({
        prenom: loc.prenom || null,
        nom: loc.nom,
        devise: data.settings?.currency || 'XOF',
        sejours,
    });
});

module.exports = router;
