/**
 * demo-data.js — Donnees fictives pour le compte demo de Leasevora
 *
 * Ce fichier fournit un jeu de donnees complet et realiste (mais fictif)
 * pour que le compte demo soit totalement isole des vraies donnees.
 * Contexte : gestion immobiliere en Afrique de l'Ouest (XOF / Francs CFA).
 */

const now = new Date();
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

// ── Proprietes ──────────────────────────────────────────────────────────────
const properties = [
    {
        id: 1, name: 'Residence Les Oliviers', type: 'IMMEUBLE',
        address: 'Rue 24, Quartier Almadies, Dakar, Senegal',
        nb_etages: 3, annee_construction: 2018, surface_totale: 450,
        description: 'Immeuble residentiel de standing avec 3 niveaux',
        created_at: '2024-06-15T10:00:00.000Z',
    },
    {
        id: 2, name: 'Immeuble Le Phare', type: 'IMMEUBLE',
        address: 'Boulevard du 13 Janvier, Lome, Togo',
        nb_etages: 2, annee_construction: 2020, surface_totale: 320,
        description: 'Immeuble mixte (habitation + commerce) en centre-ville',
        created_at: '2024-09-01T08:30:00.000Z',
    },
];

// ── Unites ──────────────────────────────────────────────────────────────────
const units = [
    {
        id: 1, property_id: 1, label: 'Appt A1 - RDC', type: 'APPARTEMENT',
        status: 'OCCUPIED', expected_rent: 250000, surface: 65,
        nb_pieces: 3, etage: 0, description: 'F3 avec terrasse',
        created_at: '2024-06-15T10:05:00.000Z',
    },
    {
        id: 2, property_id: 1, label: 'Appt A2 - 1er', type: 'APPARTEMENT',
        status: 'OCCUPIED', expected_rent: 300000, surface: 80,
        nb_pieces: 4, etage: 1, description: 'F4 lumineux vue mer',
        created_at: '2024-06-15T10:06:00.000Z',
    },
    {
        id: 3, property_id: 1, label: 'Studio B1 - 2e', type: 'STUDIO',
        status: 'VACANT', expected_rent: 150000, surface: 30,
        nb_pieces: 1, etage: 2, description: 'Studio meuble',
        created_at: '2024-06-15T10:07:00.000Z',
    },
    {
        id: 4, property_id: 2, label: 'Boutique RDC', type: 'LOCAL_COMMERCIAL',
        status: 'OCCUPIED', expected_rent: 400000, surface: 60,
        nb_pieces: 2, etage: 0, description: 'Local commercial avec vitrine',
        created_at: '2024-09-01T08:35:00.000Z',
    },
];

// ── Locataires ──────────────────────────────────────────────────────────────
const locataires = [
    {
        id: 1, nom: 'Diallo', prenom: 'Mamadou', email: 'mamadou.diallo@email.sn',
        telephone: '+221 77 123 45 67', type_piece: 'CNI', num_piece_identite: 'SN-2019-88431',
        notes: 'Locataire ponctuel, en place depuis 2024',
        created_at: '2024-07-01T09:00:00.000Z',
    },
    {
        id: 2, nom: 'Ajavon', prenom: 'Afi', email: 'afi.ajavon@email.tg',
        telephone: '+228 90 654 32 10', type_piece: 'PASSEPORT', num_piece_identite: 'TG-P-445920',
        notes: 'Commercante, bail commercial',
        created_at: '2024-09-10T11:00:00.000Z',
    },
    {
        id: 3, nom: 'Ndiaye', prenom: 'Fatou', email: 'fatou.ndiaye@email.sn',
        telephone: '+221 76 987 65 43', type_piece: 'CNI', num_piece_identite: 'SN-2021-12055',
        notes: '',
        created_at: '2024-08-15T14:00:00.000Z',
    },
];

