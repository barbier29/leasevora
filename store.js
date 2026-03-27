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
