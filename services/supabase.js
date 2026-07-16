/**
 * Supabase Client & Database Layer
 * Replaces JSON file storage with PostgreSQL.
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('[supabase] SUPABASE_URL or SUPABASE_ANON_KEY not set — data will NOT persist on Vercel.');
}

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

const nowISO = () => new Date().toISOString();

// ═══════════════════════════════════════════════════════
//  SQL SCHEMA (run this in Supabase SQL Editor):
// ═══════════════════════════════════════════════════════
/*
CREATE TABLE leads (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  country TEXT DEFAULT '',
  service TEXT DEFAULT 'other',
  budget TEXT DEFAULT '',
  message TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'new',
  source TEXT DEFAULT 'website',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE blog_posts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT DEFAULT '',
  content TEXT DEFAULT '',
  category TEXT DEFAULT 'general',
  tags TEXT[] DEFAULT '{}',
  published BOOLEAN DEFAULT true,
  author TEXT DEFAULT 'Priority Citizenship',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE appointments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  slot_id TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  service TEXT DEFAULT 'general',
  message TEXT DEFAULT '',
  slot_label TEXT DEFAULT '',
  status TEXT DEFAULT 'confirmed',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE activity_log (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  subject TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE analytics (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_created ON leads(created_at DESC);
CREATE INDEX idx_blog_slug ON blog_posts(slug);
CREATE INDEX idx_activity_created ON activity_log(created_at DESC);
CREATE INDEX idx_appointments_status ON appointments(status);
*/

// ═══════════════════════════════════════════════════════

// ─── Helpers ──────────────────────────────────────────

function requireDB() {
  if (!supabase) throw new Error('Database not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.');
  return supabase;
}

// ─── CRM Leads ────────────────────────────────────────

async function getLeads(filters = {}) {
  const db = requireDB();
  let query = db.from('leads').select('*').order('created_at', { ascending: false });
  if (filters.status)  query = query.eq('status', filters.status);
  if (filters.service) query = query.eq('service', filters.service);
  if (filters.search)  query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
  if (filters.from)    query = query.gte('created_at', filters.from);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(formatLead);
}

async function addLead(lead) {
  const db = requireDB();
  const row = { name: lead.name, email: lead.email, phone: lead.phone || '', country: lead.country || '', service: lead.service || 'other', budget: lead.budget || '', message: lead.message || '', notes: lead.notes || '', status: lead.status || 'new', source: lead.source || 'website', created_at: nowISO(), updated_at: nowISO() };
  const { data, error } = await db.from('leads').insert(row).select().single();
  if (error) throw error;
  await logActivity('lead_created', `New lead: ${lead.name}`, lead.name);
  return formatLead(data);
}

async function updateLead(id, updates) {
  const db = requireDB();
  const u = { ...updates, updated_at: nowISO() };
  if (u.name !== undefined) { u.name = u.name; }
  if (u.email !== undefined) { u.email = u.email; }
  const { data, error } = await db.from('leads').update(u).eq('id', id).select().single();
  if (error) throw error;
  if (updates.status && updates.status !== data.status) {
    await logActivity('lead_status', `${data.name}: status → ${updates.status}`, data.name);
  }
  return formatLead(data);
}

async function deleteLead(id) {
  const db = requireDB();
  const { data: old } = await db.from('leads').select('name').eq('id', id).single();
  const { error } = await db.from('leads').delete().eq('id', id);
  if (error) throw error;
  if (old) await logActivity('lead_deleted', `Deleted lead: ${old.name}`, old.name);
  return true;
}

// ─── Blog ─────────────────────────────────────────────

