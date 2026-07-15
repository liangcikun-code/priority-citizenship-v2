/**
 * JSON File-based Data Store
 * Handles CRM leads, blog posts, FAQ modifications, and appointments.
 * In production, replace with a proper database (PostgreSQL, MongoDB, etc.)
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const FILES = {
  leads: path.join(DATA_DIR, 'leads.json'),
  blog: path.join(DATA_DIR, 'blog.json'),
  appointments: path.join(DATA_DIR, 'appointments.json'),
  analytics: path.join(DATA_DIR, 'analytics.json')
};

// ─── Generic helpers ──────────────────────────────────

function readJSON(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) { /* corrupted file */ }
  return null;
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// ─── CRM Leads ────────────────────────────────────────

function getLeads() {
  return readJSON(FILES.leads) || [];
}

function addLead(lead) {
  const leads = getLeads();
  const newLead = {
    id: 'lead_' + Date.now(),
    ...lead,
    status: lead.status || 'new',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  leads.push(newLead);
  writeJSON(FILES.leads, leads);
  trackEvent('lead_created', { leadId: newLead.id });
  return newLead;
}

function updateLead(id, updates) {
  const leads = getLeads();
  const idx = leads.findIndex(l => l.id === id);
  if (idx === -1) return null;
  leads[idx] = { ...leads[idx], ...updates, updatedAt: new Date().toISOString() };
  writeJSON(FILES.leads, leads);
  return leads[idx];
}

function deleteLead(id) {
  const leads = getLeads();
  const filtered = leads.filter(l => l.id !== id);
  if (filtered.length === leads.length) return false;
  writeJSON(FILES.leads, filtered);
  return true;
}

// ─── Blog Posts ───────────────────────────────────────

function getPosts() {
  return readJSON(FILES.blog) || [];
}

function addPost(post) {
  const posts = getPosts();
  const newPost = {
    id: 'post_' + Date.now(),
    title: post.title,
    slug: post.slug || post.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    excerpt: post.excerpt || '',
    content: post.content || '',
    category: post.category || 'general',
    tags: post.tags || [],
    published: post.published !== false,
    author: post.author || 'Priority Citizenship',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  posts.push(newPost);
  writeJSON(FILES.blog, posts);
  return newPost;
}

function updatePost(id, updates) {
  const posts = getPosts();
  const idx = posts.findIndex(p => p.id === id);
  if (idx === -1) return null;
  posts[idx] = { ...posts[idx], ...updates, updatedAt: new Date().toISOString() };
  writeJSON(FILES.blog, posts);
  return posts[idx];
}

function deletePost(id) {
  const posts = getPosts();
  const filtered = posts.filter(p => p.id !== id);
  if (filtered.length === posts.length) return false;
  writeJSON(FILES.blog, filtered);
  return true;
}

// ─── Appointments ─────────────────────────────────────

function getAppointments() {
  return readJSON(FILES.appointments) || [];
}

function addAppointment(appt) {
  const appointments = getAppointments();
  const newAppt = {
    id: 'appt_' + Date.now(),
    ...appt,
    status: appt.status || 'confirmed',
    createdAt: new Date().toISOString()
  };
  appointments.push(newAppt);
  writeJSON(FILES.appointments, appointments);
  trackEvent('appointment_booked', { appointmentId: newAppt.id });
  return newAppt;
}

function updateAppointment(id, updates) {
  const appointments = getAppointments();
  const idx = appointments.findIndex(a => a.id === id);
  if (idx === -1) return null;
  appointments[idx] = { ...appointments[idx], ...updates, updatedAt: new Date().toISOString() };
  writeJSON(FILES.appointments, appointments);
  return appointments[idx];
}

// ─── Analytics ────────────────────────────────────────

function getAnalytics() {
  return readJSON(FILES.analytics) || { events: [], pageViews: {} };
}

function trackEvent(type, data = {}) {
  const analytics = getAnalytics();
  analytics.events.push({
    type,
    data,
    timestamp: new Date().toISOString()
  });
  // Keep only last 1000 events
  if (analytics.events.length > 1000) {
    analytics.events = analytics.events.slice(-1000);
  }
  writeJSON(FILES.analytics, analytics);
}

function trackPageView(page) {
  const analytics = getAnalytics();
  analytics.pageViews[page] = (analytics.pageViews[page] || 0) + 1;
  writeJSON(FILES.analytics, analytics);
}

function getStats() {
  const leads = getLeads();
  const posts = getPosts();
  const appointments = getAppointments();
  const analytics = getAnalytics();

  const now = new Date();
  const last30d = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const last7d = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

  return {
    leads: {
      total: leads.length,
      new: leads.filter(l => l.status === 'new').length,
      contacted: leads.filter(l => l.status === 'contacted').length,
      converted: leads.filter(l => l.status === 'converted').length,
      last7Days: leads.filter(l => l.createdAt >= last7d).length,
      last30Days: leads.filter(l => l.createdAt >= last30d).length
    },
    appointments: {
      total: appointments.length,
      confirmed: appointments.filter(a => a.status === 'confirmed').length,
      completed: appointments.filter(a => a.status === 'completed').length,
      cancelled: appointments.filter(a => a.status === 'cancelled').length,
      last7Days: appointments.filter(a => a.createdAt >= last7d).length,
      last30Days: appointments.filter(a => a.createdAt >= last30d).length
    },
    blog: {
      total: posts.length,
      published: posts.filter(p => p.published).length,
      draft: posts.filter(p => !p.published).length
    },
    analytics: {
      totalEvents: analytics.events.length,
      recentEvents: analytics.events.filter(e => e.timestamp >= last7d).length,
      topPages: Object.entries(analytics.pageViews)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([page, count]) => ({ page, count }))
    }
  };
}

module.exports = {
  getLeads, addLead, updateLead, deleteLead,
  getPosts, addPost, updatePost, deletePost,
  getAppointments, addAppointment, updateAppointment,
  getAnalytics, trackEvent, trackPageView, getStats
};
