const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { load, save, nextId, scoped } = require('../store');
const { requireRole } = require('../middleware/auth');

// Déclarations de paiement faites par les locataires depuis leur portail.
// Traitement réservé PROPRIETAIRE + GESTIONNAIRE (pas AGENT : c'est un
// mécanisme de contrôle du terrain, il ne doit pas être contrôlable par le terrain).
const MGR = requireRole('PROPRIETAIRE', 'GESTIONNAIRE');

function enrich(d, data) {
    const loc = data.locataires.find(l => l.id === d.locataire_id) || {};
    const sejour = data.sejours.find(s => s.id === d.sejour_id) || {};
    const unit = data.units.find(u => u.id === sejour.unit_id) || {};
    const prop = data.properties.find(p => p.id === unit.property_id) || {};
    return {
        ...d,
        locataire_nom: [loc.prenom, loc.nom].filter(Boolean).join(' ') || '?',
        locataire_tel: loc.telephone || null,
        unit_label: unit.label || '?',
        property_name: prop.name || '?',
    };
}

// GET /api/declarations — toutes les déclarations, EN_ATTENTE d'abord
router.get('/', MGR, (req, res) => {
    const data = scoped(load(), req.orgId);
    const order = { EN_ATTENTE: 0, REJETEE: 1, VALIDEE: 2 };
    const list = (data.declarations || [])
        .slice()
        .sort((a, b) => (order[a.statut] ?? 3) - (order[b.statut] ?? 3) || (b.created_at || '').localeCompare(a.created_at || ''))
        .map(d => enrich(d, data));
    res.json({
        nb_en_attente: list.filter(d => d.statut === 'EN_ATTENTE').length,
        declarations: list,
    });
});

// POST /api/declarations/:id/valider — la déclaration devient une vraie
// transaction. verif_statut = CONFIRME d'office : c'est le locataire lui-même
// qui a déclaré ce montant, sa confirmation est acquise par construction.
router.post('/:id/valider', MGR, (req, res) => {
    const data = scoped(load(), req.orgId);
    const d = (data.declarations || []).find(x => x.id === Number(req.params.id));
    if (!d) return res.status(404).json({ error: 'Non trouvé' });
    if (d.statut !== 'EN_ATTENTE')
        return res.status(409).json({ error: `Déclaration déjà traitée (${d.statut}).` });

    const sejour = data.sejours.find(s => s.id === d.sejour_id);
    const unit = sejour ? data.units.find(u => u.id === sejour.unit_id) : null;

    const txn = {
        id: nextId(data, 'transactions'),
        date: d.date,
        description: 'Paiement déclaré par le locataire' + (d.commentaire ? ` — ${d.commentaire}` : ''),
        kind: 'IN',
        amount: d.montant,
        category_id: 1, // Loyer mensuel
        property_id: unit ? unit.property_id : null,
        unit_id: sejour ? sejour.unit_id : null,
        sejour_id: d.sejour_id,
        compte_id: 1,
        source: 'CAISSE',
        mode_paiement: d.mode_paiement || null,
        reference_paiement: d.reference_paiement || null,
        verif_token: crypto.randomBytes(16).toString('hex'),
        verif_statut: 'CONFIRME',
        verif_historique: [
            { action: 'DECLARE_PAR_LOCATAIRE', date: d.created_at },
            { action: 'CONFIRME', commentaire: 'Confirmation implicite : montant déclaré par le locataire lui-même', date: new Date().toISOString() },
            { action: 'VALIDE_PAR_GESTION', par: req.user?.login || '?', date: new Date().toISOString() },
        ],
        created_at: new Date().toISOString(),
    };
    data.transactions.push(txn);

    d.statut = 'VALIDEE';
    d.transaction_id = txn.id;
    d.historique = d.historique || [];
    d.historique.push({ action: 'VALIDEE', par: req.user?.login || '?', date: new Date().toISOString() });
    save(data);
    res.json({ declaration: enrich(d, data), transaction: txn });
});

// POST /api/declarations/:id/rejeter — motif OBLIGATOIRE, et la déclaration
// rejetée reste dans la liste : le propriétaire voit toujours qu'un locataire
// a affirmé avoir payé. Un gérant ne peut pas enterrer une déclaration.
router.post('/:id/rejeter', MGR, (req, res) => {
    const { motif } = req.body || {};
    if (!motif || !motif.toString().trim())
        return res.status(400).json({ error: 'Un motif de rejet est obligatoire — il sera visible du propriétaire et du locataire.' });

    const data = scoped(load(), req.orgId);
    const d = (data.declarations || []).find(x => x.id === Number(req.params.id));
    if (!d) return res.status(404).json({ error: 'Non trouvé' });
    if (d.statut !== 'EN_ATTENTE')
        return res.status(409).json({ error: `Déclaration déjà traitée (${d.statut}).` });

    d.statut = 'REJETEE';
    d.motif_rejet = motif.toString().slice(0, 500);
    d.historique = d.historique || [];
    d.historique.push({ action: 'REJETEE', motif: d.motif_rejet, par: req.user?.login || '?', date: new Date().toISOString() });
    save(data);
    res.json(enrich(d, data));
});

module.exports = router;
