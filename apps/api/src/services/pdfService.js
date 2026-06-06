const puppeteer = require('puppeteer');
const supabase  = require('../utils/supabase');
const { fmt, n } = require('../utils/calc');
const dayjs = require('dayjs');

const BRANCH_NAMES = {
  KW:   'Kota Warisan',
  KJ:   'Taman Putra Kajang',
  S13:  'Shah Alam Seksyen 13',
  S7:   'Shah Alam Seksyen 7',
  KLTS: 'Plaza KLTS',
  KD:   'Kota Damansara',
  TTDI: 'TTDI',
};

const DENOM_LABELS = {
  rm100: 'RM 100', rm50: 'RM 50', rm20: 'RM 20', rm10: 'RM 10', rm5: 'RM 5',
  rm1: 'RM 1', rm050: 'RM 0.50', rm020: 'RM 0.20', rm010: 'RM 0.10', rm005: 'RM 0.05',
};

const DENOM_VALUES = {
  rm100: 100, rm50: 50, rm20: 20, rm10: 10, rm5: 5,
  rm1: 1, rm050: 0.5, rm020: 0.2, rm010: 0.1, rm005: 0.05,
};

function diffClass(val) {
  if (Math.abs(val) < 0.01) return 'ok';
  return val < 0 ? 'neg' : 'pos';
}

