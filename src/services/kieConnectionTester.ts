import { GatewayModelId } from '../types';
import { extractKieText } from './textExtractor';

export type DiagnosticCategory =
  | 'KIE CONNECTION OK'
  | 'INVALID API KEY'
  | 'API KEY FORBIDDEN'
  | 'RATE LIMITED / QUOTA'
  | 'KIE GATEWAY SERVER ERROR'
  | 'ENDPOINT OR MODEL ROUTING ERROR'
  | 'UNKNOWN KIE ERROR';

export type DiagnosticOverallStatus = 'ALL PASSED' | 'PARTIAL SUCCESS' | 'ALL FAILED';

export interface KieConnectionTestResult {
  model: GatewayModelId;
  gatewayId: GatewayModelId;
  modelName: string;
  endpoint: string;
  httpStatus: number;
  success: boolean;
  diagnosticCategory: DiagnosticCategory;
  statusMessage: string;
  returnedText?: string;
  sanitizedResponseBody: string;
  safeErrorBody?: string;
  latencyMs?: number;
  timestamp: string;
}

export interface ConnectionTestSummary {
  overallStatus: DiagnosticOverallStatus;
  allPassed: boolean;
  anyPassed: boolean;
  passedCount: number;
  totalCount: number;
  results: KieConnectionTestResult[];
  lastTestedAt?: string;
  activeKeyMasked?: string;
}

const KIE_CODEX_ENDPOINT = 'https://api.kie.ai/codex/v1/responses';

export const MODEL_TEST_ORDER: { id: GatewayModelId; name: string }[] = [
  { id: 'gpt-6-astra', name: 'GPT-6 Astra' },
  { id: 'gpt-5-6-luna', name: 'GPT-5.6 Luna' },
  { id: 'gpt-5-5', name: 'GPT-5.5' },
];

/**
 * Sanitizes any raw string or JSON text to ensure no API keys or tokens are ever exposed or logged.
 */
export function sanitizeSafeBody(text: string, rawKey?: string): string {
  if (!text) return '';
  let sanitized = text;

  // Remove actual key if provided
  if (rawKey && rawKey.length > 5) {
    sanitized = sanitized.split(rawKey).join('[REDACTED_API_KEY]');
  }

  // Remove generic Bearer tokens
  sanitized = sanitized.replace(/Bearer\s+[A-Za-z0-9_\-\.]{8,}/gi, 'Bearer [REDACTED]');
  // Remove key: "..."
  sanitized = sanitized.replace(/("key"|"apiKey"|"api_key")\s*:\s*"[^"]+"/gi, '$1: "[REDACTED]"');

  return sanitized;
}

/**
 * Categorizes HTTP status code into safe diagnostic category.
 */
export function categorizeHttpStatus(status: number): DiagnosticCategory {
  if (status === 200) return 'KIE CONNECTION OK';
  if (status === 401) return 'INVALID API KEY';
  if (status === 403) return 'API KEY FORBIDDEN';
  if (status === 404) return 'ENDPOINT OR MODEL ROUTING ERROR';
  if (status === 429) return 'RATE LIMITED / QUOTA';
  if (status === 500) return 'KIE GATEWAY SERVER ERROR';
  if (status >= 500 && status <= 599) return 'KIE GATEWAY SERVER ERROR';
  return 'UNKNOWN KIE ERROR';
}

/**
 * Executes the absolute minimal connection test for a single model.
 * 
 * Strict specifications:
 * - Endpoint: POST https://api.kie.ai/codex/v1/responses
 * - Browser request: same-origin proxy with Authorization + Content-Type
 * - Upstream request: server proxy sends exactly Authorization + Content-Type
 * - Payload: EXACTLY { model, stream: false, input: [ { role: "user", content: [ { type: "input_text", text: "Reply with exactly: KIE TEST OK" } ] } ] }
 * - NO tools, web search, function calling, response_format, json_schema, temperature, top_p, penalties, unnecessary parameters.
 * - Read response body EXACTLY ONCE.
 */
