// Bare-metal serverless entry — no Express, no external deps
module.exports = async (req, res) => {
  try {
    // Try loading express
    const express = require('express');
    res.json({ ok: true, express: 'loaded', node: process.version });
  } catch (e) {
    res.json({ ok: false, error: e.message, code: e.code, node: process.version });
  }
};
