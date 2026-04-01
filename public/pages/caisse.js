async function renderCaissePage(container) {
  const _now = new Date();
  let _propFilter   = '';
  let _monthFilter  = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}`;
  let _compteFilter = '';
  let _lastData     = null;
  let _lastProps    = null;

  async function load() {
    try {
      let url = '/caisse';
      const params = [];
      if (_propFilter)   params.push(`property_id=${_propFilter}`);
      if (_monthFilter)  params.push(`month=${_monthFilter}`);
      if (_compteFilter) params.push(`compte_id=${_compteFilter}`);
      if (params.length) url += '?' + params.join('&');
      const [data, props] = await Promise.all([api(url), api('/properties')]);
      _lastData  = data;
      _lastProps = props;
      render(data, props);
    } catch (e) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${e.message}</p></div>`;
    }
  }

  function soldeColor(n) { return n >= 0 ? 'green' : 'red'; }

  // ── Export Excel ──────────────────────────────────────────────────────────
  function exportExcel() {
    if (!_lastData) return;
    const { comptes, properties } = _lastData;
    const sym  = window.CURR ? window.CURR.symbol : 'F';
    const mois = _monthFilter || 'tous';
    const wb   = XLSX.utils.book_new();

    // Un onglet par compte (filtrés ou tous)
    const comptesToExport = _compteFilter
      ? comptes.filter(c => c.id == _compteFilter)
      : comptes;

    comptesToExport.forEach(compte => {
      // Collecter toutes les lignes de ce compte sur toutes les propriétés
      const allRows = [];
      properties.forEach(prop => {
        const cd = prop.comptes.find(c => c.compte_id === compte.id);
        if (!cd || cd.releve.length === 0) return;
        // releve est trié du plus récent → on inverse pour avoir chronologique
        const chronologique = [...cd.releve].reverse();
        chronologique.forEach(t => {
          allRows.push({
            date:        t.date,
            description: t.description || '',
            categorie:   t.category_name || '',
            propriete:   prop.name,
            appartement: t.unit_label || 'Tout l\'immeuble',
            entree:      t.kind === 'IN'  ? t.amount : 0,
            sortie:      t.kind === 'OUT' ? t.amount : 0,
            cumul:       t.solde_apres,
          });
        });
      });

      // Totaux
      const totalIn  = allRows.reduce((s, r) => s + r.entree, 0);
      const totalOut = allRows.reduce((s, r) => s + r.sortie, 0);
      const net      = totalIn - totalOut;

      // Construction du tableau AOA (array of arrays)
      const aoa = [];

      // ── En-tête du fichier ──
      aoa.push([`RELEVÉ DE COMPTE — ${compte.nom.toUpperCase()}`]);
      aoa.push([`Type : ${compte.type === 'CAISSE' ? 'Caisse physique' : 'Compte bancaire'}`]);
      if (compte.nom_banque)    aoa.push([`Banque : ${compte.nom_banque}`]);
      if (compte.numero_compte) aoa.push([`N° compte : ${compte.numero_compte}`]);
      if (compte.iban)          aoa.push([`IBAN : ${compte.iban}`]);
      if (compte.bic)           aoa.push([`BIC : ${compte.bic}`]);
      aoa.push([`Période : ${mois === 'tous' ? 'Toutes périodes' : mois}`]);
      if (_propFilter && _lastProps) {
        const p = _lastProps.find(p => p.id == _propFilter);
        if (p) aoa.push([`Propriété : ${p.name}`]);
      }
      aoa.push([]); // ligne vide

      // ── Résumé ──
      aoa.push(['RÉSUMÉ', '', '', '', '', '', '', '']);
      aoa.push(['Total Entrées', '', '', '', '', fmtMoneyRaw(totalIn), '', '']);
      aoa.push(['Total Sorties', '', '', '', '', '', fmtMoneyRaw(totalOut), '']);
      aoa.push(['Solde net', '', '', '', '', '', '', fmtMoneyRaw(net)]);
      aoa.push([]);

      // ── En-têtes colonnes ──
      const headerRow = aoa.length;
      aoa.push(['Date', 'Description', 'Catégorie', 'Propriété', 'Appartement', `Entrée (${sym})`, `Sortie (${sym})`, `Cumul (${sym})`]);

      // ── Lignes transactions ──
      if (allRows.length === 0) {
        aoa.push(['Aucun mouvement pour cette période.']);
      } else {
        allRows.forEach(r => {
          aoa.push([
            r.date,
            r.description,
            r.categorie,
            r.propriete,
            r.appartement,
            r.entree > 0 ? r.entree : '',
            r.sortie > 0 ? r.sortie : '',
            r.cumul,
          ]);
        });
        // Ligne totaux bas de tableau
        aoa.push([]);
        aoa.push(['TOTAL', '', '', '', '', totalIn, totalOut, net]);
      }

      // Création de la feuille
      const ws = XLSX.utils.aoa_to_sheet(aoa);

      // Largeur des colonnes
      ws['!cols'] = [
        { wch: 12 }, // Date
        { wch: 32 }, // Description
        { wch: 26 }, // Catégorie
        { wch: 22 }, // Propriété
        { wch: 20 }, // Appartement
        { wch: 14 }, // Entrée
        { wch: 14 }, // Sortie
        { wch: 14 }, // Cumul
      ];

      // Nom de l'onglet (max 31 chars, sans caractères spéciaux)
      const sheetName = compte.nom.replace(/[:\\/?*\[\]]/g, '').slice(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    // Onglet résumé global si plusieurs comptes
    if (comptesToExport.length > 1) {
      const aoa = [['RÉSUMÉ GLOBAL TOUS COMPTES'], [`Période : ${mois}`], []];
      aoa.push(['Compte', 'Type', `Solde initial (${sym})`, `Entrées (${sym})`, `Sorties (${sym})`, `Solde (${sym})`]);
      comptes.forEach(c => {
        aoa.push([c.nom, c.type === 'CAISSE' ? 'Caisse' : 'Banque', c.solde_initial, c.total_in, c.total_out, c.solde]);
      });
      aoa.push([]);
      const totalSolde = comptes.reduce((s, c) => s + c.solde, 0);
      const totalIn    = comptes.reduce((s, c) => s + c.total_in, 0);
      const totalOut   = comptes.reduce((s, c) => s + c.total_out, 0);
      aoa.push(['TOTAL', '', '', totalIn, totalOut, totalSolde]);

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!cols'] = [{ wch: 26 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Résumé global');
    }

    // Téléchargement
    const nomCompte = _compteFilter
      ? (comptes.find(c => c.id == _compteFilter)?.nom || 'compte').replace(/\s+/g, '_')
      : 'tous_comptes';
    const filename = `Leasevora_${nomCompte}_${mois}.xlsx`;
    XLSX.writeFile(wb, filename);
    toast('Export Excel téléchargé');
  }

  // Montant brut pour Excel (nombre, pas string formaté)
  function fmtMoneyRaw(n) { return Math.round(n * 100) / 100; }

  function render(data, props) {
    const { comptes, properties } = data;
    const totalSolde = comptes.reduce((s, c) => s + c.solde, 0);
    const totalIn    = comptes.reduce((s, c) => s + c.total_in, 0);
    const totalOut   = comptes.reduce((s, c) => s + c.total_out, 0);

    const selectedCompte = _compteFilter ? comptes.find(c => c.id == _compteFilter) : null;

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">Suivi de Trésorerie</div>
          <div class="page-subtitle">Vue par compte — caisses & banques</div>
        </div>
        <div class="flex-center" style="gap:8px;flex-wrap:wrap">
          <input type="month" class="form-control" id="month-filter" value="${_monthFilter}" style="width:155px" />
          <select class="form-control" id="compte-filter" style="width:210px">
            <option value="">Tous les comptes</option>
            ${comptes.map(c => `<option value="${c.id}" ${_compteFilter == c.id ? 'selected' : ''}>${c.type === 'CAISSE' ? '🏦' : '🏛️'} ${c.nom}</option>`).join('')}
          </select>
          <select class="form-control" id="prop-filter" style="width:200px">
            <option value="">Toutes les propriétés</option>
            ${props.map(p => `<option value="${p.id}" ${_propFilter == p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
          </select>
          <button class="btn btn-primary" id="export-excel-btn" style="white-space:nowrap">
            📥 Exporter Excel
          </button>
        </div>
      </div>

      <!-- Soldes par compte -->
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:24px">
        ${comptes.map(c => `
          <div class="stat-card" style="cursor:pointer;border:2px solid ${_compteFilter == c.id ? 'var(--accent)' : 'transparent'}" data-compte-id="${c.id}">
            <div class="stat-label" style="display:flex;align-items:center;gap:5px">
              <span>${c.type === 'CAISSE' ? '🏦' : '🏛️'}</span>
              <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.nom}</span>
            </div>
            ${c.nom_banque ? `<div style="font-size:10px;color:var(--text-3);margin-bottom:4px">${c.nom_banque}${c.numero_compte ? ' · N° ' + c.numero_compte : ''}</div>` : ''}
            <div class="stat-value ${soldeColor(c.solde)}" style="font-size:20px">${c.solde >= 0 ? '' : '-'}${fmtMoney(Math.abs(c.solde))}</div>
            <div style="font-size:10px;color:var(--text-3);margin-top:4px">
              <span class="amount-in">+${fmtMoney(c.total_in)}</span>
              &nbsp;/&nbsp;
              <span class="amount-out">-${fmtMoney(c.total_out)}</span>
            </div>
          </div>`).join('')}
        <div class="stat-card" style="background:var(--bg-0)">
          <div class="stat-label">Total tous comptes</div>
          <div class="stat-value ${soldeColor(totalSolde)}" style="font-size:20px">${totalSolde >= 0 ? '' : '-'}${fmtMoney(Math.abs(totalSolde))}</div>
          <div style="font-size:10px;color:var(--text-3);margin-top:4px">
            <span class="amount-in">+${fmtMoney(totalIn)}</span>
            &nbsp;/&nbsp;
            <span class="amount-out">-${fmtMoney(totalOut)}</span>
          </div>
        </div>
      </div>

      ${selectedCompte && selectedCompte.iban ? `
      <div class="card" style="padding:14px 18px;margin-bottom:20px;display:flex;flex-wrap:wrap;gap:20px;align-items:center">
        <div style="font-size:12px;font-weight:700;color:var(--text-2);min-width:120px">Coordonnées bancaires</div>
        ${selectedCompte.nom_banque ? `<div><div style="font-size:10px;color:var(--text-3)">Banque</div><div style="font-size:13px;font-weight:600">${selectedCompte.nom_banque}</div></div>` : ''}
        ${selectedCompte.numero_compte ? `<div><div style="font-size:10px;color:var(--text-3)">N° compte</div><div style="font-size:13px;font-family:monospace">${selectedCompte.numero_compte}</div></div>` : ''}
        ${selectedCompte.iban ? `<div><div style="font-size:10px;color:var(--text-3)">IBAN</div><div style="font-size:13px;font-family:monospace;letter-spacing:.5px">${selectedCompte.iban}</div></div>` : ''}
        ${selectedCompte.bic ? `<div><div style="font-size:10px;color:var(--text-3)">BIC</div><div style="font-size:13px;font-family:monospace">${selectedCompte.bic}</div></div>` : ''}
      </div>` : ''}

      <!-- Détail par propriété -->
      ${properties.length === 0 ? `
        <div class="empty-state"><div class="empty-icon">🏦</div><p>Aucune propriété trouvée.</p></div>
      ` : properties.map(p => {
        const comptesActifs = p.comptes.filter(c => c.total_in > 0 || c.total_out > 0 || _compteFilter);
        if (!comptesActifs.length && !_compteFilter) return '';
        return `
        <div class="card" style="margin-bottom:24px">
          <div class="card-header" style="flex-wrap:wrap;gap:12px">
            <div>
              <span class="card-title">🏢 ${p.name}</span>
              <span class="badge badge-${(p.type || 'BUILDING').toLowerCase()}" style="margin-left:8px">${p.type === 'BUILDING' ? 'Immeuble' : 'Indépendant'}</span>
            </div>
            <div class="flex-center" style="gap:16px">
              <div style="text-align:right">
                <div style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.6px">Entrées</div>
                <div style="font-size:16px;font-weight:700" class="amount-in">${fmtMoney(p.total_in)}</div>
              </div>
              <div style="text-align:right">
                <div style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.6px">Sorties</div>
                <div style="font-size:16px;font-weight:700" class="amount-out">${fmtMoney(p.total_out)}</div>
              </div>
              <div style="text-align:right">
                <div style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.6px">Net</div>
                <div style="font-size:20px;font-weight:700;color:var(--${soldeColor(p.solde)})">${p.solde >= 0 ? '+' : ''}${fmtMoney(p.solde)}</div>
              </div>
            </div>
          </div>

          ${comptesActifs.map(c => `
            <div>
              <div style="padding:10px 18px;background:var(--bg-1);border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
                <div style="font-size:12px;font-weight:600;color:var(--text-2)">
                  ${c.compte_type === 'CAISSE' ? '🏦' : '🏛️'} ${c.compte_nom}
                </div>
                <div style="display:flex;align-items:center;gap:12px">
                  <div style="font-size:11px;color:var(--text-3)">
                    <span class="amount-in">+${fmtMoney(c.total_in)}</span>
                    &nbsp;·&nbsp;
                    <span class="amount-out">-${fmtMoney(c.total_out)}</span>
                  </div>
                </div>
              </div>

              ${c.par_appartement.filter(u => u.total_in > 0 || u.total_out > 0).length > 1 ? `
              <div style="padding:12px 18px;border-bottom:1px solid var(--border)">
                <div style="font-size:11px;font-weight:600;color:var(--text-3);margin-bottom:8px;text-transform:uppercase;letter-spacing:.6px">Par appartement</div>
                <div style="display:flex;flex-wrap:wrap;gap:8px">
                  ${c.par_appartement.filter(u => u.total_in > 0 || u.total_out > 0).map(u => `
                    <div style="background:var(--bg-2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 12px;min-width:140px">
                      <div style="font-size:12px;font-weight:600;margin-bottom:4px">${u.label}</div>
                      <div style="font-size:11px;color:var(--text-3)">
                        <span class="amount-in">+${fmtMoney(u.total_in)}</span> /
                        <span class="amount-out">-${fmtMoney(u.total_out)}</span>
                      </div>
                      <div style="font-size:12px;font-weight:600;color:var(--${soldeColor(u.net)})">${u.net >= 0 ? '+' : ''}${fmtMoney(u.net)}</div>
                    </div>`).join('')}
                </div>
              </div>` : ''}

              ${c.releve.length === 0 ? `
                <div style="padding:16px 18px;color:var(--text-3);font-size:13px">Aucun mouvement pour ce compte.</div>
              ` : `
              <table>
                <thead><tr>
                  <th>Date</th><th>Description</th><th>Catégorie</th><th>Appartement</th>
                  <th class="text-right">Mouvement</th><th class="text-right">Cumul</th>
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
                </tbody>
              </table>`}
            </div>
          `).join('')}
        </div>`;
      }).join('')}
    `;

    document.getElementById('month-filter').addEventListener('change', e => { _monthFilter = e.target.value; load(); });
    document.getElementById('prop-filter').addEventListener('change', e => { _propFilter = e.target.value; load(); });
    document.getElementById('compte-filter').addEventListener('change', e => { _compteFilter = e.target.value; load(); });
    document.getElementById('export-excel-btn').addEventListener('click', exportExcel);

    container.querySelectorAll('[data-compte-id]').forEach(card => {
      card.addEventListener('click', () => {
        const cid = card.dataset.compteId;
        _compteFilter = _compteFilter == cid ? '' : cid;
        load();
      });
    });
  }

  await load();
}
