async function renderTransactionsPage(container) {
  let _allTxns = [];
  let _props = [], _cats = [], _units = [], _sejours = [];

  async function load() {
    try {
      const [txns, props, cats, units, sejours] = await Promise.all([
        api('/transactions'),
        api('/properties'),
        api('/categories'),
        api('/units'),
        api('/sejours').catch(() => []),
      ]);
      _allTxns = txns;
      _props = props; _cats = cats; _units = units; _sejours = sejours;
      render(txns, props, cats, units, sejours);
    } catch (e) {
      container.innerHTML = `<p class="text-muted">${e.message}</p>`;
    }
  }

  function applyFilters() {
    const kind = document.getElementById('filter-kind')?.value || '';
    const cat = document.getElementById('filter-cat')?.value || '';
    const minVal = parseFloat(document.getElementById('filter-min')?.value) || 0;
    const maxVal = parseFloat(document.getElementById('filter-max')?.value) || Infinity;
    const filtered = _allTxns.filter(t => {
      if (kind && t.kind !== kind) return false;
      if (cat && String(t.category_id) !== cat) return false;
      if (t.amount < minVal) return false;
      if (t.amount > maxVal) return false;
      return true;
    });
    renderTable(filtered);
  }

  const SOURCE_LABEL = { CAISSE: '🏦 Caisse', BANQUE: '🏛️ Banque' };

  function renderTable(txns) {
    const tbody = document.getElementById('txn-tbody');
    if (!tbody) return;
    tbody.innerHTML = txns.length ? txns.map(t => `
      <tr>
        <td class="text-muted">${fmtDate(t.date)}</td>
        <td>${t.description || '—'}</td>
        <td><span class="badge badge-${t.kind.toLowerCase()}">${t.kind === 'IN' ? 'Recette' : 'Dépense'}</span></td>
        <td><span class="badge ${t.source === 'CAISSE' ? 'badge-building' : 'badge-standalone'}">${SOURCE_LABEL[t.source] || t.source}</span></td>
        <td class="text-muted">${t.category_name}</td>
        <td class="text-muted">${t.property_name}</td>
        <td class="text-muted">${t.unit_label || '<span style="font-style:italic;color:var(--text-3)">Tout l\'immeuble</span>'}${t.sejour_id ? `<br><small style="color:var(--accent);font-size:10px">🔗 Séjour #${t.sejour_id}</small>` : ''}</td>
        <td class="text-right ${t.kind === 'IN' ? 'amount-in' : 'amount-out'}">${t.kind === 'IN' ? '+' : '-'}${fmtMoney(t.amount)}</td>
        <td style="text-align:right;white-space:nowrap">
          <button class="btn btn-ghost btn-sm edit-txn-btn" data-id="${t.id}">Modifier</button>
          <button class="btn btn-danger btn-sm del-txn-btn" data-id="${t.id}">✕</button>
        </td>
      </tr>`).join('')
      : '<tr><td colspan="9"><div class="empty-state"><div class="empty-icon">💸</div><p>Aucune transaction.</p></div></td></tr>';

    tbody.querySelectorAll('.edit-txn-btn').forEach(btn => {
      btn.addEventListener('click', () => showForm(_allTxns.find(t => t.id == btn.dataset.id), _props, _cats, _units, _sejours));
    });
    tbody.querySelectorAll('.del-txn-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Supprimer cette transaction ?')) return;
        try {
          await api(`/transactions/${btn.dataset.id}`, { method: 'DELETE' });
          toast('Transaction supprimée'); load();
        } catch (e) { toast(e.message, 'error'); }
      });
    });
  }

  function render(txns, props, cats, units, sejours) {
    const catOptions = cats.map(c => `<option value="${c.id}">${c.kind === 'IN' ? '↑' : '↓'} ${c.name}</option>`).join('');
    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">Transactions</div>
          <div class="page-subtitle">${txns.length} transaction${txns.length !== 1 ? 's' : ''}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <select class="form-control" id="filter-kind" style="width:130px;height:36px">
            <option value="">Ent. &amp; Sort.</option>
            <option value="IN">Entrées</option>
            <option value="OUT">Sorties</option>
          </select>
          <select class="form-control" id="filter-cat" style="width:190px;height:36px">
            <option value="">Toutes catégories</option>
            ${catOptions}
          </select>
          <input class="form-control" id="filter-min" type="number" placeholder="Min" style="width:90px;height:36px" />
          <input class="form-control" id="filter-max" type="number" placeholder="Max" style="width:90px;height:36px" />
          <button class="btn btn-primary" id="add-txn-btn">+ Ajouter</button>
        </div>
      </div>
      <div class="card">
        <table>
          <thead><tr>
            <th>Date</th><th>Description</th><th>Type</th><th>Source</th><th>Catégorie</th><th>Propriété</th><th>Appartement</th><th class="text-right">Montant</th><th></th>
          </tr></thead>
          <tbody id="txn-tbody"></tbody>
        </table>
      </div>
    `;

    renderTable(txns);

    document.getElementById('add-txn-btn').addEventListener('click', () => showForm(null, props, cats, units, sejours));
    ['filter-kind','filter-cat','filter-min','filter-max'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', applyFilters);
      document.getElementById(id)?.addEventListener('change', applyFilters);
    });

    // Filtrer les catégories du filtre selon le type IN/OUT sélectionné
    document.getElementById('filter-kind')?.addEventListener('change', () => {
      const kindVal = document.getElementById('filter-kind').value;
      const catSelect = document.getElementById('filter-cat');
      const prevCat = catSelect.value;
      const filtered = kindVal ? cats.filter(c => c.kind === kindVal) : cats;
      catSelect.innerHTML = '<option value="">Toutes catégories</option>' +
        filtered.map(c => `<option value="${c.id}">${c.kind === 'IN' ? '↑' : '↓'} ${c.name}</option>`).join('');
      // Restaurer la sélection si elle est encore valide
      if (filtered.some(c => String(c.id) === prevCat)) {
        catSelect.value = prevCat;
      } else {
        catSelect.value = '';
      }
      applyFilters();
    });
  }

  async function showForm(txn = null, props = [], cats = [], units = [], sejours = []) {
    const isEdit = !!txn;
    const today = new Date().toISOString().slice(0, 10);
    const initUnits = txn ? await api(`/units?property_id=${txn.property_id}`) : [];

    openModal(`
      <div class="modal-title">${isEdit ? 'Modifier la transaction' : 'Nouvelle transaction'}</div>
      <form id="txn-form">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Date *</label>
            <input class="form-control" id="f-date" type="date" value="${txn?.date?.slice(0, 10) || today}" required />
          </div>
          <div class="form-group">
            <label class="form-label">Type *</label>
            <select class="form-control" id="f-kind">
              <option value="IN"  ${(!txn || txn.kind === 'IN') ? 'selected' : ''}>Recette (IN)</option>
              <option value="OUT" ${txn?.kind === 'OUT' ? 'selected' : ''}>Dépense (OUT)</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Compte *</label>
            <select class="form-control" id="f-compte">
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Montant (${window.CURR.symbol}) *</label>
            <input class="form-control" id="f-amount" type="number" min="0" step="0.01" value="${txn?.amount || ''}" required />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <input class="form-control" id="f-desc" value="${txn?.description || ''}" placeholder="Note optionnelle" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Catégorie *</label>
            <select class="form-control" id="f-cat" required>
              <option value="">Sélectionner…</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Propriété *</label>
            <select class="form-control" id="f-prop" required>
              <option value="">Sélectionner…</option>
              ${props.map(p => `<option value="${p.id}" ${txn?.property_id == p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Appartement <span style="color:var(--text-3)">(vide = tout l'immeuble)</span></label>
          <select class="form-control" id="f-unit">
            <option value="">— Tout l'immeuble —</option>
            ${initUnits.map(u => `<option value="${u.id}" ${txn?.unit_id == u.id ? 'selected' : ''}>${u.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Séjour lié (optionnel)</label>
          <select class="form-control" id="f-sejour">
            <option value="">— Aucun séjour lié —</option>
            ${sejours.map(s => `<option value="${s.id}" ${txn?.sejour_id == s.id ? 'selected' : ''}>${s.locataire} — ${s.unit_label || ''} (${fmtDate(s.date_debut)}${s.date_fin ? ' → ' + fmtDate(s.date_fin) : ''})</option>`).join('')}
          </select>
          <div style="font-size:11px;color:var(--text-3);margin-top:4px">Lier cette transaction au suivi des paiements d'un séjour</div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" onclick="closeModal()">Annuler</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Enregistrer' : 'Ajouter'}</button>
        </div>
      </form>
    `);

    // Fonction pour filtrer les catégories du formulaire selon le type IN/OUT
    function updateFormCategories(selectedKind, preserveSelection = false) {
      const catSelect = document.getElementById('f-cat');
      const prevVal = catSelect.value;
      const filtered = selectedKind ? cats.filter(c => c.kind === selectedKind) : cats;
      catSelect.innerHTML = '<option value="">Sélectionner…</option>' +
        filtered.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
      // Restaurer la sélection uniquement si elle est encore valide
      if (preserveSelection && filtered.some(c => String(c.id) === prevVal)) {
        catSelect.value = prevVal;
      }
    }

    // Filtrage initial des catégories selon le type courant
    const initialKind = document.getElementById('f-kind').value;
    updateFormCategories(initialKind, true);
    // Restaurer la sélection de catégorie si on est en mode édition
    if (txn?.category_id) {
      document.getElementById('f-cat').value = txn.category_id;
    }

    // Charger les comptes pour le sélecteur
    try {
      const comptes = await api('/comptes');
      const sel = document.getElementById('f-compte');
      if (sel) {
        sel.innerHTML = '';
        comptes.filter(c => c.actif !== false).forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.id;
          opt.textContent = `${c.type === 'CAISSE' ? '🏦' : '🏛️'} ${c.nom}`;
          sel.appendChild(opt);
        });
        // Restaurer la sélection si on est en mode édition
        if (txn?.compte_id) {
          sel.value = txn.compte_id;
        }
      }
    } catch {}

    // Mise à jour automatique catégories selon type
    document.getElementById('f-kind').addEventListener('change', e => {
      // Filtrer les catégories et réinitialiser la sélection
      updateFormCategories(e.target.value, false);
    });

    // Chargement des unités selon propriété
    document.getElementById('f-prop').addEventListener('change', async e => {
      const units = e.target.value ? await api(`/units?property_id=${e.target.value}`) : [];
      const sel = document.getElementById('f-unit');
      sel.innerHTML = '<option value="">— Tout l\'immeuble —</option>' +
        units.map(u => `<option value="${u.id}">${u.label}</option>`).join('');
    });

    document.getElementById('txn-form').addEventListener('submit', async e => {
      e.preventDefault();

      // Validation côté client
      const amountVal = parseFloat(document.getElementById('f-amount').value);
      const catVal = document.getElementById('f-cat').value;

      const amountField = document.getElementById('f-amount');
      let amountErr = amountField.parentElement.querySelector('.form-error');
      if (!amountErr) {
        amountErr = document.createElement('div');
        amountErr.className = 'form-error';
        amountField.parentElement.appendChild(amountErr);
      }

      const catField = document.getElementById('f-cat');
      let catErr = catField.parentElement.querySelector('.form-error');
      if (!catErr) {
        catErr = document.createElement('div');
        catErr.className = 'form-error';
        catField.parentElement.appendChild(catErr);
      }

      let hasError = false;
      if (!amountVal || amountVal <= 0) {
        amountErr.textContent = 'Le montant doit être supérieur à 0.';
        hasError = true;
      } else {
        amountErr.textContent = '';
      }
      if (!catVal) {
        catErr.textContent = 'Veuillez sélectionner une catégorie.';
        hasError = true;
      } else {
        catErr.textContent = '';
      }
      if (hasError) return;

      const body = {
        date: document.getElementById('f-date').value,
        description: document.getElementById('f-desc').value.trim(),
        kind: document.getElementById('f-kind').value,
        compte_id: parseInt(document.getElementById('f-compte').value) || 1,
        amount: parseFloat(document.getElementById('f-amount').value),
        category_id: parseInt(document.getElementById('f-cat').value),
        property_id: parseInt(document.getElementById('f-prop').value),
        unit_id: document.getElementById('f-unit').value ? parseInt(document.getElementById('f-unit').value) : null,
        sejour_id: document.getElementById('f-sejour').value ? Number(document.getElementById('f-sejour').value) : null,
      };
      try {
        let result;
        if (isEdit) {
          result = await api(`/transactions/${txn.id}`, { method: 'PUT', body });
          toast('Transaction modifiée');
        } else {
          result = await api('/transactions', { method: 'POST', body });
          toast('Transaction ajoutée');
        }

        // Dispatch événement global pour synchronisation
        window.dispatchEvent(new CustomEvent('nestio:transaction-saved', {
          detail: {
            transaction: result,
            unit_id: body.unit_id || null,
            date: body.date || null,
            kind: body.kind || null,
          }
        }));

        // Vérification auto séjour (seulement pour paiements entrants liés à un appartement)
        if (body.kind === 'IN' && body.unit_id) {
          try {
            const sejours = await window.api(`/sejours?unit_id=${body.unit_id}`);
            const txDate = new Date(body.date);
            const hasActiveSejour = sejours.some(s => {
              if (s.statut === 'ANNULE') return false;
              const debut = new Date(s.date_debut);
              const fin = s.date_fin ? new Date(s.date_fin) : null;
              // Séjour actif si la date de transaction est dans la période
              return debut <= txDate && (!fin || fin >= txDate);
            });

            if (!hasActiveSejour) {
              window.toast('💡 Aucun séjour actif pour ce logement à cette date — pensez à créer un séjour correspondant.', 'warning');
            }
          } catch {
            // Silencieux si erreur API
          }
        }

        // Auto-refresh calendrier si c'est la page active
        if (location.hash === '#calendrier' && typeof renderCalendrierPage === 'function') {
          setTimeout(() => {
            renderCalendrierPage(document.getElementById('page-content'));
          }, 300);
        }

        closeModal(); load();
      } catch (e) { toast(e.message, 'error'); }
    });
  }

  await load();
}
