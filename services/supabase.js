/**
 * Supabase Client — falls back to in-memory when not configured.
 * Set SUPABASE_URL and SUPABASE_ANON_KEY env vars to enable persistence.
 */

let createClient;
try {
  const supabaseModule = require('@supabase/supabase-js');
  createClient = supabaseModule.createClient;
  console.log('[supabase] SDK loaded successfully, createClient type:', typeof createClient);
} catch (e) {
  console.error('[supabase] SDK load FAILED:', e.message);
} finally {
  // Always set up in-memory fallback even if SDK fails to load
  if (!createClient) {
    console.error('[supabase] createClient is not available - all data will use in-memory fallback');
  }
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Expose db reference for debug endpoint
let db = null;
try {
  if (supabaseUrl && supabaseKey && createClient) {
    const url = supabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
    console.log('[supabase] Attempting connection to: ' + url.replace(/\/\/.*@/, '//***@'));
    db = createClient(url, supabaseKey);
    console.log('[supabase] Connected successfully! db type:', typeof db);
  } else {
    console.error('[supabase] Cannot initialize - URL present:', !!supabaseUrl, ', KEY present:', !!supabaseKey, ', createClient present:', !!createClient);
  }
} catch (e) {
  console.error('[supabase] Failed to initialize:', e.message);
  console.error('[supabase] Stack:', e.stack);
  db = null;
}

if (!db) {
  console.warn('[supabase] Not configured — using in-memory storage. Data will NOT persist on Vercel.');
  console.warn('[supabase] Diagnostic: URL=' + !!supabaseUrl + ' KEY=' + !!supabaseKey + ' SDK=' + !!createClient);
}

const nowISO = () => new Date().toISOString();

// ═══════ In-Memory Fallback ═══════════════════════════
// Stores data in arrays; lost on cold start. Switches to
// Supabase PostgreSQL automatically when env vars are set.

const mem = {
  leads: [], blog: [], appointments: [], activity: [], analytics: [],
  settings: new Map(),
};

function genUUID() { try { return require('crypto').randomUUID(); } catch(e) { return Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,14); } }
function genId(prefix) { return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2,8); }

// ─── When DB is configured, delegate to Supabase ─────

async function supabaseQuery(table, method, ...args) {
  if (!db) return null; // Signal to use in-memory
  try {
    let query = db.from(table);
    if (method === 'select') {
      const { data, error } = await query.select(args[0] || '*').order(args[1] || 'created_at', { ascending: args[2] !== undefined ? args[2] : false }).limit(args[3] || 1000);
      if (error) throw error;
      return data;
    }
    if (method === 'insert') {
      const { data, error } = await query.insert(args[0]).select().single();
      if (error) throw error;
      return data;
    }
    if (method === 'update') {
      const { data, error } = await query.update(args[0]).eq(args[1], args[2]).select().single();
      if (error) throw error;
      return data;
    }
    if (method === 'delete') {
      await query.delete().eq(args[0], args[1]);
      return true;
    }
  } catch (e) {
    console.error(`[supabase] ${table}.${method} error — falling back to in-memory:`, e.message);
    return null; // Return null signals caller to use in-memory fallback
  }
}

// ═══════ Public API — Supabase Primary, Memory Fallback ═════
// Supabase PostgreSQL is the source of truth. In-memory is fallback only.

// ─── Leads ────────────────────────────────────────────
async function getLeads(filters = {}) {
  let data = [];

  // Read from Supabase first (primary source of truth)
  if (db) {
    const rows = await supabaseQuery('leads', 'select', '*', 'created_at', false);
    if (rows && rows.length > 0) {
      data = rows.map(l => ({id:l.id,name:l.name,email:l.email,phone:l.phone,country:l.country,service:l.service,budget:l.budget,message:l.message,notes:l.notes,status:l.status,source:l.source,createdAt:l.created_at,updatedAt:l.updated_at}));
      // Sync to memory for fast access
      mem.leads = data.map(l => ({...l}));
      saveMemToDisk();
    }
  }

  // Fallback to in-memory
  if (data.length === 0) {
    data = mem.leads.slice().reverse();
    if (data.length > 0) console.log('[supabase] Using in-memory fallback:', data.length, 'leads');
  }

  if (filters.status)  data = data.filter(l => l.status === filters.status);
  if (filters.service) data = data.filter(l => l.service === filters.service);
  if (filters.search)  { const s = filters.search.toLowerCase(); data = data.filter(l => (l.name+l.email).toLowerCase().includes(s)); }
  if (filters.from)    data = data.filter(l => l.createdAt >= filters.from);
  return data;
}

