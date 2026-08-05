const express = require('express');
const router = express.Router();
const { load, save, nextId, allOrgs } = require('../store');

const MODES_PAIEMENT = ['ESPECES', 'TMONEY', 'FLOOZ', 'VIREMENT', 'CARTE', 'CHEQUE', 'AUTRE'];

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

// Cherche le locataire dans TOUTES les entreprises (le portal_token est
// globalement unique) et renvoie le bucket de son entreprise.
function findLocataireByToken(data, token) {
    for (const { org } of allOrgs(data)) {
        const loc = (org.locataires || []).find(l => l.portal_token === token);
        if (loc) return { loc, org };
    }
    return null;
}

// GET /api/portail/:token — l'espace du locataire
router.get('/:token', rateLimit, (req, res) => {
    const token = req.params.token;
    if (!token || !/^[a-f0-9]{32}$/.test(token))
        return res.status(404).json({ error: 'Lien invalide.' });

    const data = load();
    const hit = findLocataireByToken(data, token);
    if (!hit) return res.status(404).json({ error: 'Lien invalide.' });
    const { loc, org } = hit;

    const sejours = (org.sejours || [])
        .filter(s => s.locataire_id === loc.id)
        .map(s => {
            const unit = org.units.find(u => u.id === s.unit_id) || {};
            const prop = org.properties.find(p => p.id === unit.property_id) || {};
            const paiements = (org.transactions || [])
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
            // Déclarations du locataire pour ce séjour (paiements qu'il signale lui-même)
            const declarations = (org.declarations || [])
                .filter(dcl => dcl.sejour_id === s.id && dcl.locataire_id === loc.id)
                .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
                .map(dcl => ({
                    montant: dcl.montant, date: dcl.date,
                    mode_paiement: dcl.mode_paiement || null,
                    statut: dcl.statut, motif_rejet: dcl.motif_rejet || null,
                    created_at: dcl.created_at,
                }));
            return {
                sejour_id: s.id, // nécessaire pour déclarer un paiement — donnée du locataire lui-même
                propriete: prop.name || '?',
                appartement: unit.label || '?',
                declarations,
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
        devise: org.settings?.currency || 'XOF',
        sejours,
    });
});

// POST /api/portail/:token/declarer — le locataire signale un paiement que le
// gérant n'a pas enregistré. C'est la protection inverse de la vérification :
// le gérant ne peut pas « cacher » un paiement encaissé, car la déclaration
// remonte directement au propriétaire (et un rejet reste visible, avec motif).
router.post('/:token/declarer', rateLimit, (req, res) => {
    const token = req.params.token;
    if (!token || !/^[a-f0-9]{32}$/.test(token))
        return res.status(404).json({ error: 'Lien invalide.' });

    const data = load();
    const hit = findLocataireByToken(data, token);
    if (!hit) return res.status(404).json({ error: 'Lien invalide.' });
    const { loc, org } = hit;

    const { sejour_id, montant, date, mode_paiement, reference_paiement, commentaire } = req.body || {};

    // Le séjour doit exister ET appartenir à ce locataire — pas de déclaration
    // sur le logement de quelqu'un d'autre.
    const sejour = (org.sejours || []).find(s => s.id === Number(sejour_id) && s.locataire_id === loc.id);
    if (!sejour) return res.status(400).json({ error: 'Logement introuvable.' });

    const parsedMontant = parseFloat(montant);
    if (isNaN(parsedMontant) || parsedMontant <= 0 || parsedMontant > 100000000)
        return res.status(400).json({ error: 'Montant invalide.' });
    if (!date || isNaN(Date.parse(date)))
        return res.status(400).json({ error: 'Date invalide.' });
    if (new Date(date) > new Date(Date.now() + 86400000))
        return res.status(400).json({ error: 'La date ne peut pas être dans le futur.' });
    if (mode_paiement && !MODES_PAIEMENT.includes(mode_paiement))
        return res.status(400).json({ error: 'Mode de paiement invalide.' });

    // Anti-abus : maximum 10 déclarations en attente par locataire
    const pending = (org.declarations || []).filter(d => d.locataire_id === loc.id && d.statut === 'EN_ATTENTE');
    if (pending.length >= 10)
        return res.status(429).json({ error: 'Trop de déclarations en attente. Attendez leur traitement.' });

    const decl = {
        id: nextId(data, 'declarations'),
        locataire_id: loc.id,
        sejour_id: sejour.id,
        montant: parsedMontant,
        date,
        mode_paiement: mode_paiement || null,
        reference_paiement: (reference_paiement || '').toString().slice(0, 100) || null,
        commentaire: (commentaire || '').toString().slice(0, 500) || null,
        statut: 'EN_ATTENTE', // EN_ATTENTE → VALIDEE (devient une vraie transaction) | REJETEE (motif conservé)
        motif_rejet: null,
        transaction_id: null,
        created_at: new Date().toISOString(),
        historique: [{ action: 'DECLARE_PAR_LOCATAIRE', date: new Date().toISOString() }],
    };
    org.declarations = org.declarations || [];
    org.declarations.push(decl);
    save(data);
    res.status(201).json({ statut: decl.statut });
});

module.exports = router;