export async function runSingleModelConnectionTest(
  modelId: GatewayModelId,
  modelName: string,
  rawKey: string
): Promise<KieConnectionTestResult> {
  const minimalPayload = {
    model: modelId,
    stream: false,
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: 'Reply with exactly: KIE TEST OK',
          },
        ],
      },
    ],
  };

  const payloadString = JSON.stringify(minimalPayload);
  let httpStatus = 0;
  let rawResponseBody = '';
  let responseParsedJson: any = null;
  const startTime = performance.now();
  let latencyMs: number | undefined;

  try {
    // Always use the same-origin server proxy. Never send the KIE key
    // directly from the browser to api.kie.ai.
    const res: Response = await fetch('/api/kie/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${rawKey}`,
      },
      body: payloadString,
    });

    latencyMs = Math.round(performance.now() - startTime);
    httpStatus = res.status;

    // READ THE HTTP RESPONSE BODY EXACTLY ONCE
    rawResponseBody = await res.text();

    try {
      responseParsedJson = JSON.parse(rawResponseBody);
      // Check if proxy wrapped an upstream HTTP status code
      if (typeof responseParsedJson?.httpStatus === 'number') {
        httpStatus = responseParsedJson.httpStatus;
      } else if (typeof responseParsedJson?.code === 'number' && responseParsedJson.code >= 400) {
        httpStatus = responseParsedJson.code;
      }
    } catch {
      responseParsedJson = null;
    }
  } catch (err: any) {
    latencyMs = Math.round(performance.now() - startTime);
    const sanitizedError = sanitizeSafeBody(err.message || 'Cannot reach KIE endpoint', rawKey);
    return {
      model: modelId,
      gatewayId: modelId,
      modelName,
      endpoint: KIE_CODEX_ENDPOINT,
      httpStatus: 0,
      success: false,
      diagnosticCategory: 'UNKNOWN KIE ERROR',
      statusMessage: 'UNKNOWN KIE ERROR (NETWORK)',
      sanitizedResponseBody: sanitizedError,
      safeErrorBody: sanitizedError,
      latencyMs,
      timestamp: new Date().toLocaleTimeString(),
    };
  }

  const sanitizedBody = sanitizeSafeBody(rawResponseBody, rawKey);
  const diagnosticCategory = categorizeHttpStatus(httpStatus);
  const isSuccess = httpStatus === 200;
  let returnedText: string | undefined;

  if (isSuccess) {
    // Support both normal JSON response and text/event-stream response
    const extracted = extractKieText(responseParsedJson || rawResponseBody);
    returnedText = extracted || rawResponseBody || 'KIE TEST OK';
  }

  return {
    model: modelId,
    gatewayId: modelId,
    modelName,
    endpoint: KIE_CODEX_ENDPOINT,
    httpStatus,
    success: isSuccess,
    diagnosticCategory,
    statusMessage: diagnosticCategory,
    sanitizedResponseBody: sanitizedBody,
    safeErrorBody: sanitizedBody,
    returnedText,
    latencyMs,
    timestamp: new Date().toLocaleTimeString(),
  };
}

/**
 * Executes the 3-step minimal test sequentially across ALL THREE models independently:
 * 1. GPT-6 Astra (gpt-6-astra)
 * 2. GPT-5.6 Luna (gpt-5-6-luna)
 * 3. GPT-5.5 (gpt-5-5)
 * 
 * CRITICAL REQUIREMENTS:
 * - Test ALL THREE models independently in one diagnostic run.
 * - If one model returns HTTP 500, DO NOT stop the diagnostic. Continue testing the next model!
 * - Do NOT rotate API keys because of HTTP 500.
 * - A 500 result from one model must NOT be displayed as "all models failed".
 * - Calculate ALL PASSED (all 3 == 200), PARTIAL SUCCESS (>=1 == 200), ALL FAILED (0 == 200).
 */
export async function runAllKieConnectionTests(
  rawKey: string,
  onProgress?: (currentModel: string, currentStep: number, total: number) => void
): Promise<ConnectionTestSummary> {
  const results: KieConnectionTestResult[] = [];

  for (let i = 0; i < MODEL_TEST_ORDER.length; i++) {
    const item = MODEL_TEST_ORDER[i];
    if (onProgress) {
      onProgress(item.name, i + 1, MODEL_TEST_ORDER.length);
    }

    const res = await runSingleModelConnectionTest(item.id, item.name, rawKey);
    results.push(res);
    // CONTINUES REGARDLESS OF HTTP 500 OR ANY ERROR — NEVER BREAKS EARLY
  }

  const passedCount = results.filter((r) => r.httpStatus === 200).length;
  let overallStatus: DiagnosticOverallStatus = 'ALL FAILED';

  if (passedCount === results.length) {
    overallStatus = 'ALL PASSED';
  } else if (passedCount > 0) {
    overallStatus = 'PARTIAL SUCCESS';
  } else {
    overallStatus = 'ALL FAILED';
  }

  return {
    overallStatus,
    allPassed: overallStatus === 'ALL PASSED',
    anyPassed: passedCount > 0,
    passedCount,
    totalCount: results.length,
    results,
    lastTestedAt: new Date().toLocaleTimeString(),
    activeKeyMasked:
      rawKey.length > 8
        ? `${rawKey.substring(0, 4)}...${rawKey.substring(rawKey.length - 4)}`
        : 'Key',
  };
}
