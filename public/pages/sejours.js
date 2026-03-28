async function renderSejoursPage(container) {
  const STATUTS = {
    A_VENIR: { label: 'À venir', cls: 'badge-building' },
    EN_COURS: { label: 'En cours', cls: 'badge-occupied' },
    TERMINE: { label: 'Terminé', cls: 'badge-vacant' },
    ANNULE: { label: 'Annulé', cls: 'badge-out' },
  };
  const TARIFS = { JOURNALIER: 'Journalier', MENSUEL: 'Mensuel', FORFAIT: 'Forfait période' };
  const PAIEMENT_STATUTS = {
    EN_ATTENTE: { label: 'Impayé', cls: 'badge-out' },
    PARTIEL:    { label: 'Partiel', cls: 'badge-building' },
    SOLDE:      { label: 'Soldé', cls: 'badge-occupied' },
  };
  const CAUTION_STATUTS = {
    AUCUNE:            { label: '—', cls: '' },
    EN_ATTENTE:        { label: 'Caution tenue', cls: 'badge-building' },
    RESTITUEE:         { label: 'Caution restituée', cls: 'badge-occupied' },
    UTILISEE_PARTIELLE:{ label: 'Caution partielle', cls: 'badge-standalone' },
    UTILISEE_TOTALE:   { label: 'Caution utilisée', cls: 'badge-out' },
  };

  async function load() {
    try {
      const [sejours, units, props, locs] = await Promise.all([
        api('/sejours'), api('/units'), api('/properties'), api('/locataires'),
      ]);
      render(sejours, units, props, locs);
    } catch (e) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${e.message}</p></div>`;
    }
  }

  function duree(s) {
    if (s.type_tarif === 'MENSUEL') {
      if (!s.date_fin) return '—';
      const mois = Math.max(1, Math.round((new Date(s.date_fin) - new Date(s.date_debut)) / (1000 * 60 * 60 * 24 * 30)));
      return `${mois} mois`;
    }
    const j = nbJours(s.date_debut, s.date_fin);
    return j !== null ? `${j} jour${j !== 1 ? 's' : ''}` : '—';
  }

  function totalSejour(s) {
    if (s.type_tarif === 'FORFAIT') return s.montant;
    if (s.type_tarif === 'MENSUEL') {
      if (!s.date_fin) return s.montant;
      const mois = Math.max(1, Math.round((new Date(s.date_fin) - new Date(s.date_debut)) / (1000 * 60 * 60 * 24 * 30)));
      return s.montant * mois;
    }
    const j = nbJours(s.date_debut, s.date_fin);
    return j !== null ? s.montant * j : s.montant;
  }

  function render(sejours, units, props, locs) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">Séjours</div>
          <div class="page-subtitle">${sejours.length} séjour${sejours.length !== 1 ? 's' : ''} · ${sejours.filter(s => s.statut === 'EN_COURS').length} en cours</div>
        </div>
        <button class="btn btn-primary" id="add-sejour-btn">+ Nouveau séjour</button>
      </div>
      <div class="card">
        <table>
          <thead><tr>
            <th>Locataire</th><th>Fiche</th><th>Appartement</th><th>Propriété</th><th>Type</th><th>Arrivée</th><th>Départ</th><th>Durée</th><th>Tarif</th><th>Total dû</th><th>Payé</th><th>Paiement</th><th>Caution</th><th>Statut</th><th></th>
          </tr></thead>
          <tbody>
            ${sejours.length ? sejours.map(s => {
      const st = STATUTS[s.statut] || { label: s.statut, cls: '' };
      const loc = locs.find(l => l.id === s.locataire_id);
      const paiSt = PAIEMENT_STATUTS[s.statut_paiement || 'EN_ATTENTE'];
      const cauSt = CAUTION_STATUTS[s.caution_statut] || CAUTION_STATUTS['AUCUNE'];
      return `<tr>
                <td><strong>${s.locataire}</strong>${s.notes ? `<br><small class="text-muted">${s.notes}</small>` : ''}</td>
                <td>${loc ? `<button class="btn btn-ghost btn-sm view-loc-sej" data-locid="${loc.id}">👤</button>` : '<span class="text-muted">—</span>'}</td>
                <td class="text-muted">${s.unit_label}</td>
                <td class="text-muted">${s.property_name}</td>
                <td><span class="badge badge-${s.type_tarif === 'JOURNALIER' ? 'standalone' : s.type_tarif === 'FORFAIT' ? 'vacant' : 'building'}">${TARIFS[s.type_tarif] || s.type_tarif}</span></td>
                <td class="text-muted">${fmtDate(s.date_debut)}</td>
                <td class="text-muted">${s.date_fin ? fmtDate(s.date_fin) : '—'}</td>
                <td class="text-muted">${duree(s)}</td>
                <td class="amount-in">${s.type_tarif === 'FORFAIT' ? `${fmtMoney(s.montant)} <span style="font-size:10px;font-weight:400;opacity:.6">total</span>` : `${fmtMoney(s.montant)}/${s.type_tarif === 'JOURNALIER' ? 'j' : 'mois'}`}</td>
                <td class="amount-in">${fmtMoney(s.montant_total_du || totalSejour(s))}</td>
                <td class="amount-in">${fmtMoney(s.montant_paye || 0)}</td>
                <td><span class="badge ${paiSt.cls}">${paiSt.label}${s.solde_restant > 0 ? `<br><small>${fmtMoney(s.solde_restant)} restant</small>` : ''}</span></td>
                <td><span class="badge ${cauSt.cls}">${s.caution_montant > 0 ? fmtMoney(s.caution_montant) + '<br>' : ''}${s.caution_montant > 0 ? cauSt.label : '—'}</span></td>
                <td><span class="badge ${st.cls}">${st.label}</span></td>
                <td style="text-align:right;white-space:nowrap">
                  <button class="btn btn-ghost btn-sm paiement-btn" data-id="${s.id}">💰</button>
                  <button class="btn btn-ghost btn-sm edit-sej-btn" data-id="${s.id}">Modifier</button>
                  <button class="btn btn-danger btn-sm del-sej-btn" data-id="${s.id}" data-name="${s.locataire}">✕</button>
                </td>
              </tr>`;
    }).join('')
        : '<tr><td colspan="15"><div class="empty-state"><div class="empty-icon">🛏️</div><p>Aucun séjour enregistré.</p></div></td></tr>'}
          </tbody>
        </table>
      </div>
    `;

    document.getElementById('add-sejour-btn').addEventListener('click', () => showForm(null, units, props, locs));
    container.querySelectorAll('.edit-sej-btn').forEach(btn =>
      btn.addEventListener('click', () => showForm(sejours.find(s => s.id == btn.dataset.id), units, props, locs)));
    container.querySelectorAll('.del-sej-btn').forEach(btn =>
      btn.addEventListener('click', async () => {
        if (!confirm(`Supprimer le séjour de "${btn.dataset.name}" ?`)) return;
        try { await api(`/sejours/${btn.dataset.id}`, { method: 'DELETE' }); toast('Séjour supprimé'); load(); }
        catch (e) { toast(e.message, 'error'); }
      }));
    container.querySelectorAll('.paiement-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const s = sejours.find(x => x.id == btn.dataset.id);
        if (s) openPaiementPanel(s);
      });
    });
    container.querySelectorAll('.view-loc-sej').forEach(btn =>
      btn.addEventListener('click', async () => {
        const l = await api(`/locataires/${btn.dataset.locid}`);
        openModal(`
          <div class="modal-title">👤 ${l.prenom ? l.prenom + ' ' : ''}${l.nom}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            ${[['📞', l.telephone || '—'], ['📧', l.email || '—'], ['💰 Caution', l.caution > 0 ? fmtMoney(l.caution) : '—'], ['📝 Notes', l.notes || '—']]
            .map(([k, v]) => `<div><div style="font-size:11px;color:var(--text-3)">${k}</div><div style="font-size:13px">${v}</div></div>`).join('')}
          </div>
          <div class="form-actions"><button class="btn btn-ghost" onclick="closeModal()">Fermer</button></div>
        `);
      }));
  }

  function showForm(sej = null, units = [], props = [], locs = []) {
    const isEdit = !!sej;
    const today = new Date().toISOString().slice(0, 10);

    const unitOptions = props.map(p => {
      const pUnits = units.filter(u => u.property_id === p.id);
      if (!pUnits.length) return '';
      return `<optgroup label="${p.name}">${pUnits.map(u =>
        `<option value="${u.id}" ${sej?.unit_id == u.id ? 'selected' : ''}>${u.label}</option>`
      ).join('')}</optgroup>`;
    }).join('');

    openModal(`
      <div class="modal-title">${isEdit ? 'Modifier le séjour' : 'Nouveau séjour'}</div>
      <form id="sej-form">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Nom affiché du locataire *</label>
            <input class="form-control" id="f-loc" value="${sej?.locataire || ''}" placeholder="ex. Jean Dupont" required />
          </div>
          <div class="form-group">
            <label class="form-label">Fiche locataire (optionnel)</label>
            <select class="form-control" id="f-locid">
              <option value="">— Aucune fiche liée —</option>
              ${locs.map(l => `<option value="${l.id}" ${sej?.locataire_id == l.id ? 'selected' : ''}>${l.prenom ? l.prenom + ' ' : ''}${l.nom}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Appartement *</label>
            <select class="form-control" id="f-unit" required>
              <option value="">Sélectionner…</option>${unitOptions}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Type de tarif *</label>
            <select class="form-control" id="f-tarif">
              <option value="MENSUEL" ${(!sej || sej?.type_tarif === 'MENSUEL') ? 'selected' : ''}>Mensuel</option>
              <option value="JOURNALIER" ${sej?.type_tarif === 'JOURNALIER' ? 'selected' : ''}>Journalier</option>
              <option value="FORFAIT" ${sej?.type_tarif === 'FORFAIT' ? 'selected' : ''}>Forfait période</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" id="f-montant-label">Montant *</label>
            <input class="form-control" id="f-montant" type="number" min="0" step="0.01" value="${sej?.montant || ''}" required />
          </div>
          <div class="form-group">
            <label class="form-label">Statut</label>
            <select class="form-control" id="f-statut">
              <option value="A_VENIR"  ${sej?.statut === 'A_VENIR' ? 'selected' : ''}>À venir</option>
              <option value="EN_COURS" ${sej?.statut === 'EN_COURS' ? 'selected' : ''}>En cours</option>
              <option value="TERMINE"  ${sej?.statut === 'TERMINE' ? 'selected' : ''}>Terminé</option>
              <option value="ANNULE"   ${sej?.statut === 'ANNULE' ? 'selected' : ''}>Annulé</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Date d'arrivée *</label>
            <input class="form-control" id="f-debut" type="date" value="${sej?.date_debut || today}" required />
          </div>
          <div class="form-group">
            <label class="form-label">Heure d'arrivée (check-in)</label>
            <input class="form-control" id="f-heure-entree" type="time" value="${sej?.heure_entree || ''}" placeholder="14:00" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Date de départ</label>
            <input class="form-control" id="f-fin" type="date" value="${sej?.date_fin || ''}" />
          </div>
          <div class="form-group">
            <label class="form-label">Heure de départ (check-out)</label>
            <input class="form-control" id="f-heure-sortie" type="time" value="${sej?.heure_sortie || ''}" placeholder="11:00" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Notes</label>
          <input class="form-control" id="f-notes" value="${sej?.notes || ''}" placeholder="Optionnel" />
        </div>
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border)">
          <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--text-3);margin-bottom:12px">CAUTION DE GARANTIE (optionnel)</div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Montant de la caution</label>
              <input class="form-control" id="f-caution" type="number" min="0" step="0.01" value="${sej?.caution_montant || 0}" placeholder="0" />
            </div>
            <div class="form-group">
              <label class="form-label">Date de perception</label>
              <input class="form-control" id="f-caution-date" type="date" value="${sej?.caution_date || ''}" />
            </div>
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" onclick="closeModal()">Annuler</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Enregistrer' : 'Créer le séjour'}</button>
        </div>
      </form>
    `);

    // Auto-fill name from fiche locataire
    document.getElementById('f-locid').addEventListener('change', e => {
      if (!e.target.value) return;
      const l = locs.find(l => l.id == e.target.value);
      if (l) document.getElementById('f-loc').value = `${l.prenom ? l.prenom + ' ' : ''}${l.nom}`;
    });

    // Dynamic label for montant based on tarif type
    const tarifSel = document.getElementById('f-tarif');
    const montantLbl = document.getElementById('f-montant-label');
    function updateMontantLabel() {
      const v = tarifSel.value;
      if (v === 'JOURNALIER') montantLbl.textContent = 'Tarif journalier *';
      else if (v === 'MENSUEL') montantLbl.textContent = 'Loyer mensuel *';
      else montantLbl.textContent = 'Montant total pour la période *';
    }
    tarifSel.addEventListener('change', updateMontantLabel);
    updateMontantLabel();

    document.getElementById('sej-form').addEventListener('submit', async e => {
      e.preventDefault();

      // Validation : date_fin >= date_debut
      const debutVal = document.getElementById('f-debut').value;
      const finVal = document.getElementById('f-fin').value;
      const finField = document.getElementById('f-fin');
      let errEl = finField.parentElement.querySelector('.form-error');
      if (!errEl) {
        errEl = document.createElement('div');
        errEl.className = 'form-error';
        finField.parentElement.appendChild(errEl);
      }
      if (finVal && debutVal && finVal < debutVal) {
        errEl.textContent = 'La date de départ doit être postérieure ou égale à la date d\'arrivée.';
        finField.focus();
        return;
      }
      errEl.textContent = '';

      const body = {
        unit_id: document.getElementById('f-unit').value,
        locataire: document.getElementById('f-loc').value.trim(),
        locataire_id: document.getElementById('f-locid').value ? parseInt(document.getElementById('f-locid').value) : null,
        date_debut: document.getElementById('f-debut').value,
        date_fin: document.getElementById('f-fin').value || null,
        heure_entree: document.getElementById('f-heure-entree').value || null,
        heure_sortie: document.getElementById('f-heure-sortie').value || null,
        type_tarif: document.getElementById('f-tarif').value,
        montant: parseFloat(document.getElementById('f-montant').value),
        statut: document.getElementById('f-statut').value,
        notes: document.getElementById('f-notes').value.trim() || null,
        caution_montant: parseFloat(document.getElementById('f-caution').value) || 0,
        caution_date: document.getElementById('f-caution-date').value || null,
      };
      try {
        if (isEdit) { await api(`/sejours/${sej.id}`, { method: 'PUT', body }); toast('Séjour modifié'); }
        else { await api('/sejours', { method: 'POST', body }); toast('Séjour créé'); }
        closeModal(); load();
      } catch (e) { toast(e.message, 'error'); }
    });
  }

  async function openPaiementPanel(s) {
    // Load full solde detail
    let solde;
    try {
      solde = await api(`/sejours/${s.id}/solde`);
    } catch (e) { toast(e.message, 'error'); return; }

    const netC = s.solde_restant > 0 ? 'var(--red)' : 'var(--green)';
    const cautionSection = solde.caution_montant > 0 ? `
        <div style="margin-top:18px;padding-top:18px;border-top:1px solid var(--border)">
            <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--text-3);margin-bottom:10px">CAUTION</div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
                <div>
                    <div style="font-size:14px;font-weight:600">${fmtMoney(solde.caution_montant)}</div>
                    <div style="font-size:11px;color:var(--text-3)">Statut : ${CAUTION_STATUTS[solde.caution_statut]?.label || solde.caution_statut}</div>
                    ${solde.caution_notes ? `<div style="font-size:11px;color:var(--text-3)">${solde.caution_notes}</div>` : ''}
                </div>
                ${['EN_ATTENTE', 'UTILISEE_PARTIELLE'].includes(solde.caution_statut) ? `
                <div style="display:flex;gap:8px;flex-wrap:wrap">
                    <button class="btn btn-ghost btn-sm" id="btn-caution-restituer">✅ Restituer</button>
                    <button class="btn btn-ghost btn-sm" id="btn-caution-utiliser">🔧 Utiliser pour réparations</button>
                </div>` : ''}
            </div>
            ${solde.caution_date_restitution ? `<div style="font-size:11px;color:var(--text-3)">Restituée le ${fmtDate(solde.caution_date_restitution)}</div>` : ''}
        </div>` : '';

    const paiementsHtml = solde.paiements.length ? `
        <table style="font-size:12px;margin-top:10px">
            <thead><tr><th>Date</th><th>Catégorie</th><th>Description</th><th style="text-align:right">Montant</th></tr></thead>
            <tbody>
            ${solde.paiements.map(p => `<tr>
                <td style="white-space:nowrap">${fmtDate(p.date)}</td>
                <td class="text-muted">${p.category_name}</td>
                <td class="text-muted">${p.description || '—'}</td>
                <td class="amount-in" style="text-align:right">${fmtMoney(p.amount)}</td>
            </tr>`).join('')}
            </tbody>
        </table>` : `<p style="font-size:12px;color:var(--text-3);font-style:italic;margin-top:8px">Aucun paiement enregistré.</p>`;

    openModal(`
        <div class="modal-header">
            <h3 class="modal-title">💰 Suivi des paiements — ${solde.locataire}</h3>
        </div>
        <div style="font-size:12px;color:var(--text-3);margin-bottom:16px">${solde.unit_label}</div>

        <!-- Bilan -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px">
            <div style="background:var(--bg-3);border-radius:var(--radius);padding:12px;text-align:center">
                <div style="font-size:16px;font-weight:700;color:var(--text-1)">${fmtMoney(solde.montant_total_du)}</div>
                <div style="font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:.5px;margin-top:2px">Total dû</div>
            </div>
            <div style="background:var(--bg-3);border-radius:var(--radius);padding:12px;text-align:center">
                <div style="font-size:16px;font-weight:700;color:var(--green)">${fmtMoney(solde.montant_paye)}</div>
                <div style="font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:.5px;margin-top:2px">Payé (${solde.nb_paiements || 0} paiem.)</div>
            </div>
            <div style="background:var(--bg-3);border-radius:var(--radius);padding:12px;text-align:center">
                <div style="font-size:16px;font-weight:700;color:${netC}">${fmtMoney(solde.solde_restant)}</div>
                <div style="font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:.5px;margin-top:2px">Solde restant</div>
            </div>
        </div>

        <!-- Historique paiements -->
        <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--text-3);margin-bottom:6px">HISTORIQUE DES PAIEMENTS</div>
        ${paiementsHtml}

        <!-- Caution section -->
        ${cautionSection}

        <div class="form-actions" style="margin-top:20px">
            <button class="btn btn-ghost" onclick="closeModal()">Fermer</button>
            ${solde.solde_restant > 0 ? `<button class="btn btn-primary" id="btn-add-paiement">💳 Enregistrer un paiement</button>` : ''}
        </div>
    `);

    // Bind caution actions
    document.getElementById('btn-caution-restituer')?.addEventListener('click', async () => {
      const today = new Date().toISOString().slice(0, 10);
      try {
        await api(`/sejours/${s.id}/caution`, {
          method: 'PATCH',
          body: { caution_statut: 'RESTITUEE', caution_date_restitution: today, caution_montant_utilise: 0 }
        });
        toast('Caution restituée ✓');
        closeModal();
        load();
      } catch (e) { toast(e.message, 'error'); }
    });

    document.getElementById('btn-caution-utiliser')?.addEventListener('click', () => {
      // Show a sub-form for damage amount + notes
      const montantCaution = solde.caution_montant;
      openModal(`
            <div class="modal-header"><h3 class="modal-title">🔧 Utiliser la caution pour réparations</h3></div>
            <form id="form-caution-use">
                <div class="form-group">
                    <label class="form-label">Montant retenu (max ${fmtMoney(montantCaution)})</label>
                    <input class="form-control" id="ci-montant" type="number" min="0.01" max="${montantCaution}" step="0.01" value="${montantCaution}" />
                </div>
                <div class="form-group">
                    <label class="form-label">Notes / description des dégâts</label>
                    <textarea class="form-control" id="ci-notes" rows="3" placeholder="Décrivez les dégâts constatés…"></textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-ghost" onclick="closeModal()">Annuler</button>
                    <button type="submit" class="btn btn-primary">Confirmer</button>
                </div>
            </form>
        `);
      document.getElementById('form-caution-use').addEventListener('submit', async (e) => {
        e.preventDefault();
        const montantUtilise = parseFloat(document.getElementById('ci-montant').value);
        const notes = document.getElementById('ci-notes').value.trim();
        const statut = montantUtilise >= montantCaution ? 'UTILISEE_TOTALE' : 'UTILISEE_PARTIELLE';
        try {
          await api(`/sejours/${s.id}/caution`, {
            method: 'PATCH',
            body: { caution_statut: statut, caution_montant_utilise: montantUtilise, caution_notes: notes || null }
          });
          toast('Caution mise à jour ✓');
          closeModal();
          load();
        } catch (e) { toast(e.message, 'error'); }
      });
    });

    // Bouton enregistrer un paiement depuis le panel
    document.getElementById('btn-add-paiement')?.addEventListener('click', () => {
      const today = new Date().toISOString().slice(0, 10);
      openModal(`
        <div class="modal-header"><h3 class="modal-title">💳 Enregistrer un paiement</h3></div>
        <div style="font-size:12px;color:var(--text-3);margin-bottom:16px">${solde.locataire} — ${solde.unit_label}</div>
        <form id="form-quick-pay">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Montant *</label>
              <input class="form-control" id="qp-amount" type="number" min="0.01" step="0.01" value="${solde.solde_restant}" required />
            </div>
            <div class="form-group">
              <label class="form-label">Date *</label>
              <input class="form-control" id="qp-date" type="date" value="${today}" required />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <input class="form-control" id="qp-desc" type="text" value="Paiement — ${solde.unit_label}" />
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-ghost" onclick="closeModal()">Annuler</button>
            <button type="submit" class="btn btn-primary" id="qp-submit">Enregistrer</button>
          </div>
        </form>
      `);
      document.getElementById('form-quick-pay').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('qp-submit');
        btn.disabled = true;
        try {
          await api('/transactions', {
            method: 'POST',
            body: {
              kind: 'IN',
              amount: parseFloat(document.getElementById('qp-amount').value),
              date: document.getElementById('qp-date').value,
              description: document.getElementById('qp-desc').value || null,
              sejour_id: s.id,
            },
          });
          toast('Paiement enregistré ✓');
          closeModal();
          load();
        } catch (err) { toast(err.message, 'error'); btn.disabled = false; }
      });
    });
  }

  await load();
}
