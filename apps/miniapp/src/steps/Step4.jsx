import { fmt } from '../calc';

const CARDS = [
  { key: 'visa',       label: 'VISA',        color: '#1A1F71', bg: '#E8EAFF' },
  { key: 'mastercard', label: 'Master Card',  color: '#EB001B', bg: '#FFE8E8' },
  { key: 'mydebit',    label: 'MyDebit',      color: '#006B3F', bg: '#E0F5EC' },
  { key: 'amex',       label: 'AMEX',         color: '#016FD0', bg: '#E0F0FF' },
];

export default function Step4({ form, setForm, derived }) {
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="step-body">
      <div className="scard">
        <div className="scard-hdr">
          <span className="scard-icon">💳</span>
          <span className="scard-title">Debit / Kredit Payment</span>
        </div>

        {CARDS.map(card => (
          <div className="field-row-inline" key={card.key}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <div className="card-badge" style={{ background: card.bg, color: card.color }}>
                {card.label}
              </div>
            </div>
            <div className="amount-input-wrap">
              <span className="amount-prefix">RM</span>
              <input
                className="amount-input"
                type="number" min="0" step="0.01" placeholder="0.00"
                value={form[card.key]}
                onChange={e => update(card.key, e.target.value)}
              />
            </div>
          </div>
        ))}

        <div className="field-row-inline field-row-inline--gold">
          <span className="field-label-inline" style={{ fontWeight: 700 }}>Debit/Credit Total (D)</span>
          <span className="field-value-auto">{fmt(derived.debit_credit_total_d)}</span>
        </div>
      </div>

      <div className="info-note info-note--warn">
        <span>⚠️</span>
        <span>Rujuk Settlement Report dari terminal untuk setiap jenis kad. Masukkan 0.00 jika tiada transaksi.</span>
      </div>
    </div>
  );
}
