module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email, password } = req.body || {};

        const validEmail = process.env.EDIT_EMAIL;
        const validPassword = process.env.EDIT_PASSWORD;
        const sessionSecret = process.env.EDIT_SESSION_SECRET;

        if (!validEmail || !validPassword || !sessionSecret) {
            return res.status(500).json({ error: 'Server not configured — add EDIT_EMAIL, EDIT_PASSWORD, EDIT_SESSION_SECRET env vars in Vercel' });
        }

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        if (email.toLowerCase().trim() === validEmail.toLowerCase() && password === validPassword) {
            return res.status(200).json({ success: true, session: sessionSecret });
        }

        return res.status(401).json({ error: 'Invalid email or password' });
    } catch (e) {
        return res.status(500).json({ error: 'Server error: ' + e.message });
    }
};
