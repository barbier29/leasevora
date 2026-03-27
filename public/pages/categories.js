async function renderCategoriesPage(container) {
  async function load() {
    try {
      const cats = await api('/categories');
      render(cats);
    } catch (e) {
      container.innerHTML = `<p class="text-muted">${e.message}</p>`;
    }
  }

  function render(cats) {
    const inCats = cats.filter(c => c.kind === 'IN');
    const outCats = cats.filter(c => c.kind === 'OUT');

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">Catégories</div>
          <div class="page-subtitle">${cats.length} catégorie${cats.length !== 1 ? 's' : ''}</div>
        </div>
        <button class="btn btn-primary" id="add-cat-btn">+ Ajouter une catégorie</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        ${[['IN', 'Recettes', inCats, '💚'], ['OUT', 'Dépenses', outCats, '🔴']].map(([kind, label, list, icon]) => `
          <div class="card">
            <div class="card-header">
              <span class="card-title">${icon} ${label}</span>
              <span class="badge badge-${kind.toLowerCase()}">${list.length}</span>
            </div>
            <table>
              <thead><tr><th>Nom</th><th></th></tr></thead>
              <tbody>
                ${list.length ? list.map(c => `
                  <tr>
                    <td>${c.name}</td>
                    <td style="text-align:right">
                      <button class="btn btn-ghost btn-sm edit-cat-btn" data-id="${c.id}">Modifier</button>
                      <button class="btn btn-danger btn-sm del-cat-btn" data-id="${c.id}" data-name="${c.name}">Supprimer</button>
                    </td>
                  </tr>`).join('')
        : `<tr><td colspan="2" class="text-muted" style="padding:20px;text-align:center">Aucune catégorie.</td></tr>`}
              </tbody>
            </table>
          </div>`).join('')}
      </div>
    `;

    document.getElementById('add-cat-btn').addEventListener('click', () => showForm());
    container.querySelectorAll('.edit-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => showForm(cats.find(c => c.id == btn.dataset.id)));
    });
    container.querySelectorAll('.del-cat-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm(`Supprimer la catégorie "${btn.dataset.name}" ?`)) return;
        try {
          await api(`/categories/${btn.dataset.id}`, { method: 'DELETE' });
          toast('Catégorie supprimée'); load();
        } catch (e) { toast(e.message, 'error'); }
      });
    });
  }

  function showForm(cat = null) {
    const isEdit = !!cat;
    openModal(`
      <div class="modal-title">${isEdit ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</div>
      <form id="cat-form">
        <div class="form-group">
          <label class="form-label">Nom *</label>
          <input class="form-control" id="f-name" value="${cat?.name || ''}" placeholder="ex. Charges de copropriété" required />
        </div>
        <div class="form-group">
          <label class="form-label">Type *</label>
          <select class="form-control" id="f-kind">
            <option value="IN"  ${cat?.kind === 'IN' ? 'selected' : ''}>Recette — argent entrant</option>
            <option value="OUT" ${cat?.kind === 'OUT' ? 'selected' : ''}>Dépense — argent sortant</option>
          </select>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" onclick="closeModal()">Annuler</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Enregistrer' : 'Créer'}</button>
        </div>
      </form>
    `);

    document.getElementById('cat-form').addEventListener('submit', async e => {
      e.preventDefault();
      const body = {
        name: document.getElementById('f-name').value.trim(),
        kind: document.getElementById('f-kind').value,
      };
      try {
        if (isEdit) { await api(`/categories/${cat.id}`, { method: 'PUT', body }); toast('Catégorie modifiée'); }
        else { await api('/categories', { method: 'POST', body }); toast('Catégorie créée'); }
        closeModal(); load();
      } catch (e) { toast(e.message, 'error'); }
    });
  }

  await load();
}
