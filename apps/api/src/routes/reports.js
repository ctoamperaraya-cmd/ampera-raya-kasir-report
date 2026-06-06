const express = require('express');
const router  = express.Router();
const supabase = require('../utils/supabase');
const { requireAuth, requireAdmin, requireBotSecret } = require('../middleware/auth');
const { calcDerived } = require('../utils/calc');
const pdfService = require('../services/pdfService');
const botService = require('../services/botService');
const dayjs = require('dayjs');

// ─────────────────────────────────────────────────────────────────
// GET /api/reports
// Admin: semua laporan | Manager: cabang sendiri sahaja
// ─────────────────────────────────────────────────────────────────
router.get('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { branch, date_from, date_to, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('reports')
      .select('*, users(name, branch_code)', { count: 'exact' })
      .order('report_date', { ascending: false })
      .range(offset, offset + limit - 1);

    // Manager cabang hanya boleh tengok cabang sendiri
    if (req.user.role === 'manager') {
      query = query.eq('branch_code', req.user.branch_code);
    } else if (branch) {
      query = query.eq('branch_code', branch);
    }

    if (date_from) query = query.gte('report_date', date_from);
    if (date_to)   query = query.lte('report_date', date_to);
    if (status)    query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({ data, total: count, page: +page, limit: +limit });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────
// GET /api/reports/status-today
// Semak status laporan semua cabang hari ini
// ─────────────────────────────────────────────────────────────────
router.get('/status-today', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const today = dayjs().format('YYYY-MM-DD');

    const { data: reports } = await supabase
      .from('reports')
      .select('branch_code, status, submitted_at, cashier_id, users(name)')
      .eq('report_date', today);

    const BRANCHES = ['KW','KJ','S13','S7','KLTS','KD','TTDI'];
    const result = BRANCHES.map(code => {
      const report = reports?.find(r => r.branch_code === code);
      return {
        branch_code: code,
        status: report ? report.status : 'belum',
        submitted_at: report?.submitted_at || null,
        kasir: report?.users?.name || null,
      };
    });

    res.json(result);
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────
// GET /api/reports/:id
// ─────────────────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*, users(name, branch_code)')
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Laporan tidak dijumpai' });

    // Manager hanya boleh tengok cabang sendiri
    if (req.user.role === 'manager' && data.branch_code !== req.user.branch_code) {
      return res.status(403).json({ error: 'Akses ditolak' });
    }

    res.json(data);
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/reports
// Hantar laporan baru — dipanggil oleh Mini App via Bot
// Header: x-bot-secret
// ─────────────────────────────────────────────────────────────────
router.post('/', requireBotSecret, async (req, res, next) => {
  try {
    const { cashier_id, telegram_id, form } = req.body;

    // Validate: 1 laporan per cabang per hari
    const today = form.date || dayjs().format('YYYY-MM-DD');
    const { data: existing } = await supabase
      .from('reports')
      .select('id')
      .eq('branch_code', form.branch)
      .eq('report_date', today)
      .single();

    if (existing) {
      return res.status(409).json({
        error: 'Laporan untuk cawangan ini hari ini sudah wujud. Hubungi admin untuk edit.',
        existing_id: existing.id,
      });
    }

    // Ambil nama kasir dari users table
    const { data: cashierData } = await supabase
      .from('users')
      .select('name')
      .eq('id', cashier_id)
      .single();
    const cashier_name = cashierData?.name || form.cashier_name || '';

    // Kira semua nilai automatik
    const derived = calcDerived(form);

    // Simpan ke database
    const { data: report, error: insertErr } = await supabase
      .from('reports')
      .insert({
        cashier_id,
        branch_code:          form.branch,
        report_date:          today,
        day_name:             form.day,
        cashier_name:         cashier_name,
        // Cash
        denom_qty:            form.denom_qty,
        total_cash_a:         derived.total_cash_a,
        float_hari_ini:       +form.float_hari_ini || 0,
        net_cash_aa:          derived.net_cash_aa,
        // QR & Transfer
        bank_in:              +form.bank_in || 0,
        bank_in_cash:         +form.bank_in_cash || 0,
        qr_amount:            +form.qr_amount || 0,
        total_transfer_qr_b:  derived.total_transfer_qr_b,
        // Debit/Credit
        visa:                 +form.visa || 0,
        mastercard:           +form.mastercard || 0,
        mydebit:              +form.mydebit || 0,
        amex:                 +form.amex || 0,
        debit_credit_total_d: derived.debit_credit_total_d,
        // Other Income
        grab_food:            +form.grab_food || 0,
        panda_food:           +form.panda_food || 0,
        shopee_food:          +form.shopee_food || 0,
        total_other_income_c: derived.total_other_income_c,
        // Expenses
        expenses:             form.expenses,
        total_expenses_e:     derived.total_expenses_e,
        // Hubbo
        hubbo_net_cash:       +form.hubbo_net_cash || 0,
        hubbo_pengeluaran:    +form.hubbo_pengeluaran || 0,
        hubbo_qr_transfer:    +form.hubbo_qr_transfer || 0,
        hubbo_debit_credit:   +form.hubbo_debit_credit || 0,
        hubbo_total_income_all: +form.hubbo_total_income_all || 0,
        // Summary
        cash_sales_actual:    derived.cash_sales_actual,
        total_income_actual:  derived.total_income_actual,
        grand_total:          derived.grand_total,
        float_cash_esok:      derived.float_cash_esok,
        // Diff
        diff_net_cash:        derived.diff_net_cash,
        diff_total_all:       derived.diff_total_all,
        // Meta
        status:               'submitted',
        submitted_at:         new Date().toISOString(),
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    // Generate PDF (async — tak perlu tunggu sebelum balas)
  pdfService.generateAndUpload(report)
  .then(pdfUrl => {
    console.log('✅ PDF generated:', pdfUrl);
        // Update URL PDF dalam database
        supabase.from('reports').update({ pdf_url: pdfUrl }).eq('id', report.id);
        // Hantar PDF ke kasir via Bot
        botService.sendPdfToCashier(telegram_id, pdfUrl, report);
        // Notify admin group
        botService.notifyAdminGroup(report);
      })
       .catch(err => {
    console.error('❌ PDF/Bot error:', err.message, err.stack);
  });

    res.status(201).json({ success: true, report_id: report.id });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────
// PATCH /api/reports/:id/unlock
// Admin unlock laporan untuk diedit semula oleh kasir
// ─────────────────────────────────────────────────────────────────
router.patch('/:id/unlock', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { reason } = req.body;

    const { data, error } = await supabase
      .from('reports')
      .update({
        status: 'unlocked',
        unlock_reason: reason || null,
        unlocked_by: req.user.id,
        unlocked_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    // Notify kasir via bot bahawa laporan dah dibuka untuk edit
    botService.notifyCashierUnlocked(data);

    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────
// PATCH /api/reports/:id
// Kasir edit semula laporan yang di-unlock
// ─────────────────────────────────────────────────────────────────
router.patch('/:id', requireBotSecret, async (req, res, next) => {
  try {
    const { form, telegram_id } = req.body;

    // Semak status — mesti 'unlocked'
    const { data: existing } = await supabase
      .from('reports')
      .select('status')
      .eq('id', req.params.id)
      .single();

    if (!existing || existing.status !== 'unlocked') {
      return res.status(403).json({ error: 'Laporan tidak dalam status boleh edit' });
    }

    const derived = calcDerived(form);

    const { data: report, error } = await supabase
      .from('reports')
      .update({
        denom_qty:            form.denom_qty,
        total_cash_a:         derived.total_cash_a,
        float_hari_ini:       +form.float_hari_ini || 0,
        net_cash_aa:          derived.net_cash_aa,
        cashier_name:         cashier_name,  // ← tambah ini
        bank_in:              +form.bank_in || 0,
        bank_in_cash:         +form.bank_in_cash || 0,
        qr_amount:            +form.qr_amount || 0,
        total_transfer_qr_b:  derived.total_transfer_qr_b,
        visa:                 +form.visa || 0,
        mastercard:           +form.mastercard || 0,
        mydebit:              +form.mydebit || 0,
        amex:                 +form.amex || 0,
        debit_credit_total_d: derived.debit_credit_total_d,
        grab_food:            +form.grab_food || 0,
        panda_food:           +form.panda_food || 0,
        shopee_food:          +form.shopee_food || 0,
        total_other_income_c: derived.total_other_income_c,
        expenses:             form.expenses,
        total_expenses_e:     derived.total_expenses_e,
        hubbo_net_cash:       +form.hubbo_net_cash || 0,
        hubbo_pengeluaran:    +form.hubbo_pengeluaran || 0,
        hubbo_qr_transfer:    +form.hubbo_qr_transfer || 0,
        hubbo_debit_credit:   +form.hubbo_debit_credit || 0,
        hubbo_total_income_all: +form.hubbo_total_income_all || 0,
        cash_sales_actual:    derived.cash_sales_actual,
        total_income_actual:  derived.total_income_actual,
        grand_total:          derived.grand_total,
        diff_net_cash:        derived.diff_net_cash,
        diff_total_all:       derived.diff_total_all,
        status:               'submitted',
        edited_at:            new Date().toISOString(),
        pdf_url:              null, // akan di-update selepas generate semula
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    // Generate semula PDF
    pdfService.generateAndUpload(report)
      .then(pdfUrl => {
        supabase.from('reports').update({ pdf_url: pdfUrl }).eq('id', report.id);
        botService.sendPdfToCashier(telegram_id, pdfUrl, report);
        botService.notifyAdminGroup(report, true); // isEdit = true
      })
      .catch(err => console.error('❌ PDF/Bot error:', err));

    res.json({ success: true, report_id: report.id });
  } catch (err) { next(err); }
});

module.exports = router;
