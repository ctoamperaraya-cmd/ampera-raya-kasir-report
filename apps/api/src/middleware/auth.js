const supabase = require('../utils/supabase');

/**
 * Middleware: verifikasi JWT dari Supabase Auth
 * Letak di route yang perlukan login (dashboard admin)
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token diperlukan' });
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Token tidak sah atau sudah luput' });
  }

  // Ambil profil user dari table users
  const { data: profile, error: profileErr } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', user.id)
    .single();

  if (profileErr || !profile) {
    return res.status(403).json({ error: 'Pengguna tidak dijumpai' });
  }

  if (!profile.is_active) {
    return res.status(403).json({ error: 'Akaun anda telah dinyahaktifkan' });
  }

  req.user = profile;
  next();
}

/**
 * Middleware: hanya admin & superadmin
 */
function requireAdmin(req, res, next) {
  if (!['admin', 'superadmin'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Akses ditolak — admin sahaja' });
  }
  next();
}

/**
 * Middleware: verifikasi request dari Telegram Bot (internal)
 * Bot hantar API_SECRET dalam header
 */
function requireBotSecret(req, res, next) {
  const secret = req.headers['x-bot-secret'];
  if (!secret || secret !== process.env.API_SECRET) {
    return res.status(401).json({ error: 'Bot secret tidak sah' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin, requireBotSecret };
