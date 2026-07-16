/**
 * Admin Authentication Service
 * Vercel-compatible: uses env vars + in-memory tokens (no file I/O).
 */

const crypto = require('crypto');

const TOKEN_EXPIRY_MS = 8 * 60 * 60 * 1000; // 8 hours
const tokens = {}; // In-memory only (resets on cold start — acceptable for admin panel)

// Clean expired tokens periodically
setInterval(() => {
  const now = Date.now();
  for (const [t, d] of Object.entries(tokens)) {
    if (new Date(d.expiresAt).getTime() < now) delete tokens[t];
  }
}, 60 * 60 * 1000); // Every hour

/**
 * Verify admin credentials against env vars.
 */
function login(username, password) {
  const expectedUser = process.env.ADMIN_USERNAME || 'admin';
  const expectedPass = process.env.ADMIN_PASSWORD;

  if (!expectedPass) {
    return { success: false, error: 'Admin password not configured. Set ADMIN_PASSWORD env var.' };
  }

  const expectedHash = crypto.createHash('sha256').update(expectedPass).digest('hex');
  const providedHash = crypto.createHash('sha256').update(password).digest('hex');

  if (username === expectedUser && providedHash === expectedHash) {
    const token = crypto.randomUUID();
    tokens[token] = {
      username,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + TOKEN_EXPIRY_MS).toISOString()
    };
    return { success: true, token, expiresIn: TOKEN_EXPIRY_MS };
  }

  return { success: false, error: 'Invalid username or password' };
}

/**
 * Verify admin token.
 */
function verifyToken(token) {
  if (!token || !tokens[token]) return null;
  if (new Date(tokens[token].expiresAt).getTime() < Date.now()) {
    delete tokens[token];
    return null;
  }
  return tokens[token];
}

/**
 * Logout (invalidate token).
 */
function logout(token) {
  delete tokens[token];
}

/**
 * Express middleware for protecting admin routes.
 */
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = authHeader.split(' ')[1];
  const session = verifyToken(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  req.adminUser = session;
  next();
}

module.exports = { login, logout, verifyToken, requireAdmin };
