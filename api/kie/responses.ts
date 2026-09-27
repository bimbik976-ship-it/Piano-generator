const ALLOWED_MODELS = new Set(['gpt-6-astra', 'gpt-5-6-luna', 'gpt-5-5']);
const KIE_ENDPOINT = 'https://api.kie.ai/codex/v1/responses';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ errorType: 'METHOD_NOT_ALLOWED', message: 'POST required.' });

  const auth = req.headers?.authorization || req.headers?.['x-kie-key'] || '';
  const key = String(auth).replace(/^Bearer\s+/i, '').trim();
  if (!key) return res.status(401).json({ errorType: 'INVALID_API_KEY', httpStatus: 401, message: 'KIE API key is required.' });

  const body = req.body || {};
  const model = body.model;
  if (!ALLOWED_MODELS.has(model)) {
    return res.status(400).json({ errorType: 'MODEL_OR_REQUEST_UNSUPPORTED', httpStatus: 400, message: `Model "${model}" is not permitted.` });
  }

  const payload = { model, stream: false, input: Array.isArray(body.input) ? body.input : [] };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);
    let upstream: Response;
    try {
      upstream = await fetch(KIE_ENDPOINT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
    } finally { clearTimeout(timeout); }

    const contentType = upstream.headers.get('content-type') || '';
    const text = await upstream.text();
    let data: any = null;
    try { data = JSON.parse(text); } catch {}

    res.status(upstream.status);
    if (contentType) res.setHeader('Content-Type', contentType);
    if (data !== null) return res.json(data);
    return res.send(text);
  } catch (err: any) {
    return res.status(err?.name === 'AbortError' ? 504 : 502).json({
      errorType: err?.name === 'AbortError' ? 'GATEWAY_TIMEOUT' : 'NETWORK_ERROR',
      httpStatus: err?.name === 'AbortError' ? 504 : 502,
      message: err?.name === 'AbortError' ? 'KIE Gateway timeout.' : `Network failure: ${err?.message || 'unknown error'}`
    });
  }
}