// ── Sejours ─────────────────────────────────────────────────────────────────
const sejours = [
    {
        id: 1, unit_id: 1, locataire_id: 1,
        locataire: 'Mamadou Diallo',
        date_debut: '2024-08-01', date_fin: '2025-07-31',
        type_tarif: 'MENSUEL', montant: 250000, montant_total_du: 3000000,
        statut: 'EN_COURS',
        caution_montant: 500000, caution_statut: 'EN_ATTENTE',
        created_at: '2024-07-20T10:00:00.000Z',
    },
    {
        id: 2, unit_id: 4, locataire_id: 2,
        locataire: 'Afi Ajavon',
        date_debut: '2024-10-01', date_fin: '2026-09-30',
        type_tarif: 'MENSUEL', montant: 400000, montant_total_du: 9600000,
        statut: 'EN_COURS',
        caution_montant: 800000, caution_statut: 'EN_ATTENTE',
        created_at: '2024-09-25T15:00:00.000Z',
    },
];

// ── Comptes ─────────────────────────────────────────────────────────────────
const comptes = [
    {
        id: 1, nom: 'Caisse principale', type: 'CAISSE',
        solde_initial: 500000, actif: true,
        created_at: '2024-06-15T10:00:00.000Z',
    },
    {
        id: 2, nom: 'Banque CBAO', type: 'BANQUE',
        solde_initial: 2000000, actif: true,
        nom_banque: 'CBAO Groupe Attijariwafa', numero_compte: '00124-5678-001',
        iban: 'SN08 S020 0100 0001 2456 7800 1290', bic: 'CBAOSNDA',
        created_at: '2024-06-15T10:00:00.000Z',
    },
];

// ── Categories (identiques aux categories par defaut du store) ──────────────
const categories = [
    { id: 1,  name: 'Loyer mensuel',                    kind: 'IN'  },
    { id: 2,  name: 'Revenus divers',                   kind: 'IN'  },
    { id: 3,  name: 'Maintenance & reparations',        kind: 'OUT' },
    { id: 4,  name: 'Salaire / Personnel',              kind: 'OUT' },
    { id: 5,  name: 'Charges & fluides',                kind: 'OUT' },
    { id: 6,  name: 'Assurance proprietaire',           kind: 'OUT' },
    { id: 7,  name: 'Taxes & impots',                   kind: 'OUT' },
    { id: 8,  name: 'Loyer journalier',                 kind: 'IN'  },
    { id: 9,  name: 'Loyer hebdomadaire',               kind: 'IN'  },
    { id: 10, name: 'Caution / Depot de garantie',      kind: 'IN'  },
    { id: 11, name: 'Remboursement de caution',         kind: 'IN'  },
    { id: 12, name: 'Charges recuperables',             kind: 'IN'  },
    { id: 13, name: "Frais d'agence (entree)",          kind: 'IN'  },
    { id: 14, name: "Indemnite d'occupation",           kind: 'IN'  },
    { id: 15, name: 'Penalites de retard locataire',    kind: 'IN'  },
    { id: 16, name: 'Remboursement assurance',          kind: 'IN'  },
    { id: 17, name: 'Avance sur loyer',                 kind: 'IN'  },
    { id: 18, name: 'Subvention / Aide',                kind: 'IN'  },
    { id: 19, name: 'Autres revenus',                   kind: 'IN'  },
    { id: 20, name: 'Plomberie',                        kind: 'OUT' },
    { id: 21, name: 'Electricite / Travaux electriques',kind: 'OUT' },
    { id: 22, name: 'Peinture & decoration',            kind: 'OUT' },
    { id: 23, name: 'Menuiserie / Serrurerie',          kind: 'OUT' },
    { id: 24, name: 'Climatisation / Chauffage',        kind: 'OUT' },
    { id: 25, name: 'Nettoyage & entretien',            kind: 'OUT' },
    { id: 26, name: 'Jardinage & espaces verts',        kind: 'OUT' },
    { id: 27, name: 'Charges de copropriete',           kind: 'OUT' },
    { id: 28, name: 'Eau & assainissement',             kind: 'OUT' },
    { id: 29, name: 'Internet & telephone',             kind: 'OUT' },
    { id: 30, name: 'Assurance multirisque',            kind: 'OUT' },
    { id: 31, name: 'Taxe fonciere',                    kind: 'OUT' },
    { id: 32, name: "Taxe d'habitation",                kind: 'OUT' },
    { id: 33, name: 'Honoraires notaire',               kind: 'OUT' },
    { id: 34, name: 'Honoraires avocat',                kind: 'OUT' },
    { id: 35, name: 'Frais bancaires',                  kind: 'OUT' },
    { id: 36, name: 'Remboursement emprunt',            kind: 'OUT' },
    { id: 37, name: "Interets d'emprunt",               kind: 'OUT' },
    { id: 38, name: 'Publicite / Annonces',             kind: 'OUT' },
    { id: 39, name: 'Frais de gestion',                 kind: 'OUT' },
    { id: 40, name: 'Achat mobilier',                   kind: 'OUT' },
    { id: 41, name: 'Achat equipements',                kind: 'OUT' },
    { id: 42, name: 'Travaux de renovation',            kind: 'OUT' },
    { id: 43, name: 'Mise aux normes',                  kind: 'OUT' },
    { id: 44, name: 'Sinistre & dommages',              kind: 'OUT' },
    { id: 45, name: 'Demenagement / Installation',      kind: 'OUT' },
    { id: 46, name: 'Amendes & penalites',              kind: 'OUT' },
];

