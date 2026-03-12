module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Parse body — Vercel may or may not auto-parse
        let body = req.body;
        if (typeof body === 'string') {
            body = JSON.parse(body);
        }
        if (!body || typeof body !== 'object') {
            return res.status(400).json({ error: 'Invalid request body' });
        }

        const email = (body.email || '').toLowerCase().trim();
        const password = body.password || '';

        const validEmail = (process.env.EDIT_EMAIL || '').toLowerCase().trim();
        const validPassword = process.env.EDIT_PASSWORD || '';
        const sessionSecret = process.env.EDIT_SESSION_SECRET;

        if (!validEmail || !validPassword || !sessionSecret) {
            return res.status(500).json({ error: 'Server not configured — add EDIT_EMAIL, EDIT_PASSWORD, EDIT_SESSION_SECRET env vars in Vercel' });
        }

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
