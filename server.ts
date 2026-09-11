import express from 'express';
import path from 'path';
import fs from 'fs';

const app = express();

const isDevSandbox = Boolean(process.env.CONTROL_PLANE_PORT || process.env.NGINX_PORT || process.env.DEFAULT_APP_PORT);
const isProduction = process.env.NODE_ENV === 'production' || !isDevSandbox;
const PORT = isDevSandbox ? 3000 : (process.env.PORT ? parseInt(process.env.PORT, 10) : 3000);

app.use(express.json({ limit: '10mb' }));

// Allowed gateway IDs only
const ALLOWED_MODELS = new Set(['gpt-6-astra', 'gpt-5-6-luna', 'gpt-5-5']);

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

/**
 * Test KIE API Key endpoint & Credit balance
 * Uses GET https://api.kie.ai/api/v1/chat/credit
 */
const handleCreditCheck = async (req: express.Request, res: express.Response) => {
  const authHeader = req.headers['authorization'] || req.headers['x-kie-key'];
  const key = typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';

  if (!key) {
    return res.status(401).json({
      valid: false,
      errorType: 'INVALID_API_KEY',
      status: 401,
      message: 'No KIE API Key provided in request.'
    });
  }

  try {
    const upstreamRes = await fetch('https://api.kie.ai/api/v1/chat/credit', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${key}`
      }
    });

    const status = upstreamRes.status;
    const responseText = await upstreamRes.text();
    let data: any = {};
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { msg: responseText };
    }

    const code = typeof data?.code === 'number' ? data.code : status;

    if (code === 401 || status === 401) {
      return res.status(401).json({
        valid: false,
        status: 401,
        errorType: 'INVALID_API_KEY',
        message: data?.msg || 'Invalid KIE API key or unauthorized.'
      });
    }

    if (code === 403 || status === 403) {
      return res.status(403).json({
        valid: false,
        status: 403,
        errorType: 'FORBIDDEN',
        message: data?.msg || 'Forbidden.'
      });
    }

    if (code === 404 || status === 404) {
      return res.status(404).json({
        valid: false,
        status: 404,
        errorType: 'ENDPOINT_NOT_FOUND',
        message: 'KIE endpoint tidak ditemukan.'
      });
    }

    if (code === 429 || status === 429) {
      return res.status(429).json({
        valid: false,
        status: 429,
        errorType: 'RATE_LIMITED',
        message: data?.msg || 'Rate limit exceeded on this key.'
      });
    }

    const gatewayBalance = typeof data?.data === 'number' ? data.data : (typeof data?.credit === 'number' ? data.credit : null);

    return res.json({
      valid: upstreamRes.ok && code === 200,
      status: code,
      gatewayBalance,
      message: data?.msg || (upstreamRes.ok ? 'Key verified successfully' : 'Upstream returned status ' + status)
    });
  } catch (err: any) {
    return res.status(502).json({
      valid: false,
      status: 502,
      errorType: 'NETWORK_ERROR',
      message: 'Network error communicating with KIE Gateway: ' + (err.message || 'Unknown network error')
    });
  }
};

app.post('/api/kie/test', handleCreditCheck);
app.get('/api/kie/test', handleCreditCheck);
app.get('/api/kie/credit', handleCreditCheck);

/**
 * Proxy route for KIE /codex/v1/responses
 * Target: https://api.kie.ai/codex/v1/responses
 */
const handleCodexGeneration = async (req: express.Request, res: express.Response) => {
  const authHeader = req.headers['authorization'] || req.headers['x-kie-key'];
  const key = typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';

  if (!key) {
    return res.status(401).json({
      error: 'Missing API key',
      errorType: 'INVALID_API_KEY',
      httpStatus: 401,
      message: 'KIE API key is required to perform generation.'
    });
  }

  const { model, input } = req.body || {};

  // Strict Model Validation
  if (!model || !ALLOWED_MODELS.has(model)) {
    return res.status(400).json({
      error: 'Invalid Model ID',
      errorType: 'MODEL_OR_REQUEST_UNSUPPORTED',
      httpStatus: 400,
      message: `Model "${model}" is not permitted. Only centralized gateway IDs (gpt-6-astra, gpt-5-6-luna, gpt-5-5) are allowed.`
    });
  }

  // Strictly minimal payload without reasoning, tools, or unnecessary fields
  const payload = {
    model,
    stream: false,
    input: Array.isArray(input) ? input : [],
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);

    let upstreamRes: Response;
    try {
      upstreamRes = await fetch('https://api.kie.ai/codex/v1/responses', {
        method: 'POST',
        // Match the official KIE request as closely as possible.
        // Do not add proxy-specific Accept/Cache-Control/User-Agent headers.
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }

    const status = upstreamRes.status;
    const contentType = upstreamRes.headers.get('content-type') || '';

    if (contentType.includes('text/event-stream')) {
      res.status(status);
      res.setHeader('Content-Type', 'text/event-stream');
      const text = await upstreamRes.text();
      return res.send(text);
    }

    const responseBody = await upstreamRes.text();
    let parsed: any = null;
    try {
      parsed = JSON.parse(responseBody);
    } catch {}

    const effectiveCode = (typeof parsed?.code === 'number' && parsed.code >= 400) ? parsed.code : status;

    // HTTP Error Classification
    if (effectiveCode === 400) {
      return res.status(400).json({
        errorType: 'BAD_REQUEST',
        httpStatus: 400,
        message: parsed?.msg || 'Permintaan tidak valid (BAD_REQUEST).',
        raw: responseBody
      });
    }

    if (effectiveCode === 401) {
      return res.status(401).json({
        errorType: 'INVALID_API_KEY',
        httpStatus: 401,
        message: parsed?.msg || 'KIE API key tidak valid (INVALID_API_KEY).',
        raw: responseBody
      });
    }

    if (effectiveCode === 403) {
      return res.status(403).json({
        errorType: 'FORBIDDEN',
        httpStatus: 403,
        message: parsed?.msg || 'Akses ke KIE Gateway dilarang (FORBIDDEN).',
        raw: responseBody
      });
    }

    if (effectiveCode === 404) {
      return res.status(404).json({
        errorType: 'ENDPOINT_NOT_FOUND',
        httpStatus: 404,
        endpoint: 'https://api.kie.ai/codex/v1/responses',
        message: 'KIE endpoint tidak ditemukan.',
        raw: responseBody
      });
    }

    if (effectiveCode === 409) {
      return res.status(409).json({
        errorType: 'CONFLICT',
        httpStatus: 409,
        message: parsed?.msg || 'Terjadi konflik permintaan (CONFLICT).',
        raw: responseBody
      });
    }

    if (effectiveCode === 422) {
      return res.status(422).json({
        errorType: 'MODEL_OR_REQUEST_UNSUPPORTED',
        httpStatus: 422,
        message: parsed?.msg || `Model "${model}" (${model}) tidak didukung oleh gateway (MODEL_OR_REQUEST_UNSUPPORTED).`,
        raw: responseBody
      });
    }

    if (effectiveCode === 429) {
      return res.status(429).json({
        errorType: 'RATE_LIMITED',
        httpStatus: 429,
        message: parsed?.msg || 'Batas kuota KIE Gateway terlampaui (RATE_LIMITED).',
        raw: responseBody
      });
    }

    if (effectiveCode >= 500) {
      return res.status(effectiveCode).json({
        errorType: 'GATEWAY_ERROR',
        httpStatus: effectiveCode,
        message: parsed?.msg || `KIE Gateway mengalami gangguan server (GATEWAY_ERROR - HTTP ${effectiveCode}).`,
        raw: responseBody
      });
    }

    // Success pass-through
    res.status(status);
    if (parsed) {
      return res.json(parsed);
    }
    return res.send(responseBody);
  } catch (err: any) {
    const isAbort = err?.name === 'AbortError';
    return res.status(isAbort ? 504 : 502).json({
      errorType: isAbort ? 'GATEWAY_TIMEOUT' : 'NETWORK_ERROR',
      httpStatus: isAbort ? 504 : 502,
      message: isAbort
        ? 'KIE Gateway tidak merespons dalam 90 detik.'
        : 'Network failure calling KIE Gateway: ' + (err.message || 'Cannot reach endpoint')
    });
  }
};

app.post('/api/kie/responses', handleCodexGeneration);
app.post('/codex/v1/responses', handleCodexGeneration);

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = fs.existsSync(path.join(process.cwd(), 'dist'))
      ? path.join(process.cwd(), 'dist')
      : __dirname;
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PETA PIANO AI] Server running on http://0.0.0.0:${PORT}`);
  });
  server.on('error', (err: any) => {
    console.error(`[PETA PIANO AI] Server error on port ${PORT}:`, err?.message || err);
  });

  // In production (Cloud Run), if PORT is not 3000, also listen on 3000 as secondary port if available
  if (isProduction && PORT !== 3000 && !isDevSandbox) {
    const secondaryServer = app.listen(3000, '0.0.0.0', () => {
      console.log(`[PETA PIANO AI] Also listening on secondary port 3000`);
    });
    secondaryServer.on('error', (err: any) => {
      console.log(`[PETA PIANO AI] Secondary port 3000 skipped (${err?.code || err?.message})`);
    });
  }
}

startServer();
