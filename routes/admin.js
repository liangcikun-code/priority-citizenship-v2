/**
 * Admin API Routes — Async Supabase edition
 */

const express = require('express');
const router = express.Router();
const { login, logout, requireAdmin } = require('../services/admin-auth');
const store = require('../services/data-store');
const kb = require('../services/knowledge-base');
const email = require('../services/email-service');

// ═══════ Auth ════════════════════════════════════

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  const result = login(username, password);
  result.success ? res.json({ token: result.token, expiresIn: result.expiresIn })
                 : res.status(401).json({ error: result.error });
});

router.post('/logout', requireAdmin, (req, res) => {
  logout(req.headers.authorization.split(' ')[1]);
  res.json({ success: true });
});

router.get('/verify', requireAdmin, (req, res) => {
  res.json({ authenticated: true, user: req.adminUser });
});

// ═══════ Dashboard ═══════════════════════════════

router.get('/stats', requireAdmin, async (req, res) => {
  try { res.json(await store.getAnalyticsSummary()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════ CRM / Leads ═════════════════════════════

router.get('/leads', requireAdmin, async (req, res) => {
  try {
    const { status, search, service, from } = req.query;
    res.json(await store.getLeads({ status, search, service, from }));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/leads', requireAdmin, async (req, res) => {
  try {
    const lead = await store.addLead(req.body);
    email.notifyNewLead(lead).catch(() => {});
    res.status(201).json(lead);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/leads/:id', requireAdmin, async (req, res) => {
  try {
    const lead = await store.updateLead(req.params.id, req.body);
    lead ? res.json(lead) : res.status(404).json({ error: 'Lead not found' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/leads/:id', requireAdmin, async (req, res) => {
  try {
    await store.deleteLead(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(404).json({ error: e.message }); }
});

// ═══════ Blog ════════════════════════════════════

router.get('/blog', requireAdmin, async (req, res) => {
  try { res.json(await store.getPosts()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/blog', requireAdmin, async (req, res) => {
  try { res.status(201).json(await store.addPost(req.body)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/blog/:id', requireAdmin, async (req, res) => {
  try {
    const p = await store.updatePost(req.params.id, req.body);
    p ? res.json(p) : res.status(404).json({ error: 'Post not found' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/blog/:id', requireAdmin, async (req, res) => {
  try {
    await store.deletePost(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(404).json({ error: e.message }); }
});

// ═══════ Appointments ════════════════════════════

router.get('/appointments', requireAdmin, async (req, res) => {
  try { res.json(await store.getAppointments()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/appointments/:id', requireAdmin, async (req, res) => {
  try {
    const a = await store.updateAppointment(req.params.id, req.body);
    a ? res.json(a) : res.status(404).json({ error: 'Not found' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════ FAQ ═════════════════════════════════════

router.get('/faq', requireAdmin, (req, res) => {
  res.json((kb.load()).faq || []);
});

router.post('/faq', requireAdmin, (req, res) => {
  const data = kb.load();
  data.faq.push({ q: req.body.q, a: req.body.a });
  kb.save(data);
  const faq = data.faq[data.faq.length - 1];
  store.logActivity('faq_added', `FAQ: ${faq.q}`, faq.q);
  res.status(201).json(faq);
});

router.put('/faq/:index', requireAdmin, (req, res) => {
  const data = kb.load();
  const idx = parseInt(req.params.index);
  if (isNaN(idx) || idx < 0 || idx >= data.faq.length)
    return res.status(404).json({ error: 'FAQ not found' });
  data.faq[idx] = { q: req.body.q || data.faq[idx].q, a: req.body.a || data.faq[idx].a };
  kb.save(data);
  res.json(data.faq[idx]);
});

router.delete('/faq/:index', requireAdmin, (req, res) => {
  const data = kb.load();
  const idx = parseInt(req.params.index);
  if (isNaN(idx) || idx < 0 || idx >= data.faq.length)
    return res.status(404).json({ error: 'FAQ not found' });
  data.faq.splice(idx, 1);
  kb.save(data);
  res.json({ success: true });
});

// ═══════ Services ════════════════════════════════

router.get('/services', requireAdmin, (req, res) => {
  res.json((kb.load()).services || []);
});

router.put('/services/:id', requireAdmin, (req, res) => {
  const data = kb.load();
  const svc = data.services.find(s => s.id === req.params.id);
  if (!svc) return res.status(404).json({ error: 'Service not found' });
  Object.assign(svc, req.body); kb.save(data);
  res.json(svc);
});

// ═══════ Company ═════════════════════════════════

router.get('/company', requireAdmin, (req, res) => {
  res.json((kb.load()).company || {});
});

router.put('/company', requireAdmin, (req, res) => {
  const data = kb.load();
  Object.assign(data.company, req.body); kb.save(data);
  store.logActivity('company_updated', 'Company info updated');
  res.json(data.company);
});

// ═══════ Activity ════════════════════════════════

router.get('/activity', requireAdmin, async (req, res) => {
  try { res.json(await store.getActivity(parseInt(req.query.limit) || 50)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════ Export ══════════════════════════════════

router.get('/export/:type', requireAdmin, async (req, res) => {
  try {
    const csv = await store.exportCSV(req.params.type);
    if (!csv) return res.status(400).json({ error: `Unknown type: ${req.params.type}` });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.type}-${new Date().toISOString().slice(0,10)}.csv"`);
    res.send(csv);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════ Settings ════════════════════════════════

router.get('/settings', requireAdmin, async (req, res) => {
  try { res.json(await store.getSettings()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/settings', requireAdmin, async (req, res) => {
  try { res.json(await store.updateSettings(req.body)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════ Email ═══════════════════════════════════

router.post('/send-email', requireAdmin, async (req, res) => {
  const { to, subject, html } = req.body;
  if (!to || !subject) return res.status(400).json({ error: 'to and subject required' });
  res.json(await email.sendEmail({ to, subject, html: html || '<p>Test</p>' }));
});

module.exports = router;
