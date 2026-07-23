const express = require("express");
const cors = require("cors");
const path = require("path");

if (!process.env.VERCEL) {
  require("dotenv").config();
}

const chatRoutes = require("./routes/chat");
const knowledgeRoutes = require("./routes/knowledge");
const recommendationRoutes = require("./routes/recommendation");
const appointmentRoutes = require("./routes/appointments");
const adminRoutes = require("./routes/admin");
const contactRoutes = require("./routes/contact");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const publicDir = path.resolve(__dirname, "public");
app.use(express.static(publicDir));

app.use("/api/chat", chatRoutes);
app.use("/api/knowledge", knowledgeRoutes);
app.use("/api/recommend", recommendationRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/contact", contactRoutes);

// Public Blog API (published posts only)
app.get("/api/blog", async (req, res) => {
  try {
    const store = require("./services/data-store");
    const posts = await store.getPosts();
    const published = posts.filter(p => p.published);
    res.json(published.map(p => ({
      id: p.id, title: p.title, slug: p.slug,
      excerpt: p.excerpt, content: p.content,
      category: p.category, author: p.author,
      createdAt: p.created_at || p.createdAt,
      updatedAt: p.updated_at || p.updatedAt
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/test", (req, res) => {
  res.json({ ok: true, node: process.version });
});

app.get("/api/debug", async (req, res) => {
  const info = {
    node: process.version,
    vercel: !!process.env.VERCEL,
    supabaseUrl: !!process.env.SUPABASE_URL,
    supabaseKey: !!process.env.SUPABASE_ANON_KEY,
    geminiKey: !!process.env.GEMINI_API_KEY,
    adminUser: !!process.env.ADMIN_USERNAME,
    adminPass: !!process.env.ADMIN_PASSWORD,
  };
  try {
    const supabase = require("./services/supabase");
    info.supabaseModule = typeof supabase.getLeads;
    // Check Supabase directly (bypassing memory fallback)
    try {
      const supabaseMod = require('./services/supabase');
      info.supabaseWorking = !!supabaseMod.db;
      const leads = await supabase.getLeads();
      info.leadsCount = leads.length;
      const appts = await supabase.getAppointments();
      info.apptsCount = appts.length;
      const posts = await supabase.getPosts();
      info.postsCount = posts.length;
    } catch(e) {
      info.supabaseWorking = false;
      info.supabaseError = e.message;
    }
  } catch(e) { info.supabaseLoadError = e.message; }
  res.json(info);
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    version: "2.1.0",
    phase: "Phase 3 - Admin System",
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString()
  });
});

// Deep Supabase diagnostic — reveals why it's failing
app.get("/api/debug-supabase", async (req, res) => {
  const diag = {
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasSupabaseKey: !!process.env.SUPABASE_ANON_KEY
  };
  try {
    // Try loading the module
    try {
      const m = require('@supabase/supabase-js');
      diag.moduleLoaded = true;
      diag.moduleKeys = Object.keys(m).join(', ');
      diag.hasCreateClient = typeof m.createClient === 'function';
    } catch(e) {
      diag.moduleLoaded = false;
      diag.moduleError = e.message;
    }

    // Try creating the client
    if (diag.moduleLoaded && diag.hasCreateClient) {
      try {
        const { createClient } = require('@supabase/supabase-js');
        const url = process.env.SUPABASE_URL.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
        const client = createClient(url, process.env.SUPABASE_ANON_KEY);
        diag.clientCreated = true;
        // Try a simple query
        try {
          const { data, error } = await client.from('leads').select('count', { count: 'exact', head: true });
          diag.querySuccess = true;
          diag.queryError = error ? error.message : null;
          diag.count = data;
        } catch(qe) {
          diag.querySuccess = false;
          diag.queryError = qe.message;
        }
      } catch(ce) {
        diag.clientCreated = false;
        diag.clientError = ce.message;
      }
    }
  } catch(e) {
    diag.topLevelError = e.message;
  }
  res.json(diag);
});
app.get("/api/db-status", async (req, res) => {
  const supabaseMod = require("./services/supabase");

  // Try to check if tables exist by doing test queries
  const tables = {};
  const testQueries = [
    { name: 'leads', key: 'leads' },
    { name: 'appointments', key: 'appointments' },
    { name: 'blog_posts', key: 'blog' },
    { name: 'activity_log', key: 'activity' },
    { name: 'settings', key: 'settings' },
    { name: 'analytics', key: 'analytics' },
  ];

  try {
    // Do a test insert + select to verify each table
    const testId = '_test_' + Date.now();

    // Test leads table
    try {
      const testLead = await supabaseMod.addLead({ name: '_DB_TEST_', email: '_test_@test.com', service: 'test', message: 'db test', status: 'test', source: 'system' });
      tables.leads = testLead ? 'OK' : 'FAIL';
      if (testLead) await supabaseMod.deleteLead(testLead.id);
    } catch(e) { tables.leads = 'ERROR: ' + e.message; }

    // Test appointments table
    try {
      const testAppt = await supabaseMod.addAppointment({ slotId: '_test_', name: '_DB_TEST_', email: '_test_@test.com', service: 'test', slotLabel: 'test slot', status: 'test' });
      tables.appointments = testAppt ? 'OK' : 'FAIL';
    } catch(e) { tables.appointments = 'ERROR: ' + e.message; }

    // Test blog table (read-only check)
    try {
      const posts = await supabaseMod.getPosts();
      tables.blog_posts = Array.isArray(posts) ? 'OK' : 'FAIL';
    } catch(e) { tables.blog_posts = 'ERROR: ' + e.message; }

    res.json({
      status: 'checked',
      tables,
      instructions: tables.leads !== 'OK' ?
        'Tables missing! Go to Supabase SQL Editor and run the SQL from data/supabase-schema.sql' :
        'All tables OK'
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Serve the SQL schema file for easy access
app.get("/api/schema-sql", (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.sendFile(path.join(__dirname, 'data', 'supabase-schema.sql'));
});

// AI Tools hub
app.get("/tools", (req, res) => {
  res.sendFile(path.join(publicDir, "tools.html"));
});

app.get("/tools/:page", (req, res) => {
  const page = req.params.page;
  const validPages = ["visa-recommendation", "eligibility-assessment", "book-appointment", "fee-calculator", "document-checklist"];
  if (validPages.includes(page)) {
    res.sendFile(path.join(publicDir, page + ".html"));
  } else {
    res.status(404).json({ error: "Page not found" });
  }
});

// Admin panel route
app.get("/admin", (req, res) => {
  res.sendFile(path.join(publicDir, "admin.html"));
});

// Blog pages
app.get("/blog", (req, res) => {
  res.sendFile(path.join(publicDir, "blog.html"));
});

app.get("/blog/:slug", (req, res) => {
  res.sendFile(path.join(publicDir, "blog.html"));
});

app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "API endpoint not found" });
  }
  res.sendFile(path.join(publicDir, "index.html"));
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log("\n  Priority Citizenship Limited - Phase 3");
    console.log("  Server running at http://localhost:" + PORT);
    console.log("  AI Chatbot: http://localhost:" + PORT);
    console.log("  Visa Recommendation: http://localhost:" + PORT + "/tools/visa-recommendation");
    console.log("  Eligibility Assessment: http://localhost:" + PORT + "/tools/eligibility-assessment");
    console.log("  Book Appointment: http://localhost:" + PORT + "/tools/book-appointment");
    console.log("  Admin Panel: http://localhost:" + PORT + "/admin");
    console.log("  API Health: http://localhost:" + PORT + "/api/health");
    if (process.env.GEMINI_API_KEY) {
      console.log("  AI Mode: Google Gemini AI connected");
    } else {
      console.log("  AI Mode: Local fallback (set GEMINI_API_KEY for AI-powered responses)");
    }
    console.log("");
  });
}

module.exports = app;
