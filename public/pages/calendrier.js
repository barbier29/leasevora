// ── Timeline view mode (module-level state) ───────────────────────────────────
let calViewMode = 'timeline'; // 'timeline' | 'grid'

function setCalViewMode(mode) {
    calViewMode = mode;
    const container = document.getElementById('page-content');
    if (container) renderCalendrierPage(container);
}
window.setCalViewMode = setCalViewMode;

// ── Couleurs par statut de séjour ─────────────────────────────────────────────
const SEJOUR_STATUS_COLORS = {
    EN_COURS:  { bg: 'rgba(16,185,129,0.35)',  border: '#10b981', text: '#ecfdf5', label: 'En cours' },
    A_VENIR:   { bg: 'rgba(99,102,241,0.35)',  border: '#818cf8', text: '#e0e7ff', label: 'À venir' },
    CONFIRME:  { bg: 'rgba(99,102,241,0.30)',  border: '#818cf8', text: '#e0e7ff', label: 'Confirmé' },
    TERMINE:   { bg: 'rgba(148,163,184,0.18)', border: '#64748b', text: '#94a3b8', label: 'Terminé' },
    ANNULE:    { bg: 'rgba(244,63,94,0.25)',   border: '#f43f5e', text: '#fda4af', label: 'Annulé' },
};

function getSejourEffectiveStatus(sejour) {
    const now = new Date();
    const debut = sejour.date_debut ? new Date(sejour.date_debut) : null;
    const fin = sejour.date_fin ? new Date(sejour.date_fin) : null;

    if (sejour.statut === 'ANNULE') return 'ANNULE';
    if (debut && debut > now) return 'A_VENIR';
    if (debut && fin && debut <= now && fin >= now) return 'EN_COURS';
    if (fin && fin < now) return 'TERMINE';
    if (debut && debut <= now && !fin) return 'EN_COURS';
    return sejour.statut || 'A_VENIR';
}

// ── Injection des styles Timeline ─────────────────────────────────────────────
function injectTimelineStyles() {
    if (document.getElementById('nestio-timeline-css')) return;
    const s = document.createElement('style');
    s.id = 'nestio-timeline-css';
    s.textContent = `
        .tl-container { overflow-x: auto; overflow-y: visible; -webkit-overflow-scrolling: touch; }
        .tl-wrap { min-width: max-content; }
        .tl-header { display: flex; position: sticky; top: 0; z-index: 10; background: var(--bg-2); border-bottom: 1px solid var(--border); }
        .tl-unit-col { width: 160px; min-width: 160px; flex-shrink: 0; padding: 10px 14px; font-size: 11px; font-weight: 700; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.5px; border-right: 1px solid var(--border); }
        .tl-months-header { display: flex; flex: 1; }
        .tl-month-label { border-right: 1px solid var(--border); padding: 8px 6px; font-size: 11px; font-weight: 600; color: var(--text-2); text-align: center; white-space: nowrap; flex-shrink: 0; }
        .tl-month-label.current { color: var(--accent-2); }
        .tl-body { }
        .tl-row { display: flex; border-bottom: 1px solid var(--border); }
        .tl-row:hover { background: rgba(255,255,255,0.015); }
        .tl-unit-label { width: 160px; min-width: 160px; padding: 10px 14px; font-size: 12.5px; color: var(--text-2); border-right: 1px solid var(--border); display: flex; align-items: center; flex-shrink: 0; gap: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .tl-unit-label small { font-size: 10px; color: var(--text-3); display: block; }
        .tl-cells { position: relative; flex: 1; height: 44px; }
        .tl-day-grid { position: absolute; inset: 0; display: flex; pointer-events: none; }
        .tl-day-cell { border-right: 1px solid rgba(255,255,255,0.025); flex-shrink: 0; height: 100%; }
        .tl-day-cell.today-line { border-right: 2px solid rgba(99,102,241,0.6); }
        .tl-day-cell.month-start { border-right: 1px solid var(--border); }
        .tl-bar { position: absolute; top: 6px; height: 32px; border-radius: 6px; cursor: pointer; transition: filter 0.15s ease, transform 0.15s ease; border: 1px solid; display: flex; align-items: center; padding: 0 8px; font-size: 11px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
        .tl-bar:hover { filter: brightness(1.15); transform: translateY(-1px); z-index: 5; }
        .tl-today-marker { position: absolute; top: 0; bottom: 0; width: 2px; background: rgba(99,102,241,0.7); z-index: 8; pointer-events: none; }
        .tl-today-marker::before { content: 'Auj.'; position: absolute; top: -18px; left: 50%; transform: translateX(-50%); font-size: 9px; color: var(--accent-2); font-weight: 700; white-space: nowrap; }
        .tl-legend { display: flex; gap: 16px; padding: 12px 16px; flex-wrap: wrap; align-items: center; }
        .tl-legend-item { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--text-2); }
        .tl-legend-dot { width: 10px; height: 10px; border-radius: 3px; border: 1px solid; }
        .tl-group-header { display: flex; background: rgba(255,255,255,0.02); border-bottom: 1px solid var(--border); }
        .tl-group-title { width: 160px; min-width: 160px; padding: 6px 14px; font-size: 10px; font-weight: 700; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.6px; border-right: 1px solid var(--border); }
    `;
    document.head.appendChild(s);
}