async function addLead(lead) {
  // Write to Supabase first (primary storage)
  if (db) {
    const row = { id: lead.id || genUUID(), name:lead.name, email:lead.email, phone:lead.phone||'', country:lead.country||'', service:lead.service||'other', budget:lead.budget||'', message:lead.message||'', notes:lead.notes||'', status:lead.status||'new', source:lead.source||'website', created_at:nowISO(), updated_at:nowISO() };
    const d = await supabaseQuery('leads', 'insert', row);
    if (d) {
      console.log('[supabase] Lead saved:', lead.email);
      // Also cache in memory
      const nl = {id:d.id,name:d.name,email:d.email,phone:d.phone,country:d.country,service:d.service,budget:d.budget,message:d.message,notes:d.notes,status:d.status,source:d.source,createdAt:d.created_at,updatedAt:d.updated_at};
      mem.leads.push(nl);
      saveMemToDisk();
      return nl;
    }
    console.error('[supabase] Lead insert FAILED — falling back to in-memory');
  }

  // In-memory fallback (only when Supabase fails or is unavailable)
  const nl = {id:genId('lead'),...lead,status:lead.status||'new',createdAt:nowISO(),updatedAt:nowISO()};
  mem.leads.push(nl);
  mem.activity.unshift({id:genId('act'),type:'lead_created',message:`New lead: ${lead.name}`,subject:lead.name,created_at:nowISO()});
  saveMemToDisk();
  return nl;
}

async function updateLead(id, updates) {
  if (db) {
    const d = await supabaseQuery('leads', 'update', {...updates,updated_at:nowISO()}, 'id', id);
    if (d) {
      // Also update memory cache
      const idx = mem.leads.findIndex(l=>l.id===id);
      if (idx >= 0) { mem.leads[idx] = {...mem.leads[idx],...updates,updatedAt:nowISO()}; saveMemToDisk(); }
      return {id:d.id,name:d.name,email:d.email,phone:d.phone,country:d.country,service:d.service,budget:d.budget,message:d.message,notes:d.notes,status:d.status,source:d.source,createdAt:d.created_at,updatedAt:d.updated_at};
    }
  }
  // In-memory fallback
  const idx = mem.leads.findIndex(l=>l.id===id);
  if(idx===-1) return null;
  mem.leads[idx] = {...mem.leads[idx],...updates,updatedAt:nowISO()};
  saveMemToDisk();
  return mem.leads[idx];
}

async function deleteLead(id) {
  if (db) { const r = await supabaseQuery('leads','delete','id',id); if (r !== null) { mem.leads = mem.leads.filter(l=>l.id!==id); saveMemToDisk(); return true; } }
  const idx = mem.leads.findIndex(l=>l.id===id);
  if(idx>-1) { mem.leads.splice(idx,1); saveMemToDisk(); }
  return true;
}

// ─── Blog ─────────────────────────────────────────────
async function getPosts() {
  if (db) {
    const d = await supabaseQuery('blog_posts','select','*','created_at',false);
    if (d && Array.isArray(d)) return d.map(p=>({id:p.id,title:p.title,slug:p.slug,excerpt:p.excerpt,content:p.content,category:p.category,published:p.published,author:p.author,createdAt:p.created_at,updatedAt:p.updated_at}));
  }
  return mem.blog.slice().reverse();
}

