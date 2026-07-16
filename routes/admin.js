/**
 * Admin API Routes — Phase 3 Complete
 * Auth | Dashboard | CRM | Blog | Appointments | FAQ | Services | Company
 * Analytics | Export | Activity Log | Settings | Email
 */

const express = require('express');
const router = express.Router();
const { login, logout, requireAdmin } = require('../services/admin-auth');
const store = require('../services/data-store');
const kb = require('../services/knowledge-base');
const email = require('../services/email-service');

// ═══════════ Auth ════════════════════════════════════

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

// ═══════════ Dashboard & Analytics ═══════════════════

router.get('/stats', requireAdmin, (req, res) => {
  res.json(store.getAnalyticsSummary());
});

// ═══════════ CRM / Leads ═════════════════════════════

router.get('/leads', requireAdmin, (req, res) => {
  const { status, search, service, from } = req.query;
  res.json(store.getLeads({ status, search, service, from }));
});

router.post('/leads', requireAdmin, (req, res) => {
  const lead = store.addLead(req.body);
  email.notifyNewLead(lead).catch(() => {});
  res.status(201).json(lead);
});

router.put('/leads/:id', requireAdmin, (req, res) => {
  const lead = store.updateLead(req.params.id, req.body);
  lead ? res.json(lead) : res.status(404).json({ error: 'Lead not found' });
});

router.delete('/leads/:id', requireAdmin, (req, res) => {
  store.deleteLead(req.params.id) ? res.json({ success: true })
                                   : res.status(404).json({ error: 'Lead not found' });
});

// ═══════════ Blog ════════════════════════════════════

router.get('/blog', requireAdmin, (req, res) => {
  res.json(store.getPosts());
});

router.post('/blog', requireAdmin, (req, res) => {
  res.status(201).json(store.addPost(req.body));
});

router.put('/blog/:id', requireAdmin, (req, res) => {
  const p = store.updatePost(req.params.id, req.body);
  p ? res.json(p) : res.status(404).json({ error: 'Post not found' });
});

router.delete('/blog/:id', requireAdmin, (req, res) => {
  store.deletePost(req.params.id) ? res.json({ success: true })
                                   : res.status(404).json({ error: 'Post not found' });
});

// ═══════════ Appointments ════════════════════════════

router.get('/appointments', requireAdmin, (req, res) => {
  res.json(store.getAppointments());
});

router.put('/appointments/:id', requireAdmin, (req, res) => {
  const a = store.updateAppointment(req.params.id, req.body);
  a ? res.json(a) : res.status(404).json({ error: 'Not found' });
});

// ═══════════ FAQ ═════════════════════════════════════

router.get('/faq', requireAdmin, (req, res) => {
  res.json((kb.load()).faq || []);
});

router.post('/faq', requireAdmin, (req, res) => {
  const data = kb.load();
  const f = { q: req.body.q, a: req.body.a };
  data.faq.push(f); kb.save(data);
  store.logActivity('faq_added', `FAQ: ${f.q}`, f.q);
  res.status(201).json(f);
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
  data.faq.splice(idx, 1); kb.save(data);
  res.json({ success: true });
});

// ═══════════ Services ════════════════════════════════

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

// ═══════════ Company Info ════════════════════════════

router.get('/company', requireAdmin, (req, res) => {
  res.json((kb.load()).company || {});
});

router.put('/company', requireAdmin, (req, res) => {
  const data = kb.load();
  Object.assign(data.company, req.body); kb.save(data);
  store.logActivity('company_updated', 'Company info updated');
  res.json(data.company);
});

// ═══════════ Activity Log ════════════════════════════

router.get('/activity', requireAdmin, (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json(store.getActivity(limit));
});

// ═══════════ Export ══════════════════════════════════

router.get('/export/:type', requireAdmin, (req, res) => {
  const csv = store.exportCSV(req.params.type);
  if (!csv) return res.status(400).json({ error: `Unknown export type: ${req.params.type}` });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.type}-${new Date().toISOString().slice(0,10)}.csv"`);
  res.send(csv);
});

// ═══════════ Settings ════════════════════════════════

router.get('/settings', requireAdmin, (req, res) => {
  res.json(store.getSettings());
});

router.put('/settings', requireAdmin, (req, res) => {
  res.json(store.updateSettings(req.body));
});

// ═══════════ Email ═══════════════════════════════════

router.post('/send-email', requireAdmin, async (req, res) => {
  const { to, subject, html } = req.body;
  if (!to || !subject) return res.status(400).json({ error: 'to and subject required' });
  const result = await email.sendEmail({ to, subject, html: html || '<p>Test email</p>' });
  res.json(result);
});

module.exports = router;
