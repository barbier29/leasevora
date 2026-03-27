const express = require('express');
const router = express.Router();
const { load } = require('../store');

router.get('/', (req, res) => {
  const now = new Date();
  const month = req.query.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const data = load();
  const isEmploye = req.user.role === 'EMPLOYE';

  // ── Taux d'occupation & travaux (tous les rôles) ──────────────────────────
  const totalUnits = data.units.length;
  const occupiedUnits = data.units.filter(u => u.status === 'OCCUPIED').length;
  const travauxOuverts = data.travaux.filter(t => ['A_FAIRE', 'EN_COURS'].includes(t.statut)).length;

  // ── Séjours en cours (tous les rôles) ─────────────────────────────────────
  const sejoursEnCours = data.sejours.filter(s => s.statut === 'EN_COURS').length;

  // Vue restreinte pour l'employé — pas de données financières
  if (isEmploye) {
    return res.json({
      month,
      role: 'EMPLOYE',
      tauxOccupation: totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0,
      totalUnits, occupiedUnits,
      travauxOuverts,
      sejoursEnCours,
    });
  }

  // ── Vue complète (PROPRIETAIRE + GESTIONNAIRE) ────────────────────────────
  const monthTxns = data.transactions.filter(t => t.date && t.date.slice(0, 7) === month);

  const totalIn = monthTxns.filter(t => t.kind === 'IN').reduce((s, t) => s + t.amount, 0);
  const totalOut = monthTxns.filter(t => t.kind === 'OUT').reduce((s, t) => s + t.amount, 0);

  const byCategory = data.categories.map(c => {
    const total = monthTxns.filter(t => t.category_id === c.id).reduce((s, t) => s + t.amount, 0);
    return { category: c.name, kind: c.kind, total };
  }).sort((a, b) => b.total - a.total);

  const byProperty = data.properties.map(p => {
    const pts = monthTxns.filter(t => t.property_id === p.id);
    const units = data.units.filter(u => u.property_id === p.id);
    return {
      id: p.id, name: p.name, type: p.type,
      total_in: pts.filter(t => t.kind === 'IN').reduce((s, t) => s + t.amount, 0),
      total_out: pts.filter(t => t.kind === 'OUT').reduce((s, t) => s + t.amount, 0),
      unit_count: units.length,
      occupied_count: units.filter(u => u.status === 'OCCUPIED').length,
    };
  }).sort((a, b) => a.name.localeCompare(b.name));

  const byUnit = data.units.map(u => {
    const prop = data.properties.find(p => p.id === u.property_id) || {};
    const uts = monthTxns.filter(t => t.unit_id === u.id);
    return {
      id: u.id, label: u.label, status: u.status,
      expected_rent: u.expected_rent,
      property_name: prop.name || '?',
      total_in: uts.filter(t => t.kind === 'IN').reduce((s, t) => s + t.amount, 0),
      total_out: uts.filter(t => t.kind === 'OUT').reduce((s, t) => s + t.amount, 0),
    };
  }).sort((a, b) => b.total_in - a.total_in);

  const loyerCatIds = data.categories
    .filter(c => c.kind === 'IN' && /loyer|rent/i.test(c.name))
    .map(c => c.id);

  const alertesLoyers = loyerCatIds.length === 0 ? [] : data.units
    .filter(u => u.status === 'OCCUPIED')
    .filter(u => {
      const sejour = data.sejours.find(s => s.unit_id === u.id && s.statut === 'EN_COURS');
      if (!sejour) return false;
      const hasLoyerStrict = monthTxns.some(t => t.unit_id === u.id && loyerCatIds.includes(t.category_id));
      return !hasLoyerStrict;
    })
    .map(u => {
      const prop = data.properties.find(p => p.id === u.property_id) || {};
      const sejour = data.sejours.find(s => s.unit_id === u.id && s.statut === 'EN_COURS');
      const loc = sejour?.locataire_id
        ? data.locataires.find(l => l.id === sejour.locataire_id)
        : null;
      return {
        unit_id: u.id, unit_label: u.label,
        property_name: prop.name || '?',
        expected_rent: u.expected_rent,
        locataire: loc ? `${loc.prenom || ''} ${loc.nom}`.trim() : (sejour?.locataire || null),
      };
    });

  const chart12 = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const mt = data.transactions.filter(t => t.date && t.date.slice(0, 7) === m);
    chart12.push({
      month: m,
      label: d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
      total_in: mt.filter(t => t.kind === 'IN').reduce((s, t) => s + t.amount, 0),
      total_out: mt.filter(t => t.kind === 'OUT').reduce((s, t) => s + t.amount, 0),
    });
  }

  res.json({
    month, totalIn, totalOut,
    netCashflow: totalIn - totalOut,
    byCategory, byProperty, byUnit,
    alertesLoyers, chart12,
    tauxOccupation: totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0,
    totalUnits, occupiedUnits,
    travauxOuverts, sejoursEnCours,
  });
});

module.exports = router;
