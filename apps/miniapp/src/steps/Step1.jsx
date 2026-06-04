import { BRANCHES, DAYS_MS } from '../constants';

export default function Step1({ form, setForm }) {
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="step-body">
      <div className="scard">
        <div className="scard-hdr">
          <span className="scard-icon">🏪</span>
          <span className="scard-title">Maklumat Asas Laporan</span>
        </div>

        <div className="field-group">
          <label className="field-label">Cawangan</label>
          <select
            className="field-select"
            value={form.branch}
            onChange={e => update('branch', e.target.value)}
          >
            <option value="">-- Pilih Cawangan --</option>
            {BRANCHES.map(b => (
              <option key={b.code} value={b.code}>{b.name} ({b.code})</option>
            ))}
          </select>
        </div>

        <div className="field-group">
          <label className="field-label">Nama Kasir</label>
          <input
            className="field-input"
            type="text"
            placeholder="Nama penuh kasir"
            value={form.cashier_name}
            onChange={e => update('cashier_name', e.target.value)}
          />
        </div>

        <div className="field-row-2">
          <div className="field-group">
            <label className="field-label">Tarikh</label>
            <input
              className="field-input"
              type="date"
              value={form.date}
              onChange={e => {
                const d = new Date(e.target.value);
                update('date', e.target.value);
                update('day', DAYS_MS[d.getDay()]);
              }}
            />
          </div>
          <div className="field-group">
            <label className="field-label">Hari</label>
            <input
              className="field-input"
              type="text"
              value={form.day}
              readOnly
              style={{ background: 'var(--bg)', color: 'var(--muted)' }}
            />
          </div>
        </div>
      </div>

      <div className="info-note info-note--info">
        <span>💡</span>
        <span>Pastikan nama kasir dan cawangan betul sebelum meneruskan. Data ini akan tertera dalam laporan PDF.</span>
      </div>
    </div>
  );
}
