// ── Suivi des Paiements ────────────────────────────────────────────────────

function renderPaiementsPage(container) {
  // ── Local state ──────────────────────────────────────────────────────────
  let _data = null;          // full API response
  let _tab  = 'debiteurs';   // active tab key
  let _search = '';          // search string
  let _expanded = new Set(); // expanded client ids

  // ── Helpers ──────────────────────────────────────────────────────────────
  function escHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getInitials(prenom, nom) {
    const a = (prenom || '').trim()[0] || '';
    const b = (nom   || '').trim()[0] || '';
    return (a + b).toUpperCase() || '?';
  }

  const AVATAR_COLORS = [
    '#6366f1','#8b5cf6','#ec4899','#f43f5e',
    '#f59e0b','#10b981','#06b6d4','#3b82f6',
  ];
  function avatarColor(id) {
    return AVATAR_COLORS[(id || 0) % AVATAR_COLORS.length];
  }

  // ── Fetch ─────────────────────────────────────────────────────────────────
  async function fetchData() {
    const qs = _tab === 'tous'     ? '' :
               _tab === 'debiteurs' ? '?statut=EN_ATTENTE,PARTIEL' :
               _tab === 'attente'   ? '?statut=EN_ATTENTE' :
               _tab === 'partiels'  ? '?statut=PARTIEL' :
               _tab === 'soldes'    ? '?statut=SOLDE' : '';
    return window.api('/paiements/suivi' + qs);
  }

  // ── Filter clients client-side ────────────────────────────────────────────
  function filteredClients() {
    if (!_data) return [];
    let list = _data.clients || [];

    // tab filter (server already filtered, but keep local guard)
    if (_tab === 'debiteurs') {
      list = list.filter(c => c.statut_global !== 'SOLDE');
    } else if (_tab === 'attente') {
      list = list.filter(c => c.statut_global === 'EN_ATTENTE');
    } else if (_tab === 'partiels') {
      list = list.filter(c => c.statut_global === 'PARTIEL');
    } else if (_tab === 'soldes') {
      list = list.filter(c => c.statut_global === 'SOLDE');
    }

    // search filter
    if (_search.trim()) {
      const q = _search.trim().toLowerCase();
      list = list.filter(c =>
        `${c.prenom} ${c.nom}`.toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q)
      );
    }

    // sort: debiteurs first
    list = [...list].sort((a, b) => {
      const order = { EN_ATTENTE: 0, PARTIEL: 1, SOLDE: 2 };
      return (order[a.statut_global] ?? 3) - (order[b.statut_global] ?? 3);
    });

    return list;
  }

  // ── Badge helpers ─────────────────────────────────────────────────────────
  function statusBadge(statut) {
    if (statut === 'EN_ATTENTE') return `<span class="badge badge-red">Impayé</span>`;
    if (statut === 'PARTIEL')    return `<span class="badge badge-orange">Partiel</span>`;
    if (statut === 'SOLDE')      return `<span class="badge badge-green">Soldé</span>`;
    return `<span class="badge">${escHtml(statut)}</span>`;
  }

  function sejourStatusBadge(statut) {
    if (statut === 'EN_ATTENTE') return `<span class="badge badge-red" style="font-size:10px">Impayé</span>`;
    if (statut === 'PARTIEL')    return `<span class="badge badge-orange" style="font-size:10px">Partiel</span>`;
    if (statut === 'SOLDE')      return `<span class="badge badge-green" style="font-size:10px">Soldé</span>`;
    return `<span class="badge" style="font-size:10px">${escHtml(statut)}</span>`;
  }

  // ── Render KPI banner ─────────────────────────────────────────────────────
  function renderKpis(s) {
    if (!s) return '';
    return `
    <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:24px">
      <div class="stat-card" style="border-color:rgba(244,63,94,0.25)">
        <div class="stat-icon" style="background:rgba(244,63,94,0.12)">💰</div>
        <div class="stat-info">
          <div class="stat-value" style="color:var(--red)">${window.fmtMoney(s.total_a_encaisser)}</div>
          <div class="stat-label">Total à encaisser</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:rgba(244,63,94,0.10)">🔴</div>
        <div class="stat-info">
          <div class="stat-value">${s.nb_clients_debiteurs}</div>
          <div class="stat-label">Clients débiteurs</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:rgba(245,158,11,0.10)">⏳</div>
        <div class="stat-info">
          <div class="stat-value">${s.nb_sejours_en_attente}</div>
          <div class="stat-label">Séjours en attente</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:rgba(245,158,11,0.10)">🟡</div>
        <div class="stat-info">
          <div class="stat-value">${s.nb_sejours_partiels}</div>
          <div class="stat-label">Séjours partiels</div>
        </div>
      </div>
    </div>`;
  }

  // ── Render expanded séjours ───────────────────────────────────────────────
  function renderExpandedRow(client) {
    const sejours = client.sejours || [];
    const rows = sejours.map(sej => {
      const hasSolde = sej.solde_restant > 0;
      const pmtList = (sej.paiements || []).map(p => `
        <div class="suivi-paiements-mini">
          <div class="mini-pmt">
            <span style="color:var(--text-3);min-width:88px">${window.fmtDate(p.date)}</span>
            <span style="color:var(--green);font-weight:600">${window.fmtMoney(p.amount)}</span>
            <span>${escHtml(p.description || '')}</span>
          </div>
        </div>`).join('');

      return `
      <tr>
        <td>
          <div style="font-size:12px;font-weight:600;color:var(--text-1)">${escHtml(sej.property_name)}</div>
          <div style="font-size:11px;color:var(--text-3)">${escHtml(sej.statut)}</div>
        </td>
        <td style="font-size:12px">${escHtml(sej.unit_label)}</td>
        <td style="font-size:12px;white-space:nowrap">
          ${window.fmtDate(sej.date_debut)}
          ${sej.date_fin ? `<span style="color:var(--text-3)"> → ${window.fmtDate(sej.date_fin)}</span>` : ''}
        </td>
        <td style="font-size:12px">${window.fmtMoney(sej.montant_total_du)}</td>
        <td style="font-size:12px;color:var(--green)">${window.fmtMoney(sej.montant_paye)}</td>
        <td class="${sej.solde_restant > 0 ? 'solde-due' : 'solde-positive'}" style="font-size:12px">
          ${window.fmtMoney(sej.solde_restant)}
        </td>
        <td>${sejourStatusBadge(sej.statut_paiement)}</td>
        <td>
          ${hasSolde ? `
          <button class="btn btn-sm btn-primary payer-sejour-btn"
            data-client-id="${client.id}"
            data-sejour-id="${sej.id}"
            style="font-size:11px;padding:4px 8px">
            💳
          </button>` : '<span style="color:var(--text-3);font-size:11px">—</span>'}
        </td>
      </tr>
      ${pmtList ? `
      <tr>
        <td colspan="8" style="padding:0 10px 10px 20px">
          <div style="font-size:11px;font-weight:600;color:var(--text-3);margin-bottom:4px">Paiements reçus :</div>
          ${pmtList}
        </td>
      </tr>` : ''}`;
    }).join('');

    return `
    <tr class="suivi-expand-row" data-expand-for="${client.id}">
      <td colspan="8">
        <div class="suivi-expand-inner">
          <table class="suivi-sejour-list">
            <thead>
              <tr>
                <th>Bien</th>
                <th>Appartement</th>
                <th>Période</th>
                <th>Total dû</th>
                <th>Payé</th>
                <th>Solde</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </td>
    </tr>`;
  }

  // ── Render client table ───────────────────────────────────────────────────
  function renderTable(clients) {
    if (!clients.length) {
      return `<div class="empty-state" style="padding:60px 20px">
        <div style="font-size:40px;margin-bottom:12px">✅</div>
        <div style="font-size:16px;font-weight:600;color:var(--text-1);margin-bottom:6px">Aucun résultat</div>
        <div style="font-size:13px;color:var(--text-2)">Aucun client ne correspond à votre filtre.</div>
      </div>`;
    }

    const rows = clients.map(client => {
      const isExpanded = _expanded.has(client.id);
      const hasSolde = client.solde > 0;
      const initials = getInitials(client.prenom, client.nom);
      const color = avatarColor(client.id);
      const contactLine = client.email
        ? `<div style="font-size:11px;color:var(--text-3)">${escHtml(client.email)}</div>`
        : client.tel
          ? `<div style="font-size:11px;color:var(--text-3)">${escHtml(client.tel)}</div>`
          : '';

      const mainRow = `
      <tr class="client-row${isExpanded ? ' expanded' : ''}" data-client-id="${client.id}">
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <div class="suivi-avatar" style="background:${color}">${escHtml(initials)}</div>
            <div>
              <div style="font-weight:600;font-size:13px;color:var(--text-1)">
                ${escHtml(client.prenom)} ${escHtml(client.nom)}
              </div>
              ${contactLine}
            </div>
          </div>
        </td>
        <td style="font-size:13px;color:var(--text-2)">
          ${client.nb_sejours} séjour${client.nb_sejours !== 1 ? 's' : ''}
        </td>
        <td style="font-size:13px">${window.fmtMoney(client.total_du)}</td>
        <td style="font-size:13px;color:var(--green)">${window.fmtMoney(client.total_paye)}</td>
        <td class="${client.solde > 0 ? 'solde-due' : 'solde-positive'}">
          ${window.fmtMoney(client.solde)}
        </td>
        <td>${statusBadge(client.statut_global)}</td>
        <td>
          <div style="display:flex;gap:6px;align-items:center">
            ${hasSolde ? `
            <button class="btn btn-sm btn-primary payer-btn"
              data-client-id="${client.id}"
              style="font-size:12px;padding:5px 10px">
              💳 Payer
            </button>` : ''}
            <button class="btn btn-sm btn-ghost expand-btn"
              data-client-id="${client.id}"
              style="font-size:12px;padding:5px 10px"
              title="${isExpanded ? 'Réduire' : 'Voir détails'}">
              ${isExpanded ? '▲' : '▼'}
            </button>
          </div>
        </td>
      </tr>`;

      const expandRow = isExpanded ? renderExpandedRow(client) : '';
      return mainRow + expandRow;
    }).join('');

    return `
    <table class="suivi-table">
      <thead>
        <tr>
          <th>Client</th>
          <th>Séjours</th>
          <th>Total dû</th>
          <th>Payé</th>
          <th>Solde</th>
          <th>Statut</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  // ── Payment modal ─────────────────────────────────────────────────────────
  function openPaymentModal(clientId, preselectedSejourId) {
    if (!_data) return;
    const client = (_data.clients || []).find(c => c.id === clientId);
    if (!client) return;

    const sejoursAvecSolde = (client.sejours || []).filter(s => s.solde_restant > 0);
    if (!sejoursAvecSolde.length) {
      window.toast('Ce client n\'a pas de solde restant.', 'info');
      return;
    }

    const selectedSejour = preselectedSejourId
      ? sejoursAvecSolde.find(s => s.id === preselectedSejourId) || sejoursAvecSolde[0]
      : sejoursAvecSolde[0];

    const today = new Date().toISOString().slice(0, 10);
    const clientName = `${escHtml(client.prenom)} ${escHtml(client.nom)}`;

    const sejourOptions = sejoursAvecSolde.map(s => `
      <option value="${s.id}"
        data-solde="${s.solde_restant}"
        data-desc="${escHtml('Paiement loyer — ' + s.unit_label)}"
        ${s.id === selectedSejour.id ? 'selected' : ''}>
        ${escHtml(s.property_name)} – ${escHtml(s.unit_label)}
        (${window.fmtDate(s.date_debut)} → ${s.date_fin ? window.fmtDate(s.date_fin) : '…'})
        — solde: ${window.fmtMoney(s.solde_restant)}
      </option>`).join('');

    const sejourSelect = sejoursAvecSolde.length > 1
      ? `<div class="form-group">
           <label class="form-label">Séjour</label>
           <select class="form-control" id="pmt-sejour-sel">${sejourOptions}</select>
         </div>`
      : `<input type="hidden" id="pmt-sejour-sel" value="${selectedSejour.id}" />
         <div class="form-group">
           <label class="form-label">Séjour</label>
           <div style="font-size:13px;color:var(--text-1);padding:8px 12px;background:var(--surface);border-radius:8px;border:1px solid var(--border)">
             ${escHtml(selectedSejour.property_name)} — ${escHtml(selectedSejour.unit_label)}<br>
             <span style="font-size:11px;color:var(--text-3)">
               ${window.fmtDate(selectedSejour.date_debut)}
               ${selectedSejour.date_fin ? ' → ' + window.fmtDate(selectedSejour.date_fin) : ''}
             </span>
           </div>
         </div>`;

    window.openModal(`
      <div style="max-width:460px">
        <h3 style="font-size:16px;font-weight:700;margin-bottom:4px">💳 Enregistrer un paiement</h3>
        <p style="font-size:13px;color:var(--text-2);margin-bottom:20px">${clientName}</p>

        <form id="pmt-form">
          ${sejourSelect}

          <div class="form-group">
            <label class="form-label">Montant</label>
            <input class="form-control" type="number" id="pmt-amount" step="0.01" min="0.01"
              value="${selectedSejour.solde_restant}" required />
          </div>

          <div class="form-group">
            <label class="form-label">Date</label>
            <input class="form-control" type="date" id="pmt-date" value="${today}" required />
          </div>

          <div class="form-group">
            <label class="form-label">Description</label>
            <input class="form-control" type="text" id="pmt-desc"
              value="Paiement loyer — ${escHtml(selectedSejour.unit_label)}" />
          </div>

          <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px">
            <button type="button" class="btn btn-ghost" id="pmt-cancel-btn">Annuler</button>
            <button type="submit" class="btn btn-primary" id="pmt-submit-btn">
              Enregistrer le paiement
            </button>
          </div>
        </form>
      </div>
    `);

    // Update amount & desc when sejour selection changes
    const selEl = document.getElementById('pmt-sejour-sel');
    if (selEl && selEl.tagName === 'SELECT') {
      selEl.addEventListener('change', () => {
        const opt = selEl.options[selEl.selectedIndex];
        document.getElementById('pmt-amount').value = opt.dataset.solde || '';
        document.getElementById('pmt-desc').value   = opt.dataset.desc  || '';
      });
    }

    document.getElementById('pmt-cancel-btn').addEventListener('click', window.closeModal);

    document.getElementById('pmt-form').addEventListener('submit', async e => {
      e.preventDefault();
      const submitBtn = document.getElementById('pmt-submit-btn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Enregistrement…';

      const sejourId = parseInt(
        (document.getElementById('pmt-sejour-sel') || {}).value, 10
      );
      const amount  = parseFloat(document.getElementById('pmt-amount').value);
      const date    = document.getElementById('pmt-date').value;
      const desc    = document.getElementById('pmt-desc').value;

      try {
        await window.api('/transactions', {
          method: 'POST',
          body: {
            kind: 'IN',
            amount,
            date,
            description: desc,
            sejour_id: sejourId,
            unit_id: null,
            property_id: null,
            category_id: null,
          },
        });
        window.closeModal();
        window.toast('Paiement enregistré ✓', 'success');
        await reloadAndRender();
      } catch (err) {
        window.toast('Erreur : ' + (err.message || 'impossible d\'enregistrer'), 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Enregistrer le paiement';
      }
    });
  }

  // ── Reload & re-render ────────────────────────────────────────────────────
  async function reloadAndRender() {
    try {
      _data = await fetchData();
    } catch (err) {
      window.toast('Erreur chargement : ' + (err.message || ''), 'error');
    }
    renderPage();
  }

  // ── Full page render ──────────────────────────────────────────────────────
  function renderPage() {
    const s = _data?.summary || {};
    const clients = filteredClients();
    const totalDebiteurs = s.total_a_encaisser != null ? window.fmtMoney(s.total_a_encaisser) : '—';
    const nbClients = _data?.clients?.length ?? 0;

    const tabs = [
      { key: 'tous',      label: 'Tous' },
      { key: 'debiteurs', label: 'Débiteurs' },
      { key: 'attente',   label: 'En attente' },
      { key: 'partiels',  label: 'Partiels' },
      { key: 'soldes',    label: 'Soldés' },
    ];

    const tabsHtml = tabs.map(t => `
      <button class="suivi-tab${_tab === t.key ? ' active' : ''}" data-tab="${t.key}">
        ${escHtml(t.label)}
      </button>`).join('');

    container.innerHTML = `
      <div class="page-header" style="margin-bottom:24px">
        <div>
          <h1 class="page-title">Suivi des Paiements</h1>
          <p class="page-subtitle">${nbClients} client${nbClients !== 1 ? 's' : ''} · ${totalDebiteurs} à encaisser</p>
        </div>
      </div>

      ${renderKpis(s)}

      <div class="card" style="padding:20px">
        <div class="suivi-filters">
          <div class="suivi-tabs">${tabsHtml}</div>
          <input class="form-control suivi-search"
            id="suivi-search-input"
            placeholder="Rechercher un client…"
            value="${escHtml(_search)}" />
        </div>

        <div id="suivi-table-wrap">
          ${renderTable(clients)}
        </div>
      </div>
    `;

    // ── Bind tab buttons ──
    container.querySelectorAll('.suivi-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        _tab = btn.dataset.tab;
        _expanded.clear();
        reloadAndRender();
      });
    });

    // ── Bind search ──
    const searchInput = document.getElementById('suivi-search-input');
    if (searchInput) {
      let debounceTimer;
      searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          _search = searchInput.value;
          renderPage();
        }, 200);
      });
      // Keep focus & caret at end after re-render
      searchInput.focus();
      searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
    }

    // ── Bind row expand ──
    container.querySelectorAll('tr.client-row').forEach(row => {
      row.addEventListener('click', e => {
        // Don't expand when clicking a button
        if (e.target.closest('button')) return;
        const id = parseInt(row.dataset.clientId, 10);
        toggleExpand(id);
      });
    });

    container.querySelectorAll('.expand-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.clientId, 10);
        toggleExpand(id);
      });
    });

    // ── Bind pay buttons (client-level) ──
    container.querySelectorAll('.payer-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        openPaymentModal(parseInt(btn.dataset.clientId, 10), null);
      });
    });

    // ── Bind pay buttons (sejour-level) ──
    container.querySelectorAll('.payer-sejour-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        openPaymentModal(
          parseInt(btn.dataset.clientId, 10),
          parseInt(btn.dataset.sejourId, 10)
        );
      });
    });
  }

  // ── Toggle expand ─────────────────────────────────────────────────────────
  function toggleExpand(clientId) {
    if (_expanded.has(clientId)) {
      _expanded.delete(clientId);
    } else {
      _expanded.add(clientId);
    }
    // Efficient re-render: only update the table wrap
    const clients = filteredClients();
    const wrap = document.getElementById('suivi-table-wrap');
    if (wrap) {
      wrap.innerHTML = renderTable(clients);
      bindTableEvents(wrap);
    }
    // Also update expand button labels / row classes
  }

  // ── Bind events inside table wrap (after partial re-render) ───────────────
  function bindTableEvents(wrap) {
    wrap.querySelectorAll('tr.client-row').forEach(row => {
      row.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        toggleExpand(parseInt(row.dataset.clientId, 10));
      });
    });
    wrap.querySelectorAll('.expand-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        toggleExpand(parseInt(btn.dataset.clientId, 10));
      });
    });
    wrap.querySelectorAll('.payer-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        openPaymentModal(parseInt(btn.dataset.clientId, 10), null);
      });
    });
    wrap.querySelectorAll('.payer-sejour-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        openPaymentModal(
          parseInt(btn.dataset.clientId, 10),
          parseInt(btn.dataset.sejourId, 10)
        );
      });
    });
  }

  // ── Initial load ──────────────────────────────────────────────────────────
  container.innerHTML = `<div class="page-loading">
    <div class="skeleton skeleton-title"></div>
    <div class="skeleton-grid">
      <div class="skeleton skeleton-card"></div>
      <div class="skeleton skeleton-card"></div>
      <div class="skeleton skeleton-card"></div>
      <div class="skeleton skeleton-card"></div>
    </div>
    <div class="skeleton skeleton-table"></div>
  </div>`;

  fetchData()
    .then(data => { _data = data; renderPage(); })
    .catch(err  => {
      container.innerHTML = `<div class="empty-state" style="padding:80px 20px">
        <div style="font-size:40px;margin-bottom:12px">⚠️</div>
        <div style="font-size:16px;font-weight:600;color:var(--text-1);margin-bottom:6px">Impossible de charger les données</div>
        <div style="font-size:13px;color:var(--text-2)">${escHtml(err.message || '')}</div>
        <button class="btn btn-primary" style="margin-top:16px" onclick="renderPaiementsPage(document.getElementById('page-content'))">
          Réessayer
        </button>
      </div>`;
    });
}

window.renderPaiementsPage = renderPaiementsPage;
