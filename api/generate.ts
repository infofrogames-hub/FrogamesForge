import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt } = req.body ?? {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Missing prompt' });
  }

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 1200,
            temperature: 0.7,
            topP: 0.9
          }
        })
      }
    );

    const data = await r.json();

    if (!r.ok) {
      return res.status(r.status).json({ error: data?.error?.message || 'Gemini error', raw: data });
    }

    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    // Converti Markdown bold **...** in <strong>...</strong> (Shopify-friendly)
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // (Opzionale) Liste numerate markdown "1. " -> "1) "
    text = text.replace(/^(\s*)(\d+)\.\s+/gm, '$1$2) ');

    // Pulizia a capo e spazi
    text = text.replace(/\n{4,}/g, '\n\n\n').trim();

    return res.status(200).json({ text });
  } catch (err: any) {
    return res.status(500).json({ error: 'Request failed', detail: String(err?.message || err) });
  }
}
