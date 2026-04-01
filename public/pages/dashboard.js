let dashChartInstance = null;

async function renderDashboardPage(container) {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const todayLabel = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const todayFmt = todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1);

  async function load(month) {
    try {
      const d = await api(`/dashboard?month=${month}`);
      render(d);
    } catch (e) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${e.message}</p></div>`;
    }
  }

  function render(d) {
    if (dashChartInstance) { dashChartInstance.destroy(); dashChartInstance = null; }

    // ── Vue EMPLOYÉ — pas de données financières ──────────────────────────
    if (d.role === 'EMPLOYE') {
      container.innerHTML = `
        <div class="page-header">
          <div><div class="page-title">Tableau de bord</div><div class="page-subtitle">${todayFmt}</div></div>
        </div>
        <div class="stat-grid">
          <div class="stat-card">
            <div class="stat-label">Taux d'occupation</div>
            <div class="stat-value purple">${d.tauxOccupation}%</div>
            <div style="font-size:11px;color:var(--text-3);margin-top:2px">${d.occupiedUnits} / ${d.totalUnits} unités</div>
            <div class="progress-bar-wrap">
              <div class="progress-bar-fill" style="width:${d.tauxOccupation}%"></div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Séjours en cours</div>
            <div class="stat-value blue">${d.sejoursEnCours ?? 0}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Travaux en cours</div>
            <div class="stat-value ${d.travauxOuverts > 0 ? 'red' : 'green'}">${d.travauxOuverts}</div>
          </div>
        </div>
        <div class="card" style="margin-top:20px;padding:24px;text-align:center;color:var(--text-3)">
          <p style="font-size:13px">Les données financières sont réservées aux gestionnaires et propriétaires.</p>
        </div>
      `;
      return;
    }

    // ── Vue complète (PROPRIETAIRE + GESTIONNAIRE) ─────────────────────────
    const net = d.netCashflow;
    const netColor = net >= 0 ? 'green' : 'red';
    const inCats = d.byCategory.filter(c => c.kind === 'IN' && c.total > 0);
    const outCats = d.byCategory.filter(c => c.kind === 'OUT' && c.total > 0);
    const maxOut = Math.max(...outCats.map(c => c.total), 1);

    container.innerHTML = `
      <div class="page-header">
        <div><div class="page-title">Tableau de bord</div><div class="page-subtitle">${todayFmt}</div></div>
        <div class="flex-center" style="gap:12px">
          <button class="btn btn-ghost btn-sm" id="export-dashboard-btn">📄 Exporter PDF</button>
          <div class="month-picker">
            <label class="form-label" style="margin:0">Mois</label>
            <input type="month" id="dash-month" value="${d.month}" />
          </div>
        </div>
      </div>

      <!-- KPI Stats -->
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">Recettes du mois</div>
          <div class="stat-value green">${fmtMoney(d.totalIn)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Dépenses du mois</div>
          <div class="stat-value red">${fmtMoney(d.totalOut)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Flux net</div>
          <div class="stat-value ${netColor}">${net >= 0 ? '+' : ''}${fmtMoney(net)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Taux d'occupation</div>
          <div class="stat-value purple">${d.tauxOccupation}%</div>
          <div style="font-size:11px;color:var(--text-3);margin-top:2px">${d.occupiedUnits} / ${d.totalUnits} unités</div>
          <div class="progress-bar-wrap">
            <div class="progress-bar-fill" style="width:${d.tauxOccupation}%"></div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Travaux en cours</div>
          <div class="stat-value ${d.travauxOuverts > 0 ? 'red' : 'green'}">${d.travauxOuverts}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Loyers en retard</div>
          <div class="stat-value ${d.alertesLoyers.length > 0 ? 'red' : 'green'}">${d.alertesLoyers.length}</div>
        </div>
      </div>

      <!-- Alertes loyers en retard -->
      ${d.alertesLoyers.length > 0 ? `
      <div class="card" style="margin-bottom:20px;border-color:rgba(255,91,122,.3);background:rgba(255,91,122,.04)">
        <div class="card-header">
          <span class="card-title">⚠️ Loyers en retard — ${d.month}</span>
          <span class="badge badge-out">${d.alertesLoyers.length} appartement${d.alertesLoyers.length > 1 ? 's' : ''}</span>
        </div>
        <table>
          <thead><tr><th>Appartement</th><th>Propriété</th><th>Locataire</th><th>Loyer attendu</th></tr></thead>
          <tbody>
            ${d.alertesLoyers.map(a => `<tr>
              <td><strong>${a.unit_label}</strong></td>
              <td class="text-muted">${a.property_name}</td>
              <td class="text-muted">${a.locataire || '<em>—</em>'}</td>
              <td class="amount-out">${fmtMoney(a.expected_rent)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>` : ''}

      ${d.alertesPaiements?.length ? `
      <div class="card" style="border-left:3px solid var(--yellow,#f59e0b);margin-bottom:20px">
          <div class="card-header">
              <span class="card-title">💸 Paiements en retard / partiels</span>
              <span class="badge badge-building">${d.alertesPaiements.length} séjour${d.alertesPaiements.length > 1 ? 's' : ''}</span>
          </div>
          <table>
              <thead><tr><th>Locataire</th><th>Appartement</th><th>Propriété</th><th>Total dû</th><th>Payé</th><th>Solde</th><th>Statut</th></tr></thead>
              <tbody>
                  ${d.alertesPaiements.map(a => `<tr>
                      <td><strong>${a.locataire}</strong></td>
                      <td class="text-muted">${a.unit_label}</td>
                      <td class="text-muted">${a.property_name}</td>
                      <td class="amount-in">${fmtMoney(a.montant_total_du)}</td>
                      <td class="amount-in">${fmtMoney(a.montant_paye)}</td>
                      <td class="amount-out">${fmtMoney(a.solde_restant)}</td>
                      <td><span class="badge ${a.statut_paiement === 'EN_ATTENTE' ? 'badge-out' : 'badge-building'}">${a.statut_paiement === 'EN_ATTENTE' ? 'Impayé' : 'Partiel'}</span></td>
                  </tr>`).join('')}
              </tbody>
          </table>
      </div>` : ''}

      ${d.alertesCautions?.length ? `
      <div class="card" style="border-left:3px solid var(--accent);margin-bottom:20px">
          <div class="card-header">
              <span class="card-title">🏦 Cautions à restituer</span>
              <span class="badge badge-standalone">${d.alertesCautions.length} séjour${d.alertesCautions.length > 1 ? 's' : ''} terminé${d.alertesCautions.length > 1 ? 's' : ''}</span>
          </div>
          <table>
              <thead><tr><th>Locataire</th><th>Appartement</th><th>Propriété</th><th>Fin séjour</th><th>Caution</th><th>Statut</th></tr></thead>
              <tbody>
                  ${d.alertesCautions.map(a => `<tr>
                      <td><strong>${a.locataire}</strong></td>
                      <td class="text-muted">${a.unit_label}</td>
                      <td class="text-muted">${a.property_name}</td>
                      <td class="text-muted">${fmtDate(a.date_fin)}</td>
                      <td class="amount-in">${fmtMoney(a.caution_montant)}</td>
                      <td><span class="badge badge-building">À traiter</span></td>
                  </tr>`).join('')}
              </tbody>
          </table>
      </div>` : ''}

      <!-- Graphique 12 mois -->
      <div class="card" style="margin-bottom:20px">
        <div class="card-header"><span class="card-title">📈 Évolution sur 12 mois</span></div>
        <div style="padding:20px;height:260px"><canvas id="chart-12m"></canvas></div>
      </div>

      <!-- Categories -->
      <div class="dash-grid-2">
        <div class="card">
          <div class="card-header"><span class="card-title">💚 Recettes par catégorie</span></div>
          <div style="padding:16px 20px">
            ${inCats.length ? inCats.map(c => `
              <div class="cat-bar">
                <span class="cat-bar-label">${c.category}</span>
                <span class="cat-bar-amount amount-in">${fmtMoney(c.total)}</span>
              </div>`).join('') : '<p class="text-muted" style="font-size:13px">Aucune recette.</p>'}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">🔴 Dépenses par catégorie</span></div>
          <div style="padding:16px 20px">
            ${outCats.length ? outCats.map(c => {
      const pct = Math.round((c.total / maxOut) * 100);
      return `<div class="cat-bar"><div style="flex:1">
                <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                  <span class="cat-bar-label">${c.category}</span>
                  <span class="cat-bar-amount amount-out">${fmtMoney(c.total)}</span>
                </div>
                <div style="height:4px;background:var(--bg-3);border-radius:4px">
                  <div style="height:4px;width:${pct}%;background:var(--red);border-radius:4px"></div>
                </div>
              </div></div>`;
    }).join('') : '<p class="text-muted" style="font-size:13px">Aucune dépense.</p>'}
          </div>
        </div>
      </div>

      <!-- Par propriété -->
      <div class="card" style="margin-top:20px">
        <div class="card-header"><span class="card-title">🏘️ Par propriété</span></div>
        <table><thead><tr>
          <th>Propriété</th><th>Type</th><th>Appts</th><th>Occupés</th><th>Recettes</th><th>Dépenses</th><th>Net</th>
        </tr></thead><tbody>
          ${d.byProperty.length ? d.byProperty.map(p => {
      const n = p.total_in - p.total_out;
      return `<tr>
              <td><strong>${p.name}</strong></td>
              <td><span class="badge badge-${(p.type || 'BUILDING').toLowerCase()}">${p.type === 'BUILDING' ? 'Immeuble' : 'Indépendant'}</span></td>
              <td>${p.unit_count}</td><td>${p.occupied_count}/${p.unit_count}</td>
              <td class="amount-in">${fmtMoney(p.total_in)}</td>
              <td class="amount-out">${fmtMoney(p.total_out)}</td>
              <td class="${n >= 0 ? 'amount-in' : 'amount-out'}">${n >= 0 ? '+' : ''}${fmtMoney(n)}</td>
            </tr>`;
    }).join('') : '<tr><td colspan="7" class="text-muted" style="text-align:center;padding:20px">Aucune propriété.</td></tr>'}
        </tbody></table>
      </div>

      <!-- Par appartement -->
      <div class="card" style="margin-top:20px">
        <div class="card-header"><span class="card-title">🚪 Par appartement</span></div>
        <table><thead><tr>
          <th>Appartement</th><th>Propriété</th><th>Statut</th><th>Loyer attendu</th><th>Encaissé</th><th>Écart</th>
        </tr></thead><tbody>
          ${d.byUnit.length ? d.byUnit.map(u => {
      const diff = u.total_in - u.expected_rent;
      return `<tr>
              <td><strong>${u.label}</strong></td>
              <td class="text-muted">${u.property_name}</td>
              <td><span class="badge badge-${(u.status || 'VACANT').toLowerCase()}">${u.status === 'OCCUPIED' ? 'Occupé' : 'Vacant'}</span></td>
              <td>${fmtMoney(u.expected_rent)}</td>
              <td class="amount-in">${fmtMoney(u.total_in)}</td>
              <td class="${diff >= 0 ? 'amount-in' : 'amount-out'}">${diff >= 0 ? '+' : ''}${fmtMoney(diff)}</td>
            </tr>`;
    }).join('') : '<tr><td colspan="6" class="text-muted" style="text-align:center;padding:20px">Aucun appartement.</td></tr>'}
        </tbody></table>
      </div>

      ${d.sejoursBientotFinis?.length ? `
      <div class="card" style="margin-top:20px">
        <div class="card-header"><span class="card-title">⏳ Fins de séjour dans 7 jours</span></div>
        ${d.sejoursBientotFinis.map(s => `
          <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between">
            <div>
              <div style="font-weight:600;font-size:13px">${s.locataire}</div>
              <div style="font-size:11px;color:var(--text-3)">${s.unit_label} · ${s.property_name}</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:12px;font-weight:600;color:var(--amber)">${fmtDate(s.date_fin)}</div>
              <div style="font-size:10px;color:var(--text-3)">dans ${s.jours_restants}j</div>
            </div>
          </div>`).join('')}
      </div>` : ''}
    `;

    // Chart.js — 12 mois
    const ctx = document.getElementById('chart-12m').getContext('2d');
    dashChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: d.chart12.map(m => m.label),
        datasets: [
          {
            label: 'Recettes',
            data: d.chart12.map(m => m.total_in),
            backgroundColor: 'rgba(34,211,169,.7)',
            borderColor: 'rgba(34,211,169,1)',
            borderWidth: 1, borderRadius: 4,
          },
          {
            label: 'Dépenses',
            data: d.chart12.map(m => m.total_out),
            backgroundColor: 'rgba(255,91,122,.6)',
            borderColor: 'rgba(255,91,122,1)',
            borderWidth: 1, borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#9aa0b8', font: { family: 'Inter', size: 12 } } },
          tooltip: { callbacks: { label: ctx => ` ${fmtMoney(ctx.raw)}` } },
        },
        scales: {
          x: { ticks: { color: '#9aa0b8' }, grid: { color: 'rgba(255,255,255,.05)' } },
          y: { ticks: { color: '#9aa0b8', callback: v => fmtMoney(v) }, grid: { color: 'rgba(255,255,255,.05)' } },
        },
      },
    });

    document.getElementById('dash-month').addEventListener('change', e => load(e.target.value));
    document.getElementById('export-dashboard-btn').addEventListener('click', () => {
      const user = window.CURRENT_USER;
      const signataire = user ? ((user.prenom || '') + ' ' + (user.nom || user.login || '')).trim() : 'Gestionnaire';
      const html = `
        <style>
          body { font-family: system-ui, sans-serif; padding: 24px; color: #111; }
          h1 { font-size: 22px; margin-bottom: 4px; }
          .subtitle { color: #666; font-size: 14px; margin-bottom: 24px; }
          .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
          .kpi { background: #f5f5f5; border-radius: 8px; padding: 16px; text-align: center; }
          .kpi-label { font-size: 11px; text-transform: uppercase; color: #666; margin-bottom: 4px; }
          .kpi-value { font-size: 22px; font-weight: 700; }
          .green { color: #059669; } .red { color: #dc2626; } .blue { color: #2563eb; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
          th { text-align: left; padding: 8px; border-bottom: 2px solid #ddd; background: #f9f9f9; }
          td { padding: 8px; border-bottom: 1px solid #eee; }
          .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 12px; color: #666; display: flex; justify-content: space-between; }
          .signature-block { margin-top: 32px; }
          .signature-line { border-top: 1px solid #333; width: 200px; margin-top: 32px; padding-top: 4px; font-size: 12px; }
          .alert-row { background: #fff3f3; }
        </style>
        <h1>Rapport mensuel — ${d.month}</h1>
        <div class="subtitle">Leasevora · Généré le ${new Date().toLocaleDateString('fr-FR')} par ${signataire}</div>

        <div class="kpi-grid">
          <div class="kpi"><div class="kpi-label">Recettes</div><div class="kpi-value green">${fmtMoney(d.totalIn)}</div></div>
          <div class="kpi"><div class="kpi-label">Dépenses</div><div class="kpi-value red">${fmtMoney(d.totalOut)}</div></div>
          <div class="kpi"><div class="kpi-label">Flux net</div><div class="kpi-value ${d.netCashflow >= 0 ? 'green' : 'red'}">${d.netCashflow >= 0 ? '+' : ''}${fmtMoney(d.netCashflow)}</div></div>
          <div class="kpi"><div class="kpi-label">Taux d'occupation</div><div class="kpi-value blue">${d.tauxOccupation}%</div></div>
          <div class="kpi"><div class="kpi-label">Séjours en cours</div><div class="kpi-value">${d.sejoursEnCours || 0}</div></div>
          <div class="kpi"><div class="kpi-label">Loyers en retard</div><div class="kpi-value ${d.alertesLoyers?.length > 0 ? 'red' : 'green'}">${d.alertesLoyers?.length || 0}</div></div>
        </div>

        ${d.alertesLoyers?.length > 0 ? `
        <h2 style="font-size:15px;margin-bottom:8px;color:#dc2626">⚠️ Loyers impayés (${d.alertesLoyers.length})</h2>
        <table>
          <thead><tr><th>Locataire</th><th>Propriété / Appt</th><th>Loyer attendu</th></tr></thead>
          <tbody>${d.alertesLoyers.map(a => `<tr class="alert-row"><td>${a.locataire || '—'}</td><td>${a.property_name} — ${a.unit_label}</td><td style="color:#dc2626;font-weight:600">${fmtMoney(a.expected_rent)}</td></tr>`).join('')}</tbody>
        </table>` : ''}

        ${d.byCategory?.length ? `
        <h2 style="font-size:15px;margin-bottom:8px">Recettes par catégorie</h2>
        <table>
          <thead><tr><th>Catégorie</th><th style="text-align:right">Montant</th></tr></thead>
          <tbody>${d.byCategory.filter(c=>c.kind==='IN'&&c.total>0).map(c=>`<tr><td>${c.category}</td><td style="text-align:right;color:#059669;font-weight:600">${fmtMoney(c.total)}</td></tr>`).join('')}</tbody>
        </table>
        <h2 style="font-size:15px;margin-bottom:8px">Dépenses par catégorie</h2>
        <table>
          <thead><tr><th>Catégorie</th><th style="text-align:right">Montant</th></tr></thead>
          <tbody>${d.byCategory.filter(c=>c.kind==='OUT'&&c.total>0).map(c=>`<tr><td>${c.category}</td><td style="text-align:right;color:#dc2626;font-weight:600">${fmtMoney(c.total)}</td></tr>`).join('')}</tbody>
        </table>` : ''}

        <div class="signature-block">
          <p style="font-size:13px">Je soussigné(e) <strong>${signataire}</strong>, certifie l'exactitude des données financières présentées dans ce rapport.</p>
          <div class="signature-line">${signataire}<br>${new Date().toLocaleDateString('fr-FR')}</div>
        </div>
      `;
      printSection('Rapport mensuel — ' + d.month, html);
    });
  }

  await load(defaultMonth);
}
