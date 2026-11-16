const crypto   = require('crypto');
const supabase = require('../utils/supabase');

// initData Telegram dianggap sah selama 24 jam sejak dibuka
const MAX_AGE_SEC = 24 * 60 * 60;

/**
 * Semak tandatangan initData yang dihantar Telegram WebApp (HMAC dengan BOT_TOKEN).
 * Pulangkan objek user Telegram ({ id, first_name, ... }) atau null kalau tidak sah.
 * Ini bukti sebenar bahawa permintaan datang daripada akaun Telegram tersebut —
 * tidak boleh dipalsukan hanya dengan mengubah URL atau cashier_id.
 */
function parseInitData(initData) {
  const botToken = process.env.BOT_TOKEN;
  if (!botToken || !initData || typeof initData !== 'string') return null;

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expected  = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  const authDate = Number(params.get('auth_date'));
  if (!authDate || Date.now() / 1000 - authDate > MAX_AGE_SEC) return null;

  try { return JSON.parse(params.get('user')); } catch { return null; }
}

/**
 * Middleware: hanya pengguna Telegram yang AKTIF dalam table users boleh lalu.
 * - Pengguna yang sudah di-/removeuser (is_active = false) ditolak (403).
 * - Pilihan: TELEGRAM_ALLOWED_BRANCHES=PSJ  → hanya cawangan tersebut boleh guna borang Telegram
 *   (role admin/superadmin dikecualikan). Kosong = semua cawangan dibenarkan.
 * Selepas lulus: req.tgUser = baris user dari database.
 */
async function requireActiveTelegramUser(req, res, next) {
  try {
    const tg = parseInitData(req.headers['x-telegram-init-data']);
    if (!tg?.id) {
      return res.status(401).json({
        error: 'Sila buka borang ini melalui bot Telegram.',
        code: 'NO_TELEGRAM_AUTH',
      });
    }

    const { data: user } = await supabase
      .from('users')
      .select('id, name, telegram_id, branch_code, role, is_active')
      .eq('telegram_id', String(tg.id))
      .single();

    if (!user || !user.is_active) {
      return res.status(403).json({
        error: 'Akses ditutup: akaun anda tidak aktif. Sila hubungi admin.',
        code: 'USER_INACTIVE',
      });
    }

    const allowed = (process.env.TELEGRAM_ALLOWED_BRANCHES || '')
      .split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

    if (allowed.length && !['admin', 'superadmin'].includes(user.role)) {
      const used = [user.branch_code, req.body?.form?.branch]
        .filter(Boolean).map(s => String(s).toUpperCase());
      if (used.some(b => !allowed.includes(b))) {
        return res.status(403).json({
          error: 'Cawangan anda sudah berpindah ke sistem laporan kasir yang baharu. Sila guna sistem baharu.',
          code: 'BRANCH_MOVED',
        });
      }
    }

    req.tgUser = user;
    next();
  } catch (err) { next(err); }
}

module.exports = { requireActiveTelegramUser, parseInitData };
