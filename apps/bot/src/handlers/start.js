const { InlineKeyboard } = require('grammy');
const supabase = require('../utils/supabase');
const dayjs    = require('dayjs');

const BRANCH_NAMES = {
  KW: 'Kota Warisan', KJ: 'Taman Putra Kajang',
  S13: 'Shah Alam Seksyen 13', S7: 'Shah Alam Seksyen 7',
  KLTS: 'Plaza KLTS', KD: 'Kota Damansara', TTDI: 'TTDI',
};

async function handleStart(ctx) {
  try {
    const cashier    = ctx.cashier;
    const branchName = BRANCH_NAMES[cashier?.branch_code] || cashier?.branch_code || '—';
    const today      = dayjs().format('DD/MM/YYYY');
    const dayName    = ['Ahad','Isnin','Selasa','Rabu','Khamis','Jumaat','Sabtu'][new Date().getDay()];

    const keyboard = new InlineKeyboard()
      .webApp('📋 Buat Laporan Kasir', getMiniAppUrl(cashier))
      .row()
      .text('📊 Status Hari Ini', 'status_today')
      .text('❓ Bantuan', 'help');

    await ctx.reply(
      `👋 Selamat datang, *${cashier?.name}*!\n\n` +
      `📍 Cawangan: *${branchName}*\n` +
      `📅 ${dayName}, ${today}\n\n` +
      `Laporan hari ini *belum* dihantar.\n` +
      `Sila isi borang sebelum *12:00 tengah malam*.`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      }
    );
  } catch (err) {
    console.error('❌ handleStart error:', err);
    await ctx.reply('Maaf, berlaku ralat. Sila cuba lagi.');
  }
}

function getMiniAppUrl(cashier) {
  const BASE_URL = process.env.MINIAPP_URL || 'http://localhost:5173';
  const params = new URLSearchParams({
    cashier_id: cashier?.id || '',
    branch:     cashier?.branch_code || '',
    name:       cashier?.name || '',
    telegram_id: cashier?.telegram_id || '',
  });
  return `${BASE_URL}?${params.toString()}`;
}

module.exports = { handleStart, getMiniAppUrl };