async function renderCalendrierPage(container) {
  injectTimelineStyles();

  // ── Helpers ──────────────────────────────────────────────────────────────
  function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
  function coverDate(s, dateStr) {
    if (!s.date_debut) return false;
    return s.date_debut <= dateStr && dateStr <= (s.date_fin || '9999-12-31');
  }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function dateStr(y, m, d) { return `${y}-${pad2(m + 1)}-${pad2(d)}`; }

  const now = new Date();
  let curYear = now.getFullYear();
  let curMonth = now.getMonth();
  let viewMode = 'immeuble';
  let selPropId = '';
  let selUnitId = '';

  // Loaded data — kept in closure so modals can reuse
  let _sejours = [], _props = [], _units = [], _locs = [];

  async function fetchAll() {
    [_sejours, _props, _units, _locs] = await Promise.all([
      api('/sejours'), api('/properties'), api('/units'), api('/locataires'),
    ]);
  }

  async function reload() {
    try { await fetchAll(); renderPage(); }
    catch (e) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${e.message}</p></div>`;
    }
  }

  // ── Open séjour detail popup ─────────────────────────────────────────────
  async function openSejourDetail(sejour) {
    const statusLabel = { A_VENIR: 'À venir', EN_COURS: 'En cours', TERMINE: 'Terminé', ANNULE: 'Annulé' };
    const loc = _locs.find(l => l.id === sejour.locataire_id);
    openModal(`
      <div class="modal-title">🛏️ ${sejour.locataire}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div><div style="font-size:11px;color:var(--text-3)">Appartement</div><div style="font-size:13px;font-weight:600">${sejour.unit_label}</div></div>
        <div><div style="font-size:11px;color:var(--text-3)">Propriété</div><div style="font-size:13px">${sejour.property_name}</div></div>
        <div><div style="font-size:11px;color:var(--text-3)">✈️ Arrivée</div>
          <div style="font-size:13px">${fmtDate(sejour.date_debut)}${sejour.heure_entree ? ' <strong>' + sejour.heure_entree + '</strong>' : ''}</div></div>
        <div><div style="font-size:11px;color:var(--text-3)">🏁 Départ</div>
          <div style="font-size:13px">${sejour.date_fin ? fmtDate(sejour.date_fin) + (sejour.heure_sortie ? ' <strong>' + sejour.heure_sortie + '</strong>' : '') : '—'}</div></div>
        <div><div style="font-size:11px;color:var(--text-3)">Tarif</div>
          <div style="font-size:13px"><span class="amount-in">${fmtMoney(sejour.montant)}</span>/${sejour.type_tarif === 'JOURNALIER' ? 'jour' : 'mois'}</div></div>
        <div><div style="font-size:11px;color:var(--text-3)">Statut</div>
          <div style="font-size:13px"><span class="badge badge-${sejour.statut === 'EN_COURS' ? 'occupied' : 'building'}">${statusLabel[sejour.statut] || sejour.statut}</span></div></div>
        ${sejour.notes ? `<div style="grid-column:1/-1"><div style="font-size:11px;color:var(--text-3)">Notes</div><div style="font-size:13px">${sejour.notes}</div></div>` : ''}
        ${loc ? `<div style="grid-column:1/-1;padding:10px;background:var(--bg-2);border-radius:6px;display:flex;gap:16px;align-items:center">
          <span>👤 <strong>${loc.prenom ? loc.prenom + ' ' : ''}${loc.nom}</strong></span>
          ${loc.telephone ? `<span class="text-muted">${loc.telephone}</span>` : ''}
          ${loc.email ? `<span class="text-muted">${loc.email}</span>` : ''}
        </div>` : ''}
      </div>
      <!-- Bloc paiement -->
      <div style="background:var(--bg-2);border-radius:8px;padding:14px;margin-bottom:16px;border:1px solid var(--border)">
        <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--text-3);margin-bottom:10px">PAIEMENT</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">
          <div style="text-align:center">
            <div style="font-size:10px;color:var(--text-3)">Total dû</div>
            <div style="font-size:15px;font-weight:700">${fmtMoney(sejour.montant_total_du || 0)}</div>
          </div>
          <div style="text-align:center">
            <div style="font-size:10px;color:var(--text-3)">Payé</div>
            <div style="font-size:15px;font-weight:700;color:var(--green)">${fmtMoney(sejour.montant_paye || 0)}</div>
          </div>
          <div style="text-align:center">
            <div style="font-size:10px;color:var(--text-3)">Restant</div>
            <div style="font-size:15px;font-weight:700;color:${(sejour.solde_restant || 0) > 0 ? 'var(--red)' : 'var(--green)'}">${fmtMoney(sejour.solde_restant || 0)}</div>
          </div>
        </div>
        ${(sejour.solde_restant || 0) > 0 ? `
        <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap">
          <div style="flex:1;min-width:80px">
            <label style="font-size:10px;color:var(--text-3);display:block;margin-bottom:3px">Montant</label>
            <input class="form-control" id="cal-pay-amount" type="number" min="0" step="0.01" value="${sejour.solde_restant || ''}" style="height:34px;font-size:13px" />
          </div>
          <div style="flex:1;min-width:80px">
            <label style="font-size:10px;color:var(--text-3);display:block;margin-bottom:3px">Date</label>
            <input class="form-control" id="cal-pay-date" type="date" value="${new Date().toISOString().slice(0,10)}" style="height:34px;font-size:13px" />
          </div>
          <div style="flex:1;min-width:80px">
            <label style="font-size:10px;color:var(--text-3);display:block;margin-bottom:3px">Compte</label>
            <select class="form-control" id="cal-pay-compte" style="height:34px;font-size:12px">
            </select>
          </div>
          <button class="btn btn-primary btn-sm" id="cal-pay-btn" style="height:34px;white-space:nowrap;padding:0 12px">💰 Encaisser</button>
        </div>` : `<div style="color:var(--green);font-size:13px;font-weight:600">✓ Soldé</div>`}
      </div>
      <div class="form-actions">
        <button class="btn btn-danger btn-sm" id="del-sej-modal">🗑 Supprimer</button>
        <button class="btn btn-ghost btn-sm" id="print-quittance-cal-btn">🖨️ Quittance</button>
        <button class="btn btn-ghost" onclick="closeModal()">Fermer</button>
        <button class="btn btn-primary" id="edit-sej-modal">✏️ Modifier</button>
      </div>
    `);

    // Charger les comptes pour le sélecteur
    try {
      const comptes = await api('/comptes');
      const sel = document.getElementById('cal-pay-compte');
      if (sel) {
        comptes.filter(c => c.actif).forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.id;
          opt.textContent = `${c.type === 'CAISSE' ? '🏦' : '🏛️'} ${c.nom}`;
          sel.appendChild(opt);
        });
      }
    } catch {}

    const calPayBtn = document.getElementById('cal-pay-btn');
    if (calPayBtn) {
      calPayBtn.addEventListener('click', async () => {
        const amount = parseFloat(document.getElementById('cal-pay-amount').value);
        const date = document.getElementById('cal-pay-date').value;
        if (!amount || amount <= 0) return toast('Montant invalide', 'error');
        const unit = _units.find(u => u.id === sejour.unit_id) || {};
        try {
          await api('/transactions', { method: 'POST', body: {
            date,
            description: `Loyer — ${sejour.locataire}`,
            kind: 'IN',
            amount,
            property_id: unit.property_id || null,
            unit_id: sejour.unit_id || null,
            sejour_id: sejour.id,
            compte_id: parseInt(document.getElementById('cal-pay-compte')?.value) || 1,
          }});
          toast('Paiement enregistré');
          closeModal();
          await reload();
        } catch (e) { toast(e.message, 'error'); }
      });
    }
    document.getElementById('del-sej-modal').addEventListener('click', async () => {
      if (!confirm(`Supprimer le séjour de "${sejour.locataire}" ?`)) return;
      try { await api(`/sejours/${sejour.id}`, { method: 'DELETE' }); toast('Séjour supprimé'); closeModal(); await reload(); }
      catch (e) { toast(e.message, 'error'); }
    });
    document.getElementById('edit-sej-modal').addEventListener('click', () => {
      closeModal();
      openSejourForm(null, null, sejour);
    });

    document.getElementById('print-quittance-cal-btn')?.addEventListener('click', () => {
      window.printQuittance(sejour.id);
    });
  }

  // Expose globally so timeline bars can trigger detail view
  window.showSejourDetailById = function(id) {
    const s = _sejours.find(s => s.id == id);
    if (s) openSejourDetail(s);
  };

  // ── Open séjour creation form ─────────────────────────────────────────────
  function openSejourForm(unitId = null, defaultDate = null, existingSej = null) {
    const isEdit = !!existingSej;
    const today = defaultDate || new Date().toISOString().slice(0, 10);
    const sej = existingSej;

    const unitOptions = _props.map(p => {
      const pUnits = _units.filter(u => u.property_id === p.id);
      if (!pUnits.length) return '';
      return `<optgroup label="${p.name}">${pUnits.map(u =>
        `<option value="${u.id}" ${(unitId == u.id || sej?.unit_id == u.id) ? 'selected' : ''}>${u.label}</option>`
      ).join('')}</optgroup>`;
    }).join('');

    openModal(`
      <div class="modal-title">${isEdit ? '✏️ Modifier le séjour' : '➕ Nouveau séjour'}</div>
      <form id="cal-sej-form">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Nom du locataire *</label>
            <input class="form-control" id="cs-loc" value="${sej?.locataire || ''}" placeholder="Jean Dupont" required />
          </div>
          <div class="form-group">
            <label class="form-label">Fiche locataire</label>
            <select class="form-control" id="cs-locid">
              <option value="">— Aucune —</option>
              ${_locs.map(l => `<option value="${l.id}" ${sej?.locataire_id == l.id ? 'selected' : ''}>${l.prenom ? l.prenom + ' ' : ''}${l.nom}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Appartement *</label>
          <select class="form-control" id="cs-unit" required>
            <option value="">Sélectionner…</option>${unitOptions}
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Arrivée *</label>
            <input class="form-control" id="cs-debut" type="date" value="${sej?.date_debut || today}" required />
          </div>
          <div class="form-group">
            <label class="form-label">Heure check-in</label>
            <input class="form-control" id="cs-entree" type="time" value="${sej?.heure_entree || '14:00'}" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Départ</label>
            <input class="form-control" id="cs-fin" type="date" value="${sej?.date_fin || ''}" />
          </div>
          <div class="form-group">
            <label class="form-label">Heure check-out</label>
            <input class="form-control" id="cs-sortie" type="time" value="${sej?.heure_sortie || '11:00'}" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Tarif *</label>
            <select class="form-control" id="cs-tarif">
              <option value="MENSUEL" ${sej?.type_tarif !== 'JOURNALIER' ? 'selected' : ''}>Mensuel</option>
              <option value="JOURNALIER" ${sej?.type_tarif === 'JOURNALIER' ? 'selected' : ''}>Journalier</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Montant / période *</label>
            <input class="form-control" id="cs-montant" type="number" min="0" step="0.01" value="${sej?.montant || ''}" required />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Statut</label>
            <select class="form-control" id="cs-statut">
              <option value="A_VENIR"  ${(!sej || sej.statut === 'A_VENIR') ? 'selected' : ''}>À venir</option>
              <option value="EN_COURS" ${sej?.statut === 'EN_COURS' ? 'selected' : ''}>En cours</option>
              <option value="TERMINE"  ${sej?.statut === 'TERMINE' ? 'selected' : ''}>Terminé</option>
              <option value="ANNULE"   ${sej?.statut === 'ANNULE' ? 'selected' : ''}>Annulé</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Notes</label>
            <input class="form-control" id="cs-notes" value="${sej?.notes || ''}" placeholder="Optionnel" />
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" onclick="closeModal()">Annuler</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Enregistrer' : 'Créer le séjour'}</button>
        </div>
      </form>
    `);

    document.getElementById('cs-locid').addEventListener('change', e => {
      if (!e.target.value) return;
      const l = _locs.find(l => l.id == e.target.value);
      if (l) document.getElementById('cs-loc').value = `${l.prenom ? l.prenom + ' ' : ''}${l.nom}`;
    });

    document.getElementById('cal-sej-form').addEventListener('submit', async e => {
      e.preventDefault();
      const body = {
        unit_id: document.getElementById('cs-unit').value,
        locataire: document.getElementById('cs-loc').value.trim(),
        locataire_id: document.getElementById('cs-locid').value ? parseInt(document.getElementById('cs-locid').value) : null,
        date_debut: document.getElementById('cs-debut').value,
        date_fin: document.getElementById('cs-fin').value || null,
        heure_entree: document.getElementById('cs-entree').value || null,
        heure_sortie: document.getElementById('cs-sortie').value || null,
        type_tarif: document.getElementById('cs-tarif').value,
        montant: parseFloat(document.getElementById('cs-montant').value),
        statut: document.getElementById('cs-statut').value,
        notes: document.getElementById('cs-notes').value.trim() || null,
      };
      try {
        if (isEdit) { await api(`/sejours/${sej.id}`, { method: 'PUT', body }); toast('Séjour modifié'); }
        else { await api('/sejours', { method: 'POST', body }); toast('Séjour créé'); }
        closeModal(); await reload();
      } catch (e) { toast(e.message, 'error'); }
    });
  }

  // ── Main render ───────────────────────────────────────────────────────────
  function renderPage() {
    const monthLabel = new Date(curYear, curMonth, 1)
      .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const monthLabelCap = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

    // Boutons de navigation mensuelle — masqués en mode timeline
    const gridNavHtml = calViewMode === 'grid' ? `
      <button class="btn btn-ghost btn-sm" id="prev-m">‹</button>
      <span style="font-size:13px;font-weight:600;min-width:120px;text-align:center">${monthLabelCap}</span>
      <button class="btn btn-ghost btn-sm" id="next-m">›</button>
    ` : '';

    // Sélecteur de vue (immeuble/appartement) — masqué en mode timeline
    const gridViewToggleHtml = calViewMode === 'grid' ? `
      <div class="toggle-group">
        <button class="toggle-btn ${viewMode === 'immeuble' ? 'active' : ''}" id="mode-imm">🏘️ Immeuble</button>
        <button class="toggle-btn ${viewMode === 'appartement' ? 'active' : ''}" id="mode-apt">🚪 Appartement</button>
      </div>
    ` : '';

    // Sélecteur d'appartement individuel — seulement en vue appartement
    const unitSelHtml = (calViewMode === 'grid' && viewMode === 'appartement') ? `
      <select class="form-control" id="unit-sel" style="width:150px">
        <option value="">— Tous —</option>
        ${_units.filter(u => !selPropId || u.property_id == selPropId)
          .map(u => `<option value="${u.id}" ${selUnitId == u.id ? 'selected' : ''}>${u.label}</option>`).join('')}
      </select>` : '';

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">📅 Calendrier des disponibilités</div>
          <div class="page-subtitle">${calViewMode === 'timeline' ? 'Ligne du temps 18 mois — cliquez sur un séjour pour le consulter' : monthLabelCap + ' — cliquez sur une cellule pour réserver ou consulter un séjour'}</div>
        </div>
        <div class="flex-center" style="gap:8px;flex-wrap:wrap">
          <!-- Toggle vue principale -->
          <div style="display:flex;gap:8px">
            <button class="btn btn-sm ${calViewMode === 'grid' ? 'btn-primary' : 'btn-secondary'}" onclick="setCalViewMode('grid')">📅 Mensuel</button>
            <button class="btn btn-sm ${calViewMode === 'timeline' ? 'btn-primary' : 'btn-secondary'}" onclick="setCalViewMode('timeline')">📊 Ligne du temps</button>
          </div>
          ${gridViewToggleHtml}
          <select class="form-control" id="prop-sel" style="width:190px">
            <option value="">Toutes les propriétés</option>
            ${_props.map(p => `<option value="${p.id}" ${selPropId == p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
          </select>
          ${unitSelHtml}
          ${gridNavHtml}
          <button class="btn btn-primary btn-sm" id="add-sej-cal">+ Séjour</button>
        </div>
      </div>

      <!-- Global overview bar (grid only) -->
      ${calViewMode === 'grid' ? '<div id="overview-bar" style="margin-bottom:18px"></div>' : ''}

      <!-- Legend (grid only) -->
      ${calViewMode === 'grid' ? `
      <div class="flex-center" style="gap:16px;margin-bottom:14px;font-size:12px;flex-wrap:wrap">
        <span><span style="display:inline-block;width:12px;height:12px;background:rgba(34,211,169,.3);border-radius:3px;margin-right:4px;vertical-align:middle;border:1px solid var(--green)"></span>Disponible (cliquez pour réserver)</span>
        <span><span style="display:inline-block;width:12px;height:12px;background:rgba(255,91,122,.6);border-radius:3px;margin-right:4px;vertical-align:middle"></span>Occupé (cliquez pour voir)</span>
        <span><span style="display:inline-block;width:12px;height:12px;background:#f5a623;border-radius:3px;margin-right:4px;vertical-align:middle"></span>Arrivée / Départ</span>
      </div>` : ''}

      <div id="cal-content"></div>
    `;

    // Wire nav (grid only)
    if (calViewMode === 'grid') {
      document.getElementById('prev-m').addEventListener('click', () => { curMonth--; if (curMonth < 0) { curMonth = 11; curYear--; } renderPage(); });
      document.getElementById('next-m').addEventListener('click', () => { curMonth++; if (curMonth > 11) { curMonth = 0; curYear++; } renderPage(); });
      document.getElementById('mode-imm').addEventListener('click', () => { viewMode = 'immeuble'; renderPage(); });
      document.getElementById('mode-apt').addEventListener('click', () => { viewMode = 'appartement'; renderPage(); });
    }

    document.getElementById('prop-sel').addEventListener('change', e => { selPropId = e.target.value; selUnitId = ''; renderPage(); });
    const unitSel = document.getElementById('unit-sel');
    if (unitSel) unitSel.addEventListener('change', e => { selUnitId = e.target.value; renderPage(); });
    document.getElementById('add-sej-cal').addEventListener('click', () => openSejourForm(selUnitId || null));

    const calEl = document.getElementById('cal-content');

    if (calViewMode === 'timeline') {
      // Filtrer les unités selon la sélection de propriété
      const unitsToShow = selPropId ? _units.filter(u => u.property_id == selPropId) : _units;
      renderTimeline(calEl, _sejours, unitsToShow, _props);
    } else {
      // Overview bar: compact availability per property
      renderOverviewBar(document.getElementById('overview-bar'));

      if (viewMode === 'immeuble') renderBuildingView(calEl);
      else renderUnitView(calEl);
    }
  }

  // ── Timeline 18 mois ──────────────────────────────────────────────────────
  function renderTimeline(wrapEl, sejours, units, properties) {
    const DAY_PX = 14;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 18);

    const totalDays = Math.round((endDate - startDate) / 86400000);
    const totalWidth = totalDays * DAY_PX;

    function dayOffset(date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return Math.round((d - startDate) / 86400000);
    }

    // Construire la liste des mois avec position
    const months = [];
    let cur = new Date(startDate);
    while (cur < endDate) {
      const year = cur.getFullYear();
      const month = cur.getMonth();
      const monthEnd = new Date(year, month + 1, 1);
      const effectiveDays = Math.min(
        new Date(year, month + 1, 0).getDate(),
        Math.round((endDate - cur) / 86400000)
      );
      const offsetPx = dayOffset(cur) * DAY_PX;
      months.push({
        label: cur.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }).replace(' ', ' \''),
        fullLabel: cur.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
        days: effectiveDays,
        widthPx: effectiveDays * DAY_PX,
        offsetPx,
        isCurrent: today.getFullYear() === year && today.getMonth() === month,
      });
      cur = monthEnd;
    }

    const monthsHtml = months.map(m => `
      <div class="tl-month-label ${m.isCurrent ? 'current' : ''}"
           style="width:${m.widthPx}px" title="${m.fullLabel}">
        ${m.label}
      </div>
    `).join('');

    const todayOffset = dayOffset(today);
    const todayPx = todayOffset * DAY_PX;

    // Construire les rangées groupées par propriété
    let rowsHtml = '';
    const propGroups = {};
    units.forEach(u => {
      const prop = properties.find(p => p.id === u.property_id);
      const propId = prop ? prop.id : 'autres';
      if (!propGroups[propId]) propGroups[propId] = { prop, units: [] };
      propGroups[propId].units.push(u);
    });

    if (!units.length) {
      wrapEl.innerHTML = '<div class="empty-state"><div class="empty-icon">🏘️</div><p>Aucun logement à afficher.</p></div>';
      return;
    }

    Object.values(propGroups).forEach(({ prop, units: propUnits }) => {
      rowsHtml += `
        <div class="tl-group-header">
          <div class="tl-group-title">${prop ? (prop.nom || prop.name || 'Logements') : 'Logements'}</div>
          <div style="flex:1"></div>
        </div>
      `;

      propUnits.forEach(unit => {
        const unitSejours = sejours.filter(s => s.unit_id === unit.id);

        // Grille des mois (séparateurs verticaux)
        const gridCells = months.map(m => `
          <div class="tl-day-cell month-start" style="width:${m.widthPx}px"></div>
        `).join('');

        // Barres de séjour
        const bars = unitSejours.map(s => {
          if (!s.date_debut) return '';

          const effectiveStatus = getSejourEffectiveStatus(s);
          const colors = SEJOUR_STATUS_COLORS[effectiveStatus] || SEJOUR_STATUS_COLORS['A_VENIR'];

          const debutDate = new Date(s.date_debut);
          debutDate.setHours(0, 0, 0, 0);
          const finDate = s.date_fin ? new Date(s.date_fin) : null;
          if (finDate) finDate.setHours(0, 0, 0, 0);

          const barStart = dayOffset(debutDate);
          const barEnd = finDate ? dayOffset(finDate) : barStart + 30;

          if (barEnd < 0 || barStart > totalDays) return '';

          const clampedStart = Math.max(0, barStart);
          const clampedEnd = Math.min(totalDays, barEnd);
          const barWidth = Math.max((clampedEnd - clampedStart) * DAY_PX, 4);
          const barLeft = clampedStart * DAY_PX;

          const locataireNom = s.locataire || s.locataire_nom || '';
          const showLabel = barWidth > 60;

          return `<div class="tl-bar"
            style="left:${barLeft}px;width:${barWidth}px;background:${colors.bg};border-color:${colors.border};color:${colors.text}"
            title="${(unit.label || unit.nom || unit.numero || 'Logement')} — ${locataireNom ? locataireNom + ' — ' : ''}${fmtDate(s.date_debut)} → ${s.date_fin ? fmtDate(s.date_fin) : 'En cours'}"
            onclick="if(window.showSejourDetailById)window.showSejourDetailById(${s.id})">
            ${showLabel ? (locataireNom || colors.label) : ''}
          </div>`;
        }).join('');

        const unitName = unit.label || unit.nom || unit.numero || 'Logement';
        const unitType = unit.type || unit.status || '';

        rowsHtml += `
          <div class="tl-row">
            <div class="tl-unit-label">
              <span>
                ${unitName}
                ${unitType ? `<small>${unitType}</small>` : ''}
              </span>
            </div>
            <div class="tl-cells" style="width:${totalWidth}px">
              <div class="tl-day-grid">${gridCells}</div>
              ${todayOffset >= 0 && todayOffset <= totalDays ? `<div class="tl-today-marker" style="left:${todayPx}px"></div>` : ''}
              ${bars}
            </div>
          </div>
        `;
      });
    });

    // Légende
    const legendHtml = `
      <div class="tl-legend">
        <span style="font-size:11px;color:var(--text-3);font-weight:600;text-transform:uppercase;letter-spacing:.5px">Statuts :</span>
        ${Object.entries(SEJOUR_STATUS_COLORS).map(([k, v]) => `
          <div class="tl-legend-item">
            <div class="tl-legend-dot" style="background:${v.bg};border-color:${v.border}"></div>
            ${v.label}
          </div>
        `).join('')}
      </div>
    `;

    wrapEl.innerHTML = `
      ${legendHtml}
      <div class="tl-container">
        <div class="tl-wrap">
          <div class="tl-header">
            <div class="tl-unit-col">Logement</div>
            <div class="tl-months-header">${monthsHtml}</div>
          </div>
          <div class="tl-body">${rowsHtml}</div>
        </div>
      </div>
    `;

    // Scroll jusqu'à aujourd'hui (centré)
    setTimeout(() => {
      const cont = wrapEl.querySelector('.tl-container');
      if (cont && todayPx > 0) {
        const scrollTo = Math.max(0, todayPx - cont.clientWidth / 2);
        cont.scrollLeft = scrollTo;
      }
    }, 50);
  }

  // ── Global overview bar (compact, always visible) ─────────────────────────
  function renderOverviewBar(el) {
    if (!el) return;
    const days = daysInMonth(curYear, curMonth);
    const today = new Date();
    const todayStr = dateStr(today.getFullYear(), today.getMonth(), today.getDate());

    const propsToShow = selPropId ? _props.filter(p => p.id == selPropId) : _props;
    if (!propsToShow.length) { el.innerHTML = ''; return; }

    const cards = propsToShow.map(p => {
      const units = _units.filter(u => u.property_id === p.id);
      const total = units.length;
      if (!total) return '';

      // Today: how many occupied
      const occToday = units.filter(u => _sejours.some(s => s.unit_id === u.id && s.statut !== 'ANNULE' && coverDate(s, todayStr))).length;
      const pct = Math.round((occToday / total) * 100);

      // Per-unit strip: one colored dot per unit
      const unitDots = units.map(u => {
        const occ = _sejours.some(s => s.unit_id === u.id && s.statut !== 'ANNULE' && coverDate(s, todayStr));
        return `<span title="${u.label}" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${occ ? '#ff5b7a' : '#22d3a9'};margin:1px"></span>`;
      }).join('');

      // Month occupancy strip (1 bar per day)
      const strip = Array.from({ length: days }, (_, i) => {
        const d = dateStr(curYear, curMonth, i + 1);
        const occ = units.filter(u => _sejours.some(s => s.unit_id === u.id && s.statut !== 'ANNULE' && coverDate(s, d))).length;
        const frac = total > 0 ? occ / total : 0;
        const isT = d === todayStr;
        const r = Math.round(255 * frac + 34 * (1 - frac));
        const g = Math.round(91 * frac + 211 * (1 - frac));
        const b = Math.round(122 * frac + 169 * (1 - frac));
        return `<span title="${i + 1}: ${occ}/${total} occupés" style="display:inline-block;width:${100 / days}%;height:18px;background:rgb(${r},${g},${b});${isT ? 'outline:2px solid var(--accent);outline-offset:-1px;' : ''}"></span>`;
      }).join('');

      return `
        <div style="background:var(--bg-1);border:1px solid var(--border);border-radius:var(--radius);padding:12px 16px;flex:1;min-width:200px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <span style="font-size:13px;font-weight:600">${p.name}</span>
            <span style="font-size:12px;color:var(--text-3)">${occToday}/${total} occupés aujourd'hui</span>
          </div>
          <div style="display:flex;border-radius:4px;overflow:hidden;margin-bottom:8px">${strip}</div>
          <div style="display:flex;gap:3px;flex-wrap:wrap">${unitDots}</div>
        </div>`;
    }).filter(Boolean).join('');

    el.innerHTML = cards ? `<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:4px">${cards}</div>` : '';
  }

  // ── Building timeline view ─────────────────────────────────────────────────
  function renderBuildingView(el) {
    const days = daysInMonth(curYear, curMonth);
    const today = new Date();
    const isToday = d => today.getFullYear() === curYear && today.getMonth() === curMonth && today.getDate() === d;

    const filterUnits = selPropId ? _units.filter(u => u.property_id == selPropId) : _units;
    if (!filterUnits.length) {
      el.innerHTML = '<div class="empty-state"><div class="empty-icon">🏘️</div><p>Aucun appartement.</p></div>';
      return;
    }

    const propGroups = {};
    for (const u of filterUnits) {
      if (!propGroups[u.property_id]) propGroups[u.property_id] = [];
      propGroups[u.property_id].push(u);
    }

    const dayNums = Array.from({ length: days }, (_, i) => i + 1);

    let html = '';
    for (const [pid, pUnits] of Object.entries(propGroups)) {
      const prop = _props.find(p => p.id == pid) || {};

      const dayHeaders = dayNums.map(d => {
        const dow = new Date(curYear, curMonth, d).toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 2);
        const isW = [0, 6].includes(new Date(curYear, curMonth, d).getDay());
        return `<th style="min-width:32px;width:32px;padding:3px 1px;text-align:center;font-size:10px;color:${isToday(d) ? 'var(--accent)' : isW ? 'var(--text-2)' : 'var(--text-3)'};background:${isW ? 'rgba(255,255,255,.03)' : 'var(--bg-0)'}">
          ${dow}<br><span style="font-size:11px;font-weight:${isToday(d) ? 700 : 400}">${d}</span>
        </th>`;
      }).join('');

      html += `
      <div class="card" style="margin-bottom:20px;overflow-x:auto">
        <div class="card-header"><span class="card-title">🏘️ ${prop.name}</span>
          <span class="text-muted" style="font-size:12px">${pUnits.length} appartement${pUnits.length !== 1 ? 's' : ''}</span>
        </div>
        <table style="border-collapse:collapse;width:100%;min-width:600px">
          <thead><tr>
            <th style="padding:6px 12px;text-align:left;font-size:11px;color:var(--text-3);min-width:140px;background:var(--bg-0);position:sticky;left:0;z-index:2">Appartement</th>
            ${dayHeaders}
          </tr></thead>
          <tbody>
            ${pUnits.map(u => {
        const uSejours = _sejours.filter(s => s.unit_id === u.id && s.statut !== 'ANNULE');
        const cells = dayNums.map(d => {
          const ds = dateStr(curYear, curMonth, d);
          const match = uSejours.find(s => coverDate(s, ds));
          const isT = isToday(d);
          const isW = [0, 6].includes(new Date(curYear, curMonth, d).getDay());

          let bg = isW ? 'rgba(255,255,255,.03)' : 'transparent';
          let border = isT ? 'border-left:2px solid var(--accent);border-right:2px solid var(--accent)' : '';
          let cursor = 'pointer';
          let text = '';

          if (match) {
            const isDebut = match.date_debut === ds;
            const isFin = match.date_fin === ds;
            bg = isDebut || isFin ? '#f5a623' : 'rgba(255,91,122,.65)';
            text = isDebut ? '✈' : isFin ? '🏁' : '';
          } else {
            bg = isW ? 'rgba(34,211,169,.06)' : 'rgba(34,211,169,.1)';
          }

          return `<td data-unit="${u.id}" data-date="${ds}" data-sej="${match ? match.id : ''}"
                  title="${match ? match.locataire + (match.heure_entree && match.date_debut === ds ? ' ✈' + match.heure_entree : '') + (match.heure_sortie && match.date_fin === ds ? ' 🏁' + match.heure_sortie : '') : 'Disponible — cliquer pour réserver'}"
                  style="padding:0;width:32px;min-width:32px;height:38px;background:${bg};${border};text-align:center;font-size:12px;color:#fff;cursor:${cursor};transition:opacity .1s"
                  class="cal-cell"
                >${text}</td>`;
        }).join('');

        return `<tr>
                <td style="padding:8px 12px;font-size:12px;font-weight:600;position:sticky;left:0;background:var(--bg-1);z-index:1;border-right:1px solid var(--border)">
                  ${u.label} <span class="badge badge-${u.status.toLowerCase()}" style="font-size:9px;margin-left:4px">${u.status === 'OCCUPIED' ? 'Occ.' : 'Vac.'}</span>
                </td>${cells}
              </tr>`;
      }).join('')}
          </tbody>
        </table>
      </div>`;
    }

    el.innerHTML = html;

    // Click handler for cells
    el.querySelectorAll('.cal-cell').forEach(cell => {
      cell.addEventListener('mouseover', () => cell.style.opacity = '0.8');
      cell.addEventListener('mouseout', () => cell.style.opacity = '1');
      cell.addEventListener('click', () => {
        const sejId = cell.dataset.sej;
        const unitId = cell.dataset.unit;
        const date = cell.dataset.date;
        if (sejId) {
          const sej = _sejours.find(s => s.id == sejId);
          if (sej) openSejourDetail(sej);
        } else {
          openSejourForm(unitId, date);
        }
      });
    });
  }

  // ── Per-unit calendar view ────────────────────────────────────────────────
  function renderUnitView(el) {
    const filterUnits = selUnitId
      ? _units.filter(u => u.id == selUnitId)
      : selPropId
        ? _units.filter(u => u.property_id == selPropId)
        : _units.slice(0, 6);

    if (!filterUnits.length) {
      el.innerHTML = '<div class="empty-state"><div class="empty-icon">🚪</div><p>Sélectionnez un appartement ou une propriété.</p></div>';
      return;
    }

    const dayLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const days = daysInMonth(curYear, curMonth);
    const today = new Date();

    let html = '';
    for (const u of filterUnits) {
      const prop = _props.find(p => p.id === u.property_id) || {};
      const uSejours = _sejours.filter(s => s.unit_id === u.id && s.statut !== 'ANNULE')
        .sort((a, b) => a.date_debut.localeCompare(b.date_debut));

      let startDow = new Date(curYear, curMonth, 1).getDay();
      startDow = startDow === 0 ? 6 : startDow - 1;

      const cells = [];
      for (let i = 0; i < startDow; i++) cells.push('<td></td>');
      for (let d = 1; d <= days; d++) {
        const ds = dateStr(curYear, curMonth, d);
        const match = uSejours.find(s => coverDate(s, ds));
        const isT = today.getFullYear() === curYear && today.getMonth() === curMonth && today.getDate() === d;
        const isW = [0, 6].includes(new Date(curYear, curMonth, d).getDay());
        const isDebut = match && match.date_debut === ds;
        const isFin = match && match.date_fin === ds;

        let bg = isW ? 'rgba(255,255,255,.03)' : 'rgba(34,211,169,.1)';
        let label = '';
        let title = 'Disponible — cliquer pour réserver';
        if (match) {
          bg = isDebut || isFin ? '#f5a623' : 'rgba(255,91,122,.55)';
          label = isDebut ? `✈️${match.heure_entree ? '<br><span style="font-size:8px">' + match.heure_entree + '</span>' : ''}` :
            isFin ? `🏁${match.heure_sortie ? '<br><span style="font-size:8px">' + match.heure_sortie + '</span>' : ''}` : '●';
          title = match.locataire;
        }
        const sejId = match ? match.id : '';
        cells.push(`
          <td data-unit="${u.id}" data-date="${ds}" data-sej="${sejId}" class="cal-cell-mo"
            title="${title}"
            style="padding:3px 1px;text-align:center;vertical-align:top;
              background:${bg};border-radius:4px;min-height:36px;height:auto;font-size:10px;color:#fff;cursor:pointer;
              ${isT ? 'outline:2px solid var(--accent);outline-offset:1px;' : ''}
              ${isW ? 'opacity:.7;' : ''}">
            <div style="font-size:clamp(9px,2vw,12px);font-weight:${isT ? 700 : 400};color:${isT ? 'var(--accent)' : 'inherit'}">${d}</div>
            ${label ? `<div style="margin-top:1px;line-height:1.1;font-size:clamp(8px,1.8vw,11px)">${label}</div>` : ''}
          </td>`);
        if ((startDow + d) % 7 === 0 && d < days) cells.push('</tr><tr>');
      }

      html += `
        <div class="card" style="margin-bottom:24px">
          <div class="card-header">
            <div>
              <span class="card-title">🚪 ${u.label}</span>
              <span class="text-muted" style="font-size:12px;margin-left:8px">${prop.name}</span>
            </div>
            <div class="flex-center" style="gap:8px">
              <span class="badge badge-${u.status.toLowerCase()}">${u.status === 'OCCUPIED' ? 'Occupé' : 'Vacant'}</span>
              <button class="btn btn-primary btn-sm add-sej-unit" data-unit="${u.id}">+ Séjour</button>
            </div>
          </div>
          <div style="padding:14px 18px">
            <table style="border-collapse:separate;border-spacing:3px;width:100%">
              <thead><tr>${dayLabels.map(l => `<th style="text-align:center;font-size:10px;color:var(--text-3);padding:4px;width:calc(100%/7)">${l}</th>`).join('')}</tr></thead>
              <tbody><tr>${cells.join('')}</tr></tbody>
            </table>
          </div>
          <!-- Upcoming séjours for this unit -->
          ${uSejours.length ? `
          <div style="border-top:1px solid var(--border);padding:10px 18px">
            <div style="font-size:11px;font-weight:600;color:var(--text-3);margin-bottom:6px">SÉJOURS</div>
            ${uSejours.map(s => `
              <div class="sej-row" data-sej="${s.id}" style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border);font-size:12px;cursor:pointer;border-radius:4px">
                <span style="width:10px;height:10px;border-radius:50%;background:${s.statut === 'EN_COURS' ? '#ff5b7a' : '#6c63ff'};flex-shrink:0"></span>
                <strong>${s.locataire}</strong>
                <span class="text-muted" style="flex:1">${fmtDate(s.date_debut)}${s.heure_entree ? ' ✈' + s.heure_entree : ''} → ${s.date_fin ? fmtDate(s.date_fin) + (s.heure_sortie ? ' 🏁' + s.heure_sortie : '') : '…'}</span>
                <span class="badge badge-${s.statut === 'EN_COURS' ? 'occupied' : 'building'}">${s.statut.replace('_', ' ')}</span>
                <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation()">✏️</button>
              </div>`).join('')}
          </div>` : ''}
        </div>`;
    }

    el.innerHTML = html;

    el.querySelectorAll('.cal-cell-mo').forEach(cell => {
      cell.addEventListener('click', () => {
        const sejId = cell.dataset.sej;
        if (sejId) { const s = _sejours.find(s => s.id == sejId); if (s) openSejourDetail(s); }
        else openSejourForm(cell.dataset.unit, cell.dataset.date);
      });
    });
    el.querySelectorAll('.sej-row').forEach(row => {
      row.addEventListener('mouseenter', () => row.style.background = 'var(--surface)');
      row.addEventListener('mouseleave', () => row.style.background = '');
      row.addEventListener('click', () => {
        const s = _sejours.find(s => s.id == row.dataset.sej); if (s) openSejourDetail(s);
      });
      row.querySelector('button').addEventListener('click', e => {
        e.stopPropagation();
        const s = _sejours.find(s => s.id == row.dataset.sej); if (s) openSejourForm(null, null, s);
      });
    });
    el.querySelectorAll('.add-sej-unit').forEach(btn =>
      btn.addEventListener('click', () => openSejourForm(btn.dataset.unit)));
  }

  // Boot
  await reload();
}
