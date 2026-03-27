// db.js — seed default categories on first run
const { load, save } = require('./store');

const data = load();

if (data.categories.length === 0) {
  const now = new Date().toISOString();
  let id = 1;
  const defaults = [
    { name: 'Rent', kind: 'IN' },
    { name: 'Other Income', kind: 'IN' },
    { name: 'Maintenance', kind: 'OUT' },
    { name: 'Salary', kind: 'OUT' },
    { name: 'Utilities', kind: 'OUT' },
    { name: 'Insurance', kind: 'OUT' },
    { name: 'Taxes', kind: 'OUT' },
  ];
  data.categories = defaults.map(c => ({ id: id++, ...c, created_at: now }));
  data._seq = { ...data._seq, categories: id - 1 };
  save(data);
  console.log('✅  Seeded default categories');
}

module.exports = { load, save };
