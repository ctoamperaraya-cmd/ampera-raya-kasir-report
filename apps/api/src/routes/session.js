const express = require('express');
const router  = express.Router();
const { requireActiveTelegramUser } = require('../middleware/telegramUser');

// GET /api/session — Mini App panggil ini sebaik dibuka untuk semak sama ada akses masih dibenarkan
router.get('/', requireActiveTelegramUser, (req, res) => {
  const u = req.tgUser;
  res.json({ ok: true, id: u.id, name: u.name, branch_code: u.branch_code, role: u.role });
});

module.exports = router;
