// ============================================================
// api/claude.js — Vercel Serverless Proxy (CommonJS — works on
// any Vercel project, no package.json needed)
//
// Repo layout:
//   /index.html      ← the dashboard (renamed)
//   /api/claude.js   ← this file (path must be exactly api/claude.js)
//
// Vercel one-time setup:
//   Project → Settings → Environment Variables
//   ANTHROPIC_API_KEY = sk-ant-xxxxxxxx  (Production + Preview)
//   → Deployments → ⋯ → Redeploy
//
// Verify after deploy: open  https://<your-app>.vercel.app/api/claude
// in the browser — it must return {"error":{"message":"POST only"}}.
// If it shows 404 or the file's source code, the function did not
// deploy: check the folder is named exactly "api" at repo root.
// ============================================================

const MAX_BODY = 200000; // ~200 KB payload guard

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: { message: 'POST only' } });
    return;
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(401).json({ error: { message: 'ANTHROPIC_API_KEY is not set on Vercel' } });
    return;
  }

  try {
    const body = req.body || {};
    if (JSON.stringify(body).length > MAX_BODY) {
      res.status(413).json({ error: { message: 'Payload too large' } });
      return;
    }

    // Allow only what the dashboard actually sends
    const payload = {
      model: 'claude-sonnet-4-6',
      max_tokens: Math.min(Number(body.max_tokens) || 1000, 2000),
      messages: body.messages,
      ...(body.tools ? { tools: body.tools } : {})
    };

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload)
    });

    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) {
    res.status(500).json({ error: { message: String(e) } });
  }
};
