const supabase = require('../utils/supabase');
const dayjs    = require('dayjs');

const BRANCH_NAMES = {
  KW: 'Kota Warisan', KJ: 'Taman Putra Kajang',
  S13: 'Shah Alam Seksyen 13', S7: 'Shah Alam Seksyen 7',
  KLTS: 'Plaza KLTS', KD: 'Kota Damansara', TTDI: 'TTDI',
};

const ALL_BRANCHES = ['KW','KJ','S13','S7','KLTS','KD','TTDI'];

async function telegramSend(chatId, text, extra = {}) {
  const BOT_TOKEN = process.env.BOT_TOKEN;
  if (!BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown', ...extra }),
  });
}

/**
 * Reminder ke kasir yang belum lapor
 * Panggil jam 10:00 malam
 */
async function sendReminders() {
  const today = dayjs().format('YYYY-MM-DD');

  // Ambil semua laporan yang dah submit hari ini
  const { data: submitted } = await supabase
    .from('reports')
    .select('branch_code')
    .eq('report_date', today);

  const submittedBranches = new Set((submitted || []).map(r => r.branch_code));
  const pendingBranches   = ALL_BRANCHES.filter(b => !submittedBranches.has(b));

  if (pendingBranches.length === 0) {
    console.log('✅ Semua cabang sudah lapor — tiada reminder perlu dihantar');
    return;
  }

  // Ambil kasir untuk cabang yang belum lapor
  const { data: kasirs } = await supabase
    .from('users')
    .select('name, telegram_id, branch_code')
    .in('branch_code', pendingBranches)
    .eq('role', 'cashier')
    .eq('is_active', true);

  for (const kasir of (kasirs || [])) {
    if (!kasir.telegram_id) continue;

    const branchName = BRANCH_NAMES[kasir.branch_code] || kasir.branch_code;
    await telegramSend(
      kasir.telegram_id,
      `⏰ *Peringatan Laporan Kasir*\n\n` +
      `Laporan harian untuk *${branchName}* belum dihantar\\.\n` +
      `Sila hantar sebelum *12:00 tengah malam*\\.\n\n` +
      `Tekan /start untuk mula\\.`,
    );

    console.log(`📨 Reminder dihantar ke ${kasir.name} (${kasir.branch_code})`);
  }
}

/**
 * Status ringkas ke grup admin
 * Panggil jam 11:00 malam
 */
async function sendDailyStatusToAdmin() {
  const ADMIN_GROUP = process.env.ADMIN_GROUP_ID;
  if (!ADMIN_GROUP) return;

  const today = dayjs().format('YYYY-MM-DD');
  const todayLabel = dayjs().format('DD/MM/YYYY');

  const { data: reports } = await supabase
    .from('reports')
    .select('branch_code, status, submitted_at, grand_total, diff_total_all')
    .eq('report_date', today);

  const reportMap = new Map((reports || []).map(r => [r.branch_code, r]));

  const lines = ALL_BRANCHES.map(code => {
    const r    = reportMap.get(code);
    const name = BRANCH_NAMES[code];
    if (!r) return `❌ ${code} — Belum lapor`;

    const time    = dayjs(r.submitted_at).format('HH:mm');
    const total   = `RM ${Number(r.grand_total).toFixed(2)}`;
    const hasDiff = Math.abs(Number(r.diff_total_all)) > 0.01;
    return `✅ ${code} — ${time} | ${total}${hasDiff ? ' ⚠️' : ''}`;
  });

  const sudah  = ALL_BRANCHES.filter(b => reportMap.has(b)).length;
  const belum  = ALL_BRANCHES.length - sudah;
  const totalGrand = (reports || []).reduce((s, r) => s + Number(r.grand_total), 0);

  await telegramSend(
    ADMIN_GROUP,
    `📊 *Status Laporan Harian*\n` +
    `📅 ${todayLabel}\n\n` +
    lines.join('\n') +
    `\n\n` +
    `*Ringkasan:*\n` +
    `✅ Sudah lapor: ${sudah}/${ALL_BRANCHES.length}\n` +
    (belum > 0 ? `❌ Belum lapor: ${belum}\n` : '') +
    `💰 Jumlah keseluruhan: *RM ${totalGrand.toFixed(2)}*`,
  );

  console.log(`📊 Status harian dihantar ke admin group`);
}

/**
 * Setup cron jobs menggunakan setInterval
 * Lebih mudah dari cron library — cukup untuk keperluan ini
 */
function startCronJobs() {
  console.log('⏱️  Cron jobs aktif (semak setiap minit)');

  setInterval(async () => {
    const now = dayjs().tz ? dayjs().tz('Asia/Kuala_Lumpur') : dayjs();
    const h   = now.hour();
    const m   = now.minute();

    // Jam 10:00 malam — reminder kasir yang belum lapor
    if (h === 22 && m === 0) {
      console.log('⏰ Running: sendReminders');
      await sendReminders().catch(console.error);
    }

    // Jam 11:00 malam — status ke admin group
    if (h === 23 && m === 0) {
      console.log('📊 Running: sendDailyStatusToAdmin');
      await sendDailyStatusToAdmin().catch(console.error);
    }
  }, 60 * 1000); // semak setiap 1 minit
}

module.exports = { sendReminders, sendDailyStatusToAdmin, startCronJobs };
