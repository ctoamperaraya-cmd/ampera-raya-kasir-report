const dayjs = require('dayjs');

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_GROUP_ID = process.env.ADMIN_GROUP_ID;

const BRANCH_NAMES = {
  KW: 'Kota Warisan', KJ: 'Taman Putra Kajang',
  S13: 'Shah Alam Seksyen 13', S7: 'Shah Alam Seksyen 7',
  KLTS: 'Plaza KLTS', KD: 'Kota Damansara', TTDI: 'TTDI',
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
 * Notify grup admin bila laporan baru masuk
 */
async function notifyAdminGroup(report, isEdit = false) {
  if (!ADMIN_GROUP_ID) return;

  const branchName = BRANCH_NAMES[report.branch_code] || report.branch_code;
  const hasDiff = Math.abs(n(report.diff_total_all)) > 0.01;
  const emoji = isEdit ? '✏️' : '📋';

  const text = [
    `${emoji} *Laporan ${isEdit ? '\\(EDIT\\) ' : ''}Masuk*`,
    ``,
    `📍 ${branchName} \\(${report.branch_code}\\)`,
    `📅 ${dayjs(report.report_date).format('DD/MM/YYYY')}`,
    `💰 Grand Total: *${fmt(report.grand_total)}*`,
    hasDiff
      ? `⚠️ Perbezaan Hubbo: *${fmt(Math.abs(report.diff_total_all))}*`
      : `✅ Tiada perbezaan Hubbo`,
    `🕐 ${dayjs().format('HH:mm')}`,
  ].join('\n');

  await telegramRequest('sendMessage', {
    chat_id: ADMIN_GROUP_ID,
    text,
    parse_mode: 'MarkdownV2',
  });
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
  if (!ADMIN_GROUP_ID) return;

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

  await telegramRequest('sendMessage', {
    chat_id: ADMIN_GROUP_ID,
    text,
    parse_mode: 'MarkdownV2',
  });
}

module.exports = {
  sendPdfToCashier,
  notifyAdminGroup,
  notifyCashierUnlocked,
  sendReminder,
  sendDailyStatusToAdmin,
};
