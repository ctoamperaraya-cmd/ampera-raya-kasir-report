import { BRANCHES, DENOMINATIONS, DENOM_VALUES } from '../constants';
import { fmt, n } from '../calc';

function ReviewSection({ title, icon, children }) {
  return (
    <div className="scard" style={{ marginBottom: 10 }}>
      <div className="scard-hdr">
        <span className="scard-icon">{icon}</span>
        <span className="scard-title">{title}</span>
      </div>
      {children}
    </div>
  );
}

function ReviewRow({ label, value, highlight }) {
  return (
    <div className={`field-row-inline ${highlight ? 'field-row-inline--gold' : ''}`} style={{ minHeight: 36 }}>
      <span className="field-label-inline" style={highlight ? { fontWeight: 700 } : {}}>{label}</span>
      <span className={highlight ? 'field-value-auto' : 'review-value'}>{value}</span>
    </div>
  );
}

export default function Step8({ form, derived, onSubmit, isSubmitting }) {
  const branch = BRANCHES.find(b => b.code === form.branch);
  const hasDiff = Math.abs(derived.diff_total_all) > 0.01;

  return (
    <div className="step-body">
      {hasDiff && (
        <div className="info-note info-note--warn" style={{ marginBottom: 0 }}>
          <span>⚠️</span>
          <span>Terdapat perbezaan antara Actual dan Hubbo sebanyak <strong>{fmt(Math.abs(derived.diff_total_all))}</strong>. Pastikan data sudah betul.</span>
        </div>
      )}

      <ReviewSection title="Maklumat Asas" icon="🏪">
        <ReviewRow label="Cawangan" value={branch ? `${branch.name} (${branch.code})` : '—'} />
        <ReviewRow label="Kasir" value={form.cashier_name || '—'} />
        <ReviewRow label="Tarikh" value={`${form.day}, ${form.date}`} />
      </ReviewSection>

      <ReviewSection title="Cash Income" icon="💵">
        {DENOMINATIONS.map(d => {
          const qty = form.denom_qty[d.key] || 0;
          if (qty === 0) return null;
          return (
            <ReviewRow key={d.key} label={`${d.label} × ${qty}`} value={fmt(qty * DENOM_VALUES[d.key])} />
          );
        })}
        <ReviewRow label="Total Cash (A)" value={fmt(derived.total_cash_a)} highlight />
        <ReviewRow label="(-) Float Hari Ini" value={fmt(derived.float_hari_ini)} />
        <ReviewRow label="Net Cash Bersih (AA)" value={fmt(derived.net_cash_aa)} highlight />
      </ReviewSection>

      {/* Section baru — Summary Bank In */}
      <ReviewSection title="Summary Bank In" icon="🏧">
        <ReviewRow label="Total Cash (A)" value={fmt(derived.total_cash_a)} highlight />
        <ReviewRow label="(-) Bank In Esok" value={fmt(n(form.bank_in_cash))} />
        <ReviewRow label="Float Esok (Cash Esok)" value={fmt(derived.float_cash_esok)} highlight />
      </ReviewSection>

      <ReviewSection title="QR & Transfer" icon="📲">
        <ReviewRow label="Transfer/Bank In" value={fmt(n(form.bank_in))} />
        <ReviewRow label="QR" value={fmt(n(form.qr_amount))} />
        <ReviewRow label="Total Transfer / QR (B)" value={fmt(derived.total_transfer_qr_b)} highlight />
      </ReviewSection>

      <ReviewSection title="Debit / Kredit" icon="💳">
        <ReviewRow label="VISA" value={fmt(n(form.visa))} />
        <ReviewRow label="Master Card" value={fmt(n(form.mastercard))} />
        <ReviewRow label="MyDebit" value={fmt(n(form.mydebit))} />
        <ReviewRow label="AMEX" value={fmt(n(form.amex))} />
        <ReviewRow label="Debit/Credit Total (D)" value={fmt(derived.debit_credit_total_d)} highlight />
      </ReviewSection>

      <ReviewSection title="Online Food" icon="🛵">
        <ReviewRow label="Grab Food" value={fmt(n(form.grab_food))} />
        <ReviewRow label="Panda Food" value={fmt(n(form.panda_food))} />
        <ReviewRow label="Shopee Food" value={fmt(n(form.shopee_food))} />
        <ReviewRow label="Total Other Income (C)" value={fmt(derived.total_other_income_c)} highlight />
      </ReviewSection>

      <ReviewSection title="Pengeluaran" icon="🧾">
        {form.expenses.filter(e => e.detail || n(e.amount) > 0).map((e, i) => (
          <ReviewRow key={e.id} label={e.detail || `Item ${i + 1}`} value={fmt(n(e.amount))} />
        ))}
        <ReviewRow label="Total Pengeluaran (E)" value={fmt(derived.total_expenses_e)} highlight />
      </ReviewSection>

      <div className="grand-preview grand-preview--final">
        <div className="grand-preview-row">
          <span>Total Income (Hubbo)</span>
          <span>{fmt(n(form.hubbo_total_income_all))}</span>
        </div>
        <div className="grand-preview-row">
          <span>(+) Online Food (C)</span>
          <span>{fmt(derived.total_other_income_c)}</span>
        </div>
        <div className="grand-preview-row grand-preview-row--total">
          <span>GRAND TOTAL</span>
          <span>{fmt(derived.grand_total)}</span>
        </div>
      </div>

      <button className="submit-btn" onClick={onSubmit} disabled={isSubmitting}>
        {isSubmitting ? '⏳ Menghantar...' : '✅ Hantar Laporan'}
      </button>

      <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--muted)', marginTop: 8, paddingBottom: 20 }}>
        PDF laporan akan dihantar ke Telegram anda selepas penghantaran berjaya.
      </p>
    </div>
  );
}