async function getPosts() {
  const db = requireDB();
  const { data, error } = await db.from('blog_posts').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function addPost(post) {
  const db = requireDB();
  const row = { title: post.title, slug: slugify(post.title), excerpt: post.excerpt || '', content: post.content || '', category: post.category || 'general', published: post.published !== false, author: post.author || 'Priority Citizenship', created_at: nowISO(), updated_at: nowISO() };
  const { data, error } = await db.from('blog_posts').insert(row).select().single();
  if (error) throw error;
  await logActivity('post_created', `Blog: ${post.title}`, post.title);
  return data;
}

async function updatePost(id, updates) {
  const db = requireDB();
  if (updates.title) updates.slug = slugify(updates.title);
  const u = { ...updates, updated_at: nowISO() };
  const { data, error } = await db.from('blog_posts').update(u).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

async function deletePost(id) {
  const db = requireDB();
  const { data: old } = await db.from('blog_posts').select('title').eq('id', id).single();
  const { error } = await db.from('blog_posts').delete().eq('id', id);
  if (error) throw error;
  if (old) await logActivity('post_deleted', `Blog deleted: ${old.title}`, old.title);
  return true;
}

// ─── Appointments ─────────────────────────────────────

async function getAppointments() {
  const db = requireDB();
  const { data, error } = await db.from('appointments').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function addAppointment(appt) {
  const db = requireDB();
  const row = { slot_id: appt.slotId, name: appt.name, email: appt.email, phone: appt.phone || '', service: appt.service || 'general', message: appt.message || '', slot_label: appt.slotLabel || '', status: appt.status || 'confirmed', created_at: nowISO() };
  const { data, error } = await db.from('appointments').insert(row).select().single();
  if (error) throw error;
  await logActivity('appointment_booked', `Booking: ${appt.name}`, appt.name);
  return data;
}

async function updateAppointment(id, updates) {
  const db = requireDB();
  const u = { ...updates, updated_at: nowISO() };
  const { data, error } = await db.from('appointments').update(u).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

// ─── Activity Log ────────────────────────────────────

async function getActivity(limit = 50) {
  const db = requireDB();
  const { data, error } = await db.from('activity_log').select('*').order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return data || [];
}

async function logActivity(type, message, subject) {
  const db = requireDB();
  const { error } = await db.from('activity_log').insert({ type, message, subject: subject || '', created_at: nowISO() });
  if (error) console.error('[activity]', error);
}

// ─── Settings ────────────────────────────────────────

const DEFAULT_SETTINGS = {
  site: { name: 'Priority Citizenship Limited', tagline: 'Your Pathway to Vanuatu Citizenship' },
  contact: { email: 'prioritycitizenship@gmail.com', phone: '+678 7773595', whatsapp: '+678 7773595', address: 'Pango Area, Port Vila, Vanuatu' },
  seo: { title: 'Priority Citizenship — Vanuatu Immigration', description: 'Licensed Vanuatu immigration consultancy.' },
};

async function getSettings() {
  const db = requireDB();
  const { data, error } = await db.from('settings').select('*');
  if (error) throw error;
  const merged = { ...DEFAULT_SETTINGS };
  (data || []).forEach(row => {
    try { merged[row.key] = row.value; } catch (e) {}
  });
  return merged;
}

async function updateSettings(key, value) {
  const db = requireDB();
  const { error } = await db.from('settings').upsert({ key, value, updated_at: nowISO() }, { onConflict: 'key' });
  if (error) throw error;
  await logActivity('settings_updated', `Setting: ${key}`);
  return getSettings();
}

// ─── Analytics ────────────────────────────────────────

async function trackEvent(type, data = {}) {
  const db = requireDB();
  const { error } = await db.from('analytics').insert({ type, data, created_at: nowISO() });
  if (error) console.error('[analytics]', error);
}

async function getAnalyticsSummary() {
  const db = requireDB();
  const { data: leads, error } = await db.from('leads').select('status, created_at');
  if (error) throw error;

  const now = new Date();
  const last30d = new Date(now - 30 * 864e5).toISOString();
  const last7d  = new Date(now - 7  * 864e5).toISOString();

  const statusCounts = { new: 0, contacted: 0, converted: 0, closed: 0 };
  (leads || []).forEach(l => { if (statusCounts[l.status] !== undefined) statusCounts[l.status]++; });

  const dailyTrend = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dailyTrend[d.toISOString().slice(0, 10)] = 0;
  }
  (leads || []).forEach(l => {
    const d = l.created_at.slice(0, 10);
    if (dailyTrend[d] !== undefined) dailyTrend[d]++;
  });

  const { count: totalAppts } = await db.from('appointments').select('*', { count: 'exact', head: true });
  const { count: publishedPosts } = await db.from('blog_posts').select('*', { count: 'exact', head: true }).eq('published', true);
  const { data: recentAct } = await db.from('activity_log').select('*').order('created_at', { ascending: false }).limit(10);

  const contacted = (leads || []).filter(l => l.status !== 'new').length;
  const conversionRate = leads.length ? Math.round((statusCounts.converted / leads.length) * 100) : 0;
  const contactRate = leads.length ? Math.round((contacted / leads.length) * 100) : 0;

  return {
    overview: {
      totalLeads: (leads || []).length, leads7d: (leads || []).filter(l => l.created_at >= last7d).length, leads30d: (leads || []).filter(l => l.created_at >= last30d).length,
      totalAppts: totalAppts || 0, appts7d: 0,
      totalPosts: publishedPosts || 0, publishedPosts: publishedPosts || 0,
      conversionRate, contactRate,
    },
    statusDistribution: statusCounts,
    dailyTrend: Object.entries(dailyTrend),
    monthlyTrend: [],
    topPages: [],
    recentActivity: recentAct || [],
  };
}

// ─── Export CSV ───────────────────────────────────────

async function exportCSV(type) {
  const db = requireDB();
  let data, headers;
  switch (type) {
    case 'leads': {
      const { data: rows } = await db.from('leads').select('*').order('created_at', { ascending: false });
      data = (rows || []).map(l => [l.name, l.email, l.phone, l.country, l.service, l.budget, l.status, l.message, l.created_at]);
      headers = ['Name', 'Email', 'Phone', 'Country', 'Service', 'Budget', 'Status', 'Message', 'Date'];
      break;
    }
    case 'appointments': {
      const { data: rows } = await db.from('appointments').select('*').order('created_at', { ascending: false });
      data = (rows || []).map(a => [a.name, a.email, a.phone, a.service, a.status, a.created_at]);
      headers = ['Name', 'Email', 'Phone', 'Service', 'Status', 'Date'];
      break;
    }
    default: return null;
  }
  const escapeCell = v => `"${String(v || '').replace(/"/g, '""')}"`;
  return [headers.join(','), ...data.map(row => row.map(escapeCell).join(','))].join('\n');
}

// ─── Helpers ─────────────────────────────────────────

function formatLead(l) {
  return { id: l.id, name: l.name, email: l.email, phone: l.phone, country: l.country, service: l.service, budget: l.budget, message: l.message, notes: l.notes, status: l.status, source: l.source, createdAt: l.created_at, updatedAt: l.updated_at };
}

function slugify(text) {
  const base = (text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'untitled';
  return base + '-' + Date.now().toString(36);
}

module.exports = {
  getLeads, addLead, updateLead, deleteLead,
  getPosts, addPost, updatePost, deletePost,
  getAppointments, addAppointment, updateAppointment,
  getActivity, logActivity,
  getSettings, updateSettings,
  trackEvent, getAnalyticsSummary,
  exportCSV,
  // Export for schema setup
};
