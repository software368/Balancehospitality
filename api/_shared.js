const ALLOWED_HOSTS = ['balancehospitality.nl', 'balancehospitalityscheveningen.nl', 'vercel.app', 'localhost', '127.0.0.1'];
const ALLOWED_FILES = /^(index\.html|content\/[\w-]+\.json|content\/[\w-]+\/[\w-]+\.json)$/;

function checkOrigin(req) {
  const origin = req.headers.origin || req.headers.referer || '';
  const originHost = (() => {
    try { return new URL(origin).hostname; }
    catch { return ''; }
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
  return secret && body.session === secret;
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
};
