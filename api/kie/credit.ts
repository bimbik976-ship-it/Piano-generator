const KIE_CREDIT_ENDPOINT = 'https://api.kie.ai/api/v1/chat/credit';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ valid: false, message: 'GET or POST required.' });
  const auth = req.headers?.authorization || req.headers?.['x-kie-key'] || '';
  const key = String(auth).replace(/^Bearer\s+/i, '').trim();
  if (!key) return res.status(401).json({ valid: false, status: 401, errorType: 'INVALID_API_KEY', message: 'No KIE API Key provided.' });
  try {
    const upstream = await fetch(KIE_CREDIT_ENDPOINT, { method: 'GET', headers: { Authorization: `Bearer ${key}` } });
    const text = await upstream.text();
    let data: any = {};
    try { data = JSON.parse(text); } catch { data = { msg: text }; }
    const code = typeof data?.code === 'number' ? data.code : upstream.status;
    const gatewayBalance = typeof data?.data === 'number' ? data.data : (typeof data?.credit === 'number' ? data.credit : null);
    if (code === 401 || code === 403 || code === 404 || code === 429) return res.status(code).json({ valid: false, status: code, errorType: code === 404 ? 'ENDPOINT_NOT_FOUND' : code === 429 ? 'RATE_LIMITED' : 'INVALID_API_KEY', message: data?.msg || `KIE returned HTTP ${code}`, gatewayBalance });
    return res.status(upstream.status).json({ valid: upstream.ok && code === 200, status: code, gatewayBalance, message: data?.msg || 'Key checked.' });
  } catch (err: any) {
    return res.status(502).json({ valid: false, status: 502, errorType: 'NETWORK_ERROR', message: err?.message || 'Network error.' });
  }
}
