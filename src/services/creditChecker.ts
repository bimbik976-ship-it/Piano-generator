import { ErrorType } from '../types';

export interface CreditCheckResult {
  valid: boolean;
  status: number;
  gatewayBalance: number | null;
  message: string;
  errorType?: ErrorType;
}

/**
 * Checks KIE.AI credit balance using:
 * GET https://api.kie.ai/api/v1/chat/credit
 * Headers: Authorization: Bearer <KIE_API_KEY>
 * Response: { code: 200, msg: "success", data: 100 }
 */
export async function fetchKieCredit(rawKey: string): Promise<CreditCheckResult> {
  const cleanKey = rawKey.trim();
  if (!cleanKey) {
    return {
      valid: false,
      status: 401,
      gatewayBalance: null,
      errorType: 'INVALID_API_KEY',
      message: 'API Key kosong.',
    };
  }

  // Always use the same-origin server proxy. The server performs the upstream
  // KIE request, keeping browser/CORS behavior consistent with generation.
  try {
    const proxyRes = await fetch('/api/kie/credit', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cleanKey}`,
      },
    });

    const text = await proxyRes.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }

    return {
      valid: Boolean(data.valid),
      status: typeof data.status === 'number' ? data.status : proxyRes.status,
      gatewayBalance: typeof data.gatewayBalance === 'number' ? data.gatewayBalance : null,
      message: data.message || 'Pemeriksaan kredit selesai.',
      errorType: data.errorType,
    };
  } catch (err: any) {
    return {
      valid: false,
      status: 0,
      gatewayBalance: null,
      errorType: 'NETWORK_ERROR',
      message: 'Gagal menghubungi KIE credit check: ' + (err?.message || 'Koneksi gagal'),
    };
  }
}
