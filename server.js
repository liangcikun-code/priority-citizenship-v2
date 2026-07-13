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

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    version: "2.0.0",
    phase: "Phase 2 - AI Integration",
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString()
  });
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
    console.log("\n  Priority Citizenship Limited - Phase 2");
    console.log("  Server running at http://localhost:" + PORT);
    console.log("  AI Chatbot: http://localhost:" + PORT);
    console.log("  Visa Recommendation: http://localhost:" + PORT + "/tools/visa-recommendation");
    console.log("  Eligibility Assessment: http://localhost:" + PORT + "/tools/eligibility-assessment");
    console.log("  Book Appointment: http://localhost:" + PORT + "/tools/book-appointment");
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
