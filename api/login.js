const { methodGuard, originGuard, parseBody, generateToken } = require('./_shared');

const loginAttempts = new Map(); // ip -> { count, resetAt }

module.exports = async function handler(req, res) {
    if (!methodGuard(req, res, 'POST')) return;
    if (!originGuard(req, res)) return;

    // Rate limiting: 5 attempts per 15 minutes per IP
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = loginAttempts.get(ip) || { count: 0, resetAt: now + 15 * 60 * 1000 };
    if (now > entry.resetAt) {
        entry.count = 0;
        entry.resetAt = now + 15 * 60 * 1000;
    }
    if (entry.count >= 5) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        return res.status(429).json({ error: 'Too many login attempts. Try again later.', retryAfter });
    }

    try {
        const body = parseBody(req);
        const password = body.password || '';

        const validPassword = process.env.EDIT_PASSWORD || '';
        const sessionSecret = process.env.EDIT_SESSION_SECRET || '';

        if (!validPassword || !sessionSecret) {
            return res.status(500).json({ error: 'Server configuration error' });
        }

        if (!password) {
            return res.status(400).json({ error: 'Password required' });
        }

        entry.count++;
        loginAttempts.set(ip, entry);

        if (password === validPassword) {
            loginAttempts.delete(ip);
            const token = generateToken(sessionSecret);
            return res.status(200).json({ success: true, session: token });
        }

        return res.status(401).json({ error: 'Invalid password' });
    } catch (e) {
        return res.status(500).json({ error: 'Server error' });
    }
};
