async function renderFinancePage(container) {
    const lang = window.LANG || 'fr';

    // ── Traductions FR / EN ────────────────────────────────────────────────
    const T = {
        fr: {
            page_title: 'Compte de Résultat',
            page_sub: 'Analyse financière détaillée par bien',
            prop_label: 'Propriété',
            unit_label: 'Appartement',
            all_props: 'Toutes les propriétés',
            all_units: 'Tous les appartements',
            from_label: 'Du',
            to_label: 'au',
            btn_generate: 'Générer',
            btn_export: 'Exporter Excel',
            yr_current: 'Année en cours',
            yr_prev: 'Année précédente',
            mo_current: 'Ce mois',
            mo_prev: 'Mois précédent',
            section_rev: 'REVENUS',
            section_exp: 'DÉPENSES',
            total_rev: 'TOTAL REVENUS',
            total_exp: 'TOTAL DÉPENSES',
            net: 'RÉSULTAT NET',
            profit: 'Bénéfice',
            loss: 'Déficit',
            col_date: 'Date',
            col_desc: 'Description',
            col_prop: 'Propriété',
            col_unit: 'Appartement',
            col_cat: 'Catégorie',
            col_source: 'Source',
            col_amount: 'Montant',
            no_data: 'Aucune transaction sur cette période.',
            no_rev: 'Aucun revenu.',
            no_exp: 'Aucune dépense.',
            caisse: 'Caisse',
            banque: 'Banque',
            period: 'Période',
            generated: 'Généré le',
            sheet_summary: 'Résumé',
            sheet_rev: 'Détail Revenus',
            sheet_exp: 'Détail Dépenses',
            all_label: 'Toutes les propriétés',
            select_prompt: 'Sélectionnez les filtres et cliquez sur Générer pour afficher le compte de résultat.',
            loading: 'Chargement…',
            transactions: 'transactions',
            see_detail: '▶ Voir le détail',
            hide_detail: '▼ Masquer',
            export_success: 'Fichier Excel exporté avec succès',
            export_nodata: 'Générez le rapport avant d\'exporter',
            export_nolib: 'Bibliothèque Excel non disponible',
        },
        en: {
            page_title: 'Income Statement',
            page_sub: 'Detailed financial analysis by property',
            prop_label: 'Property',
            unit_label: 'Unit',
            all_props: 'All properties',
            all_units: 'All units',
            from_label: 'From',
            to_label: 'to',
            btn_generate: 'Generate',
            btn_export: 'Export Excel',
            yr_current: 'Current year',
            yr_prev: 'Previous year',
            mo_current: 'This month',
            mo_prev: 'Previous month',
            section_rev: 'REVENUES',
            section_exp: 'EXPENSES',
            total_rev: 'TOTAL REVENUES',
            total_exp: 'TOTAL EXPENSES',
            net: 'NET INCOME',
            profit: 'Profit',
            loss: 'Loss',
            col_date: 'Date',
            col_desc: 'Description',
            col_prop: 'Property',
            col_unit: 'Unit',
            col_cat: 'Category',
            col_source: 'Source',
            col_amount: 'Amount',
            no_data: 'No transactions for this period.',
            no_rev: 'No revenue.',
            no_exp: 'No expenses.',
            caisse: 'Cash',
            banque: 'Bank',
            period: 'Period',
            generated: 'Generated on',
            sheet_summary: 'Summary',
            sheet_rev: 'Revenue Detail',
            sheet_exp: 'Expense Detail',
            all_label: 'All properties',
            select_prompt: 'Select filters and click Generate to display the income statement.',
            loading: 'Loading…',
            transactions: 'transactions',
            see_detail: '▶ Show details',
            hide_detail: '▼ Hide',
            export_success: 'Excel file exported successfully',
            export_nodata: 'Generate the report before exporting',
            export_nolib: 'Excel library unavailable',
        },
    };
    const i = T[lang] || T.fr;

    // ── Date helpers ───────────────────────────────────────────────────────
    const now = new Date();
    const today       = now.toISOString().slice(0, 10);
    const yearStart   = `${now.getFullYear()}-01-01`;
    const prevYStart  = `${now.getFullYear() - 1}-01-01`;
    const prevYEnd    = `${now.getFullYear() - 1}-12-31`;
    const monthStart  = `${now.toISOString().slice(0, 7)}-01`;
    const prevMEnd    = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
    const prevMStart  = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);

    // ── Load filter data ───────────────────────────────────────────────────
    let properties = [], units = [];
    try {
        [properties, units] = await Promise.all([api('/properties'), api('/units')]);
    } catch (e) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${e.message}</p></div>`;
        return;
    }

    let currentData = null;
    let filters = { property_id: '', unit_id: '', date_from: yearStart, date_to: today };

    // ── Unit dropdown (filtered by property) ──────────────────────────────
    function buildUnitOptions(pid) {
        const list = pid ? units.filter(u => u.property_id === Number(pid)) : units;
        return `<option value="">${i.all_units}</option>` +
            list.map(u => `<option value="${u.id}" ${filters.unit_id == u.id ? 'selected' : ''}>${u.property_name ? u.property_name + ' — ' : ''}${u.label}</option>`).join('');
    }

    // ── Render full page shell ─────────────────────────────────────────────
    function renderPage() {
        container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">📈 ${i.page_title}</div>
          <div class="page-subtitle">${i.page_sub}</div>
        </div>
        <button class="btn btn-primary" id="fi-export" ${currentData ? '' : 'disabled'} style="display:flex;align-items:center;gap:8px">
          📥 ${i.btn_export}
        </button>
      </div>

      <!-- Filters card -->
      <div class="card" style="margin-bottom:20px">
        <div style="padding:16px 20px 0;display:flex;align-items:flex-end;gap:14px;flex-wrap:wrap">
          <div class="form-group" style="margin:0;flex:1;min-width:160px">
            <label class="form-label">🏘️ ${i.prop_label}</label>
            <select class="form-control" id="fi-prop">
              <option value="">${i.all_props}</option>
              ${properties.map(p => `<option value="${p.id}" ${filters.property_id == p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="margin:0;flex:1;min-width:160px">
            <label class="form-label">🚪 ${i.unit_label}</label>
            <select class="form-control" id="fi-unit">${buildUnitOptions(filters.property_id)}</select>
          </div>
          <div class="form-group" style="margin:0">
            <label class="form-label">${i.from_label}</label>
            <input type="date" class="form-control" id="fi-from" value="${filters.date_from}" style="width:148px" />
          </div>
          <div class="form-group" style="margin:0">
            <label class="form-label">${i.to_label}</label>
            <input type="date" class="form-control" id="fi-to" value="${filters.date_to}" style="width:148px" />
          </div>
          <button class="btn btn-primary" id="fi-generate" style="white-space:nowrap">🔍 ${i.btn_generate}</button>
        </div>
        <!-- Quick periods -->
        <div style="padding:10px 20px 14px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm qp" data-from="${yearStart}"  data-to="${today}">${i.yr_current}</button>
          <button class="btn btn-ghost btn-sm qp" data-from="${prevYStart}" data-to="${prevYEnd}">${i.yr_prev}</button>
          <button class="btn btn-ghost btn-sm qp" data-from="${monthStart}" data-to="${today}">${i.mo_current}</button>
          <button class="btn btn-ghost btn-sm qp" data-from="${prevMStart}" data-to="${prevMEnd}">${i.mo_prev}</button>
        </div>
      </div>

      <!-- Statement output -->
      <div id="fi-statement">
        <div class="card" style="padding:48px;text-align:center;color:var(--text-3)">
          <div style="font-size:36px;margin-bottom:12px">📊</div>
          <p style="font-size:14px">${i.select_prompt}</p>
        </div>
      </div>
    `;
        bindEvents();
        if (currentData) document.getElementById('fi-statement').innerHTML = buildStatement(currentData);
    }

    // ── Build income statement HTML ────────────────────────────────────────
    function buildStatement(d) {
        if (!d.revenues.length && !d.expenses.length) {
            return `<div class="card" style="padding:48px;text-align:center">
        <div style="font-size:36px;margin-bottom:12px">📭</div>
        <p style="color:var(--text-3)">${i.no_data}</p>
      </div>`;
        }

        const propName = d.property ? d.property.name : i.all_label;
        const unitSuffix = d.unit ? ` — ${d.unit.label}` : '';
        const net = d.net_income;
        const netColor = net >= 0 ? 'var(--green)' : 'var(--red)';
        const netSign  = net >= 0 ? '+' : '';
        const netLabel = net >= 0 ? `▲ ${i.profit}` : `▼ ${i.loss}`;

        return `
      <div class="card" style="overflow:hidden">

        <!-- Header -->
        <div style="background:var(--bg-2);padding:22px 28px;border-bottom:1px solid var(--border)">
          <div style="font-size:17px;font-weight:700;color:var(--text-1);letter-spacing:0.6px">
            ${i.page_title.toUpperCase()}
          </div>
          <div style="font-size:12px;color:var(--text-2);margin-top:6px;display:flex;gap:20px;flex-wrap:wrap">
            <span>🏘️ <strong>${propName}${unitSuffix}</strong></span>
            <span>📅 ${fmtDate(d.date_from)} ${i.to_label} ${fmtDate(d.date_to)}</span>
          </div>
        </div>

        <!-- REVENUS section -->
        <div>
          <div style="padding:12px 28px;background:rgba(34,211,169,.05);border-bottom:1px solid var(--border)">
            <span style="font-size:10px;font-weight:700;letter-spacing:2px;color:var(--green);text-transform:uppercase">${i.section_rev}</span>
          </div>
          ${d.revenues.length
                ? d.revenues.map((cat, idx) => buildCategoryRow(cat, `r${idx}`, 'in')).join('')
                : `<div style="padding:14px 28px;color:var(--text-3);font-size:13px;font-style:italic">${i.no_rev}</div>`}
          <div style="padding:13px 28px;display:flex;justify-content:space-between;align-items:center;background:rgba(34,211,169,.09);border-top:1px solid rgba(34,211,169,.25);border-bottom:2px solid rgba(34,211,169,.35)">
            <span style="font-weight:700;font-size:13px;color:var(--green)">${i.total_rev}</span>
            <span style="font-weight:700;font-size:15px;color:var(--green)">${fmtMoney(d.total_revenues)}</span>
          </div>
        </div>

        <!-- DÉPENSES section -->
        <div>
          <div style="padding:12px 28px;background:rgba(255,91,122,.05);border-bottom:1px solid var(--border)">
            <span style="font-size:10px;font-weight:700;letter-spacing:2px;color:var(--red);text-transform:uppercase">${i.section_exp}</span>
          </div>
          ${d.expenses.length
                ? d.expenses.map((cat, idx) => buildCategoryRow(cat, `e${idx}`, 'out')).join('')
                : `<div style="padding:14px 28px;color:var(--text-3);font-size:13px;font-style:italic">${i.no_exp}</div>`}
          <div style="padding:13px 28px;display:flex;justify-content:space-between;align-items:center;background:rgba(255,91,122,.09);border-top:1px solid rgba(255,91,122,.25);border-bottom:2px solid rgba(255,91,122,.35)">
            <span style="font-weight:700;font-size:13px;color:var(--red)">${i.total_exp}</span>
            <span style="font-weight:700;font-size:15px;color:var(--red)">${fmtMoney(d.total_expenses)}</span>
          </div>
        </div>

        <!-- Résultat net -->
        <div style="padding:22px 28px;display:flex;justify-content:space-between;align-items:center;background:var(--bg-2);border-top:3px solid var(--border)">
          <div>
            <div style="font-size:14px;font-weight:700;color:var(--text-1);letter-spacing:0.5px">${i.net}</div>
            <div style="font-size:11px;color:var(--text-3);margin-top:3px">${netLabel}</div>
          </div>
          <div style="font-size:24px;font-weight:700;color:${netColor}">${netSign}${fmtMoney(net)}</div>
        </div>
      </div>
    `;
    }

    // ── Category row with expandable transactions ──────────────────────────
    function buildCategoryRow(cat, uid, kind) {
        const amtCls = kind === 'in' ? 'amount-in' : 'amount-out';
        const detailId = `fi-detail-${uid}`;
        const txRows = [...cat.transactions]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map(t => `<tr>
          <td style="white-space:nowrap">${fmtDate(t.date)}</td>
          <td class="text-muted">${t.description || '—'}</td>
          <td class="text-muted">${t.property_name}</td>
          <td class="text-muted">${t.unit_label || '—'}</td>
          <td class="text-muted">${t.source === 'CAISSE' ? i.caisse : i.banque}</td>
          <td class="${amtCls}" style="text-align:right;font-weight:600;white-space:nowrap">${fmtMoney(t.amount)}</td>
        </tr>`).join('');

        return `
      <div style="border-bottom:1px solid var(--border)">
        <!-- Category header (clickable) -->
        <div style="padding:10px 28px;display:flex;justify-content:space-between;align-items:center;cursor:pointer"
             onclick="(function(el){
               var det=document.getElementById('${detailId}');
               var open=det.style.display!=='none';
               det.style.display=open?'none':'block';
               el.querySelector('.fi-arrow').textContent=open?'▶':'▼';
             })(this)">
          <div style="display:flex;align-items:center;gap:10px">
            <span class="fi-arrow" style="font-size:9px;color:var(--text-3);transition:transform .2s;width:10px">▶</span>
            <span style="font-size:13px;color:var(--text-1)">${cat.category_name}</span>
            <span style="font-size:10px;color:var(--text-3)">(${cat.transactions.length} ${i.transactions})</span>
          </div>
          <span class="${amtCls}" style="font-weight:600;font-size:13px">${fmtMoney(cat.total)}</span>
        </div>
        <!-- Transaction detail (collapsed by default) -->
        <div id="${detailId}" style="display:none;padding:0 20px 14px;background:var(--bg-2)">
          <table style="font-size:12px">
            <thead><tr>
              <th>${i.col_date}</th>
              <th>${i.col_desc}</th>
              <th>${i.col_prop}</th>
              <th>${i.col_unit}</th>
              <th>${i.col_source}</th>
              <th style="text-align:right">${i.col_amount}</th>
            </tr></thead>
            <tbody>${txRows}</tbody>
          </table>
        </div>
      </div>
    `;
    }

    // ── Events ─────────────────────────────────────────────────────────────
    function bindEvents() {
        // Property change → refresh unit list
        document.getElementById('fi-prop').addEventListener('change', e => {
            filters.property_id = e.target.value;
            filters.unit_id = '';
            document.getElementById('fi-unit').innerHTML = buildUnitOptions(filters.property_id);
        });

        document.getElementById('fi-unit').addEventListener('change', e => {
            filters.unit_id = e.target.value;
        });

        // Quick period buttons
        container.querySelectorAll('.qp').forEach(btn => {
            btn.addEventListener('click', () => {
                filters.date_from = btn.dataset.from;
                filters.date_to   = btn.dataset.to;
                document.getElementById('fi-from').value = filters.date_from;
                document.getElementById('fi-to').value   = filters.date_to;
                generateStatement();
            });
        });

        document.getElementById('fi-generate').addEventListener('click', generateStatement);
        document.getElementById('fi-export').addEventListener('click', exportExcel);
    }

    // ── API call + render ──────────────────────────────────────────────────
    async function generateStatement() {
        filters.property_id = document.getElementById('fi-prop').value;
        filters.unit_id     = document.getElementById('fi-unit').value;
        filters.date_from   = document.getElementById('fi-from').value;
        filters.date_to     = document.getElementById('fi-to').value;

        const stmt = document.getElementById('fi-statement');
        stmt.innerHTML = `<div class="empty-state"><div class="empty-icon">⏳</div><p>${i.loading}</p></div>`;

        try {
            let url = `/finance/income-statement?date_from=${filters.date_from}&date_to=${filters.date_to}`;
            if (filters.property_id) url += `&property_id=${filters.property_id}`;
            if (filters.unit_id)     url += `&unit_id=${filters.unit_id}`;

            currentData = await api(url);
            stmt.innerHTML = buildStatement(currentData);

            const exportBtn = document.getElementById('fi-export');
            if (exportBtn) exportBtn.disabled = false;
        } catch (e) {
            stmt.innerHTML = `<div class="card" style="padding:40px;text-align:center;color:var(--red)"><p>${e.message}</p></div>`;
        }
    }

    // ── Excel export ────────────────────────────────────────────────────────
    function exportExcel() {
        if (!currentData) { toast(i.export_nodata, 'error'); return; }
        if (typeof XLSX === 'undefined') { toast(i.export_nolib, 'error'); return; }

        const d = currentData;
        const propName   = d.property ? d.property.name : i.all_label;
        const unitSuffix = d.unit ? ` — ${d.unit.label}` : '';
        const periodStr  = `${d.date_from} / ${d.date_to}`;

        const wb = XLSX.utils.book_new();

        // ── SHEET 1 : Résumé / Summary ────────────────────────────────────
        const summaryData = [
            [i.page_title.toUpperCase()],
            [`${i.prop_label}: ${propName}${unitSuffix}`, `${i.period}: ${periodStr}`],
            [],
            [i.section_rev, i.col_amount],
            ...d.revenues.map(r => [`  ${r.category_name}`, r.total]),
            [i.total_rev, d.total_revenues],
            [],
            [i.section_exp, i.col_amount],
            ...d.expenses.map(e => [`  ${e.category_name}`, e.total]),
            [i.total_exp, d.total_expenses],
            [],
            [i.net, d.net_income],
            [],
            [`${i.generated}: ${new Date().toLocaleDateString(lang === 'en' ? 'en-GB' : 'fr-FR')}`],
        ];
        const wsSum = XLSX.utils.aoa_to_sheet(summaryData);
        wsSum['!cols'] = [{ wch: 40 }, { wch: 18 }];
        XLSX.utils.book_append_sheet(wb, wsSum, i.sheet_summary);

        // ── SHEET 2 : Détail Revenus / Revenue Detail ─────────────────────
        const detailHeader = [i.col_date, i.col_prop, i.col_unit, i.col_cat, i.col_desc, i.col_source, i.col_amount];

        function buildDetailSheet(groups, totalLabel, total) {
            const rows = [detailHeader];
            groups.forEach(cat => {
                [...cat.transactions]
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .forEach(t => rows.push([
                        t.date,
                        t.property_name,
                        t.unit_label || '—',
                        cat.category_name,
                        t.description || '—',
                        t.source === 'CAISSE' ? i.caisse : i.banque,
                        t.amount,
                    ]));
            });
            rows.push([totalLabel, '', '', '', '', '', total]);
            const ws = XLSX.utils.aoa_to_sheet(rows);
            ws['!cols'] = [
                { wch: 12 }, { wch: 22 }, { wch: 16 },
                { wch: 18 }, { wch: 34 }, { wch: 9 }, { wch: 14 },
            ];
            return ws;
        }

        const wsRev = buildDetailSheet(d.revenues, i.total_rev, d.total_revenues);
        XLSX.utils.book_append_sheet(wb, wsRev, i.sheet_rev);

        const wsExp = buildDetailSheet(d.expenses, i.total_exp, d.total_expenses);
        XLSX.utils.book_append_sheet(wb, wsExp, i.sheet_exp);

        // ── Write file ────────────────────────────────────────────────────
        const safeName = propName.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase();
        const filename  = `compte-resultat_${safeName}_${d.date_from}_${d.date_to}.xlsx`;
        XLSX.writeFile(wb, filename);
        toast(i.export_success);
    }

    // ── Initial render ─────────────────────────────────────────────────────
    renderPage();
}
