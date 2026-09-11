import {
  GatewayModelId,
  GeneratedTrackResult,
  GeneratorSettings,
  ErrorType,
  SafeDebugInfo,
  RoutingMode
} from '../types';
import { AUTO_FALLBACK_CHAIN, DEFAULT_MODEL_ID, getModelUIName, validateGatewayModelId } from '../config/models';
import { extractKieText } from './textExtractor';
import { INVALID_JSON, parseModelJSON } from './jsonParser';
import { validateOutput } from './validator';
import { checkMusicalUniqueness, SUBSTANTIAL_DIFFERENCE_INSTRUCTION } from './similarityEngine';
import { ApiKeyManager } from './apiKeyManager';
import { sanitizeSafeBody } from './kieConnectionTester';

export { extractKieText };

export interface GenerationRequestOptions {
  settings: GeneratorSettings;
  batchNumber: number;
  selectedModelId: GatewayModelId;
  routingMode: RoutingMode;
  previousBatchTracks: GeneratedTrackResult[];
  onStatusUpdate?: (statusMessage: string) => void;
}

export interface GenerationSuccessResponse {
  success: true;
  track: GeneratedTrackResult;
  modelUsed: string;
  gatewayModelId: GatewayModelId;
  debugInfo?: SafeDebugInfo;
}

export interface GenerationErrorResponse {
  success: false;
  errorType: ErrorType;
  errorMessage: string;
  debugInfo: SafeDebugInfo;
}

export type GenerationResponse = GenerationSuccessResponse | GenerationErrorResponse;

export interface ParsedKieResponse {
  httpStatus: number;
  contentType: string;
  rawText: string;
  parsedJson: any | null;
  isJson: boolean;
  assistantText: string;
}

export class KieBodyReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'KieBodyReadError';
  }
}

/**
 * Reads the HTTP response body EXACTLY ONCE.
 * Uses const raw = await response.text() as mandated.
 */
export async function readKieResponseBody(response: Response): Promise<{ rawText: string; isStream: boolean }> {
  const rawText = await response.text();
  const contentType = response.headers.get('content-type') || '';
  const isStream = contentType.includes('text/event-stream') || rawText.includes('data:');
  return { rawText, isStream };
}

/**
 * Parses HTTP response safely without multiple stream reads
 */
export async function parseKieResponse(response: Response): Promise<ParsedKieResponse> {
  const httpStatus = response.status;
  const contentType = response.headers.get('content-type') || '';

  let rawText = '';
  try {
    const readResult = await readKieResponseBody(response);
    rawText = readResult.rawText;
  } catch (err: any) {
    throw new KieBodyReadError(err?.message || 'Gagal membaca response stream');
  }

  let parsedJson: any = null;
  let isJson = false;

  if (rawText && rawText.trim()) {
    try {
      parsedJson = JSON.parse(rawText);
      isJson = true;
    } catch {
      isJson = false;
    }
  }

  const assistantText = extractKieText(isJson ? parsedJson : rawText);

  return {
    httpStatus,
    contentType,
    rawText,
    parsedJson,
    isJson,
    assistantText,
  };
}

export function mapHttpStatusToErrorType(status: number): ErrorType {
  if (status === 400) return 'BAD_REQUEST';
  if (status === 401) return 'INVALID_API_KEY';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'ENDPOINT_NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 422) return 'MODEL_OR_REQUEST_UNSUPPORTED';
  if (status === 429) return 'RATE_LIMITED';
  if (status >= 500) return 'GATEWAY_ERROR';
  return 'UNKNOWN_ERROR';
}

/**
 * Builds the exact prompt for Suno style prompt generation.
 * Anti-repetition history is strictly included inside the user text only.
 */
