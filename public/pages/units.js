async function renderUnitsPage(container) {
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
          <div class="page-title">Appartements</div>
          <div class="page-subtitle">${units.length} appartement${units.length !== 1 ? 's' : ''}</div>
        </div>
        <button class="btn btn-primary" id="add-unit-btn">+ Ajouter un appartement</button>
      </div>
      <div class="card">
        <table>
          <thead><tr>
            <th>Nom</th><th>Propriété</th><th>Statut</th><th>Loyer mensuel</th><th></th>
          </tr></thead>
          <tbody>
            ${units.length ? units.map(u => `
              <tr>
                <td><strong>${u.label}</strong></td>
                <td class="text-muted">${u.property_name}</td>
                <td><span class="badge badge-${u.status.toLowerCase()}">${u.status === 'OCCUPIED' ? 'Occupé' : 'Vacant'}</span></td>
                <td>${fmtMoney(u.expected_rent)}</td>
                <td style="text-align:right">
                  <button class="btn btn-ghost btn-sm edit-unit-btn" data-id="${u.id}">Modifier</button>
                  <button class="btn btn-danger btn-sm del-unit-btn" data-id="${u.id}" data-label="${u.label}">Supprimer</button>
                </td>
              </tr>`).join('')
        : '<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">🚪</div><p>Aucun appartement. Ajoutez une propriété ou un appartement.</p></div></td></tr>'}
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
        if (!confirm(`Supprimer l'appartement "${btn.dataset.label}" ?`)) return;
        try {
          await api(`/units/${btn.dataset.id}`, { method: 'DELETE' });
          toast('Appartement supprimé'); load();
        } catch (e) { toast(e.message, 'error'); }
      });
    });
  }

  function showForm(unit = null, props = []) {
    const isEdit = !!unit;
    openModal(`
      <div class="modal-title">${isEdit ? 'Modifier l\'appartement' : 'Nouvel appartement'}</div>
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
            <input class="form-control" id="f-label" value="${unit?.label || ''}" placeholder="ex. Appt 3B" required />
          </div>
          <div class="form-group">
            <label class="form-label">Statut</label>
            <select class="form-control" id="f-status">
              <option value="VACANT" ${unit?.status === 'VACANT' ? 'selected' : ''}>Vacant</option>
              <option value="OCCUPIED" ${unit?.status === 'OCCUPIED' ? 'selected' : ''}>Occupé</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Loyer mensuel attendu (€)</label>
          <input class="form-control" id="f-rent" type="number" min="0" step="0.01" value="${unit?.expected_rent || 0}" />
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" onclick="closeModal()">Annuler</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Enregistrer' : 'Créer'}</button>
        </div>
      </form>
    `);

    document.getElementById('unit-form').addEventListener('submit', async e => {
      e.preventDefault();
      const body = {
        property_id: isEdit ? unit.property_id : document.getElementById('f-prop').value,
        label: document.getElementById('f-label').value.trim(),
        status: document.getElementById('f-status').value,
        expected_rent: parseFloat(document.getElementById('f-rent').value) || 0,
      };
      try {
        if (isEdit) {
          await api(`/units/${unit.id}`, { method: 'PUT', body });
          toast('Appartement modifié');
        } else {
          await api('/units', { method: 'POST', body });
          toast('Appartement créé');
        }
        closeModal(); load();
      } catch (e) { toast(e.message, 'error'); }
    });
  }

  await load();
}
