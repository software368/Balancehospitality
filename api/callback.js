module.exports = async function handler(req, res) {
    const { code } = req.query;

    if (!code) {
        return res.status(400).send('Missing code parameter');
    }

    try {
        const response = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code,
            }),
        });

        const data = await response.json();

        if (data.error) {
            return res.status(400).json({ error: data.error_description });
        }

        const tokenData = JSON.stringify({ token: data.access_token, provider: 'github' });
        const html = `<!DOCTYPE html><html><body><script>
(function() {
    function receiveMessage(e) {
        window.opener.postMessage(
            'authorization:github:success:${tokenData}',
            e.origin
        );
        window.removeEventListener("message", receiveMessage, false);
    }
    window.addEventListener("message", receiveMessage, false);
    window.opener.postMessage("authorizing:github", "*");
})();
</script></body></html>`;

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    } catch (error) {
        res.status(500).json({ error: 'Authentication failed' });
    }
};
