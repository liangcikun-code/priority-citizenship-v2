// Vercel serverless entry point
// This file exports the Express app for Vercel deployment
try {
  const app = require('../server');
  module.exports = app;
} catch (e) {
  console.error('FATAL: Server failed to load:', e.message);
  console.error(e.stack);
  // Return a minimal Express app that reports the error
  const express = require('express');
  const fallback = express();
  fallback.use((req, res) => {
    res.status(500).json({
      error: 'Server failed to initialize',
      message: e.message,
      stack: e.stack ? e.stack.split('\n').slice(0, 5) : undefined
    });
  });
  module.exports = fallback;
}
