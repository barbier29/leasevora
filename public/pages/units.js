async function renderUnitsPage(container) {
  const UNIT_TYPES = {
    APPARTEMENT:      { label: 'Appartement',     icon: '🚪' },
    STUDIO:           { label: 'Studio',           icon: '🛋️' },
    LOCAL_COMMERCIAL: { label: 'Local commercial', icon: '🏪' },
    MAISON:           { label: 'Maison',           icon: '🏡' },
    BUREAU:           { label: 'Bureau',           icon: '🖥️' },
    PARKING:          { label: 'Parking',          icon: '🅿️' },
    AUTRE:            { label: 'Autre',            icon: '📦' },
  };

  async function load() {
    try {
      const [units, props] = await Promise.all([api('/units'), api('/properties')]);
      render(units, props);
    } catch (e) {
      container.innerHTML = `<p class="text-muted">${e.message}</p>`;
    }
  }

  function render(units, props) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">Appartements & Locaux</div>
          <div class="page-subtitle">${units.length} bien${units.length !== 1 ? 's' : ''}</div>
        </div>
        <button class="btn btn-primary" id="add-unit-btn">+ Ajouter un bien</button>
      </div>
      <div class="card">
        <table>
          <thead><tr>
            <th>Nom</th><th>Type</th><th>Propriété</th><th>Détails</th><th>Statut</th><th>Loyer mensuel</th><th></th>
          </tr></thead>
          <tbody>
            ${units.length ? units.map(u => {
              const t = UNIT_TYPES[u.type] || UNIT_TYPES.APPARTEMENT;
              const specs = [
                u.nb_pieces  ? `${u.nb_pieces} pièce${u.nb_pieces > 1 ? 's' : ''}` : null,
                u.surface    ? `${u.surface} m²` : null,
                u.etage != null ? `Étage ${u.etage}` : null,
              ].filter(Boolean).join(' · ');
              return `
              <tr>
                <td><strong>${u.label}</strong>${u.description ? `<div style="font-size:11px;color:var(--text-3);margin-top:2px">${u.description}</div>` : ''}</td>
                <td><span style="font-size:13px">${t.icon} ${t.label}</span></td>
                <td class="text-muted">${u.property_name}</td>
                <td class="text-muted" style="font-size:12px">${specs || '—'}</td>
                <td><span class="badge badge-${u.status.toLowerCase()}">${u.status === 'OCCUPIED' ? 'Occupé' : 'Vacant'}</span></td>
                <td>${fmtMoney(u.expected_rent)}</td>
                <td style="text-align:right">
                  <button class="btn btn-ghost btn-sm edit-unit-btn" data-id="${u.id}">Modifier</button>
                  <button class="btn btn-danger btn-sm del-unit-btn" data-id="${u.id}" data-label="${u.label}">Supprimer</button>
                </td>
              </tr>`;
            }).join('')
          : `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">🚪</div><p>Aucun bien. Ajoutez une propriété ou un bien.</p></div></td></tr>`}
          </tbody>
        </table>
      </div>
    `;

    document.getElementById('add-unit-btn').addEventListener('click', () => showForm(null, props));
    container.querySelectorAll('.edit-unit-btn').forEach(btn => {
      btn.addEventListener('click', () => showForm(units.find(u => u.id == btn.dataset.id), props));
    });
    container.querySelectorAll('.del-unit-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm(`Supprimer "${btn.dataset.label}" ?`)) return;
        try {
          await api(`/units/${btn.dataset.id}`, { method: 'DELETE' });
          toast('Bien supprimé'); load();
        } catch (e) { toast(e.message, 'error'); }
      });
    });
  }

  function showForm(unit = null, props = []) {
    const isEdit = !!unit;
    const sym = window.CURR?.symbol || '€';
    const UNIT_TYPES = {
      APPARTEMENT:      'Appartement',
      STUDIO:           'Studio',
      LOCAL_COMMERCIAL: 'Local commercial',
      MAISON:           'Maison',
      BUREAU:           'Bureau',
      PARKING:          'Parking',
      AUTRE:            'Autre',
    };

    openModal(`
      <div class="modal-title">${isEdit ? 'Modifier le bien' : 'Nouveau bien'}</div>
      <form id="unit-form">
        <div class="form-group">
          <label class="form-label">Propriété *</label>
          <select class="form-control" id="f-prop" ${isEdit ? 'disabled' : ''} required>
            <option value="">Sélectionner une propriété…</option>
            ${props.map(p => `<option value="${p.id}" ${unit?.property_id == p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Nom *</label>
            <input class="form-control" id="f-label" value="${unit?.label || ''}" placeholder="ex. Appt 3B, Local A" required />
          </div>
          <div class="form-group">
            <label class="form-label">Type *</label>
            <select class="form-control" id="f-type">
              ${Object.entries(UNIT_TYPES).map(([k, v]) =>
                `<option value="${k}" ${(unit?.type || 'APPARTEMENT') === k ? 'selected' : ''}>${v}</option>`
              ).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Statut</label>
            <select class="form-control" id="f-status">
              <option value="VACANT"   ${unit?.status === 'VACANT'   ? 'selected' : ''}>Vacant</option>
              <option value="OCCUPIED" ${unit?.status === 'OCCUPIED' ? 'selected' : ''}>Occupé</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Loyer mensuel (${sym})</label>
            <input class="form-control" id="f-rent" type="number" min="0" step="0.01" value="${unit?.expected_rent || 0}" />
          </div>
        </div>
        <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--text-3);margin:16px 0 10px">Spécifications</div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Nb de pièces</label>
            <input class="form-control" id="f-pieces" type="number" min="0" step="1" value="${unit?.nb_pieces ?? ''}" placeholder="ex. 3" />
          </div>
          <div class="form-group">
            <label class="form-label">Surface (m²)</label>
            <input class="form-control" id="f-surface" type="number" min="0" step="0.1" value="${unit?.surface ?? ''}" placeholder="ex. 65" />
          </div>
          <div class="form-group" id="f-etage-group">
            <label class="form-label">Étage</label>
            <input class="form-control" id="f-etage" type="number" step="1" value="${unit?.etage ?? ''}" placeholder="ex. 2" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Description / notes</label>
          <textarea class="form-control" id="f-desc" rows="2" placeholder="Balcon, parking inclus, vue dégagée…">${unit?.description || ''}</textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" onclick="closeModal()">Annuler</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Enregistrer' : 'Créer'}</button>
        </div>
      </form>
    `);

    // Masquer "Étage" pour parking
    const typeEl = document.getElementById('f-type');
    const etageGroup = document.getElementById('f-etage-group');
    function updateEtageVisibility() {
      etageGroup.style.display = typeEl.value === 'PARKING' ? 'none' : '';
    }
    updateEtageVisibility();
    typeEl.addEventListener('change', updateEtageVisibility);

    document.getElementById('unit-form').addEventListener('submit', async e => {
      e.preventDefault();
      const body = {
        property_id: isEdit ? unit.property_id : document.getElementById('f-prop').value,
        label:       document.getElementById('f-label').value.trim(),
        type:        document.getElementById('f-type').value,
        status:      document.getElementById('f-status').value,
        expected_rent: parseFloat(document.getElementById('f-rent').value) || 0,
        nb_pieces:   document.getElementById('f-pieces').value || null,
        surface:     document.getElementById('f-surface').value || null,
        etage:       document.getElementById('f-etage').value !== '' ? document.getElementById('f-etage').value : null,
        description: document.getElementById('f-desc').value.trim() || null,
      };
      try {
        if (isEdit) {
          await api(`/units/${unit.id}`, { method: 'PUT', body });
          toast('Bien modifié');
        } else {
          await api('/units', { method: 'POST', body });
          toast('Bien créé');
        }
        closeModal(); load();
      } catch (e) { toast(e.message, 'error'); }
    });
  }

  await load();
}
