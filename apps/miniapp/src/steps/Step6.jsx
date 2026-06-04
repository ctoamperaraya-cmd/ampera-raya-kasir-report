import { fmt, n } from '../calc';

export default function Step6({ form, setForm, derived }) {
  const updateExpense = (id, field, value) => {
    setForm(f => ({
      ...f,
      expenses: f.expenses.map(e => e.id === id ? { ...e, [field]: value } : e)
    }));
  };

  const addExpense = () => {
    setForm(f => ({
      ...f,
      expenses: [...f.expenses, { id: Date.now(), detail: '', note: '', amount: '' }]
    }));
  };

  const removeExpense = (id) => {
    setForm(f => ({
      ...f,
      expenses: f.expenses.filter(e => e.id !== id)
    }));
  };

  return (
    <div className="step-body">
      <div className="scard">
        <div className="scard-hdr">
          <span className="scard-icon">🧾</span>
          <span className="scard-title">Pengeluaran Cashier</span>
        </div>

        {form.expenses.length === 0 && (
          <div style={{ padding: '16px 14px', textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
            Tiada pengeluaran. Tekan + untuk tambah.
          </div>
        )}

        {form.expenses.map((exp, idx) => (
          <div className="expense-item" key={exp.id}>
            <div className="expense-num">#{idx + 1}</div>
            <div className="expense-fields">
              <input
                className="field-input"
                type="text"
                placeholder="Detail pengeluaran..."
                value={exp.detail}
                onChange={e => updateExpense(exp.id, 'detail', e.target.value)}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  className="field-input"
                  type="text"
                  placeholder="Nota (opsional)"
                  value={exp.note}
                  style={{ flex: 1 }}
                  onChange={e => updateExpense(exp.id, 'note', e.target.value)}
                />
                <div className="amount-input-wrap" style={{ width: 100 }}>
                  <span className="amount-prefix">RM</span>
                  <input
                    className="amount-input"
                    type="number" min="0" step="0.01" placeholder="0.00"
                    value={exp.amount}
                    onChange={e => updateExpense(exp.id, 'amount', e.target.value)}
                  />
                </div>
              </div>
            </div>
            {form.expenses.length > 1 && (
              <button className="expense-del" onClick={() => removeExpense(exp.id)}>✕</button>
            )}
          </div>
        ))}

        <button className="add-row-btn" onClick={addExpense}>
          + Tambah Pengeluaran
        </button>

        <div className="field-row-inline field-row-inline--gold" style={{ margin: '0 0 0 0' }}>
          <span className="field-label-inline" style={{ fontWeight: 700 }}>Total Pengeluaran (E)</span>
          <span className="field-value-auto">{fmt(derived.total_expenses_e)}</span>
        </div>
      </div>

      <div className="info-note info-note--warn">
        <span>⚠️</span>
        <span>Sertakan semua perbelanjaan tunai yang dibuat hari ini beserta resit. Pengeluaran tanpa resit mungkin tidak diterima.</span>
      </div>
    </div>
  );
}
