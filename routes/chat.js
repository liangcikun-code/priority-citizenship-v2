const express = require('express');
const router = express.Router();
const ai = require('../services/ai-service');
const kb = require('../services/knowledge-base');

// POST /api/chat - Send a message to the AI chatbot
router.post('/', async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Build messages array for context
    const messages = (history || []).slice(-20);
    messages.push({ role: 'user', content: message.trim() });

    const reply = await ai.generateResponse(messages);

    res.json({
      reply,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

// POST /api/chat/escalate - Escalate to human agent
router.post('/escalate', (req, res) => {
  const { message, contact } = req.body;

  // In production, this would create a ticket in the CRM and notify the sales team
  console.log('Escalation requested:', { message, contact });

  res.json({
    success: true,
    message: 'Your enquiry has been forwarded to our team. We will contact you within 24 hours.',
    ticketId: 'TICKET-' + Date.now()
  });
});

// GET /api/chat/faq - Get all FAQ entries (for widget quick access)
router.get('/faq', (req, res) => {
  const faqs = kb.getFAQ();
  const quick = faqs.slice(0, 6).map(f => ({
    question: f.q,
    answer: f.a.substring(0, 120) + (f.a.length > 120 ? '...' : '')
  }));
  res.json(quick);
});

module.exports = router;
