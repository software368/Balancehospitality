module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        let body = req.body;
        if (typeof body === 'string') body = JSON.parse(body);
        if (!body || typeof body !== 'object') {
            return res.status(400).json({ error: 'Invalid request body' });
        }

        const email = (body.email || '').toLowerCase().trim();
        const password = body.password || '';

        // Hardcoded fallback (remove after confirming env vars work)
        const validEmail = (process.env.EDIT_EMAIL || 'team@horecemarketingacademy.nl').toLowerCase().trim();
        const validPassword = process.env.EDIT_PASSWORD || 'HMAwebedit01!*';
        const sessionSecret = process.env.EDIT_SESSION_SECRET || 'bhg-session-2026-x9k4m';

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        if (email === validEmail && password === validPassword) {
            return res.status(200).json({ success: true, session: sessionSecret });
        }

        return res.status(401).json({ error: 'Invalid email or password' });
    } catch (e) {
        return res.status(500).json({ error: 'Server error: ' + e.message });
    }
};
