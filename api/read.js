const { methodGuard, originGuard, parseBody, validateSession, validateFilePath } = require('./_shared');

module.exports = async function handler(req, res) {
    if (!methodGuard(req, res, 'POST')) return;
    if (!originGuard(req, res)) return;

    const body = parseBody(req);

    if (!validateSession(body)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const normalizedFile = validateFilePath(body.file);
    if (!normalizedFile) {
        return res.status(403).json({ error: 'File path not allowed' });
    }

    const token = process.env.GITHUB_PAT;
    if (!token) {
        return res.status(500).json({ error: 'Server configuration error' });
    }

    const repo = 'software368/Balancehospitality';

    try {
        const getRes = await fetch(`https://api.github.com/repos/${repo}/contents/${normalizedFile}?ref=master`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!getRes.ok) {
            return res.status(502).json({ error: 'Failed to read file from repository' });
        }

        const data = await getRes.json();
        const content = Buffer.from(data.content, 'base64').toString('utf-8');

        return res.status(200).json({ success: true, content, sha: data.sha });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to read file' });
    }
};
