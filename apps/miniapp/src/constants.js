export const BRANCHES = [
  { code: 'KW',   name: 'Kota Warisan' },
  { code: 'KJ',   name: 'Taman Putra Kajang' },
  { code: 'S13',  name: 'Shah Alam Seksyen 13' },
  { code: 'S7',   name: 'Shah Alam Seksyen 7' },
  { code: 'KLTS', name: 'Plaza KLTS' },
  { code: 'KD',   name: 'Kota Damansara' },
  { code: 'TTDI', name: 'TTDI' },
];

export const DENOMINATIONS = [
  { key: 'rm100', label: 'RM 100' },
  { key: 'rm50',  label: 'RM 50' },
  { key: 'rm20',  label: 'RM 20' },
  { key: 'rm10',  label: 'RM 10' },
  { key: 'rm5',   label: 'RM 5' },
  { key: 'rm1',   label: 'RM 1' },
  { key: 'rm050', label: 'RM 0.50' },
  { key: 'rm020', label: 'RM 0.20' },
  { key: 'rm010', label: 'RM 0.10' },
  { key: 'rm005', label: 'RM 0.05' },
];

export const DENOM_VALUES = {
  rm100: 100, rm50: 50, rm20: 20, rm10: 10, rm5: 5,
  rm1: 1, rm050: 0.5, rm020: 0.2, rm010: 0.1, rm005: 0.05,
};

export const DAYS_MS = ['Ahad','Isnin','Selasa','Rabu','Khamis','Jumaat','Sabtu'];

export const INITIAL_FORM = {
  // Step 1
  branch: '',
  cashier_name: '',
  date: new Date().toISOString().slice(0, 10),
  day: DAYS_MS[new Date().getDay()],

  // Step 2 — Cash Income
  denom_qty: { rm100:0, rm50:0, rm20:0, rm10:0, rm5:0, rm1:0, rm050:0, rm020:0, rm010:0, rm005:0 },
  float_hari_ini: '',
  bank_in_cash: '',  

  // Step 3 — QR & Transfer
  bank_in: '',
  qr_amount: '',

  // Step 4 — Debit / Credit
  visa: '',
  mastercard: '',
  mydebit: '',
  amex: '',

  // Step 5 — Other Income
  grab_food: '',
  panda_food: '',
  shopee_food: '',

  // Step 6 — Pengeluaran Kasir (dynamic rows)
  expenses: [{ id: 1, detail: '', note: '', amount: '' }],

  // Step 7 — Summary Sales (Hubbo)
  hubbo_net_cash: '',
  hubbo_pengeluaran: '',
  hubbo_qr_transfer: '',
  hubbo_debit_credit: '',
  hubbo_total_income_all: '',
};

export const STEPS = [
  { id: 1, label: 'Info Asas',       icon: '🏪' },
  { id: 2, label: 'Duit Tunai',      icon: '💵' },
  { id: 3, label: 'QR & Transfer',   icon: '📲' },
  { id: 4, label: 'Debit / Kredit',  icon: '💳' },
  { id: 5, label: 'Pendapatan Lain', icon: '🛵' },
  { id: 6, label: 'Pengeluaran',     icon: '🧾' },
  { id: 7, label: 'Semakan Hubbo',   icon: '🔍' },
  { id: 8, label: 'Semak & Hantar',  icon: '✅' },
];
