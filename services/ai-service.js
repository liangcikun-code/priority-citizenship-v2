const kb = require('./knowledge-base');
const vectorStore = require('./vector-store');

/**
 * AI Service for the Priority Citizenship chatbot.
 * 
 * Architecture:
 * - When GEMINI_API_KEY is set in .env, uses Google Gemini API
 * - Otherwise falls back to keyword-based FAQ matching
 * - Context is always limited to company knowledge base
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

/**
 * Generate a system prompt from the knowledge base
 */
function buildSystemPrompt(ragContext) {
  const data = kb.load();
  const c = data.company;

  return `You are an AI immigration assistant for Priority Citizenship Limited, a licensed Vanuatu immigration consultancy.

COMPANY INFORMATION:
- Name: ${c.name}
- Founded: ${c.founded}
- Location: ${c.location}
- Experience: ${c.experience}
- Applications completed: ${c.applicationsCompleted}
- Success rate: ${c.successRate}
- Team: ${c.teamSize}
- Phone: ${c.phone}
- Email: ${c.email}
- Office hours: ${c.hours}
- Address: ${c.address}

OFFICIAL REFERENCE DOCUMENTS — use these official details for accurate answers:
${ragContext || 'No additional references loaded.'}

SERVICES OFFERED:
${data.services.map(s => `- ${s.name}: ${s.summary}. Processing: ${s.processingTime || 'Varies'}.${s.features ? ' Features: ' + s.features.join(', ') : ''}${s.requirements ? ' Requirements: ' + s.requirements.join(', ') : ''}`).join('\n')}

RULES:
1. ONLY answer questions related to Vanuatu immigration, citizenship, residence, visas, and Priority Citizenship Limited's services.
2. If asked about anything outside these topics, politely say you can only assist with immigration-related questions.
3. Be professional, warm, and helpful.
4. Provide specific details when possible.
5. If you don't know the answer, say "I'm not sure about that specific detail. Please contact our team at ${c.email} or call ${c.phone} for accurate information."
6. Suggest booking a free consultation for personalized assessment.
7. Keep responses concise but thorough.`;
}

/**
 * Simple keyword-based fallback response
 */
function keywordFallback(query) {
  const q = query.toLowerCase();

  // Check for greetings
  if (/^(hi|hello|hey|good morning|good afternoon|good evening)\b/.test(q)) {
    return "Hello! Welcome to Priority Citizenship Limited. I'm your AI immigration assistant. I can help you with questions about Vanuatu citizenship, residence permits, visa services, and the application process. How can I assist you today?";
  }

  // Check for thanks
  if (/\b(thank|thanks|appreciate)\b/.test(q)) {
    return "You're welcome! If you have any more questions about Vanuatu immigration, feel free to ask. You can also book a free consultation with our team through the contact form on our website.";
  }

  // Check for contact / consultation booking
  if (/\b(contact|consult|book|appointment|meet|call)\b/.test(q)) {
    return "You can book a free consultation by filling out the contact form on our website, emailing us at prioritycitizenship@gmail.com, or calling +678 7773595. Our team typically responds within 24 hours. Our office hours are Monday to Friday 9AM–6PM (Vanuatu Time).";
  }

  // Check for pricing
  if (/\b(price|cost|fee|pricing|how much|budget|payment)\b/.test(q)) {
    return "Our pricing varies by program. The Vanuatu Citizenship by Investment program starts at USD 130,000 for a single applicant (government contribution). Other services have different fee structures. For a detailed breakdown tailored to your situation, please book a free consultation. Contact us at prioritycitizenship@gmail.com for more information.";
  }

  // Check for office hours / location
  if (/\b(office|address|location|where|hours|open|visit)\b/.test(q)) {
    return "Our office is located in Port Vila, Vanuatu, Pango Area. We are open Monday to Friday from 9:00 AM to 6:00 PM (Vanuatu Time), and Saturday from 10:00 AM to 2:00 PM. You can also reach us by phone or WhatsApp at +678 7773595 or email at prioritycitizenship@gmail.com.";
  }

  // Check for processing time
  if (/\b(how long|processing time|duration|when|timeline|speed)\b/.test(q)) {
    return "Processing times vary by program:\n- Citizenship by Investment: 1–2 months\n- Residence Permits: 2–3 months\n- Family Sponsorship: 1–3 months\n- Business Immigration: 2–4 months\n- Visitor Visas: 5–10 business days\nThe citizenship program is one of the fastest in the world.";
  }

  // Try FAQ matching
  const matched = kb.findBestAnswer(query);
  if (matched) {
    return matched.a;
  }

  // Default
  return "Thank you for your question. I'm not sure I have enough information to answer that specific query. For accurate and personalized assistance, please contact our team at prioritycitizenship@gmail.com or call +678 7773595. You can also fill out the consultation form on our website and we'll get back to you within 24 hours.";
}

