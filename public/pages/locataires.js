async function renderLocatairesPage(container) {
  const TYPE_PIECE = { CNI: 'CNI', PASSEPORT: 'Passeport', TITRE_SEJOUR: 'Titre de séjour' };

  async function load() {
    try {
      const locs = await api('/locataires');
      render(locs);
    } catch (e) {
      container.innerHTML = `<p class="text-muted">${e.message}</p>`;
    }
  }

  function render(locs) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">Locataires</div>
          <div class="page-subtitle">${locs.length} locataire${locs.length !== 1 ? 's' : ''}</div>
        </div>
        <button class="btn btn-primary" id="add-loc-btn">+ Nouveau locataire</button>
      </div>
      <div class="card">
        <table>
          <thead><tr>
            <th>Nom</th><th>Téléphone</th><th>Email</th><th>Pièce d'identité</th><th>Caution</th><th></th>
          </tr></thead>
          <tbody>
            ${locs.length ? locs.map(l => `
              <tr>
                <td><strong>${l.prenom ? l.prenom + ' ' : ''}${l.nom}</strong></td>
                <td class="text-muted">${l.telephone || '—'}</td>
                <td class="text-muted">${l.email || '—'}</td>
                <td class="text-muted">${l.type_piece ? `${TYPE_PIECE[l.type_piece] || l.type_piece} ${l.num_piece_identite ? '· ' + l.num_piece_identite : ''}` : '—'}</td>
                <td>${l.caution > 0 ? `<span class="amount-in">${fmtMoney(l.caution)}</span>` : '—'}</td>
                <td style="text-align:right;white-space:nowrap">
                  <button class="btn btn-ghost btn-sm view-loc-btn" data-id="${l.id}">Fiche</button>
                  <button class="btn btn-ghost btn-sm edit-loc-btn" data-id="${l.id}">Modifier</button>
                  <button class="btn btn-danger btn-sm del-loc-btn" data-id="${l.id}" data-name="${l.nom}">✕</button>
                </td>
              </tr>`).join('')
        : '<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">👤</div><p>Aucun locataire. Ajoutez votre premier locataire !</p></div></td></tr>'}
          </tbody>
        </table>
      </div>
    `;

    document.getElementById('add-loc-btn').addEventListener('click', () => showForm());
    container.querySelectorAll('.view-loc-btn').forEach(btn =>
      btn.addEventListener('click', () => showFiche(Number(btn.dataset.id))));
    container.querySelectorAll('.edit-loc-btn').forEach(btn =>
      btn.addEventListener('click', () => showForm(locs.find(l => l.id == btn.dataset.id))));
    container.querySelectorAll('.del-loc-btn').forEach(btn =>
      btn.addEventListener('click', async () => {
        if (!confirm(`Supprimer le locataire "${btn.dataset.name}" ?`)) return;
        try { await api(`/locataires/${btn.dataset.id}`, { method: 'DELETE' }); toast('Locataire supprimé'); load(); }
        catch (e) { toast(e.message, 'error'); }
      }));
  }

  async function showFiche(id) {
    const l = await api(`/locataires/${id}`);
    openModal(`
      <div class="modal-title">👤 ${l.prenom ? l.prenom + ' ' : ''}${l.nom}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        ${[
        ['📞 Téléphone', l.telephone || '—'],
        ['📧 Email', l.email || '—'],
        ['🪪 Pièce d\'identité', l.type_piece ? `${TYPE_PIECE[l.type_piece] || l.type_piece}` : '—'],
        ['N° pièce', l.num_piece_identite || '—'],
        ['💰 Caution', l.caution > 0 ? fmtMoney(l.caution) : '—'],
        ['📝 Notes', l.notes || '—'],
      ].map(([k, v]) => `<div><div style="font-size:11px;color:var(--text-3);margin-bottom:2px">${k}</div><div style="font-size:13px">${v}</div></div>`).join('')}
      </div>
      <div style="border-top:1px solid var(--border);padding-top:14px">
        <div style="font-size:12px;font-weight:600;color:var(--text-2);margin-bottom:10px">Historique des séjours</div>
        ${l.sejours.length ? `
          <table style="width:100%;font-size:12px;border-collapse:collapse">
            <thead><tr>
              <th style="text-align:left;padding:6px 4px;border-bottom:1px solid var(--border);color:var(--text-3)">Appartement</th>
              <th style="text-align:left;padding:6px 4px;border-bottom:1px solid var(--border);color:var(--text-3)">Propriété</th>
              <th style="text-align:left;padding:6px 4px;border-bottom:1px solid var(--border);color:var(--text-3)">Période</th>
              <th style="text-align:left;padding:6px 4px;border-bottom:1px solid var(--border);color:var(--text-3)">Statut</th>
            </tr></thead>
            <tbody>
              ${l.sejours.map(s => `<tr>
                <td style="padding:6px 4px">${s.unit_label}</td>
                <td style="padding:6px 4px;color:var(--text-3)">${s.property_name}</td>
                <td style="padding:6px 4px;color:var(--text-3)">${fmtDate(s.date_debut)} → ${s.date_fin ? fmtDate(s.date_fin) : 'En cours'}</td>
                <td style="padding:6px 4px"><span class="badge ${s.statut === 'EN_COURS' ? 'badge-occupied' : 'badge-vacant'}">${s.statut.replace('_', ' ')}</span></td>
              </tr>`).join('')}
            </tbody>
          </table>` : '<p class="text-muted" style="font-size:12px">Aucun séjour enregistré.</p>'}
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" onclick="closeModal()">Fermer</button>
        <button class="btn btn-primary" onclick="closeModal();location.hash='sejours'">Nouveau séjour</button>
      </div>
    `);
  }

  function showForm(loc = null) {
    const isEdit = !!loc;
    openModal(`
      <div class="modal-title">${isEdit ? 'Modifier le locataire' : 'Nouveau locataire'}</div>
      <form id="loc-form">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Prénom</label>
            <input class="form-control" id="f-prenom" value="${loc?.prenom || ''}" placeholder="Jean" />
          </div>
          <div class="form-group">
            <label class="form-label">Nom *</label>
            <input class="form-control" id="f-nom" value="${loc?.nom || ''}" placeholder="Dupont" required />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Téléphone</label>
            <input class="form-control" id="f-tel" value="${loc?.telephone || ''}" placeholder="+33 6 …" />
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input class="form-control" id="f-email" type="email" value="${loc?.email || ''}" placeholder="jean@mail.com" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Type de pièce d'identité</label>
            <select class="form-control" id="f-type-piece">
              <option value="">—</option>
              <option value="CNI" ${loc?.type_piece === 'CNI' ? 'selected' : ''}>CNI</option>
              <option value="PASSEPORT" ${loc?.type_piece === 'PASSEPORT' ? 'selected' : ''}>Passeport</option>
              <option value="TITRE_SEJOUR" ${loc?.type_piece === 'TITRE_SEJOUR' ? 'selected' : ''}>Titre de séjour</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Numéro de pièce</label>
            <input class="form-control" id="f-num-piece" value="${loc?.num_piece_identite || ''}" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Caution (€)</label>
            <input class="form-control" id="f-caution" type="number" min="0" step="0.01" value="${loc?.caution || 0}" />
          </div>
          <div class="form-group">
            <label class="form-label">Notes</label>
            <input class="form-control" id="f-notes" value="${loc?.notes || ''}" placeholder="Optionnel" />
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" onclick="closeModal()">Annuler</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Enregistrer' : 'Créer'}</button>
        </div>
      </form>
    `);

    document.getElementById('loc-form').addEventListener('submit', async e => {
      e.preventDefault();
      const body = {
        nom: document.getElementById('f-nom').value.trim(),
        prenom: document.getElementById('f-prenom').value.trim(),
        telephone: document.getElementById('f-tel').value.trim(),
        email: document.getElementById('f-email').value.trim(),
        type_piece: document.getElementById('f-type-piece').value || null,
        num_piece_identite: document.getElementById('f-num-piece').value.trim(),
        caution: parseFloat(document.getElementById('f-caution').value) || 0,
        notes: document.getElementById('f-notes').value.trim(),
      };
      try {
        if (isEdit) { await api(`/locataires/${loc.id}`, { method: 'PUT', body }); toast('Locataire modifié'); }
        else { await api('/locataires', { method: 'POST', body }); toast('Locataire créé'); }
        closeModal(); load();
      } catch (e) { toast(e.message, 'error'); }
    });
  }

  await load();
}
