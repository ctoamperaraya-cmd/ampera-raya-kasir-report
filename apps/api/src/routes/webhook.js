const express = require('express');
const router  = express.Router();
const { deleteReportFromSheets, syncReportToSheets } = require('../utils/sheetsSync');

// Supabase Database Webhook
// POST /webhook/supabase
router.post('/supabase', async (req, res) => {
  try {
    const secret = req.headers['x-webhook-secret'];
    if (secret !== process.env.WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { type, record, old_record } = req.body;

    console.log(`📡 Supabase webhook: ${type}`, record?.id || old_record?.id);

    if (type === 'DELETE' && old_record?.id) {
      await deleteReportFromSheets(old_record.id);
    }

    if (type === 'UPDATE' && record?.id) {
      await syncReportToSheets({
        ...record,
        expenses: record.expenses || [],
        grab_amount:  record.grab_food || 0,
        panda_amount: record.panda_food || 0,
        shopee_amount: record.shopee_food || 0,
        hubbo_total_income: record.hubbo_total_income_all || 0,
        total_income: record.total_income_actual || 0,
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Webhook error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Telegram webhook placeholder
router.post('/', (req, res) => res.sendStatus(200));

module.exports = router;
