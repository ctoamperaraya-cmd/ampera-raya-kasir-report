import { fmt } from '../calc';

export default function Step3({ form, setForm, derived }) {
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="step-body">
      <div className="scard">
        <div className="scard-hdr">
          <span className="scard-icon">📲</span>
          <span className="scard-title">QR & Transfer Payment</span>
        </div>

        <div className="field-row-inline">
          <span className="field-label-inline">Transfer/Bank In</span>
          <div className="amount-input-wrap">
            <span className="amount-prefix">RM</span>
            <input
              className="amount-input"
              type="number" min="0" step="0.01" placeholder="0.00"
              value={form.bank_in}
              onChange={e => update('bank_in', e.target.value)}
            />
          </div>
        </div>

        <div className="field-row-inline">
          <span className="field-label-inline">QR</span>
          <div className="amount-input-wrap">
            <span className="amount-prefix">RM</span>
            <input
              className="amount-input"
              type="number" min="0" step="0.01" placeholder="0.00"
              value={form.qr_amount}
              onChange={e => update('qr_amount', e.target.value)}
            />
          </div>
        </div>

        <div className="field-row-inline field-row-inline--gold">
          <span className="field-label-inline" style={{ fontWeight: 700 }}>Total Transfer / QR (B)</span>
          <span className="field-value-auto">{fmt(derived.total_transfer_qr_b)}</span>
        </div>
      </div>

      <div className="info-note info-note--info">
        <span>💡</span>
        <span>Masukkan jumlah keseluruhan Transfer/Bank In dan QR untuk hari ini. Lampirkan slip/bukti jika diperlukan.</span>
      </div>
    </div>
  );
}
