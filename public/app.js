// ── Currency config ────────────────────────────────────────────────────────
const CURRENCIES = {
    EUR: { symbol: '€', name: 'Euro', after: false, decimals: 2 },
    USD: { symbol: '$', name: 'Dollar US', after: false, decimals: 2 },
    GBP: { symbol: '£', name: 'Livre Sterling', after: false, decimals: 2 },
    CHF: { symbol: 'CHF', name: 'Franc Suisse', after: true, decimals: 2 },
    CAD: { symbol: 'CA$', name: 'Dollar Canadien', after: false, decimals: 2 },
    AED: { symbol: 'AED', name: 'Dirham UAE', after: true, decimals: 2 },
    XOF: { symbol: 'FCFA', name: 'Franc CFA (UEMOA)', after: true, decimals: 0 },
    XAF: { symbol: 'FCFA', name: 'Franc CFA (CEMAC)', after: true, decimals: 0 },
    MAD: { symbol: 'MAD', name: 'Dirham Marocain', after: true, decimals: 2 },
    TND: { symbol: 'TND', name: 'Dinar Tunisien', after: true, decimals: 3 },
    DZD: { symbol: 'DA', name: 'Dinar Algérien', after: true, decimals: 2 },
    NGN: { symbol: '₦', name: 'Naira Nigérian', after: false, decimals: 2 },
    GHS: { symbol: 'GH₵', name: 'Cédi Ghanéen', after: false, decimals: 2 },
    KES: { symbol: 'KSh', name: 'Shilling Kenyan', after: false, decimals: 2 },
    ZAR: { symbol: 'R', name: 'Rand Sud-Africain', after: false, decimals: 2 },
    GNF: { symbol: 'GNF', name: 'Franc Guinéen', after: true, decimals: 0 },
    JPY: { symbol: '¥', name: 'Yen Japonais', after: false, decimals: 0 },
    BRL: { symbol: 'R$', name: 'Réal Brésilien', after: false, decimals: 2 },
    MXN: { symbol: 'MX$', name: 'Peso Mexicain', after: false, decimals: 2 },
    XPF: { symbol: 'FCFP', name: 'Franc Pacifique', after: true, decimals: 0 },
};
window.CURRENCIES = CURRENCIES;
window.CURR = CURRENCIES['EUR'];

window.fmt = n => {
    const c = window.CURR;
    return Number(n).toLocaleString('fr-FR', {
        minimumFractionDigits: c.decimals, maximumFractionDigits: c.decimals
    });
};
window.fmtMoney = n => {
    const c = window.CURR;
    const v = fmt(n);
    return c.after ? `${v} ${c.symbol}` : `${c.symbol}${v}`;
};

window.fmtDate = d => { if (!d) return '—'; return new Date(d).toLocaleDateString('fr-FR'); };
window.nbJours = (a, b) => { if (!a || !b) return null; return Math.max(0, Math.round((new Date(b) - new Date(a)) / 86400000)); };

