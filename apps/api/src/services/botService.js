const dayjs = require('dayjs');

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_GROUP_ID = process.env.ADMIN_GROUP_ID;

const BRANCH_NAMES = {
  KW: 'Kota Warisan', KJ: 'Taman Putra Kajang',
  S13: 'Shah Alam Seksyen 13', S7: 'Shah Alam Seksyen 7',
  KLTS: 'Plaza KLTS', KD: 'Kota Damansara', TTDI: 'TTDI', PSJ: 'Penang Seberang Jaya',
};

const n = (v) => parseFloat(v) || 0;
const fmt = (v) => 'RM ' + n(v).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function telegramRequest(method, body) {
  if (!BOT_TOKEN) { console.warn('⚠️ BOT_TOKEN tidak ditetapkan'); return; }
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

/**
 * Hantar PDF ke kasir selepas laporan berjaya disimpan
 */
async function sendPdfToCashier(telegramId, pdfUrl, report) {
  console.log('📤 Sending PDF to:', telegramId, 'URL:', pdfUrl);
  const branchName = BRANCH_NAMES[report.branch_code] || report.branch_code;
  const hasDiff = Math.abs(n(report.diff_total_all)) > 0.01;

  const caption = [
    `✅ *Laporan Berjaya Dihantar*`,
    ``,
    `📍 *${branchName}*`,
    `📅 ${report.day_name}, ${dayjs(report.report_date).format('DD/MM/YYYY')}`,
    ``,
    `💰 Grand Total: *${fmt(report.grand_total)}*`,
    hasDiff ? `⚠️ Diff Hubbo: *${fmt(Math.abs(report.diff_total_all))}*` : `✓ Tiada perbezaan Hubbo`,
    ``,
    `Terima kasih. PDF laporan anda ada di bawah.`,
  ].filter(Boolean).join('\n');

  // Hantar dokumen PDF
  // Hantar dokumen PDF
  const result = await telegramRequest('sendDocument', {
    chat_id: telegramId,
    document: pdfUrl,
    caption: caption,
    parse_mode: 'Markdown',
  });
  console.log('📨 Telegram result:', JSON.stringify(result));
}

/**
 * Daftar penerima admin (boleh banyak, pisahkan dengan koma)
 * Contoh: ADMIN_GROUP_ID=8401430689  atau  ADMIN_GROUP_ID=8401430689,-1001234567890
 */
function adminTargets() {
  return (process.env.ADMIN_GROUP_ID || '').split(',').map(x => x.trim()).filter(Boolean);
}

const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Hantar laporan (PDF + ringkasan) ke admin sebaik sahaja kasir submit.
 * Guna HTML parse mode supaya tanda baca seperti "." tidak menyebabkan error.
 */
async function notifyAdminGroup(report, isEdit = false, pdfUrl = null) {
  const targets = adminTargets();
  if (!targets.length) return;

  const branchName = BRANCH_NAMES[report.branch_code] || report.branch_code;
  const hasDiff = Math.abs(n(report.diff_total_all)) > 0.01;
  const emoji = isEdit ? '✏️' : '📋';

  const caption = [
    `${emoji} <b>Laporan ${isEdit ? '(EDIT) ' : ''}Masuk</b>`,
    ``,
    `📍 ${esc(branchName)} (${esc(report.branch_code)})`,
    `👤 Kasir: ${esc(report.cashier_name || '-')}`,
    `📅 ${esc(report.day_name || '')}, ${dayjs(report.report_date).format('DD/MM/YYYY')}`,
    `💰 Grand Total: <b>${esc(fmt(report.grand_total))}</b>`,
    hasDiff
      ? `⚠️ Perbezaan Hubbo: <b>${esc(fmt(Math.abs(report.diff_total_all)))}</b>`
      : `✅ Tiada perbezaan Hubbo`,
    `🕐 ${dayjs().format('HH:mm')}`,
  ].join('\n');

  for (const chat_id of targets) {
    try {
      let res;
      if (pdfUrl) {
        res = await telegramRequest('sendDocument', { chat_id, document: pdfUrl, caption, parse_mode: 'HTML' });
      }
      // Fallback ke teks bila PDF tiada / gagal
      if (!res || !res.ok) {
        if (res) console.warn('⚠️ sendDocument admin gagal:', JSON.stringify(res));
        res = await telegramRequest('sendMessage', { chat_id, text: caption, parse_mode: 'HTML' });
      }
      if (res && !res.ok) console.error('❌ Notify admin gagal ->', chat_id, JSON.stringify(res));
    } catch (err) {
      console.error('❌ Notify admin error ->', chat_id, err.message);
    }
  }
}

/**
 * Notify kasir bahawa laporan mereka telah di-unlock untuk edit
 */
async function notifyCashierUnlocked(report) {
  if (!report.cashier_telegram_id) return;

  const branchName = BRANCH_NAMES[report.branch_code] || report.branch_code;

  await telegramRequest('sendMessage', {
    chat_id: report.cashier_telegram_id,
    text: [
      `🔓 *Laporan Dibuka untuk Edit*`,
      ``,
      `Laporan anda untuk *${branchName}* tarikh *${dayjs(report.report_date).format('DD/MM/YYYY')}* telah dibuka oleh admin\\.`,
      report.unlock_reason ? `\n📝 Sebab: ${report.unlock_reason}` : '',
      ``,
      `Tekan /start untuk edit laporan\\.`,
    ].filter(Boolean).join('\n'),
    parse_mode: 'MarkdownV2',
  });
}

/**
 * Hantar reminder ke kasir yang belum lapor (dipanggil dari cron job)
 */
async function sendReminder(telegramId, branchName) {
  await telegramRequest('sendMessage', {
    chat_id: telegramId,
    text: [
      `⏰ *Peringatan Laporan Kasir*`,
      ``,
      `Laporan harian untuk *${branchName}* belum dihantar\\.`,
      `Sila hantar sebelum *12:00 malam* malam ini\\.`,
      ``,
      `Tekan /start untuk mula\\.`,
    ].join('\n'),
    parse_mode: 'MarkdownV2',
  });
}

/**
 * Hantar status harian semua cabang ke grup admin (cron jam 23:00)
 */
async function sendDailyStatusToAdmin(statusList) {
  const targets = adminTargets();
  if (!targets.length) return;

  const today = dayjs().format('DD/MM/YYYY');
  const lines = statusList.map(s => {
    const icon = s.status === 'submitted' ? '✅' : '❌';
    const time = s.submitted_at ? dayjs(s.submitted_at).format('HH:mm') : '—';
    return `${icon} ${s.branch_code} — ${time}`;
  });

  const belum = statusList.filter(s => s.status !== 'submitted');

  const text = [
    `📊 *Status Laporan Kasir*`,
    `📅 ${today}`,
    ``,
    lines.join('\n'),
    ``,
    belum.length === 0
      ? `✅ Semua cawangan sudah lapor\\!`
      : `⚠️ *${belum.length} cawangan belum lapor:*\n${belum.map(s => `• ${s.branch_code}`).join('\n')}`,
  ].join('\n');

  for (const chat_id of targets) {
    await telegramRequest('sendMessage', { chat_id, text, parse_mode: 'MarkdownV2' }).catch(console.error);
  }
}

module.exports = {
  sendPdfToCashier,
  notifyAdminGroup,
  notifyCashierUnlocked,
  sendReminder,
  sendDailyStatusToAdmin,
};
