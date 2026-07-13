const fs = require('fs');
const path = require('path');

let kbData = null;

function load() {
  if (kbData) return kbData;
  const raw = fs.readFileSync(path.join(__dirname, '..', 'data', 'kb.json'), 'utf8');
  kbData = JSON.parse(raw);
  return kbData;
}

function reload() {
  kbData = null;
  return load();
}

function getCompanyInfo() {
  return load().company;
}

function getServices() {
  return load().services;
}

function getServiceById(id) {
  return load().services.find(s => s.id === id) || null;
}

function getFAQ() {
  return load().faq;
}

function searchFAQ(query) {
  const q = query.toLowerCase();
  return load().faq.filter(f =>
    f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)
  );
}

function findBestAnswer(query) {
  const q = query.toLowerCase();
  const faqs = load().faq;

  // Score each FAQ by keyword overlap
  const scored = faqs.map(f => {
    const qWords = q.split(/\s+/).filter(w => w.length > 2);
    const matchCount = qWords.filter(w => 
      f.q.toLowerCase().includes(w) || f.a.toLowerCase().includes(w)
    ).length;
    return { ...f, score: matchCount / Math.max(qWords.length, 1) };
  });

  scored.sort((a, b) => b.score - a.score);
  
  if (scored.length > 0 && scored[0].score > 0.3) {
    return scored[0];
  }
  return null;
}

function getContextForQuery(query) {
  const q = query.toLowerCase();
  const data = load();
  let context = '';

  // Add company info
  const c = data.company;
  context += `Company: ${c.name}. Founded ${c.founded}, located in ${c.location}. `;
  context += `${c.experience}. ${c.applicationsCompleted}. Success rate: ${c.successRate}. `;
  context += `Contact: ${c.phone}, ${c.email}. Hours: ${c.hours}.\n\n`;

  // Add service info
  data.services.forEach(s => {
    context += `Service: ${s.name}. ${s.summary} Processing time: ${s.processingTime || 'Varies'}. `;
    if (s.features) context += `Features: ${s.features.join(', ')}. `;
    if (s.requirements) context += `Requirements: ${s.requirements.join(', ')}. `;
    context += '\n';
  });

  // Add relevant FAQ entries
  const relevantFAQs = data.faq.filter(f =>
    f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)
  ).slice(0, 3);

  if (relevantFAQs.length > 0) {
    context += '\nRelevant FAQs:\n';
    relevantFAQs.forEach(f => { context += `Q: ${f.q}\nA: ${f.a}\n`; });
  }

  return context;
}

module.exports = {
  load, reload, getCompanyInfo, getServices,
  getServiceById, getFAQ, searchFAQ, findBestAnswer,
  getContextForQuery
};
