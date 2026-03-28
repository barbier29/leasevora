const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'data.json');

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
    sejours: [],
    locataires: [],
    travaux: [],
    compteurs: [],
    users: [],
    notes: [],
};

function load() {
    if (!fs.existsSync(FILE)) return JSON.parse(JSON.stringify(DEFAULT));
    try {
        const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
        for (const k of ['sejours', 'locataires', 'travaux', 'compteurs', 'users', 'notes']) {
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

        // Migration spécifications unités
        data.units.forEach(u => {
            if (!('type'        in u)) u.type        = 'APPARTEMENT';
            if (!('nb_pieces'   in u)) u.nb_pieces   = null;
            if (!('surface'     in u)) u.surface     = null;
            if (!('etage'       in u)) u.etage       = null;
            if (!('description' in u)) u.description = null;
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
