async function renderCompteursPage(container) {
    const TYPES = {
        EAU: { label: 'Eau', icon: '💧', unit: 'm³' },
        ELECTRICITE: { label: 'Électricité', icon: '⚡', unit: 'kWh' },
        GAZ: { label: 'Gaz', icon: '🔥', unit: 'm³' },
    };

    async function load(propFilter) {
        try {
            let url = '/compteurs';
            if (propFilter) url += `?property_id=${propFilter}`;
            const [readings, props, units] = await Promise.all([api(url), api('/properties'), api('/units')]);
            render(readings, props, units, propFilter);
        } catch (e) {
            container.innerHTML = `<p class="text-muted">${e.message}</p>`;
        }
    }

    function render(readings, props, units, propFilter) {
        // Group readings by unit
        const byUnit = {};
        for (const u of units) {
            if (propFilter && u.property_id !== Number(propFilter)) continue;
            byUnit[u.id] = { unit: u, readings: [] };
        }
        for (const r of readings) {
            if (byUnit[r.unit_id]) byUnit[r.unit_id].readings.push(r);
        }

        container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">Compteurs</div>
          <div class="page-subtitle">Relevés eau, électricité et gaz par appartement</div>
        </div>
        <div class="flex-center" style="gap:8px">
          <select class="form-control" id="prop-filter" style="width:200px">
            <option value="">Toutes les propriétés</option>
            ${props.map(p => `<option value="${p.id}" ${propFilter == p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
          </select>
          <button class="btn btn-primary" id="add-rel-btn">+ Ajouter un relevé</button>
        </div>
      </div>

      ${Object.values(byUnit).length === 0 ? `
        <div class="empty-state"><div class="empty-icon">💡</div><p>Aucun appartement trouvé.</p></div>
      ` : Object.values(byUnit).map(({ unit, readings: rds }) => {
            const prop = props.find(p => p.id === unit.property_id);
            // Last reading per type
            const last = {};
            for (const type of Object.keys(TYPES)) {
                const sorted = rds.filter(r => r.type === type).sort((a, b) => b.date.localeCompare(a.date));
                last[type] = sorted[0] || null;
            }
            const typeReadings = rds.sort((a, b) => b.date.localeCompare(a.date));

            return `
        <div class="card" style="margin-bottom:20px">
          <div class="card-header">
            <span class="card-title">🚪 ${unit.label} — <span class="text-muted">${prop?.name || '?'}</span></span>
            <span class="badge badge-${(unit.status || 'VACANT').toLowerCase()}">${unit.status === 'OCCUPIED' ? 'Occupé' : 'Vacant'}</span>
          </div>
          <!-- Derniers relevés -->
          <div style="display:grid;grid-template-columns:repeat(3,1fr);border-bottom:1px solid var(--border)">
            ${Object.entries(TYPES).map(([type, info]) => {
                const r = last[type];
                return `<div style="padding:14px 18px;border-right:1px solid var(--border)">
                <div style="font-size:11px;color:var(--text-3);margin-bottom:4px">${info.icon} ${info.label}</div>
                ${r ? `
                  <div style="font-size:18px;font-weight:700">${r.valeur} <span style="font-size:12px;color:var(--text-3)">${info.unit}</span></div>
                  <div style="font-size:11px;color:var(--text-3)">${fmtDate(r.date)}</div>
                ` : `<div class="text-muted" style="font-size:13px">Aucun relevé</div>`}
              </div>`;
            }).join('')}
          </div>
          <!-- Historique -->
          ${typeReadings.length > 0 ? `
          <table>
            <thead><tr>
              <th>Date</th><th>Type</th><th>Relevé</th><th>Notes</th><th></th>
            </tr></thead>
            <tbody>
              ${typeReadings.map(r => {
                const info = TYPES[r.type] || { icon: '', unit: '' };
                return `<tr>
                  <td class="text-muted">${fmtDate(r.date)}</td>
                  <td>${info.icon} ${info.label || r.type}</td>
                  <td><strong>${r.valeur}</strong> <span class="text-muted">${info.unit}</span></td>
                  <td class="text-muted">${r.notes || '—'}</td>
                  <td style="text-align:right">
                    <button class="btn btn-danger btn-sm del-rel-btn" data-id="${r.id}">✕</button>
                  </td>
                </tr>`;
            }).join('')}
            </tbody>
          </table>` : ''}
        </div>`;
        }).join('')}
    `;

        document.getElementById('prop-filter').addEventListener('change', e => load(e.target.value));
        document.getElementById('add-rel-btn').addEventListener('click', () => showForm(units, props));
        container.querySelectorAll('.del-rel-btn').forEach(btn =>
            btn.addEventListener('click', async () => {
                if (!confirm('Supprimer ce relevé ?')) return;
                try { await api(`/compteurs/${btn.dataset.id}`, { method: 'DELETE' }); toast('Relevé supprimé'); load(propFilter); }
                catch (e) { toast(e.message, 'error'); }
            }));
    }

    function showForm(units, props) {
        const today = new Date().toISOString().slice(0, 10);
        const unitsByProp = props.map(p => {
            const pUnits = units.filter(u => u.property_id === p.id);
            if (!pUnits.length) return '';
            return `<optgroup label="${p.name}">${pUnits.map(u => `<option value="${u.id}">${u.label}</option>`).join('')}</optgroup>`;
        }).join('');

        openModal(`
      <div class="modal-title">Nouveau relevé de compteur</div>
      <form id="rel-form">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Appartement *</label>
            <select class="form-control" id="f-unit" required>
              <option value="">Sélectionner…</option>
              ${unitsByProp}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Type *</label>
            <select class="form-control" id="f-type">
              <option value="EAU">💧 Eau (m³)</option>
              <option value="ELECTRICITE">⚡ Électricité (kWh)</option>
              <option value="GAZ">🔥 Gaz (m³)</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Date *</label>
            <input class="form-control" id="f-date" type="date" value="${today}" required />
          </div>
          <div class="form-group">
            <label class="form-label">Relevé *</label>
            <input class="form-control" id="f-valeur" type="number" min="0" step="0.001" placeholder="Ex: 1245.5" required />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Notes</label>
          <input class="form-control" id="f-notes" placeholder="Optionnel" />
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" onclick="closeModal()">Annuler</button>
          <button type="submit" class="btn btn-primary">Enregistrer</button>
        </div>
      </form>
    `);

        document.getElementById('rel-form').addEventListener('submit', async e => {
            e.preventDefault();
            const body = {
                unit_id: document.getElementById('f-unit').value,
                type: document.getElementById('f-type').value,
                date: document.getElementById('f-date').value,
                valeur: parseFloat(document.getElementById('f-valeur').value),
                notes: document.getElementById('f-notes').value.trim(),
            };
            try {
                await api('/compteurs', { method: 'POST', body });
                toast('Relevé enregistré'); closeModal(); load('');
            } catch (e) { toast(e.message, 'error'); }
        });
    }

    await load('');
}
