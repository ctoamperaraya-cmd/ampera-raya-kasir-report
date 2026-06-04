import { fmt } from '../calc';

const PLATFORMS = [
  { key: 'grab_food',   label: 'Grab Food',   icon: '🟢', color: '#00B14F' },
  { key: 'panda_food',  label: 'Panda Food',  icon: '🐼', color: '#D70F64' },
  { key: 'shopee_food', label: 'Shopee Food', icon: '🟠', color: '#EE4D2D' },
];

export default function Step5({ form, setForm, derived }) {
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="step-body">
      <div className="scard">
        <div className="scard-hdr">
          <span className="scard-icon">🛵</span>
          <span className="scard-title">Other Income / Pendapatan Platform</span>
        </div>

        {PLATFORMS.map(p => (
          <div className="field-row-inline" key={p.key}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <div
                className="platform-dot"
                style={{ background: p.color }}
              >
                {p.icon}
              </div>
              <span className="field-label-inline" style={{ marginBottom: 0 }}>{p.label}</span>
            </div>
            <div className="amount-input-wrap">
              <span className="amount-prefix">RM</span>
              <input
                className="amount-input"
                type="number" min="0" step="0.01" placeholder="0.00"
                value={form[p.key]}
                onChange={e => update(p.key, e.target.value)}
              />
            </div>
          </div>
        ))}

        <div className="field-row-inline field-row-inline--gold">
          <span className="field-label-inline" style={{ fontWeight: 700 }}>Total Other Income (C)</span>
          <span className="field-value-auto">{fmt(derived.total_other_income_c)}</span>
        </div>
      </div>

      <div className="info-note info-note--info">
        <span>💡</span>
        <span>Masukkan jumlah yang diterima dari setiap platform penghantaran. Masukkan 0.00 jika tiada.</span>
      </div>
    </div>
  );
}