// ── Transactions ────────────────────────────────────────────────────────────
const transactions = [
    {
        id: 1, property_id: 1, unit_id: 1, sejour_id: 1,
        kind: 'IN', amount: 250000, category_id: 1, compte_id: 2,
        date: `${currentMonth}-05`, description: 'Loyer mars - Appt A1',
        source: 'MANUAL', created_at: `${currentMonth}-05T09:00:00.000Z`,
    },
    {
        id: 2, property_id: 1, unit_id: 2, sejour_id: null,
        kind: 'IN', amount: 300000, category_id: 1, compte_id: 2,
        date: `${currentMonth}-05`, description: 'Loyer mars - Appt A2',
        source: 'MANUAL', created_at: `${currentMonth}-05T09:15:00.000Z`,
    },
    {
        id: 3, property_id: 2, unit_id: 4, sejour_id: 2,
        kind: 'IN', amount: 400000, category_id: 1, compte_id: 2,
        date: `${currentMonth}-03`, description: 'Loyer mars - Boutique RDC',
        source: 'MANUAL', created_at: `${currentMonth}-03T10:00:00.000Z`,
    },
    {
        id: 4, property_id: 1, unit_id: 1, sejour_id: null,
        kind: 'OUT', amount: 75000, category_id: 20, compte_id: 1,
        date: `${currentMonth}-10`, description: 'Reparation fuite salle de bain - Appt A1',
        source: 'MANUAL', created_at: `${currentMonth}-10T14:00:00.000Z`,
    },
    {
        id: 5, property_id: 2, unit_id: null, sejour_id: null,
        kind: 'OUT', amount: 120000, category_id: 4, compte_id: 1,
        date: `${currentMonth}-15`, description: 'Salaire gardien - Le Phare',
        source: 'MANUAL', created_at: `${currentMonth}-15T08:00:00.000Z`,
    },
];

// ── Travaux ─────────────────────────────────────────────────────────────────
const travaux = [
    {
        id: 1, property_id: 1, unit_id: 1, transaction_id: 4,
        titre: 'Fuite robinet salle de bain',
        description: 'Le robinet de la salle de bain fuit depuis une semaine',
        type_travail: 'PLOMBERIE', statut: 'TERMINE', priorite: 'HAUTE',
        date_demande: `${currentMonth}-08`, date_fin: `${currentMonth}-10`,
        intervenant: 'Moussa Sow (plombier)',
        cout_estime: 80000, cout_reel: 75000,
        created_at: `${currentMonth}-08T11:00:00.000Z`,
    },
    {
        id: 2, property_id: 2, unit_id: 4, transaction_id: null,
        titre: 'Peinture facade boutique',
        description: 'Ravalement de la facade de la boutique du RDC',
        type_travail: 'PEINTURE', statut: 'EN_COURS', priorite: 'NORMALE',
        date_demande: `${currentMonth}-12`, date_fin: null,
        intervenant: 'Ets Koffi & Fils',
        cout_estime: 350000, cout_reel: null,
        created_at: `${currentMonth}-12T09:30:00.000Z`,
    },
];

