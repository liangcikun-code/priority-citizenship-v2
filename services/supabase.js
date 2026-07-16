/**
 * Supabase Client — falls back to in-memory when not configured.
 * Set SUPABASE_URL and SUPABASE_ANON_KEY env vars to enable persistence.
 */

let createClient;
try { createClient = require('@supabase/supabase-js').createClient; }
catch (e) { /* supabase-js not installed */ }

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const db = (supabaseUrl && supabaseKey && createClient)
  ? createClient(supabaseUrl, supabaseKey)
  : null;

if (!db) {
  console.warn('[supabase] Not configured — using in-memory storage. Data will NOT persist on Vercel.');
}

const nowISO = () => new Date().toISOString();

// ═══════ In-Memory Fallback ═══════════════════════════
// Stores data in arrays; lost on cold start. Switches to
// Supabase PostgreSQL automatically when env vars are set.

const mem = {
  leads: [], blog: [], appointments: [], activity: [], analytics: [],
  settings: new Map(),
};

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
    console.error(`[supabase] ${table}.${method} error:`, e.message);
    throw e;
  }
}

// ═══════ Public API (in-memory when no DB) ═══════════

// ─── Leads ────────────────────────────────────────────
async function getLeads(filters = {}) {
  let data = db ? (await supabaseQuery('leads', 'select', '*', 'created_at', false)) : mem.leads;
  if (db) data = data.map(l => ({id:l.id,name:l.name,email:l.email,phone:l.phone,country:l.country,service:l.service,budget:l.budget,message:l.message,notes:l.notes,status:l.status,source:l.source,createdAt:l.created_at,updatedAt:l.updated_at}));
  else data = data.slice().reverse();

  if (filters.status)  data = data.filter(l => l.status === filters.status);
  if (filters.service) data = data.filter(l => l.service === filters.service);
  if (filters.search)  { const s = filters.search.toLowerCase(); data = data.filter(l => (l.name+l.email).toLowerCase().includes(s)); }
  if (filters.from)    data = data.filter(l => l.createdAt >= filters.from);
  return data;
}

async function addLead(lead) {
  if (db) {
    const row = { name:lead.name, email:lead.email, phone:lead.phone||'', country:lead.country||'', service:lead.service||'other', budget:lead.budget||'', message:lead.message||'', notes:lead.notes||'', status:lead.status||'new', source:lead.source||'website', created_at:nowISO(), updated_at:nowISO() };
    const d = await supabaseQuery('leads', 'insert', row);
    await logActivity('lead_created', `New lead: ${lead.name}`, lead.name);
    return {id:d.id,name:d.name,email:d.email,phone:d.phone,country:d.country,service:d.service,budget:d.budget,message:d.message,notes:d.notes,status:d.status,source:d.source,createdAt:d.created_at,updatedAt:d.updated_at};
  }
  const nl = {id:genId('lead'),...lead,status:lead.status||'new',createdAt:nowISO(),updatedAt:nowISO()};
  mem.leads.push(nl);
  mem.activity.unshift({id:genId('act'),type:'lead_created',message:`New lead: ${lead.name}`,subject:lead.name,created_at:nowISO()});
  return nl;
}

async function updateLead(id, updates) {
  if (db) {
    const d = await supabaseQuery('leads', 'update', {...updates,updated_at:nowISO()}, 'id', id);
    await logActivity('lead_updated', `Lead updated: ${d.name}`, d.name);
    return {id:d.id,name:d.name,email:d.email,phone:d.phone,country:d.country,service:d.service,budget:d.budget,message:d.message,notes:d.notes,status:d.status,source:d.source,createdAt:d.created_at,updatedAt:d.updated_at};
  }
  const idx = mem.leads.findIndex(l=>l.id===id);
  if(idx===-1) return null;
  mem.leads[idx] = {...mem.leads[idx],...updates,updatedAt:nowISO()};
  return mem.leads[idx];
}

async function deleteLead(id) {
  if (db) { await supabaseQuery('leads','delete','id',id); return true; }
  const idx = mem.leads.findIndex(l=>l.id===id);
  if(idx>-1) mem.leads.splice(idx,1);
  return true;
}

// ─── Blog ─────────────────────────────────────────────
async function getPosts() {
  if (db) {
    const d = await supabaseQuery('blog_posts','select','*','created_at',false);
    return d.map(p=>({id:p.id,title:p.title,slug:p.slug,excerpt:p.excerpt,content:p.content,category:p.category,published:p.published,author:p.author,createdAt:p.created_at,updatedAt:p.updated_at}));
  }
  return mem.blog.slice().reverse();
}

async function addPost(post) {
  const slug = (post.title||'untitled').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')+'-'+Date.now().toString(36);
  if (db) {
    const row = {title:post.title,slug,excerpt:post.excerpt||'',content:post.content||'',category:post.category||'general',published:post.published!==false,author:post.author||'Priority Citizenship',created_at:nowISO(),updated_at:nowISO()};
    const d = await supabaseQuery('blog_posts','insert',row);
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
  if (db) {
    const d = await supabaseQuery('appointments','select','*','created_at',false);
    return d.map(a=>({id:a.id,slotId:a.slot_id,name:a.name,email:a.email,phone:a.phone,service:a.service,message:a.message,slotLabel:a.slot_label,status:a.status,createdAt:a.created_at}));
  }
  return mem.appointments.slice().reverse();
}

async function addAppointment(appt) {
  if (db) {
    const row = {slot_id:appt.slotId,name:appt.name,email:appt.email,phone:appt.phone||'',service:appt.service||'general',message:appt.message||'',slot_label:appt.slotLabel||'',status:appt.status||'confirmed',created_at:nowISO()};
    return supabaseQuery('appointments','insert',row);
  }
  const na = {id:genId('appt'),...appt,status:appt.status||'confirmed',createdAt:nowISO()};
  mem.appointments.push(na);
  return na;
}

async function updateAppointment(id, updates) {
  if (db) return supabaseQuery('appointments','update',{...updates,updated_at:nowISO()},'id',id);
  const idx = mem.appointments.findIndex(a=>a.id===id);
  if(idx===-1) return null;
  mem.appointments[idx] = {...mem.appointments[idx],...updates,updatedAt:nowISO()};
  return mem.appointments[idx];
}

// ─── Activity ────────────────────────────────────────
async function getActivity(limit=50) {
  if (db) { const d = await supabaseQuery('activity_log','select','*','created_at',false); return d.slice(0,limit); }
  return mem.activity.slice(0,limit);
}

async function logActivity(type, message, subject) {
  if (db) { await supabaseQuery('activity_log','insert',{type,message,subject:subject||'',created_at:nowISO()}); return; }
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

module.exports = {
  getLeads, addLead, updateLead, deleteLead,
  getPosts, addPost, updatePost, deletePost,
  getAppointments, addAppointment, updateAppointment,
  getActivity, logActivity,
  getSettings, updateSettings,
  trackEvent, getAnalyticsSummary,
  exportCSV,
};
