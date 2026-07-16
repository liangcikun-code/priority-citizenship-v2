/**
 * Contact Form Routes
 * Saves inquiries as CRM leads.
 */
const express = require('express');
const router = express.Router();
const store = require('../services/data-store');
const email = require('../services/email-service');

// POST /api/contact - Submit contact form
router.post('/', (req, res) => {
  try {
    const { name, email, phone, country, service, budget, message } = req.body;

    if (!name || !email || !service) {
      return res.status(400).json({ error: 'Name, email, and service are required' });
    }

    const lead = store.addLead({
      name, email, phone: phone || '', country: country || '',
      service, budget: budget || '', message: message || '',
      status: 'new', source: 'website_contact_form'
    });

    // Async email notification (fire-and-forget)
    email.notifyNewLead(lead).catch(() => {});

    res.json({ success: true, leadId: lead.id });
  } catch (err) {
    console.error('Contact form error:', err);
    res.status(500).json({ error: 'Failed to submit form' });
  }
});

module.exports = router;
