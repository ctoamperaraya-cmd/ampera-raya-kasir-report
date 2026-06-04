import { DENOM_VALUES } from './constants';

export const n = (v) => parseFloat(v) || 0;

export const fmt = (v) => {
  const num = n(v);
  return 'RM ' + num.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const fmtNum = (v) => {
  const num = n(v);
  return num.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export function calcDerivedValues(form) {
  // Step 2
  const total_cash_a = Object.entries(form.denom_qty).reduce(
    (sum, [key, qty]) => sum + (n(qty) * DENOM_VALUES[key]), 0
  );
  const float_hari_ini = n(form.float_hari_ini);
  const net_cash_aa = total_cash_a - float_hari_ini;

  // Step 3
  const total_transfer_qr_b = n(form.bank_in) + n(form.qr_amount);

  // Step 4
  const debit_credit_total_d = n(form.visa) + n(form.mastercard) + n(form.mydebit) + n(form.amex);

  // Step 5
  const total_other_income_c = n(form.grab_food) + n(form.panda_food) + n(form.shopee_food);

  // Step 6
  const total_expenses_e = form.expenses.reduce((sum, e) => sum + n(e.amount), 0);

  // Summary Sales — Actual
  const cash_sales_actual = net_cash_aa + total_expenses_e;
  const total_income_actual = cash_sales_actual + total_transfer_qr_b + debit_credit_total_d;
  const total_income_all_actual = total_income_actual + total_other_income_c;

  // Summary Bank In
  // const float_cash_esok = total_cash_a - n(form.bank_in);
  const float_cash_esok = total_cash_a - n(form.bank_in_cash);

  // Grand Total
  const grand_total = n(form.hubbo_total_income_all) + total_other_income_c;

  // Hubbo — System column
  const hubbo_net_cash = n(form.hubbo_net_cash);
  const hubbo_pengeluaran = n(form.hubbo_pengeluaran);
  const hubbo_cash_sales = hubbo_net_cash + hubbo_pengeluaran;
  const hubbo_qr = n(form.hubbo_qr_transfer);
  const hubbo_dc = n(form.hubbo_debit_credit);
  const hubbo_total_income = hubbo_cash_sales + hubbo_qr + hubbo_dc;
  const hubbo_total_all = n(form.hubbo_total_income_all);

  // Diff (Actual - Hubbo) — negative means actual lebih rendah
  const diff_net_cash = net_cash_aa - hubbo_net_cash;
  const diff_pengeluaran = total_expenses_e - hubbo_pengeluaran;
  const diff_cash_sales = cash_sales_actual - hubbo_cash_sales;
  const diff_qr = total_transfer_qr_b - hubbo_qr;
  const diff_dc = debit_credit_total_d - hubbo_dc;
  const diff_total_income = total_income_actual - hubbo_total_income;
  const diff_total_all = total_income_all_actual - hubbo_total_all;

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
    diff_net_cash,
    diff_pengeluaran,
    diff_cash_sales,
    diff_qr,
    diff_dc,
    diff_total_income,
    diff_total_all,
  };
}
