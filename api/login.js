module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email, password } = req.body;

    const validEmail = process.env.EDIT_EMAIL;
    const validPassword = process.env.EDIT_PASSWORD;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }

    if (email.toLowerCase().trim() === validEmail.toLowerCase() && password === validPassword) {
        // Return a session token (the secret that validates /api/save calls)
        return res.status(200).json({ success: true, session: process.env.EDIT_SESSION_SECRET });
    }

    return res.status(401).json({ error: 'Invalid email or password' });
};
