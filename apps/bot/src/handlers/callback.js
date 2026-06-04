const supabase = require('../utils/supabase');
const dayjs    = require('dayjs');

const BRANCH_NAMES = {
  KW: 'Kota Warisan', KJ: 'Taman Putra Kajang',
  S13: 'Shah Alam Seksyen 13', S7: 'Shah Alam Seksyen 7',
  KLTS: 'Plaza KLTS', KD: 'Kota Damansara', TTDI: 'TTDI',
};

async function handleCallback(ctx) {
  const data = ctx.callbackQuery.data;
  await ctx.answerCallbackQuery(); // hapus loading spinner

  if (data === 'status_today') return handleStatusToday(ctx);
  if (data === 'help')         return handleHelp(ctx);
}

async function handleStatusToday(ctx) {
  const cashier    = ctx.cashier;
  const today      = dayjs().format('YYYY-MM-DD');
  const branchName = BRANCH_NAMES[cashier?.branch_code] || cashier?.branch_code;

  const { data: report } = await supabase
    .from('reports')
    .select('status, submitted_at, grand_total, diff_total_all')
    .eq('branch_code', cashier?.branch_code)
    .eq('report_date', today)
    .single();

  if (!report) {
    return ctx.reply(
      `📊 *Status Laporan — ${branchName}*\n\n` +
      `❌ Belum dihantar\n\n` +
      `Tekan /start untuk buat laporan sekarang\\.`,
      { parse_mode: 'MarkdownV2' }
    );
  }

  const time     = dayjs(report.submitted_at).format('HH:mm');
  const hasDiff  = Math.abs(Number(report.diff_total_all)) > 0.01;
  const diffText = hasDiff
    ? `⚠️ Diff Hubbo: *RM ${Math.abs(Number(report.diff_total_all)).toFixed(2)}*`
    : `✅ Tiada perbezaan Hubbo`;

  return ctx.reply(
    `📊 *Status Laporan — ${branchName}*\n\n` +
    `✅ Sudah dihantar pada *${time}*\n` +
    `💰 Grand Total: *RM ${Number(report.grand_total).toFixed(2)}*\n` +
    `${diffText}`,
    { parse_mode: 'Markdown' }
  );
}

async function handleHelp(ctx) {
  return ctx.reply(
    `ℹ️ *Bantuan — Laporan Kasir Ampera Raya*\n\n` +
    `*Arahan:*\n` +
    `/start — Menu utama\n` +
    `/status — Status laporan hari ini\n` +
    `/help — Bantuan\n\n` +
    `*Cara guna:*\n` +
    `1\\. Tekan /start\n` +
    `2\\. Tekan 📋 *Buat Laporan Kasir*\n` +
    `3\\. Isi borang dalam Mini App\n` +
    `4\\. Submit — PDF dihantar ke sini\n\n` +
    `*Perlu edit laporan?*\n` +
    `Hubungi admin untuk buka semula laporan\\.`,
    { parse_mode: 'MarkdownV2' }
  );
}

module.exports = { handleCallback };
