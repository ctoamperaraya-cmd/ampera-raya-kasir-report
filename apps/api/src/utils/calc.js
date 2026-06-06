const DENOM_VALUES = {
  rm100: 100, rm50: 50, rm20: 20, rm10: 10, rm5: 5,
  rm1: 1, rm050: 0.5, rm020: 0.2, rm010: 0.1, rm005: 0.05,
};

const n = (v) => parseFloat(v) || 0;

function calcDerived(form) {
  const total_cash_a = Object.entries(form.denom_qty || {}).reduce(
    (sum, [key, qty]) => sum + (n(qty) * (DENOM_VALUES[key] || 0)), 0
  );
  const float_hari_ini     = n(form.float_hari_ini);
  const net_cash_aa        = total_cash_a - float_hari_ini;
  const total_transfer_qr_b = n(form.bank_in) + n(form.qr_amount);
  const debit_credit_total_d = n(form.visa) + n(form.mastercard) + n(form.mydebit) + n(form.amex);
  const total_other_income_c = n(form.grab_food) + n(form.panda_food) + n(form.shopee_food);
  const total_expenses_e   = (form.expenses || []).reduce((s, e) => s + n(e.amount), 0);
  const cash_sales_actual  = net_cash_aa + total_expenses_e;
  const total_income_actual = cash_sales_actual + total_transfer_qr_b + debit_credit_total_d;
  const total_income_all_actual = total_income_actual + total_other_income_c;
  // const float_cash_esok    = total_cash_a - n(form.bank_in);
  const float_cash_esok = total_cash_a - n(form.bank_in_cash);
  // const grand_total        = hubbo_total_income + total_other_income_c;

  // Hubbo
  const hubbo_net_cash     = n(form.hubbo_net_cash);
  const hubbo_pengeluaran  = n(form.hubbo_pengeluaran);
  const hubbo_cash_sales   = hubbo_net_cash + hubbo_pengeluaran;
  const hubbo_qr           = n(form.hubbo_qr_transfer);
  const hubbo_dc           = n(form.hubbo_debit_credit);
  const hubbo_total_income = hubbo_cash_sales + hubbo_qr + hubbo_dc;
  const grand_total = hubbo_total_income + total_other_income_c;

  return {
    total_cash_a,
    float_hari_ini,
    net_cash_aa,
    total_transfer_qr_b,
    debit_credit_total_d,
    total_other_income_c,
    total_expenses_e,
    cash_sales_actual,
    total_income_actual,
    total_income_all_actual,
    float_cash_esok,
    grand_total,
    hubbo_cash_sales,
    hubbo_total_income,
    diff_net_cash:    net_cash_aa - hubbo_net_cash,
    diff_pengeluaran: total_expenses_e - hubbo_pengeluaran,
    diff_cash_sales:  cash_sales_actual - hubbo_cash_sales,
    diff_qr:          total_transfer_qr_b - hubbo_qr,
    diff_dc:          debit_credit_total_d - hubbo_dc,
    diff_total_income: total_income_actual - hubbo_total_income,
    diff_total_all:   total_income_actual - hubbo_total_income,
  };
}

const fmt = (v) => 'RM ' + n(v).toLocaleString('en-MY', {
  minimumFractionDigits: 2, maximumFractionDigits: 2
});

module.exports = { calcDerived, fmt, n };
