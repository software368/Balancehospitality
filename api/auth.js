// Deprecated: GitHub OAuth flow removed in favor of password + HMAC token auth.
// This endpoint is no longer used. See api/login.js instead.
module.exports = function handler(req, res) {
    res.status(410).json({ error: 'This authentication method has been removed. Use /api/login instead.' });
};
