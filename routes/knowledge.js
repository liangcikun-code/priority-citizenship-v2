const express = require('express');
const router = express.Router();
const kb = require('../services/knowledge-base');

// GET /api/knowledge/services - Get all services
router.get('/services', (req, res) => {
  const services = kb.getServices().map(s => ({
    id: s.id, name: s.name, summary: s.summary,
    processingTime: s.processingTime, features: s.features,
    requirements: s.requirements
  }));
  res.json(services);
});

// GET /api/knowledge/services/:id - Get specific service
router.get('/services/:id', (req, res) => {
  const service = kb.getServiceById(req.params.id);
  if (!service) return res.status(404).json({ error: 'Service not found' });
  res.json(service);
});

// GET /api/knowledge/faq - Get all FAQs
router.get('/faq', (req, res) => {
  const { q } = req.query;
  if (q) {
    return res.json(kb.searchFAQ(q));
  }
  res.json(kb.getFAQ());
});

// GET /api/knowledge/company - Get company info
router.get('/company', (req, res) => {
  res.json(kb.getCompanyInfo());
});

// POST /api/knowledge/search - Search knowledge base
router.post('/search', (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Query is required' });

  const faqMatches = kb.searchFAQ(query);
  const bestAnswer = kb.findBestAnswer(query);
  const context = kb.getContextForQuery(query);

  res.json({ faqMatches, bestAnswer, context: context.substring(0, 2000) });
});

module.exports = router;