// ── Compteurs ───────────────────────────────────────────────────────────────
const compteurs = [
    {
        id: 1, unit_id: 1, type: 'EAU', numero: 'EAU-DK-44521',
        releves: [
            { date: '2025-01-15', valeur: 1234 },
            { date: '2025-02-15', valeur: 1267 },
            { date: '2025-03-15', valeur: 1298 },
        ],
        created_at: '2024-08-01T10:00:00.000Z',
    },
    {
        id: 2, unit_id: 1, type: 'ELECTRICITE', numero: 'ELEC-DK-99102',
        releves: [
            { date: '2025-01-15', valeur: 5600 },
            { date: '2025-02-15', valeur: 5820 },
            { date: '2025-03-15', valeur: 6045 },
        ],
        created_at: '2024-08-01T10:05:00.000Z',
    },
    {
        id: 3, unit_id: 4, type: 'ELECTRICITE', numero: 'ELEC-LM-30087',
        releves: [
            { date: '2025-02-01', valeur: 2100 },
            { date: '2025-03-01', valeur: 2380 },
        ],
        created_at: '2024-10-01T08:00:00.000Z',
    },
];

// ── Notes ───────────────────────────────────────────────────────────────────
const notes = [
    {
        id: 1, property_id: 1, unit_id: 1, sejour_id: 1,
        contenu: 'Le locataire a signale une fissure au plafond de la chambre.',
        auteur: 'Demo', created_at: `${currentMonth}-07T16:00:00.000Z`,
    },
    {
        id: 2, property_id: 2, unit_id: null, sejour_id: null,
        contenu: 'Reunion avec le syndic prevue le 25 du mois pour les parties communes.',
        auteur: 'Demo', created_at: `${currentMonth}-02T10:00:00.000Z`,
    },
];

// ── Settings ────────────────────────────────────────────────────────────────
const settings = { currency: 'XOF', language: 'fr' };

// ── Activite (journal) ──────────────────────────────────────────────────────
const activite = [
    { id: 3, date: `${currentMonth}-15T08:00:00.000Z`, user_login: 'demo', user_nom: 'Demo', action: 'Ajout transaction', details: 'Salaire gardien - Le Phare : 120 000 FCFA' },
    { id: 2, date: `${currentMonth}-10T14:00:00.000Z`, user_login: 'demo', user_nom: 'Demo', action: 'Cloture travaux', details: 'Fuite robinet salle de bain - Appt A1' },
    { id: 1, date: `${currentMonth}-05T09:00:00.000Z`, user_login: 'demo', user_nom: 'Demo', action: 'Ajout transaction', details: 'Loyer mars encaisse pour Appt A1 : 250 000 FCFA' },
];

// ── Users (seul le compte demo) ─────────────────────────────────────────────
const users = [
    { id: 99, nom: 'Demo', prenom: '', login: 'demo', role: 'PROPRIETAIRE', email: 'demo@leasevora.app', actif: true },
];

// ── Paiements (vue sejour-centric) ──────────────────────────────────────────
// La route paiements retourne les sejours avec leur statut de paiement
function buildPaiements() {
    return sejours.filter(s => s.statut === 'EN_COURS').map(s => {
        const totalDu = s.montant_total_du || s.montant;
        const paye = transactions
            .filter(t => t.sejour_id === s.id && t.kind === 'IN')
            .reduce((sum, t) => sum + t.amount, 0);
        const solde = totalDu - paye;
        const unit = units.find(u => u.id === s.unit_id) || {};
        const prop = properties.find(p => p.id === unit.property_id) || {};
        return {
            sejour_id: s.id,
            locataire: s.locataire,
            unit_label: unit.label || '?',
            property_name: prop.name || '?',
            montant_total_du: totalDu,
            montant_paye: paye,
            solde_restant: Math.max(0, solde),
            statut_paiement: paye <= 0 ? 'EN_ATTENTE' : solde <= 0.01 ? 'SOLDE' : 'PARTIEL',
            date_debut: s.date_debut,
            date_fin: s.date_fin,
            type_tarif: s.type_tarif,
            montant: s.montant,
        };
    });
}

