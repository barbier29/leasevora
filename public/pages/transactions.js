async function renderTransactionsPage(container) {
  async function load() {
    try {
      const [txns, props, cats, units, sejours] = await Promise.all([
        api('/transactions'),
        api('/properties'),
        api('/categories'),
        api('/units'),
        api('/sejours').catch(() => []),
      ]);
      render(txns, props, cats, units, sejours);
    } catch (e) {
      container.innerHTML = `<p class="text-muted">${e.message}</p>`;
    }
  }

  const SOURCE_LABEL = { CAISSE: '🏦 Caisse', BANQUE: '🏛️ Banque' };

  function render(txns, props, cats, units, sejours) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">Transactions</div>
          <div class="page-subtitle">${txns.length} transaction${txns.length !== 1 ? 's' : ''}</div>
        </div>
        <button class="btn btn-primary" id="add-txn-btn">+ Ajouter une transaction</button>
      </div>
      <div class="card">
        <table>
          <thead><tr>
            <th>Date</th><th>Description</th><th>Type</th><th>Source</th><th>Catégorie</th><th>Propriété</th><th>Appartement</th><th class="text-right">Montant</th><th></th>
          </tr></thead>
          <tbody>
            ${txns.length ? txns.map(t => `
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
        : '<tr><td colspan="9"><div class="empty-state"><div class="empty-icon">💸</div><p>Aucune transaction.</p></div></td></tr>'}
          </tbody>
        </table>
      </div>
    `;

    document.getElementById('add-txn-btn').addEventListener('click', () => showForm(null, props, cats, units, sejours));
    container.querySelectorAll('.edit-txn-btn').forEach(btn => {
      btn.addEventListener('click', () => showForm(txns.find(t => t.id == btn.dataset.id), props, cats, units, sejours));
    });
    container.querySelectorAll('.del-txn-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Supprimer cette transaction ?')) return;
        try {
          await api(`/transactions/${btn.dataset.id}`, { method: 'DELETE' });
          toast('Transaction supprimée'); load();
        } catch (e) { toast(e.message, 'error'); }
      });
    });
  }

  async function showForm(txn = null, props = [], cats = [], units = [], sejours = []) {
    const isEdit = !!txn;
    const today = new Date().toISOString().slice(0, 10);
    const initUnits = txn ? await api(`/units?property_id=${txn.property_id}`) : [];

    // Smart default source: OUT → CAISSE, IN → BANQUE
    const defaultSource = txn?.source || (txn?.kind === 'OUT' ? 'CAISSE' : 'BANQUE');

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
            <label class="form-label">Source *</label>
            <select class="form-control" id="f-source">
              <option value="CAISSE" ${defaultSource === 'CAISSE' ? 'selected' : ''}>🏦 Caisse — trésorerie opérationnelle</option>
              <option value="BANQUE" ${defaultSource === 'BANQUE' ? 'selected' : ''}>🏛️ Banque — compte bancaire dédié</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Montant (${window.CURR?.symbol || '€'}) *</label>
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
              ${cats.map(c => `<option value="${c.id}" ${txn?.category_id == c.id ? 'selected' : ''}>${c.name} (${c.kind === 'IN' ? 'Recette' : 'Dépense'})</option>`).join('')}
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

    // Mise à jour automatique source selon type
    document.getElementById('f-kind').addEventListener('change', e => {
      document.getElementById('f-source').value = e.target.value === 'OUT' ? 'CAISSE' : 'BANQUE';
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
        source: document.getElementById('f-source').value,
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
