const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'data.json');

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

const DEFAULT = {
    _seq: {},
    settings: {
        currency: 'EUR',
        language: 'fr',
        email_enabled: false,
        email_to: '',
        smtp_host: '',
        smtp_port: 465,
        smtp_user: '',
        smtp_pass: ''
    },
    properties: [],
    units: [],
    categories: [],
    transactions: [],
    comptes: [],
    sejours: [],
    locataires: [],
    travaux: [],
    compteurs: [],
    users: [],
    notes: [],
    activite: [],
};

function load() {
    if (!fs.existsSync(FILE)) return JSON.parse(JSON.stringify(DEFAULT));
    try {
        const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
        for (const k of ['sejours', 'locataires', 'travaux', 'compteurs', 'users', 'notes', 'activite']) {
            if (!data[k]) data[k] = [];
        }
        if (!data.settings) data.settings = { currency: 'EUR', language: 'fr' };
        if (!data.settings.language) data.settings.language = 'fr';

        // Migrations travaux — champs ajoutés après création initiale
        const VALID_TYPE_TARIF = ['MENSUEL', 'NUITEE', 'FORFAIT', 'HEBDOMADAIRE'];
        for (const t of data.travaux) {
            if (!t.type_travail)        t.type_travail        = 'REPARATION';
            if (!t.historique)          t.historique          = [];
            if (!('contact_prestataire' in t)) t.contact_prestataire = null;
            if (!('date_fin_prevue'     in t)) t.date_fin_prevue     = null;
            if (!('date_fin_reelle'     in t)) t.date_fin_reelle     = null;
            if (!('garantie_mois'       in t)) t.garantie_mois       = null;
        }

        // Migrations sejours — type_tarif invalide ou absent
        for (const s of data.sejours) {
            if (!s.type_tarif || !VALID_TYPE_TARIF.includes(s.type_tarif)) {
                s.type_tarif = 'MENSUEL';
            }
        }

        // Migration permissions utilisateurs
        data.users.forEach(u => {
            if (!u.permissions) u.permissions = [];
        });

        // Migration caution + paiements partiels
        data.sejours.forEach(s => {
            if (!('caution_montant'          in s)) s.caution_montant           = 0;
            if (!('caution_statut'           in s)) s.caution_statut            = 'AUCUNE';
            if (!('caution_date'             in s)) s.caution_date              = null;
            if (!('caution_date_restitution' in s)) s.caution_date_restitution  = null;
            if (!('caution_montant_utilise'  in s)) s.caution_montant_utilise   = 0;
            if (!('caution_notes'            in s)) s.caution_notes             = null;
        });
        data.transactions.forEach(t => {
            if (!('sejour_id' in t)) t.sejour_id = null;
        });

        // Migration catégories — injecter les catégories par défaut si la liste est trop petite
        if (!data.categories || data.categories.length < 10) {
            const now = new Date().toISOString();
            const existingIds = new Set((data.categories || []).map(c => c.id));
            const toAdd = DEFAULT_CATEGORIES.filter(c => !existingIds.has(c.id));
            // Mettre à jour les noms des catégories existantes (ids 1-7) vers le français
            (data.categories || []).forEach(c => {
                const def = DEFAULT_CATEGORIES.find(d => d.id === c.id);
                if (def) c.name = def.name;
            });
            toAdd.forEach(c => data.categories.push({ ...c, created_at: now }));
            data.categories.sort((a, b) => a.id - b.id);
            if (!data._seq) data._seq = {};
            data._seq.categories = Math.max(data._seq.categories || 0, DEFAULT_CATEGORIES.length);
        }

        // Migration comptes — créer les comptes par défaut si aucun n'existe
        if (!data.comptes || data.comptes.length === 0) {
            data.comptes = [
                { id: 1, nom: 'Caisse principale', type: 'CAISSE', solde_initial: 0, actif: true, created_at: new Date().toISOString() },
                { id: 2, nom: 'Compte bancaire', type: 'BANQUE', solde_initial: 0, actif: true, created_at: new Date().toISOString() },
            ];
            // Assigner compte_id aux transactions existantes basé sur source
            data.transactions.forEach(t => {
                if (!t.compte_id) {
                    t.compte_id = t.source === 'BANQUE' ? 2 : 1;
                }
            });
        }
        // Migration compte_id sur transactions existantes
        data.transactions.forEach(t => {
            if (!('compte_id' in t)) {
                t.compte_id = t.source === 'BANQUE' ? 2 : 1;
            }
        });

        // Migration spécifications unités
        data.units.forEach(u => {
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
        data.properties.forEach(p => {
            if (!('nb_etages'          in p)) p.nb_etages          = null;
            if (!('annee_construction' in p)) p.annee_construction = null;
            if (!('surface_totale'     in p)) p.surface_totale     = null;
            if (!('description'        in p)) p.description        = null;
        });

        return data;
    } catch { return JSON.parse(JSON.stringify(DEFAULT)); }
}

function save(data) {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function nextId(data, table) {
    if (!data._seq) data._seq = {};
    data._seq[table] = (data._seq[table] || 0) + 1;
    return data._seq[table];
}

module.exports = { load, save, nextId };
