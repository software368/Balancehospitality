const { methodGuard, originGuard, parseBody, validateSession, validateFilePath } = require('./_shared');

module.exports = async function handler(req, res) {
    if (!methodGuard(req, res, 'POST')) return;
    if (!originGuard(req, res)) return;

    const body = parseBody(req);

    if (!validateSession(body)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (body.content === undefined) {
        return res.status(400).json({ error: 'Missing required fields: file, content' });
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
    const branch = 'master';

    try {
        // Get current file SHA (needed for update)
        const getRes = await fetch(`https://api.github.com/repos/${repo}/contents/${normalizedFile}?ref=${branch}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!getRes.ok && getRes.status !== 404) {
            return res.status(502).json({ error: 'Failed to read file from repository' });
        }

        const existing = getRes.status === 404 ? null : await getRes.json();
        const sha = existing ? existing.sha : undefined;

        const encoded = Buffer.from(body.content, 'utf-8').toString('base64');

        // Sanitize commit message
        const safeMessage = (body.message || 'Update content via visual editor').slice(0, 200).replace(/[^\w\s:.\-–—]/g, '');

        const putBody = { message: safeMessage, content: encoded, branch };
        if (sha) putBody.sha = sha;

        const putRes = await fetch(`https://api.github.com/repos/${repo}/contents/${normalizedFile}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify(putBody)
        });

        if (!putRes.ok) {
            return res.status(502).json({ error: 'Failed to save file to repository' });
        }

        const result = await putRes.json();
        return res.status(200).json({ success: true, sha: result.content.sha });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to save' });
    }
};
