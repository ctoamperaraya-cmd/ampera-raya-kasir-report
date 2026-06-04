const supabase = require('./supabase');

// Cache ringkas supaya tak query DB setiap message
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minit

async function isAllowed(telegramId) {
  const cached = cache.get(telegramId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.allowed;
  }

  const { data } = await supabase
    .from('users')
    .select('id, is_active')
    .eq('telegram_id', String(telegramId))
    .single();

  const allowed = !!(data && data.is_active);
  cache.set(telegramId, { allowed, ts: Date.now() });
  return allowed;
}

async function getCashier(telegramId) {
  const { data } = await supabase
    .from('users')
    .select('id, name, branch_code, role, telegram_id')
    .eq('telegram_id', String(telegramId))
    .single();
  return data;
}

// Invalidate cache bila admin update user
function invalidateCache(telegramId) {
  cache.delete(String(telegramId));
}

module.exports = { isAllowed, getCashier, invalidateCache };
