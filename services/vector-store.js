/**
 * Vector Knowledge Base — semantic search over Vanuatu immigration docs.
 *
 * Architecture:
 * - Document chunks stored in data/vanuatu-knowledge.json
 * - Embeddings generated via Gemini text-embedding-004 (768-dim)
 * - Cosine similarity search at query time
 * - Falls back to keyword matching when embeddings unavailable
 */

const fs = require('fs');
const path = require('path');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const EMBED_MODEL = 'text-embedding-004';
const CACHE_FILE = path.join(__dirname, '..', 'data', 'vanuatu-embeddings.json');

// In-memory cache: { chunks: [...], embeddings: [[], [], ...], model: string }
let cache = null;

function loadKnowledgeBase() {
  const raw = fs.readFileSync(
    path.join(__dirname, '..', 'data', 'vanuatu-knowledge.json'),
    'utf-8'
  );
  return JSON.parse(raw);
}

function loadEmbeddingCache() {
  if (cache) return cache;
  try {
    if (fs.existsSync(CACHE_FILE)) {
      cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
      if (cache.model === EMBED_MODEL) return cache;
    }
  } catch (e) { /* cache file corrupt or missing */ }
  return null;
}

function saveEmbeddingCache(data) {
  cache = data;
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data));
  } catch (e) { /* /tmp might not be writable outside Vercel */ }
}

// ═══════ Embedding via Gemini API ═══════════════════════════

async function embedText(text) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${EMBED_MODEL}`,
        content: { parts: [{ text }] }
      })
    }
  );
  if (!response.ok) throw new Error(`Embedding API error: ${response.status}`);
  const data = await response.json();
  return data.embedding.values; // Float array, 768-dim
}

async function embedBatch(texts) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:batchEmbedContents?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: texts.map(text => ({
          model: `models/${EMBED_MODEL}`,
          content: { parts: [{ text }] }
        }))
      })
    }
  );
  if (!response.ok) throw new Error(`Batch embedding error: ${response.status}`);
  const data = await response.json();
  return data.embeddings.map(e => e.values);
}

// ═══════ Cosine Similarity ════════════════════════════════

function dotProduct(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

function magnitude(v) {
  let sum = 0;
  for (let i = 0; i < v.length; i++) sum += v[i] * v[i];
  return Math.sqrt(sum);
}

function cosineSimilarity(a, b) {
  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) return 0;
  return dotProduct(a, b) / (magA * magB);
}

// ═══════ Search ═══════════════════════════════════════════

/**
 * Search the knowledge base for chunks relevant to the query.
 * Returns top-k chunks with their similarity scores.
 */
async function search(query, topK = 5) {
  const kb = loadKnowledgeBase();
  const chunks = kb.chunks;

  // Try vector search first
  if (GEMINI_API_KEY) {
    try {
      // Load or generate embeddings
      let stored = loadEmbeddingCache();
      if (!stored || stored.chunks.length !== chunks.length) {
        // Regenerate embeddings
        const texts = chunks.map(c => c.content);
        const batchSize = 100;
        const allEmbeddings = [];
        for (let i = 0; i < texts.length; i += batchSize) {
          const batch = texts.slice(i, i + batchSize);
          const embs = await embedBatch(batch);
          allEmbeddings.push(...embs);
        }
        stored = { chunks: texts, embeddings: allEmbeddings, model: EMBED_MODEL };
        saveEmbeddingCache(stored);
      }

      // Embed query
      const queryVec = await embedText(query);

      // Compute similarities
      const scored = stored.embeddings.map((emb, i) => ({
        chunk: chunks[i],
        score: cosineSimilarity(queryVec, emb)
      }));
      scored.sort((a, b) => b.score - a.score);

      // Deduplicate by source
      const seen = new Set();
      const results = [];
      for (const item of scored) {
        const key = item.chunk.source;
        if (!seen.has(key) && item.score > 0.3) {
          seen.add(key);
          results.push(item);
          if (results.length >= topK) break;
        }
      }
      if (results.length > 0) return results;
    } catch (e) {
      console.error('Vector search failed, falling back to keyword:', e.message);
    }
  }

  // Fallback: keyword search
  return keywordSearch(chunks, query, topK);
}

/**
 * Simple TF-IDF-like keyword search fallback
 */
function keywordSearch(chunks, query, topK) {
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);
  const scored = chunks.map(chunk => {
    const content = chunk.content.toLowerCase();
    const title = (chunk.title || '').toLowerCase();
    let score = 0;
    for (const term of queryTerms) {
      const inContent = (content.match(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      const inTitle = (title.match(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      score += inContent + inTitle * 3;
    }
    return { chunk, score };
  });
  scored.sort((a, b) => b.score - a.score);

  const seen = new Set();
  const results = [];
  for (const item of scored) {
    if (!seen.has(item.chunk.source) && item.score > 0) {
      seen.add(item.chunk.source);
      results.push(item);
      if (results.length >= topK) break;
    }
  }
  return results;
}

/**
 * Build a context string from search results for inclusion in AI prompt
 */
async function getContextForQuery(query, maxChunks = 3) {
  const results = await search(query, maxChunks);
  if (results.length === 0) return '';

  let context = 'RELEVANT OFFICIAL INFORMATION:\n\n';
  for (const r of results) {
    context += `[Source: ${r.chunk.source}]\n${r.chunk.content}\n\n`;
  }
  return context;
}

module.exports = { search, getContextForQuery, embedText };
