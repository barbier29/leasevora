async function renderTravauxPage(container) {
    const TYPES = {
        REPARATION:   { label: 'Réparation',   icon: '🔧' },
        REMPLACEMENT: { label: 'Remplacement',  icon: '🔄' },
        ENTRETIEN:    { label: 'Entretien',     icon: '🧹' },
        RENOVATION:   { label: 'Rénovation',    icon: '🏗️' },
    };

    const STATUTS = {
        A_FAIRE:              { label: 'À faire',              cls: 'badge-vacant',   step: 0 },
        PRESTATAIRE_CONTACTE: { label: 'Prestataire contacté', cls: 'badge-building', step: 1 },
        DEVIS_RECU:           { label: 'Devis reçu',           cls: 'badge-building', step: 2 },
        EN_COURS:             { label: 'En cours',             cls: 'badge-occupied', step: 3 },
        TERMINE:              { label: 'Terminé',              cls: 'badge-in',       step: 4 },
        ANNULE:               { label: 'Annulé',               cls: 'badge-out',      step: -1 },
    };

    const STEP_KEYS   = ['A_FAIRE', 'PRESTATAIRE_CONTACTE', 'DEVIS_RECU', 'EN_COURS', 'TERMINE'];
    const STEP_SHORT  = { PRESTATAIRE_CONTACTE: 'Contacté', DEVIS_RECU: 'Devis', EN_COURS: 'En cours', TERMINE: 'Terminé' };
    const NEXT_STATUS = { A_FAIRE: 'PRESTATAIRE_CONTACTE', PRESTATAIRE_CONTACTE: 'DEVIS_RECU', DEVIS_RECU: 'EN_COURS', EN_COURS: 'TERMINE' };

    const PRIORITES = {
        HAUTE:   { label: 'Haute',   cls: 'amount-out', dot: '🔴' },
        MOYENNE: { label: 'Moyenne', cls: '',           dot: '🟡' },
        BASSE:   { label: 'Basse',   cls: 'text-muted', dot: '🟢' },
    };

    let currentProp   = '';
    let currentType   = '';
    let currentStatut = '';
    let showActifs    = false;

    async function load() {
        try {
            let url = '/travaux';
            const params = [];
            if (currentProp)   params.push(`property_id=${currentProp}`);
            if (currentStatut) params.push(`statut=${currentStatut}`);
            if (params.length) url += '?' + params.join('&');
            const [travaux, props] = await Promise.all([api(url), api('/properties')]);
            let filtered = travaux;
            if (currentType) filtered = filtered.filter(t => t.type_travail === currentType);
            if (showActifs && !currentStatut) filtered = filtered.filter(t => !['TERMINE', 'ANNULE'].includes(t.statut));
            render(filtered, travaux, props);
        } catch (e) {
            container.innerHTML = `<p class="text-muted">${e.message}</p>`;
        }
    }

    function miniStepper(statut) {
        if (statut === 'ANNULE') return `<span class="badge badge-out" style="font-size:10px">Annulé</span>`;
        const step = STATUTS[statut]?.step ?? 0;
        return `<div class="mini-stepper">
            ${STEP_KEYS.map((_, i) => `<div class="mini-step ${i < step ? 'done' : i === step ? 'active' : ''}"></div>`).join('')}
        </div>`;
    }

    function render(travaux, allTravaux, props) {
        const actifs   = travaux.filter(t => !['TERMINE', 'ANNULE'].includes(t.statut)).length;
        const termines = travaux.filter(t => t.statut === 'TERMINE').length;
        const counts   = {};
        STEP_KEYS.forEach(s => counts[s] = allTravaux.filter(t => t.statut === s).length);
        counts['ANNULE'] = allTravaux.filter(t => t.statut === 'ANNULE').length;

        container.innerHTML = `
            <div class="page-header">
                <div>
                    <div class="page-title">Travaux & Maintenance</div>
                    <div class="page-subtitle">${travaux.length} intervention${travaux.length !== 1 ? 's' : ''} · ${actifs} active${actifs !== 1 ? 's' : ''} · ${termines} terminée${termines !== 1 ? 's' : ''}</div>
                </div>
                <button class="btn btn-primary" id="add-trav-btn">+ Nouvelle intervention</button>
            </div>

            <!-- Pipeline statuts -->
            <div class="pipeline-bar">
                ${STEP_KEYS.map(s => `
                    <div class="pipeline-step ${currentStatut === s ? 'active' : ''}" data-filter="${s}" title="Filtrer : ${STATUTS[s].label}">
                        <div class="pipeline-count">${counts[s]}</div>
                        <div class="pipeline-label">${STATUTS[s].label}</div>
                    </div>
                `).join('<div class="pipeline-arrow">›</div>')}
                <div class="pipeline-sep"></div>
                <div class="pipeline-step pipeline-annule ${currentStatut === 'ANNULE' ? 'active' : ''}" data-filter="ANNULE" title="Filtrer : Annulé">
                    <div class="pipeline-count">${counts['ANNULE']}</div>
                    <div class="pipeline-label">Annulé</div>
                </div>
            </div>

            <!-- Filtres -->
            <div class="flex-center" style="gap:8px;margin-bottom:20px;flex-wrap:wrap">
                <select class="form-control" id="prop-filter" style="width:180px">
                    <option value="">Toutes les propriétés</option>
                    ${props.map(p => `<option value="${p.id}" ${currentProp == p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
                </select>
                <select class="form-control" id="type-filter" style="width:170px">
                    <option value="">Tous les types</option>
                    ${Object.entries(TYPES).map(([k, v]) => `<option value="${k}" ${currentType === k ? 'selected' : ''}>${v.icon} ${v.label}</option>`).join('')}
                </select>
                <select class="form-control" id="statut-filter" style="width:190px">
                    <option value="">Tous les statuts</option>
                    ${Object.entries(STATUTS).map(([k, v]) => `<option value="${k}" ${currentStatut === k ? 'selected' : ''}>${v.label}</option>`).join('')}
                </select>
                <button class="btn btn-ghost btn-sm ${showActifs ? 'btn-actifs-on' : ''}" id="actifs-btn" style="${showActifs ? 'border-color:var(--accent);color:var(--accent)' : ''}">
                    ${showActifs ? '● ' : ''}Actifs seulement
                </button>
            </div>

            <div class="card">
                <table>
                    <thead><tr>
                        <th>Intervention</th><th>Priorité</th><th>Prestataire</th><th>Devis / Facture</th><th>Avancement</th><th>Date prévue</th><th></th>
                    </tr></thead>
                    <tbody>
                        ${travaux.length ? travaux.map(t => {
                            const st  = STATUTS[t.statut]  || { label: t.statut, cls: '', step: 0 };
                            const pr  = PRIORITES[t.priorite] || PRIORITES.MOYENNE;
                            const typ = TYPES[t.type_travail];
                            const nextSt    = NEXT_STATUS[t.statut];
                            const nextShort = nextSt ? STEP_SHORT[nextSt] : null;
                            return `<tr>
                                <td>
                                    <div style="display:flex;align-items:flex-start;gap:10px">
                                        ${typ ? `<span style="font-size:20px;line-height:1.3;flex-shrink:0" title="${typ.label}">${typ.icon}</span>` : ''}
                                        <div>
                                            <strong>${t.titre}</strong>
                                            ${t.description ? `<br><small class="text-muted">${t.description}</small>` : ''}
                                            <br><small class="text-muted">📍 ${t.property_name}${t.unit_label ? ' › ' + t.unit_label : ''}</small>
                                        </div>
                                    </div>
                                </td>
                                <td><span class="${pr.cls}" style="font-size:12px">${pr.dot} ${pr.label}</span></td>
                                <td class="text-muted" style="font-size:12px">
                                    ${t.prestataire || '—'}
                                    ${t.contact_prestataire ? `<br><span style="color:var(--text-3)">${t.contact_prestataire}</span>` : ''}
                                </td>
                                <td style="font-size:12px">
                                    ${t.montant_devis != null ? `<span class="text-muted">Devis : ${fmtMoney(t.montant_devis)}</span><br>` : ''}
                                    ${t.montant_facture != null ? `<span class="amount-out">Fact. : ${fmtMoney(t.montant_facture)}</span>` : (t.montant_devis == null ? '<span class="text-muted">—</span>' : '')}
                                </td>
                                <td>
                                    ${miniStepper(t.statut)}
                                    <span class="badge ${st.cls}" style="margin-top:5px;font-size:10px">${st.label}</span>
                                </td>
                                <td class="text-muted" style="font-size:12px">${t.date_fin_prevue ? fmtDate(t.date_fin_prevue) : fmtDate(t.date)}</td>
                                <td style="text-align:right;white-space:nowrap;vertical-align:middle">
                                    <button class="btn btn-ghost btn-sm detail-btn" data-id="${t.id}" title="Voir détail et historique">👁</button>
                                    ${nextShort ? `<button class="btn btn-ghost btn-sm advance-btn" data-id="${t.id}" data-next="${nextSt}" data-label="${STATUTS[nextSt].label}" title="Avancer : ${STATUTS[nextSt].label}">→ ${nextShort}</button>` : ''}
                                    <button class="btn btn-ghost btn-sm edit-btn" data-id="${t.id}" title="Modifier">✏️</button>
                                    <button class="btn btn-danger btn-sm del-btn" data-id="${t.id}" data-titre="${t.titre}">✕</button>
                                </td>
                            </tr>`;
                        }).join('')
                        : '<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">🔧</div><p>Aucune intervention enregistrée.</p></div></td></tr>'}
                    </tbody>
                </table>
            </div>
        `;

        // Filtres
        document.getElementById('prop-filter').addEventListener('change',   e => { currentProp   = e.target.value; load(); });
        document.getElementById('type-filter').addEventListener('change',   e => { currentType   = e.target.value; load(); });
        document.getElementById('statut-filter').addEventListener('change', e => { currentStatut = e.target.value; showActifs = false; load(); });
        document.getElementById('actifs-btn').addEventListener('click', () => {
            showActifs    = !showActifs;
            currentStatut = '';
            document.getElementById('statut-filter').value = '';
            load();
        });

        // Pipeline — clic pour filtrer
        container.querySelectorAll('.pipeline-step').forEach(el =>
            el.addEventListener('click', () => {
                const f = el.dataset.filter;
                currentStatut = currentStatut === f ? '' : f;
                showActifs    = false;
                load();
            }));

        // Détail
        container.querySelectorAll('.detail-btn').forEach(btn =>
            btn.addEventListener('click', async () => {
                const t = await api(`/travaux/${btn.dataset.id}`);
                showDetail(t);
            }));

        // Avancer le statut
        container.querySelectorAll('.advance-btn').forEach(btn =>
            btn.addEventListener('click', () => showAdvanceDialog(btn.dataset.id, btn.dataset.next, btn.dataset.label)));

        // Modifier
        container.querySelectorAll('.edit-btn').forEach(btn =>
            btn.addEventListener('click', () => showForm(travaux.find(t => t.id == btn.dataset.id), props)));

        // Supprimer
        container.querySelectorAll('.del-btn').forEach(btn =>
            btn.addEventListener('click', async () => {
                if (!confirm(`Supprimer "${btn.dataset.titre}" ?`)) return;
                try { await api(`/travaux/${btn.dataset.id}`, { method: 'DELETE' }); toast('Intervention supprimée'); load(); }
                catch (e) { toast(e.message, 'error'); }
            }));

        // Ajouter
        document.getElementById('add-trav-btn').addEventListener('click', () => showForm(null, props));
    }

    // ── Détail + historique ─────────────────────────────────────────────────────
    function showDetail(t) {
        const st  = STATUTS[t.statut]    || { label: t.statut, cls: '' };
        const pr  = PRIORITES[t.priorite] || PRIORITES.MOYENNE;
        const typ = TYPES[t.type_travail];
        const hist = [...(t.historique || [])].reverse();

        openModal(`
            <div class="modal-title">${typ ? typ.icon + ' ' : ''}${t.titre}</div>
            <div style="overflow-y:auto;max-height:65vh;padding-right:4px">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 16px;margin-bottom:18px">
                    ${[
                        ['Propriété',   t.unit_label ? `${t.property_name} › ${t.unit_label}` : t.property_name],
                        ['Statut',      `<span class="badge ${st.cls}">${st.label}</span>`],
                        ['Priorité',    `${pr.dot} ${pr.label}`],
                        ['Type',        typ ? `${typ.icon} ${typ.label}` : '—'],
                        ['Prestataire', t.prestataire || '—'],
                        ['Contact',     t.contact_prestataire || '—'],
                        ['Devis',       t.montant_devis != null ? fmtMoney(t.montant_devis) : '—'],
                        ['Facture',     t.montant_facture != null ? fmtMoney(t.montant_facture) : '—'],
                        ['Signalé le',  fmtDate(t.date)],
                        ['Date prévue', t.date_fin_prevue ? fmtDate(t.date_fin_prevue) : '—'],
                        t.garantie_mois ? ['Garantie', `${t.garantie_mois} mois`] : null,
                        t.date_fin_reelle ? ['Terminé le', fmtDate(t.date_fin_reelle)] : null,
                    ].filter(Boolean).map(([k, v]) => `
                        <div>
                            <div style="font-size:10px;color:var(--text-3);font-weight:700;letter-spacing:.6px;text-transform:uppercase;margin-bottom:3px">${k}</div>
                            <div style="font-size:13px">${v}</div>
                        </div>
                    `).join('')}
                </div>

                ${t.description ? `
                    <div style="background:var(--bg-0);border-radius:var(--radius-sm);padding:10px 14px;font-size:13px;color:var(--text-2);margin-bottom:18px;white-space:pre-wrap">${t.description}</div>
                ` : ''}

                <!-- Avancement visuel -->
                <div style="margin-bottom:18px">
                    <div style="font-size:10px;color:var(--text-3);font-weight:700;letter-spacing:.6px;text-transform:uppercase;margin-bottom:10px">Avancement</div>
                    <div class="detail-stepper">
                        ${STEP_KEYS.map((s, i) => {
                            const curStep = STATUTS[t.statut]?.step ?? 0;
                            const isDone   = i < curStep;
                            const isActive = i === curStep && t.statut !== 'ANNULE';
                            return `<div class="detail-step ${isDone ? 'done' : isActive ? 'active' : ''}">
                                <div class="detail-step-dot"></div>
                                <div class="detail-step-label">${STATUTS[s].label}</div>
                            </div>`;
                        }).join('')}
                    </div>
                </div>

                <!-- Historique -->
                <div style="font-size:10px;color:var(--text-3);font-weight:700;letter-spacing:.6px;text-transform:uppercase;margin-bottom:10px">
                    Historique des changements
                </div>
                ${hist.length > 0 ? `
                    <div class="trav-timeline">
                        ${hist.map(h => `
                            <div class="timeline-item">
                                <div class="timeline-dot"></div>
                                <div class="timeline-content">
                                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:3px">
                                        <span style="font-size:11px;color:var(--text-3)">${STATUTS[h.statut_avant]?.label || h.statut_avant}</span>
                                        <span style="color:var(--text-3)">→</span>
                                        <span class="badge ${STATUTS[h.statut_apres]?.cls || ''}" style="font-size:10px">${STATUTS[h.statut_apres]?.label || h.statut_apres}</span>
                                        <span style="font-size:11px;color:var(--text-3);margin-left:auto">${new Date(h.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    ${h.utilisateur ? `<div style="font-size:11px;color:var(--text-3)">Par : ${h.utilisateur}</div>` : ''}
                                    ${h.note ? `<div style="font-size:12px;color:var(--text-2);margin-top:4px;padding:6px 10px;background:var(--bg-0);border-radius:6px">${h.note}</div>` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : `<div style="text-align:center;color:var(--text-3);font-size:12px;padding:16px 0">Aucun changement de statut enregistré.</div>`}
            </div>
            <div class="form-actions" style="margin-top:16px">
                <button class="btn btn-ghost" onclick="closeModal()">Fermer</button>
            </div>
        `);
    }

    // ── Avancer le statut (quick) ───────────────────────────────────────────────
    function showAdvanceDialog(id, nextStatut, nextLabel) {
        openModal(`
            <div class="modal-title">Avancer le statut</div>
            <p style="color:var(--text-2);font-size:13px;margin-bottom:16px">
                Nouvelle étape : <span class="badge ${STATUTS[nextStatut]?.cls || ''}">${nextLabel}</span>
            </p>
            <form id="advance-form">
                <div class="form-group">
                    <label class="form-label">Note (optionnel)</label>
                    <input class="form-control" id="f-adv-note" placeholder="ex. Plombier contacté, intervention prévue le 15…" />
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-ghost" onclick="closeModal()">Annuler</button>
                    <button type="submit" class="btn btn-primary">Confirmer</button>
                </div>
            </form>
        `);
        document.getElementById('advance-form').addEventListener('submit', async e => {
            e.preventDefault();
            const note = document.getElementById('f-adv-note').value.trim();
            try {
                await api(`/travaux/${id}/statut`, { method: 'PATCH', body: { statut: nextStatut, note: note || null } });
                toast(`Statut mis à jour : ${nextLabel}`);
                closeModal();
                load();
            } catch (err) { toast(err.message, 'error'); }
        });
    }

    // ── Formulaire création / édition ──────────────────────────────────────────
    async function showForm(trav = null, props = []) {
        const isEdit   = !!trav;
        const today    = new Date().toISOString().slice(0, 10);
        const initUnits = trav ? await api(`/units?property_id=${trav.property_id}`) : [];

        openModal(`
            <div class="modal-title">${isEdit ? 'Modifier l\'intervention' : 'Nouvelle intervention'}</div>
            <form id="trav-form">
                <div style="max-height:58vh;overflow-y:auto;padding-right:6px">
                    <div class="form-group">
                        <label class="form-label">Titre *</label>
                        <input class="form-control" id="f-titre" value="${trav?.titre || ''}" placeholder="ex. Remplacement chauffe-eau, Fuite plomberie…" required />
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Type d'intervention *</label>
                            <select class="form-control" id="f-type">
                                ${Object.entries(TYPES).map(([k, v]) => `<option value="${k}" ${(trav?.type_travail || 'REPARATION') === k ? 'selected' : ''}>${v.icon} ${v.label}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Priorité</label>
                            <select class="form-control" id="f-prio">
                                <option value="HAUTE"   ${trav?.priorite === 'HAUTE'   ? 'selected' : ''}>🔴 Haute</option>
                                <option value="MOYENNE" ${(!trav || trav.priorite === 'MOYENNE') ? 'selected' : ''}>🟡 Moyenne</option>
                                <option value="BASSE"   ${trav?.priorite === 'BASSE'   ? 'selected' : ''}>🟢 Basse</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Propriété *</label>
                            <select class="form-control" id="f-prop" required>
                                <option value="">Sélectionner…</option>
                                ${props.map(p => `<option value="${p.id}" ${trav?.property_id == p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Appartement</label>
                            <select class="form-control" id="f-unit">
                                <option value="">— Tout l'immeuble —</option>
                                ${initUnits.map(u => `<option value="${u.id}" ${trav?.unit_id == u.id ? 'selected' : ''}>${u.label}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Description / observations</label>
                        <textarea class="form-control" id="f-desc" rows="2" style="resize:vertical" placeholder="Détails de l'intervention, symptômes observés…">${trav?.description || ''}</textarea>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Statut actuel</label>
                            <select class="form-control" id="f-statut">
                                ${Object.entries(STATUTS).map(([k, v]) => `<option value="${k}" ${(trav?.statut || 'A_FAIRE') === k ? 'selected' : ''}>${v.label}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Date de signalement</label>
                            <input class="form-control" id="f-date" type="date" value="${trav?.date || today}" />
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Prestataire</label>
                            <input class="form-control" id="f-prest" value="${trav?.prestataire || ''}" placeholder="Nom / entreprise" />
                        </div>
                        <div class="form-group">
                            <label class="form-label">Contact prestataire</label>
                            <input class="form-control" id="f-contact" value="${trav?.contact_prestataire || ''}" placeholder="Tél. ou email" />
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Montant devis</label>
                            <input class="form-control" id="f-devis" type="number" min="0" step="0.01" value="${trav?.montant_devis ?? ''}" />
                        </div>
                        <div class="form-group">
                            <label class="form-label">Montant facture</label>
                            <input class="form-control" id="f-facture" type="number" min="0" step="0.01" value="${trav?.montant_facture ?? ''}" />
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Date de fin prévue</label>
                            <input class="form-control" id="f-fin-prevue" type="date" value="${trav?.date_fin_prevue || ''}" />
                        </div>
                        <div class="form-group" id="garantie-group" style="${(trav?.type_travail === 'REMPLACEMENT') ? '' : 'display:none'}">
                            <label class="form-label">Garantie (mois)</label>
                            <input class="form-control" id="f-garantie" type="number" min="0" value="${trav?.garantie_mois ?? ''}" placeholder="ex. 24" />
                        </div>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-ghost" onclick="closeModal()">Annuler</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Enregistrer' : 'Créer'}</button>
                </div>
            </form>
        `);

        // Afficher le champ garantie seulement pour REMPLACEMENT
        document.getElementById('f-type').addEventListener('change', e => {
            document.getElementById('garantie-group').style.display = e.target.value === 'REMPLACEMENT' ? '' : 'none';
        });

        // Charger les unités selon la propriété
        document.getElementById('f-prop').addEventListener('change', async e => {
            const units = e.target.value ? await api(`/units?property_id=${e.target.value}`) : [];
            const sel = document.getElementById('f-unit');
            sel.innerHTML = `<option value="">— Tout l'immeuble —</option>` +
                units.map(u => `<option value="${u.id}">${u.label}</option>`).join('');
        });

        document.getElementById('trav-form').addEventListener('submit', async e => {
            e.preventDefault();
            const devis   = document.getElementById('f-devis').value;
            const facture = document.getElementById('f-facture').value;
            const garantie = document.getElementById('f-garantie')?.value;
            const body = {
                property_id:       document.getElementById('f-prop').value,
                unit_id:           document.getElementById('f-unit').value || null,
                titre:             document.getElementById('f-titre').value.trim(),
                description:       document.getElementById('f-desc').value.trim() || null,
                date:              document.getElementById('f-date').value,
                statut:            document.getElementById('f-statut').value,
                priorite:          document.getElementById('f-prio').value,
                type_travail:      document.getElementById('f-type').value,
                prestataire:       document.getElementById('f-prest').value.trim() || null,
                contact_prestataire: document.getElementById('f-contact').value.trim() || null,
                montant_devis:     devis   ? parseFloat(devis)   : null,
                montant_facture:   facture ? parseFloat(facture) : null,
                date_fin_prevue:   document.getElementById('f-fin-prevue').value || null,
                garantie_mois:     garantie ? parseInt(garantie) : null,
            };
            try {
                if (isEdit) { await api(`/travaux/${trav.id}`, { method: 'PUT', body }); toast('Intervention modifiée'); }
                else        { await api('/travaux', { method: 'POST', body });            toast('Intervention créée'); }
                closeModal();
                load();
            } catch (err) { toast(err.message, 'error'); }
        });
    }

    await load();
}
