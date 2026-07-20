// Vercel serverless entry — minimal version for debugging
const express = require('express');
const path = require('path');

const app = express();

// Try to serve static files
try {
  const publicDir = path.resolve(__dirname, '..', 'public');
  app.use(express.static(publicDir));

  app.get('/admin', (req, res) => {
    res.sendFile(path.join(publicDir, 'admin.html'));
  });

  app.get('/api/test', (req, res) => {
    res.json({ ok: true, node: process.version, vercel: !!process.env.VERCEL });
  });

  // Try to load the full server
  try {
    const fullApp = require('../server');
    module.exports = fullApp;
  } catch (e) {
    console.error('Full server failed, using minimal fallback:', e.message);
    app.get('/', (req, res) => res.send('OK - minimal mode'));
    app.get('*', (req, res) => res.status(500).json({
      error: 'Server partially loaded',
      message: e.message,
      stack: e.stack?.split('\n').slice(0, 8)
    }));
    module.exports = app;
  }
} catch (e) {
  console.error('Even minimal setup failed:', e.message);
  app.get('*', (req, res) => res.status(500).json({
    error: 'Minimal setup failed',
    message: e.message
  }));
  module.exports = app;
}
