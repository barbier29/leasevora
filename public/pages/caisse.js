async function renderCaissePage(container) {
  // Persistent filter state
  const _now = new Date();
  let _propFilter  = '';
  let _monthFilter = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}`;

  async function load() {
    try {
      let url = '/caisse';
      const params = [];
      if (_propFilter)  params.push(`property_id=${_propFilter}`);
      if (_monthFilter) params.push(`month=${_monthFilter}`);
      if (params.length) url += '?' + params.join('&');
      const [caisses, props] = await Promise.all([api(url), api('/properties')]);
      render(caisses, props);
    } catch (e) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${e.message}</p></div>`;
    }
  }

  function soldeColor(n) { return n >= 0 ? 'green' : 'red'; }

  function render(caisses, props) {
    const totalSolde = caisses.reduce((s, c) => s + c.solde_caisse, 0);

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">Suivi de Caisse</div>
          <div class="page-subtitle">Mouvements de trésorerie opérationnelle par bien</div>
        </div>
        <div class="flex-center" style="gap:8px;flex-wrap:wrap">
          <input type="month" class="form-control" id="month-filter" value="${_monthFilter}" style="width:160px" />
          <select class="form-control" id="prop-filter" style="width:220px">
            <option value="">Toutes les propriétés</option>
            ${props.map(p => `<option value="${p.id}" ${_propFilter == p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
          </select>
        </div>
      </div>

      <!-- Solde global -->
      <div class="stat-grid" style="margin-bottom:24px">
        <div class="stat-card">
          <div class="stat-label">Solde total des caisses</div>
          <div class="stat-value ${soldeColor(totalSolde)}">${totalSolde >= 0 ? '' : '-'}${fmtMoney(Math.abs(totalSolde))}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Entrées caisse (total)</div>
          <div class="stat-value green">${fmtMoney(caisses.reduce((s, c) => s + c.caisse_in, 0))}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Sorties caisse (total)</div>
          <div class="stat-value red">${fmtMoney(caisses.reduce((s, c) => s + c.caisse_out, 0))}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Recettes bancaires (total)</div>
          <div class="stat-value purple">${fmtMoney(caisses.reduce((s, c) => s + c.banque_in, 0))}</div>
        </div>
      </div>

      ${caisses.length === 0 ? `
        <div class="empty-state"><div class="empty-icon">🏦</div><p>Aucune propriété trouvée. Créez vos propriétés d'abord.</p></div>
      ` : caisses.map(c => `
        <div class="card" style="margin-bottom:24px">
          <!-- En-tête propriété -->
          <div class="card-header" style="flex-wrap:wrap;gap:12px">
            <div>
              <span class="card-title">🏦 ${c.name}</span>
              <span class="badge badge-${c.type.toLowerCase()}" style="margin-left:8px">${c.type === 'BUILDING' ? 'Immeuble' : 'Indépendant'}</span>
            </div>
            <div class="flex-center" style="gap:20px">
              <div style="text-align:right">
                <div style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.6px">Solde initial</div>
                <div style="font-size:14px;font-weight:600">${fmtMoney(c.solde_initial)}</div>
              </div>
              <div style="text-align:right">
                <div style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.6px">Solde caisse actuel</div>
                <div style="font-size:22px;font-weight:700;color:var(--${soldeColor(c.solde_caisse)})">${c.solde_caisse >= 0 ? '' : '-'}${fmtMoney(Math.abs(c.solde_caisse))}</div>
              </div>
            </div>
          </div>

          <!-- Mini stats caisse vs banque -->
          <div style="display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid var(--border)">
            ${[
        ['Entrées caisse', '💚', c.caisse_in, 'amount-in'],
        ['Sorties caisse', '🔴', c.caisse_out, 'amount-out'],
        ['Recettes banque', '🏦', c.banque_in, 'amount-in'],
        ['Dépenses banque', '📤', c.banque_out, 'amount-out'],
      ].map(([label, icon, val, cls]) => `
              <div style="padding:14px 18px;border-right:1px solid var(--border)">
                <div style="font-size:11px;color:var(--text-3);margin-bottom:4px">${icon} ${label}</div>
                <div class="${cls}" style="font-size:15px;font-weight:600">${fmtMoney(val)}</div>
              </div>`).join('')}
          </div>

          ${c.par_appartement.length > 1 ? `
          <!-- Répartition par appartement -->
          <div style="padding:16px 18px;border-bottom:1px solid var(--border)">
            <div style="font-size:12px;font-weight:600;color:var(--text-2);margin-bottom:10px">Par appartement</div>
            <div style="display:flex;flex-wrap:wrap;gap:10px">
              ${c.par_appartement.map(u => `
                <div style="background:var(--bg-2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 14px;min-width:160px">
                  <div style="font-size:12px;font-weight:600;margin-bottom:4px">${u.label}</div>
                  <div style="font-size:11px;color:var(--text-3)">Entrées: <span class="amount-in">${fmtMoney(u.total_in)}</span></div>
                  <div style="font-size:11px;color:var(--text-3)">Sorties: <span class="amount-out">${fmtMoney(u.total_out)}</span></div>
                  <div style="font-size:12px;font-weight:600;margin-top:4px;color:var(--${soldeColor(u.net)})">${u.net >= 0 ? '+' : ''}${fmtMoney(u.net)}</div>
                </div>`).join('')}
            </div>
          </div>` : ''}

          <!-- Relevé de caisse -->
          <div>
            <div style="padding:12px 18px;font-size:12px;font-weight:600;color:var(--text-2);border-bottom:1px solid var(--border)">
              Relevé de caisse <span style="font-weight:400;color:var(--text-3)">(du plus récent)</span>
            </div>
            ${c.releve.length === 0 ? `
              <div style="padding:20px;text-align:center;color:var(--text-3);font-size:13px">
                Aucun mouvement de caisse. Ajoutez des transactions avec source "Caisse".
              </div>
            ` : `
            <table>
              <thead><tr>
                <th>Date</th><th>Description</th><th>Catégorie</th><th>Appartement</th>
                <th class="text-right">Mouvement</th><th class="text-right">Solde après</th>
              </tr></thead>
              <tbody>
                ${c.releve.map(t => `
                  <tr>
                    <td class="text-muted">${fmtDate(t.date)}</td>
                    <td>${t.description || '—'}</td>
                    <td class="text-muted">${t.category_name}</td>
                    <td class="text-muted">${t.unit_label || '<span style="font-style:italic;opacity:.6">Tout l\'immeuble</span>'}</td>
                    <td class="text-right ${t.kind === 'IN' ? 'amount-in' : 'amount-out'}">
                      ${t.kind === 'IN' ? '+' : '-'}${fmtMoney(t.amount)}
                    </td>
                    <td class="text-right" style="font-weight:600;color:var(--${soldeColor(t.solde_apres)})">
                      ${fmtMoney(t.solde_apres)}
                    </td>
                  </tr>`).join('')}
                <!-- Ligne solde initial -->
                <tr style="background:var(--bg-0)">
                  <td colspan="4" class="text-muted" style="font-style:italic">Solde initial</td>
                  <td></td>
                  <td class="text-right" style="font-weight:600">${fmtMoney(c.solde_initial)}</td>
                </tr>
              </tbody>
            </table>`}
          </div>
        </div>
      `).join('')}
    `;

    document.getElementById('month-filter').addEventListener('change', e => { _monthFilter = e.target.value; load(); });
    document.getElementById('prop-filter').addEventListener('change', e => { _propFilter = e.target.value; load(); });
  }

  await load();
}
