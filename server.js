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

app.get("/api/debug", (req, res) => {
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
  } catch(e) { info.supabaseError = e.message; }
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

// AI Tools hub
app.get("/tools", (req, res) => {
  res.sendFile(path.join(publicDir, "tools.html"));
});

app.get("/tools/:page", (req, res) => {
  const page = req.params.page;
  const validPages = ["visa-recommendation", "eligibility-assessment", "book-appointment"];
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