/**
 * Generate AI response using Google Gemini or fallback
 */
async function generateResponse(messages) {
  const userQuery = messages[messages.length - 1]?.content || '';

  if (GEMINI_API_KEY) {
    try {
      const https = require('https');
      
      // Retrieve relevant context from vector knowledge base
      let ragContext = '';
      try {
        ragContext = await vectorStore.getContextForQuery(userQuery, 3);
      } catch (e) { /* RAG unavailable, continue without context */ }

      const systemPrompt = buildSystemPrompt(ragContext);

      // Convert messages to Gemini format
      const contents = messages.slice(-10).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const body = JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 600
        }
      });

      const response = await new Promise((resolve, reject) => {
        const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent?key=' + GEMINI_API_KEY;
        const req = https.request(url,
          { method: 'POST', headers: { 'Content-Type': 'application/json' } },
          res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
              try { resolve(JSON.parse(data)); }
              catch (e) { reject(new Error('Failed to parse Gemini response')); }
            });
          }
        );
        req.on('error', reject);
        req.write(body);
        req.end();
      });

      if (response.candidates && response.candidates[0] && response.candidates[0].content) {
        const text = response.candidates[0].content.parts.map(p => p.text).join('');
        if (text) return text;
      }

      if (response.promptFeedback && response.promptFeedback.blockReason) {
        return "I'm sorry, I couldn't process that request due to content safety guidelines. Please rephrase or contact our team at prioritycitizenship@gmail.com.";
      }

      throw new Error('Unexpected Gemini response format');
    } catch (err) {
      console.error('Gemini API error:', err.message);
      // Fall back to keyword matching without showing technical note
      return keywordFallback(userQuery);
    }
  }

  return keywordFallback(userQuery);
}

/**
 * Generate visa recommendation based on user profile
 */
function recommendVisa(profile) {
  const { age, education, workExperience, budget, englishProficiency, hasFamily } = profile;
  const recommendations = [];
  const scores = [];

  // Citizenship by Investment
  let citizenshipScore = 0;
  if (budget >= 130000) citizenshipScore += 40;
  if (age >= 18) citizenshipScore += 15;
  if (hasFamily) citizenshipScore += 10;
  citizenshipScore += Math.min(workExperience * 2, 15);
  citizenshipScore = Math.min(citizenshipScore, 100);
  scores.push({ id: 'citizenship', name: 'Citizenship by Investment', score: citizenshipScore });

  // Residence Permit
  let residenceScore = 0;
  residenceScore += 20;
  if (age >= 55) residenceScore += 20;
  if (workExperience >= 5) residenceScore += 15;
  if (englishProficiency >= 3) residenceScore += 15;
  if (hasFamily) residenceScore += 15;
  residenceScore = Math.min(residenceScore, 100);
  scores.push({ id: 'residence', name: 'Residence Permit', score: residenceScore });

  // Business Immigration
  let businessScore = 0;
  if (workExperience >= 5) businessScore += 25;
  if (budget >= 50000) businessScore += 25;
  if (englishProficiency >= 3) businessScore += 15;
  if (age >= 25 && age <= 60) businessScore += 15;
  businessScore = Math.min(businessScore, 100);
  scores.push({ id: 'business', name: 'Business Immigration', score: businessScore });

  // Family Sponsorship
  let familyScore = 0;
  if (hasFamily) familyScore += 40;
  if (budget >= 20000) familyScore += 20;
  familyScore += Math.min(workExperience * 3, 20);
  familyScore = Math.min(familyScore, 100);
  scores.push({ id: 'family', name: 'Family Sponsorship', score: familyScore });

  // Visitor Visa
  let visitorScore = 0;
  if (budget < 50000) visitorScore += 30;
  if (age >= 18 && age <= 75) visitorScore += 25;
  if (englishProficiency >= 2) visitorScore += 15;
  visitorScore = Math.min(visitorScore, 100);
  scores.push({ id: 'visitor', name: 'Visitor & Tourist Visa', score: visitorScore });

  scores.sort((a, b) => b.score - a.score);
  return scores;
}

