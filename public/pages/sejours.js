async function renderSejoursPage(container) {
  const STATUTS = {
    A_VENIR: { label: 'À venir', cls: 'badge-building' },
    EN_COURS: { label: 'En cours', cls: 'badge-occupied' },
    TERMINE: { label: 'Terminé', cls: 'badge-vacant' },
    ANNULE: { label: 'Annulé', cls: 'badge-out' },
    LONG_TERME: { label: 'Long terme', cls: 'badge-longterme' },
  };
  const TARIFS = { JOURNALIER: 'Journalier', MENSUEL: 'Mensuel', FORFAIT: 'Forfait période' };
  const PAIEMENT_STATUTS = {
    EN_ATTENTE: { label: 'Impayé', cls: 'badge-out' },
    PARTIEL:    { label: 'Partiel', cls: 'badge-building' },
    SOLDE:      { label: 'Soldé', cls: 'badge-occupied' },
  };
  const CAUTION_STATUTS = {
    AUCUNE:            { label: '—', cls: '' },
    EN_ATTENTE:        { label: 'En attente', cls: 'badge-building' },
    PAYEE:             { label: 'Caution payée', cls: 'badge-occupied' },
    RESTITUEE:         { label: 'Restituée', cls: 'badge-vacant' },
    UTILISEE_PARTIELLE:{ label: 'Retenue partielle', cls: 'badge-standalone' },
    UTILISEE_TOTALE:   { label: 'Retenue totale', cls: 'badge-out' },
  };

  async function load() {
    try {
      const [sejours, units, props, locs, cautionsData] = await Promise.all([
        api('/sejours'), api('/units'), api('/properties'), api('/locataires'),
        api('/sejours/cautions').catch(() => null),
      ]);
      render(sejours, units, props, locs, cautionsData);
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

  function render(sejours, units, props, locs, cautionsData) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">Séjours</div>
          <div class="page-subtitle">${sejours.length} séjour${sejours.length !== 1 ? 's' : ''} · ${sejours.filter(s => s.statut === 'EN_COURS').length} en cours</div>
        </div>
        <button class="btn btn-primary" id="add-sejour-btn">+ Nouveau séjour</button>
      </div>
      ${cautionsData ? `
      <div class="card" style="margin-bottom:16px;padding:16px">
        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
          <div style="font-size:13px;font-weight:700">Cautions</div>
          <div style="display:flex;gap:20px;flex-wrap:wrap;font-size:12px">
            <div><span style="color:var(--text-3)">Total :</span> <strong>${fmtMoney(cautionsData.summary.total_montant)}</strong> <span class="text-muted">(${cautionsData.summary.total_cautions})</span></div>
            ${cautionsData.summary.en_attente > 0 ? `<div><span class="badge badge-building">En attente : ${cautionsData.summary.en_attente}</span></div>` : ''}
            ${cautionsData.summary.payees > 0 ? `<div><span class="badge badge-occupied">Payées : ${cautionsData.summary.payees}</span></div>` : ''}
            ${cautionsData.summary.a_restituer > 0 ? `<div><span class="badge badge-out">À restituer : ${cautionsData.summary.a_restituer}</span></div>` : ''}
            ${cautionsData.summary.restituees > 0 ? `<div><span class="badge badge-vacant">Restituées : ${cautionsData.summary.restituees}</span></div>` : ''}
            ${cautionsData.summary.retenues > 0 ? `<div><span class="badge badge-standalone">Retenues : ${cautionsData.summary.retenues}</span></div>` : ''}
          </div>
        </div>
      </div>` : ''}
      <div class="card">
        <table>
          <thead><tr>
            <th>Locataire</th>
            <th>Bien</th>
            <th>Période</th>
            <th>Tarif</th>
            <th>Total dû</th>
            <th>Paiement</th>
            <th>Statut</th>
            <th>Caution</th>
            <th></th>
          </tr></thead>
          <tbody>
            ${sejours.length ? sejours.map(s => {
      const st = STATUTS[s.statut] || { label: s.statut, cls: '' };
      const loc = locs.find(l => l.id === s.locataire_id);
      const paiSt = PAIEMENT_STATUTS[s.statut_paiement || 'EN_ATTENTE'];
      const cauSt = CAUTION_STATUTS[s.caution_statut] || CAUTION_STATUTS['AUCUNE'];
      return `<tr class="sej-row" data-id="${s.id}" style="cursor:pointer${s.statut === 'LONG_TERME' ? ';border-left:3px solid var(--accent)' : ''}">
                <td>
                  <strong>${s.locataire}</strong>
                  ${loc ? `<div style="font-size:11px;color:var(--text-3)">${loc.prenom ? loc.prenom + ' ' : ''}${loc.nom}${loc.telephone ? ' · ' + loc.telephone : ''}</div>` : ''}
                </td>
                <td class="text-muted" style="font-size:12px">
                  ${s.unit_label}<br><span style="font-size:11px">${s.property_name}</span>
                </td>
                <td class="text-muted" style="font-size:12px;white-space:nowrap">
                  ${fmtDate(s.date_debut)}<br>${s.date_fin ? fmtDate(s.date_fin) : '—'}
                </td>
                <td><span class="badge badge-${s.type_tarif === 'JOURNALIER' ? 'standalone' : s.type_tarif === 'FORFAIT' ? 'vacant' : 'building'}">${TARIFS[s.type_tarif] || s.type_tarif}</span></td>
                <td style="white-space:nowrap">
                  <div class="amount-in">${fmtMoney(s.montant_total_du || totalSejour(s))}</div>
                  <div style="font-size:11px;color:var(--text-3)">${duree(s)}</div>
                </td>
                <td>
                  <span class="badge ${paiSt.cls}">${paiSt.label}</span>
                  ${(s.solde_restant || 0) > 0 ? `<div style="font-size:11px;color:var(--red);margin-top:2px">${fmtMoney(s.solde_restant)} restant</div>` : ''}
                </td>
                <td><span class="badge ${st.cls}">${st.label}</span></td>
                <td>
                  ${s.caution_montant > 0 ? `
                    <div style="font-size:12px;font-weight:600">${fmtMoney(s.caution_montant)}</div>
                    <span class="badge ${cauSt.cls}" style="font-size:10px">${cauSt.label}</span>
                  ` : '<span class="text-muted" style="font-size:11px">—</span>'}
                </td>
                <td style="text-align:right;white-space:nowrap">
                  <button class="btn btn-danger btn-sm del-sej-btn" data-id="${s.id}" data-name="${s.locataire}">✕</button>
                </td>
              </tr>`;
    }).join('')
        : '<tr><td colspan="9"><div class="empty-state"><div class="empty-icon">🛏️</div><p>Aucun séjour enregistré.</p></div></td></tr>'}
          </tbody>
        </table>
      </div>
    `;

    document.getElementById('add-sejour-btn').addEventListener('click', () => showForm(null, units, props, locs));
    container.querySelectorAll('.del-sej-btn').forEach(btn =>
      btn.addEventListener('click', async () => {
        if (!confirm(`Supprimer le séjour de "${btn.dataset.name}" ?`)) return;
        try { await api(`/sejours/${btn.dataset.id}`, { method: 'DELETE' }); toast('Séjour supprimé'); load(); }
        catch (e) { toast(e.message, 'error'); }
      }));
    container.querySelectorAll('.sej-row').forEach(row => {
      row.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        const s = sejours.find(x => x.id == row.dataset.id);
        if (s) openSejourDetail(s, units, locs, () => load());
      });
    });
  }

  async function openSejourDetail(s, units, locs, onRefresh) {
    const loc = locs.find(l => l.id === s.locataire_id);
    const paiSt = PAIEMENT_STATUTS[s.statut_paiement || 'EN_ATTENTE'];
    const soldeRestant = s.solde_restant || 0;
    const totalDu = s.montant_total_du || 0;
    const montantPaye = s.montant_paye || 0;

    openModal(`
      <div class="modal-title">🛏️ ${s.locataire}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
        <div><div style="font-size:11px;color:var(--text-3)">Appartement</div><strong>${s.unit_label}</strong></div>
        <div><div style="font-size:11px;color:var(--text-3)">Propriété</div><span>${s.property_name}</span></div>
        <div><div style="font-size:11px;color:var(--text-3)">Arrivée</div><span>${fmtDate(s.date_debut)}${s.heure_entree ? ' ' + s.heure_entree : ''}</span></div>
        <div><div style="font-size:11px;color:var(--text-3)">Départ</div><span>${s.date_fin ? fmtDate(s.date_fin) + (s.heure_sortie ? ' ' + s.heure_sortie : '') : '—'}</span></div>
      </div>

      <!-- Bloc paiement -->
      <div style="background:var(--bg-2);border-radius:8px;padding:14px;margin-bottom:16px;border:1px solid var(--border)">
        <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--text-3);margin-bottom:12px">PAIEMENT</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">
          <div style="text-align:center">
            <div style="font-size:11px;color:var(--text-3)">Total dû</div>
            <div style="font-size:16px;font-weight:700">${fmtMoney(totalDu)}</div>
          </div>
          <div style="text-align:center">
            <div style="font-size:11px;color:var(--text-3)">Payé</div>
            <div style="font-size:16px;font-weight:700;color:var(--green)">${fmtMoney(montantPaye)}</div>
          </div>
          <div style="text-align:center">
            <div style="font-size:11px;color:var(--text-3)">Solde restant</div>
            <div style="font-size:16px;font-weight:700;color:${soldeRestant > 0 ? 'var(--red)' : 'var(--green)'}">${fmtMoney(soldeRestant)}</div>
          </div>
        </div>
        <div style="margin-bottom:10px"><span class="badge ${paiSt.cls}">${paiSt.label}</span></div>

        ${soldeRestant > 0 ? `
        <div style="border-top:1px solid var(--border);padding-top:12px">
          <div style="font-size:12px;font-weight:600;margin-bottom:10px">Enregistrer un paiement</div>
          <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap">
            <div style="flex:1;min-width:100px">
              <label style="font-size:11px;color:var(--text-3);display:block;margin-bottom:4px">Montant</label>
              <input class="form-control" id="pay-amount" type="number" min="0" step="0.01" value="${soldeRestant}" style="height:36px" />
            </div>
            <div style="flex:1;min-width:100px">
              <label style="font-size:11px;color:var(--text-3);display:block;margin-bottom:4px">Date</label>
              <input class="form-control" id="pay-date" type="date" value="${new Date().toISOString().slice(0,10)}" style="height:36px" />
            </div>
            <div style="flex:1;min-width:100px">
              <label style="font-size:11px;color:var(--text-3);display:block;margin-bottom:4px">Compte</label>
              <select class="form-control" id="pay-compte" style="height:36px;font-size:13px">
                <!-- rempli dynamiquement -->
              </select>
            </div>
            <button class="btn btn-primary" id="pay-btn" style="height:36px;white-space:nowrap">💰 Encaisser</button>
          </div>
        </div>` : `<div style="color:var(--green);font-size:13px;font-weight:600;padding-top:4px">✓ Séjour intégralement soldé</div>`}
      </div>

      <!-- Bloc caution -->
      ${s.caution_montant > 0 ? `
      <div style="background:var(--bg-2);border-radius:8px;padding:14px;margin-bottom:16px;border:1px solid var(--border)">
        <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--text-3);margin-bottom:12px">CAUTION DE GARANTIE</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">
          <div style="text-align:center">
            <div style="font-size:11px;color:var(--text-3)">Montant</div>
            <div style="font-size:16px;font-weight:700">${fmtMoney(s.caution_montant)}</div>
          </div>
          <div style="text-align:center">
            <div style="font-size:11px;color:var(--text-3)">Statut</div>
            <div><span class="badge ${(CAUTION_STATUTS[s.caution_statut] || CAUTION_STATUTS['AUCUNE']).cls}">${(CAUTION_STATUTS[s.caution_statut] || CAUTION_STATUTS['AUCUNE']).label}</span></div>
          </div>
          <div style="text-align:center">
            <div style="font-size:11px;color:var(--text-3)">Retenu</div>
            <div style="font-size:16px;font-weight:700;color:${(s.caution_montant_utilise || 0) > 0 ? 'var(--red)' : 'var(--text-3)'}">${fmtMoney(s.caution_montant_utilise || 0)}</div>
          </div>
        </div>
        ${s.caution_date ? `<div style="font-size:11px;color:var(--text-3);margin-bottom:8px">Perçue le ${fmtDate(s.caution_date)}</div>` : ''}
        ${s.caution_date_restitution ? `<div style="font-size:11px;color:var(--green);margin-bottom:8px">Restituée le ${fmtDate(s.caution_date_restitution)}</div>` : ''}
        ${s.caution_notes ? `<div style="font-size:12px;color:var(--text-2);margin-bottom:8px;padding:8px;background:var(--bg-3);border-radius:4px">${s.caution_notes}</div>` : ''}
        ${['EN_ATTENTE', 'PAYEE', 'UTILISEE_PARTIELLE'].includes(s.caution_statut) ? `
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">
          ${s.caution_statut === 'EN_ATTENTE' ? `<button class="btn btn-primary btn-sm" id="btn-caution-payee">✓ Marquer comme payée</button>` : ''}
          ${['PAYEE', 'UTILISEE_PARTIELLE'].includes(s.caution_statut) ? `<button class="btn btn-ghost btn-sm" id="btn-caution-restituer-det" style="color:var(--green)">✅ Restituer</button>` : ''}
          ${['PAYEE', 'EN_ATTENTE'].includes(s.caution_statut) ? `<button class="btn btn-ghost btn-sm" id="btn-caution-utiliser-det" style="color:var(--red)">🔧 Retenir pour dégâts</button>` : ''}
        </div>` : ''}
      </div>` : ''}

      <!-- Bloc échéancier long terme -->
      ${s.statut === 'LONG_TERME' || s.long_terme ? `
      <div id="echeancier-container" style="background:var(--bg-2);border-radius:8px;padding:14px;margin-bottom:16px;border:1px solid var(--accent);border-left:3px solid var(--accent)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--accent)">CONTRAT LONG TERME</div>
          <button class="btn btn-danger btn-sm" id="btn-resilier" style="font-size:11px">Résilier le contrat</button>
        </div>
        <div id="echeancier-content" style="color:var(--text-3);font-size:12px">Chargement de l'échéancier…</div>
      </div>` : ''}

      ${loc ? `<div style="padding:10px;background:var(--bg-2);border-radius:6px;margin-bottom:16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap">
        <span>👤 <strong>${loc.prenom ? loc.prenom + ' ' : ''}${loc.nom}</strong></span>
        ${loc.telephone ? `<span class="text-muted">${loc.telephone}</span>` : ''}
        ${loc.email ? `<span class="text-muted">${loc.email}</span>` : ''}
      </div>` : ''}

      <div class="form-actions">
        <button class="btn btn-danger btn-sm" id="del-sej-det">🗑</button>
        ${s.statut === 'TERMINE' ? `<button class="btn btn-ghost btn-sm" id="renouveler-sej-det">🔄 Renouveler</button>` : ''}
        <button class="btn btn-ghost btn-sm" id="print-facture-btn">📄 Facture</button>
        <button class="btn btn-ghost btn-sm" id="print-quittance-btn">🖨️ Quittance</button>
        <button class="btn btn-ghost" onclick="closeModal()">Fermer</button>
        <button class="btn btn-ghost" id="edit-sej-det">✏️ Modifier</button>
      </div>
    `);

    // Charger les comptes pour le sélecteur
    try {
      const comptes = await api('/comptes');
      const sel = document.getElementById('pay-compte');
      if (sel) {
        comptes.filter(c => c.actif).forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.id;
          opt.textContent = `${c.type === 'CAISSE' ? '🏦' : '🏛️'} ${c.nom}`;
          sel.appendChild(opt);
        });
      }
    } catch {}

    document.getElementById('edit-sej-det').addEventListener('click', () => {
      closeModal();
      showForm(s, units, [], locs);
    });

    document.getElementById('del-sej-det').addEventListener('click', async () => {
      if (!confirm(`Supprimer ce séjour ?`)) return;
      try { await api(`/sejours/${s.id}`, { method: 'DELETE' }); toast('Séjour supprimé'); closeModal(); onRefresh(); }
      catch (e) { toast(e.message, 'error'); }
    });

    document.getElementById('print-quittance-btn')?.addEventListener('click', () => {
      window.printQuittance(s.id);
    });

    document.getElementById('print-facture-btn')?.addEventListener('click', () => {
      window.printFacture(s.id);
    });

    document.getElementById('renouveler-sej-det')?.addEventListener('click', async () => {
      try {
        const data = await api(`/sejours/${s.id}/renouveler`, { method: 'POST' });
        closeModal();
        // pré-remplir le formulaire de création avec les données du séjour précédent
        const fakeNew = { ...data, id: null };
        showForm(fakeNew, units, [], locs);
      } catch (e) { toast(e.message, 'error'); }
    });

    const payBtn = document.getElementById('pay-btn');
    if (payBtn) {
      payBtn.addEventListener('click', async () => {
        const amount = parseFloat(document.getElementById('pay-amount').value);
        const date = document.getElementById('pay-date').value;
        if (!amount || amount <= 0) return toast('Montant invalide', 'error');
        const unit = units.find(u => u.id === s.unit_id) || {};
        try {
          await api('/transactions', { method: 'POST', body: {
            date,
            description: `Loyer — ${s.locataire}`,
            kind: 'IN',
            amount,
            property_id: unit.property_id || null,
            unit_id: s.unit_id || null,
            sejour_id: s.id,
            compte_id: parseInt(document.getElementById('pay-compte')?.value) || 1,
          }});
          toast('Paiement enregistré');
          if (confirm('Émettre la quittance de loyer ?')) {
              await window.printQuittance(s.id);
          }
          closeModal();
          onRefresh();
        } catch (e) { toast(e.message, 'error'); }
      });
    }

    // Caution action handlers
    document.getElementById('btn-caution-payee')?.addEventListener('click', async () => {
        try {
            await api(`/sejours/${s.id}/caution`, {
                method: 'PATCH',
                body: { caution_statut: 'PAYEE' }
            });
            toast('Caution marquée comme payée');
            closeModal();
            onRefresh();
        } catch (e) { toast(e.message, 'error'); }
    });

    document.getElementById('btn-caution-restituer-det')?.addEventListener('click', async () => {
        const today = new Date().toISOString().slice(0, 10);
        const montantUtilise = s.caution_montant_utilise || 0;
        const montantRestitue = s.caution_montant - montantUtilise;
        if (!confirm(`Restituer ${fmtMoney(montantRestitue)} au locataire ?`)) return;
        try {
            await api(`/sejours/${s.id}/caution`, {
                method: 'PATCH',
                body: { caution_statut: 'RESTITUEE', caution_date_restitution: today }
            });
            toast('Caution restituée');
            closeModal();
            onRefresh();
        } catch (e) { toast(e.message, 'error'); }
    });

    document.getElementById('btn-caution-utiliser-det')?.addEventListener('click', () => {
        const montantCaution = s.caution_montant;
        openModal(`
            <div class="modal-title">🔧 Retenir la caution pour dégâts</div>
            <form id="form-caution-use-det">
                <div class="form-group">
                    <label class="form-label">Montant retenu (max ${fmtMoney(montantCaution)})</label>
                    <input class="form-control" id="ci-montant-det" type="number" min="0.01" max="${montantCaution}" step="0.01" value="${montantCaution}" required />
                </div>
                <div class="form-group">
                    <label class="form-label">Description des dégâts</label>
                    <textarea class="form-control" id="ci-notes-det" rows="3" placeholder="Décrivez les dégâts constatés…"></textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-ghost" onclick="closeModal()">Annuler</button>
                    <button type="submit" class="btn btn-primary">Confirmer la retenue</button>
                </div>
            </form>
        `);
        document.getElementById('form-caution-use-det').addEventListener('submit', async (e) => {
            e.preventDefault();
            const montantUtilise = parseFloat(document.getElementById('ci-montant-det').value);
            const notes = document.getElementById('ci-notes-det').value.trim();
            const statut = montantUtilise >= montantCaution ? 'UTILISEE_TOTALE' : 'UTILISEE_PARTIELLE';
            try {
                await api(`/sejours/${s.id}/caution`, {
                    method: 'PATCH',
                    body: { caution_statut: statut, caution_montant_utilise: montantUtilise, caution_notes: notes || null }
                });
                toast('Caution retenue');
                closeModal();
                onRefresh();
            } catch (e) { toast(e.message, 'error'); }
        });
    });

    // Load échéancier for long-terme
    if (s.statut === 'LONG_TERME' || s.long_terme) {
        try {
            const ech = await api(`/sejours/${s.id}/echeancier`);
            const container = document.getElementById('echeancier-content');
            if (container && ech) {
                const STATUT_BADGE = {
                    PAYE: { label: 'Payé', cls: 'badge-occupied' },
                    PARTIEL: { label: 'Partiel', cls: 'badge-building' },
                    IMPAYE: { label: 'Impayé', cls: 'badge-out' },
                    A_VENIR: { label: 'À venir', cls: 'badge-standalone' },
                };
                container.innerHTML = `
                    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">
                        <div style="text-align:center">
                            <div style="font-size:11px;color:var(--text-3)">Loyer mensuel</div>
                            <div style="font-size:16px;font-weight:700">${fmtMoney(ech.montant_mensuel)}</div>
                        </div>
                        <div style="text-align:center">
                            <div style="font-size:11px;color:var(--text-3)">Jour de paiement</div>
                            <div style="font-size:16px;font-weight:700">${ech.jour_paiement || '—'}</div>
                        </div>
                        <div style="text-align:center">
                            <div style="font-size:11px;color:var(--text-3)">Mois impayés</div>
                            <div style="font-size:16px;font-weight:700;color:${ech.mois_impayes > 0 ? 'var(--red)' : 'var(--green)'}">${ech.mois_impayes}</div>
                        </div>
                    </div>
                    <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;margin-bottom:14px;padding:10px;background:var(--bg-3);border-radius:6px">
                        <div style="flex:1;min-width:80px">
                            <label style="font-size:10px;color:var(--text-3);display:block;margin-bottom:3px">Nombre de mois</label>
                            <input class="form-control" id="ech-nb-mois" type="number" min="1" max="12" value="${ech.mois_impayes || 1}" style="height:34px" />
                        </div>
                        <div style="flex:1;min-width:80px">
                            <label style="font-size:10px;color:var(--text-3);display:block;margin-bottom:3px">Montant total</label>
                            <input class="form-control" id="ech-montant-total" type="number" min="0" step="0.01" value="${(ech.mois_impayes || 1) * ech.montant_mensuel}" style="height:34px" readonly />
                        </div>
                        <button class="btn btn-primary btn-sm" id="ech-pay-bulk" style="height:34px;white-space:nowrap">💰 Payer ${ech.mois_impayes || 1} mois</button>
                    </div>
                    <div style="max-height:250px;overflow-y:auto">
                        <table style="font-size:12px;width:100%">
                            <thead><tr>
                                <th style="padding:6px 8px">Mois</th>
                                <th style="padding:6px 8px;text-align:right">Dû</th>
                                <th style="padding:6px 8px;text-align:right">Payé</th>
                                <th style="padding:6px 8px">Statut</th>
                                <th style="padding:6px 8px"></th>
                            </tr></thead>
                            <tbody>
                                ${ech.periodes.map(p => {
                                    const st = STATUT_BADGE[p.statut] || STATUT_BADGE.IMPAYE;
                                    return `<tr>
                                        <td style="padding:6px 8px;text-transform:capitalize">${p.label}</td>
                                        <td style="padding:6px 8px;text-align:right">${fmtMoney(p.montant_du)}</td>
                                        <td style="padding:6px 8px;text-align:right;color:${p.paye >= p.montant_du ? 'var(--green)' : p.paye > 0 ? 'var(--orange,#f59e0b)' : 'var(--text-3)'};font-weight:600">${fmtMoney(p.paye)}</td>
                                        <td style="padding:6px 8px"><span class="badge ${st.cls}" style="font-size:10px">${st.label}</span></td>
                                        <td style="padding:6px 8px;text-align:right">${p.statut === 'IMPAYE' || p.statut === 'PARTIEL' ? `<button class="btn btn-primary btn-sm pay-period-btn" data-month="${p.mois}" data-amount="${p.montant_du - p.paye}" style="font-size:10px;padding:2px 8px">Payer</button>` : ''}</td>
                                    </tr>`;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                `;

                // Bind pay buttons
                container.querySelectorAll('.pay-period-btn').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const amount = parseFloat(btn.dataset.amount);
                        const month = btn.dataset.month;
                        const today = new Date().toISOString().slice(0, 10);
                        try {
                            await api('/transactions', { method: 'POST', body: {
                                date: today,
                                description: `Loyer ${month} — ${s.locataire}`,
                                kind: 'IN',
                                amount,
                                sejour_id: s.id,
                                compte_id: 1,
                            }});
                            toast('Paiement enregistré');
                            if (confirm('Émettre la quittance de loyer ?')) {
                                await window.printQuittance(s.id);
                            }
                            closeModal();
                            onRefresh();
                        } catch (e) { toast(e.message, 'error'); }
                    });
                });

                // Bulk payment - update total when nb_mois changes
                const nbMoisInput = document.getElementById('ech-nb-mois');
                const montantTotalInput = document.getElementById('ech-montant-total');
                const payBulkBtn = document.getElementById('ech-pay-bulk');

                if (nbMoisInput && montantTotalInput && payBulkBtn) {
                    nbMoisInput.addEventListener('input', () => {
                        const nb = parseInt(nbMoisInput.value) || 1;
                        montantTotalInput.value = nb * ech.montant_mensuel;
                        payBulkBtn.textContent = `💰 Payer ${nb} mois`;
                    });

                    payBulkBtn.addEventListener('click', async () => {
                        const nb = parseInt(nbMoisInput.value) || 1;
                        const amount = parseFloat(montantTotalInput.value);
                        if (!amount || amount <= 0) return toast('Montant invalide', 'error');
                        const today = new Date().toISOString().slice(0, 10);

                        // Find the periods that will be covered
                        const unpaidPeriods = ech.periodes.filter(p => p.statut === 'IMPAYE' || p.statut === 'PARTIEL').slice(0, nb);
                        const firstPeriod = unpaidPeriods[0];
                        const lastPeriod = unpaidPeriods[unpaidPeriods.length - 1];
                        const desc = firstPeriod && lastPeriod
                            ? `Loyer ${firstPeriod.label} → ${lastPeriod.label} — ${s.locataire}`
                            : `Loyer ${nb} mois — ${s.locataire}`;

                        try {
                            await api('/transactions', { method: 'POST', body: {
                                date: today,
                                description: desc,
                                kind: 'IN',
                                amount,
                                sejour_id: s.id,
                                compte_id: 1,
                            }});
                            toast(`Paiement de ${nb} mois enregistré`);
                            if (confirm('Émettre la quittance de loyer ?')) {
                                await window.printQuittance(s.id);
                            }
                            closeModal();
                            onRefresh();
                        } catch (e) { toast(e.message, 'error'); }
                    });
                }
            }
        } catch (e) { console.error('Échéancier error:', e); }

        // Resilier button
        document.getElementById('btn-resilier')?.addEventListener('click', async () => {
            const dateFin = prompt('Date de fin du contrat (AAAA-MM-JJ) :', new Date().toISOString().slice(0, 10));
            if (!dateFin) return;
            try {
                await api(`/sejours/${s.id}/resilier`, { method: 'POST', body: { date_fin: dateFin } });
                toast('Contrat résilié');
                closeModal();
                onRefresh();
            } catch (e) { toast(e.message, 'error'); }
        });
    }
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
        <!-- Section locataire -->
        <div style="background:var(--bg-2);border-radius:8px;padding:14px;margin-bottom:16px;border:1px solid var(--border)">
          <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--text-3);margin-bottom:12px">LOCATAIRE</div>

          <!-- Sélection fiche existante OU création nouveau -->
          <div class="form-group">
            <label class="form-label">Fiche locataire existante</label>
            <select class="form-control" id="f-locid">
              <option value="">— Nouveau locataire —</option>
              ${locs.map(l => `<option value="${l.id}" ${sej?.locataire_id == l.id ? 'selected' : ''}>${l.prenom ? l.prenom + ' ' : ''}${l.nom}${l.telephone ? ' · ' + l.telephone : ''}</option>`).join('')}
            </select>
          </div>

          <!-- Bloc nouveau locataire (visible si aucune fiche sélectionnée) -->
          <div id="f-new-loc-block">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Prénom *</label>
                <input class="form-control" id="f-prenom" value="${sej?.locataire?.split(' ')[0] || ''}" placeholder="ex. Jean" />
              </div>
              <div class="form-group">
                <label class="form-label">Nom *</label>
                <input class="form-control" id="f-nom" value="${sej?.locataire?.split(' ').slice(1).join(' ') || ''}" placeholder="ex. Dupont" required />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Téléphone</label>
                <input class="form-control" id="f-tel-loc" type="tel" placeholder="ex. +225 07 00 00 00" />
              </div>
              <div class="form-group">
                <label class="form-label">Email</label>
                <input class="form-control" id="f-email-loc" type="email" placeholder="ex. jean@mail.com" />
              </div>
            </div>
            <div style="font-size:11px;color:var(--accent);margin-top:4px">📋 La fiche locataire sera créée automatiquement</div>
          </div>

          <!-- Résumé fiche sélectionnée (visible si fiche choisie) -->
          <div id="f-existing-loc-info" style="display:none;padding:10px;background:var(--bg-3);border-radius:6px;font-size:13px">
            <!-- rempli par JS -->
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
              <option value="LONG_TERME" ${sej?.statut === 'LONG_TERME' ? 'selected' : ''}>Long terme</option>
              <option value="TERMINE"  ${sej?.statut === 'TERMINE' ? 'selected' : ''}>Terminé</option>
              <option value="ANNULE"   ${sej?.statut === 'ANNULE' ? 'selected' : ''}>Annulé</option>
            </select>
          </div>
        </div>
        <div id="long-terme-fields" style="display:none;background:var(--bg-2);border-radius:8px;padding:14px;margin-bottom:16px;border:1px solid var(--accent);border-left:3px solid var(--accent)">
          <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--accent);margin-bottom:12px">CONTRAT LONG TERME</div>
          <div class="form-group">
            <label class="form-label">Jour de paiement mensuel (1-31)</label>
            <input class="form-control" id="f-jour-paiement" type="number" min="1" max="31" value="${sej?.jour_paiement || ''}" placeholder="Ex: 5 → paie tous les 5 du mois" />
          </div>
          <div style="font-size:11px;color:var(--text-3)">Le loyer mensuel correspond au montant saisi ci-dessus. La date de départ est optionnelle (contrat renouvelé automatiquement).</div>
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
        <div style="margin-top:16px;padding:16px;background:var(--bg-2);border-radius:8px;border:1px solid var(--border)">
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
            <input type="checkbox" id="f-emit-facture" style="width:18px;height:18px" />
            <div>
              <div style="font-weight:600;font-size:13px">Émettre une facture</div>
              <div style="font-size:11px;color:var(--text-3)">Génère automatiquement une facture PDF à l'enregistrement</div>
            </div>
          </label>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" onclick="closeModal()">Annuler</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Enregistrer' : 'Créer le séjour'}</button>
        </div>
      </form>
    `);

    // Toggle nouveau locataire vs fiche existante
    const locidSel = document.getElementById('f-locid');
    const newLocBlock = document.getElementById('f-new-loc-block');
    const existingLocInfo = document.getElementById('f-existing-loc-info');

    function updateLocDisplay() {
      const val = locidSel.value;
      if (val) {
        const l = locs.find(l => l.id == val);
        newLocBlock.style.display = 'none';
        existingLocInfo.style.display = '';
        existingLocInfo.innerHTML = `👤 <strong>${l.prenom ? l.prenom + ' ' : ''}${l.nom}</strong>${l.telephone ? ` · ${l.telephone}` : ''}${l.email ? ` · ${l.email}` : ''}`;
      } else {
        newLocBlock.style.display = '';
        existingLocInfo.style.display = 'none';
      }
    }
    locidSel.addEventListener('change', updateLocDisplay);
    updateLocDisplay();

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

    // Show/hide long terme fields
    const statutSel = document.getElementById('f-statut');
    const ltFields = document.getElementById('long-terme-fields');
    function updateLtFields() {
        ltFields.style.display = statutSel.value === 'LONG_TERME' ? '' : 'none';
        if (statutSel.value === 'LONG_TERME') {
            document.getElementById('f-tarif').value = 'MENSUEL';
            updateMontantLabel();
            // Auto-fill jour_paiement from date_debut if empty
            const jp = document.getElementById('f-jour-paiement');
            if (!jp.value) {
                const debut = document.getElementById('f-debut').value;
                if (debut) jp.value = new Date(debut).getDate();
            }
        }
    }
    statutSel.addEventListener('change', updateLtFields);
    updateLtFields();

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

      const locidVal = document.getElementById('f-locid').value;
      const prenomVal = document.getElementById('f-prenom')?.value?.trim() || '';
      const nomVal = document.getElementById('f-nom')?.value?.trim() || '';
      // Toujours créer la fiche locataire si c'est un nouveau (pas de fiche existante sélectionnée)
      const isNewLoc = !locidVal && nomVal;

      const body = {
        unit_id: document.getElementById('f-unit').value,
        locataire: locidVal
          ? (() => { const l = locs.find(l => l.id == locidVal); return l ? `${l.prenom ? l.prenom + ' ' : ''}${l.nom}` : ''; })()
          : `${prenomVal} ${nomVal}`.trim(),
        locataire_id: locidVal ? parseInt(locidVal) : null,
        create_locataire: isNewLoc,
        prenom_locataire: isNewLoc ? prenomVal : undefined,
        nom_locataire: isNewLoc ? nomVal : undefined,
        telephone_locataire: isNewLoc ? (document.getElementById('f-tel-loc')?.value?.trim() || null) : undefined,
        email_locataire: isNewLoc ? (document.getElementById('f-email-loc')?.value?.trim() || null) : undefined,
        date_debut: document.getElementById('f-debut').value,
        date_fin: document.getElementById('f-fin').value || null,
        heure_entree: document.getElementById('f-heure-entree').value || null,
        heure_sortie: document.getElementById('f-heure-sortie').value || null,
        type_tarif: document.getElementById('f-tarif').value,
        montant: parseFloat(document.getElementById('f-montant').value),
        statut: document.getElementById('f-statut').value,
        notes: document.getElementById('f-notes').value.trim() || null,
        long_terme: document.getElementById('f-statut').value === 'LONG_TERME',
        jour_paiement: document.getElementById('f-jour-paiement')?.value || null,
        caution_montant: parseFloat(document.getElementById('f-caution').value) || 0,
        caution_date: document.getElementById('f-caution-date').value || null,
      };
      try {
        let result;
        if (isEdit) { result = await api(`/sejours/${sej.id}`, { method: 'PUT', body }); toast('Séjour modifié'); }
        else { result = await api('/sejours', { method: 'POST', body }); toast('Séjour créé'); }
        const emitFacture = document.getElementById('f-emit-facture')?.checked;
        closeModal();
        if (emitFacture && result?.id) {
            await window.printFacture(result.id);
        }
        load();
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

// ── Quittance de loyer ──────────────────────────────────────────────────────
window.printQuittance = async function(sejourId) {
  try {
    const d = await api(`/sejours/${sejourId}/quittance`);
    const user = window.CURRENT_USER;
    const signataire = user ? ((user.prenom || '') + ' ' + (user.nom || user.login || '')).trim() : 'Gestionnaire';
    const s = d.sejour;
    const loc = d.locataire;
    const unit = d.unit;
    const prop = d.property;

    const locNom = loc ? ((loc.prenom || '') + ' ' + loc.nom).trim() : (s.locataire || '—');
    const locTel = loc?.telephone || '';

    const paiementsRows = d.paiements.length
      ? d.paiements.map(p => `<tr>
          <td>${new Date(p.date).toLocaleDateString('fr-FR')}</td>
          <td>${p.description || 'Paiement'}</td>
          <td style="text-align:right;font-weight:600;color:#059669">${fmtMoney(p.amount)}</td>
        </tr>`).join('')
      : '<tr><td colspan="3" style="text-align:center;color:#888">Aucun paiement enregistré</td></tr>';

    // Build period coverage section
    const pc = d.periodes_couvertes || [];
    const firstPeriod = pc[0];
    const lastPeriod = pc[pc.length - 1];
    const periodeSummary = pc.length > 0
        ? (pc.length === 1 ? firstPeriod.label : `${firstPeriod.label.split(' — ')[0]} — ${lastPeriod.label.split(' — ')[1]}`)
        : `${new Date(s.date_debut).toLocaleDateString('fr-FR')} au ${s.date_fin ? new Date(s.date_fin).toLocaleDateString('fr-FR') : '—'}`;

    const periodesRows = pc.length > 0 ? pc.map(p => `<tr>
          <td style="font-size:12px">${p.label}</td>
          <td style="text-align:right;font-size:12px">${fmtMoney(p.montant_du)}</td>
          <td style="text-align:right;font-size:12px;font-weight:600;color:${p.statut === 'COMPLET' ? '#059669' : '#f59e0b'}">${fmtMoney(p.montant_couvert)}${p.pourcentage < 100 ? ` (${p.pourcentage}%)` : ''}</td>
          <td style="text-align:center;font-size:11px">${p.statut === 'COMPLET' ? '✅' : '⚠️ Partiel'}</td>
        </tr>`).join('') : '';

    const html = `
      <style>
        body { font-family: system-ui, sans-serif; padding: 32px; color: #111; max-width: 680px; margin: auto; }
        h1 { font-size: 24px; font-weight: 700; text-align: center; letter-spacing: 2px; margin-bottom: 4px; }
        .sous-titre { text-align: center; font-size: 13px; color: #555; margin-bottom: 32px; border-bottom: 2px solid #111; padding-bottom: 16px; }
        .section { margin-bottom: 20px; }
        .section-title { font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #888; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; font-size: 13px; }
        .info-label { color: #666; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 13px; }
        th { text-align: left; padding: 8px; border-bottom: 2px solid #ddd; background: #f9f9f9; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
        td { padding: 8px; border-bottom: 1px solid #eee; }
        .total-row { font-weight: 700; font-size: 15px; }
        .period-box { background: #f0f7ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 14px; margin-bottom: 20px; }
        .period-title { font-size: 16px; font-weight: 700; color: #1e40af; margin-bottom: 4px; }
        .attestation { background: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 6px; padding: 16px; font-size: 13px; line-height: 1.6; margin-top: 24px; }
        .signature-block { margin-top: 32px; display: flex; justify-content: flex-end; }
        .signature-line { text-align: center; }
        .sig-name { font-weight: 600; font-size: 13px; margin-bottom: 4px; }
        .sig-date { font-size: 11px; color: #666; margin-bottom: 32px; }
        .sig-bar { border-top: 1px solid #333; width: 200px; margin: 0 auto; padding-top: 6px; font-size: 11px; color: #666; }
        @media print { body { padding: 16px; } }
      </style>

      <h1>QUITTANCE DE LOYER</h1>
      <div class="sous-titre">
        Émise le : ${new Date().toLocaleDateString('fr-FR')}
      </div>

      <div class="period-box">
        <div class="period-title">Période couverte : ${periodeSummary}</div>
        <div style="font-size:13px;color:#555">Montant total réglé : <strong style="color:#059669">${fmtMoney(d.total_paye)}</strong></div>
      </div>

      ${pc.length > 1 ? `
      <div class="section">
        <div class="section-title">Détail par période</div>
        <table>
          <thead><tr><th>Période</th><th style="text-align:right">Loyer dû</th><th style="text-align:right">Payé</th><th style="text-align:center">Statut</th></tr></thead>
          <tbody>${periodesRows}</tbody>
        </table>
      </div>` : ''}

      <div class="section">
        <div class="section-title">Bailleur / Propriété</div>
        <div class="info-grid">
          <div><div class="info-label">Propriété</div><strong>${prop.name || '—'}</strong></div>
          <div><div class="info-label">Adresse</div>${prop.address || '—'}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Locataire</div>
        <div class="info-grid">
          <div><div class="info-label">Nom complet</div><strong>${locNom}</strong></div>
          <div><div class="info-label">Téléphone</div>${locTel || '—'}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Appartement</div>
        <div class="info-grid">
          <div><div class="info-label">Unité</div><strong>${unit.label || '—'}</strong></div>
          <div><div class="info-label">Type</div>${unit.type || '—'}${unit.surface ? ' · ' + unit.surface + ' m²' : ''}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Historique des paiements</div>
        <table>
          <thead><tr><th>Date</th><th>Description</th><th style="text-align:right">Montant</th></tr></thead>
          <tbody>
            ${paiementsRows}
            <tr class="total-row" style="background:#f0fdf4">
              <td colspan="2" style="color:#059669">Total payé</td>
              <td style="text-align:right;color:#059669">${fmtMoney(d.total_paye)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="attestation">
        Je soussigné(e), <strong>${signataire}</strong>, gestionnaire, atteste avoir reçu la somme de
        <strong>${fmtMoney(d.total_paye)}</strong> correspondant au loyer pour la période
        <strong>${periodeSummary}</strong>.
        ${pc.some(p => p.statut === 'PARTIEL') ? `<br><em>Note : certaines périodes sont partiellement réglées (voir détail ci-dessus).</em>` : ''}
      </div>

      <div class="signature-block">
        <div class="signature-line">
          <div class="sig-name">${signataire}</div>
          <div class="sig-date">${new Date().toLocaleDateString('fr-FR')}</div>
          <div class="sig-bar">Signature</div>
        </div>
      </div>
    `;
    printSection('Quittance de loyer — ' + locNom, html);
  } catch (e) {
    toast('Erreur quittance : ' + e.message, 'error');
  }
};

window.printFacture = async function(sejourId) {
  try {
    const d = await api(`/sejours/${sejourId}/facture`);
    const user = window.CURRENT_USER;
    const emetteur = user ? ((user.prenom || '') + ' ' + (user.nom || user.login || '')).trim() : 'Gestionnaire';
    const s = d.sejour;
    const loc = d.locataire;
    const unit = d.unit;
    const prop = d.property;
    const pay = d.payment;

    const locNom = loc ? ((loc.prenom || '') + ' ' + loc.nom).trim() : (s.locataire || '—');
    const locTel = loc?.telephone || '';
    const locEmail = loc?.email || '';

    const TARIF_LABELS = { JOURNALIER: 'Journalier', MENSUEL: 'Mensuel', FORFAIT: 'Forfait période', HEBDOMADAIRE: 'Hebdomadaire' };

    // Calcul durée et lignes de facturation
    const lignes = [];
    const totalDu = pay.montant_total_du || s.montant;

    if (s.type_tarif === 'FORFAIT') {
      lignes.push({ desc: `Location forfaitaire — ${unit.label || '?'}`, qte: '1', pu: s.montant, total: s.montant });
    } else if (s.type_tarif === 'MENSUEL') {
      const mois = s.date_fin ? Math.max(1, Math.round((new Date(s.date_fin) - new Date(s.date_debut)) / (1000*60*60*24*30))) : 1;
      lignes.push({ desc: `Loyer mensuel — ${unit.label || '?'}`, qte: mois + ' mois', pu: s.montant, total: s.montant * mois });
    } else if (s.type_tarif === 'HEBDOMADAIRE') {
      const sem = s.date_fin ? Math.max(1, Math.round((new Date(s.date_fin) - new Date(s.date_debut)) / (1000*60*60*24*7))) : 1;
      lignes.push({ desc: `Location hebdomadaire — ${unit.label || '?'}`, qte: sem + ' sem.', pu: s.montant, total: s.montant * sem });
    } else {
      const jours = s.date_fin ? Math.max(1, Math.round((new Date(s.date_fin) - new Date(s.date_debut)) / 86400000)) : 1;
      lignes.push({ desc: `Location journalière — ${unit.label || '?'}`, qte: jours + ' jour' + (jours > 1 ? 's' : ''), pu: s.montant, total: s.montant * jours });
    }

    // Ligne caution si applicable
    if (s.caution_montant > 0) {
      const cautionLabels = { AUCUNE: 'Non perçue', EN_ATTENTE: 'En attente', PAYEE: 'Payée', RESTITUEE: 'Restituée', UTILISEE_PARTIELLE: 'Retenue partielle', UTILISEE_TOTALE: 'Retenue totale' };
      lignes.push({ desc: `Caution de garantie (${cautionLabels[s.caution_statut] || s.caution_statut})`, qte: '1', pu: s.caution_montant, total: s.caution_montant });
    }

    const sousTotal = lignes.reduce((sum, l) => sum + l.total, 0);

    const lignesHtml = lignes.map(l => `
      <tr>
        <td style="padding:10px 8px">${l.desc}</td>
        <td style="padding:10px 8px;text-align:center">${l.qte}</td>
        <td style="padding:10px 8px;text-align:right">${fmtMoney(l.pu)}</td>
        <td style="padding:10px 8px;text-align:right;font-weight:600">${fmtMoney(l.total)}</td>
      </tr>`).join('');

    const html = `
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #111; max-width: 720px; margin: auto; font-size: 13px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 3px solid #111; }
        .header-left h1 { font-size: 28px; font-weight: 800; letter-spacing: 2px; margin: 0 0 4px 0; }
        .header-left .num { font-size: 14px; color: #555; }
        .header-right { text-align: right; font-size: 12px; color: #555; }
        .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 28px; }
        .party { padding: 16px; border-radius: 8px; }
        .party-from { background: #f8f9fa; }
        .party-to { background: #f0f7ff; border: 1px solid #d0e3ff; }
        .party-label { font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #888; margin-bottom: 8px; }
        .party-name { font-size: 15px; font-weight: 700; margin-bottom: 4px; }
        .party-detail { font-size: 12px; color: #555; line-height: 1.6; }
        .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
        .meta-item { background: #f8f9fa; border-radius: 6px; padding: 10px 12px; text-align: center; }
        .meta-label { font-size: 10px; text-transform: uppercase; letter-spacing: .5px; color: #888; margin-bottom: 4px; }
        .meta-value { font-size: 13px; font-weight: 600; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        thead th { background: #111; color: #fff; padding: 10px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: .5px; }
        thead th:first-child { border-radius: 6px 0 0 0; }
        thead th:last-child { border-radius: 0 6px 0 0; }
        tbody tr { border-bottom: 1px solid #eee; }
        tbody tr:last-child { border-bottom: 2px solid #ddd; }
        .total-section { display: flex; justify-content: flex-end; margin-bottom: 28px; }
        .total-box { width: 280px; }
        .total-line { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
        .total-line.grand { font-size: 18px; font-weight: 800; padding: 12px 0; border-top: 2px solid #111; margin-top: 4px; }
        .paiement-info { background: ${pay.solde_restant > 0 ? '#fff5f5' : '#f0fdf4'}; border: 1px solid ${pay.solde_restant > 0 ? '#fecaca' : '#bbf7d0'}; border-radius: 8px; padding: 14px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
        .conditions { background: #f8f9fa; border-radius: 8px; padding: 16px; font-size: 11px; color: #555; line-height: 1.7; margin-bottom: 28px; }
        .conditions-title { font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #888; margin-bottom: 8px; }
        .footer { margin-top: 32px; display: flex; justify-content: space-between; align-items: flex-end; }
        .sig-block { text-align: center; }
        .sig-name { font-weight: 600; margin-bottom: 4px; }
        .sig-date { font-size: 11px; color: #666; margin-bottom: 40px; }
        .sig-bar { border-top: 1px solid #333; width: 200px; padding-top: 6px; font-size: 11px; color: #666; text-align: center; }
        @media print { body { padding: 20px; } }
      </style>

      <div class="header">
        <div class="header-left">
          <h1>FACTURE</h1>
          <div class="num">${d.num_facture}</div>
        </div>
        <div class="header-right">
          <div>Date d'émission : <strong>${new Date(d.date_emission).toLocaleDateString('fr-FR')}</strong></div>
          <div>Période : ${new Date(s.date_debut).toLocaleDateString('fr-FR')} — ${s.date_fin ? new Date(s.date_fin).toLocaleDateString('fr-FR') : 'Indéterminée'}</div>
        </div>
      </div>

      <div class="parties">
        <div class="party party-from">
          <div class="party-label">Émetteur</div>
          <div class="party-name">${prop.name || 'Propriété'}</div>
          <div class="party-detail">${prop.address || ''}</div>
          <div class="party-detail" style="margin-top:6px">${emetteur}</div>
        </div>
        <div class="party party-to">
          <div class="party-label">Destinataire</div>
          <div class="party-name">${locNom}</div>
          <div class="party-detail">${locTel}${locTel && locEmail ? ' · ' : ''}${locEmail}</div>
          ${loc?.piece_identite ? `<div class="party-detail">${loc.type_piece || 'ID'} : ${loc.piece_identite}</div>` : ''}
        </div>
      </div>

      <div class="meta">
        <div class="meta-item">
          <div class="meta-label">Bien</div>
          <div class="meta-value">${unit.label || '—'}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Type tarif</div>
          <div class="meta-value">${TARIF_LABELS[s.type_tarif] || s.type_tarif}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Arrivée</div>
          <div class="meta-value">${new Date(s.date_debut).toLocaleDateString('fr-FR')}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Départ</div>
          <div class="meta-value">${s.date_fin ? new Date(s.date_fin).toLocaleDateString('fr-FR') : '—'}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="text-align:left">Description</th>
            <th style="text-align:center">Quantité</th>
            <th style="text-align:right">Prix unitaire</th>
            <th style="text-align:right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${lignesHtml}
        </tbody>
      </table>

      <div class="total-section">
        <div class="total-box">
          <div class="total-line"><span>Sous-total location</span><span>${fmtMoney(lignes[0].total)}</span></div>
          ${s.caution_montant > 0 ? `<div class="total-line"><span>Caution de garantie</span><span>${fmtMoney(s.caution_montant)}</span></div>` : ''}
          <div class="total-line grand"><span>TOTAL</span><span>${fmtMoney(sousTotal)}</span></div>
        </div>
      </div>

      <div class="paiement-info">
        <div>
          <div style="font-weight:600;font-size:14px">${pay.solde_restant > 0 ? '⏳ Solde restant à régler' : '✅ Facture soldée'}</div>
          <div style="font-size:12px;color:#555;margin-top:2px">Payé : ${fmtMoney(pay.montant_paye)} / ${fmtMoney(pay.montant_total_du)}</div>
        </div>
        ${pay.solde_restant > 0 ? `<div style="font-size:20px;font-weight:800;color:#dc2626">${fmtMoney(pay.solde_restant)}</div>` : ''}
      </div>

      ${s.caution_montant > 0 ? `
      <div class="conditions">
        <div class="conditions-title">Caution de garantie</div>
        Montant : <strong>${fmtMoney(s.caution_montant)}</strong><br>
        La caution sera restituée au locataire en fin de séjour, sous réserve de l'état des lieux de sortie.
        En cas de dégradations constatées, tout ou partie de la caution pourra être retenue pour couvrir les frais de remise en état.
        ${s.caution_date ? `<br>Date de perception : ${new Date(s.caution_date).toLocaleDateString('fr-FR')}` : ''}
      </div>` : ''}

      <div class="conditions">
        <div class="conditions-title">Conditions</div>
        Facture émise le ${new Date().toLocaleDateString('fr-FR')} pour la location du bien <strong>${unit.label || '—'}</strong>
        situé à <strong>${prop.address || prop.name || '—'}</strong>.
        ${s.notes ? `<br>Notes : ${s.notes}` : ''}
      </div>

      <div class="footer">
        <div style="font-size:11px;color:#888">
          ${d.num_facture}<br>
          Généré par Leasevora
        </div>
        <div class="sig-block">
          <div class="sig-name">${emetteur}</div>
          <div class="sig-date">${new Date().toLocaleDateString('fr-FR')}</div>
          <div class="sig-bar">Signature</div>
        </div>
      </div>
    `;
    printSection('Facture ' + d.num_facture + ' — ' + locNom, html);
  } catch (e) {
    toast('Erreur facture : ' + e.message, 'error');
  }
};
