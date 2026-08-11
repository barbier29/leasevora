const fs = require('fs');
const path = require('path');

const FILE    = path.join(__dirname, 'data.json');
const EXAMPLE = path.join(__dirname, 'data.example.json');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const USE_SUPABASE = !!(SUPABASE_URL && SUPABASE_KEY);

// Sur first boot sans data.json, initialiser depuis data.example.json
if (!fs.existsSync(FILE) && fs.existsSync(EXAMPLE)) {
    fs.copyFileSync(EXAMPLE, FILE);
}

// ── Supabase sync ──────────────────────────────────────────────────────────
// Stratégie : local file = cache rapide (sync), Supabase = source de vérité (async)
// Au démarrage : on pull Supabase → écrit dans data.json
// À chaque save() : on écrit data.json + push Supabase en fire-and-forget

async function syncFromSupabase() {
    if (!USE_SUPABASE) return;
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/store?id=eq.1&select=data`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });

        // Vérifier le statut HTTP avant de lire le body
        if (!res.ok) {
            console.warn(`⚠️  Supabase sync: HTTP ${res.status} — données locales conservées, aucune écriture`);
            return;
        }

        const rows = await res.json();

        if (Array.isArray(rows) && rows.length > 0 && rows[0].data) {
            // ✅ Supabase a des données → restaurer localement
            fs.writeFileSync(FILE, JSON.stringify(rows[0].data, null, 2));
            console.log('✅ Données restaurées depuis Supabase');
        } else if (Array.isArray(rows) && rows.length === 0) {
            // Supabase vide (premier démarrage absolu) → pousser les données locales
            // SÉCURITÉ : ne pousser que si les données locales ont du contenu réel
            if (fs.existsSync(FILE)) {
                const localData = JSON.parse(fs.readFileSync(FILE, 'utf8'));
                const hasRealData = (localData.users || []).length > 0 ||
                                    Object.keys(localData.orgs || {}).length > 0 ||
                                    (localData.properties || []).length > 0;
                if (hasRealData) {
                    await pushToSupabase(localData);
                    console.log('✅ Données initiales envoyées à Supabase');
                } else {
                    console.log('ℹ️  Supabase vide et données locales vides — rien à pousser');
                }
            }
        } else {
            // Réponse inattendue (pas un tableau, rows[0].data null…)
            // → NE RIEN FAIRE, protéger Supabase
            console.warn('⚠️  Supabase sync: réponse inattendue — données locales conservées, Supabase inchangé');
        }
    } catch (e) {
        console.error('⚠️  Supabase sync failed:', e.message, '— données locales conservées');
    }
}

async function pushToSupabase(data) {
    if (!USE_SUPABASE) return;
    try {
        await fetch(`${SUPABASE_URL}/rest/v1/store`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify({ id: 1, data, updated_at: new Date().toISOString() })
        });
    } catch (e) {
        console.error('⚠️  Supabase write failed:', e.message);
    }
}

const DEFAULT_CATEGORIES = [
    { id: 1,  name: 'Loyer mensuel',                    kind: 'IN'  },
    { id: 2,  name: 'Revenus divers',                   kind: 'IN'  },
    { id: 3,  name: 'Maintenance & réparations',        kind: 'OUT' },
    { id: 4,  name: 'Salaire / Personnel',              kind: 'OUT' },
    { id: 5,  name: 'Charges & fluides',                kind: 'OUT' },
    { id: 6,  name: 'Assurance propriétaire',           kind: 'OUT' },
    { id: 7,  name: 'Taxes & impôts',                   kind: 'OUT' },
    { id: 8,  name: 'Loyer journalier',                 kind: 'IN'  },
    { id: 9,  name: 'Loyer hebdomadaire',               kind: 'IN'  },
    { id: 10, name: 'Caution / Dépôt de garantie',      kind: 'IN'  },
    { id: 11, name: 'Remboursement de caution',         kind: 'IN'  },
    { id: 12, name: 'Charges récupérables',             kind: 'IN'  },
    { id: 13, name: "Frais d'agence (entrée)",          kind: 'IN'  },
    { id: 14, name: "Indemnité d'occupation",           kind: 'IN'  },
    { id: 15, name: 'Pénalités de retard locataire',    kind: 'IN'  },
    { id: 16, name: 'Remboursement assurance',          kind: 'IN'  },
    { id: 17, name: 'Avance sur loyer',                 kind: 'IN'  },
    { id: 18, name: 'Subvention / Aide',                kind: 'IN'  },
    { id: 19, name: 'Autres revenus',                   kind: 'IN'  },
    { id: 20, name: 'Plomberie',                        kind: 'OUT' },
    { id: 21, name: 'Électricité / Travaux électriques',kind: 'OUT' },
    { id: 22, name: 'Peinture & décoration',            kind: 'OUT' },
    { id: 23, name: 'Menuiserie / Serrurerie',          kind: 'OUT' },
    { id: 24, name: 'Climatisation / Chauffage',        kind: 'OUT' },
    { id: 25, name: 'Nettoyage & entretien',            kind: 'OUT' },
    { id: 26, name: 'Jardinage & espaces verts',        kind: 'OUT' },
    { id: 27, name: 'Charges de copropriété',           kind: 'OUT' },
    { id: 28, name: 'Eau & assainissement',             kind: 'OUT' },
    { id: 29, name: 'Internet & téléphone',             kind: 'OUT' },
    { id: 30, name: 'Assurance multirisque',            kind: 'OUT' },
    { id: 31, name: 'Taxe foncière',                    kind: 'OUT' },
    { id: 32, name: "Taxe d'habitation",                kind: 'OUT' },
    { id: 33, name: 'Honoraires notaire',               kind: 'OUT' },
    { id: 34, name: 'Honoraires avocat',                kind: 'OUT' },
    { id: 35, name: 'Frais bancaires',                  kind: 'OUT' },
    { id: 36, name: 'Remboursement emprunt',            kind: 'OUT' },
    { id: 37, name: "Intérêts d'emprunt",               kind: 'OUT' },
    { id: 38, name: 'Publicité / Annonces',             kind: 'OUT' },
    { id: 39, name: 'Frais de gestion',                 kind: 'OUT' },
    { id: 40, name: 'Achat mobilier',                   kind: 'OUT' },
    { id: 41, name: 'Achat équipements',                kind: 'OUT' },
    { id: 42, name: 'Travaux de rénovation',            kind: 'OUT' },
    { id: 43, name: 'Mise aux normes',                  kind: 'OUT' },
    { id: 44, name: 'Sinistre & dommages',              kind: 'OUT' },
    { id: 45, name: 'Déménagement / Installation',      kind: 'OUT' },
    { id: 46, name: 'Amendes & pénalités',              kind: 'OUT' },
    { id: 47, name: 'Autres dépenses',                  kind: 'OUT' },
];

// ── Multi-entreprise ───────────────────────────────────────────────────────
// Chaque entreprise (organisation) possède un espace de données étanche.
// Les utilisateurs et invitations restent globaux, porteurs d'un org_id.
// data = { _seq, users[], invitations[], orgs: { "<id>": { name, settings, ...collections } } }

const ORG_COLLECTIONS = ['properties', 'units', 'categories', 'transactions', 'comptes',
    'sejours', 'locataires', 'travaux', 'compteurs', 'notes', 'activite', 'declarations'];

const DEFAULT_ORG_SETTINGS = {
    currency: 'XOF', // produit pensé pour le Togo — l'entreprise peut changer dans Paramètres
    language: 'fr',
    email_enabled: false,
    email_to: '',
    smtp_host: '',
    smtp_port: 465,
    smtp_user: '',
    smtp_pass: ''
};

const DEFAULT = { _seq: {}, users: [], invitations: [], orgs: {} };

function emptyOrgBucket(name) {
    const b = { name: name || 'Mon entreprise', settings: JSON.parse(JSON.stringify(DEFAULT_ORG_SETTINGS)) };
    for (const k of ORG_COLLECTIONS) b[k] = [];
    return b;
}

// L'espace de données d'une entreprise. Crée un bucket vide si absent (défensif).
function orgOf(data, orgId) {
    if (!data.orgs) data.orgs = {};
    const key = String(orgId || 1);
    if (!data.orgs[key]) data.orgs[key] = emptyOrgBucket('Entreprise ' + key);
    return data.orgs[key];
}

function allOrgs(data) {
    return Object.entries(data.orgs || {}).map(([id, org]) => ({ id: Number(id), org }));
}

// Crée une nouvelle entreprise avec ses catégories et comptes par défaut.
function newOrg(data, name) {
    if (!data._seq) data._seq = {};
    data._seq.orgs = Math.max(data._seq.orgs || 0, ...allOrgs(data).map(o => o.id), 0) + 1;
    const id = data._seq.orgs;
    const bucket = emptyOrgBucket(name);
    const now = new Date().toISOString();
    bucket.categories = DEFAULT_CATEGORIES.map(c => ({ id: nextId(data, 'categories'), name: c.name, kind: c.kind, created_at: now }));
    bucket.comptes = [
        { id: nextId(data, 'comptes'), nom: 'Caisse principale', type: 'CAISSE', solde_initial: 0, actif: true, created_at: now },
        { id: nextId(data, 'comptes'), nom: 'Compte bancaire',   type: 'BANQUE', solde_initial: 0, actif: true, created_at: now },
    ];
    data.orgs[String(id)] = bucket;
    return id;
}

function load() {
    if (!fs.existsSync(FILE)) return JSON.parse(JSON.stringify(DEFAULT));
    try {
        const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));

        // ── Migration structurelle mono → multi-entreprise (déterministe) ──
        // Les données historiques vivaient à la racine ; elles deviennent l'org 1.
        if (!data.orgs) {
            const legacy = emptyOrgBucket('Mon entreprise');
            if (data.settings) legacy.settings = { ...legacy.settings, ...data.settings };
            for (const k of ORG_COLLECTIONS) {
                if (Array.isArray(data[k])) legacy[k] = data[k];
                delete data[k];
            }
            delete data.settings;
            data.orgs = { '1': legacy };
            if (!data._seq) data._seq = {};
            data._seq.orgs = Math.max(data._seq.orgs || 0, 1);
        }

        if (!data.users) data.users = [];
        if (!data.invitations) data.invitations = [];
        data.users.forEach(u => {
            if (!u.org_id) u.org_id = 1;
            if (!u.permissions) u.permissions = [];
        });
        data.invitations.forEach(i => { if (!i.org_id) i.org_id = 1; });

        // ── Migrations par entreprise ──
        const VALID_TYPE_TARIF = ['MENSUEL', 'NUITEE', 'FORFAIT', 'HEBDOMADAIRE'];
        for (const { org } of allOrgs(data)) {
            for (const k of ORG_COLLECTIONS) if (!org[k]) org[k] = [];
            if (!org.settings) org.settings = JSON.parse(JSON.stringify(DEFAULT_ORG_SETTINGS));
            if (!org.settings.language) org.settings.language = 'fr';

            // Migrations travaux — champs ajoutés après création initiale
            for (const t of org.travaux) {
                if (!t.type_travail)        t.type_travail        = 'REPARATION';
                if (!t.historique)          t.historique          = [];
                if (!('contact_prestataire' in t)) t.contact_prestataire = null;
                if (!('date_fin_prevue'     in t)) t.date_fin_prevue     = null;
                if (!('date_fin_reelle'     in t)) t.date_fin_reelle     = null;
                if (!('garantie_mois'       in t)) t.garantie_mois       = null;
            }

            // Migrations sejours — type_tarif invalide ou absent
            for (const s of org.sejours) {
                if (!s.type_tarif || !VALID_TYPE_TARIF.includes(s.type_tarif)) {
                    s.type_tarif = 'MENSUEL';
                }
            }

            // Migration caution + paiements partiels
            org.sejours.forEach(s => {
                if (!('caution_montant'          in s)) s.caution_montant           = 0;
                if (!('caution_statut'           in s)) s.caution_statut            = 'AUCUNE';
                if (!('caution_date'             in s)) s.caution_date              = null;
                if (!('caution_date_restitution' in s)) s.caution_date_restitution  = null;
                if (!('caution_montant_utilise'  in s)) s.caution_montant_utilise   = 0;
                if (!('caution_notes'            in s)) s.caution_notes             = null;
                if (!('caution_historique'       in s)) s.caution_historique        = [];
                if (!('long_terme' in s)) s.long_terme = false;
                if (!('jour_paiement' in s)) s.jour_paiement = null; // day of month rent is due (1-31)
            });
            org.transactions.forEach(t => {
                if (!('sejour_id' in t)) t.sejour_id = null;
            });

            // Migration catégories — injecter les catégories par défaut si la liste est trop petite
            if (!org.categories || org.categories.length < 10) {
                const now = new Date().toISOString();
                const existingIds = new Set((org.categories || []).map(c => c.id));
                const toAdd = DEFAULT_CATEGORIES.filter(c => !existingIds.has(c.id));
                (org.categories || []).forEach(c => {
                    const def = DEFAULT_CATEGORIES.find(d => d.id === c.id);
                    if (def) c.name = def.name;
                });
                toAdd.forEach(c => org.categories.push({ ...c, created_at: now }));
                org.categories.sort((a, b) => a.id - b.id);
                if (!data._seq) data._seq = {};
                data._seq.categories = Math.max(data._seq.categories || 0, DEFAULT_CATEGORIES.length);
            }

            // Migration comptes — créer les comptes par défaut si aucun n'existe
            if (!org.comptes || org.comptes.length === 0) {
                org.comptes = [
                    { id: 1, nom: 'Caisse principale', type: 'CAISSE', solde_initial: 0, actif: true, created_at: new Date().toISOString() },
                    { id: 2, nom: 'Compte bancaire', type: 'BANQUE', solde_initial: 0, actif: true, created_at: new Date().toISOString() },
                ];
                org.transactions.forEach(t => {
                    if (!t.compte_id) {
                        t.compte_id = t.source === 'BANQUE' ? 2 : 1;
                    }
                });
            }
            // Migration compte_id sur transactions existantes
            org.transactions.forEach(t => {
                if (!('compte_id' in t)) {
                    t.compte_id = t.source === 'BANQUE' ? 2 : 1;
                }
            });

            // Migration mode de paiement + vérification locataire
            // NB : les verif_token des anciennes transactions sont générés UNE FOIS
            // au démarrage (migrateVerifTokens) — jamais ici, car load() ne sauvegarde pas.
            org.transactions.forEach(t => {
                if (!('mode_paiement'      in t)) t.mode_paiement      = null;
                if (!('reference_paiement' in t)) t.reference_paiement = null;
            });

            // Migration catégorie manquante : les paiements créés via le flux
            // séjour n'envoyaient pas de category_id → transaction « ? » non
            // modifiable (le formulaire d'édition exige une catégorie).
            // Résolution déterministe par nom, dans les catégories de l'org.
            const catByName = n => org.categories.find(c => c.name === n);
            org.transactions.forEach(t => {
                if (t.category_id == null) {
                    const cat = (t.kind === 'IN' && t.sejour_id) ? (catByName('Loyer mensuel') || org.categories.find(c => c.kind === 'IN'))
                        : t.kind === 'IN' ? (catByName('Autres revenus') || org.categories.find(c => c.kind === 'IN'))
                        : (catByName('Autres dépenses') || org.categories.find(c => c.kind === 'OUT'));
                    if (cat) t.category_id = cat.id;
                }
            });

            // Migration spécifications unités
            org.units.forEach(u => {
                if (!('type'           in u)) u.type           = 'APPARTEMENT';
                if (!('nb_pieces'      in u)) u.nb_pieces      = null;
                if (!('surface'        in u)) u.surface        = null;
                if (!('etage'          in u)) u.etage          = null;
                if (!('description'    in u)) u.description    = null;
                if (!('nb_chambres'    in u)) u.nb_chambres    = null;
                if (!('nb_sdb'         in u)) u.nb_sdb         = null;
                if (!('meuble'         in u)) u.meuble         = false;
                if (!('balcon'         in u)) u.balcon         = false;
                if (!('cave'           in u)) u.cave           = false;
                if (!('parking_inclus' in u)) u.parking_inclus = false;
            });

            // Migration spécifications propriétés
            org.properties.forEach(p => {
                if (!('nb_etages'          in p)) p.nb_etages          = null;
                if (!('annee_construction' in p)) p.annee_construction = null;
                if (!('surface_totale'     in p)) p.surface_totale     = null;
                if (!('description'        in p)) p.description        = null;
            });
        }

        return data;
    } catch { return JSON.parse(JSON.stringify(DEFAULT)); }
}

// ── Sauvegarde périodique et graceful shutdown ─────────────────────────────
// Render envoie SIGTERM avant de tuer le process. On intercepte ce signal
// pour forcer un push Supabase synchrone avant de mourir.

let _pendingSave = null; // dernières données à synchroniser

function save(data) {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
    const hasUsers = (data.users || []).length > 0;
    if (!hasUsers) {
        console.warn('⚠️  save(): 0 utilisateurs — push Supabase ignoré par sécurité');
        return;
    }
    // Mémoriser pour le flush SIGTERM
    _pendingSave = data;
    // Push asynchrone (fire & forget pour la performance en cours d'exécution)
    pushToSupabase(data);
}

// Sauvegarde périodique toutes les 30s (filet de sécurité)
if (USE_SUPABASE) {
    setInterval(() => {
        if (!fs.existsSync(FILE)) return;
        try {
            const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
            const hasUsers = (data.users || []).length > 0;
            if (hasUsers) {
                pushToSupabase(data);
            }
        } catch (e) { /* silencieux */ }
    }, 30000);
}

// Graceful shutdown : attendre que Supabase reçoive les données avant de mourir
async function flushAndExit(signal) {
    console.log(`\n⚡ ${signal} reçu — flush Supabase avant arrêt...`);
    if (USE_SUPABASE && fs.existsSync(FILE)) {
        try {
            const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
            const hasUsers = (data.users || []).length > 0;
            if (hasUsers) {
                await pushToSupabase(data);
                console.log('✅ Données sauvegardées dans Supabase avant arrêt');
            }
        } catch (e) {
            console.error('⚠️  Flush final échoué:', e.message);
        }
    }
    process.exit(0);
}

process.on('SIGTERM', () => flushAndExit('SIGTERM'));
process.on('SIGINT',  () => flushAndExit('SIGINT'));

function nextId(data, table) {
    if (!data._seq) data._seq = {};
    data._seq[table] = (data._seq[table] || 0) + 1;
    return data._seq[table];
}

// ── Migration ponctuelle : structure + tokens de vérification ──────────────
// Appelée UNE FOIS au démarrage (après syncFromSupabase). Persiste la
// migration structurelle et génère un token pour chaque paiement de loyer
// et chaque locataire qui n'en a pas.
function migrateVerifTokens() {
    const crypto = require('crypto');
    const data = load(); // load() applique la migration structurelle en mémoire
    let changed = 0;
    for (const { org } of allOrgs(data)) {
        (org.transactions || []).forEach(t => {
            if (t.kind === 'IN' && t.sejour_id && !t.verif_token) {
                t.verif_token = crypto.randomBytes(16).toString('hex');
                t.verif_statut = 'EN_ATTENTE';
                t.verif_historique = [];
                changed++;
            }
        });
        (org.locataires || []).forEach(l => {
            if (!l.portal_token) {
                l.portal_token = crypto.randomBytes(16).toString('hex');
                changed++;
            }
        });
    }
    // ── Purge ponctuelle de comptes de test morts (à retirer après exécution
    // en production). Supprime les utilisateurs listés ET leur entreprise.
    const DEAD_LOGINS = ['rcb', 'test.deploy.0806']; // comparaison insensible à la casse
    const deadUsers = data.users.filter(u => DEAD_LOGINS.includes(u.login.toLowerCase()));
    if (deadUsers.length > 0) {
        const deadOrgIds = new Set(deadUsers.map(u => String(u.org_id)));
        // Sécurité : ne supprimer une org que si AUCUN utilisateur hors-liste n'y vit
        for (const oid of [...deadOrgIds]) {
            const habitants = data.users.filter(u => String(u.org_id) === oid && !DEAD_LOGINS.includes(u.login.toLowerCase()));
            if (habitants.length > 0) deadOrgIds.delete(oid);
        }
        data.users = data.users.filter(u => !DEAD_LOGINS.includes(u.login.toLowerCase()));
        for (const oid of deadOrgIds) delete data.orgs[oid];
        changed++;
        console.log(`🧹 Purge : ${deadUsers.length} compte(s) de test supprimé(s) (${deadUsers.map(u => u.login).join(', ')}) + ${deadOrgIds.size} entreprise(s)`);
    }

    // Toujours sauvegarder au boot : persiste la migration structurelle même sans token neuf
    save(data);
    if (changed > 0) {
        console.log(`✅ Migration vérification/portail : ${changed} token(s) généré(s)`);
    }
}

// ── Vue cloisonnée par entreprise ──────────────────────────────────────────
// Les routes historiques lisent/écrivent `data.transactions`, `data.properties`…
// scoped() renvoie un Proxy : ces accès sont redirigés vers le bucket de
// l'entreprise (get ET set — y compris `data.transactions = data.transactions
// .filter(...)` utilisé par les DELETE). Tout le reste (users, invitations,
// _seq) passe au travers vers la racine. save() accepte la vue via __root.
function scoped(root, orgId) {
    const org = orgOf(root, orgId);
    return new Proxy(root, {
        get(target, key) {
            if (key === '__root') return root;
            if (key === 'settings' || ORG_COLLECTIONS.includes(key)) return org[key];
            return target[key];
        },
        set(target, key, value) {
            if (key === 'settings' || ORG_COLLECTIONS.includes(key)) { org[key] = value; return true; }
            target[key] = value;
            return true;
        }
    });
}

// save() exporté : accepte indifféremment la racine ou une vue scoped
function saveAny(data) {
    if (data && data.__root) data = data.__root; // dé-proxifier une vue scoped
    return save(data);
}

module.exports = { load, save: saveAny, nextId, orgOf, allOrgs, newOrg, scoped, ORG_COLLECTIONS, syncFromSupabase, migrateVerifTokens };
