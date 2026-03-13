const { methodGuard, originGuard, parseBody, validateSession } = require('./_shared');

module.exports = async function handler(req, res) {
    if (!methodGuard(req, res, 'POST')) return;
    if (!originGuard(req, res)) return;

    const body = parseBody(req);

    if (!validateSession(body)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!body.data || !body.filename) {
        return res.status(400).json({ error: 'Missing required fields: data, filename' });
    }

    // Sanitize filename: only allow alphanumeric, hyphens, underscores, dots
    const safeName = body.filename.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase();
    if (!safeName || !/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(safeName)) {
        return res.status(400).json({ error: 'Invalid filename. Allowed: jpg, jpeg, png, gif, webp, svg' });
    }

    // Limit file size (~5MB base64 ≈ ~6.7MB string)
    if (body.data.length > 7 * 1024 * 1024) {
        return res.status(413).json({ error: 'File too large. Maximum 5MB.' });
    }

    const token = process.env.GITHUB_PAT;
    if (!token) {
        return res.status(500).json({ error: 'Server configuration error' });
    }

    const repo = 'software368/Balancehospitality';
    const branch = 'master';
    const filePath = `uploads/${safeName}`;

    try {
        // Strip data URL prefix if present (e.g. "data:image/png;base64,...")
        let base64Data = body.data;
        const commaIdx = base64Data.indexOf(',');
        if (commaIdx !== -1 && commaIdx < 100) {
            base64Data = base64Data.slice(commaIdx + 1);
        }

        // Check if file already exists (get SHA for update)
        const getRes = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}?ref=${branch}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        const existing = getRes.status === 404 ? null : await getRes.json();
        const sha = existing && existing.sha ? existing.sha : undefined;

        const putBody = {
            message: `Upload image: ${safeName}`,
            content: base64Data,
            branch
        };
        if (sha) putBody.sha = sha;

        const putRes = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify(putBody)
        });

        if (!putRes.ok) {
            const errData = await putRes.json().catch(() => ({}));
            return res.status(502).json({ error: 'Failed to upload image', detail: errData.message });
        }

        const result = await putRes.json();
        const publicUrl = result.content.download_url || `https://raw.githubusercontent.com/${repo}/${branch}/${filePath}`;

        return res.status(200).json({ success: true, url: publicUrl, path: filePath, sha: result.content.sha });
    } catch (error) {
        return res.status(500).json({ error: 'Upload failed' });
    }
};