export function buildGenerationPrompt(
  settings: GeneratorSettings,
  batchNumber: number,
  attempt: number,
  specialDirective?: string,
  previousBatchTracks?: GeneratedTrackResult[]
): string {
  let antiRepetitionSection = '';
  if (previousBatchTracks && previousBatchTracks.length > 0) {
    const recent = previousBatchTracks
      .slice(-5)
      .map(
        (t) =>
          `- Track #${t.batchNumber}: Key ${t.key}, ${t.bpm} BPM, Instruments: [${t.instruments.join(', ')}], Piano: ${t.metadata.pianoType}`
      )
      .join('\n');
    antiRepetitionSection = `
ANTI-REPETITION CONSTRAINTS (DO NOT REPEAT THESE RECENT STYLES):
The following instrumental piano styles have already been generated for this album batch:
${recent}
You MUST generate a musically distinct, fresh piano concept with a different key, tempo, and texture that does not duplicate the above tracks.
`.trim();
  }

  const baseInstructions = `
You are the AI engine for PETA PIANO AI, a professional music intelligence system that engineers high-performing SUNO STYLE PROMPTS strictly for INSTRUMENTAL PIANO music.
Target output is ONE single instrumental piano style prompt and associated musical parameters for Track #${batchNumber} of a 25-track instrumental album/batch.

CRITICAL CONSTRAINTS:
- STRICTLY INSTRUMENTAL. NEVER include lyrics, vocal references, lead vocalists, backing vocals, or lyrical song structures (no "verse 1", no "chorus").
- NEVER use any of these FORBIDDEN TERMS anywhere in the final prompt:
  "neo-classical", "neoclassical", "contemporary classical", "classical piano", "classical composition".
- Produce a natural, highly evocative Suno style prompt describing:
  genre, piano character (e.g. felt upright, grand piano, damped hammers), playing style (e.g. rubato, sparse voicings, gentle ostinato), tempo, key/tonality, harmony, chord movement, register, voicing, dynamics, articulation, ambience, acoustic texture, production character, spatial character, arrangement density, emotional atmosphere, and intended listening context.

MANDATORY LOW-INTENSITY CONSTRAINTS:
1. EMOTIONAL INTENSITY (Target Range: 0–30%):
   - Set "emotional" value strictly between 0 and 30 (LOW).
   - Avoid strong emotional drama, sentimental intensity, dramatic swells, or emotionally expressive phrasing. Keep the emotional tone calm, tranquil, serene, and understated.
2. CINEMATIC INTENSITY (Target Range: 0–20%):
   - Set "cinematic" value strictly between 0 and 20 (LOW).
   - Avoid epic, cinematic, dramatic, orchestral, trailer-like, or soundtrack-style characteristics. Keep the arrangement intimate and acoustic.
3. MUSICAL ACTIVITY (Target Range: 0–25%):
   - Set "musicalActivity" value strictly between 0 and 25 (LOW).
   - The generated instrumental piano must emphasize: sparse playing, slow musical movement, generous rests, minimal note density, limited ornamentation, gentle repetition, restrained chord changes, and calm sustained tones. NEVER include busy melodic movement, rapid runs, or dense flourishes.
4. PROMPT CONSISTENCY:
   - The actual Suno Style Prompt must match the LOW intensity values.
   - Do NOT generate a prompt with highly emotional, cinematic, or musically busy characteristics while showing LOW intensity values.
   - Explicitly weave sparse, gentle, quiet, restrained, and calm instrumental piano textures into the style prompt.
${antiRepetitionSection ? `\n${antiRepetitionSection}\n` : ''}
USER PARAMETERS:
- Instrument Type: ${settings.pianoType}
- Usage Categories: ${settings.categories.join(', ')}
- Target Genre: ${settings.genre}
- Mood & Atmosphere: ${settings.moods.join(', ')}
- Aesthetic Context / Country: ${settings.country}

Return ONLY valid JSON.
Do not use markdown.
Do not use \`\`\`.
Do not add explanations.
Do not add text before or after JSON.

Required JSON structure:
{
  "stylePrompt": "A single comprehensive comma-separated or descriptive musical style prompt ready for Suno's style field",
  "bpm": 68,
  "key": "C Major",
  "instruments": ["felt piano", "soft ambient warmth"],
  "metadata": {
    "pianoType": "${settings.pianoType}",
    "category": "${settings.categories[0] || 'Relaxation'}",
    "genre": "${settings.genre}",
    "mood": "${settings.moods[0] || 'Calm'}",
    "country": "${settings.country}"
  },
  "styleIntensity": {
    "ambient": 85,
    "minimalist": 90,
    "meditative": 95,
    "sleepFriendly": 90,
    "emotional": 15,
    "cinematic": 10,
    "musicalActivity": 12
  }
}
`.trim();

  // Retry directives
  let directive = 'Return ONLY valid JSON.\nDo not use markdown.\nDo not use ```.\nDo not add explanations.\nDo not add text before or after JSON.';

  if (attempt === 2) {
    directive = 'Return ONLY valid JSON. Do not use markdown. Do not use ```. No explanation.';
  } else if (attempt === 3) {
    directive = 'Your previous output was not valid JSON. Return ONLY valid JSON matching the Required JSON structure.';
  }

  if (specialDirective) {
    directive = `${specialDirective}\n\n${directive}`;
  }

  return `${baseInstructions}\n\n${directive}`;
}