// ── Dashboard (stats calculees) ─────────────────────────────────────────────
function buildDashboard(queryMonth) {
    const month = queryMonth || currentMonth;
    const monthTxns = transactions.filter(t => t.date && t.date.slice(0, 7) === month);
    const totalIn = monthTxns.filter(t => t.kind === 'IN').reduce((s, t) => s + t.amount, 0);
    const totalOut = monthTxns.filter(t => t.kind === 'OUT').reduce((s, t) => s + t.amount, 0);

    const totalUnits = units.length;
    const occupiedUnits = units.filter(u => u.status === 'OCCUPIED').length;
    const travauxOuverts = travaux.filter(t => ['A_FAIRE', 'EN_COURS'].includes(t.statut)).length;
    const sejoursEnCours = sejours.filter(s => s.statut === 'EN_COURS').length;

    const byCategory = categories.map(c => {
        const total = monthTxns.filter(t => t.category_id === c.id).reduce((s, t) => s + t.amount, 0);
        return { category: c.name, kind: c.kind, total };
    }).sort((a, b) => b.total - a.total);

    const byProperty = properties.map(p => {
        const pts = monthTxns.filter(t => t.property_id === p.id);
        const pUnits = units.filter(u => u.property_id === p.id);
        return {
            id: p.id, name: p.name, type: p.type,
            total_in: pts.filter(t => t.kind === 'IN').reduce((s, t) => s + t.amount, 0),
            total_out: pts.filter(t => t.kind === 'OUT').reduce((s, t) => s + t.amount, 0),
            unit_count: pUnits.length,
            occupied_count: pUnits.filter(u => u.status === 'OCCUPIED').length,
        };
    }).sort((a, b) => a.name.localeCompare(b.name));

    const byUnit = units.map(u => {
        const prop = properties.find(p => p.id === u.property_id) || {};
        const uts = monthTxns.filter(t => t.unit_id === u.id);
        return {
            id: u.id, label: u.label, status: u.status,
            expected_rent: u.expected_rent,
            property_name: prop.name || '?',
            total_in: uts.filter(t => t.kind === 'IN').reduce((s, t) => s + t.amount, 0),
            total_out: uts.filter(t => t.kind === 'OUT').reduce((s, t) => s + t.amount, 0),
        };
    }).sort((a, b) => b.total_in - a.total_in);

    // Historique 12 mois (seul le mois courant a des donnees dans la demo)
    const chart12 = [];
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const mt = transactions.filter(t => t.date && t.date.slice(0, 7) === m);
        chart12.push({
            month: m,
            label: d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
            total_in: mt.filter(t => t.kind === 'IN').reduce((s, t) => s + t.amount, 0),
            total_out: mt.filter(t => t.kind === 'OUT').reduce((s, t) => s + t.amount, 0),
        });
    }

    // Historique 6 mois
    const hist6m = [];
    for (let i = 5; i >= 0; i--) {
        const d2 = new Date(); d2.setMonth(d2.getMonth() - i);
        const m = `${d2.getFullYear()}-${String(d2.getMonth() + 1).padStart(2, '0')}`;
        const txM = transactions.filter(t => t.date && t.date.startsWith(m));
        hist6m.push({
            month: m,
            label: d2.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
            total_in: txM.filter(t => t.kind === 'IN').reduce((s, t) => s + t.amount, 0),
            total_out: txM.filter(t => t.kind === 'OUT').reduce((s, t) => s + t.amount, 0),
        });
    }

    return {
        month, totalIn, totalOut,
        netCashflow: totalIn - totalOut,
        byCategory, byProperty, byUnit,
        alertesLoyers: [],
        alertesCautions: [],
        alertesPaiements: [],
        chart12,
        historique6mois: hist6m,
        sejoursBientotFinis: [],
        tauxOccupation: totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0,
        totalUnits, occupiedUnits,
        travauxOuverts, sejoursEnCours,
    };
}

