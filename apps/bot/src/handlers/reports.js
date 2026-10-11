const supabase = require('../utils/supabase');
const dayjs    = require('dayjs');
dayjs.extend(require('dayjs/plugin/utc'));
dayjs.extend(require('dayjs/plugin/timezone'));

const TZ = 'Asia/Kuala_Lumpur';

const BRANCH_NAMES = {
  KW: 'Kota Warisan', KJ: 'Taman Putra Kajang',
  S13: 'Shah Alam Seksyen 13', S7: 'Shah Alam Seksyen 7',
  KLTS: 'Plaza KLTS', KD: 'Kota Damansara', TTDI: 'TTDI', PSJ: 'Penang Seberang Jaya',
};
const ALL_BRANCHES = ['KW', 'KJ', 'S13', 'S7', 'KLTS', 'KD', 'TTDI', 'PSJ'];

const n   = (v) => parseFloat(v) || 0;
const fmt = (v) => 'RM ' + n(v).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const list = (s) => (s || '').split(',').map(x => x.trim()).filter(Boolean);

/** Siapa boleh lihat semua laporan: ID di ADMIN_TELEGRAM_IDS / ADMIN_GROUP_ID, atau role admin/manager/superadmin */
function canViewAll(ctx) {
  const id = String(ctx.from?.id || '');
  const ids = [...list(process.env.ADMIN_TELEGRAM_IDS), ...list(process.env.ADMIN_GROUP_ID)];
  return ids.includes(id) || ['admin', 'manager', 'superadmin'].includes(ctx.cashier?.role);
}

/**
 * Satu klik / satu command (/laporan):
 * ringkasan semua cawangan + PDF semua laporan yang sudah masuk hari ini.
 */
async function handleReportsToday(ctx) {
  if (!canViewAll(ctx)) {
    return ctx.reply('⛔ Hanya admin yang boleh melihat semua laporan.');
  }

  try {
    const now   = dayjs().tz(TZ);
    const today = now.format('YYYY-MM-DD');

    const { data: rows, error } = await supabase
      .from('reports')
      .select('branch_code, cashier_name, day_name, report_date, submitted_at, edited_at, grand_total, diff_total_all, pdf_url')
      .eq('report_date', today)
      .order('submitted_at', { ascending: true });
    if (error) throw error;

    // Satu cawangan boleh hantar >1 laporan sehari — semuanya dipaparkan
    const byBranch = new Map();
    for (const r of rows || []) {
      if (!byBranch.has(r.branch_code)) byBranch.set(r.branch_code, []);
      byBranch.get(r.branch_code).push(r);
    }

    const timeOf = (r) => dayjs(r.edited_at || r.submitted_at).tz(TZ).format('HH:mm');

    const lines = ALL_BRANCHES.map(code => {
      const list = byBranch.get(code);
      if (!list) return `❌ <b>${code}</b> — Belum lapor`;
      const items = list.map(r => {
        const diff = Math.abs(n(r.diff_total_all)) > 0.01 ? ' ⚠️' : '';
        return `   • ${timeOf(r)} | ${esc(fmt(r.grand_total))}${diff}`;
      });
      return `✅ <b>${code}</b> — ${list.length} laporan\n${items.join('\n')}`;
    });

    const submitted  = ALL_BRANCHES.filter(c => byBranch.has(c));
    const pending    = ALL_BRANCHES.filter(c => !byBranch.has(c));
    const totalCount = (rows || []).length;
    const grandTotal = (rows || []).reduce((s, r) => s + n(r.grand_total), 0);

    await ctx.reply(
      `📊 <b>Semua Laporan Hari Ini</b>\n📅 ${now.format('DD/MM/YYYY')}\n\n` +
      lines.join('\n') + `\n\n` +
      `✅ Cawangan sudah lapor: ${submitted.length}/${ALL_BRANCHES.length} (${totalCount} laporan)\n` +
      (pending.length ? `❌ Belum lapor: ${pending.join(', ')}\n` : '') +
      `💰 Jumlah keseluruhan: <b>${esc(fmt(grandTotal))}</b>`,
      { parse_mode: 'HTML' }
    );

    // Hantar PDF SEMUA laporan (ikut urutan cawangan, kemudian jam)
    for (const code of submitted) {
      const list = byBranch.get(code);
      for (let i = 0; i < list.length; i++) {
        const r = list[i];
        const caption =
          `📍 <b>${esc(BRANCH_NAMES[code] || code)}</b> (${code})` +
          (list.length > 1 ? ` — laporan ${i + 1}/${list.length}` : '') + `\n` +
          `👤 ${esc(r.cashier_name || '-')} • 🕐 ${timeOf(r)}\n` +
          `💰 Grand Total: <b>${esc(fmt(r.grand_total))}</b>\n` +
          (Math.abs(n(r.diff_total_all)) > 0.01
            ? `⚠️ Perbezaan Hubbo: <b>${esc(fmt(Math.abs(n(r.diff_total_all))))}</b>`
            : `✅ Tiada perbezaan Hubbo`);

        try {
          if (r.pdf_url) {
            await ctx.replyWithDocument(r.pdf_url, { caption, parse_mode: 'HTML' });
          } else {
            await ctx.reply(caption + `\n\n⏳ PDF belum siap.`, { parse_mode: 'HTML' });
          }
        } catch (err) {
          console.error(`❌ Gagal hantar PDF ${code}:`, err.message);
          await ctx.reply(caption + `\n\n⚠️ PDF gagal dihantar.`, { parse_mode: 'HTML' }).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.error('❌ handleReportsToday error:', err);
    await ctx.reply('Maaf, berlaku ralat semasa mengambil laporan.');
  }
}

module.exports = { handleReportsToday, canViewAll };