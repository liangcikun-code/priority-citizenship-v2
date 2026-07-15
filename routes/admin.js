/**
 * Admin API Routes
 * Protected endpoints for dashboard CRM, blog, and FAQ management.
 */

const express = require('express');
const router = express.Router();
const { login, logout, requireAdmin } = require('../services/admin-auth');
const store = require('../services/data-store');
const kb = require('../services/knowledge-base');

// ─── Auth ─────────────────────────────────────────────

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  const result = login(username, password);
  if (result.success) {
    res.json({ token: result.token, expiresIn: result.expiresIn });
  } else {
    res.status(401).json({ error: result.error });
  }
});

router.post('/logout', requireAdmin, (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  logout(token);
  res.json({ success: true });
});

router.get('/verify', requireAdmin, (req, res) => {
  res.json({ authenticated: true, user: req.adminUser });
});

// ─── Dashboard Stats ─────────────────────────────────

router.get('/stats', requireAdmin, (req, res) => {
  const stats = store.getStats();
  res.json(stats);
});

// ─── CRM / Leads ─────────────────────────────────────

router.get('/leads', requireAdmin, (req, res) => {
  const leads = store.getLeads();
  // Sort newest first
  leads.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(leads);
});

router.post('/leads', requireAdmin, (req, res) => {
  const lead = store.addLead(req.body);
  res.status(201).json(lead);
});

router.put('/leads/:id', requireAdmin, (req, res) => {
  const lead = store.updateLead(req.params.id, req.body);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  res.json(lead);
});

router.delete('/leads/:id', requireAdmin, (req, res) => {
  const ok = store.deleteLead(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Lead not found' });
  res.json({ success: true });
});

// ─── Blog Posts ──────────────────────────────────────

router.get('/blog', requireAdmin, (req, res) => {
  const posts = store.getPosts();
  posts.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  res.json(posts);
});

router.post('/blog', requireAdmin, (req, res) => {
  const post = store.addPost(req.body);
  res.status(201).json(post);
});

router.put('/blog/:id', requireAdmin, (req, res) => {
  const post = store.updatePost(req.params.id, req.body);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  res.json(post);
});

router.delete('/blog/:id', requireAdmin, (req, res) => {
  const ok = store.deletePost(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Post not found' });
  res.json({ success: true });
});

// ─── Appointments ────────────────────────────────────

router.get('/appointments', requireAdmin, (req, res) => {
  const appointments = store.getAppointments();
  appointments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(appointments);
});

router.put('/appointments/:id', requireAdmin, (req, res) => {
  const appt = store.updateAppointment(req.params.id, req.body);
  if (!appt) return res.status(404).json({ error: 'Appointment not found' });
  res.json(appt);
});

// ─── FAQ Management ──────────────────────────────────

router.get('/faq', requireAdmin, (req, res) => {
  const data = kb.load();
  res.json(data.faq || []);
});

router.post('/faq', requireAdmin, (req, res) => {
  const data = kb.load();
  const newFaq = { q: req.body.q, a: req.body.a };
  data.faq.push(newFaq);
  kb.save(data);
  res.status(201).json(newFaq);
});

router.put('/faq/:index', requireAdmin, (req, res) => {
  const data = kb.load();
  const idx = parseInt(req.params.index);
  if (isNaN(idx) || idx < 0 || idx >= data.faq.length) {
    return res.status(404).json({ error: 'FAQ not found' });
  }
  data.faq[idx] = { q: req.body.q || data.faq[idx].q, a: req.body.a || data.faq[idx].a };
  kb.save(data);
  res.json(data.faq[idx]);
});

router.delete('/faq/:index', requireAdmin, (req, res) => {
  const data = kb.load();
  const idx = parseInt(req.params.index);
  if (isNaN(idx) || idx < 0 || idx >= data.faq.length) {
    return res.status(404).json({ error: 'FAQ not found' });
  }
  data.faq.splice(idx, 1);
  kb.save(data);
  res.json({ success: true });
});

// ─── Services Management ─────────────────────────────

router.get('/services', requireAdmin, (req, res) => {
  const data = kb.load();
  res.json(data.services || []);
});

router.put('/services/:id', requireAdmin, (req, res) => {
  const data = kb.load();
  const svc = data.services.find(s => s.id === req.params.id);
  if (!svc) return res.status(404).json({ error: 'Service not found' });
  Object.assign(svc, req.body);
  kb.save(data);
  res.json(svc);
});

// ─── Company Info ────────────────────────────────────

router.get('/company', requireAdmin, (req, res) => {
  const data = kb.load();
  res.json(data.company || {});
});

router.put('/company', requireAdmin, (req, res) => {
  const data = kb.load();
  Object.assign(data.company, req.body);
  kb.save(data);
  res.json(data.company);
});

module.exports = router;
