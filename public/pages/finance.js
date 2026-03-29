// ── Finance — État Financier + Rapport par Bien ──────────────────────────────

async function renderFinancePage(container) {

    // ── Date helpers ─────────────────────────────────────────────────────────
    const now        = new Date();
    const today      = now.toISOString().slice(0, 10);
    const yearStart  = `${now.getFullYear()}-01-01`;
    const prevYStart = `${now.getFullYear() - 1}-01-01`;
    const prevYEnd   = `${now.getFullYear() - 1}-12-31`;
    const monthStart = `${now.toISOString().slice(0, 7)}-01`;
    const prevMEnd   = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
    const prevMStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
    const q1Start    = `${now.getFullYear()}-01-01`;
    const q1End      = `${now.getFullYear()}-03-31`;
    const q2Start    = `${now.getFullYear()}-04-01`;
    const q2End      = `${now.getFullYear()}-06-30`;
    const q3Start    = `${now.getFullYear()}-07-01`;
    const q3End      = `${now.getFullYear()}-09-30`;
    const q4Start    = `${now.getFullYear()}-10-01`;
    const q4End      = `${now.getFullYear()}-12-31`;

    // ── State ────────────────────────────────────────────────────────────────
    let activeTab   = 'etat';   // 'etat' | 'rapport'
    let etatData    = null;     // income-statement response
    let rapportData = null;     // property-report response
    let properties  = [];
    let units       = [];
    let filters     = { property_id: '', unit_id: '', date_from: yearStart, date_to: today };
    let rapFilters  = { date_from: yearStart, date_to: today };

    // ── Load base data ───────────────────────────────────────────────────────
    try {
        [properties, units] = await Promise.all([api('/properties'), api('/units')]);
    } catch (e) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${e.message}</p></div>`;
        return;
    }

    // ── Quick period helper ──────────────────────────────────────────────────
    const PERIODS = [
        { label: `Année ${now.getFullYear()}`,        from: yearStart,  to: today    },
        { label: `Année ${now.getFullYear() - 1}`,    from: prevYStart, to: prevYEnd },
        { label: 'Ce mois',                           from: monthStart, to: today    },
        { label: 'Mois précédent',                    from: prevMStart, to: prevMEnd },
        { label: `T1 ${now.getFullYear()}`,           from: q1Start,    to: q1End    },
        { label: `T2 ${now.getFullYear()}`,           from: q2Start,    to: q2End    },
        { label: `T3 ${now.getFullYear()}`,           from: q3Start,    to: q3End    },
        { label: `T4 ${now.getFullYear()}`,           from: q4Start,    to: q4End    },
    ];

    function periodBtns(fromId, toId) {
        return PERIODS.map(p =>
            `<button class="btn btn-ghost btn-sm qp" data-from="${p.from}" data-to="${p.to}" data-from-id="${fromId}" data-to-id="${toId}">${p.label}</button>`
        ).join('');
    }

    // ════════════════════════════════════════════════════════════════════════
    // MAIN RENDER
    // ════════════════════════════════════════════════════════════════════════
    function render() {
        container.innerHTML = `
<div class="page-header" style="margin-bottom:0">
  <div>
    <div class="page-title">📊 Finances</div>
    <div class="page-subtitle">États financiers et performance des biens</div>
  </div>
</div>

<!-- Tabs -->
<div class="fin-tabs">
  <button class="fin-tab ${activeTab === 'etat' ? 'active' : ''}" data-tab="etat">
    📈 État Financier
  </button>
  <button class="fin-tab ${activeTab === 'rapport' ? 'active' : ''}" data-tab="rapport">
    🏘️ Rapport par Bien
  </button>
</div>

<!-- Tab content -->
<div id="fin-tab-content"></div>`;

        container.querySelectorAll('.fin-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                activeTab = btn.dataset.tab;
                render();
                if (activeTab === 'etat')    renderEtatTab();
                if (activeTab === 'rapport') renderRapportTab();
            });
        });

        if (activeTab === 'etat')    renderEtatTab();
        if (activeTab === 'rapport') renderRapportTab();
    }

    // ════════════════════════════════════════════════════════════════════════
    // TAB 1 — ÉTAT FINANCIER (P&L)
    // ════════════════════════════════════════════════════════════════════════
    function renderEtatTab() {
        const tc = document.getElementById('fin-tab-content');

        function buildUnitOpts(pid) {
            const list = pid ? units.filter(u => u.property_id === Number(pid)) : units;
            return `<option value="">Tous les appartements</option>` +
                list.map(u => `<option value="${u.id}" ${filters.unit_id == u.id ? 'selected' : ''}>${u.property_name ? u.property_name + ' — ' : ''}${u.label}</option>`).join('');
        }

        tc.innerHTML = `
<div class="fin-filter-card">
  <div class="fin-filter-row">
    <div class="form-group" style="margin:0;flex:1;min-width:160px">
      <label class="form-label">🏘️ Propriété</label>
      <select class="form-control" id="fi-prop">
        <option value="">Toutes les propriétés</option>
        ${properties.map(p => `<option value="${p.id}" ${filters.property_id == p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
      </select>
    </div>
    <div class="form-group" style="margin:0;flex:1;min-width:160px">
      <label class="form-label">🚪 Appartement</label>
      <select class="form-control" id="fi-unit">${buildUnitOpts(filters.property_id)}</select>
    </div>
    <div class="form-group" style="margin:0">
      <label class="form-label">Du</label>
      <input type="date" class="form-control" id="fi-from" value="${filters.date_from}" style="width:148px" />
    </div>
    <div class="form-group" style="margin:0">
      <label class="form-label">Au</label>
      <input type="date" class="form-control" id="fi-to" value="${filters.date_to}" style="width:148px" />
    </div>
    <button class="btn btn-primary" id="fi-generate" style="white-space:nowrap;align-self:flex-end">🔍 Générer</button>
    <button class="btn btn-secondary" id="fi-export" ${etatData ? '' : 'disabled'} style="white-space:nowrap;align-self:flex-end">
      📥 Exporter Excel
    </button>
  </div>
  <div class="fin-period-row">${periodBtns('fi-from', 'fi-to')}</div>
</div>

<div id="fi-statement">
  <div class="fin-prompt"><div style="font-size:36px;margin-bottom:12px">📊</div><p>Sélectionnez les filtres et cliquez sur Générer.</p></div>
</div>`;

        if (etatData) renderEtatStatement();

        // Events
        document.getElementById('fi-prop').addEventListener('change', e => {
            filters.property_id = e.target.value;
            filters.unit_id = '';
            document.getElementById('fi-unit').innerHTML = buildUnitOpts(filters.property_id);
        });
        document.getElementById('fi-unit').addEventListener('change', e => { filters.unit_id = e.target.value; });
        document.querySelectorAll('.qp[data-from-id="fi-from"]').forEach(btn => {
            btn.addEventListener('click', () => {
                filters.date_from = btn.dataset.from;
                filters.date_to   = btn.dataset.to;
                document.getElementById('fi-from').value = filters.date_from;
                document.getElementById('fi-to').value   = filters.date_to;
                generateEtat();
            });
        });
        document.getElementById('fi-generate').addEventListener('click', generateEtat);
        document.getElementById('fi-export').addEventListener('click', exportEtatExcel);
    }

    async function generateEtat() {
        filters.property_id = document.getElementById('fi-prop').value;
        filters.unit_id     = document.getElementById('fi-unit').value;
        filters.date_from   = document.getElementById('fi-from').value;
        filters.date_to     = document.getElementById('fi-to').value;

        const stmt = document.getElementById('fi-statement');
        stmt.innerHTML = `<div class="fin-prompt"><div style="font-size:28px">⏳</div><p>Chargement…</p></div>`;

        try {
            let url = `/finance/income-statement?date_from=${filters.date_from}&date_to=${filters.date_to}`;
            if (filters.property_id) url += `&property_id=${filters.property_id}`;
            if (filters.unit_id)     url += `&unit_id=${filters.unit_id}`;
            etatData = await api(url);
            renderEtatStatement();
            document.getElementById('fi-export').disabled = false;
        } catch (e) {
            stmt.innerHTML = `<div class="fin-prompt" style="color:var(--red)">${e.message}</div>`;
        }
    }

    function renderEtatStatement() {
        const d = etatData;
        const stmt = document.getElementById('fi-statement');
        if (!d || (!d.revenues.length && !d.expenses.length)) {
            stmt.innerHTML = `<div class="fin-prompt"><div style="font-size:36px">📭</div><p>Aucune transaction sur cette période.</p></div>`;
            return;
        }

        const propName   = d.property ? d.property.name : 'Toutes les propriétés';
        const unitSuffix = d.unit ? ` — ${d.unit.label}` : '';
        const net        = d.net_income;
        const marginPct  = d.total_revenues > 0 ? Math.round((net / d.total_revenues) * 100) : 0;
        const netColor   = net >= 0 ? 'var(--green)' : 'var(--red)';
        const netSign    = net >= 0 ? '+' : '';

        // Monthly chart (text sparkline)
        let monthlySection = '';
        if (d.monthly && d.monthly.length > 1) {
            const maxRev = Math.max(...d.monthly.map(m => m.revenues), 1);
            monthlySection = `
<div class="fin-section" style="margin-top:16px">
  <div class="fin-section-label" style="color:var(--text-2)">VENTILATION MENSUELLE</div>
  <div class="fin-monthly-chart">
    ${d.monthly.map(m => {
        const pct = Math.round((m.revenues / maxRev) * 100);
        const netC = m.net >= 0 ? 'var(--green)' : 'var(--red)';
        return `<div class="fin-month-col">
          <div class="fin-month-bar-wrap">
            <div class="fin-month-bar" style="height:${pct}%;background:var(--accent)"></div>
          </div>
          <div class="fin-month-rev">${fmtMoney(m.revenues)}</div>
          <div class="fin-month-net" style="color:${netC}">${m.net >= 0 ? '+' : ''}${fmtMoney(m.net)}</div>
          <div class="fin-month-label">${m.month.slice(0, 7)}</div>
        </div>`;
    }).join('')}
  </div>
</div>`;
        }

        stmt.innerHTML = `
<div class="fin-statement-card">

  <!-- ── En-tête officiel ── -->
  <div class="fin-stmt-header">
    <div>
      <div class="fin-stmt-title">COMPTE DE RÉSULTAT</div>
      <div class="fin-stmt-meta">
        <span>🏘️ <strong>${propName}${unitSuffix}</strong></span>
        <span>📅 ${fmtDate(d.date_from)} au ${fmtDate(d.date_to)}</span>
        <span style="color:var(--text-3)">Généré le ${new Date().toLocaleDateString('fr-FR')}</span>
      </div>
    </div>
    <div class="fin-kpi-trio">
      <div class="fin-kpi">
        <div class="fin-kpi-val" style="color:var(--green)">${fmtMoney(d.total_revenues)}</div>
        <div class="fin-kpi-label">Revenus</div>
      </div>
      <div class="fin-kpi">
        <div class="fin-kpi-val" style="color:var(--red)">${fmtMoney(d.total_expenses)}</div>
        <div class="fin-kpi-label">Dépenses</div>
      </div>
      <div class="fin-kpi">
        <div class="fin-kpi-val" style="color:${netColor}">${netSign}${fmtMoney(net)}</div>
        <div class="fin-kpi-label">Résultat net</div>
      </div>
    </div>
  </div>

  <!-- ── REVENUS ── -->
  <div class="fin-section">
    <div class="fin-section-label fin-section-rev">REVENUS</div>
    ${d.revenues.length
        ? d.revenues.map((cat, idx) => buildCatRow(cat, `r${idx}`, 'in')).join('')
        : `<div class="fin-empty-row">Aucun revenu</div>`}
    <div class="fin-total-row fin-total-rev">
      <span>TOTAL REVENUS</span>
      <span>${fmtMoney(d.total_revenues)}</span>
    </div>
  </div>

  <!-- ── DÉPENSES ── -->
  <div class="fin-section">
    <div class="fin-section-label fin-section-exp">DÉPENSES</div>
    ${d.expenses.length
        ? d.expenses.map((cat, idx) => buildCatRow(cat, `e${idx}`, 'out')).join('')
        : `<div class="fin-empty-row">Aucune dépense</div>`}
    <div class="fin-total-row fin-total-exp">
      <span>TOTAL DÉPENSES</span>
      <span>${fmtMoney(d.total_expenses)}</span>
    </div>
  </div>

  <!-- ── RÉSULTAT NET ── -->
  <div class="fin-net-row">
    <div>
      <div class="fin-net-label">RÉSULTAT NET</div>
      <div class="fin-net-sub">Marge : <strong>${marginPct}%</strong></div>
    </div>
    <div class="fin-net-value" style="color:${netColor}">${netSign}${fmtMoney(net)}</div>
  </div>

  ${monthlySection}
</div>`;
    }

    // Category row with expandable transactions
    function buildCatRow(cat, uid, kind) {
        const cls    = kind === 'in' ? 'amount-in' : 'amount-out';
        const detId  = `fi-det-${uid}`;
        const txRows = [...cat.transactions]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map(t => `<tr>
              <td style="white-space:nowrap">${fmtDate(t.date)}</td>
              <td class="text-muted">${t.description || '—'}</td>
              <td class="text-muted">${t.property_name}</td>
              <td class="text-muted">${t.unit_label || '—'}</td>
              <td class="text-muted">${t.source === 'CAISSE' ? 'Caisse' : 'Banque'}</td>
              <td class="${cls}" style="text-align:right;font-weight:600;white-space:nowrap">${fmtMoney(t.amount)}</td>
            </tr>`).join('');
        return `
<div class="fin-cat-row">
  <div class="fin-cat-header" onclick="(function(el){
    var d=document.getElementById('${detId}');
    var open=d.style.display!=='none';
    d.style.display=open?'none':'block';
    el.querySelector('.fi-arr').textContent=open?'▶':'▼';
  })(this)">
    <span class="fi-arr" style="font-size:9px;color:var(--text-3);width:12px">▶</span>
    <span class="fin-cat-name">${cat.category_name}</span>
    <span class="fin-cat-count">${cat.transactions.length} transaction${cat.transactions.length > 1 ? 's' : ''}</span>
    <span class="${cls}" style="font-weight:600;font-size:13px;margin-left:auto">${fmtMoney(cat.total)}</span>
  </div>
  <div id="${detId}" style="display:none;padding:0 20px 14px;background:var(--bg-1)">
    <table style="font-size:12px">
      <thead><tr>
        <th>Date</th><th>Description</th><th>Propriété</th><th>Appt.</th><th>Source</th>
        <th style="text-align:right">Montant</th>
      </tr></thead>
      <tbody>${txRows}</tbody>
    </table>
  </div>
</div>`;
    }

    // ════════════════════════════════════════════════════════════════════════
    // TAB 2 — RAPPORT PAR BIEN
    // ════════════════════════════════════════════════════════════════════════
    function renderRapportTab() {
        const tc = document.getElementById('fin-tab-content');
        tc.innerHTML = `
<div class="fin-filter-card">
  <div class="fin-filter-row">
    <div class="form-group" style="margin:0">
      <label class="form-label">Du</label>
      <input type="date" class="form-control" id="rp-from" value="${rapFilters.date_from}" style="width:148px" />
    </div>
    <div class="form-group" style="margin:0">
      <label class="form-label">Au</label>
      <input type="date" class="form-control" id="rp-to" value="${rapFilters.date_to}" style="width:148px" />
    </div>
    <button class="btn btn-primary" id="rp-generate" style="white-space:nowrap;align-self:flex-end">🔍 Analyser</button>
    <button class="btn btn-secondary" id="rp-export-etat" ${rapportData ? '' : 'disabled'} style="white-space:nowrap;align-self:flex-end" title="État financier professionnel complet">
      📊 État Financier (.xlsx)
    </button>
    <button class="btn btn-secondary" id="rp-export-simple" ${rapportData ? '' : 'disabled'} style="white-space:nowrap;align-self:flex-end" title="Synthèse simple par bien">
      📋 Synthèse Biens (.xlsx)
    </button>
  </div>
  <div class="fin-period-row">${periodBtns('rp-from', 'rp-to')}</div>
</div>

<div id="rp-content">
  <div class="fin-prompt"><div style="font-size:36px;margin-bottom:12px">🏘️</div><p>Cliquez sur Analyser pour générer le rapport par bien.</p></div>
</div>`;

        if (rapportData) renderRapportContent();

        document.querySelectorAll('.qp[data-from-id="rp-from"]').forEach(btn => {
            btn.addEventListener('click', () => {
                rapFilters.date_from = btn.dataset.from;
                rapFilters.date_to   = btn.dataset.to;
                document.getElementById('rp-from').value = rapFilters.date_from;
                document.getElementById('rp-to').value   = rapFilters.date_to;
                generateRapport();
            });
        });
        document.getElementById('rp-generate').addEventListener('click', generateRapport);
        document.getElementById('rp-export-etat').addEventListener('click', exportEtatFinancierXlsx);
        document.getElementById('rp-export-simple').addEventListener('click', exportSyntheseXlsx);
    }

    async function generateRapport() {
        rapFilters.date_from = document.getElementById('rp-from').value;
        rapFilters.date_to   = document.getElementById('rp-to').value;

        const ct = document.getElementById('rp-content');
        ct.innerHTML = `<div class="fin-prompt"><div style="font-size:28px">⏳</div><p>Chargement…</p></div>`;

        try {
            const url = `/finance/property-report?date_from=${rapFilters.date_from}&date_to=${rapFilters.date_to}`;
            rapportData = await api(url);
            renderRapportContent();
            document.getElementById('rp-export-etat').disabled = false;
            document.getElementById('rp-export-simple').disabled = false;
        } catch (e) {
            ct.innerHTML = `<div class="fin-prompt" style="color:var(--red)">${e.message}</div>`;
        }
    }

    function renderRapportContent() {
        const d = rapportData;
        const ct = document.getElementById('rp-content');

        if (!d.properties.length) {
            ct.innerHTML = `<div class="fin-prompt"><div style="font-size:36px">📭</div><p>Aucun bien enregistré.</p></div>`;
            return;
        }

        // ── Récapitulatif global ──────────────────────────────────────────
        const tot = d.totals;
        const totNetC  = tot.net >= 0 ? 'var(--green)' : 'var(--red)';
        const totNetS  = tot.net >= 0 ? '+' : '';

        let html = `
<!-- Bandeau totaux globaux -->
<div class="fin-global-totals">
  <div class="fin-global-kpi">
    <div class="fin-global-val" style="color:var(--green)">${fmtMoney(tot.revenues)}</div>
    <div class="fin-global-label">Total Revenus</div>
  </div>
  <div class="fin-global-sep">−</div>
  <div class="fin-global-kpi">
    <div class="fin-global-val" style="color:var(--red)">${fmtMoney(tot.expenses)}</div>
    <div class="fin-global-label">Total Dépenses</div>
  </div>
  <div class="fin-global-sep">=</div>
  <div class="fin-global-kpi">
    <div class="fin-global-val" style="color:${totNetC}">${totNetS}${fmtMoney(tot.net)}</div>
    <div class="fin-global-label">Résultat Net</div>
  </div>
  <div class="fin-global-kpi" style="margin-left:auto">
    <div class="fin-global-val" style="color:var(--text-1)">${tot.margin_pct}%</div>
    <div class="fin-global-label">Marge brute</div>
  </div>
</div>

<!-- Tableau comparatif -->
<div class="fin-compare-table-wrap">
  <table class="data-table fin-compare-table">
    <thead><tr>
      <th>Bien</th>
      <th>Appts.</th>
      <th style="text-align:right">Revenus</th>
      <th style="text-align:right">Dépenses</th>
      <th style="text-align:right">Résultat Net</th>
      <th style="text-align:right">Marge</th>
      <th style="text-align:right">Occupation</th>
      <th style="text-align:right">Séjours</th>
    </tr></thead>
    <tbody>
    ${d.properties.map(p => {
        const nc = p.net_income >= 0 ? 'amount-in' : 'amount-out';
        const ns = p.net_income >= 0 ? '+' : '';
        const occColor = p.taux_occupation >= 70 ? 'var(--green)' : p.taux_occupation >= 40 ? 'var(--yellow,#f59e0b)' : 'var(--red)';
        return `<tr>
          <td><strong>${p.name}</strong>${p.address ? `<br><span style="font-size:11px;color:var(--text-3)">${p.address}</span>` : ''}</td>
          <td style="text-align:center">${p.units_count}</td>
          <td class="amount-in" style="text-align:right">${fmtMoney(p.total_revenues)}</td>
          <td class="amount-out" style="text-align:right">${fmtMoney(p.total_expenses)}</td>
          <td class="${nc}" style="text-align:right;font-weight:700">${ns}${fmtMoney(p.net_income)}</td>
          <td style="text-align:right;color:${p.margin_pct >= 0 ? 'var(--green)' : 'var(--red)'}">${p.margin_pct}%</td>
          <td style="text-align:right;color:${occColor}">${p.taux_occupation}%</td>
          <td style="text-align:center">${p.sejours_count}</td>
        </tr>`;
    }).join('')}
    </tbody>
    <tfoot><tr style="font-weight:700;border-top:2px solid var(--border)">
      <td>TOTAL PORTEFEUILLE</td>
      <td></td>
      <td class="amount-in" style="text-align:right">${fmtMoney(tot.revenues)}</td>
      <td class="amount-out" style="text-align:right">${fmtMoney(tot.expenses)}</td>
      <td class="${tot.net >= 0 ? 'amount-in' : 'amount-out'}" style="text-align:right">${tot.net >= 0 ? '+' : ''}${fmtMoney(tot.net)}</td>
      <td style="text-align:right">${tot.margin_pct}%</td>
      <td></td><td></td>
    </tr></tfoot>
  </table>
</div>`;

        // ── Cartes détaillées par bien ────────────────────────────────────
        d.properties.forEach(p => {
            const netC  = p.net_income >= 0 ? 'var(--green)' : 'var(--red)';
            const netS  = p.net_income >= 0 ? '+' : '';
            const occClr = p.taux_occupation >= 70 ? 'var(--green)' : p.taux_occupation >= 40 ? 'var(--yellow,#f59e0b)' : 'var(--red)';

            // Mini monthly bars
            let monthHtml = '';
            if (p.monthly.length) {
                const maxV = Math.max(...p.monthly.map(m => Math.max(m.revenues, m.expenses)), 1);
                monthHtml = `<div class="fin-card-monthly">
                  ${p.monthly.map(m => {
                    const h = Math.round((m.revenues / maxV) * 44);
                    const ne = m.net >= 0 ? 'var(--green)' : 'var(--red)';
                    return `<div class="fin-cm-col" title="${m.month}: ${fmtMoney(m.revenues)} / ${fmtMoney(m.expenses)}">
                      <div class="fin-cm-bar" style="height:${h}px"></div>
                      <div class="fin-cm-dot" style="background:${ne}"></div>
                    </div>`;
                  }).join('')}
                </div>`;
            }

            // Revenue by category top 3
            const topRev = p.revenue_by_category.slice(0, 4).map(c =>
                `<div class="fin-cat-line">
                  <span class="fin-cat-line-name">${c.name}</span>
                  <span class="amount-in">${fmtMoney(c.total)}</span>
                </div>`
            ).join('');

            const topExp = p.expense_by_category.slice(0, 4).map(c =>
                `<div class="fin-cat-line">
                  <span class="fin-cat-line-name">${c.name}</span>
                  <span class="amount-out">${fmtMoney(c.total)}</span>
                </div>`
            ).join('');

            // Units breakdown
            let unitRows = '';
            if (p.units.length) {
                unitRows = `<div class="fin-unit-table-wrap">
                  <table class="data-table" style="font-size:12px">
                    <thead><tr><th>Appartement</th><th style="text-align:right">Revenus</th><th style="text-align:right">Dépenses</th><th style="text-align:right">Net</th><th style="text-align:right">Occupation</th><th style="text-align:right">Séjours</th></tr></thead>
                    <tbody>
                    ${p.units.map(u => {
                        const unc = u.net >= 0 ? 'amount-in' : 'amount-out';
                        const uns = u.net >= 0 ? '+' : '';
                        const uoc = u.taux_occupation >= 70 ? 'var(--green)' : u.taux_occupation >= 40 ? 'var(--yellow,#f59e0b)' : 'var(--red)';
                        return `<tr>
                          <td><strong>${u.label}</strong></td>
                          <td class="amount-in" style="text-align:right">${fmtMoney(u.revenues)}</td>
                          <td class="amount-out" style="text-align:right">${fmtMoney(u.expenses)}</td>
                          <td class="${unc}" style="text-align:right;font-weight:600">${uns}${fmtMoney(u.net)}</td>
                          <td style="text-align:right;color:${uoc}">${u.taux_occupation}%</td>
                          <td style="text-align:center">${u.sejours_count}</td>
                        </tr>`;
                    }).join('')}
                    </tbody>
                  </table>
                </div>`;
            }

            html += `
<div class="fin-prop-card">
  <div class="fin-prop-card-header">
    <div>
      <div class="fin-prop-name">${p.name}</div>
      ${p.address ? `<div class="fin-prop-address">${p.address}</div>` : ''}
    </div>
    <div class="fin-prop-kpis">
      <div class="fin-prop-kpi"><span style="color:var(--green)">${fmtMoney(p.total_revenues)}</span><br><small>Revenus</small></div>
      <div class="fin-prop-kpi"><span style="color:var(--red)">${fmtMoney(p.total_expenses)}</span><br><small>Dépenses</small></div>
      <div class="fin-prop-kpi"><span style="color:${netC};font-weight:700">${netS}${fmtMoney(p.net_income)}</span><br><small>Net</small></div>
      <div class="fin-prop-kpi"><span style="color:${occClr}">${p.taux_occupation}%</span><br><small>Occupation</small></div>
      <div class="fin-prop-kpi"><span style="color:var(--text-1)">${p.margin_pct}%</span><br><small>Marge</small></div>
    </div>
    ${monthHtml}
  </div>
  <div class="fin-prop-card-body">
    <div class="fin-prop-col">
      <div class="fin-prop-col-title" style="color:var(--green)">▲ REVENUS PAR CATÉGORIE</div>
      ${topRev || '<div class="fin-empty-row">Aucun revenu</div>'}
    </div>
    <div class="fin-prop-col">
      <div class="fin-prop-col-title" style="color:var(--red)">▼ DÉPENSES PAR CATÉGORIE</div>
      ${topExp || '<div class="fin-empty-row">Aucune dépense</div>'}
    </div>
  </div>
  ${p.units.length > 0 ? `<div class="fin-prop-card-footer">${unitRows}</div>` : ''}
</div>`;
        });

        ct.innerHTML = html;
    }

    // ════════════════════════════════════════════════════════════════════════
    // EXPORTS EXCEL — professionnels
    // ════════════════════════════════════════════════════════════════════════

    // ── Helpers Excel ────────────────────────────────────────────────────────
    function xlsxNum(v)    { return { v, t: 'n', z: '#,##0.00' }; }
    function xlsxPct(v)    { return { v: v / 100, t: 'n', z: '0%' }; }
    function xlsxDate(d)   { return { v: d, t: 's' }; }
    function xlsxBold(v)   { return { v, t: 's' }; }
    function xlsxHeader(v) { return { v, t: 's' }; }

    function setColWidths(ws, widths) {
        ws['!cols'] = widths.map(w => ({ wch: w }));
    }

    function addRow(ws, rowIdx, colIdx, cells) {
        cells.forEach((cell, ci) => {
            if (cell === null || cell === undefined) return;
            const ref = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx + ci });
            ws[ref] = typeof cell === 'object' ? cell : { v: cell, t: typeof cell === 'number' ? 'n' : 's' };
        });
    }

    function sheetRange(ws, r, c) {
        if (!ws['!ref']) ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r, c } });
        else {
            const cur = XLSX.utils.decode_range(ws['!ref']);
            ws['!ref'] = XLSX.utils.encode_range({
                s: { r: 0, c: 0 },
                e: { r: Math.max(cur.e.r, r), c: Math.max(cur.e.c, c) }
            });
        }
    }

    const curr = window.CURR.symbol;
    const companyName = 'Nestio — Gestion Immobilière';
    const genDate = new Date().toLocaleDateString('fr-FR');

    // ── EXPORT 1 : État Financier Professionnel ─────────────────────────────
    function exportEtatFinancierXlsx() {
        if (!rapportData) { toast('Générez le rapport avant d\'exporter', 'error'); return; }
        if (typeof XLSX === 'undefined') { toast('Bibliothèque Excel non disponible', 'error'); return; }

        const d   = rapportData;
        const tot = d.totals;
        const wb  = XLSX.utils.book_new();
        const periodStr = `${d.date_from} au ${d.date_to}`;

        // ── SHEET 1 : RÉSUMÉ EXÉCUTIF ──────────────────────────────────────
        const ws1 = {};
        let r = 0;
        const addR = (cells) => { addRow(ws1, r, 0, cells); r++; };

        addR([companyName]);
        addR(['ÉTAT FINANCIER — RÉSUMÉ EXÉCUTIF']);
        addR([`Période : ${periodStr}`]);
        addR([`Généré le : ${genDate}`]);
        addR([]);
        addR(['INDICATEURS CLÉS DU PORTEFEUILLE', '', '', '']);
        addR(['Métrique', 'Valeur', 'Devise']);
        addR(['Total Revenus',       xlsxNum(tot.revenues),  curr]);
        addR(['Total Dépenses',      xlsxNum(tot.expenses),  curr]);
        addR(['Résultat Net',        xlsxNum(tot.net),        curr]);
        addR(['Marge Brute',         xlsxPct(tot.margin_pct), '']);
        addR(['Nombre de biens',     d.properties.length,    '']);
        addR([]);
        addR(['COMPARAISON PAR BIEN', '', '', '', '', '', '']);
        addR(['Bien', 'Revenus', 'Dépenses', 'Résultat Net', 'Marge %', 'Taux Occup.', 'Séjours']);
        d.properties.forEach(p => {
            addR([p.name, xlsxNum(p.total_revenues), xlsxNum(p.total_expenses),
                  xlsxNum(p.net_income), xlsxPct(p.margin_pct), xlsxPct(p.taux_occupation), p.sejours_count]);
        });
        addR([]);
        addR(['TOTAL', xlsxNum(tot.revenues), xlsxNum(tot.expenses), xlsxNum(tot.net), xlsxPct(tot.margin_pct), '', '']);

        setColWidths(ws1, [35, 18, 18, 18, 12, 14, 12]);
        sheetRange(ws1, r, 6);
        XLSX.utils.book_append_sheet(wb, ws1, 'Résumé');

        // ── SHEET 2 : COMPTE DE RÉSULTAT PAR BIEN ─────────────────────────
        // Une feuille par propriété
        d.properties.forEach(p => {
            const ws = {};
            let pr = 0;
            const add = (cells) => { addRow(ws, pr, 0, cells); pr++; };

            add([companyName]);
            add([`COMPTE DE RÉSULTAT — ${p.name.toUpperCase()}`]);
            add([`Période : ${periodStr}`]);
            add([p.address ? `Adresse : ${p.address}` : '']);
            add([`Généré le : ${genDate}`]);
            add([]);

            // KPIs
            add(['INDICATEURS', '', '']);
            add(['Revenus totaux',    xlsxNum(p.total_revenues), curr]);
            add(['Dépenses totales',  xlsxNum(p.total_expenses), curr]);
            add(['Résultat Net',      xlsxNum(p.net_income),     curr]);
            add(['Marge brute',       xlsxPct(p.margin_pct),     '']);
            add(['Taux d\'occupation', xlsxPct(p.taux_occupation), '']);
            add(['Nombre de séjours', p.sejours_count,           '']);
            add(['Nombre d\'appartements', p.units_count,        '']);
            add([]);

            // Revenus par catégorie
            add(['REVENUS PAR CATÉGORIE', '', '']);
            add(['Catégorie', 'Montant', 'Nb opérations']);
            p.revenue_by_category.forEach(c => add([c.name, xlsxNum(c.total), c.count]));
            add(['TOTAL REVENUS', xlsxNum(p.total_revenues), '']);
            add([]);

            // Dépenses par catégorie
            add(['DÉPENSES PAR CATÉGORIE', '', '']);
            add(['Catégorie', 'Montant', 'Nb opérations']);
            p.expense_by_category.forEach(c => add([c.name, xlsxNum(c.total), c.count]));
            add(['TOTAL DÉPENSES', xlsxNum(p.total_expenses), '']);
            add([]);

            // Résultat net
            add(['RÉSULTAT NET', xlsxNum(p.net_income), curr]);
            add([]);

            // Par appartement
            if (p.units.length) {
                add(['DÉTAIL PAR APPARTEMENT', '', '', '', '', '']);
                add(['Appartement', 'Revenus', 'Dépenses', 'Net', 'Taux Occup.', 'Séjours']);
                p.units.forEach(u => add([
                    u.label, xlsxNum(u.revenues), xlsxNum(u.expenses),
                    xlsxNum(u.net), xlsxPct(u.taux_occupation), u.sejours_count
                ]));
                add([]);
            }

            // Ventilation mensuelle
            if (p.monthly.length) {
                add(['VENTILATION MENSUELLE', '', '', '']);
                add(['Mois', 'Revenus', 'Dépenses', 'Net']);
                p.monthly.forEach(m => add([m.month, xlsxNum(m.revenues), xlsxNum(m.expenses), xlsxNum(m.net)]));
            }

            setColWidths(ws, [35, 18, 18, 18, 14, 12]);
            sheetRange(ws, pr, 5);
            // Nom de feuille: max 31 chars, sans caractères interdits
            const sheetName = p.name.replace(/[:\\/?\[\]*]/g, '').slice(0, 31);
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        });

        const filename = `etat-financier_${d.date_from}_${d.date_to}.xlsx`;
        XLSX.writeFile(wb, filename);
        toast('État Financier exporté ✓');
    }

    // ── EXPORT 2 : Synthèse Simple par Bien ─────────────────────────────────
    function exportSyntheseXlsx() {
        if (!rapportData) { toast('Générez le rapport avant d\'exporter', 'error'); return; }
        if (typeof XLSX === 'undefined') { toast('Bibliothèque Excel non disponible', 'error'); return; }

        const d   = rapportData;
        const tot = d.totals;
        const wb  = XLSX.utils.book_new();
        const periodStr = `${d.date_from} au ${d.date_to}`;

        // ── FEUILLE PRINCIPALE : Vue d'ensemble ────────────────────────────
        const ws = {};
        let r = 0;
        const add = (cells) => { addRow(ws, r, 0, cells); r++; };

        add([companyName]);
        add(['SYNTHÈSE DE PERFORMANCE PAR BIEN']);
        add([`Période analysée : ${periodStr}`]);
        add([`Document généré le : ${genDate}`]);
        add([]);
        add(['Ce document présente, pour chaque bien immobilier, les revenus générés, les dépenses', '', '', '', '', '', '']);
        add(['engagées et le résultat net sur la période sélectionnée.', '', '', '', '', '', '']);
        add([]);

        // Vue consolidée
        add(['VUE CONSOLIDÉE DU PORTEFEUILLE', '', '', '', '', '', '']);
        add([]);
        add(['Bien', `Revenus (${curr})`, `Dépenses (${curr})`, `Résultat Net (${curr})`, 'Marge %', 'Taux Occupation', 'Nb Séjours']);

        d.properties.forEach(p => {
            add([p.name, xlsxNum(p.total_revenues), xlsxNum(p.total_expenses),
                 xlsxNum(p.net_income), xlsxPct(p.margin_pct), xlsxPct(p.taux_occupation), p.sejours_count]);
        });

        add([]);
        add(['TOTAL PORTEFEUILLE', xlsxNum(tot.revenues), xlsxNum(tot.expenses),
             xlsxNum(tot.net), xlsxPct(tot.margin_pct), '', '']);
        add([]);

        // Section par bien
        d.properties.forEach((p, idx) => {
            add([`─── BIEN ${idx + 1} : ${p.name.toUpperCase()} ───`, '', '', '', '', '', '']);
            if (p.address) add([`Adresse : ${p.address}`, '', '', '', '', '', '']);
            add([]);
            add([`CE QUE LE BIEN A GÉNÉRÉ (${periodStr})`, '', '', '', '', '', '']);
            add([]);

            // Revenus
            add(['REVENUS', '', '']);
            p.revenue_by_category.forEach(c => add([`  ${c.name}`, xlsxNum(c.total), `${c.count} opération${c.count > 1 ? 's' : ''}`]));
            add(['  TOTAL REVENUS', xlsxNum(p.total_revenues), '']);
            add([]);

            // Dépenses
            add(['DÉPENSES', '', '']);
            p.expense_by_category.forEach(c => add([`  ${c.name}`, xlsxNum(c.total), `${c.count} opération${c.count > 1 ? 's' : ''}`]));
            add(['  TOTAL DÉPENSES', xlsxNum(p.total_expenses), '']);
            add([]);

            // Résultat
            add(['RÉSULTAT NET', xlsxNum(p.net_income), curr]);
            add([`MARGE BRUTE`, xlsxPct(p.margin_pct), '']);
            add([]);

            // Occupation
            add(['OCCUPATION', '', '']);
            add(['  Taux d\'occupation', xlsxPct(p.taux_occupation), '']);
            add(['  Nombre de séjours', p.sejours_count, '']);
            add(['  Nombre d\'appartements', p.units_count, '']);
            add([]);

            // Appartements
            if (p.units.length > 1) {
                add(['RÉPARTITION PAR APPARTEMENT', '', '', '', '', '']);
                add(['  Appartement', 'Revenus', 'Dépenses', 'Net', 'Occupation', 'Séjours']);
                p.units.forEach(u => add([
                    `  ${u.label}`, xlsxNum(u.revenues), xlsxNum(u.expenses),
                    xlsxNum(u.net), xlsxPct(u.taux_occupation), u.sejours_count
                ]));
                add([]);
            }

            // Mensuel
            if (p.monthly.length) {
                add(['MOIS PAR MOIS', '', '', '']);
                add(['  Mois', 'Revenus', 'Dépenses', 'Net']);
                p.monthly.forEach(m => add([`  ${m.month}`, xlsxNum(m.revenues), xlsxNum(m.expenses), xlsxNum(m.net)]));
                add([]);
            }

            add(['', '', '', '', '', '', '']);
        });

        setColWidths(ws, [42, 18, 18, 18, 14, 16, 12]);
        sheetRange(ws, r, 6);
        XLSX.utils.book_append_sheet(wb, ws, 'Synthèse');

        const filename = `synthese-biens_${d.date_from}_${d.date_to}.xlsx`;
        XLSX.writeFile(wb, filename);
        toast('Synthèse exportée ✓');
    }

    // ── Export État Financier depuis Tab 1 ────────────────────────────────────
    function exportEtatExcel() {
        if (!etatData) { toast('Générez le rapport avant d\'exporter', 'error'); return; }
        if (typeof XLSX === 'undefined') { toast('Bibliothèque Excel non disponible', 'error'); return; }

        const d         = etatData;
        const propName  = d.property ? d.property.name : 'Toutes les propriétés';
        const unitSuf   = d.unit ? ` — ${d.unit.label}` : '';
        const periodStr = `${d.date_from} au ${d.date_to}`;
        const wb        = XLSX.utils.book_new();

        // ── Sheet 1 : Compte de résultat ──────────────────────────────────
        const ws1 = {};
        let r = 0;
        const add1 = (cells) => { addRow(ws1, r, 0, cells); r++; };

        add1([companyName]);
        add1(['COMPTE DE RÉSULTAT']);
        add1([`${propName}${unitSuf}`]);
        add1([`Période : ${periodStr}`]);
        add1([`Généré le : ${genDate}`]);
        add1([]);
        add1(['REVENUS', `Montant (${curr})`]);
        d.revenues.forEach(c => add1([`  ${c.category_name}`, xlsxNum(c.total)]));
        add1(['TOTAL REVENUS', xlsxNum(d.total_revenues)]);
        add1([]);
        add1(['DÉPENSES', `Montant (${curr})`]);
        d.expenses.forEach(c => add1([`  ${c.category_name}`, xlsxNum(c.total)]));
        add1(['TOTAL DÉPENSES', xlsxNum(d.total_expenses)]);
        add1([]);
        add1(['RÉSULTAT NET', xlsxNum(d.net_income)]);
        if (d.total_revenues > 0) {
            add1(['MARGE BRUTE', xlsxPct(Math.round((d.net_income / d.total_revenues) * 100))]);
        }

        setColWidths(ws1, [40, 18]);
        sheetRange(ws1, r, 1);
        XLSX.utils.book_append_sheet(wb, ws1, 'Compte de Résultat');

        // ── Sheet 2 : Détail Revenus ──────────────────────────────────────
        function buildDetailSheet(groups, totalLabel, total) {
            const ws = {};
            let dr = 0;
            const addD = (cells) => { addRow(ws, dr, 0, cells); dr++; };
            addD(['Date', 'Propriété', 'Appartement', 'Catégorie', 'Description', 'Source', `Montant (${curr})`]);
            groups.forEach(cat => {
                [...cat.transactions].sort((a, b) => b.date.localeCompare(a.date)).forEach(t => {
                    addD([t.date, t.property_name, t.unit_label || '—', cat.category_name,
                          t.description || '—', t.source === 'CAISSE' ? 'Caisse' : 'Banque',
                          xlsxNum(t.amount)]);
                });
            });
            addD([totalLabel, '', '', '', '', '', xlsxNum(total)]);
            setColWidths(ws, [12, 24, 18, 20, 36, 10, 16]);
            sheetRange(ws, dr, 6);
            return ws;
        }

        XLSX.utils.book_append_sheet(wb, buildDetailSheet(d.revenues, 'TOTAL REVENUS', d.total_revenues), 'Détail Revenus');
        XLSX.utils.book_append_sheet(wb, buildDetailSheet(d.expenses, 'TOTAL DÉPENSES', d.total_expenses), 'Détail Dépenses');

        // ── Sheet 3 : Mensuel ─────────────────────────────────────────────
        if (d.monthly && d.monthly.length) {
            const ws3 = {};
            let mr = 0;
            const addM = (cells) => { addRow(ws3, mr, 0, cells); mr++; };
            addM([`Ventilation mensuelle — ${propName}${unitSuf}`]);
            addM([`Période : ${periodStr}`]);
            addM([]);
            addM(['Mois', `Revenus (${curr})`, `Dépenses (${curr})`, `Net (${curr})`]);
            d.monthly.forEach(m => addM([m.month, xlsxNum(m.revenues), xlsxNum(m.expenses), xlsxNum(m.net)]));
            addM(['TOTAL', xlsxNum(d.total_revenues), xlsxNum(d.total_expenses), xlsxNum(d.net_income)]);
            setColWidths(ws3, [14, 18, 18, 18]);
            sheetRange(ws3, mr, 3);
            XLSX.utils.book_append_sheet(wb, ws3, 'Mensuel');
        }

        const safe = propName.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase();
        XLSX.writeFile(wb, `compte-resultat_${safe}_${d.date_from}_${d.date_to}.xlsx`);
        toast('État Financier exporté ✓');
    }

    // ── Initial render ────────────────────────────────────────────────────────
    render();
}
