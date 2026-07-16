/**
 * JSON File-based Data Store
 * CRM leads, blog, appointments, analytics, activity log, settings.
 * Production: replace with a proper database.
 * Vercel: /tmp is writable but ephemeral — data resets on cold starts.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const DATA_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), 'data')
  : path.join(__dirname, '..', 'data');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const FILES = {
  leads        : path.join(DATA_DIR, 'leads.json'),
  blog         : path.join(DATA_DIR, 'blog.json'),
  appointments : path.join(DATA_DIR, 'appointments.json'),
  analytics    : path.join(DATA_DIR, 'analytics.json'),
  activity     : path.join(DATA_DIR, 'activity.json'),
  settings     : path.join(DATA_DIR, 'settings.json'),
};

// ─── Helpers ──────────────────────────────────────────

function readJSON(filePath) {
  try { return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : null; }
  catch (e) { return null; }
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

const nowISO = () => new Date().toISOString();

// ─── CRM Leads ────────────────────────────────────────

function getLeads(filters = {}) {
  let leads = readJSON(FILES.leads) || [];
  if (filters.status)    leads = leads.filter(l => l.status === filters.status);
  if (filters.search)    { const s = filters.search.toLowerCase(); leads = leads.filter(l => (l.name + l.email).toLowerCase().includes(s)); }
  if (filters.service)   leads = leads.filter(l => l.service === filters.service);
  if (filters.from)      leads = leads.filter(l => l.createdAt >= filters.from);
  return leads.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function addLead(lead) {
  const leads = getLeads();
  const newLead = { id: 'lead_' + Date.now(), ...lead, status: lead.status || 'new', createdAt: nowISO(), updatedAt: nowISO() };
  leads.unshift(newLead);
  writeJSON(FILES.leads, leads);
  logActivity('lead_created', `New lead: ${lead.name}`, lead.name);
  return newLead;
}

function updateLead(id, updates) {
  const leads = getLeads();
  const idx = leads.findIndex(l => l.id === id);
  if (idx === -1) return null;
  const old = leads[idx];
  leads[idx] = { ...old, ...updates, updatedAt: nowISO() };
  writeJSON(FILES.leads, leads);
  if (updates.status && updates.status !== old.status)
    logActivity('lead_status', `${old.name}: ${old.status} → ${updates.status}`, old.name);
  return leads[idx];
}

function deleteLead(id) {
  const leads = getLeads();
  const l = leads.find(x => x.id === id);
  const filtered = leads.filter(x => x.id !== id);
  if (filtered.length === leads.length) return false;
  writeJSON(FILES.leads, filtered);
  if (l) logActivity('lead_deleted', `Deleted lead: ${l.name}`, l.name);
  return true;
}

// ─── Blog Posts ───────────────────────────────────────

function getPosts() { return readJSON(FILES.blog) || []; }

function addPost(post) {
  const posts = getPosts();
  const np = { id: 'post_' + Date.now(), ...post, slug: slugify(post.title), published: post.published !== false, author: post.author || 'Priority Citizenship', createdAt: nowISO(), updatedAt: nowISO() };
  posts.unshift(np);
  writeJSON(FILES.blog, posts);
  logActivity('post_created', `Blog: ${post.title}`, post.title);
  return np;
}

function updatePost(id, updates) {
  const posts = getPosts();
  const idx = posts.findIndex(p => p.id === id);
  if (idx === -1) return null;
  posts[idx] = { ...posts[idx], ...updates, updatedAt: nowISO() };
  writeJSON(FILES.blog, posts);
  return posts[idx];
}

function deletePost(id) {
  const posts = getPosts();
  const p = posts.find(x => x.id === id);
  const filtered = posts.filter(x => x.id !== id);
  if (filtered.length === posts.length) return false;
  writeJSON(FILES.blog, filtered);
  if (p) logActivity('post_deleted', `Blog deleted: ${p.title}`, p.title);
  return true;
}

// ─── Appointments ─────────────────────────────────────

function getAppointments() { return readJSON(FILES.appointments) || []; }

function addAppointment(appt) {
  const appts = getAppointments();
  const na = { id: 'appt_' + Date.now(), ...appt, status: appt.status || 'confirmed', createdAt: nowISO() };
  appts.unshift(na);
  writeJSON(FILES.appointments, appts);
  logActivity('appointment_booked', `Booking: ${appt.name}`, appt.name);
  return na;
}

function updateAppointment(id, updates) {
  const appts = getAppointments();
  const idx = appts.findIndex(a => a.id === id);
  if (idx === -1) return null;
  appts[idx] = { ...appts[idx], ...updates, updatedAt: nowISO() };
  writeJSON(FILES.appointments, appts);
  return appts[idx];
}

// ─── Activity Log ────────────────────────────────────

function getActivity(limit = 50) {
  const a = readJSON(FILES.activity) || [];
  return a.slice(0, limit);
}

function logActivity(type, message, subject) {
  const a = readJSON(FILES.activity) || [];
  a.unshift({ id: 'act_' + Date.now(), type, message, subject, timestamp: nowISO() });
  if (a.length > 500) a.length = 500;
  writeJSON(FILES.activity, a);
}

// ─── Settings ────────────────────────────────────────

const DEFAULT_SETTINGS = {
  site: { name: 'Priority Citizenship Limited', tagline: 'Your Pathway to Vanuatu Citizenship' },
  contact: { email: 'prioritycitizenship@gmail.com', phone: '+678 7773595', whatsapp: '+678 7773595', address: 'Pango Area, Port Vila, Vanuatu' },
  seo: { title: 'Priority Citizenship — Vanuatu Immigration', description: 'Licensed Vanuatu immigration consultancy.' },
  smtp: { host: '', port: 587, user: '', pass: '', fromEmail: 'noreply@prioritycitizenship.vu' },
  notifications: { newLeadEmail: true, newAppointmentEmail: true, adminEmail: 'prioritycitizenship@gmail.com' },
};

function getSettings() {
  const s = readJSON(FILES.settings) || {};
  const merged = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  deepMerge(merged, s);
  return merged;
}

function updateSettings(updates) {
  const current = readJSON(FILES.settings) || {};
  deepMerge(current, updates);
  writeJSON(FILES.settings, current);
  logActivity('settings_updated', 'Settings updated');
  return getSettings();
}

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
}

// ─── Analytics ────────────────────────────────────────

function getAnalytics() {
  const a = readJSON(FILES.analytics) || { events: [], pageViews: {} };
  return a;
}

function trackEvent(type, data = {}) {
  const a = getAnalytics();
  a.events.push({ type, data, timestamp: nowISO() });
  if (a.events.length > 2000) a.events = a.events.slice(-2000);
  writeJSON(FILES.analytics, a);
}

function trackPageView(page) {
  const a = getAnalytics();
  a.pageViews[page] = (a.pageViews[page] || 0) + 1;
  writeJSON(FILES.analytics, a);
}

function getAnalyticsSummary() {
  const a = getAnalytics();
  const leads = getLeads();
  const appts = getAppointments();
  const posts = getPosts();
  const now = new Date();
  const last30d = new Date(now - 30 * 864e5).toISOString();
  const last7d  = new Date(now - 7  * 864e5).toISOString();
  const last90d = new Date(now - 90 * 864e5).toISOString();

  // Daily trend for last 30 days
  const dailyLeads = {};
  for (const l of leads) {
    const d = l.createdAt.split('T')[0];
    if (d >= last90d.split('T')[0]) dailyLeads[d] = (dailyLeads[d] || 0) + 1;
  }

  // Lead status distribution
  const statusCounts = { new: 0, contacted: 0, converted: 0, closed: 0 };
  leads.forEach(l => { if (statusCounts[l.status] !== undefined) statusCounts[l.status]++; });

  // Monthly trends (last 12 months)
  const monthlyLeads = {};
  for (let i = 11; i >= 0; i--) {
    const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthlyLeads[m.toISOString().slice(0, 7)] = 0;
  }
  leads.forEach(l => {
    const ym = l.createdAt.slice(0, 7);
    if (monthlyLeads[ym] !== undefined) monthlyLeads[ym]++;
  });

  // Conversion rate
  const contacted = leads.filter(l => l.status !== 'new').length;
  const conversionRate = leads.length ? Math.round((statusCounts.converted / leads.length) * 100) : 0;
  const contactRate = leads.length ? Math.round((contacted / leads.length) * 100) : 0;

  return {
    overview: {
      totalLeads: leads.length, leads7d: leads.filter(l => l.createdAt >= last7d).length, leads30d: leads.filter(l => l.createdAt >= last30d).length,
      totalAppts: appts.length, appts7d: appts.filter(a => a.createdAt >= last7d).length,
      totalPosts: posts.length, publishedPosts: posts.filter(p => p.published).length,
      conversionRate, contactRate,
    },
    statusDistribution: statusCounts,
    dailyTrend: Object.entries(dailyLeads).sort((a, b) => a[0].localeCompare(b[0])).slice(-30),
    monthlyTrend: Object.entries(monthlyLeads),
    topPages: Object.entries(a.pageViews).sort(([,a],[,b]) => b - a).slice(0, 10),
    recentActivity: (readJSON(FILES.activity) || []).slice(0, 20),
  };
}

// ─── Export ──────────────────────────────────────────

function exportCSV(type) {
  let data, headers;
  switch (type) {
    case 'leads':
      data = getLeads();
      headers = ['Name', 'Email', 'Phone', 'Country', 'Service', 'Budget', 'Status', 'Message', 'Date'];
      data = data.map(l => [l.name, l.email, l.phone, l.country, l.service, l.budget, l.status, l.message, l.createdAt]);
      break;
    case 'appointments':
      data = getAppointments();
      headers = ['Name', 'Email', 'Phone', 'Service', 'Status', 'Date'];
      data = data.map(a => [a.name, a.email, a.phone, a.service, a.status, a.createdAt]);
      break;
    case 'blog':
      data = getPosts();
      headers = ['Title', 'Category', 'Status', 'Published', 'Created'];
      data = data.map(p => [p.title, p.category, p.published ? 'Published' : 'Draft', p.published ? 'Yes' : 'No', p.createdAt]);
      break;
    default: return null;
  }
  const escapeCell = v => `"${String(v || '').replace(/"/g, '""')}"`;
  return [headers.join(','), ...data.map(row => row.map(escapeCell).join(','))].join('\n');
}

// ─── Helpers ─────────────────────────────────────────

function slugify(text) {
  return (text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'untitled';
}

module.exports = {
  getLeads, addLead, updateLead, deleteLead,
  getPosts, addPost, updatePost, deletePost,
  getAppointments, addAppointment, updateAppointment,
  getAnalytics, trackEvent, trackPageView, getAnalyticsSummary,
  getActivity, logActivity,
  getSettings, updateSettings,
  exportCSV,
};
