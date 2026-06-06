import { useState, useMemo, useEffect } from 'react';
import { INITIAL_FORM, STEPS, DAYS_MS } from './constants';
import { calcDerivedValues } from './calc';
import Step1 from './steps/Step1';
import Step2 from './steps/Step2';
import Step3 from './steps/Step3';
import Step4 from './steps/Step4';
import Step5 from './steps/Step5';
import Step6 from './steps/Step6';
import Step7 from './steps/Step7';
import Step8 from './steps/Step8';

const STEP_COMPONENTS = [Step1, Step2, Step3, Step4, Step5, Step6, Step7, Step8];

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_SECRET = import.meta.env.VITE_API_SECRET || '';

function validateStep(step, form, derived) {
  if (step === 1) {
    if (!form.branch) return 'Sila pilih cawangan';
    if (!form.cashier_name.trim()) return 'Sila masukkan nama kasir';
    if (!form.date) return 'Sila pilih tarikh';
  }
  if (step === 2) {
    if (derived.total_cash_a <= 0) return 'Masukkan sekurang-kurangnya satu pecahan wang';
    if (form.float_hari_ini === '') return 'Masukkan nilai Float Hari Ini';
  }
  return null;
}

export default function App() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(() => {
    // Baca data kasir dari URL params (dihantar oleh Bot)
    const params = new URLSearchParams(window.location.search);
    const branch = params.get('branch') || '';
    const name   = params.get('name') || '';
    const today  = new Date();
    return {
      ...INITIAL_FORM,
      branch,
      cashier_name: name,
      _cashier_id:  params.get('cashier_id') || '',
      _report_id:   params.get('report_id') || '',
      _is_edit:     params.get('edit') === '1',
    };
  });
  const [error, setError]           = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [submitError, setSubmitError] = useState('');

  const derived = useMemo(() => calcDerivedValues(form), [form]);

  // Telegram WebApp — beritahu supaya expand fullscreen
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }
  }, []);

  const goNext = () => {
    const err = validateStep(step, form, derived);
    if (err) { setError(err); return; }
    setError('');
    setStep(s => Math.min(s + 1, STEPS.length));
    window.scrollTo(0, 0);
  };

  const goPrev = () => {
    setError('');
    setStep(s => Math.max(s - 1, 1));
    window.scrollTo(0, 0);
  };

  const handleSubmit = async () => {
      const tgId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id ||
             new URLSearchParams(window.location.search).get('telegram_id') || '';
      // alert('DEBUG telegram_id: ' + tgId + '\nURL: ' + window.location.search);
  console.log('DEBUG telegram_id:', tgId);
  console.log('DEBUG URL params:', window.location.search);
  console.log('DEBUG Telegram WebApp:', window.Telegram?.WebApp?.initDataUnsafe);
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const isEdit   = form._is_edit && form._report_id;
      const endpoint = isEdit
        ? `${API_URL}/api/reports/${form._report_id}`
        : `${API_URL}/api/reports`;


      
      const res = await fetch(endpoint, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: {
          'Content-Type':  'application/json',
          'x-bot-secret':  API_SECRET,
        },
        
        body: JSON.stringify({
          cashier_id:  form._cashier_id,
          telegram_id: tgId,
          // telegram_id: window.Telegram?.WebApp?.initDataUnsafe?.user?.id ||
          // new URLSearchParams(window.location.search).get('telegram_id') || '',
          
          form: {
            branch:       form.branch,
            day:          form.day,
            date:         form.date,
            cashier_name: form.cashier_name,
            denom_qty:    form.denom_qty,
            float_hari_ini: form.float_hari_ini,
            bank_in:      form.bank_in,
            bank_in_cash: form.bank_in_cash,
            qr_amount:    form.qr_amount,
            visa:         form.visa,
            mastercard:   form.mastercard,
            mydebit:      form.mydebit,
            amex:         form.amex,
            grab_food:    form.grab_food,
            panda_food:   form.panda_food,
            shopee_food:  form.shopee_food,
            expenses:     form.expenses,
            hubbo_net_cash:         form.hubbo_net_cash,
            hubbo_pengeluaran:      form.hubbo_pengeluaran,
            hubbo_qr_transfer:      form.hubbo_qr_transfer,
            hubbo_debit_credit:     form.hubbo_debit_credit,
            hubbo_total_income_all: form.hubbo_total_income_all,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error || 'Ralat tidak diketahui. Cuba semula.');
        setIsSubmitting(false);
        return;
      }

      setSubmitted(true);

      // Tutup Mini App selepas 3 saat
      setTimeout(() => {
        window.Telegram?.WebApp?.close();
      }, 3000);

    } catch (err) {
      setSubmitError('Gagal menyambung ke server. Semak sambungan internet anda.');
      setIsSubmitting(false);
    }
  };

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;
  const StepComp = STEP_COMPONENTS[step - 1];
  const currentStepInfo = STEPS[step - 1];

  if (submitted) {
    return (
      <div className="app-shell">
        <div className="success-screen">
          <div className="success-icon">✅</div>
          <h2 className="success-title">Laporan Berjaya Dihantar!</h2>
          <p className="success-sub">PDF laporan sedang dijana dan akan dihantar ke Telegram anda dalam beberapa saat.</p>
          <div className="success-detail">
            <div className="success-row"><span>Cawangan</span><span>{form.branch}</span></div>
            <div className="success-row"><span>Tarikh</span><span>{form.date}</span></div>
            <div className="success-row">
              <span>Grand Total</span>
              <span style={{ fontWeight: 700, color: 'var(--gold)' }}>RM {derived.grand_total.toFixed(2)}</span>
            </div>
          </div>
          <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 12 }}>Tetingkap ini akan ditutup secara automatik...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="topbar-left">
          {step > 1 && <button className="back-btn" onClick={goPrev}>←</button>}
          <div>
            <div className="topbar-title">Laporan Kasir Harian</div>
            <div className="topbar-sub">Ampera Raya — {currentStepInfo.icon} {currentStepInfo.label}</div>
          </div>
        </div>
        <div className="step-chip">{step}/{STEPS.length}</div>
      </div>

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="step-tabs">
        {STEPS.map(s => (
          <button
            key={s.id}
            className={`step-tab ${step === s.id ? 'active' : ''} ${step > s.id ? 'done' : ''}`}
            onClick={() => step > s.id && setStep(s.id)}
          >
            <span>{step > s.id ? '✓' : s.icon}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="error-banner"><span>⚠️</span> {error}</div>
      )}

      {submitError && (
        <div className="error-banner"><span>❌</span> {submitError}</div>
      )}

      <div className="form-scroll">
        <StepComp
          form={form}
          setForm={setForm}
          derived={derived}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </div>

      {step < STEPS.length && (
        <div className="bottom-nav">
          <button className="btn-primary" onClick={goNext}>
            {step === STEPS.length - 1 ? '👀 Semak Laporan' : 'Seterusnya →'}
          </button>
        </div>
      )}
    </div>
  );
}
