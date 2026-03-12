// Vercel serverless function — saves inline edits to GitHub
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { token, file, content, message } = req.body;

    if (!token || !file || content === undefined) {
        return res.status(400).json({ error: 'Missing required fields: token, file, content' });
    }

    const repo = 'software368/Balancehospitality';
    const branch = 'master';

    try {
        // Get current file SHA (needed for update)
        const getRes = await fetch(`https://api.github.com/repos/${repo}/contents/${file}?ref=${branch}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!getRes.ok && getRes.status !== 404) {
            const err = await getRes.json();
            return res.status(getRes.status).json({ error: err.message });
        }

        const existing = getRes.status === 404 ? null : await getRes.json();
        const sha = existing ? existing.sha : undefined;

        // Base64 encode the content
        const encoded = Buffer.from(content, 'utf-8').toString('base64');

        // Create or update file
        const putBody = {
            message: message || 'Update content via visual editor',
            content: encoded,
            branch
        };
        if (sha) putBody.sha = sha;

        const putRes = await fetch(`https://api.github.com/repos/${repo}/contents/${file}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify(putBody)
        });

        if (!putRes.ok) {
            const err = await putRes.json();
            return res.status(putRes.status).json({ error: err.message });
        }

        const result = await putRes.json();
        return res.status(200).json({ success: true, sha: result.content.sha });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to save: ' + error.message });
    }
}
