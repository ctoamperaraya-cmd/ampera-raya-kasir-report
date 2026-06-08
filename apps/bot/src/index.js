require('dotenv').config();
const { Bot, webhookCallback } = require('grammy');
const express  = require('express');
const path     = require('path');
const supabase = require('./utils/supabase');
const { isAllowed, getCashier } = require('./utils/auth');
const { handleStart }    = require('./handlers/start');
const { handleCallback } = require('./handlers/callback');
const { startCronJobs }  = require('./utils/cron');
const { handleAddUser, handleRemoveUser, handleListUsers } = require('./handlers/admin');

if (!process.env.BOT_TOKEN) throw new Error('❌ BOT_TOKEN wajib ada dalam .env');

const ADMIN_IDS = (process.env.ADMIN_TELEGRAM_IDS || '').split(',').map(id => id.trim());

const bot  = new Bot(process.env.BOT_TOKEN);
const app  = express();
const PORT = process.env.BOT_PORT || 3001;

// ── Middleware: whitelist ─────────────────────────────────────────
bot.use(async (ctx, next) => {
  if (!ctx.from) return next();
  const telegramId = String(ctx.from.id);

  // Admin commands bypass whitelist
  const isAdminCmd = ctx.message?.text?.startsWith('/adduser') ||
                     ctx.message?.text?.startsWith('/removeuser') ||
                     ctx.message?.text?.startsWith('/listusers');

  if (ADMIN_IDS.includes(telegramId) && isAdminCmd) {
    return next();
  }

  const allowed = await isAllowed(telegramId);
  if (!allowed) {
    await ctx.reply(
      '⛔ *Maaf, anda tidak mempunyai akses ke sistem ini.*\n\nSila hubungi admin untuk mendaftarkan akaun anda.',
      { parse_mode: 'Markdown' }
    );
    return;
  }
  ctx.cashier = await getCashier(telegramId);
  return next();
});

// ── Commands ──────────────────────────────────────────────────────
bot.command('start',  handleStart);

bot.command('status', async (ctx) => {
  const today  = new Date().toISOString().slice(0, 10);
  const branch = ctx.cashier?.branch_code;
  const { data } = await supabase
    .from('reports')
    .select('status, submitted_at, grand_total')
    .eq('branch_code', branch)
    .eq('report_date', today)
    .single();
  if (!data) {
    return ctx.reply(
      `📋 *Status Laporan Hari Ini*\n\nCawangan: *${branch}*\nStatus: ❌ *Belum dihantar*\n\nTekan /start untuk buat laporan.`,
      { parse_mode: 'Markdown' }
    );
  }
  const time = new Date(data.submitted_at).toLocaleTimeString('ms-MY', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kuala_Lumpur'
  });
  return ctx.reply(
    `📋 *Status Laporan Hari Ini*\n\nCawangan: *${branch}*\nStatus: ✅ *Sudah dihantar*\nMasa: *${time}*\nGrand Total: *RM ${Number(data.grand_total).toFixed(2)}*`,
    { parse_mode: 'Markdown' }
  );
});

bot.command('help', (ctx) => ctx.reply(
  `ℹ️ *Bantuan — Laporan Kasir Ampera Raya*\n\n/start — Menu utama & buat laporan\n/status — Status laporan hari ini\n/help — Bantuan\n\nSebarang masalah, hubungi admin.`,
  { parse_mode: 'Markdown' }
));

// ── Admin Commands ────────────────────────────────────────────────
bot.command('adduser',    handleAddUser);
bot.command('removeuser', handleRemoveUser);
bot.command('listusers',  handleListUsers);

// ── Callback queries ──────────────────────────────────────────────
bot.on('callback_query:data', handleCallback);

// ── Error handler ─────────────────────────────────────────────────
bot.catch((err) => console.error('❌ Bot error:', err.error));

// ── Start ─────────────────────────────────────────────────────────
async function startBot() {
  const WEBHOOK_URL = process.env.BOT_WEBHOOK_URL;

  app.use(express.json());

  const miniappDist = path.join(__dirname, '..', '..', '..', 'apps', 'miniapp', 'dist');
  app.use('/app', express.static(miniappDist));
  app.get('/app/*', (_req, res) => {
    res.sendFile(path.join(miniappDist, 'index.html'));
  });

  if (WEBHOOK_URL) {
    await bot.api.setWebhook(`${WEBHOOK_URL}/bot/webhook`);
    console.log(`✅ Webhook: ${WEBHOOK_URL}/bot/webhook`);
    console.log(`🌐 Miniapp: ${WEBHOOK_URL}/app`);

    app.post('/bot/webhook', webhookCallback(bot, 'express'));
    app.get('/bot/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }));

    app.listen(PORT, () => console.log(`🤖 Bot server: http://localhost:${PORT}`));
  } else {
    console.log('🔄 Long polling mode');
    app.listen(PORT, () => console.log(`🤖 Bot server: http://localhost:${PORT}`));
    bot.start();
  }

  startCronJobs();
}

startBot();
