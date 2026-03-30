async function renderUsersPage(container) {
    const ROLES = {
        PROPRIETAIRE: { label: '👑 Propriétaire', cls: 'badge-in' },
        GESTIONNAIRE: { label: '🔑 Gestionnaire', cls: 'badge-building' },
        EMPLOYE: { label: '👷 Employé', cls: 'badge-vacant' },
    };

    const LANGUAGES_LABELS  = { fr: '🇫🇷 Français', en: '🇬🇧 English' };

    const PERM_MODULES = [
        { key: 'dashboard',    label: '📊 Tableau de bord' },
        { key: 'properties',   label: '🏘️ Propriétés' },
        { key: 'units',        label: '🚪 Appartements' },
        { key: 'locataires',   label: '👤 Locataires' },
        { key: 'sejours',      label: '🛏️ Séjours' },
        { key: 'calendrier',   label: '📅 Calendrier' },
        { key: 'transactions', label: '💸 Transactions' },
        { key: 'caisse',       label: '🏦 Caisse' },
        { key: 'finance',      label: '📈 Compte de résultat' },
        { key: 'travaux',      label: '🔧 Travaux' },
        { key: 'compteurs',    label: '💡 Compteurs' },
    ];

    const ROLE_PERM_DEFAULTS = {
        PROPRIETAIRE: PERM_MODULES.map(m => m.key),
        GESTIONNAIRE: ['dashboard', 'properties', 'units', 'locataires', 'sejours', 'calendrier', 'travaux', 'compteurs'],
        EMPLOYE: ['dashboard', 'units', 'locataires', 'sejours', 'calendrier', 'travaux', 'compteurs'],
    };

    async function load() {
        try {
            const [users, settings] = await Promise.all([api('/users'), api('/settings')]);
            render(users, settings);
        } catch (e) {
            container.innerHTML = `<p class="text-muted">${e.message}</p>`;
        }
    }

    function render(users, settings) {
        const currencyOptions = Object.entries(window.CURRENCIES || {})
            .map(([code, c]) => `<option value="${code}" ${settings.currency === code ? 'selected' : ''}>${c.name} (${c.symbol})</option>`)
            .join('');

        container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">Utilisateurs & Paramètres</div>
          <div class="page-subtitle">${users.length} utilisateur${users.length !== 1 ? 's' : ''}</div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-ghost" id="invite-user-btn">✉️ Inviter par email</button>
          <button class="btn btn-primary" id="add-user-btn">+ Nouvel utilisateur</button>
        </div>
      </div>

      <!-- Settings card -->
      <div class="card" style="margin-bottom:24px">
        <div class="card-header"><span class="card-title">⚙️ Paramètres de l'application</span></div>
        <div class="settings-inline-form">
          <div class="form-group" style="margin:0;display:flex;align-items:center;gap:12px">
            <label class="form-label" style="margin:0;white-space:nowrap">💱 Devise :</label>
            <select class="form-control" id="currency-sel" style="width:200px">
              ${currencyOptions}
            </select>
          </div>
          <div class="form-group" style="margin:0;display:flex;align-items:center;gap:12px">
            <label class="form-label" style="margin:0;white-space:nowrap">🌐 Langue :</label>
            <select class="form-control" id="language-sel" style="width:180px">
              ${Object.entries(LANGUAGES_LABELS).map(([k, v]) => `<option value="${k}" ${(settings.language || 'fr') === k ? 'selected' : ''}>${v}</option>`).join('')}
            </select>
          </div>
          <button class="btn btn-primary" id="save-settings-btn">Enregistrer</button>
          <span id="settings-feedback" style="font-size:12px;color:var(--green);display:none">✓ Sauvegardé</span>
        </div>
      </div>

      <!-- Users table -->
      <div class="card">
        <table>
          <thead><tr>
            <th>Nom</th><th>Login</th><th>Email</th><th>Rôle</th><th>Accès</th><th>Statut</th><th></th>
          </tr></thead>
          <tbody>
            ${users.length ? users.map(u => {
            const r = ROLES[u.role] || { label: u.role, cls: '' };
            const isMe = u.id === window.CURRENT_USER?.id;
            let accesLabel;
            if (u.role === 'PROPRIETAIRE' || !u.permissions || u.permissions.length === 0) {
                accesLabel = '<span class="badge badge-in">Tous les accès</span>';
            } else {
                accesLabel = `<span class="badge badge-building">${u.permissions.length} module${u.permissions.length !== 1 ? 's' : ''}</span>`;
            }
            return `<tr>
                <td><strong>${u.prenom ? u.prenom + ' ' : ''}${u.nom}</strong>${isMe ? ` <span class="badge badge-in" style="font-size:9px">Vous</span>` : ''}</td>
                <td class="text-muted">${u.login}</td>
                <td class="text-muted">${u.email || '—'}</td>
                <td><span class="badge ${r.cls}">${r.label}</span></td>
                <td>${accesLabel}</td>
                <td><span class="badge ${u.actif !== false ? 'badge-in' : 'badge-out'}">${u.actif !== false ? 'Actif' : 'Inactif'}</span></td>
                <td style="text-align:right;white-space:nowrap">
                  <button class="btn btn-ghost btn-sm edit-user-btn" data-id="${u.id}">Modifier</button>
                  ${!isMe ? `<button class="btn btn-danger btn-sm del-user-btn" data-id="${u.id}" data-name="${u.nom}">✕</button>` : ''}
                </td>
              </tr>`;
        }).join('')
                : '<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">👥</div><p>Aucun utilisateur.</p></div></td></tr>'}
          </tbody>
        </table>
      </div>

      <!-- Tableau des droits par rôle -->
      <div class="card" style="margin-top:24px">
        <div class="card-header"><span class="card-title">🔐 Droits par rôle</span></div>
        <div style="padding:20px">
          <table>
            <thead><tr>
              <th>Section</th>
              <th style="text-align:center">👑 Propriétaire</th>
              <th style="text-align:center">🔑 Gestionnaire</th>
              <th style="text-align:center">👷 Employé</th>
            </tr></thead>
            <tbody>
              ${[
            ['Tableau de bord', 'complet', 'complet', 'limité'],
            ['Propriétés', 'lecture + écriture', 'lecture + écriture', 'non'],
            ['Appartements', 'lecture + écriture', 'lecture + écriture', 'lecture'],
            ['Locataires', 'lecture + écriture', 'lecture + écriture', 'lecture'],
            ['Séjours', 'lecture + écriture', 'lecture + écriture', 'lecture + écriture'],
            ['Calendrier', 'complet', 'complet', 'complet'],
            ['Transactions', 'lecture + écriture', 'lecture + écriture', 'non'],
            ['Caisse', 'lecture + écriture', 'lecture + écriture', 'non'],
            ['Travaux', 'lecture + écriture', 'lecture + écriture', 'lecture + écriture'],
            ['Compteurs', 'lecture + écriture', 'lecture + écriture', 'lecture + écriture'],
            ['Catégories', 'lecture + écriture', 'lecture', 'non'],
            ['Utilisateurs', 'lecture + écriture', 'non', 'non'],
            ['Paramètres', 'lecture + écriture', 'non', 'non'],
        ].map(([section, own, mgr, emp]) => {
            const cell = v => {
                if (v === 'non') return `<td style="text-align:center"><span class="badge badge-out">✕ Aucun</span></td>`;
                if (v === 'complet' || v === 'lecture + écriture') return `<td style="text-align:center"><span class="badge badge-in">✓ ${v}</span></td>`;
                if (v === 'lecture') return `<td style="text-align:center"><span class="badge badge-building">👁 Lecture</span></td>`;
                if (v === 'limité') return `<td style="text-align:center"><span class="badge badge-vacant">⚡ Limité</span></td>`;
                return `<td style="text-align:center">—</td>`;
            };
            return `<tr><td><strong>${section}</strong></td>${cell(own)}${cell(mgr)}${cell(emp)}</tr>`;
        }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

        document.getElementById('add-user-btn').addEventListener('click', () => showForm());
        document.getElementById('invite-user-btn').addEventListener('click', () => showInviteForm());

        document.getElementById('save-settings-btn').addEventListener('click', async () => {
            const currency = document.getElementById('currency-sel').value;
            const language = document.getElementById('language-sel').value;
            try {
                const s = await api('/settings', { method: 'PUT', body: { currency, language } });
                if (window.CURRENCIES && window.CURRENCIES[s.currency]) {
                    window.CURR = window.CURRENCIES[s.currency];
                }
                window.LANG = s.language || 'fr';
                const currLabel = window.CURRENCIES?.[s.currency]?.name || s.currency;
                toast(`Paramètres sauvegardés — Devise : ${currLabel} | Langue : ${LANGUAGES_LABELS[s.language]}`);
                const fb = document.getElementById('settings-feedback');
                fb.style.display = 'inline';
                setTimeout(() => fb.style.display = 'none', 2500);
            } catch (e) { toast(e.message, 'error'); }
        });

        container.querySelectorAll('.edit-user-btn').forEach(btn =>
            btn.addEventListener('click', () => showForm(users.find(u => u.id == btn.dataset.id))));
        container.querySelectorAll('.del-user-btn').forEach(btn =>
            btn.addEventListener('click', async () => {
                if (!confirm(`Supprimer l'utilisateur "${btn.dataset.name}" ?`)) return;
                try { await api(`/users/${btn.dataset.id}`, { method: 'DELETE' }); toast('Utilisateur supprimé'); load(); }
                catch (e) { toast(e.message, 'error'); }
            }));
    }

    function showForm(user = null) {
        const isEdit = !!user;
        const currentRole = user?.role || 'EMPLOYE';
        const isProprietaire = currentRole === 'PROPRIETAIRE';

        // Determine which permissions to pre-check
        const activePerms = (user?.permissions && user.permissions.length > 0)
            ? user.permissions
            : (ROLE_PERM_DEFAULTS[currentRole] || []);

        const permsHtml = PERM_MODULES.map(m => `
            <label style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg-2);border-radius:8px;cursor:pointer;font-size:13px">
              <input type="checkbox" class="perm-checkbox" value="${m.key}" ${activePerms.includes(m.key) ? 'checked' : ''} style="accent-color:var(--accent)">
              ${m.label}
            </label>`).join('');

        openModal(`
      <div class="modal-title">${isEdit ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}</div>
      <form id="user-form">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Prénom</label>
            <input class="form-control" id="uf-prenom" value="${user?.prenom || ''}" placeholder="Jean" />
          </div>
          <div class="form-group">
            <label class="form-label">Nom *</label>
            <input class="form-control" id="uf-nom" value="${user?.nom || ''}" required />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Login *</label>
            <input class="form-control" id="uf-login" value="${user?.login || ''}" placeholder="jean.dupont" required />
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input class="form-control" id="uf-email" type="email" value="${user?.email || ''}" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Mot de passe${isEdit ? ' (laisser vide = inchangé)' : ' *'}</label>
            <input class="form-control" id="uf-pwd" type="password" ${isEdit ? '' : 'required'} placeholder="••••••••" />
          </div>
          <div class="form-group">
            <label class="form-label">Rôle *</label>
            <select class="form-control" id="uf-role">
              <option value="PROPRIETAIRE" ${currentRole === 'PROPRIETAIRE' ? 'selected' : ''}>👑 Propriétaire — accès complet</option>
              <option value="GESTIONNAIRE" ${currentRole === 'GESTIONNAIRE' ? 'selected' : ''}>🔑 Gestionnaire — sans finances privées</option>
              <option value="EMPLOYE"      ${currentRole === 'EMPLOYE' ? 'selected' : ''}>👷 Employé — opérationnel uniquement</option>
            </select>
          </div>
        </div>
        ${isEdit ? `
        <div class="form-group">
          <label class="form-label">Statut</label>
          <select class="form-control" id="uf-actif">
            <option value="true" ${user?.actif !== false ? 'selected' : ''}>Actif</option>
            <option value="false" ${user?.actif === false ? 'selected' : ''}>Inactif (accès bloqué)</option>
          </select>
        </div>` : ''}
        <div class="form-group" id="perms-group" style="display:${isProprietaire ? 'none' : 'block'}">
          <label class="form-label">Accès aux modules</label>
          <div class="permissions-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;margin-top:8px">
            ${permsHtml}
          </div>
          <div style="font-size:11px;color:var(--text-3);margin-top:6px">Si aucun module coché, les accès par défaut du rôle s'appliquent.</div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" onclick="closeModal()">Annuler</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Enregistrer' : 'Créer'}</button>
        </div>
      </form>
    `);

        // Show/hide permissions block based on role selection
        const roleSelect = document.getElementById('uf-role');
        const permsGroup = document.getElementById('perms-group');

        roleSelect.addEventListener('change', () => {
            const selectedRole = roleSelect.value;
            if (selectedRole === 'PROPRIETAIRE') {
                permsGroup.style.display = 'none';
            } else {
                permsGroup.style.display = 'block';
                // Update checkboxes to match new role defaults
                const defaults = ROLE_PERM_DEFAULTS[selectedRole] || [];
                document.querySelectorAll('.perm-checkbox').forEach(cb => {
                    cb.checked = defaults.includes(cb.value);
                });
            }
        });

        document.getElementById('user-form').addEventListener('submit', async e => {
            e.preventDefault();
            const role = document.getElementById('uf-role').value;
            const isProprietaireSubmit = role === 'PROPRIETAIRE';
            const checked = [...document.querySelectorAll('.perm-checkbox:checked')].map(cb => cb.value);
            const permissions = isProprietaireSubmit ? [] : checked;

            const body = {
                nom: document.getElementById('uf-nom').value.trim(),
                prenom: document.getElementById('uf-prenom').value.trim(),
                email: document.getElementById('uf-email').value.trim(),
                login: document.getElementById('uf-login').value.trim(),
                role,
                actif: !isEdit || document.getElementById('uf-actif').value === 'true',
                permissions,
            };
            const pwd = document.getElementById('uf-pwd').value;
            if (pwd) body.password = pwd;
            try {
                if (isEdit) { await api(`/users/${user.id}`, { method: 'PUT', body }); toast('Utilisateur modifié'); }
                else { await api('/users', { method: 'POST', body }); toast('Utilisateur créé'); }
                closeModal(); load();
            } catch (e) { toast(e.message, 'error'); }
        });
    }

    function showInviteForm() {
        const permsHtml = PERM_MODULES.map(m => `
            <label style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg-2);border-radius:8px;cursor:pointer;font-size:13px">
              <input type="checkbox" class="inv-perm-checkbox" value="${m.key}" style="accent-color:var(--accent)">
              ${m.label}
            </label>`).join('');

        openModal(`
          <div class="modal-title">✉️ Inviter un utilisateur</div>
          <p style="font-size:13px;color:var(--text-3);margin-bottom:20px">Un lien d'invitation sera généré. Si le SMTP est configuré, l'email sera envoyé automatiquement.</p>
          <form id="invite-form">
            <div class="form-row">
              <div class="form-group" style="flex:2">
                <label class="form-label">Email *</label>
                <input class="form-control" id="if-email" type="email" placeholder="jean@exemple.com" required />
              </div>
              <div class="form-group">
                <label class="form-label">Rôle *</label>
                <select class="form-control" id="if-role">
                  <option value="GESTIONNAIRE">🔑 Gestionnaire</option>
                  <option value="EMPLOYE">👷 Employé</option>
                  <option value="PROPRIETAIRE">👑 Propriétaire</option>
                </select>
              </div>
            </div>
            <div class="form-group" id="inv-perms-group">
              <label class="form-label">Accès aux modules</label>
              <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;margin-top:8px">
                ${permsHtml}
              </div>
            </div>
            <div id="invite-result" style="display:none;margin-bottom:16px">
              <div style="background:var(--bg-2);border-radius:10px;padding:14px 16px">
                <div id="invite-result-msg" style="font-size:13px;margin-bottom:10px;color:var(--text-2)"></div>
                <div style="font-size:12px;color:var(--text-3);margin-bottom:6px;font-weight:600">LIEN D'INVITATION</div>
                <div style="display:flex;gap:8px;align-items:center">
                  <input class="form-control" id="invite-link-input" readonly style="font-size:12px;font-family:monospace;background:var(--bg-1)" />
                  <button type="button" class="btn btn-ghost btn-sm" id="copy-link-btn" style="white-space:nowrap">📋 Copier</button>
                </div>
              </div>
            </div>
            <div class="form-actions">
              <button type="button" class="btn btn-ghost" onclick="closeModal()">Fermer</button>
              <button type="submit" class="btn btn-primary" id="invite-submit-btn">Envoyer l'invitation</button>
            </div>
          </form>
        `);

        // Toggle perms selon rôle
        document.getElementById('if-role').addEventListener('change', e => {
            const show = e.target.value !== 'PROPRIETAIRE';
            document.getElementById('inv-perms-group').style.display = show ? 'block' : 'none';
            const defaults = ROLE_PERM_DEFAULTS[e.target.value] || [];
            document.querySelectorAll('.inv-perm-checkbox').forEach(cb => {
                cb.checked = defaults.includes(cb.value);
            });
        });
        // Defaults pour gestionnaire
        const defaults = ROLE_PERM_DEFAULTS['GESTIONNAIRE'] || [];
        document.querySelectorAll('.inv-perm-checkbox').forEach(cb => {
            cb.checked = defaults.includes(cb.value);
        });

        document.getElementById('invite-form').addEventListener('submit', async e => {
            e.preventDefault();
            const role = document.getElementById('if-role').value;
            const email = document.getElementById('if-email').value.trim();
            const permissions = role === 'PROPRIETAIRE' ? [] :
                [...document.querySelectorAll('.inv-perm-checkbox:checked')].map(cb => cb.value);

            const btn = document.getElementById('invite-submit-btn');
            btn.disabled = true;
            btn.textContent = 'Génération...';

            try {
                const result = await api('/invite', { method: 'POST', body: { email, role, permissions } });
                // Afficher le résultat
                document.getElementById('invite-result').style.display = 'block';
                document.getElementById('invite-link-input').value = result.link;
                document.getElementById('invite-result-msg').innerHTML = result.emailSent
                    ? `✅ Email envoyé à <strong>${email}</strong>`
                    : `⚠️ Email non envoyé (SMTP non configuré). Copiez et partagez ce lien manuellement :`;
                document.getElementById('copy-link-btn').addEventListener('click', () => {
                    navigator.clipboard.writeText(result.link).then(() => {
                        document.getElementById('copy-link-btn').textContent = '✅ Copié !';
                        setTimeout(() => document.getElementById('copy-link-btn').textContent = '📋 Copier', 2000);
                    });
                });
                btn.textContent = 'Nouvelle invitation';
                btn.disabled = false;
                document.getElementById('if-email').value = '';
            } catch (err) {
                toast(err.message, 'error');
                btn.disabled = false;
                btn.textContent = 'Envoyer l\'invitation';
            }
        });
    }

    await load();
}
