const express = require('express');
const router  = express.Router();
const supabase = require('../utils/supabase');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET /api/users — semua kasir (admin sahaja)
router.get('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, telegram_id, branch_code, role, is_active, created_at')
      .order('branch_code');

    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

// POST /api/users — tambah kasir baru
router.post('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { name, telegram_id, branch_code, role = 'cashier' } = req.body;

    if (!name || !telegram_id || !branch_code) {
      return res.status(400).json({ error: 'name, telegram_id, branch_code wajib diisi' });
    }

    // Semak duplikat telegram_id
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', telegram_id)
      .single();

    if (existing) {
      return res.status(409).json({ error: 'Telegram ID ini sudah didaftarkan' });
    }

    const { data, error } = await supabase
      .from('users')
      .insert({ name, telegram_id: String(telegram_id), branch_code, role, is_active: true })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { next(err); }
});

// PATCH /api/users/:id — update info atau toggle aktif
router.patch('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const allowed = ['name', 'branch_code', 'role', 'is_active'];
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k))
    );

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

// DELETE /api/users/:id — soft delete (nonaktifkan)
router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ is_active: false })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

module.exports = router;
