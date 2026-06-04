const express = require('express');
const router  = express.Router();
const supabase = require('../utils/supabase');

// POST /api/auth/login — login untuk dashboard admin
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email dan password diperlukan' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: 'Email atau password salah' });

    // Ambil profil dari table users
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', data.user.id)
      .single();

    if (!profile?.is_active) {
      return res.status(403).json({ error: 'Akaun anda telah dinyahaktifkan' });
    }

    res.json({
      token:   data.session.access_token,
      expires: data.session.expires_at,
      user:    profile,
    });
  } catch (err) { next(err); }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  await supabase.auth.signOut();
  res.json({ success: true });
});

module.exports = router;