// ── Caisse (tresorerie par compte) ──────────────────────────────────────────
function buildCaisse() {
    const comptesStats = comptes.filter(c => c.actif).map(c => {
        const txns = transactions.filter(t => t.compte_id === c.id);
        const totalIn  = txns.filter(t => t.kind === 'IN').reduce((s, t) => s + t.amount, 0);
        const totalOut = txns.filter(t => t.kind === 'OUT').reduce((s, t) => s + t.amount, 0);
        return {
            id: c.id, nom: c.nom, type: c.type,
            nom_banque: c.nom_banque || null,
            numero_compte: c.numero_compte || null,
            iban: c.iban || null, bic: c.bic || null,
            solde_initial: c.solde_initial || 0,
            solde: (c.solde_initial || 0) + totalIn - totalOut,
            total_in: totalIn, total_out: totalOut,
        };
    });

    const result = properties.map(p => {
        const pUnits = units.filter(u => u.property_id === p.id);
        const compteDetails = comptes.filter(c => c.actif).map(c => {
            const txns = transactions.filter(t => t.property_id === p.id && t.compte_id === c.id);
            const totalIn  = txns.filter(t => t.kind === 'IN').reduce((s, t) => s + t.amount, 0);
            const totalOut = txns.filter(t => t.kind === 'OUT').reduce((s, t) => s + t.amount, 0);
            const historique = txns.map(t => {
                const cat = categories.find(cat => cat.id === t.category_id) || {};
                const unit = t.unit_id ? units.find(u => u.id === t.unit_id) : null;
                return { ...t, category_name: cat.name || '?', unit_label: unit ? unit.label : null };
            }).sort((a, b) => a.date.localeCompare(b.date));

            let running = 0;
            const releve = historique.map(t => {
                running += t.kind === 'IN' ? t.amount : -t.amount;
                return { ...t, solde_apres: running };
            }).reverse();

            const parUnit = pUnits.map(u => {
                const uTxns = txns.filter(t => t.unit_id === u.id);
                const uIn  = uTxns.filter(t => t.kind === 'IN').reduce((s, t) => s + t.amount, 0);
                const uOut = uTxns.filter(t => t.kind === 'OUT').reduce((s, t) => s + t.amount, 0);
                return { id: u.id, label: u.label, total_in: uIn, total_out: uOut, net: uIn - uOut };
            });

            return {
                compte_id: c.id, compte_nom: c.nom, compte_type: c.type,
                total_in: totalIn, total_out: totalOut,
                releve, par_appartement: parUnit,
            };
        });

        const allTxns = transactions.filter(t => t.property_id === p.id);
        const totalIn  = allTxns.filter(t => t.kind === 'IN').reduce((s, t) => s + t.amount, 0);
        const totalOut = allTxns.filter(t => t.kind === 'OUT').reduce((s, t) => s + t.amount, 0);

        return {
            id: p.id, name: p.name, type: p.type,
            total_in: totalIn, total_out: totalOut,
            solde: totalIn - totalOut,
            comptes: compteDetails,
        };
    });

    return { comptes: comptesStats, properties: result };
}

// ── Finance (income-statement simplifie) ────────────────────────────────────
function buildFinance() {
    const totalIn = transactions.filter(t => t.kind === 'IN').reduce((s, t) => s + t.amount, 0);
    const totalOut = transactions.filter(t => t.kind === 'OUT').reduce((s, t) => s + t.amount, 0);

    const enriched = transactions.map(t => {
        const cat = categories.find(c => c.id === t.category_id) || {};
        const prop = properties.find(p => p.id === t.property_id) || {};
        const unit = t.unit_id ? units.find(u => u.id === t.unit_id) : null;
        return {
            ...t,
            category_name: cat.name || '?', category_kind: cat.kind || '?',
            property_name: prop.name || '?', unit_label: unit ? unit.label : null,
        };
    });

    const inLines = categories.filter(c => c.kind === 'IN').map(c => {
        const total = enriched.filter(t => t.category_id === c.id && t.kind === 'IN').reduce((s, t) => s + t.amount, 0);
        return { category_id: c.id, category_name: c.name, total, transactions: enriched.filter(t => t.category_id === c.id && t.kind === 'IN') };
    }).filter(l => l.total > 0);

    const outLines = categories.filter(c => c.kind === 'OUT').map(c => {
        const total = enriched.filter(t => t.category_id === c.id && t.kind === 'OUT').reduce((s, t) => s + t.amount, 0);
        return { category_id: c.id, category_name: c.name, total, transactions: enriched.filter(t => t.category_id === c.id && t.kind === 'OUT') };
    }).filter(l => l.total > 0);

    return {
        period: { from: `${now.getFullYear()}-01-01`, to: now.toISOString().slice(0, 10) },
        total_in: totalIn, total_out: totalOut, net: totalIn - totalOut,
        revenus: inLines, depenses: outLines,
    };
}

