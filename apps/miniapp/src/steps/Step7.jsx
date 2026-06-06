import { fmt, fmtNum, n } from '../calc';

function DiffBadge({ diff }) {
  if (diff === 0) return <span className="diff-badge diff-ok">✓ Sama</span>;
  const sign = diff > 0 ? '+' : '';
  return (
    <span className={`diff-badge ${diff < 0 ? 'diff-neg' : 'diff-pos'}`}>
      {sign}{fmtNum(diff)}
    </span>
  );
}

function SummaryRow({ label, actual, hubboValue, diff, isInput, onChange }) {
  return (
    <div className="hubbo-row">
      <span className="hubbo-label">{label}</span>
      <span className="hubbo-actual">{fmt(actual)}</span>
      {isInput ? (
        <div className="amount-input-wrap" style={{ width: 90 }}>
          <span className="amount-prefix" style={{ fontSize: 10 }}>RM</span>
          <input
            className="amount-input"
            style={{ fontSize: 11, width: 68 }}
            type="number" min="0" step="0.01" placeholder="0.00"
            value={hubboValue}
            onChange={e => onChange(e.target.value)}
          />
        </div>
      ) : (
        <span className="hubbo-system">{fmt(n(hubboValue))}</span>
      )}
      <DiffBadge diff={diff} />
    </div>
  );
}

export default function Step7({ form, setForm, derived }) {
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const rows = [
    {
      label: 'Net Cash / Cash Bersih (AA)',
      actual: derived.net_cash_aa,
      key: 'hubbo_net_cash',
      diff: derived.diff_net_cash,
    },
    {
      label: '(+) Pengeluaran Cashier (E)',
      actual: derived.total_expenses_e,
      key: 'hubbo_pengeluaran',
      diff: derived.diff_pengeluaran,
    },
    {
      label: 'Cash Sales',
      actual: derived.cash_sales_actual,
      key: null,
      diff: derived.diff_cash_sales,
      autoValue: derived.hubbo_cash_sales,
    },
    {
      label: '(+) QR & Transfer (B)',
      actual: derived.total_transfer_qr_b,
      key: 'hubbo_qr_transfer',
      diff: derived.diff_qr,
    },
    {
      label: '(+) Debit/Credit (D)',
      actual: derived.debit_credit_total_d,
      key: 'hubbo_debit_credit',
      diff: derived.diff_dc,
    },
    {
      label: 'Total Income',
      actual: derived.total_income_actual,
      key: null,
      diff: derived.diff_total_income,
      autoValue: derived.hubbo_total_income,
    },
  ];

  return (
    <div className="step-body">
      <div className="info-note info-note--info" style={{ marginBottom: 10 }}>
        <span>🔍</span>
        <span>Masukkan angka dari sistem <strong>Hubbo</strong> untuk setiap baris. Sistem akan kira perbezaan (diff) secara automatik.</span>
      </div>

      <div className="scard">
        <div className="scard-hdr">
          <span className="scard-icon">📊</span>
          <span className="scard-title">Summary Sales — Semakan Hubbo</span>
        </div>

        <div className="hubbo-thead">
          <span className="hubbo-label" style={{ fontWeight: 700 }}>Keterangan</span>
          <span className="hubbo-actual" style={{ fontWeight: 700 }}>Actual</span>
          <span style={{ width: 90, textAlign: 'right', fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Hubbo</span>
          <span style={{ width: 70, textAlign: 'right', fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Diff</span>
        </div>

        {rows.map(r => (
          <SummaryRow
            key={r.label}
            label={r.label}
            actual={r.actual}
            hubboValue={r.key ? form[r.key] : r.autoValue}
            diff={r.diff}
            isInput={!!r.key}
            onChange={r.key ? (v => update(r.key, v)) : null}
          />
        ))}
      </div>

      <div className="grand-preview">
        <div className="grand-preview-row">
          <span>Total Income</span>
          <span>{fmt(derived.hubbo_total_income)}</span>
        </div>
        <div className="grand-preview-row">
          <span>Online Food (C)</span>
          <span>{fmt(derived.total_other_income_c)}</span>
        </div>
        <div className="grand-preview-row grand-preview-row--total">
          <span>GRAND TOTAL</span>
          <span>{fmt(derived.grand_total)}</span>
        </div>
      </div>
    </div>
  );
}
