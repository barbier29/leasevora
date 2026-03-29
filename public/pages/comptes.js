async function renderComptesPage(container) {
  async function load() {
    try {
      const comptes = await api('/comptes');
      render(comptes);
    } catch (e) {
      container.innerHTML = `<p class="text-muted">${e.message}</p>`;
    }
  }

  function bankDetails(c) {
    const parts = [];
    if (c.nom_banque)    parts.push(c.nom_banque);
    if (c.numero_compte) parts.push('N° ' + c.numero_compte);
    if (c.iban)          parts.push('IBAN: ' + c.iban);
    if (c.bic)           parts.push('BIC: ' + c.bic);
    return parts.join(' · ');
  }

  function render(comptes) {
    const caisses = comptes.filter(c => c.type === 'CAISSE');
    const banques = comptes.filter(c => c.type === 'BANQUE');

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">Comptes & Caisses</div>
          <div class="page-subtitle">${comptes.length} compte${comptes.length !== 1 ? 's' : ''}</div>
        </div>
        <button class="btn btn-primary" id="add-compte-btn">+ Ajouter un compte</button>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <!-- Caisses -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">🏦 Caisses physiques</span>
          </div>
          ${caisses.length ? caisses.map(c => `
            <div style="padding:14px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;gap:12px">
              <div style="flex:1;min-width:0">
                <div style="font-weight:600;font-size:14px;display:flex;align-items:center;gap:6px">
                  ${c.nom}
                  ${!c.actif ? '<span style="font-size:10px;color:var(--red);font-weight:400">(désactivé)</span>' : ''}
                </div>
                <div style="font-size:11px;color:var(--text-3);margin-top:2px">
                  Solde initial : ${fmtMoney(c.solde_initial)}
                  ${c.description ? ' · ' + c.description : ''}
                </div>
              </div>
              <div style="display:flex;gap:8px;flex-shrink:0">
                <button class="btn btn-ghost btn-sm edit-compte-btn" data-id="${c.id}">Modifier</button>
                <button class="btn btn-danger btn-sm del-compte-btn" data-id="${c.id}" data-nom="${c.nom}">✕</button>
              </div>
            </div>`).join('') : '<div style="padding:16px;color:var(--text-3);font-size:13px">Aucune caisse.</div>'}
        </div>

        <!-- Banques -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">🏛️ Comptes bancaires</span>
          </div>
          ${banques.length ? banques.map(c => `
            <div style="padding:14px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;gap:12px">
              <div style="flex:1;min-width:0">
                <div style="font-weight:600;font-size:14px;display:flex;align-items:center;gap:6px">
                  ${c.nom}
                  ${!c.actif ? '<span style="font-size:10px;color:var(--red);font-weight:400">(désactivé)</span>' : ''}
                </div>
                ${bankDetails(c) ? `<div style="font-size:11px;color:var(--text-3);margin-top:2px">${bankDetails(c)}</div>` : ''}
                <div style="font-size:11px;color:var(--text-3)">Solde initial : ${fmtMoney(c.solde_initial)}${c.description ? ' · ' + c.description : ''}</div>
              </div>
              <div style="display:flex;gap:8px;flex-shrink:0">
                <button class="btn btn-ghost btn-sm edit-compte-btn" data-id="${c.id}">Modifier</button>
                <button class="btn btn-danger btn-sm del-compte-btn" data-id="${c.id}" data-nom="${c.nom}">✕</button>
              </div>
            </div>`).join('') : '<div style="padding:16px;color:var(--text-3);font-size:13px">Aucun compte bancaire.</div>'}
        </div>
      </div>
    `;

    document.getElementById('add-compte-btn').addEventListener('click', () => showForm());
    container.querySelectorAll('.edit-compte-btn').forEach(btn =>
      btn.addEventListener('click', () => showForm(comptes.find(c => c.id == btn.dataset.id))));
    container.querySelectorAll('.del-compte-btn').forEach(btn =>
      btn.addEventListener('click', async () => {
        if (!confirm(`Supprimer le compte "${btn.dataset.nom}" ?`)) return;
        try {
          await api(`/comptes/${btn.dataset.id}`, { method: 'DELETE' });
          toast('Compte supprimé');
          load();
        } catch (e) { toast(e.message, 'error'); }
      }));
  }

  function showForm(compte = null) {
    const isEdit = !!compte;
    const isBanque = compte?.type === 'BANQUE';
    openModal(`
      <div class="modal-title">${isEdit ? 'Modifier le compte' : 'Nouveau compte'}</div>
      <form id="compte-form">
        <div class="form-row">
          <div class="form-group" style="flex:2">
            <label class="form-label">Nom du compte *</label>
            <input class="form-control" id="f-nom" value="${compte?.nom || ''}" placeholder="ex. Caisse agence, CIB Principal" required />
          </div>
          <div class="form-group">
            <label class="form-label">Type *</label>
            <select class="form-control" id="f-type">
              <option value="CAISSE" ${(!compte || compte.type === 'CAISSE') ? 'selected' : ''}>🏦 Caisse</option>
              <option value="BANQUE" ${isBanque ? 'selected' : ''}>🏛️ Banque</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Solde initial (${window.CURR?.symbol || 'F'})</label>
          <input class="form-control" id="f-solde" type="number" min="0" step="0.01" value="${compte?.solde_initial || 0}" />
        </div>

        <!-- Champs bancaires (affichés seulement si type = BANQUE) -->
        <div id="bank-fields" style="display:${isBanque ? 'block' : 'none'}">
          <div style="border-top:1px solid var(--border);margin:14px 0 12px;padding-top:12px;font-size:11px;font-weight:700;letter-spacing:1px;color:var(--text-3);text-transform:uppercase">Informations bancaires</div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Nom de la banque</label>
              <input class="form-control" id="f-nom-banque" value="${compte?.nom_banque || ''}" placeholder="ex. CIB, BNP Paribas" />
            </div>
            <div class="form-group">
              <label class="form-label">Numéro de compte</label>
              <input class="form-control" id="f-numero" value="${compte?.numero_compte || ''}" placeholder="ex. 00012345678" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group" style="flex:2">
              <label class="form-label">IBAN</label>
              <input class="form-control" id="f-iban" value="${compte?.iban || ''}" placeholder="ex. SN28 CIB1 0000 1234 5678 9012 3" style="font-family:monospace;letter-spacing:.5px" />
            </div>
            <div class="form-group">
              <label class="form-label">BIC / SWIFT</label>
              <input class="form-control" id="f-bic" value="${compte?.bic || ''}" placeholder="ex. CIBBSNDA" style="font-family:monospace" />
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Description / notes</label>
          <input class="form-control" id="f-desc" value="${compte?.description || ''}" placeholder="Optionnel" />
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-ghost" onclick="closeModal()">Annuler</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Enregistrer' : 'Créer'}</button>
        </div>
      </form>
    `);

    // Toggle champs bancaires selon type
    document.getElementById('f-type').addEventListener('change', e => {
      document.getElementById('bank-fields').style.display = e.target.value === 'BANQUE' ? 'block' : 'none';
    });

    document.getElementById('compte-form').addEventListener('submit', async e => {
      e.preventDefault();
      const type = document.getElementById('f-type').value;
      const body = {
        nom:          document.getElementById('f-nom').value.trim(),
        type,
        solde_initial: parseFloat(document.getElementById('f-solde').value) || 0,
        description:  document.getElementById('f-desc').value.trim() || null,
        nom_banque:   type === 'BANQUE' ? (document.getElementById('f-nom-banque').value.trim() || null) : null,
        numero_compte: type === 'BANQUE' ? (document.getElementById('f-numero').value.trim() || null) : null,
        iban:         type === 'BANQUE' ? (document.getElementById('f-iban').value.trim() || null) : null,
        bic:          type === 'BANQUE' ? (document.getElementById('f-bic').value.trim() || null) : null,
      };
      try {
        if (isEdit) await api(`/comptes/${compte.id}`, { method: 'PUT', body });
        else await api('/comptes', { method: 'POST', body });
        toast(isEdit ? 'Compte modifié' : 'Compte créé');
        closeModal();
        load();
      } catch (e) { toast(e.message, 'error'); }
    });
  }

  await load();
}