/**
 * Execute generation with retry pipeline and model fallback
 */
export async function executeGeneration(
  options: GenerationRequestOptions
): Promise<GenerationResponse> {
  const {
    settings,
    batchNumber,
    selectedModelId,
    routingMode,
    previousBatchTracks,
    onStatusUpdate = () => {}
  } = options;

  const keyManager = ApiKeyManager.getInstance();
  const activeKeys = keyManager.getActiveKeys();

  if (activeKeys.length === 0) {
    const debugInfo: SafeDebugInfo = {
      selectedModel: getModelUIName(selectedModelId),
      gatewayModelId: selectedModelId,
      errorType: 'API_KEY_ERROR',
      errorMessage: 'Tidak ada Kunci KIE Aktif di dalam API Key Pool.',
      time: new Date().toLocaleTimeString(),
    };
    return {
      success: false,
      errorType: 'API_KEY_ERROR',
      errorMessage: 'Tidak ada Kunci KIE Aktif. Tambahkan atau aktifkan KIE API key di tab API.',
      debugInfo,
    };
  }

  // Determine model chain:
  // In AUTO mode: starts with selected (or default) and falls back down AUTO_FALLBACK_CHAIN
  // In MANUAL mode: only tries the user-selected model
  const modelsToTry: GatewayModelId[] =
    routingMode === 'AUTO'
      ? Array.from(new Set([selectedModelId, ...AUTO_FALLBACK_CHAIN]))
      : [selectedModelId];

  const failedKeyIds = new Set<string>();
  let currentKey =
    routingMode === 'MANUAL'
      ? (keyManager.getManualSelectedKey() || activeKeys[0])
      : (keyManager.getNextActiveKey() || activeKeys[0]);
  let lastDebugInfo: SafeDebugInfo | null = null;

  for (let modelIdx = 0; modelIdx < modelsToTry.length; modelIdx++) {
    const candidateModelId = modelsToTry[modelIdx];
    const candidateModelName = getModelUIName(candidateModelId);

    // Max 3 attempts for this model (for JSON repair / retry / duplicate)
    const MAX_ATTEMPTS = 3;
    let attempt = 1;
    let specialDirective: string | undefined = undefined;

    while (attempt <= MAX_ATTEMPTS) {
      onStatusUpdate(`VALIDATING MUSICAL OUTPUT... (Model: ${candidateModelName}, Percobaan ${attempt}/${MAX_ATTEMPTS})`);

      // Prompt text with anti-repetition included inside user text only
      const promptText = buildGenerationPrompt(settings, batchNumber, attempt, specialDirective, previousBatchTracks);

      // Safe Diagnostic Log (Never logs auth, bearer token, or API key)
      console.log(`[PETA PIANO AI] Safe Diagnostic Dispatch:
Provider: KIE.AI
Endpoint: /codex/v1/responses
Model: ${candidateModelName}
Model ID: ${candidateModelId}`);

      // 1. Fresh ultra-minimal payload strictly as specified:
      // only minimal model object and user input array, strictly excluding previous response IDs,
      // conversation history, or shared state.
      const payload = {
        model: candidateModelId,
        stream: false,
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: promptText,
              },
            ],
          },
        ],
      };

      // 2. Fresh AbortController with 60s timeout for this single request attempt
      let abortCtrl: AbortController | null = new AbortController();
      let timeoutId: ReturnType<typeof setTimeout> | null = setTimeout(() => {
        try {
          abortCtrl?.abort();
        } catch {
          // Ignore abort errors
        }
      }, 60000);

      // 3. Fresh temporary request headers scoped strictly to this single attempt
      let reqHeaders: Record<string, string> | null = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentKey.rawKey}`,
      };

      // 4. Fresh stringified body
      let bodyJson: string | null = JSON.stringify(payload);

      let parsedRes: ParsedKieResponse;
      let httpStatus = 200;

      try {
        let res: Response;
        // 5. Always use the same-origin server proxy.
        // The proxy sends the upstream request using only the official KIE
        // Authorization + Content-Type headers, avoiding browser/gateway differences.
        res = await fetch('/api/kie/responses', {
          method: 'POST',
          headers: reqHeaders,
          body: bodyJson,
          signal: abortCtrl.signal,
        });

        httpStatus = res.status;

        // 6. Read response body EXACTLY ONCE
        parsedRes = await parseKieResponse(res);
      } catch (err: any) {
        if (err instanceof KieBodyReadError || err?.name === 'KieBodyReadError') {
          lastDebugInfo = {
            selectedModel: candidateModelName,
            gatewayModelId: candidateModelId,
            endpoint: 'https://api.kie.ai/codex/v1/responses',
            httpStatus,
            errorType: 'RESPONSE_BODY_READ_ERROR',
            errorMessage: err.message || 'Stream body read error.',
            time: new Date().toLocaleTimeString(),
            attempt,
          };
          return {
            success: false,
            errorType: 'RESPONSE_BODY_READ_ERROR',
            errorMessage: 'Terjadi kegagalan saat membaca data response (RESPONSE_BODY_READ_ERROR).',
            debugInfo: lastDebugInfo,
          };
        }

        lastDebugInfo = {
          selectedModel: candidateModelName,
          gatewayModelId: candidateModelId,
          endpoint: 'https://api.kie.ai/codex/v1/responses',
          errorType: 'NETWORK_ERROR',
          errorMessage: err.message || 'Koneksi ke gateway terputus.',
          time: new Date().toLocaleTimeString(),
          attempt,
        };
        return {
          success: false,
          errorType: 'NETWORK_ERROR',
          errorMessage: 'Terjadi kesalahan jaringan (Network Error). Periksa koneksi internet Anda.',
          debugInfo: lastDebugInfo,
        };
      } finally {
        // 7. Explicit cleanup logic to destroy the AbortController and clear temporary request headers
        // to prevent stale state propagation across attempts or retries
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        if (abortCtrl) {
          try {
            if (!abortCtrl.signal.aborted) {
              abortCtrl.abort();
            }
          } catch {
            // Ignore abort errors on cleanup
          }
          abortCtrl = null;
        }
        if (reqHeaders) {
          for (const headerKey of Object.keys(reqHeaders)) {
            delete reqHeaders[headerKey];
          }
          reqHeaders = null;
        }
        bodyJson = null;
      }

      // Check if KIE returned an error code inside JSON or through HTTP status
      const effectiveCode = (httpStatus >= 400)
        ? httpStatus
        : (parsedRes.isJson && typeof parsedRes.parsedJson?.code === 'number' && parsedRes.parsedJson.code >= 400)
          ? parsedRes.parsedJson.code
          : httpStatus;

      if (effectiveCode >= 400) {
        const errorType: ErrorType = mapHttpStatusToErrorType(effectiveCode);
        let errorMessage = '';

        if (effectiveCode === 404) {
          errorMessage = 'KIE endpoint tidak ditemukan.';
        } else if (effectiveCode === 400) {
          errorMessage = parsedRes.isJson && (parsedRes.parsedJson?.msg || parsedRes.parsedJson?.message)
            ? (parsedRes.parsedJson?.msg || parsedRes.parsedJson?.message)
            : 'Permintaan tidak valid (BAD_REQUEST).';
        } else if (effectiveCode === 401) {
          errorMessage = parsedRes.isJson && (parsedRes.parsedJson?.msg || parsedRes.parsedJson?.message)
            ? (parsedRes.parsedJson?.msg || parsedRes.parsedJson?.message)
            : 'KIE API key tidak valid (INVALID_API_KEY).';
        } else if (effectiveCode === 403) {
          errorMessage = parsedRes.isJson && (parsedRes.parsedJson?.msg || parsedRes.parsedJson?.message)
            ? (parsedRes.parsedJson?.msg || parsedRes.parsedJson?.message)
            : 'Akses ke KIE Gateway dilarang (FORBIDDEN).';
        } else if (effectiveCode === 409) {
          errorMessage = parsedRes.isJson && (parsedRes.parsedJson?.msg || parsedRes.parsedJson?.message)
            ? (parsedRes.parsedJson?.msg || parsedRes.parsedJson?.message)
            : 'Terjadi konflik permintaan (CONFLICT).';
        } else if (effectiveCode === 422) {
          errorMessage = parsedRes.isJson && (parsedRes.parsedJson?.msg || parsedRes.parsedJson?.message)
            ? (parsedRes.parsedJson?.msg || parsedRes.parsedJson?.message)
            : `Model "${candidateModelName}" (${candidateModelId}) tidak didukung oleh gateway (MODEL_OR_REQUEST_UNSUPPORTED).`;
        } else if (effectiveCode === 429) {
          errorMessage = parsedRes.isJson && (parsedRes.parsedJson?.msg || parsedRes.parsedJson?.message)
            ? (parsedRes.parsedJson?.msg || parsedRes.parsedJson?.message)
            : 'Batas kuota KIE Gateway terlampaui (RATE_LIMITED).';
        } else if (effectiveCode >= 500) {
          errorMessage = parsedRes.isJson && (parsedRes.parsedJson?.msg || parsedRes.parsedJson?.message)
            ? (parsedRes.parsedJson?.msg || parsedRes.parsedJson?.message)
            : `KIE Gateway mengalami gangguan server (GATEWAY_ERROR - HTTP ${effectiveCode}).`;
        } else {
          errorMessage = (parsedRes.isJson && (parsedRes.parsedJson?.msg || parsedRes.parsedJson?.message)) || `HTTP ${effectiveCode} error: ${parsedRes.rawText.slice(0, 150)}`;
        }

        const sanitizedServerBody = sanitizeSafeBody(parsedRes.rawText || '', currentKey.rawKey);

        lastDebugInfo = {
          selectedModel: candidateModelName,
          gatewayModelId: candidateModelId,
          endpoint: 'https://api.kie.ai/codex/v1/responses',
          httpStatus: effectiveCode,
          errorType,
          errorMessage,
          sanitizedResponseBody: sanitizedServerBody || undefined,
          time: new Date().toLocaleTimeString(),
          attempt,
        };

        // HTTP 500: Server/Gateway failure
        // - DO NOT call the same request repeatedly
        // - DO NOT count it as a successful generation
        // - DO NOT increment the batch counter
        // - DO NOT save the failed prompt
        // - DO NOT rotate API key automatically
        // - DO NOT mark API key exhausted or invalid
        // - Display the sanitized server response and allow manual Retry
        if (effectiveCode >= 500) {
          return {
            success: false,
            errorType: 'GATEWAY_ERROR',
            errorMessage: `KIE Gateway mengalami gangguan server (HTTP ${effectiveCode}). Silakan klik "Coba Lagi (Retry)" untuk mengirim request baru.`,
            debugInfo: lastDebugInfo,
          };
        }

        // HTTP 404: Endpoint issue, NOT key invalidation, NOT model fallback
        // DO NOT rotate API key, DO NOT switch model
        if (effectiveCode === 404) {
          return {
            success: false,
            errorType: 'ENDPOINT_NOT_FOUND',
            errorMessage: 'KIE endpoint tidak ditemukan.',
            debugInfo: lastDebugInfo,
          };
        }

        // If API Key error or Rate Limit: handle key rotation or reporting
        if (effectiveCode === 401 || effectiveCode === 403 || effectiveCode === 429) {
          failedKeyIds.add(currentKey.id);
          keyManager.updateKeyStatus(
            currentKey.id,
            effectiveCode === 429 ? 'RATE LIMITED' : 'INVALID',
            errorMessage
          );

          if (routingMode === 'AUTO') {
            const altKey = keyManager.getAlternativeKey(Array.from(failedKeyIds));
            if (altKey) {
              currentKey = altKey;
              onStatusUpdate(`Mengalihkan ke KIE Key cadangan (${currentKey.maskedKey})...`);
              // Retry current attempt with next usable key
              continue;
            } else {
              const allExhaustedMsg =
                'Semua API Key KIE telah mencapai batas penggunaan atau tidak dapat digunakan. Tambahkan API Key baru untuk melanjutkan.';
              lastDebugInfo.errorMessage = allExhaustedMsg;
              return {
                success: false,
                errorType: effectiveCode === 429 ? 'RATE_LIMITED' : 'INVALID_API_KEY',
                errorMessage: allExhaustedMsg,
                debugInfo: lastDebugInfo,
              };
            }
          } else {
            // MANUAL mode: do NOT silently fallback to another key
            return {
              success: false,
              errorType,
              errorMessage: `Key manual (${currentKey.name}) tidak dapat digunakan: ${errorMessage}`,
              debugInfo: lastDebugInfo,
            };
          }
        }

        // Only HTTP 422 should be treated as model availability problems in AUTO mode
        if (effectiveCode === 422) {
          if (routingMode === 'AUTO' && modelIdx < modelsToTry.length - 1) {
            onStatusUpdate(`Model ${candidateModelName} tidak didukung (HTTP 422). Mengevaluasi fallback model...`);
            break; // breaks out of attempt loop to try next model in modelsToTry
          } else {
            return {
              success: false,
              errorType: 'MODEL_OR_REQUEST_UNSUPPORTED',
              errorMessage,
              debugInfo: lastDebugInfo,
            };
          }
        }

        // For other errors (400, 409, etc.)
        return {
          success: false,
          errorType,
          errorMessage,
          debugInfo: lastDebugInfo,
        };
      }

      // Step 3: Extract KIE text (already computed in parsedRes)
      const assistantText = parsedRes.assistantText;

      // Step 5: JSON Repair (10 steps)
      const parsedJSON = parseModelJSON(assistantText);

      if (parsedJSON === INVALID_JSON) {
        lastDebugInfo = {
          selectedModel: candidateModelName,
          gatewayModelId: candidateModelId,
          httpStatus,
          errorType: 'INVALID_JSON',
          errorMessage: 'Model berhasil merespons, tetapi format output tidak valid.',
          time: new Date().toLocaleTimeString(),
          attempt,
        };

        if (attempt < MAX_ATTEMPTS) {
          attempt++;
          continue; // Retry with strict instruction
        } else {
          // 3 attempts reached, do not save, do not increment
          return {
            success: false,
            errorType: 'INVALID_JSON',
            errorMessage: 'Model berhasil merespons, tetapi format output tidak valid setelah 3 percobaan.',
            debugInfo: lastDebugInfo,
          };
        }
      }

      // Step 6: Validate output schema & forbidden terms
      const validation = validateOutput(parsedJSON);
      if (!validation.isValid || !validation.sanitizedData) {
        lastDebugInfo = {
          selectedModel: candidateModelName,
          gatewayModelId: candidateModelId,
          httpStatus,
          errorType: 'INVALID_STRUCTURE',
          errorMessage: validation.error || 'Struktur output musik tidak sesuai standar.',
          time: new Date().toLocaleTimeString(),
          attempt,
        };

        if (attempt < MAX_ATTEMPTS) {
          specialDirective = `PENTING: Perbaiki error ini: ${validation.error}. Pastikan BPM berupa angka 40-120, instrumen berupa array, tidak ada vokal, dan TIDAK ADA istilah neo-classical/classical.`;
          attempt++;
          continue;
        } else {
          return {
            success: false,
            errorType: 'INVALID_STRUCTURE',
            errorMessage: validation.error || 'Validasi musikal gagal setelah 3 percobaan.',
            debugInfo: lastDebugInfo,
          };
        }
      }

      // Step 8: Validate Musical Uniqueness against previous batch tracks
      const candidateData = validation.sanitizedData;
      const uniqueness = checkMusicalUniqueness(candidateData, previousBatchTracks);

      if (!uniqueness.isUnique) {
        lastDebugInfo = {
          selectedModel: candidateModelName,
          gatewayModelId: candidateModelId,
          httpStatus,
          errorType: 'DUPLICATE',
          errorMessage: uniqueness.reason || 'Konsep musikal terlalu mirip dengan track sebelumnya.',
          time: new Date().toLocaleTimeString(),
          attempt,
        };

        if (attempt < MAX_ATTEMPTS) {
          onStatusUpdate(`DUPLIKASI MUSIKAL TERDETEKSI: ${uniqueness.reason}. Melakukan regenerasi dengan variasi baru...`);
          specialDirective = SUBSTANTIAL_DIFFERENCE_INSTRUCTION;
          attempt++;
          continue;
        } else {
          return {
            success: false,
            errorType: 'DUPLICATE',
            errorMessage: uniqueness.reason || 'Konsep musikal terdeteksi duplikat.',
            debugInfo: lastDebugInfo,
          };
        }
      }

      // SUCCESS!
      // Build final track result
      const track: GeneratedTrackResult = {
        id: 'track_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        batchNumber,
        stylePrompt: candidateData.stylePrompt,
        bpm: candidateData.bpm,
        key: candidateData.key,
        instruments: candidateData.instruments,
        metadata: candidateData.metadata,
        styleIntensity: candidateData.styleIntensity,
        modelUsed: candidateModelName,
        gatewayModelId: candidateModelId,
        timestamp: Date.now(),
        attemptsCount: attempt,
      };

      // Extract credits_consumed if returned by KIE gateway
      let creditsConsumed = 1;
      if (parsedRes.isJson && parsedRes.parsedJson) {
        if (typeof parsedRes.parsedJson.credits_consumed === 'number') {
          creditsConsumed = parsedRes.parsedJson.credits_consumed;
        } else if (typeof parsedRes.parsedJson.credit_consumed === 'number') {
          creditsConsumed = parsedRes.parsedJson.credit_consumed;
        } else if (typeof parsedRes.parsedJson.creditsConsumed === 'number') {
          creditsConsumed = parsedRes.parsedJson.creditsConsumed;
        } else if (typeof parsedRes.parsedJson.data?.credits_consumed === 'number') {
          creditsConsumed = parsedRes.parsedJson.data.credits_consumed;
        } else if (typeof parsedRes.parsedJson.usage?.total_tokens === 'number') {
          // Do not pretend tokens are KIE credits. Keep the local usage counter
          // unchanged when the gateway does not return credits_consumed.
          creditsConsumed = 0;
        } else {
          creditsConsumed = 0;
        }
      }

      // Mark key as active & functional
      keyManager.updateKeyStatus(currentKey.id, 'ACTIVE');
      // Strictly record verified usage upon verified success
      keyManager.recordUsage(currentKey.id, creditsConsumed);

      return {
        success: true,
        track,
        modelUsed: candidateModelName,
        gatewayModelId: candidateModelId,
        debugInfo: {
          selectedModel: candidateModelName,
          gatewayModelId: candidateModelId,
          httpStatus: 200,
          errorType: 'UNKNOWN_ERROR', // not an error
          errorMessage: 'Success',
          time: new Date().toLocaleTimeString(),
          attempt,
        },
      };
    }
  }

  // If all models in chain failed or exhausted
  return {
    success: false,
    errorType: lastDebugInfo?.errorType || 'UNKNOWN_ERROR',
    errorMessage: lastDebugInfo?.errorMessage || 'Seluruh model dalam fallback chain gagal merespons.',
    debugInfo: lastDebugInfo || {
      selectedModel: getModelUIName(selectedModelId),
      gatewayModelId: selectedModelId,
      errorType: 'UNKNOWN_ERROR',
      errorMessage: 'Generation halted.',
      time: new Date().toLocaleTimeString(),
    },
  };
}
