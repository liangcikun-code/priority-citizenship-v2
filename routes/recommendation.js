const express = require('express');
const router = express.Router();
const ai = require('../services/ai-service');

// POST /api/recommend/visa - Get visa recommendation based on profile
router.post('/visa', (req, res) => {
  try {
    const { age, education, workExperience, budget, englishProficiency, hasFamily } = req.body;

    // Validate required fields
    if (!age || !budget) {
      return res.status(400).json({ error: 'Age and budget are required' });
    }

    const profile = {
      age: parseInt(age) || 30,
      education: education || 'bachelor',
      workExperience: parseInt(workExperience) || 0,
      budget: parseInt(budget) || 0,
      englishProficiency: parseInt(englishProficiency) || 1,
      hasFamily: hasFamily === true || hasFamily === 'true'
    };

    const recommendations = ai.recommendVisa(profile);

    res.json({
      profile,
      recommendations,
      topRecommendation: recommendations[0],
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Recommendation error:', err);
    res.status(500).json({ error: 'Failed to generate recommendation' });
  }
});

// POST /api/recommend/assess - Full eligibility assessment
router.post('/assess', (req, res) => {
  try {
    const { age, education, workExperience, englishProficiency, budget } = req.body;

    if (!age || !budget === undefined) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const answers = {
      age: age || '30',
      education: education || 'bachelor',
      workExperience: workExperience || '0',
      englishProficiency: englishProficiency || 'intermediate',
      budget: budget || '0'
    };

    const result = ai.assessEligibility(answers);
    res.json(result);
  } catch (err) {
    console.error('Assessment error:', err);
    res.status(500).json({ error: 'Failed to generate assessment' });
  }
});

module.exports = router;
