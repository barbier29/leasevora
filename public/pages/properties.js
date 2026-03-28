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
            <th>Nom</th><th>Type</th><th>Adresse</th><th>Spécifications</th><th>Biens</th><th>Créé le</th><th></th>
          </tr></thead>
          <tbody>
            ${props.length ? props.map(p => {
              const specs = [
                p.surface_totale     ? `${p.surface_totale} m²`        : null,
                p.nb_etages          ? `${p.nb_etages} étage${p.nb_etages > 1 ? 's' : ''}` : null,
                p.annee_construction ? `Construit en ${p.annee_construction}` : null,
              ].filter(Boolean).join(' · ');
              return `
              <tr>
                <td>
                  <strong>${p.name}</strong>
                  ${p.description ? `<div style="font-size:11px;color:var(--text-3);margin-top:2px">${p.description}</div>` : ''}
                </td>
                <td><span class="badge badge-${p.type.toLowerCase()}">${p.type === 'BUILDING' ? 'Immeuble' : 'Indépendant'}</span></td>
                <td class="text-muted">${p.address || '—'}</td>
                <td class="text-muted" style="font-size:12px">${specs || '—'}</td>
                <td>
                  <button class="btn btn-ghost btn-sm view-units-btn" data-id="${p.id}" data-name="${p.name}" title="Voir les biens">
                    🚪 ${p.unit_count}
                  </button>
                </td>
                <td class="text-muted">${fmtDate(p.created_at)}</td>
                <td style="text-align:right;white-space:nowrap">
                  <button class="btn btn-ghost btn-sm edit-prop-btn" data-id="${p.id}">Modifier</button>
                  <button class="btn btn-danger btn-sm del-prop-btn" data-id="${p.id}" data-name="${p.name}">Supprimer</button>
                </td>
              </tr>`;
            }).join('')
          : '<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">🏘️</div><p>Aucune propriété. Ajoutez-en une !</p></div></td></tr>'}
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
        if (!confirm(`Supprimer "${btn.dataset.name}" ? Tous les biens et transactions liés seront aussi supprimés.`)) return;
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
    const sym = window.CURR?.symbol || '€';
    const UNIT_TYPE_LABELS = {
      APPARTEMENT: 'Appartement', STUDIO: 'Studio',
      LOCAL_COMMERCIAL: 'Local commercial', MAISON: 'Maison',
      BUREAU: 'Bureau', PARKING: 'Parking', AUTRE: 'Autre',
    };
    openModal(`
      <div class="modal-title">🚪 ${propName} — Biens</div>
      <div style="margin-bottom:14px">
        ${units.length ? `
          <table style="width:100%;border-collapse:collapse">
            <thead><tr>
              <th style="text-align:left;padding:8px 4px;font-size:11px;color:var(--text-3);border-bottom:1px solid var(--border)">Nom</th>
              <th style="text-align:left;padding:8px 4px;font-size:11px;color:var(--text-3);border-bottom:1px solid var(--border)">Type</th>
              <th style="text-align:left;padding:8px 4px;font-size:11px;color:var(--text-3);border-bottom:1px solid var(--border)">Statut</th>
              <th style="text-align:right;padding:8px 4px;font-size:11px;color:var(--text-3);border-bottom:1px solid var(--border)">Loyer / mois</th>
              <th style="border-bottom:1px solid var(--border)"></th>
            </tr></thead>
            <tbody>
              ${units.map(u => {
                const specs = [
                  u.nb_pieces ? `${u.nb_pieces}P` : null,
                  u.surface   ? `${u.surface}m²`  : null,
                  u.etage != null ? `Ét.${u.etage}` : null,
                ].filter(Boolean).join(' ');
                return `
                <tr>
                  <td style="padding:9px 4px">
                    <strong>${u.label}</strong>
                    ${specs ? `<span style="font-size:11px;color:var(--text-3);margin-left:6px">${specs}</span>` : ''}
                  </td>
                  <td style="padding:9px 4px;font-size:12px;color:var(--text-2)">${UNIT_TYPE_LABELS[u.type] || u.type}</td>
                  <td style="padding:9px 4px"><span class="badge badge-${u.status.toLowerCase()}">${u.status === 'OCCUPIED' ? 'Occupé' : 'Vacant'}</span></td>
                  <td style="padding:9px 4px;text-align:right">${fmtMoney(u.expected_rent)}</td>
                  <td style="padding:9px 4px;text-align:right">
                    <button class="btn btn-danger btn-sm del-unit-inline" data-id="${u.id}" data-label="${u.label}">✕</button>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>` : '<p class="text-muted" style="font-size:13px;margin-bottom:12px">Aucun bien pour l\'instant.</p>'}
      </div>
      <div style="border-top:1px solid var(--border);padding-top:16px">
        <div style="font-size:13px;font-weight:600;margin-bottom:12px">+ Ajouter un bien</div>
        <form id="quick-unit-form">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Nom *</label>
              <input class="form-control" id="qu-label" placeholder="ex. Appt 3B, Local A" required />
            </div>
            <div class="form-group">
              <label class="form-label">Type</label>
              <select class="form-control" id="qu-type">
                <option value="APPARTEMENT">Appartement</option>
                <option value="STUDIO">Studio</option>
                <option value="LOCAL_COMMERCIAL">Local commercial</option>
                <option value="MAISON">Maison</option>
                <option value="BUREAU">Bureau</option>
                <option value="PARKING">Parking</option>
                <option value="AUTRE">Autre</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Loyer mensuel (${sym})</label>
              <input class="form-control" id="qu-rent" type="number" min="0" step="0.01" value="0" />
            </div>
            <div class="form-group">
              <label class="form-label">Surface (m²)</label>
              <input class="form-control" id="qu-surface" type="number" min="0" step="0.1" placeholder="Optionnel" />
            </div>
            <div class="form-group">
              <label class="form-label">Nb pièces</label>
              <input class="form-control" id="qu-pieces" type="number" min="0" step="1" placeholder="Optionnel" />
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

    document.querySelectorAll('.del-unit-inline').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm(`Supprimer "${btn.dataset.label}" ?`)) return;
        await api(`/units/${btn.dataset.id}`, { method: 'DELETE' });
        toast('Bien supprimé');
        showUnits(propId, propName);
        load();
      });
    });

    document.getElementById('quick-unit-form').addEventListener('submit', async e => {
      e.preventDefault();
      const body = {
        property_id: propId,
        label:       document.getElementById('qu-label').value.trim(),
        type:        document.getElementById('qu-type').value,
        status:      document.getElementById('qu-status').value,
        expected_rent: parseFloat(document.getElementById('qu-rent').value) || 0,
        surface:     document.getElementById('qu-surface').value || null,
        nb_pieces:   document.getElementById('qu-pieces').value || null,
      };
      try {
        await api('/units', { method: 'POST', body });
        toast('Bien ajouté');
        showUnits(propId, propName);
        load();
      } catch (e) { toast(e.message, 'error'); }
    });
  }

  function showForm(prop = null) {
    const isEdit = !!prop;
    const sym = window.CURR?.symbol || '€';
    openModal(`
      <div class="modal-title">${isEdit ? 'Modifier la propriété' : 'Nouvelle propriété'}</div>
      <form id="prop-form">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Nom *</label>
            <input class="form-control" id="f-name" value="${prop?.name || ''}" placeholder="ex. Immeuble Rue de la Paix" required />
          </div>
          ${!isEdit ? `
          <div class="form-group">
            <label class="form-label">Type *</label>
            <select class="form-control" id="f-type">
              <option value="BUILDING">Immeuble — plusieurs biens</option>
              <option value="STANDALONE">Indépendant — un seul logement</option>
            </select>
          </div>` : ''}
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Adresse</label>
            <input class="form-control" id="f-address" value="${prop?.address || ''}" placeholder="Optionnel" />
          </div>
          <div class="form-group">
            <label class="form-label">Solde initial de caisse (${sym})</label>
            <input class="form-control" id="f-caisse" type="number" min="0" step="0.01" value="${prop?.solde_initial_caisse || 0}" />
          </div>
        </div>
        <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--text-3);margin:16px 0 10px">Spécifications</div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Surface totale (m²)</label>
            <input class="form-control" id="f-surface" type="number" min="0" step="1" value="${prop?.surface_totale ?? ''}" placeholder="ex. 850" />
          </div>
          <div class="form-group" id="f-etages-group">
            <label class="form-label">Nombre d'étages</label>
            <input class="form-control" id="f-etages" type="number" min="0" step="1" value="${prop?.nb_etages ?? ''}" placeholder="ex. 5" />
          </div>
          <div class="form-group">
            <label class="form-label">Année de construction</label>
            <input class="form-control" id="f-annee" type="number" min="1800" max="2100" step="1" value="${prop?.annee_construction ?? ''}" placeholder="ex. 1985" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Description / notes</label>
          <textarea class="form-control" id="f-desc" rows="2" placeholder="Gardien, ascenseur, parking souterrain…">${prop?.description || ''}</textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" onclick="closeModal()">Annuler</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Enregistrer' : 'Créer'}</button>
        </div>
      </form>
    `);

    // Masquer nb_etages pour STANDALONE
    if (!isEdit) {
      const typeEl = document.getElementById('f-type');
      const etagesGroup = document.getElementById('f-etages-group');
      function updateEtagesVisibility() {
        etagesGroup.style.display = typeEl.value === 'STANDALONE' ? 'none' : '';
      }
      updateEtagesVisibility();
      typeEl.addEventListener('change', updateEtagesVisibility);
    }

    document.getElementById('prop-form').addEventListener('submit', async e => {
      e.preventDefault();
      const body = {
        name:               document.getElementById('f-name').value.trim(),
        address:            document.getElementById('f-address').value.trim(),
        solde_initial_caisse: parseFloat(document.getElementById('f-caisse').value) || 0,
        surface_totale:     document.getElementById('f-surface').value || null,
        nb_etages:          document.getElementById('f-etages')?.value || null,
        annee_construction: document.getElementById('f-annee').value || null,
        description:        document.getElementById('f-desc').value.trim() || null,
      };
      if (!isEdit) body.type = document.getElementById('f-type').value;
      try {
        if (isEdit) {
          await api(`/properties/${prop.id}`, { method: 'PUT', body });
          toast('Propriété modifiée');
        } else {
          await api('/properties', { method: 'POST', body });
          toast(`Propriété créée${body.type === 'STANDALONE' ? ' avec 1 bien' : ''}`);
        }
        closeModal(); load();
      } catch (e) { toast(e.message, 'error'); }
    });
  }

  await load();
}