function diffLabel(val) {
  if (Math.abs(val) < 0.01) return '—';
  const sign = val > 0 ? '+' : '';
  return sign + n(val).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function generateHTML(report) {
  const dq = report.denom_qty || {};
  const expenses = report.expenses || [];
  const branchName = BRANCH_NAMES[report.branch_code] || report.branch_code;
  const reportDate = dayjs(report.report_date).format('DD/MM/YYYY');

  const DENOM_ORDER = ['rm100','rm50','rm20','rm10','rm5','rm1','rm050','rm020','rm010','rm005'];
  const denomRows = DENOM_ORDER
    .filter(key => n(dq[key]) > 0)
    .map(key => { const qty = dq[key];
      const total = n(qty) * (DENOM_VALUES[key] || 0);
      return `<tr>
        <td>${DENOM_LABELS[key] || key}</td>
        <td class="num">${qty}</td>
        <td class="num">${n(total).toFixed(2)}</td>
      </tr>`;
    }).join('');

  const expenseRows = expenses
    .filter(e => e.detail || n(e.amount) > 0)
    .map(e => `<tr>
      <td>${e.detail || '—'}</td>
      <td>${e.note || ''}</td>
      <td class="num">${n(e.amount).toFixed(2)}</td>
    </tr>`).join('');

  const hubbo_total_income = n(report.hubbo_net_cash)+n(report.hubbo_pengeluaran)+n(report.hubbo_qr_transfer)+n(report.hubbo_debit_credit);
  const actual_total_income_all = n(report.total_income_actual) + n(report.total_other_income_c);
  const hubbo_total_income_all = hubbo_total_income + n(report.total_other_income_c);
  const summaryRows = [
    [false, 'Net Cash / Cash Bersih (AA)', report.net_cash_aa, report.hubbo_net_cash, report.diff_net_cash],
    [false, '(+) Pengeluaran Cashier (E)', report.total_expenses_e, report.hubbo_pengeluaran, report.diff_pengeluaran],
    [true,  'Cash Sales', report.cash_sales_actual, n(report.hubbo_net_cash) + n(report.hubbo_pengeluaran), report.diff_cash_sales],
    [false, '(+) QR & Transfer (B)', report.total_transfer_qr_b, report.hubbo_qr_transfer, report.diff_qr],
    [false, '(+) Debit/Credit Income (D)', report.debit_credit_total_d, report.hubbo_debit_credit, report.diff_dc],
    [true,  'Total Income', report.total_income_actual, hubbo_total_income, report.diff_total_income],
    [false, '(+) Other Income (C)', report.total_other_income_c, report.total_other_income_c, 0],
    [true,  'Total Income (All)', actual_total_income_all, hubbo_total_income_all, actual_total_income_all - hubbo_total_income_all],
  ];

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Arial', sans-serif; font-size: 9px; color: #1a1a1a; background: #fff; padding: 16px; }
  
  .header { text-align: center; margin-bottom: 14px; border-bottom: 2px solid #C0392B; padding-bottom: 10px; }
  .header h1 { font-size: 16px; font-weight: 800; color: #C0392B; letter-spacing: 1px; }
  .header h2 { font-size: 10px; color: #666; font-weight: 400; margin-top: 2px; }
  
  .meta { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 9px; }
  .meta-block { display: flex; flex-direction: column; gap: 2px; }
  .meta-label { color: #888; font-size: 8px; text-transform: uppercase; letter-spacing: .5px; }
  .meta-value { font-weight: 700; font-size: 10px; }

  .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 8px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
  .full { grid-column: 1 / -1; }

  .section { border: 0.5px solid #ddd; border-radius: 5px; overflow: hidden; }
  .section-hdr { background: #C0392B; color: #fff; padding: 4px 8px; font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; }

  table { width: 100%; border-collapse: collapse; }
  th { background: #FEF9F8; color: #922B21; font-size: 7.5px; font-weight: 700; padding: 3px 7px; text-align: left; border-bottom: 0.5px solid #FADBD8; }
  td { padding: 3px 7px; border-bottom: 0.5px solid #f0f0f0; font-size: 8.5px; }
  tr:last-child td { border-bottom: none; }
  .num { text-align: right; font-family: monospace; }
  .total-row td { background: #FEF9E7; font-weight: 700; color: #7D6608; border-top: 0.5px solid #F9E79F; }

  .diff-ok  { color: #1E8449; font-weight: 700; }
  .diff-neg { color: #C0392B; font-weight: 700; }
  .diff-pos { color: #1A5276; font-weight: 700; }

  .grand-box { background: #C0392B; color: #fff; border-radius: 5px; padding: 10px 14px; margin-top: 8px; display: flex; justify-content: space-between; align-items: center; }
  .grand-label { font-size: 11px; font-weight: 700; }
  .grand-amount { font-size: 18px; font-weight: 800; color: #D4AC0D; }

  .footer { margin-top: 12px; display: flex; justify-content: space-between; font-size: 8px; color: #888; }
  .sig-block { text-align: center; }
  .sig-line { border-top: 0.5px solid #999; width: 100px; margin: 20px auto 4px; }

  .note-box { background: #FEF9E7; border: 0.5px solid #F9E79F; border-radius: 4px; padding: 5px 8px; font-size: 7.5px; color: #7D6608; margin-top: 6px; }
</style>
</head>
<body>

<div class="header">
  <h1>AMPERA RAYA</h1>
  <h2>Laporan Harian Kasir — ${branchName} (${report.branch_code})</h2>
</div>

<div class="meta">
  <div class="meta-block">
    <span class="meta-label">Tarikh</span>
    <span class="meta-value">${reportDate} (${report.day_name})</span>
  </div>
  <div class="meta-block">
    <span class="meta-label">Cawangan</span>
    <span class="meta-value">${branchName}</span>
  </div>
  <div class="meta-block">
    <span class="meta-label">Kasir</span>
    <span class="meta-value">${report.cashier_name || '—'}</span>
  </div>
  <div class="meta-block">
    <span class="meta-label">ID Laporan</span>
    <span class="meta-value" style="font-size:8px;color:#888">${report.id?.slice(0,8).toUpperCase()}</span>
  </div>
</div>

<div class="grid">
  <!-- Cash Income -->
  <div class="section">
    <div class="section-hdr">💵 Cash Income / Duit Cashier</div>
    <table>
      <tr><th>Pecahan</th><th class="num">Kuantiti</th><th class="num">Jumlah (RM)</th></tr>
      ${denomRows || '<tr><td colspan="3" style="text-align:center;color:#aaa">—</td></tr>'}
      <tr class="total-row">
        <td colspan="2">Total Cash (A)</td>
        <td class="num">${n(report.total_cash_a).toFixed(2)}</td>
      </tr>
      <tr><td colspan="2">(-) Float Hari Ini</td><td class="num">${n(report.float_hari_ini).toFixed(2)}</td></tr>
      <tr class="total-row">
        <td colspan="2">Net Cash / Cash Bersih (AA)</td>
        <td class="num">${n(report.net_cash_aa).toFixed(2)}</td>
      </tr>
    </table>
  </div>

  <!-- QR & Transfer -->
  <div class="section">
    <div class="section-hdr">📲 QR & Transfer Payment</div>
    <table>
      <tr><th>Jenis</th><th class="num">Jumlah (RM)</th></tr>
      <tr><td>Transfer/Bank In</td><td class="num">${n(report.bank_in).toFixed(2)}</td></tr>
      <tr><td>QR</td><td class="num">${n(report.qr_amount).toFixed(2)}</td></tr>
      <tr class="total-row"><td>Total Transfer / QR (B)</td><td class="num">${n(report.total_transfer_qr_b).toFixed(2)}</td></tr>
    </table>

    <div class="section-hdr" style="margin-top:1px">🛵 Other Income (Platform)</div>
    <table>
      <tr><th>Platform</th><th class="num">Jumlah (RM)</th></tr>
      <tr><td>Grab Food</td><td class="num">${n(report.grab_food).toFixed(2)}</td></tr>
      <tr><td>Panda Food</td><td class="num">${n(report.panda_food).toFixed(2)}</td></tr>
      <tr><td>Shopee Food</td><td class="num">${n(report.shopee_food).toFixed(2)}</td></tr>
      <tr class="total-row"><td>Total Other Income (C)</td><td class="num">${n(report.total_other_income_c).toFixed(2)}</td></tr>
    </table>
  </div>

  <!-- Debit/Credit -->
  <div class="section">
    <div class="section-hdr">💳 Debit / Credit Payment</div>
    <table>
      <tr><th>Jenis</th><th class="num">Jumlah (RM)</th></tr>
      <tr><td>VISA</td><td class="num">${n(report.visa).toFixed(2)}</td></tr>
      <tr><td>Master Card</td><td class="num">${n(report.mastercard).toFixed(2)}</td></tr>
      <tr><td>MyDebit</td><td class="num">${n(report.mydebit).toFixed(2)}</td></tr>
      <tr><td>AMEX</td><td class="num">${n(report.amex).toFixed(2)}</td></tr>
      <tr class="total-row"><td>Debit/Credit Total (D)</td><td class="num">${n(report.debit_credit_total_d).toFixed(2)}</td></tr>
    </table>
  </div>
</div>

<!-- Pengeluaran Kasir -->
<div class="grid-2">
  <div class="section">
    <div class="section-hdr">🧾 Pengeluaran Cashier (E)</div>
    <table>
      <tr><th>Detail</th><th>Nota</th><th class="num">Jumlah (RM)</th></tr>
      ${expenseRows || '<tr><td colspan="3" style="text-align:center;color:#aaa">Tiada pengeluaran</td></tr>'}
      <tr class="total-row">
        <td colspan="2">Total Pengeluaran (E)</td>
        <td class="num">${n(report.total_expenses_e).toFixed(2)}</td>
      </tr>
    </table>
  </div>

  <!-- Summary Bank In -->
  <div class="section">
    <div class="section-hdr">🏦 Summary Bank In</div>
    <table>
      <tr><th>Keterangan</th><th class="num">Jumlah (RM)</th></tr>
      <tr class="total-row"><td>Total Cash (A)</td><td class="num">${n(report.total_cash_a).toFixed(2)}</td></tr>
      <tr><td>Bank In Esok</td><td class="num">${n(report.bank_in_cash).toFixed(2)}</td></tr>
      <tr class="total-row"><td>Float (Modal Esok)</td><td class="num">${n(report.float_cash_esok).toFixed(2)}</td></tr>
    </table>
  </div>
</div>

<!-- Summary Sales -->
<div class="section" style="margin-bottom:8px">
  <div class="section-hdr">📊 Summary Sales — Semakan Hubbo</div>
  <table>
    <tr>
      <th style="width:40%">Keterangan</th>
      <th class="num">Actual (Cawangan)</th>
      <th class="num">System (Hubbo)</th>
      <th class="num">Diff</th>
    </tr>
    ${summaryRows.map(([bold, label, actual, hubbo, diff]) => `
    <tr${bold ? ' style="font-weight:700;color:#1a1a1a"' : ''}>
      <td>${label}</td>
      <td class="num">${n(actual).toFixed(2)}</td>
      <td class="num">${n(hubbo).toFixed(2)}</td>
      <td class="num diff-${diffClass(diff)}">${diffLabel(diff)}</td>
    </tr>`).join('')}
  </table>
</div>

<!-- Grand Total -->
<div class="grand-box">
  <div>
    <div style="font-size:8px;opacity:.75;margin-bottom:2px">GRAND TOTAL (Hubbo + Online Food)</div>
    <div class="grand-label">Jumlah Keseluruhan</div>
  </div>
  <div class="grand-amount">${fmt(report.grand_total)}</div>
</div>

${Math.abs(n(report.diff_total_all)) > 0.01 ? `
<div class="note-box">
  ⚠️ Terdapat perbezaan sebanyak ${fmt(Math.abs(report.diff_total_all))} antara Actual dan Hubbo.
  Sila semak dan maklumkan kepada pihak pengurusan.
</div>` : ''}

<div class="footer">
  <div class="sig-block">
    <div class="sig-line"></div>
    <div>Tandatangan Kasir</div>
    <div style="margin-top:2px;font-weight:700">${report.cashier_name || '—'}</div>
  </div>
  <div style="text-align:right;align-self:flex-end;color:#aaa;font-size:7px">
    <div>Dijana oleh Sistem Ampera Raya</div>
    <div>${dayjs().format('DD/MM/YYYY HH:mm')}</div>
    <div>ID: ${report.id?.slice(0,8).toUpperCase()}</div>
  </div>
</div>

</body>
</html>`;
}

async function generateAndUpload(report) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage();
    await page.setContent(generateHTML(report), { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
    });

    await browser.close();

    // Upload ke Supabase Storage
    const filename = `${report.branch_code}_${report.report_date}_${report.id?.slice(0,8)}.pdf`;
    const filePath = `reports/${report.branch_code}/${filename}`;

    const { error: uploadErr } = await supabase.storage
      .from('kasir-reports')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadErr) throw uploadErr;

    // Dapatkan URL public
    const { data: urlData } = supabase.storage
      .from('kasir-reports')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (err) {
    if (browser) await browser.close();
    throw err;
  }
}

module.exports = { generateAndUpload, generateHTML };
