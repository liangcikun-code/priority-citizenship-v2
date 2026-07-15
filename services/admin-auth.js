/**
 * Admin Authentication Service
 * Simple token-based auth for the admin dashboard.
 * In production, replace with proper JWT + database auth.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ADMIN_CONFIG_PATH = path.join(__dirname, '..', 'data', 'admin.json');
const TOKEN_EXPIRY_MS = 8 * 60 * 60 * 1000; // 8 hours

// Default admin credentials (change in production!)
const DEFAULT_ADMIN = {
  username: 'admin',
  // password: 'priority2026admin'
  passwordHash: crypto.createHash('sha256').update('priority2026admin').digest('hex'),
  createdAt: new Date().toISOString()
};

function loadConfig() {
  try {
    if (fs.existsSync(ADMIN_CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(ADMIN_CONFIG_PATH, 'utf8'));
    }
  } catch (e) { /* fall through */ }
  return null;
}

function saveConfig(config) {
  const dir = path.dirname(ADMIN_CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(ADMIN_CONFIG_PATH, JSON.stringify(config, null, 2));
}

/**
 * Initialize admin config if not exists
 */
function initAdmin() {
  let config = loadConfig();
  if (!config) {
    config = {
      admin: DEFAULT_ADMIN,
      tokens: {}
    };
    saveConfig(config);
  }
  return config;
}

/**
 * Verify admin credentials
 */
function login(username, password) {
  const config = initAdmin();
  const hash = crypto.createHash('sha256').update(password).digest('hex');

  if (username === config.admin.username && hash === config.admin.passwordHash) {
    // Generate session token
    const token = crypto.randomUUID();
    config.tokens[token] = {
      username,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + TOKEN_EXPIRY_MS).toISOString()
    };
    // Clean expired tokens
    const now = Date.now();
    for (const [t, data] of Object.entries(config.tokens)) {
      if (new Date(data.expiresAt).getTime() < now) {
        delete config.tokens[t];
      }
    }
    saveConfig(config);
    return { success: true, token, expiresIn: TOKEN_EXPIRY_MS };
  }

  return { success: false, error: 'Invalid username or password' };
}

/**
 * Verify admin token
 */
function verifyToken(token) {
  if (!token) return null;
  const config = loadConfig();
  if (!config || !config.tokens || !config.tokens[token]) return null;

  const tokenData = config.tokens[token];
  if (new Date(tokenData.expiresAt).getTime() < Date.now()) {
    // Token expired, clean up
    delete config.tokens[token];
    saveConfig(config);
    return null;
  }
  return tokenData;
}

/**
 * Logout (invalidate token)
 */
function logout(token) {
  const config = loadConfig();
  if (config && config.tokens) {
    delete config.tokens[token];
    saveConfig(config);
  }
}

/**
 * Express middleware for protecting admin routes
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

module.exports = { login, logout, verifyToken, requireAdmin, initAdmin };
