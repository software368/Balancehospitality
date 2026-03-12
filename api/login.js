module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Debug: what is req.body actually?
        const bodyType = typeof req.body;
        const bodyVal = JSON.stringify(req.body);

        let body;
        if (bodyType === 'string') {
            body = JSON.parse(req.body);
        } else if (bodyType === 'object' && req.body !== null) {
            body = req.body;
        } else {
            // Read raw body
            const chunks = [];
            for await (const chunk of req) {
                chunks.push(chunk);
            }
            const raw = Buffer.concat(chunks).toString('utf-8');
            body = JSON.parse(raw);
        }

        const email = (body.email || '').toLowerCase().trim();
        const password = body.password || '';

        const validEmail = 'team@horecemarketingacademy.nl';
        const validPassword = 'HMAwebedit01!*';
        const sessionSecret = process.env.EDIT_SESSION_SECRET || 'bhg-session-2026-x9k4m';

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required', bodyType, bodyVal });
        }

        if (email === validEmail && password === validPassword) {
            return res.status(200).json({ success: true, session: sessionSecret });
        }

        return res.status(401).json({ error: 'Invalid email or password', bodyType, bodyVal, email, passwordLen: password.length });
    } catch (e) {
        return res.status(500).json({ error: 'Server error: ' + e.message, bodyType: typeof req.body, bodySnippet: String(req.body).substring(0, 100) });
    }
};
