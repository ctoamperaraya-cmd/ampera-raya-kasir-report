const supabase = require('../utils/supabase');
const { invalidateCache } = require('../utils/auth');

const ADMIN_IDS = (process.env.ADMIN_TELEGRAM_IDS || '').split(',').map(id => id.trim());

const VALID_BRANCHES = ['KW', 'KJ', 'S13', 'S7', 'KLTS', 'KD', 'TTDI'];
const VALID_ROLES    = ['cashier', 'manager', 'admin'];

const BRANCH_NAMES = {
  KW: 'Kota Warisan', KJ: 'Taman Putra Kajang',
  S13: 'Shah Alam Seksyen 13', S7: 'Shah Alam Seksyen 7',
  KLTS: 'Plaza KLTS', KD: 'Kota Damansara', TTDI: 'TTDI',
};

function isAdmin(ctx) {
  return ADMIN_IDS.includes(String(ctx.from?.id));
}

// /adduser <telegram_id> <name> <branch> [role]
// Contoh: /adduser 123456789 Ahmad KW cashier
async function handleAddUser(ctx) {
  if (!isAdmin(ctx)) {
    return ctx.reply('⛔ Hanya admin yang boleh menggunakan command ini.');
  }

  const args = ctx.match?.trim().split(/\s+/);
  if (!args || args.length < 3) {
    return ctx.reply(
      '❌ *Format salah.*\n\nGuna: `/adduser <telegram_id> <name> <branch> [role]`\n\n' +
      `Cawangan: \`${VALID_BRANCHES.join(' | ')}\`\n` +
      `Role: \`cashier | manager | admin\` _(default: cashier)_`,
      { parse_mode: 'Markdown' }
    );
  }

  const [telegramId, name, branch, role = 'cashier'] = args;

  if (!/^\d+$/.test(telegramId)) {
    return ctx.reply('❌ Telegram ID mesti nombor sahaja.\n\nContoh: `123456789`', { parse_mode: 'Markdown' });
  }

  if (!VALID_BRANCHES.includes(branch.toUpperCase())) {
    return ctx.reply(
      `❌ Cawangan tidak sah.\n\nSenarai cawangan: \`${VALID_BRANCHES.join(', ')}\``,
      { parse_mode: 'Markdown' }
    );
  }

  if (!VALID_ROLES.includes(role.toLowerCase())) {
    return ctx.reply(
      `❌ Role tidak sah.\n\nRole yang dibenarkan: \`cashier | manager | admin\``,
      { parse_mode: 'Markdown' }
    );
  }

  const branchUpper = branch.toUpperCase();
  const roleLower   = role.toLowerCase();

  // Semak sama ada user dah wujud
  const { data: existing } = await supabase
    .from('users')
    .select('id, name, is_active')
    .eq('telegram_id', telegramId)
    .single();

  if (existing) {
    // Kalau ada tapi inactive, aktifkan semula
    if (!existing.is_active) {
      const { error } = await supabase
        .from('users')
        .update({ name, branch_code: branchUpper, role: roleLower, is_active: true })
        .eq('telegram_id', telegramId);

      if (error) {
        console.error('adduser update error:', error);
        return ctx.reply('❌ Gagal mengaktifkan semula pengguna. Cuba lagi.');
      }

      invalidateCache(telegramId);
      return ctx.reply(
        `✅ *Pengguna diaktifkan semula!*\n\n` +
        `👤 Nama: *${name}*\n` +
        `📍 Cawangan: *${BRANCH_NAMES[branchUpper]}*\n` +
        `🔑 Role: *${roleLower}*\n` +
        `🆔 Telegram ID: \`${telegramId}\``,
        { parse_mode: 'Markdown' }
      );
    }

    return ctx.reply(
      `⚠️ Pengguna dengan Telegram ID \`${telegramId}\` sudah wujud sebagai *${existing.name}*.\n\n` +
      `Guna /removeuser untuk remove dulu, atau /listusers untuk semak senarai.`,
      { parse_mode: 'Markdown' }
    );
  }

  // Insert user baru
  const { error } = await supabase
    .from('users')
    .insert({
      telegram_id: telegramId,
      name,
      branch_code: branchUpper,
      role: roleLower,
      is_active: true,
    });

  if (error) {
    console.error('adduser insert error:', error);
    return ctx.reply('❌ Gagal mendaftarkan pengguna. Cuba lagi.');
  }

  invalidateCache(telegramId);

  await ctx.reply(
    `✅ *Pengguna berjaya didaftarkan!*\n\n` +
    `👤 Nama: *${name}*\n` +
    `📍 Cawangan: *${BRANCH_NAMES[branchUpper]}*\n` +
    `🔑 Role: *${roleLower}*\n` +
    `🆔 Telegram ID: \`${telegramId}\`\n\n` +
    `Suruh mereka hantar /start ke @amperakasirbot untuk mula.`,
    { parse_mode: 'Markdown' }
  );
}

