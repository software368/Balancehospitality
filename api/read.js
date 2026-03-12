module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body);
    const { session, file } = body;

    if (session !== process.env.EDIT_SESSION_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!file) {
        return res.status(400).json({ error: 'Missing file parameter' });
    }

    const token = process.env.GITHUB_PAT;
    const repo = 'software368/Balancehospitality';

    try {
        const getRes = await fetch(`https://api.github.com/repos/${repo}/contents/${file}?ref=master`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!getRes.ok) {
            const err = await getRes.json();
            return res.status(getRes.status).json({ error: err.message });
        }

        const data = await getRes.json();
        const content = Buffer.from(data.content, 'base64').toString('utf-8');

        return res.status(200).json({ success: true, content, sha: data.sha });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to read: ' + error.message });
    }
};
