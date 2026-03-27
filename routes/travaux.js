const express = require('express');
const router = express.Router();
const { load, save, nextId } = require('../store');
const { requireRole, requireAuth } = require('../middleware/auth');

const MGR = requireRole('PROPRIETAIRE', 'GESTIONNAIRE');

function enrich(t, data) {
    const prop = data.properties.find(p => p.id === t.property_id) || {};
    const unit = t.unit_id ? data.units.find(u => u.id === t.unit_id) : null;
    const txn = t.transaction_id ? data.transactions.find(tx => tx.id === t.transaction_id) : null;
    return {
        ...t,
        property_name: prop.name || '?',
        unit_label: unit ? unit.label : null,
        montant_txn: txn ? txn.amount : null,
    };
}

// GET — tous les rôles
router.get('/', requireAuth, (req, res) => {
    const { property_id, statut, type_travail } = req.query;
    const data = load();
    let list = data.travaux;
    if (property_id) list = list.filter(t => t.property_id === Number(property_id));
    if (statut) list = list.filter(t => t.statut === statut);
    if (type_travail) list = list.filter(t => t.type_travail === type_travail);
    list = list.sort((a, b) => {
        const p = { HAUTE: 0, MOYENNE: 1, BASSE: 2 };
        return (p[a.priorite] ?? 1) - (p[b.priorite] ?? 1) || b.date.localeCompare(a.date);
    });
    res.json(list.map(t => enrich(t, data)));
});

// GET single — tous les rôles
router.get('/:id', requireAuth, (req, res) => {
    const data = load();
    const t = data.travaux.find(t => t.id === Number(req.params.id));
    if (!t) return res.status(404).json({ error: 'Non trouvé' });
    res.json(enrich(t, data));
});

// POST create — tous les rôles (l'employé peut signaler un travail)
router.post('/', (req, res) => {
    const {
        property_id, unit_id, titre, description, date, statut, priorite, type_travail,
        prestataire, contact_prestataire, montant_devis, montant_facture, transaction_id,
        date_fin_prevue, garantie_mois,
    } = req.body;
    if (!property_id || !titre) return res.status(400).json({ error: 'property_id et titre requis' });
    const parsedDevis = parseFloat(montant_devis);
    if (!isNaN(parsedDevis) && parsedDevis <= 0)
        return res.status(400).json({ error: 'Le montant doit être positif' });
    const parsedFacture = parseFloat(montant_facture);
    if (!isNaN(parsedFacture) && parsedFacture <= 0)
        return res.status(400).json({ error: 'Le montant doit être positif' });
    const data = load();
    const t = {
        id: nextId(data, 'travaux'),
        property_id: Number(property_id),
        unit_id: unit_id ? Number(unit_id) : null,
        titre,
        description: description || null,
        date: date || new Date().toISOString().slice(0, 10),
        statut: statut || 'A_FAIRE',
        priorite: priorite || 'MOYENNE',
        type_travail: type_travail || 'REPARATION',
        prestataire: prestataire || null,
        contact_prestataire: contact_prestataire || null,
        montant_devis: montant_devis != null && montant_devis !== '' ? Number(montant_devis) : null,
        montant_facture: montant_facture != null && montant_facture !== '' ? Number(montant_facture) : null,
        transaction_id: transaction_id ? Number(transaction_id) : null,
        date_fin_prevue: date_fin_prevue || null,
        date_fin_reelle: null,
        garantie_mois: garantie_mois ? Number(garantie_mois) : null,
        historique: [],
        created_at: new Date().toISOString(),
    };
    data.travaux.push(t);
    save(data);
    res.status(201).json(enrich(t, data));
});

// PUT update — tous les rôles (l'employé peut mettre à jour le statut)
router.put('/:id', (req, res) => {
    const {
        property_id, unit_id, titre, description, date, statut, priorite, type_travail,
        prestataire, contact_prestataire, montant_devis, montant_facture, transaction_id,
        date_fin_prevue, garantie_mois,
    } = req.body;
    const parsedDevis = parseFloat(montant_devis);
    if (!isNaN(parsedDevis) && parsedDevis <= 0)
        return res.status(400).json({ error: 'Le montant doit être positif' });
    const parsedFacture = parseFloat(montant_facture);
    if (!isNaN(parsedFacture) && parsedFacture <= 0)
        return res.status(400).json({ error: 'Le montant doit être positif' });
    const data = load();
    const idx = data.travaux.findIndex(t => t.id === Number(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'Non trouvé' });
    const prev = data.travaux[idx];

    // Si le statut change, on ajoute une entrée dans l'historique
    const historique = [...(prev.historique || [])];
    if (statut && statut !== prev.statut) {
        historique.push({
            statut_avant: prev.statut,
            statut_apres: statut,
            date: new Date().toISOString(),
            note: null,
            utilisateur: req.user?.login || null,
        });
    }

    data.travaux[idx] = {
        ...prev,
        property_id: Number(property_id),
        unit_id: unit_id ? Number(unit_id) : null,
        titre,
        description: description || null,
        date,
        statut,
        priorite,
        type_travail: type_travail || prev.type_travail || 'REPARATION',
        prestataire: prestataire || null,
        contact_prestataire: contact_prestataire || null,
        montant_devis: montant_devis != null && montant_devis !== '' ? Number(montant_devis) : null,
        montant_facture: montant_facture != null && montant_facture !== '' ? Number(montant_facture) : null,
        transaction_id: transaction_id ? Number(transaction_id) : null,
        date_fin_prevue: date_fin_prevue || null,
        garantie_mois: garantie_mois ? Number(garantie_mois) : null,
        historique,
        date_fin_reelle: statut === 'TERMINE' && !prev.date_fin_reelle
            ? new Date().toISOString().slice(0, 10)
            : prev.date_fin_reelle,
    };
    save(data);
    res.json(enrich(data.travaux[idx], data));
});

// PATCH /:id/statut — avancement rapide du statut (tous les rôles)
const STATUTS_VALIDES = ['A_FAIRE', 'PRESTATAIRE_CONTACTE', 'DEVIS_RECU', 'EN_COURS', 'TERMINE', 'ANNULE'];

router.patch('/:id/statut', (req, res) => {
    const { statut, note } = req.body;
    if (!statut) return res.status(400).json({ error: 'statut requis' });
    if (!STATUTS_VALIDES.includes(statut))
        return res.status(400).json({ error: `Statut invalide. Valeurs acceptées : ${STATUTS_VALIDES.join(', ')}` });
    const data = load();
    const idx = data.travaux.findIndex(t => t.id === Number(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'Non trouvé' });
    const prev = data.travaux[idx];
    const historique = [...(prev.historique || [])];
    historique.push({
        statut_avant: prev.statut,
        statut_apres: statut,
        date: new Date().toISOString(),
        note: note || null,
        utilisateur: req.user?.login || null,
    });
    data.travaux[idx] = {
        ...prev,
        statut,
        historique,
        date_fin_reelle: statut === 'TERMINE' && !prev.date_fin_reelle
            ? new Date().toISOString().slice(0, 10)
            : prev.date_fin_reelle,
    };
    save(data);
    res.json(enrich(data.travaux[idx], data));
});

// DELETE — PROPRIETAIRE + GESTIONNAIRE seulement
router.delete('/:id', MGR, (req, res) => {
    const data = load();
    data.travaux = data.travaux.filter(t => t.id !== Number(req.params.id));
    save(data);
    res.json({ success: true });
});

module.exports = router;
