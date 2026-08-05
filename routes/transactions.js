const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { load, save, nextId, scoped } = require('../store');
const { requireRole } = require('../middleware/auth');

// Modes de paiement acceptés (Togo : T-Money = Togocom/Yas, Flooz = Moov)
const MODES_PAIEMENT = ['ESPECES', 'TMONEY', 'FLOOZ', 'VIREMENT', 'CARTE', 'CHEQUE', 'AUTRE'];

// Transactions financières — PROPRIETAIRE, GESTIONNAIRE, AGENT
const MGR = requireRole('PROPRIETAIRE', 'GESTIONNAIRE', 'AGENT');

function enrich(t, data) {
    const cat = data.categories.find(c => c.id === t.category_id) || {};
    const prop = data.properties.find(p => p.id === t.property_id) || {};
    const unit = t.unit_id ? data.units.find(u => u.id === t.unit_id) : null;
    return {
        ...t,
        category_name: cat.name || '?',
        category_kind: cat.kind || '?',
        property_name: prop.name || '?',
        unit_label: unit ? unit.label : null,
    };
}

function monthOf(date) { return date ? date.slice(0, 7) : ''; }

router.get('/', MGR, (req, res) => {
    const { property_id, unit_id, month, source, sejour_id } = req.query;
    const data = scoped(load(), req.orgId);
    let txns = data.transactions;
    if (property_id) txns = txns.filter(t => t.property_id === Number(property_id));
    if (unit_id) txns = txns.filter(t => t.unit_id === Number(unit_id));
    if (month) txns = txns.filter(t => monthOf(t.date) === month);
    if (source) txns = txns.filter(t => t.source === source);
    if (sejour_id) txns = txns.filter(t => t.sejour_id === Number(sejour_id));
    txns = txns.sort((a, b) => b.date.localeCompare(a.date));
    res.json(txns.map(t => enrich(t, data)));
});

router.get('/:id', MGR, (req, res) => {
    const data = scoped(load(), req.orgId);
    const t = data.transactions.find(t => t.id === Number(req.params.id));
    if (!t) return res.status(404).json({ error: 'Non trouvé' });
    res.json(enrich(t, data));
});

router.post('/', MGR, (req, res) => {
    const { date, description, kind, amount, category_id, property_id, unit_id, source, sejour_id, compte_id, mode_paiement, reference_paiement } = req.body;
    if (!date || !kind || !amount)
        return res.status(400).json({ error: 'date, kind, amount requis' });
    if (isNaN(Date.parse(date)))
        return res.status(400).json({ error: 'Date invalide' });
    if (!['IN', 'OUT'].includes(kind))
        return res.status(400).json({ error: 'kind doit être IN ou OUT' });
    if (mode_paiement && !MODES_PAIEMENT.includes(mode_paiement))
        return res.status(400).json({ error: `Mode de paiement invalide. Valeurs : ${MODES_PAIEMENT.join(', ')}` });
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0)
        return res.status(400).json({ error: 'Le montant doit être un nombre positif' });
    const data = scoped(load(), req.orgId);

    // Auto-dériver property_id et unit_id depuis le séjour si non fournis
    let resolvedPropertyId = property_id ? Number(property_id) : null;
    let resolvedUnitId = unit_id ? Number(unit_id) : null;
    if (sejour_id) {
        const sej = data.sejours.find(s => s.id === Number(sejour_id));
        if (sej) {
            if (!resolvedUnitId) resolvedUnitId = sej.unit_id || null;
            if (!resolvedPropertyId && sej.unit_id) {
                const u = data.units.find(u => u.id === sej.unit_id);
                if (u) resolvedPropertyId = u.property_id || null;
            }
        }
    }
    // property_id obligatoire sauf si la transaction est liée à un séjour
    if (!resolvedPropertyId && !sejour_id)
        return res.status(400).json({ error: 'property_id requis (ou lier à un séjour)' });

    const txn = {
        id: nextId(data, 'transactions'),
        date,
        description: description || null,
        kind,
        amount: parsedAmount,
        category_id: category_id ? Number(category_id) : null,
        property_id: resolvedPropertyId,
        unit_id: resolvedUnitId,
        sejour_id: sejour_id ? Number(sejour_id) : null,
        compte_id: compte_id ? Number(compte_id) : (kind === 'IN' ? 1 : 1),
        source: (() => {
            if (source) return source;
            // Déduire depuis le compte (utiliser data déjà chargé)
            const c = (data.comptes || []).find(c => c.id === (compte_id ? Number(compte_id) : 1));
            return c?.type || 'CAISSE';
        })(),
        mode_paiement: mode_paiement || null,
        reference_paiement: reference_paiement || null,
        created_at: new Date().toISOString(),
    };
    // Vérification locataire : chaque paiement de loyer reçoit un lien public
    // que le locataire peut ouvrir pour confirmer ou contester le montant déclaré.
    if (txn.kind === 'IN' && txn.sejour_id) {
        txn.verif_token = crypto.randomBytes(16).toString('hex');
        txn.verif_statut = 'EN_ATTENTE';
        txn.verif_historique = [];
    }
    data.transactions.push(txn);
    save(data);
    res.status(201).json(enrich(txn, data));
});

