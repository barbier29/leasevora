async function renderPropertiesPage(container) {
  async function load() {
    try {
      const props = await api('/properties');
      render(props);
    } catch (e) {
      container.innerHTML = `<p class="text-muted">${e.message}</p>`;
    }
  }

  function render(props) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">Propriétés</div>
          <div class="page-subtitle">${props.length} propriété${props.length !== 1 ? 's' : ''}</div>
        </div>
        <button class="btn btn-primary" id="add-prop-btn">+ Ajouter une propriété</button>
      </div>
      <div class="card">
        <table>
          <thead><tr>
            <th>Nom</th><th>Type</th><th>Adresse</th><th>Spécifications</th><th>Biens</th><th>Créé le</th><th></th>
          </tr></thead>
          <tbody>
            ${props.length ? props.map(p => {
              const specs = [
                p.surface_totale     ? `${p.surface_totale} m²`        : null,
                p.nb_etages          ? `${p.nb_etages} étage${p.nb_etages > 1 ? 's' : ''}` : null,
                p.annee_construction ? `Construit en ${p.annee_construction}` : null,
              ].filter(Boolean).join(' · ');
              return `
              <tr>
                <td>
                  <strong>${p.name}</strong>
                  ${p.description ? `<div style="font-size:11px;color:var(--text-3);margin-top:2px">${p.description}</div>` : ''}
                </td>
                <td><span class="badge badge-${(p.type || 'BUILDING').toLowerCase()}">${p.type === 'BUILDING' ? 'Immeuble' : 'Indépendant'}</span></td>
                <td class="text-muted">${p.address || '—'}</td>
                <td class="text-muted" style="font-size:12px">${specs || '—'}</td>
                <td>
                  <button class="btn btn-ghost btn-sm view-units-btn" data-id="${p.id}" data-name="${p.name}" title="Voir les biens">
                    🚪 ${p.unit_count}
                  </button>
                </td>
                <td class="text-muted">${fmtDate(p.created_at)}</td>
                <td style="text-align:right;white-space:nowrap">
                  <button class="btn btn-ghost btn-sm edit-prop-btn" data-id="${p.id}">Modifier</button>
                  <button class="btn btn-danger btn-sm del-prop-btn" data-id="${p.id}" data-name="${p.name}">Supprimer</button>
                </td>
              </tr>`;
            }).join('')
          : '<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">🏘️</div><p>Aucune propriété. Ajoutez-en une !</p></div></td></tr>'}
          </tbody>
        </table>
      </div>
    `;

    document.getElementById('add-prop-btn').addEventListener('click', () => showForm());

    container.querySelectorAll('.view-units-btn').forEach(btn => {
      btn.addEventListener('click', () => showUnits(Number(btn.dataset.id), btn.dataset.name));
    });

    container.querySelectorAll('.edit-prop-btn').forEach(btn => {
      btn.addEventListener('click', () => showForm(props.find(p => p.id == btn.dataset.id)));
    });

    container.querySelectorAll('.del-prop-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm(`Supprimer "${btn.dataset.name}" ? Tous les biens et transactions liés seront aussi supprimés.`)) return;
        try {
          await api(`/properties/${btn.dataset.id}`, { method: 'DELETE' });
          toast('Propriété supprimée');
          load();
        } catch (e) { toast(e.message, 'error'); }
      });
    });
  }

  async function showUnits(propId, propName) {
    const units = await api(`/units?property_id=${propId}`);
    const sym = window.CURR.symbol;

    const UNIT_TYPES = {
      APPARTEMENT:      { label: 'Appartement',      icon: '🚪' },
      STUDIO:           { label: 'Studio',            icon: '🛋️' },
      LOCAL_COMMERCIAL: { label: 'Local commercial',  icon: '🏪' },
      MAISON:           { label: 'Maison',            icon: '🏡' },
      BUREAU:           { label: 'Bureau',            icon: '🖥️' },
      PARKING:          { label: 'Parking',           icon: '🅿️' },
      AUTRE:            { label: 'Autre',             icon: '📦' },
    };

    function buildSpecs(u) {
      const specItems = [
        u.nb_chambres ? `${u.nb_chambres} ch.` : (u.nb_pieces ? `${u.nb_pieces}P` : null),
        u.nb_sdb      ? `${u.nb_sdb} sdb`       : null,
        u.surface     ? `${u.surface}m²`         : null,
        u.etage != null ? `Ét.${u.etage}`        : null,
      ].filter(Boolean);
      const badges = [
        u.meuble         ? '🛋️' : null,
        u.balcon         ? '🌿' : null,
        u.parking_inclus ? '🅿️' : null,
      ].filter(Boolean).join('');
      return specItems.join(' · ') + (badges ? ' ' + badges : '');
    }

    openModal(`
      <div class="modal-title">🏢 ${propName} — Biens</div>

      <!-- Liste des biens existants -->
      <div style="margin-bottom:20px">
        ${units.length ? `
          <table style="width:100%;border-collapse:collapse">
            <thead><tr>
              <th style="text-align:left;padding:7px 6px;font-size:11px;font-weight:600;color:var(--text-3);border-bottom:1px solid var(--border);text-transform:uppercase;letter-spacing:.5px">Type</th>
              <th style="text-align:left;padding:7px 6px;font-size:11px;font-weight:600;color:var(--text-3);border-bottom:1px solid var(--border);text-transform:uppercase;letter-spacing:.5px">Nom</th>
              <th style="text-align:left;padding:7px 6px;font-size:11px;font-weight:600;color:var(--text-3);border-bottom:1px solid var(--border);text-transform:uppercase;letter-spacing:.5px">Statut</th>
              <th style="text-align:right;padding:7px 6px;font-size:11px;font-weight:600;color:var(--text-3);border-bottom:1px solid var(--border);text-transform:uppercase;letter-spacing:.5px">Loyer/mois</th>
              <th style="border-bottom:1px solid var(--border)"></th>
            </tr></thead>
            <tbody>
              ${units.map(u => {
                const t = UNIT_TYPES[u.type] || { label: u.type, icon: '📦' };
                const specs = buildSpecs(u);
                return `<tr style="border-bottom:1px solid var(--border-light,var(--border))">
                  <td style="padding:9px 6px;white-space:nowrap">
                    <span style="font-size:15px">${t.icon}</span>
                    <span style="font-size:11px;color:var(--text-3);margin-left:4px">${t.label}</span>
                  </td>
                  <td style="padding:9px 6px">
                    <strong style="font-size:13px">${u.label}</strong>
                    ${specs ? `<div style="font-size:11px;color:var(--text-3);margin-top:2px">${specs}</div>` : ''}
                  </td>
                  <td style="padding:9px 6px"><span class="badge badge-${(u.status || 'VACANT').toLowerCase()}">${u.status === 'OCCUPIED' ? 'Occupé' : 'Vacant'}</span></td>
                  <td style="padding:9px 6px;text-align:right;font-size:13px;font-weight:600">${fmtMoney(u.expected_rent)}</td>
                  <td style="padding:9px 6px;text-align:right;white-space:nowrap">
                    <button class="btn btn-ghost btn-sm edit-unit-inline" data-id="${u.id}" style="margin-right:4px">Modifier</button>
                    <button class="btn btn-danger btn-sm del-unit-inline" data-id="${u.id}" data-label="${u.label}">✕</button>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>` : `<div class="empty-state" style="padding:24px 0"><div class="empty-icon">🏗️</div><p>Aucun bien pour l'instant.</p></div>`}
      </div>

      <!-- Formulaire d'ajout -->
      <div style="border-top:1px solid var(--border);padding-top:18px">
        <div style="font-size:13px;font-weight:600;margin-bottom:14px">
          + Ajouter un <span id="quf-type-label">bien</span>
        </div>

        <!-- Type picker -->
        <div class="type-picker-grid" id="quf-type-picker">
          ${Object.entries(UNIT_TYPES).map(([k, v]) =>
            `<button type="button" class="type-card${k === 'APPARTEMENT' ? ' active' : ''}" data-type="${k}">
              <span class="type-card-icon">${v.icon}</span>
              <span>${v.label}</span>
            </button>`
          ).join('')}
        </div>
        <input type="hidden" id="qu-type" value="APPARTEMENT" />

        <form id="quick-unit-form">
          <!-- Toujours visible -->
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Nom *</label>
              <input class="form-control" id="qu-label" placeholder="ex. Appt 3B, Local A" required />
            </div>
            <div class="form-group">
              <label class="form-label">Loyer / mois (${sym})</label>
              <input class="form-control" id="qu-rent" type="number" min="0" step="0.01" value="0" />
            </div>
          </div>

          <!-- Section résidentielle -->
          <div id="quf-residential">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Nb de chambres</label>
                <input class="form-control" id="qu-chambres" type="number" min="0" step="1" placeholder="ex. 2" />
              </div>
              <div class="form-group">
                <label class="form-label">Nb salles de bain</label>
                <input class="form-control" id="qu-sdb" type="number" min="0" step="1" placeholder="ex. 1" />
              </div>
            </div>
            <div class="form-row" style="gap:20px;flex-wrap:wrap;margin-bottom:12px">
              <label style="display:flex;align-items:center;gap:7px;cursor:pointer;font-size:13px">
                <input type="checkbox" id="qu-meuble" style="width:15px;height:15px;accent-color:var(--accent)" /> Meublé
              </label>
              <label style="display:flex;align-items:center;gap:7px;cursor:pointer;font-size:13px">
                <input type="checkbox" id="qu-balcon" style="width:15px;height:15px;accent-color:var(--accent)" /> Balcon / Terrasse
              </label>
              <label style="display:flex;align-items:center;gap:7px;cursor:pointer;font-size:13px">
                <input type="checkbox" id="qu-parking-inclus" style="width:15px;height:15px;accent-color:var(--accent)" /> Parking inclus
              </label>
            </div>
          </div>

          <!-- Surface + étage (tout sauf PARKING) -->
          <div id="quf-surface" class="form-row">
            <div class="form-group">
              <label class="form-label">Surface (m²)</label>
              <input class="form-control" id="qu-surface" type="number" min="0" step="0.1" placeholder="ex. 65" />
            </div>
            <div class="form-group" id="quf-etage">
              <label class="form-label">Étage</label>
              <input class="form-control" id="qu-etage" type="number" step="1" placeholder="ex. 2" />
            </div>
          </div>

          <!-- Local commercial -->
          <div id="quf-commercial" style="display:none">
            <div class="form-group">
              <label class="form-label">Activité prévue</label>
              <input class="form-control" id="qu-activite" placeholder="ex. Commerce alimentaire, Coiffeur…" />
            </div>
          </div>

          <!-- Bureau -->
          <div id="quf-bureau" style="display:none" class="form-row">
            <div class="form-group">
              <label class="form-label">Nb de pièces / bureaux</label>
              <input class="form-control" id="qu-pieces" type="number" min="0" step="1" placeholder="ex. 4" />
            </div>
            <div class="form-group" style="display:flex;align-items:flex-end;padding-bottom:4px">
              <label style="display:flex;align-items:center;gap:7px;cursor:pointer;font-size:13px">
                <input type="checkbox" id="qu-meuble-bureau" style="width:15px;height:15px;accent-color:var(--accent)" /> Meublé
              </label>
            </div>
          </div>

          <!-- Description (commercial, parking, autre) -->
          <div id="quf-desc" style="display:none">
            <div class="form-group">
              <label class="form-label">Notes / conditions</label>
              <textarea class="form-control" id="qu-desc" rows="2" placeholder="Informations complémentaires…"></textarea>
            </div>
          </div>

          <!-- Statut -->
          <div class="form-group">
            <label class="form-label">Statut</label>
            <select class="form-control" id="qu-status">
              <option value="VACANT">Vacant</option>
              <option value="OCCUPIED">Occupé</option>
            </select>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-ghost" onclick="closeModal()">Fermer</button>
            <button type="submit" class="btn btn-primary">Ajouter le bien</button>
          </div>
        </form>
      </div>
    `);

    // ── Type picker logic ──────────────────────────────────────────────────
    const typeLabels = {
      APPARTEMENT: 'un appartement', STUDIO: 'un studio', LOCAL_COMMERCIAL: 'un local commercial',
      MAISON: 'une maison', BUREAU: 'un bureau', PARKING: 'un parking', AUTRE: 'un autre bien',
    };

    function updateQuickFormFields(type) {
      document.getElementById('qu-type').value = type;
      const lbl = typeLabels[type] || 'un bien';
      document.getElementById('quf-type-label').textContent = lbl;

      const isResidential = ['APPARTEMENT', 'STUDIO', 'MAISON'].includes(type);
      const isParking     = type === 'PARKING';
      const isCommercial  = type === 'LOCAL_COMMERCIAL';
      const isBureau      = type === 'BUREAU';
      const showDesc      = isCommercial || isParking || type === 'AUTRE';

      document.getElementById('quf-residential').style.display  = isResidential ? '' : 'none';
      document.getElementById('quf-surface').style.display      = isParking     ? 'none' : '';
      document.getElementById('quf-etage').style.display        = isParking     ? 'none' : '';
      document.getElementById('quf-commercial').style.display   = isCommercial  ? '' : 'none';
      document.getElementById('quf-bureau').style.display       = isBureau      ? '' : 'none';
      document.getElementById('quf-desc').style.display         = showDesc      ? '' : 'none';
    }

    document.querySelectorAll('.type-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.type-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        updateQuickFormFields(card.dataset.type);
      });
    });
    updateQuickFormFields('APPARTEMENT');

    // ── Delete + Edit handlers ─────────────────────────────────────────────
    document.querySelectorAll('.del-unit-inline').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm(`Supprimer "${btn.dataset.label}" ?`)) return;
        await api(`/units/${btn.dataset.id}`, { method: 'DELETE' });
        toast('Bien supprimé');
        showUnits(propId, propName);
        load();
      });
    });

    document.querySelectorAll('.edit-unit-inline').forEach(btn => {
      btn.addEventListener('click', () => {
        window.__pendingEditUnit = Number(btn.dataset.id);
        closeModal();
        location.hash = 'units';
      });
    });

    // ── Quick-add submit ───────────────────────────────────────────────────
    document.getElementById('quick-unit-form').addEventListener('submit', async e => {
      e.preventDefault();
      const type = document.getElementById('qu-type').value;
      const isResidential = ['APPARTEMENT', 'STUDIO', 'MAISON'].includes(type);
      const isBureau      = type === 'BUREAU';
      const body = {
        property_id:    propId,
        label:          document.getElementById('qu-label').value.trim(),
        type,
        status:         document.getElementById('qu-status').value,
        expected_rent:  parseFloat(document.getElementById('qu-rent').value) || 0,
        surface:        document.getElementById('qu-surface')?.value || null,
        etage:          document.getElementById('qu-etage')?.value !== '' ? document.getElementById('qu-etage')?.value : null,
        nb_chambres:    isResidential ? (document.getElementById('qu-chambres')?.value || null) : null,
        nb_sdb:         isResidential ? (document.getElementById('qu-sdb')?.value || null) : null,
        meuble:         isResidential ? (document.getElementById('qu-meuble')?.checked || false) : (isBureau ? (document.getElementById('qu-meuble-bureau')?.checked || false) : false),
        balcon:         isResidential ? (document.getElementById('qu-balcon')?.checked || false) : false,
        parking_inclus: isResidential ? (document.getElementById('qu-parking-inclus')?.checked || false) : false,
        nb_pieces:      isBureau ? (document.getElementById('qu-pieces')?.value || null) : null,
        description:    document.getElementById('qu-desc')?.value?.trim() || (type === 'LOCAL_COMMERCIAL' ? document.getElementById('qu-activite')?.value?.trim() || null : null),
      };
      try {
        await api('/units', { method: 'POST', body });
        toast('Bien ajouté');
        showUnits(propId, propName);
        load();
      } catch (e) { toast(e.message, 'error'); }
    });
  }

  function showForm(prop = null) {
    const isEdit = !!prop;
    const sym = window.CURR.symbol;
    openModal(`
      <div class="modal-title">${isEdit ? 'Modifier la propriété' : 'Nouvelle propriété'}</div>
      <form id="prop-form">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Nom *</label>
            <input class="form-control" id="f-name" value="${prop?.name || ''}" placeholder="ex. Immeuble Rue de la Paix" required />
          </div>
          ${!isEdit ? `
          <div class="form-group">
            <label class="form-label">Type *</label>
            <select class="form-control" id="f-type">
              <option value="BUILDING">Immeuble — plusieurs biens</option>
              <option value="STANDALONE">Indépendant — un seul logement</option>
            </select>
          </div>` : ''}
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Adresse</label>
            <input class="form-control" id="f-address" value="${prop?.address || ''}" placeholder="Optionnel" />
          </div>
          <div class="form-group">
            <label class="form-label">Solde initial de caisse (${sym})</label>
            <input class="form-control" id="f-caisse" type="number" min="0" step="0.01" value="${prop?.solde_initial_caisse || 0}" />
          </div>
        </div>
        <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--text-3);margin:16px 0 10px">Spécifications</div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Surface totale (m²)</label>
            <input class="form-control" id="f-surface" type="number" min="0" step="1" value="${prop?.surface_totale ?? ''}" placeholder="ex. 850" />
          </div>
          <div class="form-group" id="f-etages-group">
            <label class="form-label">Nombre d'étages</label>
            <input class="form-control" id="f-etages" type="number" min="0" step="1" value="${prop?.nb_etages ?? ''}" placeholder="ex. 5" />
          </div>
          <div class="form-group">
            <label class="form-label">Année de construction</label>
            <input class="form-control" id="f-annee" type="number" min="1800" max="2100" step="1" value="${prop?.annee_construction ?? ''}" placeholder="ex. 1985" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Description / notes</label>
          <textarea class="form-control" id="f-desc" rows="2" placeholder="Gardien, ascenseur, parking souterrain…">${prop?.description || ''}</textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" onclick="closeModal()">Annuler</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Enregistrer' : 'Créer'}</button>
        </div>
      </form>
    `);

    // Masquer nb_etages pour STANDALONE
    if (!isEdit) {
      const typeEl = document.getElementById('f-type');
      const etagesGroup = document.getElementById('f-etages-group');
      function updateEtagesVisibility() {
        etagesGroup.style.display = typeEl.value === 'STANDALONE' ? 'none' : '';
      }
      updateEtagesVisibility();
      typeEl.addEventListener('change', updateEtagesVisibility);
    }

    document.getElementById('prop-form').addEventListener('submit', async e => {
      e.preventDefault();
      const body = {
        name:               document.getElementById('f-name').value.trim(),
        address:            document.getElementById('f-address').value.trim(),
        solde_initial_caisse: parseFloat(document.getElementById('f-caisse').value) || 0,
        surface_totale:     document.getElementById('f-surface').value || null,
        nb_etages:          document.getElementById('f-etages')?.value || null,
        annee_construction: document.getElementById('f-annee').value || null,
        description:        document.getElementById('f-desc').value.trim() || null,
      };
      if (!isEdit) body.type = document.getElementById('f-type').value;
      try {
        if (isEdit) {
          await api(`/properties/${prop.id}`, { method: 'PUT', body });
          toast('Propriété modifiée');
        } else {
          await api('/properties', { method: 'POST', body });
          toast(`Propriété créée${body.type === 'STANDALONE' ? ' avec 1 bien' : ''}`);
        }
        closeModal(); load();
      } catch (e) { toast(e.message, 'error'); }
    });
  }

  await load();
}