async function addPost(post) {
  const slug = (post.title||'untitled').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')+'-'+Date.now().toString(36);
  if (db) {
    const row = { id: post.id || genUUID(), title:post.title, slug, excerpt:post.excerpt||'', content:post.content||'', category:post.category||'general', published:post.published!==false, author:post.author||'Priority Citizenship', created_at:nowISO(), updated_at:nowISO() };
    const d = await supabaseQuery('blog_posts','insert',row);
    if (d) {
      console.log('[supabase] Blog post saved:', post.title);
      const np = {id:d.id,title:d.title,slug:d.slug,excerpt:d.excerpt,content:d.content,category:d.category,published:d.published,author:d.author,createdAt:d.created_at,updatedAt:d.updated_at};
      mem.blog.push(np);
      saveMemToDisk();
      await logActivity('post_created',`Blog: ${post.title}`,post.title);
      return np;
    }
    console.error('[supabase] Blog post insert FAILED — falling back to in-memory');
    await logActivity('post_created',`Blog: ${post.title}`,post.title);
    return d;
  }
  const np = {id:genId('post'),...post,slug,published:post.published!==false,createdAt:nowISO(),updatedAt:nowISO()};
  mem.blog.push(np);
  mem.activity.unshift({id:genId('act'),type:'post_created',message:`Blog: ${post.title}`,subject:post.title,created_at:nowISO()});
  return np;
}

async function updatePost(id, updates) {
  if (db) return supabaseQuery('blog_posts','update',{...updates,updated_at:nowISO()},'id',id);
  const idx = mem.blog.findIndex(p=>p.id===id);
  if(idx===-1) return null;
  mem.blog[idx] = {...mem.blog[idx],...updates,updatedAt:nowISO()};
  return mem.blog[idx];
}

async function deletePost(id) {
  if (db) { await supabaseQuery('blog_posts','delete','id',id); return true; }
  const idx = mem.blog.findIndex(p=>p.id===id);
  if(idx>-1) mem.blog.splice(idx,1);
  return true;
}

// ─── Appointments ─────────────────────────────────────
async function getAppointments() {
  let data = [];
  if (db) {
    const d = await supabaseQuery('appointments','select','*','created_at',false);
    if (d && d.length > 0) {
      data = d.map(a=>({id:a.id,slotId:a.slot_id,name:a.name,email:a.email,phone:a.phone,service:a.service,message:a.message,slotLabel:a.slot_label,status:a.status,createdAt:a.created_at}));
      mem.appointments = data.map(a => ({...a}));
      saveMemToDisk();
    }
  }
  if (data.length === 0) data = mem.appointments.slice().reverse();
  return data;
}

async function addAppointment(appt) {
  if (db) {
    const row = { id: appt.id || genUUID(), slot_id:appt.slotId,name:appt.name,email:appt.email,phone:appt.phone||'',service:appt.service||'general',message:appt.message||'',slot_label:appt.slotLabel||'',status:appt.status||'confirmed',created_at:nowISO()};
    const d = await supabaseQuery('appointments','insert',row);
    if (d) {
      console.log('[supabase] Appointment saved');
      const na = {id:d.id,slotId:d.slot_id,name:d.name,email:d.email,phone:d.phone,service:d.service,message:d.message,slotLabel:d.slot_label,status:d.status,createdAt:d.created_at};
      mem.appointments.push(na);
      saveMemToDisk();
      return na;
    }
    console.error('[supabase] Appointment insert FAILED — falling back to in-memory');
  }
  const na = {id:genId('appt'),...appt,status:appt.status||'confirmed',createdAt:nowISO()};
  mem.appointments.push(na);
  saveMemToDisk();
  return na;
}

async function updateAppointment(id, updates) {
  if (db) { const d = await supabaseQuery('appointments','update',{...updates,updated_at:nowISO()},'id',id); if (d) return d; }
  const idx = mem.appointments.findIndex(a=>a.id===id);
  if(idx===-1) return null;
  mem.appointments[idx] = {...mem.appointments[idx],...updates,updatedAt:nowISO()};
  saveMemToDisk();
  return mem.appointments[idx];
}

// ─── Activity ────────────────────────────────────────
async function getActivity(limit=50) {
  if (db) { const d = await supabaseQuery('activity_log','select','*','created_at',false); return d.slice(0,limit); }
  return mem.activity.slice(0,limit);
}

