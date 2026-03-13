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

    // Prevent deleting critical files
    if (normalizedFile === 'index.html' || normalizedFile === 'content/manifest.json') {
        return res.status(403).json({ error: 'Cannot delete this file' });
    }

    const token = process.env.GITHUB_PAT;
    if (!token) {
        return res.status(500).json({ error: 'Server configuration error' });
    }

    const repo = 'software368/Balancehospitality';
    const branch = 'master';

    try {
        // Get current file SHA (required for deletion)
        const getRes = await fetch(`https://api.github.com/repos/${repo}/contents/${normalizedFile}?ref=${branch}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!getRes.ok) {
            return res.status(404).json({ error: 'File not found' });
        }

        const existing = await getRes.json();

        const deleteRes = await fetch(`https://api.github.com/repos/${repo}/contents/${normalizedFile}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                message: `Delete: ${normalizedFile}`,
                sha: existing.sha,
                branch
            })
        });

        if (!deleteRes.ok) {
            return res.status(502).json({ error: 'Failed to delete file' });
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: 'Delete failed' });
    }
};