router.put('/:id', MGR, (req, res) => {
    const { date, description, kind, amount, category_id, property_id, unit_id, source, sejour_id, compte_id, mode_paiement, reference_paiement } = req.body;
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0)
        return res.status(400).json({ error: 'Le montant doit être positif' });
    if (mode_paiement && !MODES_PAIEMENT.includes(mode_paiement))
        return res.status(400).json({ error: `Mode de paiement invalide. Valeurs : ${MODES_PAIEMENT.join(', ')}` });
    const data = scoped(load(), req.orgId);
    const idx = data.transactions.findIndex(t => t.id === Number(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'Non trouvé' });

    // Intégrité du cycle de vérification :
    // - montant modifié sur un paiement CONFIRMÉ → la confirmation ne vaut plus, retour EN_ATTENTE
    // - montant modifié sur un paiement CONTESTÉ → c'est la correction du gérant, le cycle
    //   se ROUVRE (EN_ATTENTE) et le locataire peut enfin confirmer le montant corrigé.
    //   Sans ça, toute contestation serait un cul-de-sac définitif (verif.js bloque la
    //   re-confirmation d'un paiement CONTESTE).
    const prev = data.transactions[idx];
    if (prev.verif_token && Number(amount) !== prev.amount &&
        (prev.verif_statut === 'CONFIRME' || prev.verif_statut === 'CONTESTE')) {
        const wasConteste = prev.verif_statut === 'CONTESTE';
        prev.verif_statut = 'EN_ATTENTE';
        prev.verif_historique = prev.verif_historique || [];
        prev.verif_historique.push({
            action: wasConteste ? 'MONTANT_CORRIGE_APRES_CONTESTATION' : 'MONTANT_MODIFIE_APRES_CONFIRMATION',
            ancien_montant: prev.amount,
            nouveau_montant: Number(amount),
            par: req.user?.login || '?',
            date: new Date().toISOString(),
        });
    }

    data.transactions[idx] = {
        ...data.transactions[idx],
        date, description: description || null, kind,
        amount: Number(amount),
        mode_paiement: mode_paiement !== undefined ? (mode_paiement || null) : (prev.mode_paiement || null),
        reference_paiement: reference_paiement !== undefined ? (reference_paiement || null) : (prev.reference_paiement || null),
        category_id: Number(category_id),
        property_id: Number(property_id),
        unit_id: unit_id ? Number(unit_id) : null,
        sejour_id: sejour_id ? Number(sejour_id) : (data.transactions[idx].sejour_id || null),
        compte_id: compte_id ? Number(compte_id) : (data.transactions[idx].compte_id || 1),
        source: (() => {
            if (source) return source;
            // Déduire depuis le compte (utiliser data déjà chargé)
            const c = (data.comptes || []).find(c => c.id === (compte_id ? Number(compte_id) : (data.transactions[idx].compte_id || 1)));
            return c?.type || data.transactions[idx].source || 'CAISSE';
        })(),
    };
    save(data);
    res.json(enrich(data.transactions[idx], data));
});

router.delete('/:id', MGR, (req, res) => {
    const data = scoped(load(), req.orgId);
    const t = data.transactions.find(t => t.id === Number(req.params.id));
    if (!t) return res.status(404).json({ error: 'Non trouvé' });
    // Anti-fraude : un paiement contesté par le locataire ne peut pas être supprimé —
    // sinon le gérant efface la contestation et recrée un paiement au montant de son choix.
    // Il doit corriger le montant (PUT), ce qui rouvre le cycle de vérification.
    if (t.verif_statut === 'CONTESTE')
        return res.status(403).json({ error: 'Ce paiement a été contesté par le locataire. Corrigez son montant plutôt que de le supprimer — la contestation doit être résolue, pas effacée.' });
    data.transactions = data.transactions.filter(x => x.id !== Number(req.params.id));
    save(data);
    res.json({ success: true });
});

module.exports = router;