/**
 * Eligibility pre-assessment
 */
function assessEligibility(answers) {
  let totalScore = 0;
  const details = {};

  // Age assessment
  const age = parseInt(answers.age) || 30;
  if (age >= 18 && age <= 65) {
    const ageScore = 15;
    totalScore += ageScore;
    details.age = { score: ageScore, message: 'Age within eligible range' };
  } else {
    details.age = { score: 0, message: 'Outside recommended age range' };
  }

  // Education assessment
  const eduLevel = answers.education || 'bachelor';
  const eduScores = { phd: 20, master: 18, bachelor: 15, diploma: 10, highschool: 5, other: 2 };
  const eduScore = eduScores[eduLevel] || 5;
  totalScore += eduScore;
  const eduLabels = { phd: 'PhD', master: "Master's", bachelor: "Bachelor's", diploma: 'Diploma', highschool: 'High School', other: 'Other' };
  details.education = { score: eduScore, message: `Education: ${eduLabels[eduLevel] || eduLevel}` };

  // Work experience
  const exp = parseInt(answers.workExperience) || 0;
  const expScore = Math.min(exp * 2, 25);
  totalScore += expScore;
  details.workExperience = { score: expScore, message: `${exp} years of experience` };

  // English proficiency
  const engLevel = answers.englishProficiency || 'none';
  const engScores = { native: 15, fluent: 12, intermediate: 8, basic: 4, none: 0 };
  const engScore = engScores[engLevel] || 0;
  totalScore += engScore;
  const engLabels = { native: 'Native', fluent: 'Fluent', intermediate: 'Intermediate', basic: 'Basic', none: 'Limited' };
  details.english = { score: engScore, message: `English: ${engLabels[engLevel] || engLevel}` };

  // Budget assessment
  const budget = parseInt(answers.budget) || 0;
  if (budget >= 130000) {
    const budgetScore = 25;
    totalScore += budgetScore;
    details.budget = { score: budgetScore, message: 'Budget sufficient for all programs' };
  } else if (budget >= 50000) {
    const budgetScore = 18;
    totalScore += budgetScore;
    details.budget = { score: budgetScore, message: 'Budget sufficient for most programs' };
  } else if (budget >= 10000) {
    const budgetScore = 10;
    totalScore += budgetScore;
    details.budget = { score: budgetScore, message: 'Budget sufficient for select programs' };
  } else {
    details.budget = { score: 0, message: 'Budget may be insufficient' };
  }

  // Determine recommendations
  const pct = Math.round((totalScore / 100) * 100);
  let recommended = [];
  let level = '';

  if (pct >= 80) {
    level = 'high';
    recommended = ['Citizenship by Investment', 'Business Immigration'];
  } else if (pct >= 60) {
    level = 'moderate';
    recommended = ['Residence Permit', 'Family Sponsorship'];
  } else if (pct >= 40) {
    level = 'fair';
    recommended = ['Visitor Visa', 'Consulting Services'];
  } else {
    level = 'exploratory';
    recommended = ['Book a consultation for personalized assessment'];
  }

  return {
    score: pct,
    level,
    recommended,
    details,
    summary: level === 'high'
      ? 'You have a strong profile for Vanuatu immigration programs.'
      : level === 'moderate'
        ? 'You have a good profile. Some areas could be strengthened.'
        : level === 'fair'
          ? 'You may be eligible for select programs. A consultation is recommended.'
          : 'We recommend booking a free consultation to explore your options.',
    nextStep: level === 'high' || level === 'moderate'
      ? 'Book a free consultation to start your application'
      : 'Speak with our team to explore your options'
  };
}

module.exports = { generateResponse, recommendVisa, assessEligibility, keywordFallback };