async function logActivity(type, message, subject) {
  if (db) { await supabaseQuery('activity_log','insert',{ id: genUUID(), type, message, subject:subject||'', created_at:nowISO() }); return; }
  mem.activity.unshift({id:genId('act'),type,message,subject:subject||'',created_at:nowISO()});
  if (mem.activity.length > 500) mem.activity.length = 500;
}

// ─── Settings ────────────────────────────────────────
const DEFAULT_SETTINGS = {
  site:{name:'Priority Citizenship Limited',tagline:'Your Pathway to Vanuatu Citizenship'},
  contact:{email:'prioritycitizenship@gmail.com',phone:'+678 7773595',whatsapp:'+678 7773595',address:'Pango Area, Port Vila, Vanuatu'},
  seo:{title:'Priority Citizenship — Vanuatu Immigration',description:'Licensed Vanuatu immigration consultancy.'},
};

async function getSettings() {
  if (db) {
    const {data} = await db.from('settings').select('*');
    const merged = {...DEFAULT_SETTINGS};
    (data||[]).forEach(r=>{try{merged[r.key]=r.value}catch(e){}});
    return merged;
  }
  const merged = {...DEFAULT_SETTINGS};
  mem.settings.forEach((v,k)=>{merged[k]=v;});
  return merged;
}

async function updateSettings(key, value) {
  if (db) { await db.from('settings').upsert({key,value,updated_at:nowISO()},{onConflict:'key'}); return; }
  mem.settings.set(key, value);
  await logActivity('settings_updated',`Setting: ${key}`);
}

// ─── Analytics ────────────────────────────────────────
async function trackEvent(type, data={}) {
  if (db) { await db.from('analytics').insert({type,data,created_at:nowISO()}); return; }
  mem.analytics.push({type,data,timestamp:nowISO()});
}

async function getAnalyticsSummary() {
  const leads = await getLeads();
  const appts = await getAppointments();
  const posts = await getPosts();
  const now = new Date();
  const last30d = new Date(now-30*864e5).toISOString();
  const last7d = new Date(now-7*864e5).toISOString();

  const sc = {new:0,contacted:0,converted:0,closed:0};
  leads.forEach(l=>{if(sc[l.status]!==undefined)sc[l.status]++;});

  const daily={};
  for(let i=29;i>=0;i--){const d=new Date(now);d.setDate(d.getDate()-i);daily[d.toISOString().slice(0,10)]=0;}
  leads.forEach(l=>{const d=(l.createdAt||'').slice(0,10);if(daily[d]!==undefined)daily[d]++;});

  const activity = await getActivity(10);
  const conversion = leads.length?Math.round((sc.converted/leads.length)*100):0;
  const contactRate = leads.length?Math.round((leads.filter(l=>l.status!=='new').length/leads.length)*100):0;

  return {
    overview:{totalLeads:leads.length,leads7d:leads.filter(l=>l.createdAt>=last7d).length,leads30d:leads.filter(l=>l.createdAt>=last30d).length,totalAppts:appts.length,appts7d:0,totalPosts:posts.length,publishedPosts:posts.filter(p=>p.published).length,conversionRate:conversion,contactRate},
    statusDistribution:sc,dailyTrend:Object.entries(daily),monthlyTrend:[],topPages:[],recentActivity:activity
  };
}

// ─── Export ──────────────────────────────────────────
async function exportCSV(type) {
  let data, headers;
  switch(type) {
    case 'leads': {
      const rows = await getLeads();
      data = rows.map(l=>[l.name,l.email,l.phone,l.country,l.service,l.budget,l.status,l.message,l.createdAt]);
      headers = ['Name','Email','Phone','Country','Service','Budget','Status','Message','Date']; break;
    }
    case 'appointments': {
      const rows = await getAppointments();
      data = rows.map(a=>[a.name,a.email,a.phone,a.service,a.status,a.createdAt]);
      headers = ['Name','Email','Phone','Service','Status','Date']; break;
    }
    default: return null;
  }
  const esc=v=>`"${String(v||'').replace(/"/g,'""')}"`;
  return [headers.join(','),...data.map(r=>r.map(esc).join(','))].join('\n');
}

