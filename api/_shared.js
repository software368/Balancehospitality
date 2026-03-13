const crypto = require('crypto');

const ALLOWED_HOSTS = ['balancehospitality.nl', 'balancehospitalityscheveningen.nl', 'vercel.app', 'localhost', '127.0.0.1'];
const ALLOWED_FILES = /^(index\.html|content\/[\w-]+\.json|content\/[\w-]+\/[\w-]+\.json|uploads\/[\w-]+\.(jpg|jpeg|png|gif|webp|svg))$/i;

const TOKEN_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

function generateToken(secret) {
  const timestamp = String(Date.now());
  const hmac = crypto.createHmac('sha256', secret).update(timestamp).digest('hex');
  return timestamp + '.' + hmac;
}

function validateToken(token, secret) {
  if (!token || !secret) return false;
  const dot = token.indexOf('.');
  if (dot === -1) return false;
  const timestamp = token.slice(0, dot);
  const hmac = token.slice(dot + 1);
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts) || Date.now() - ts > TOKEN_MAX_AGE) return false;
  const expected = crypto.createHmac('sha256', secret).update(timestamp).digest('hex');
  if (hmac.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(expected, 'hex'));
  } catch { return false; }
}

function checkOrigin(req) {
  const origin = req.headers.origin || req.headers.referer || '';
  const originHost = (() => {
    try { return new URL(origin).hostname; }
    catch (e) { return ''; }
  })();
  if (origin && !ALLOWED_HOSTS.some(h => originHost === h || originHost.endsWith('.' + h))) {
    return false;
  }
  return true;
}

function parseBody(req) {
  let body = req.body;
  if (typeof body === 'string') body = JSON.parse(body);
  return body;
}

function validateSession(body) {
  const secret = process.env.EDIT_SESSION_SECRET || '';
  if (!secret || !body.session) return false;
  // Support new HMAC tokens
  if (body.session.indexOf('.') !== -1) return validateToken(body.session, secret);
  // Legacy: direct secret match (will phase out)
  return body.session === secret;
}

function validateFilePath(file) {
  if (!file) return null;
  const normalized = file.replace(/\\/g, '/').replace(/\.\.+/g, '');
  if (!ALLOWED_FILES.test(normalized)) return null;
  return normalized;
}

function methodGuard(req, res, method) {
  if (req.method !== method) {
    res.status(405).json({ error: 'Method not allowed' });
    return false;
  }
  return true;
}

function originGuard(req, res) {
  if (!checkOrigin(req)) {
    res.status(403).json({ error: 'Forbidden' });
    return false;
  }
  return true;
}

module.exports = {
  ALLOWED_HOSTS,
  ALLOWED_FILES,
  checkOrigin,
  parseBody,
  validateSession,
  validateFilePath,
  methodGuard,
  originGuard,
  generateToken,
  validateToken,
};
