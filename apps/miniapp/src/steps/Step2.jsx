import { DENOMINATIONS, DENOM_VALUES } from '../constants';
import { n, fmt, fmtNum } from '../calc';

export default function Step2({ form, setForm, derived }) {
  const updateQty = (key, val) => {
    setForm(f => ({
      ...f,
      denom_qty: { ...f.denom_qty, [key]: val === '' ? 0 : parseInt(val) || 0 }
    }));
  };

  return (
    <div className="step-body">
      <div className="scard">
        <div className="scard-hdr">
          <span className="scard-icon">💵</span>
          <span className="scard-title">Cash Income / Duit Cashier</span>
        </div>

        <div className="denom-thead">
          <span style={{ flex: 1 }}>Pecahan</span>
          <span className="denom-th-qty">Kuantiti</span>
          <span className="denom-th-total">Jumlah (RM)</span>
        </div>

        {DENOMINATIONS.map(d => {
          const qty = form.denom_qty[d.key] || 0;
          const rowTotal = qty * DENOM_VALUES[d.key];
          return (
            <div className="denom-row" key={d.key}>
              <div className="denom-pill">{d.label}</div>
              <input
                className="denom-input"
                type="number"
                min="0"
                value={qty === 0 ? '' : qty}
                placeholder="0"
                onChange={e => updateQty(d.key, e.target.value)}
              />
              <span className="denom-total">
                {rowTotal > 0 ? fmtNum(rowTotal) : '—'}
              </span>
            </div>
          );
        })}

        <div className="denom-row denom-row--total">
          <span style={{ flex: 1, fontSize: 12, fontWeight: 700 }}>Total Cash (A)</span>
          <span className="denom-total-big">{fmt(derived.total_cash_a)}</span>
        </div>
      </div>

      <div className="scard">
        <div className="scard-hdr">
          <span className="scard-icon">🏦</span>
          <span className="scard-title">Float & Cash Bersih</span>
        </div>

        <div className="field-row-inline">
          <span className="field-label-inline">(-) Float (Hari Ini)</span>
          <div className="amount-input-wrap">
            <span className="amount-prefix">RM</span>
            <input
              className="amount-input"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.float_hari_ini}
              onChange={e => setForm(f => ({ ...f, float_hari_ini: e.target.value }))}
            />
          </div>
        </div>

        <div className="field-row-inline field-row-inline--gold">
          <span className="field-label-inline" style={{ fontWeight: 700 }}>Net Cash / Cash Bersih (AA)</span>
          <span className="field-value-auto">{fmt(derived.net_cash_aa)}</span>
        </div>
      </div>

      {/* Section baru — Summary Bank In */}
      <div className="scard">
        <div className="scard-hdr">
          <span className="scard-icon">🏧</span>
          <span className="scard-title">Summary Bank In</span>
        </div>

        <div className="field-row-inline field-row-inline--gold">
          <span className="field-label-inline" style={{ fontWeight: 700 }}>Total Cash (A)</span>
          <span className="field-value-auto">{fmt(derived.total_cash_a)}</span>
        </div>

        <div className="field-row-inline">
          <span className="field-label-inline">(-) Bank In Esok</span>
          <div className="amount-input-wrap">
            <span className="amount-prefix">RM</span>
            <input
              className="amount-input"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.bank_in_cash}
              onChange={e => setForm(f => ({ ...f, bank_in_cash: e.target.value }))}
            />
          </div>
        </div>

        <div className="field-row-inline field-row-inline--gold">
          <span className="field-label-inline" style={{ fontWeight: 700 }}>Float Esok (Cash Esok)</span>
          <span className="field-value-auto">{fmt(derived.float_cash_esok)}</span>
        </div>
      </div>
    </div>
  );
}