// ═══════ Disk Persistence (survives warm starts) ═══════
const fs = require('fs');
const path = require('path');
const TMP_DIR = process.env.VERCEL ? '/tmp' : (__dirname + '/../data');
const TMP_FILE = path.join(TMP_DIR, 'leads-backup.json');

function saveMemToDisk() {
  try {
    if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
    fs.writeFileSync(TMP_FILE, JSON.stringify({
      leads: mem.leads,
      blog: mem.blog,
      appointments: mem.appointments,
      activity: mem.activity.slice(0, 100),
      updatedAt: nowISO()
    }));
  } catch (e) { /* /tmp not writable — ignore */ }
}

function loadMemFromDisk() {
  try {
    if (fs.existsSync(TMP_FILE)) {
      const raw = fs.readFileSync(TMP_FILE, 'utf8');
      const data = JSON.parse(raw);
      if (data.leads && Array.isArray(data.leads)) mem.leads = data.leads;
      if (data.blog && Array.isArray(data.blog)) mem.blog = data.blog;
      if (data.appointments && Array.isArray(data.appointments)) mem.appointments = data.appointments;
      if (data.activity && Array.isArray(data.activity)) mem.activity = data.activity;
      console.log(`[supabase] Loaded ${mem.leads.length} leads, ${mem.appointments.length} appts from disk backup`);
    }
  } catch (e) { /* File doesn't exist or corrupted — fresh start */ }
}

// Initialize: load from disk if available, then migrate to Supabase if connected
loadMemFromDisk();

// If Supabase is connected and we have stranded disk backup data, push it to Supabase
(async function migrateDiskToSupabase() {
  if (!db) return;
  try {
    let migrated = 0;

    // Migrate leads by checking if Supabase has any data at all
    const supabaseHasLeads = await supabaseQuery('leads', 'select', 'id', 'created_at', false, 1).then(r => Array.isArray(r) && r.length > 0).catch(() => false);
    if (!supabaseHasLeads) {
      for (const l of mem.leads) {
        try {
          const row = { id: l.id || genUUID(), name: l.name, email: l.email, phone: l.phone || '', country: l.country || '', service: l.service || 'other', budget: l.budget || '', message: l.message || '', notes: l.notes || '', status: l.status || 'new', source: l.source || 'website', created_at: l.createdAt || nowISO(), updated_at: l.updatedAt || nowISO() };
          await supabaseQuery('leads', 'insert', row);
          migrated++;
        } catch(e) {}
      }
    }

    // Migrate blog posts
    for (const p of mem.blog) {
      try {
        const row = { id: p.id || genUUID(), title: p.title, slug: p.slug || '', excerpt: p.excerpt || '', content: p.content || '', category: p.category || 'general', published: p.published !== false, author: p.author || 'Priority Citizenship', created_at: p.createdAt || nowISO(), updated_at: p.updatedAt || nowISO() };
        await supabaseQuery('blog_posts', 'insert', row);
        migrated++;
      } catch(e) {}
    }

    // Migrate appointments
    for (const a of mem.appointments) {
      try {
        const row = { id: a.id || genUUID(), slot_id: a.slotId || '', name: a.name, email: a.email, phone: a.phone || '', service: a.service || 'general', message: a.message || '', slot_label: a.slotLabel || '', status: a.status || 'confirmed', created_at: a.createdAt || nowISO() };
        await supabaseQuery('appointments', 'insert', row);
        migrated++;
      } catch(e) {}
    }

    if (migrated > 0) {
      console.log(`[supabase] Migrated ${migrated} records from disk backup to Supabase`);
      mem.leads = []; mem.blog = []; mem.appointments = [];
      saveMemToDisk();
    }
  } catch (e) {
    console.error('[supabase] Migration failed:', e.message);
  }
})();

module.exports = {
  getLeads, addLead, updateLead, deleteLead,
  getPosts, addPost, updatePost, deletePost,
  getAppointments, addAppointment, updateAppointment,
  getActivity, logActivity,
  getSettings, updateSettings,
  trackEvent, getAnalyticsSummary,
  exportCSV,
  get db() { return db; }
};