// /removeuser <telegram_id>
async function handleRemoveUser(ctx) {
  if (!isAdmin(ctx)) {
    return ctx.reply('⛔ Hanya admin yang boleh menggunakan command ini.');
  }

  const telegramId = ctx.match?.trim();
  if (!telegramId || !/^\d+$/.test(telegramId)) {
    return ctx.reply(
      '❌ *Format salah.*\n\nGuna: `/removeuser <telegram_id>`\n\nContoh: `/removeuser 123456789`',
      { parse_mode: 'Markdown' }
    );
  }

  const { data: user } = await supabase
    .from('users')
    .select('id, name, branch_code, is_active')
    .eq('telegram_id', telegramId)
    .single();

  if (!user) {
    return ctx.reply(`❌ Tiada pengguna dengan Telegram ID \`${telegramId}\`.`, { parse_mode: 'Markdown' });
  }

  if (!user.is_active) {
    return ctx.reply(`⚠️ Pengguna *${user.name}* sudah pun dinyahaktifkan.`, { parse_mode: 'Markdown' });
  }

  // Soft delete — set is_active = false
  const { error } = await supabase
    .from('users')
    .update({ is_active: false })
    .eq('telegram_id', telegramId);

  if (error) {
    console.error('removeuser error:', error);
    return ctx.reply('❌ Gagal menyahaktifkan pengguna. Cuba lagi.');
  }

  invalidateCache(telegramId);

  await ctx.reply(
    `🚫 *Pengguna dinyahaktifkan.*\n\n` +
    `👤 Nama: *${user.name}*\n` +
    `📍 Cawangan: *${BRANCH_NAMES[user.branch_code] || user.branch_code}*\n` +
    `🆔 Telegram ID: \`${telegramId}\`\n\n` +
    `_Rekod masih disimpan dalam database. Guna /adduser untuk aktifkan semula._`,
    { parse_mode: 'Markdown' }
  );
}

// /listusers
async function handleListUsers(ctx) {
  if (!isAdmin(ctx)) {
    return ctx.reply('⛔ Hanya admin yang boleh menggunakan command ini.');
  }

  const { data: users, error } = await supabase
    .from('users')
    .select('name, branch_code, role, telegram_id, is_active')
    .order('branch_code');

  if (error || !users) {
    return ctx.reply('❌ Gagal mendapatkan senarai pengguna.');
  }

  if (users.length === 0) {
    return ctx.reply('📭 Tiada pengguna dalam sistem.');
  }

  const active   = users.filter(u => u.is_active);
  const inactive = users.filter(u => !u.is_active);

  let msg = `👥 *Senarai Pengguna Ampera Kasir*\n\n`;

  msg += `*✅ Aktif (${active.length})*\n`;
  if (active.length === 0) {
    msg += `_Tiada_\n`;
  } else {
    active.forEach(u => {
      msg += `• *${u.name}* — ${BRANCH_NAMES[u.branch_code] || u.branch_code} _(${u.role})_\n  \`${u.telegram_id}\`\n`;
    });
  }

  if (inactive.length > 0) {
    msg += `\n*🚫 Tidak Aktif (${inactive.length})*\n`;
    inactive.forEach(u => {
      msg += `• ~~${u.name}~~ — ${u.branch_code}\n  \`${u.telegram_id}\`\n`;
    });
  }

  msg += `\n_Guna /adduser atau /removeuser untuk urus pengguna._`;

  await ctx.reply(msg, { parse_mode: 'Markdown' });
}

module.exports = { handleAddUser, handleRemoveUser, handleListUsers };