function printSection(title, contentHtml) {
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html lang="fr"><head>
    <meta charset="UTF-8"><title>${title}</title>
    <style>body{font-family:system-ui,sans-serif;padding:24px;color:#111}h1{font-size:20px;margin-bottom:16px}
    table{width:100%;border-collapse:collapse;font-size:13px}th{text-align:left;padding:8px;border-bottom:2px solid #ddd;background:#f5f5f5}
    td{padding:8px;border-bottom:1px solid #eee}.in{color:#059669;font-weight:600}.out{color:#dc2626;font-weight:600}@media print{body{padding:0}}</style>
  </head><body><h1>${title}</h1>${contentHtml}<script>window.print();<\/script></body></html>`);
}
window.printSection = printSection;

// ── Auth state ────────────────────────────────────────────────────────────
window.CURRENT_USER = null;

const API_BASE = '/api';
async function apiRaw(path, opts = {}) {
    const token = localStorage.getItem('pm_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const r = await fetch(API_BASE + path, { ...opts, headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
    if (r.status === 401) { showLogin(); throw new Error('Session expirée'); }
    if (!r.ok) { const e = await r.json().catch(() => { }); throw new Error(e?.error || `HTTP ${r.status}`); }
    return r.json();
}
window.api = apiRaw;

// ── Toasts & Modals ────────────────────────────────────────────────────────
function toast(msg, type = 'success') {
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.textContent = msg;
    document.getElementById('toast-container').appendChild(t);
    setTimeout(() => t.remove(), 3200);
}
window.toast = toast;

function openModal(html) {
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.remove('hidden');
}
function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('modal-body').innerHTML = '';
}
window.openModal = openModal;
window.closeModal = closeModal;
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
});

// ── Role checks ────────────────────────────────────────────────────────────
window.hasRole = (...roles) => roles.includes(window.CURRENT_USER?.role);
window.isAdmin = () => window.CURRENT_USER?.role === 'PROPRIETAIRE';
window.isMgr = () => ['PROPRIETAIRE', 'GESTIONNAIRE'].includes(window.CURRENT_USER?.role);

// Role-based page access
const PAGE_ROLES = {
    dashboard:    ['PROPRIETAIRE', 'GESTIONNAIRE', 'AGENT', 'EMPLOYE'],
    properties:   ['PROPRIETAIRE', 'GESTIONNAIRE', 'AGENT', 'TECHNICIEN'],
    units:        ['PROPRIETAIRE', 'GESTIONNAIRE', 'AGENT', 'TECHNICIEN', 'EMPLOYE'],
    locataires:   ['PROPRIETAIRE', 'GESTIONNAIRE', 'AGENT', 'EMPLOYE'],
    sejours:      ['PROPRIETAIRE', 'GESTIONNAIRE', 'AGENT', 'EMPLOYE'],
    calendrier:   ['PROPRIETAIRE', 'GESTIONNAIRE', 'AGENT', 'EMPLOYE'],
    transactions: ['PROPRIETAIRE', 'GESTIONNAIRE', 'AGENT'],
    caisse:       ['PROPRIETAIRE'],
    comptes:      ['PROPRIETAIRE'],
    finance:      ['PROPRIETAIRE'],
    travaux:      ['PROPRIETAIRE', 'GESTIONNAIRE', 'AGENT', 'TECHNICIEN', 'EMPLOYE'],
    compteurs:    ['PROPRIETAIRE', 'GESTIONNAIRE', 'AGENT', 'TECHNICIEN', 'EMPLOYE'],
    categories:   ['PROPRIETAIRE', 'AGENT'],
    notes:        ['PROPRIETAIRE', 'GESTIONNAIRE', 'TECHNICIEN', 'EMPLOYE'],
    users:        ['PROPRIETAIRE'],
    paiements:    ['PROPRIETAIRE', 'GESTIONNAIRE'],
};

// Vérification d'accès combinée : rôle + permissions utilisateur
function canAccess(page) {
    const user = window.CURRENT_USER;
    if (!user) return false;
    const roleAllowed = (PAGE_ROLES[page] || []).includes(user.role);
    if (!roleAllowed) return false;
    // Si l'utilisateur a des permissions explicites, les utiliser
    if (user.permissions && Array.isArray(user.permissions) && user.permissions.length > 0) {
        return user.permissions.includes(page);
    }
    return true;
}
window.canAccess = canAccess;

// ── Login screen ───────────────────────────────────────────────────────────
function showLogin(errorMsg) {
    localStorage.removeItem('pm_token');
    localStorage.removeItem('pm_user');
    window.CURRENT_USER = null;
    document.getElementById('app').style.display = 'none';
    let overlay = document.getElementById('login-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'login-overlay';
        document.body.appendChild(overlay);
    }
    overlay.innerHTML = `
    <div class="login-card">
      <div class="login-brand">🪹<span>Leasevora</span></div>
      <h2 class="login-title">Connexion</h2>
      ${errorMsg ? `<div class="login-error">${errorMsg}</div>` : ''}
      <form id="login-form">
        <div class="form-group">
          <label class="form-label">Identifiant</label>
          <input class="form-control" id="li-login" autocomplete="username" placeholder="admin" autofocus />
        </div>
        <div class="form-group">
          <label class="form-label">Mot de passe</label>
          <input class="form-control" id="li-pwd" type="password" autocomplete="current-password" placeholder="••••••••" />
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;margin-top:8px">Se connecter</button>
      </form>
      <p style="margin-top:18px;text-align:center;font-size:11px;color:var(--text-3)">Leasevora v1.0.0</p>
    </div>`;
    overlay.style.display = 'flex';

    document.getElementById('login-form').addEventListener('submit', async e => {
        e.preventDefault();
        const login = document.getElementById('li-login').value.trim();
        const password = document.getElementById('li-pwd').value;
        try {
            const r = await fetch('/api/auth/login', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login, password }),
            });
            const data = await r.json();
            if (!r.ok) return showLogin(data.error || 'Erreur de connexion');
            localStorage.setItem('pm_token', data.token);
            localStorage.setItem('pm_user', JSON.stringify(data.user));
            overlay.style.display = 'none';
            bootApp(data.user);
        } catch { showLogin('Serveur indisponible'); }
    });
}

// ── Boot / init ─────────────────────────────────────────────────────────────
async function bootApp(user) {
    window.CURRENT_USER = user;

    // Load settings (currency + language)
    try {
        const settings = await apiRaw('/settings');
        window.CURR = CURRENCIES[settings.currency] || CURRENCIES['EUR'];
        window.LANG = settings.language || 'fr';
        document.documentElement.lang = window.LANG;
    } catch { window.LANG = 'fr'; }

    document.getElementById('app').style.display = 'flex';
    const loginOverlay = document.getElementById('login-overlay');
    if (loginOverlay) loginOverlay.style.display = 'none';

    // Bannière mode démo
    const oldBanner = document.getElementById('demo-banner');
    if (oldBanner) oldBanner.remove();
    if (user.login === 'demo') {
        const banner = document.createElement('div');
        banner.id = 'demo-banner';
        banner.innerHTML = '🔒 Mode démo — Données fictives, lecture seule · <a href="#" onclick="event.preventDefault();localStorage.removeItem(\'pm_token\');localStorage.removeItem(\'pm_user\');location.reload()" style="color:#fff;text-decoration:underline">Se déconnecter</a>';
        banner.style.cssText = 'background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;padding:10px 16px;text-align:center;font-size:13px;font-weight:500;border-radius:0 0 12px 12px;position:relative;z-index:10';
        const mainContent = document.querySelector('.main-content');
        if (mainContent) mainContent.prepend(banner);
    }

    // Show/hide nav items based on role
    document.querySelectorAll('.nav-item').forEach(el => {
        const page = el.dataset.page;
        el.style.display = canAccess(page) ? '' : 'none';
    });

    // Update user badge in sidebar
    const badge = document.getElementById('user-badge');
    if (badge) {
        const roleLabels = { PROPRIETAIRE: '👑 Propriétaire', GESTIONNAIRE: '🔑 Gestionnaire', AGENT: '🏠 Agent', TECHNICIEN: '🔧 Technicien', EMPLOYE: '👷 Employé' };
        badge.innerHTML = `
      <div style="font-size:12px;font-weight:600">${user.prenom ? user.prenom + ' ' : ''}${user.nom}</div>
      <div style="font-size:10px;color:var(--text-3)">${roleLabels[user.role] || user.role}</div>
    `;
    }

    // Bind logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', async () => {
        try { await apiRaw('/auth/logout', { method: 'POST' }); } catch { }
        showLogin();
    });

    // Navigate to current hash
    onHashChange();

    // Init global search
    initGlobalSearch();
}

// ── Global Search ──────────────────────────────────────────────────────────
function initGlobalSearch() {
    const input = document.getElementById('global-search');
    const dropdown = document.getElementById('search-results');
    if (!input) return;
    let timeout;
    input.addEventListener('input', () => {
        clearTimeout(timeout);
        const q = input.value.trim();
        if (q.length < 2) { dropdown.classList.add('hidden'); return; }
        timeout = setTimeout(async () => {
            try {
                const r = await api('/search?q=' + encodeURIComponent(q));
                renderSearchResults(r, dropdown);
            } catch {}
        }, 250);
    });
    document.addEventListener('click', e => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });
}

function renderSearchResults(r, dropdown) {
    const sections = [];
    if (r.properties?.length) {
        sections.push(`<div class="search-section-label">Propriétés</div>`);
        r.properties.forEach(p => {
            sections.push(`<div class="search-result-item" data-page="properties">
              <span class="search-result-icon">🏢</span>
              <div><div class="search-result-main">${p.name}</div><div class="search-result-sub">${p.type === 'BUILDING' ? 'Immeuble' : 'Bien indépendant'}</div></div>
            </div>`);
        });
    }
    if (r.units?.length) {
        sections.push(`<div class="search-section-label">Appartements</div>`);
        r.units.forEach(u => {
            sections.push(`<div class="search-result-item" data-page="units">
              <span class="search-result-icon">🚪</span>
              <div><div class="search-result-main">${u.label}</div><div class="search-result-sub">${u.property_name}</div></div>
            </div>`);
        });
    }
    if (r.locataires?.length) {
        sections.push(`<div class="search-section-label">Locataires</div>`);
        r.locataires.forEach(l => {
            sections.push(`<div class="search-result-item" data-page="locataires">
              <span class="search-result-icon">👤</span>
              <div><div class="search-result-main">${l.prenom || ''} ${l.nom}</div><div class="search-result-sub">${l.telephone || ''}</div></div>
            </div>`);
        });
    }
    if (r.sejours?.length) {
        sections.push(`<div class="search-section-label">Séjours</div>`);
        r.sejours.forEach(s => {
            sections.push(`<div class="search-result-item" data-page="sejours">
              <span class="search-result-icon">🛏️</span>
              <div><div class="search-result-main">${s.locataire}</div><div class="search-result-sub">${s.unit_label} · ${s.statut}</div></div>
            </div>`);
        });
    }
    if (!sections.length) {
        sections.push(`<div style="padding:16px;text-align:center;color:var(--text-3);font-size:13px">Aucun résultat</div>`);
    }
    dropdown.innerHTML = sections.join('');
    dropdown.classList.remove('hidden');
    dropdown.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            if (page) { location.hash = page; dropdown.classList.add('hidden'); document.getElementById('global-search').value = ''; }
        });
    });
}
window.initGlobalSearch = initGlobalSearch;

// ── Router ─────────────────────────────────────────────────────────────────
const PAGES = {
    dashboard: renderDashboardPage,
    properties: renderPropertiesPage,
    units: renderUnitsPage,
    locataires: renderLocatairesPage,
    sejours: renderSejoursPage,
    calendrier: renderCalendrierPage,
    transactions: renderTransactionsPage,
    caisse: renderCaissePage,
    comptes: renderComptesPage,
    travaux: renderTravauxPage,
    compteurs: renderCompteursPage,
    categories: renderCategoriesPage,
    notes: renderNotesPage,
    users: renderUsersPage,
    finance: renderFinancePage,
    paiements: renderPaiementsPage,
};

function navigate(page) {
    const validPage = PAGES[page] ? page : 'dashboard';
    const routed = canAccess(validPage) ? validPage : 'dashboard';

    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.page === routed);
    });
    const container = document.getElementById('page-content');
    container.innerHTML = `<div class="page-loading">
  <div class="skeleton skeleton-title"></div>
  <div class="skeleton-grid">
    <div class="skeleton skeleton-card"></div>
    <div class="skeleton skeleton-card"></div>
    <div class="skeleton skeleton-card"></div>
    <div class="skeleton skeleton-card"></div>
  </div>
  <div class="skeleton skeleton-table"></div>
</div>`;
    PAGES[routed](container);
}

function onHashChange() {
    if (!window.CURRENT_USER) return;
    navigate(location.hash.replace('#', '') || 'dashboard');
}

document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', e => { e.preventDefault(); location.hash = el.dataset.page; });
});
window.addEventListener('hashchange', onHashChange);

// ── Mobile sidebar ──────────────────────────────────────────────────────────
function openSidebar() {
    document.querySelector('.sidebar').classList.add('open');
    document.getElementById('sidebar-backdrop').classList.add('show');
    document.body.style.overflow = 'hidden';
}
function closeSidebar() {
    document.querySelector('.sidebar').classList.remove('open');
    document.getElementById('sidebar-backdrop').classList.remove('show');
    document.body.style.overflow = '';
}
window.closeSidebar = closeSidebar;

document.getElementById('hamburger-btn')?.addEventListener('click', () => {
    document.querySelector('.sidebar').classList.contains('open') ? closeSidebar() : openSidebar();
});
document.getElementById('sidebar-backdrop')?.addEventListener('click', closeSidebar);

// Fermer la sidebar au clic sur un item de nav (mobile)
document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => { if (window.innerWidth <= 768) closeSidebar(); });
});

// ── Startup ────────────────────────────────────────────────────────────────
(async () => {
    const token = localStorage.getItem('pm_token');
    if (token) {
        try {
            const user = await (await fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            })).json();
            if (user.id) { bootApp(user); return; }
        } catch { }
    }
    showLogin();
})();
