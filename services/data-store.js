/**
 * Unified Data Store — delegates to Supabase when configured, falls back to JSON files.
 * All functions are async for Vercel serverless compatibility.
 */

const supabase = require('./supabase');

// Check if Supabase is active
function isSupabase() {
  return supabase && typeof supabase.getLeads === 'function';
}

// ============== CRM Leads ==============

async function getLeads(filters = {}) {
  return supabase.getLeads(filters);
}

async function addLead(lead) {
  return supabase.addLead(lead);
}

async function updateLead(id, updates) {
  return supabase.updateLead(id, updates);
}

async function deleteLead(id) {
  return supabase.deleteLead(id);
}

// ============== Blog Posts ==============

async function getPosts() {
  return supabase.getPosts();
}

async function addPost(post) {
  return supabase.addPost(post);
}

async function updatePost(id, updates) {
  return supabase.updatePost(id, updates);
}

async function deletePost(id) {
  return supabase.deletePost(id);
}

// ============== Appointments ==============

async function getAppointments() {
  return supabase.getAppointments();
}

async function addAppointment(appt) {
  return supabase.addAppointment(appt);
}

async function updateAppointment(id, updates) {
  return supabase.updateAppointment(id, updates);
}

// ============== Activity ==============

async function getActivity(limit = 50) {
  return supabase.getActivity(limit);
}

async function logActivity(type, message, subject) {
  return supabase.logActivity(type, message, subject);
}

// ============== Settings ==============

async function getSettings() {
  return supabase.getSettings();
}

async function updateSettings(updates) {
  // Accept partial updates by key
  const results = {};
  for (const [key, value] of Object.entries(updates)) {
    results[key] = await supabase.updateSettings(key, value);
  }
  return getSettings();
}

// ============== Analytics ==============

async function trackEvent(type, data = {}) {
  return supabase.trackEvent(type, data);
}

async function getAnalyticsSummary() {
  return supabase.getAnalyticsSummary();
}

// ============== Export ==============

async function exportCSV(type) {
  return supabase.exportCSV(type);
}

module.exports = {
  getLeads, addLead, updateLead, deleteLead,
  getPosts, addPost, updatePost, deletePost,
  getAppointments, addAppointment, updateAppointment,
  getActivity, logActivity,
  getSettings, updateSettings,
  trackEvent, getAnalyticsSummary,
  exportCSV,
};
