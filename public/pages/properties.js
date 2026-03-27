async function renderPropertiesPage(container) {
  async function load() {
    try {
      const props = await api('/properties');
      render(props);
    } catch (e) {
      container.innerHTML = `<p class="text-muted">${e.message}</p>`;
    }
  }

  function render(props) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">Propriétés</div>
          <div class="page-subtitle">${props.length} propriété${props.length !== 1 ? 's' : ''}</div>
        </div>
        <button class="btn btn-primary" id="add-prop-btn">+ Ajouter une propriété</button>
      </div>
      <div class="card">
        <table>
          <thead><tr>
            <th>Nom</th><th>Type</th><th>Adresse</th><th>Appartements</th><th>Créé le</th><th></th>
          </tr></thead>
          <tbody>
            ${props.length ? props.map(p => `
              <tr>
                <td><strong>${p.name}</strong></td>
                <td><span class="badge badge-${p.type.toLowerCase()}">${p.type === 'BUILDING' ? 'Immeuble' : 'Indépendant'}</span></td>
                <td class="text-muted">${p.address || '—'}</td>
                <td>
                  <button class="btn btn-ghost btn-sm view-units-btn" data-id="${p.id}" data-name="${p.name}" title="Voir les appartements">
                    🚪 ${p.unit_count}
                  </button>
                </td>
                <td class="text-muted">${fmtDate(p.created_at)}</td>
                <td style="text-align:right;white-space:nowrap">
                  <button class="btn btn-ghost btn-sm edit-prop-btn" data-id="${p.id}">Modifier</button>
                  <button class="btn btn-danger btn-sm del-prop-btn" data-id="${p.id}" data-name="${p.name}">Supprimer</button>
                </td>
              </tr>`).join('')
        : '<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">🏘️</div><p>Aucune propriété. Ajoutez-en une !</p></div></td></tr>'}
          </tbody>
        </table>
      </div>
    `;

    document.getElementById('add-prop-btn').addEventListener('click', () => showForm());

    container.querySelectorAll('.view-units-btn').forEach(btn => {
      btn.addEventListener('click', () => showUnits(Number(btn.dataset.id), btn.dataset.name));
    });

    container.querySelectorAll('.edit-prop-btn').forEach(btn => {
      btn.addEventListener('click', () => showForm(props.find(p => p.id == btn.dataset.id)));
    });

    container.querySelectorAll('.del-prop-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm(`Supprimer "${btn.dataset.name}" ? Tous les appartements et transactions liés seront aussi supprimés.`)) return;
        try {
          await api(`/properties/${btn.dataset.id}`, { method: 'DELETE' });
          toast('Propriété supprimée');
          load();
        } catch (e) { toast(e.message, 'error'); }
      });
    });
  }

  async function showUnits(propId, propName) {
    const units = await api(`/units?property_id=${propId}`);
    openModal(`
      <div class="modal-title">🚪 ${propName} — Appartements</div>
      <div style="margin-bottom:14px">
        ${units.length ? `
          <table style="width:100%;border-collapse:collapse">
            <thead><tr>
              <th style="text-align:left;padding:8px 4px;font-size:11px;color:var(--text-3);border-bottom:1px solid var(--border)">Nom</th>
              <th style="text-align:left;padding:8px 4px;font-size:11px;color:var(--text-3);border-bottom:1px solid var(--border)">Statut</th>
              <th style="text-align:right;padding:8px 4px;font-size:11px;color:var(--text-3);border-bottom:1px solid var(--border)">Loyer / mois</th>
              <th style="border-bottom:1px solid var(--border)"></th>
            </tr></thead>
            <tbody>
              ${units.map(u => `
                <tr>
                  <td style="padding:9px 4px"><strong>${u.label}</strong></td>
                  <td style="padding:9px 4px"><span class="badge badge-${u.status.toLowerCase()}">${u.status === 'OCCUPIED' ? 'Occupé' : 'Vacant'}</span></td>
                  <td style="padding:9px 4px;text-align:right">${fmtMoney(u.expected_rent)}</td>
                  <td style="padding:9px 4px;text-align:right">
                    <button class="btn btn-danger btn-sm del-unit-inline" data-id="${u.id}" data-label="${u.label}">✕</button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>` : '<p class="text-muted" style="font-size:13px;margin-bottom:12px">Aucun appartement pour l\'instant.</p>'}
      </div>
      <div style="border-top:1px solid var(--border);padding-top:16px">
        <div style="font-size:13px;font-weight:600;margin-bottom:12px">+ Ajouter un appartement</div>
        <form id="quick-unit-form">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Nom *</label>
              <input class="form-control" id="qu-label" placeholder="ex. Appt 3B" required />
            </div>
            <div class="form-group">
              <label class="form-label">Loyer mensuel (€)</label>
              <input class="form-control" id="qu-rent" type="number" min="0" step="0.01" value="0" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Statut</label>
            <select class="form-control" id="qu-status">
              <option value="VACANT">Vacant</option>
              <option value="OCCUPIED">Occupé</option>
            </select>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-ghost" onclick="closeModal()">Fermer</button>
            <button type="submit" class="btn btn-primary">Ajouter</button>
          </div>
        </form>
      </div>
    `);

    // Delete unit inline
    document.querySelectorAll('.del-unit-inline').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm(`Supprimer l'appartement "${btn.dataset.label}" ?`)) return;
        await api(`/units/${btn.dataset.id}`, { method: 'DELETE' });
        toast('Appartement supprimé');
        showUnits(propId, propName);
        load();
      });
    });

    // Add unit
    document.getElementById('quick-unit-form').addEventListener('submit', async e => {
      e.preventDefault();
      const body = {
        property_id: propId,
        label: document.getElementById('qu-label').value.trim(),
        status: document.getElementById('qu-status').value,
        expected_rent: parseFloat(document.getElementById('qu-rent').value) || 0,
      };
      try {
        await api('/units', { method: 'POST', body });
        toast('Appartement ajouté');
        showUnits(propId, propName);
        load();
      } catch (e) { toast(e.message, 'error'); }
    });
  }

  function showForm(prop = null) {
    const isEdit = !!prop;
    openModal(`
      <div class="modal-title">${isEdit ? 'Modifier la propriété' : 'Nouvelle propriété'}</div>
      <form id="prop-form">
        <div class="form-group">
          <label class="form-label">Nom *</label>
          <input class="form-control" id="f-name" value="${prop?.name || ''}" placeholder="ex. Immeuble Rue de la Paix" required />
        </div>
        ${!isEdit ? `<div class="form-group">
          <label class="form-label">Type *</label>
          <select class="form-control" id="f-type">
            <option value="BUILDING">Immeuble — plusieurs appartements</option>
            <option value="STANDALONE">Indépendant — un seul logement (créé automatiquement)</option>
          </select>
        </div>` : ''}
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Adresse</label>
            <input class="form-control" id="f-address" value="${prop?.address || ''}" placeholder="Optionnel" />
          </div>
          <div class="form-group">
            <label class="form-label">Solde initial de caisse (€)</label>
            <input class="form-control" id="f-caisse" type="number" min="0" step="0.01" value="${prop?.solde_initial_caisse || 0}" placeholder="0.00" />
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" onclick="closeModal()">Annuler</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Enregistrer' : 'Créer'}</button>
        </div>
      </form>
    `);

    document.getElementById('prop-form').addEventListener('submit', async e => {
      e.preventDefault();
      const body = {
        name: document.getElementById('f-name').value.trim(),
        address: document.getElementById('f-address').value.trim(),
        solde_initial_caisse: parseFloat(document.getElementById('f-caisse').value) || 0,
      };
      if (!isEdit) body.type = document.getElementById('f-type').value;
      try {
        if (isEdit) {
          await api(`/properties/${prop.id}`, { method: 'PUT', body });
          toast('Propriété modifiée');
        } else {
          await api('/properties', { method: 'POST', body });
          toast(`Propriété créée${body.type === 'STANDALONE' ? ' avec 1 appartement' : ''}`);
        }
        closeModal(); load();
      } catch (e) { toast(e.message, 'error'); }
    });
  }

  await load();
}
