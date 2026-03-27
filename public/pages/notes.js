// ── Notes / Messages page ────────────────────────────────────────────────────

async function renderNotesPage(container) {
    // Charger toutes les données nécessaires en parallèle
    let notes = [], properties = [], units = [];
    try {
        [notes, properties, units] = await Promise.all([
            api('/notes'),
            api('/properties'),
            api('/units'),
        ]);
    } catch (e) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${e.message}</p></div>`;
        return;
    }

    // ── Filtres actifs ──────────────────────────────────────────────────────
    let filterPropId = null;
    let filterSearch = '';
    let filterMine   = false;

    function getFilteredNotes() {
        let list = [...notes];
        // Épinglées en premier
        list.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return b.created_at.localeCompare(a.created_at);
        });
        if (filterPropId) list = list.filter(n => n.property_id === filterPropId);
        if (filterMine)   list = list.filter(n => n.author_id === window.CURRENT_USER?.id);
        if (filterSearch) {
            const q = filterSearch.toLowerCase();
            list = list.filter(n =>
                n.content.toLowerCase().includes(q) ||
                (n.author_name || '').toLowerCase().includes(q) ||
                (n.property_name || '').toLowerCase().includes(q) ||
                (n.unit_label || '').toLowerCase().includes(q)
            );
        }
        return list;
    }

    // ── Render ──────────────────────────────────────────────────────────────
    function render() {
        const filtered = getFilteredNotes();
        const pinnedCount = notes.filter(n => n.pinned).length;

        container.innerHTML = `
<div class="page-header">
  <div>
    <div class="page-title">Notes & Messages</div>
    <div class="page-subtitle">${notes.length} note${notes.length !== 1 ? 's' : ''} au total${pinnedCount ? ` · ${pinnedCount} épinglée${pinnedCount !== 1 ? 's' : ''}` : ''}</div>
  </div>
  <button class="btn btn-primary" id="btn-new-note">+ Nouvelle note</button>
</div>

<!-- Barre de filtres -->
<div class="notes-filters">
  <input type="text" class="form-control notes-search" id="notes-search" placeholder="🔍 Rechercher dans les notes…" value="${filterSearch}" />
  <select class="form-control" id="notes-prop-filter" style="width:auto;min-width:160px">
    <option value="">Toutes les propriétés</option>
    <option value="general">📌 Notes générales</option>
    ${properties.map(p => `<option value="${p.id}" ${filterPropId === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
  </select>
  <label class="notes-mine-label" style="display:flex;align-items:center;gap:6px;cursor:pointer;white-space:nowrap">
    <input type="checkbox" id="notes-mine" ${filterMine ? 'checked' : ''} /> Mes notes
  </label>
</div>

<!-- Feed des notes -->
<div class="notes-feed" id="notes-feed">
  ${filtered.length === 0 ? `
    <div class="empty-state">
      <div class="empty-icon">📝</div>
      <p>Aucune note pour l'instant</p>
      <p style="font-size:13px;color:var(--text-3)">Laissez une note pour votre équipe ou liez-la à un bien.</p>
    </div>
  ` : filtered.map(n => renderNoteCard(n)).join('')}
</div>`;

        // Events filtres
        document.getElementById('notes-search').addEventListener('input', e => {
            filterSearch = e.target.value;
            document.getElementById('notes-feed').innerHTML =
                getFilteredNotes().length === 0
                ? `<div class="empty-state"><div class="empty-icon">🔍</div><p>Aucune note trouvée</p></div>`
                : getFilteredNotes().map(n => renderNoteCard(n)).join('');
            bindCardEvents();
        });

        document.getElementById('notes-prop-filter').addEventListener('change', e => {
            const v = e.target.value;
            filterPropId = v === '' ? null : v === 'general' ? 'general' : Number(v);
            refreshFeed();
        });

        document.getElementById('notes-mine').addEventListener('change', e => {
            filterMine = e.target.checked;
            refreshFeed();
        });

        document.getElementById('btn-new-note').addEventListener('click', () => openNoteForm());

        bindCardEvents();
    }

    function refreshFeed() {
        let filtered = getFilteredNotes();
        if (filterPropId === 'general') filtered = filtered.filter(n => !n.property_id);
        document.getElementById('notes-feed').innerHTML =
            filtered.length === 0
            ? `<div class="empty-state"><div class="empty-icon">📝</div><p>Aucune note</p></div>`
            : filtered.map(n => renderNoteCard(n)).join('');
        bindCardEvents();
    }

    function renderNoteCard(n) {
        const canEdit   = n.author_id === window.CURRENT_USER?.id || window.isAdmin();
        const timeAgo   = formatRelativeTime(n.created_at);
        const wasEdited = n.updated_at !== n.created_at;
        const contextTag = n.property_name
            ? `<span class="note-tag note-tag-prop">🏘️ ${n.property_name}${n.unit_label ? ' · ' + n.unit_label : ''}</span>`
            : `<span class="note-tag note-tag-general">📌 Général</span>`;

        return `
<div class="note-card ${n.pinned ? 'note-pinned' : ''}" data-note-id="${n.id}">
  ${n.pinned ? '<div class="note-pin-indicator">📌 Épinglée</div>' : ''}
  <div class="note-header">
    <div class="note-avatar">${getInitials(n.author_name)}</div>
    <div class="note-meta">
      <div class="note-author">${escHtml(n.author_name || n.author_login)}</div>
      <div class="note-time">${timeAgo}${wasEdited ? ' · modifiée' : ''}</div>
    </div>
    <div class="note-context">${contextTag}</div>
    ${canEdit ? `
    <div class="note-actions">
      <button class="note-action-btn btn-pin-note" data-id="${n.id}" title="${n.pinned ? 'Désépingler' : 'Épingler'}">
        ${n.pinned ? '📌' : '📍'}
      </button>
      <button class="note-action-btn btn-edit-note" data-id="${n.id}" title="Modifier">✏️</button>
      <button class="note-action-btn btn-delete-note" data-id="${n.id}" title="Supprimer">🗑️</button>
    </div>` : ''}
  </div>
  <div class="note-content">${escHtml(n.content).replace(/\n/g, '<br>')}</div>
</div>`;
    }

    function bindCardEvents() {
        document.querySelectorAll('.btn-pin-note').forEach(btn => {
            btn.addEventListener('click', async e => {
                const id = Number(e.currentTarget.dataset.id);
                const note = notes.find(n => n.id === id);
                if (!note) return;
                try {
                    const updated = await api(`/notes/${id}`, { method: 'PATCH', body: { pinned: !note.pinned } });
                    const idx = notes.findIndex(n => n.id === id);
                    notes[idx] = updated;
                    render();
                    toast(updated.pinned ? 'Note épinglée' : 'Note désépinglée');
                } catch (e) { toast(e.message, 'error'); }
            });
        });

        document.querySelectorAll('.btn-edit-note').forEach(btn => {
            btn.addEventListener('click', e => {
                const id = Number(e.currentTarget.dataset.id);
                const note = notes.find(n => n.id === id);
                if (note) openNoteForm(note);
            });
        });

        document.querySelectorAll('.btn-delete-note').forEach(btn => {
            btn.addEventListener('click', async e => {
                const id = Number(e.currentTarget.dataset.id);
                if (!confirm('Supprimer cette note ?')) return;
                try {
                    await api(`/notes/${id}`, { method: 'DELETE' });
                    notes = notes.filter(n => n.id !== id);
                    render();
                    toast('Note supprimée');
                } catch (e) { toast(e.message, 'error'); }
            });
        });
    }

    // ── Formulaire création/édition ─────────────────────────────────────────
    function openNoteForm(existing = null) {
        const isEdit = !!existing;
        const propOptions = properties.map(p =>
            `<option value="${p.id}" ${existing?.property_id === p.id ? 'selected' : ''}>${p.name}</option>`
        ).join('');

        // Filtrer les unités selon la propriété sélectionnée
        const selectedPropId = existing?.property_id || null;
        const filteredUnits = selectedPropId ? units.filter(u => u.property_id === selectedPropId) : [];

        openModal(`
<div class="modal-header">
  <h3 class="modal-title">${isEdit ? 'Modifier la note' : 'Nouvelle note'}</h3>
</div>
<form id="note-form">
  <div class="form-group">
    <label class="form-label">Message *</label>
    <textarea class="form-control" id="note-content" rows="5" placeholder="Écrivez votre message pour l'équipe…" style="resize:vertical">${existing ? escHtml(existing.content) : ''}</textarea>
  </div>
  ${!isEdit ? `
  <div class="form-row">
    <div class="form-group">
      <label class="form-label">Propriété liée (optionnel)</label>
      <select class="form-control" id="note-prop">
        <option value="">— Aucune (note générale) —</option>
        ${propOptions}
      </select>
    </div>
    <div class="form-group" id="note-unit-group" style="${filteredUnits.length ? '' : 'display:none'}">
      <label class="form-label">Appartement lié (optionnel)</label>
      <select class="form-control" id="note-unit">
        <option value="">— Tout le bien —</option>
        ${filteredUnits.map(u => `<option value="${u.id}">${u.label}</option>`).join('')}
      </select>
    </div>
  </div>
  <div class="form-group">
    <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
      <input type="checkbox" id="note-pinned" /> Épingler cette note (visible en priorité)
    </label>
  </div>
  ` : ''}
  <div class="form-actions">
    <button type="button" class="btn btn-ghost" onclick="closeModal()">Annuler</button>
    <button type="submit" class="btn btn-primary">${isEdit ? 'Enregistrer' : 'Publier'}</button>
  </div>
</form>`);

        // Mettre à jour les unités quand la propriété change
        const propSel = document.getElementById('note-prop');
        if (propSel) {
            propSel.addEventListener('change', () => {
                const pid = Number(propSel.value);
                const u = units.filter(u => u.property_id === pid);
                const unitGroup = document.getElementById('note-unit-group');
                const unitSel   = document.getElementById('note-unit');
                if (u.length && pid) {
                    unitGroup.style.display = '';
                    unitSel.innerHTML = `<option value="">— Tout le bien —</option>` +
                        u.map(u => `<option value="${u.id}">${u.label}</option>`).join('');
                } else {
                    unitGroup.style.display = 'none';
                }
            });
        }

        document.getElementById('note-form').addEventListener('submit', async e => {
            e.preventDefault();
            const content = document.getElementById('note-content').value.trim();
            if (!content) return toast('Le message est vide', 'error');

            try {
                if (isEdit) {
                    const updated = await api(`/notes/${existing.id}`, { method: 'PATCH', body: { content } });
                    const idx = notes.findIndex(n => n.id === existing.id);
                    notes[idx] = updated;
                    toast('Note modifiée');
                } else {
                    const propId  = document.getElementById('note-prop')?.value;
                    const unitId  = document.getElementById('note-unit')?.value;
                    const pinned  = document.getElementById('note-pinned')?.checked;
                    const newNote = await api('/notes', {
                        method: 'POST',
                        body: {
                            content,
                            property_id: propId ? Number(propId) : null,
                            unit_id:     unitId ? Number(unitId) : null,
                            pinned,
                        }
                    });
                    notes.unshift(newNote);
                    toast('Note publiée ✓');
                }
                closeModal();
                render();
            } catch (err) { toast(err.message, 'error'); }
        });
    }

    // ── Utilitaires ─────────────────────────────────────────────────────────
    function getInitials(name) {
        if (!name) return '?';
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.slice(0, 2).toUpperCase();
    }

    function escHtml(str) {
        return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function formatRelativeTime(isoStr) {
        const diff = Date.now() - new Date(isoStr).getTime();
        const mins  = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days  = Math.floor(diff / 86400000);
        if (mins < 1)   return 'À l\'instant';
        if (mins < 60)  return `Il y a ${mins} min`;
        if (hours < 24) return `Il y a ${hours}h`;
        if (days < 7)   return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
        return new Date(isoStr).toLocaleDateString('fr-FR');
    }

    render();
}
