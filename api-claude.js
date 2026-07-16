// ============================================================
// api/claude.js — Vercel Serverless Proxy for the Law-Draft
// Scrutiny Dashboard (ain-khosra-ai-dashboard)
//
// Repo layout:
//   /index.html          ← ain-khosra-ai-dashboard.html (renamed)
//   /api/claude.js       ← this file (path must be exactly api/claude.js)
//
// Vercel setup (one time):
//   Project → Settings → Environment Variables
//   ANTHROPIC_API_KEY = sk-ant-xxxxxxxx   (Production + Preview)
//   → Redeploy
//
// The dashboard automatically tries POST /api/claude first when
// no key is entered in the UI, so no front-end change is needed.
// ============================================================

const MAX_BODY = 200_000; // ~200 KB guard for oversized payloads

export default async function handler(req, res) {
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
}