// ── Enrichissement pour les routes qui ajoutent property_name etc. ───────────
function enrichProperties() {
    return properties.map(p => ({
        ...p,
        unit_count: units.filter(u => u.property_id === p.id).length,
    })).reverse();
}

function enrichUnits() {
    return units.map(u => {
        const prop = properties.find(p => p.id === u.property_id);
        return { ...u, property_name: prop ? prop.name : '?' };
    }).sort((a, b) => a.label.localeCompare(b.label));
}

function enrichTransactions() {
    return transactions
        .map(t => {
            const cat = categories.find(c => c.id === t.category_id) || {};
            const prop = properties.find(p => p.id === t.property_id) || {};
            const unit = t.unit_id ? units.find(u => u.id === t.unit_id) : null;
            return {
                ...t,
                category_name: cat.name || '?',
                category_kind: cat.kind || '?',
                property_name: prop.name || '?',
                unit_label: unit ? unit.label : null,
            };
        })
        .sort((a, b) => b.date.localeCompare(a.date));
}

function enrichSejours() {
    return sejours.map(s => {
        const unit = units.find(u => u.id === s.unit_id) || {};
        const prop = properties.find(p => p.id === unit.property_id) || {};
        const loc = s.locataire_id ? locataires.find(l => l.id === s.locataire_id) : null;
        const totalDu = s.montant_total_du || s.montant;
        const paye = transactions.filter(t => t.sejour_id === s.id && t.kind === 'IN').reduce((sum, t) => sum + t.amount, 0);
        const solde = totalDu - paye;
        return {
            ...s,
            unit_label: unit.label || '?',
            property_name: prop.name || '?',
            locataire_nom: loc ? `${loc.prenom || ''} ${loc.nom}`.trim() : s.locataire,
            montant_total_du: totalDu,
            montant_paye: paye,
            solde_restant: Math.max(0, solde),
            statut_paiement: paye <= 0 ? 'EN_ATTENTE' : solde <= 0.01 ? 'SOLDE' : 'PARTIEL',
        };
    });
}

function enrichTravaux() {
    return travaux.map(t => {
        const prop = properties.find(p => p.id === t.property_id) || {};
        const unit = t.unit_id ? units.find(u => u.id === t.unit_id) : null;
        const txn = t.transaction_id ? transactions.find(tx => tx.id === t.transaction_id) : null;
        return {
            ...t,
            property_name: prop.name || '?',
            unit_label: unit ? unit.label : null,
            montant_txn: txn ? txn.amount : null,
        };
    });
}

function enrichCompteurs() {
    return compteurs.map(c => {
        const unit = units.find(u => u.id === c.unit_id) || {};
        const prop = properties.find(p => p.id === unit.property_id) || {};
        return {
            ...c,
            unit_label: unit.label || '?',
            property_name: prop.name || '?',
            property_id: unit.property_id || null,
        };
    });
}

function enrichNotes() {
    return notes.map(n => {
        const prop = n.property_id ? properties.find(p => p.id === n.property_id) : null;
        const unit = n.unit_id ? units.find(u => u.id === n.unit_id) : null;
        return {
            ...n,
            property_name: prop ? prop.name : null,
            unit_label: unit ? unit.label : null,
        };
    });
}

// ── Export : map route -> handler ────────────────────────────────────────────
// Les cles correspondent aux paths sous /api/ (sans le slash initial)
// Les valeurs sont soit des donnees statiques, soit des fonctions (appelees a chaque requete)
module.exports = {
    properties:   enrichProperties,
    units:        enrichUnits,
    locataires:   () => [...locataires].sort((a, b) => a.nom.localeCompare(b.nom)),
    sejours:      enrichSejours,
    transactions: enrichTransactions,
    comptes:      () => [...comptes].sort((a, b) => a.id - b.id),
    categories:   () => [...categories].sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name)),
    dashboard:    buildDashboard,
    caisse:       buildCaisse,
    travaux:      enrichTravaux,
    compteurs:    enrichCompteurs,
    notes:        enrichNotes,
    users:        () => users.map(u => ({ ...u, password: undefined })),
    activite:     () => activite,
    settings:     () => settings,
    finance:      buildFinance,
    paiements:    buildPaiements,
    search:       () => [],
};
