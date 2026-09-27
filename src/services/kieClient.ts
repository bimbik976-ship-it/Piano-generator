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

CRITICAL CATEGORY USAGE & MEDICAL SAFETY CONSTRAINTS:
- "Depression Relief" is strictly a functional listening category label.
- SEPARATION OF CATEGORY AND MOOD:
  Categories describe functional listening purpose (e.g. Relaxation, Sleep, Meditation, Healing, Stress Relief, Anxiety Relief, Depression Relief, etc.), whereas Mood describes emotional atmosphere (e.g. Melancholic, Emotional, Nostalgic, Reflective, Lonely, Calm, Peaceful, Soothing). NEVER confuse or blend these two. Do NOT assign "Depression Relief" solely because music is sad, melancholic, nostalgic, or emotional.
- ZERO MEDICAL CLAIMS:
  NEVER generate a Style Prompt asserting or implying that the music cures depression, treats depression, replaces therapy, replaces medication, or provides medical recovery.
  Always use safe, supportive descriptions: emotional comfort, calming listening experience, reflective listening, peaceful atmosphere, supportive relaxation, or emotional relaxation.
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

      // Step 8: Musical DNA Similarity Check (ULTRA-LENIENT / 100% NON-BLOCKING / ADVISORY ONLY)
      const candidateData = validation.sanitizedData;
      const uniqueness = checkMusicalUniqueness(candidateData, previousBatchTracks);

      let advisoryDebugInfo: SafeDebugInfo | undefined;

      if (!uniqueness.isUnique) {
        // Safe Diagnostic Log (ADVISORY): Never throws, never rejects, never triggers retry.
        console.log(
          `[PETA PIANO AI] Musical DNA Advisory (Non-blocking): Similarity detected with Track #${uniqueness.duplicateTrackNumber}. Decision: ACCEPTED — NON-BLOCKING.`
        );

        advisoryDebugInfo = {
          selectedModel: candidateModelName,
          gatewayModelId: candidateModelId,
          httpStatus: httpStatus || 200,
          errorType: 'ADVISORY',
          errorMessage: `Similarity detected with Track #${uniqueness.duplicateTrackNumber}.`,
          time: new Date().toLocaleTimeString(),
          attempt,
          status: 'ACCEPTED',
          isBlocking: false,
          sharedMetadata: uniqueness.sharedMetadata,
          musicalDna: uniqueness.musicalDna || 'Not proven identical.',
          decision: 'ACCEPTED — NON-BLOCKING',
        };
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
        debugInfo: advisoryDebugInfo,
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

export interface YouTubeTitleResponse {
  success: true;
  title: string;
  modelUsed: string;
  gatewayModelId: GatewayModelId;
  seo?: YouTubeSEOContent;
  errorMessage?: string;
}

export interface YouTubeTitleErrorResponse {
  success: false;
  errorType: ErrorType;
  errorMessage: string;
  debugInfo: SafeDebugInfo;
}

export type YouTubeTitleGenerationResponse = YouTubeTitleResponse | YouTubeTitleErrorResponse;

export interface YouTubeSEOContent {
  title: string;
  thumbnailText: string;
  description: string;
  hashtags: string[];
  tags: string[];
}

export interface YouTubeSEOResponse {
  success: true;
  seo: YouTubeSEOContent;
  modelUsed: string;
  gatewayModelId: GatewayModelId;
  errorMessage?: string;
}

export interface YouTubeSEOErrorResponse {
  success: false;
  errorType: ErrorType;
  errorMessage: string;
  debugInfo: SafeDebugInfo;
}

export type YouTubeSEOGenerationResponse = YouTubeSEOResponse | YouTubeSEOErrorResponse;

function buildSEOContext(tracks: GeneratedTrackResult[]): string {
  return [...tracks]
    .sort((a, b) => a.batchNumber - b.batchNumber)
    .slice(0, 25)
    .map((t) => {
      const excerpt = String(t.stylePrompt || '').replace(/\s+/g, ' ').trim().slice(0, 700);
      return [
        `Style Prompt #${t.batchNumber}: ${excerpt}`,
        `Piano: ${t.metadata.pianoType} | Genre: ${t.metadata.genre} | Category: ${t.metadata.category} | Mood: ${t.metadata.mood} | Country/Aesthetic: ${t.metadata.country}`,
        `Instruments: ${t.instruments.join(', ')}`,
        `Internal musical data: BPM ${t.bpm} | Key ${t.key} | Intensity ${JSON.stringify(t.styleIntensity)}`
      ].join('\n');
    })
    .join('\n\n---\n\n');
}

export function buildYouTubeSEOContentPrompt(tracks: GeneratedTrackResult[], currentTitle?: string): string {
  const context = buildSEOContext(tracks);
  return `You are the YouTube SEO content strategist for PETA PIANO AI.

Analyze ALL 25 completed Style Prompts (#1 through #25) as one complete dataset. Every deliverable in this YouTube Content package must be grounded in the combined musical identity of all 25 prompts, not only the last prompt. The data is INTERNAL ANALYSIS CONTEXT only.

Generate ONE consumer-facing YouTube content package.

CRITICAL OUTPUT RULES:
- Return ONLY one valid JSON object.
- No markdown.
- No code fences.
- No explanation before or after JSON.
- Do not mention AI, Suno, GPT, models, prompts, generation, metadata, or analysis.

TITLE:
- Create one natural, searchable English YouTube title.
- Analyze the complete identity across Style Prompt #1–#25 before choosing the title.
- Reflect the dominant musical identity and strongest listening purposes.
- Keep the core title concise and human-readable.
- Do NOT include the suffix "+ Bamboo Water Sound" because the application adds it automatically.

THUMBNAIL TEXT:
- Create a SHORT text extracted dynamically from the generated title.
- It must NOT copy the full title.
- Maximum 6-8 meaningful words total.
- Prefer 2-6 words per line.
- Use the strongest words from the actual generated title.
- Do not hardcode a fixed phrase.
- Do not use technical metadata or track counts.
- \\n separates thumbnail lines.

SEO DESCRIPTION:
- Write 500-1,000 words.
- Ideal target: 600-800 words.
- Natural, useful, human-readable YouTube description.
- Focus on listening experience, atmosphere, piano character, relaxation, sleep preparation, meditation, stress relief, reading, studying, quiet work, evening routines, and peaceful background listening where relevant.
- Mention Bamboo Water Sound naturally.
- Use internal musical data to improve accuracy, but NEVER expose technical analysis.
- NEVER mention BPM, tempo numbers, BPM ranges, average BPM, musical key, key signature, note density scores, intensity scores, or other technical metadata.
- NEVER use the words "album", "instrumental album", "collection", "track collection", "across the collection", "each composition", or "each track".
- NEVER mention any track count, including 25 tracks, 25-track, 25 songs, 25 pieces, or 25 Style Prompts.
- Do not describe the structure or process used to generate the music.
- Do not make medical, therapeutic, or guaranteed health claims (e.g. NEVER claim music cures, treats, or clinically heals depression or replaces therapy; use safe terms like emotional comfort, peaceful solace, and supportive relaxation).
- Avoid keyword stuffing.

FORBIDDEN DESCRIPTION CONCEPTS:
BPM, tempo numbers, average pace, musical key, technical metadata, Style Intensity, track number, track count, Style Prompt numbers, AI generation process, album, collection, 25 tracks, 25-track, 25 songs, 25 pieces, 25 compositions.

HASHTAGS:
- Generate 5-15 relevant hashtags.
- Base the selection on the combined musical identity of Style Prompt #1–#25.
- Prefer strong, high-search-intent music/relaxation/sleep/meditation/piano/water-sound terms when relevant.
- No duplicates.
- Do not claim actual search-volume numbers.

YOUTUBE TAGS:
- Generate 15-25 relevant comma-separated tags.
- Base the tags on the combined musical identity of Style Prompt #1–#25.
- No duplicates.
- Use natural search phrases relevant to the actual musical identity.

JSON SCHEMA:
{
  "title": "core YouTube title without the Bamboo Water Sound suffix",
  "thumbnailText": "short text\\noptional second line",
  "description": "500-1000 word consumer-facing YouTube description",
  "hashtags": ["#example"],
  "tags": ["example search phrase"]
}

CURRENT TITLE (optional regeneration context):
${currentTitle || '(none)'}

INTERNAL MUSICAL ANALYSIS DATA:
${context}`;
}

function cleanCoreTitle(rawTitle: string): string {
  return rawTitle
    .replace(/\s*\+\s*bamboo\s+water\s+sound\s*$/i, '')
    .replace(/["“”]/g, '')
    .trim();
}

function validateSEOContent(data: any): YouTubeSEOContent | null {
  if (!data || typeof data !== 'object') return null;
  const title = cleanCoreTitle(typeof data.title === 'string' ? data.title : '');
  const thumbnailText = typeof data.thumbnailText === 'string' ? data.thumbnailText.trim() : '';
  const description = typeof data.description === 'string' ? data.description.trim() : '';
  const hashtags = Array.isArray(data.hashtags) ? data.hashtags.filter((x: any) => typeof x === 'string').map((x: string) => x.trim()).filter(Boolean) : [];
  const tags = Array.isArray(data.tags) ? data.tags.filter((x: any) => typeof x === 'string').map((x: string) => x.trim()).filter(Boolean) : [];

  const words = description.split(/\s+/).filter(Boolean).length;
  const forbidden = /\b\d+(?:\s*[-–]?\s*)?(?:BPM|beats per minute)\b|\b(?:BPM|tempo)\s*(?:range|average)\b|\b(?:key signature|musical key|style intensity|ambient score|minimalist score|meditative score|sleep-friendly score|emotional score|cinematic score|musical activity score)\b|\b(?:album|instrumental album|collection|music collection|track collection|across the collection|each composition|each track|these tracks|25\s*-?\s*track(?:s)?|25\s+songs|25\s+pieces|25\s+compositions|25\s+style\s+prompts?)\b/i;
  if (!title || !thumbnailText || words < 500 || words > 1000) return null;
  if (forbidden.test(description)) return null;
  if (hashtags.length < 5 || hashtags.length > 15) return null;
  if (tags.length < 15 || tags.length > 25) return null;
  const thumbWords = thumbnailText.replace(/\n/g, ' ').split(/\s+/).filter(Boolean);
  if (thumbWords.length > 8) return null;
  if (thumbnailText.toLowerCase() === title.toLowerCase()) return null;
  const uniqueHash = new Set(hashtags.map(x => x.toLowerCase()));
  const uniqueTags = new Set(tags.map(x => x.toLowerCase()));
  if (uniqueHash.size !== hashtags.length || uniqueTags.size !== tags.length) return null;
  return { title, thumbnailText, description, hashtags, tags };
}

async function requestSEOFromKie(
  prompt: string,
  selectedModelId: GatewayModelId,
  routingMode: RoutingMode,
  onStatusUpdate: (message: string) => void
): Promise<YouTubeSEOGenerationResponse> {
  const keyManager = ApiKeyManager.getInstance();
  const activeKeys = keyManager.getActiveKeys();
  if (!activeKeys.length) {
    return { success: false, errorType: 'API_KEY_ERROR', errorMessage: 'Tidak ada Kunci KIE Aktif.', debugInfo: {
      selectedModel: getModelUIName(selectedModelId), gatewayModelId: selectedModelId, errorType: 'API_KEY_ERROR', errorMessage: 'Tidak ada Kunci KIE Aktif.', time: new Date().toLocaleTimeString()
    }};
  }
  const models = routingMode === 'AUTO' ? Array.from(new Set([selectedModelId, ...AUTO_FALLBACK_CHAIN])) : [selectedModelId];
  let key = routingMode === 'MANUAL' ? (keyManager.getManualSelectedKey() || activeKeys[0]) : (keyManager.getNextActiveKey() || activeKeys[0]);

  for (const modelId of models) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      onStatusUpdate(`GENERATING YOUTUBE SEO... (${attempt}/3)`);
      try {
        const payload = { model: modelId, stream: false, input: [{ role: 'user', content: [{ type: 'input_text', text: prompt }] }], reasoning: { effort: 'high' } };
        const res = await fetch('/api/kie/responses', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key.rawKey}` }, body: JSON.stringify(payload) });
        const parsed = await parseKieResponse(res);
        if (!res.ok) {
          const type = mapHttpStatusToErrorType(res.status);
          const message = parsed.assistantText || `KIE HTTP ${res.status}`;
          const debugInfo = {
            selectedModel: getModelUIName(modelId), gatewayModelId: modelId, endpoint: 'https://api.kie.ai/codex/v1/responses', httpStatus: res.status, errorType: type, errorMessage: message, sanitizedResponseBody: sanitizeSafeBody(parsed.rawText || '', key.rawKey), time: new Date().toLocaleTimeString(), attempt
          };
          if ([429, 500, 502, 503, 504].includes(res.status)) {
            if (attempt < 3) {
              await new Promise(resolve => setTimeout(resolve, 800 * attempt));
              continue;
            }
            if (routingMode === 'AUTO') break;
          }
          if (routingMode === 'AUTO' && res.status === 422) break;
          return { success: false, errorType: type, errorMessage: message, debugInfo };
        }
        let data: any = null;
        try { data = JSON.parse(parsed.assistantText); } catch {}
        const seo = validateSEOContent(data);
        if (seo) {
          keyManager.updateKeyStatus(key.id, 'ACTIVE');
          return { success: true, seo, modelUsed: getModelUIName(modelId), gatewayModelId: modelId };
        }
      } catch (err: any) {
        if (attempt === 3) return { success: false, errorType: 'NETWORK_ERROR', errorMessage: err?.message || 'Koneksi gagal.', debugInfo: {
          selectedModel: getModelUIName(modelId), gatewayModelId: modelId, endpoint: 'https://api.kie.ai/codex/v1/responses', errorType: 'NETWORK_ERROR', errorMessage: err?.message || 'Koneksi gagal.', time: new Date().toLocaleTimeString(), attempt
        }};
      }
    }
  }
  return { success: false, errorType: 'INVALID_STRUCTURE', errorMessage: 'Model menghasilkan format SEO yang tidak memenuhi validation.', debugInfo: {
    selectedModel: getModelUIName(selectedModelId), gatewayModelId: selectedModelId, errorType: 'INVALID_STRUCTURE', errorMessage: 'Format SEO tidak valid.', time: new Date().toLocaleTimeString()
  }};
}

function buildYouTubeTitleContext(tracks: GeneratedTrackResult[]): string {
  // IMPORTANT: title generation must use the complete 25-track dataset, but the
  // request sent to KIE must stay compact. Sending all long Style Prompt bodies
  // verbatim can make an otherwise valid title request unnecessarily large and
  // can trigger upstream HTTP 500 responses.
  const sorted = [...tracks]
    .sort((a, b) => a.batchNumber - b.batchNumber)
    .slice(0, 25);

  const frequency = (values: string[]) => {
    const counts = new Map<string, number>();
    values.forEach((value) => {
      const v = String(value || '').trim();
      if (v) counts.set(v, (counts.get(v) || 0) + 1);
    });
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([value, count]) => `${value} (${count})`)
      .join(', ');
  };

  const piano = frequency(sorted.map(t => t.metadata.pianoType));
  const genre = frequency(sorted.map(t => t.metadata.genre));
  const category = frequency(sorted.map(t => t.metadata.category));
  const mood = frequency(sorted.map(t => t.metadata.mood));

  const perPrompt = sorted.map((t, i) => {
    // Keep a short semantic fingerprint from EVERY prompt rather than sending
    // the full long prompt. This preserves all-25 coverage while controlling size.
    const excerpt = String(t.stylePrompt || '')
      .replace(/\s+/g, ' ')
      .replace(/\b\d+(?:\.\d+)?\s*BPM\b/gi, '')
      .replace(/\b(?:key|musical key|key signature)\s*[:=]?\s*[A-G][#b]?\s*(?:major|minor)?\b/gi, '')
      .trim()
      .slice(0, 150);

    return `${i + 1}. ${t.metadata.pianoType || 'Piano'} | ${t.metadata.genre || 'Ambient Piano'} | ${t.metadata.category || 'Relaxation'} | ${t.metadata.mood || 'Peaceful'} | ${excerpt}`;
  }).join('\n');

  return [
    'COMPLETE 25-PROMPT MUSICAL SUMMARY:',
    `Piano types: ${piano || 'Piano'}`,
    `Genres: ${genre || 'Ambient Piano'}`,
    `Use categories: ${category || 'Relaxation'}`,
    `Moods: ${mood || 'Peaceful'}`,
    '',
    'SEMANTIC FINGERPRINT FROM ALL 25 STYLE PROMPTS:',
    perPrompt
  ].join('\n');
}

function buildYouTubeTitlePrompt(tracks: GeneratedTrackResult[]): string {
  const context = buildYouTubeTitleContext(tracks);
  return `You are the YouTube title strategist for PETA PIANO AI.

Analyze the 25 completed instrumental piano style prompts below and create ONE strong English YouTube title representing their dominant musical identity and listening purpose.

RULES:
- Return ONLY one valid JSON object.
- No markdown and no code fences.
- JSON schema: {"title":"..."}
- The title must be concise, natural, searchable, and consumer-facing.
- Reflect the shared musical identity across the provided prompts, not one individual prompt.
- Emphasize the strongest relevant listening purposes such as relaxation, sleep, meditation, stress relief, anxiety relief, emotional comfort, peaceful background listening, reading, studying, or quiet work when supported by the data.
- Zero medical claims: Do NOT make medical or health claims (e.g. never state music cures or treats depression).
- Do not mention BPM, tempo numbers, musical key, technical metadata, intensity scores, track counts, Style Prompt numbers, AI, Suno, GPT, models, or generation process.
- Do not use the suffix "+ Bamboo Water Sound"; the application adds that suffix automatically.
- Do not copy a Style Prompt verbatim.
- Do not return multiple title options.

COMPLETED STYLE-PROMPT DATA:
${context}`.trim();
}

function parseYouTubeTitle(raw: string): string {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (typeof parsed?.title === 'string') return parsed.title.trim();
  } catch {}
  const match = cleaned.match(/"title"\s*:\s*"([\s\S]*?)"/i);
  if (match?.[1]) return match[1].trim();
  return cleaned.replace(/^['"]|['"]$/g, '').trim();
}

function buildLocalTitleFallback(tracks: GeneratedTrackResult[]): string {
  const sorted = [...tracks].sort((a, b) => a.batchNumber - b.batchNumber).slice(0, 25);
  const count = (values: string[]) => {
    const map = new Map<string, number>();
    for (const value of values) {
      const v = String(value || '').trim();
      if (v) map.set(v, (map.get(v) || 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '';
  };
  const piano = count(sorted.map(t => t.metadata.pianoType)) || 'Piano';
  const mood = count(sorted.map(t => t.metadata.mood)) || 'Peaceful';
  const categories = sorted.map(t => String(t.metadata.category || '').toLowerCase());
  const hasSleep = categories.some(v => v.includes('sleep') || v.includes('deep rest'));
  const hasRelax = categories.some(v => v.includes('relax') || v.includes('stress'));
  const hasMeditation = categories.some(v => v.includes('meditat') || v.includes('mindfulness'));
  const hasDepression = categories.some(v => v.includes('depression'));

  const purposes = [
    hasSleep ? 'Deep Sleep' : '',
    hasRelax ? 'Relaxation' : '',
    hasMeditation ? 'Meditation' : '',
    hasDepression ? 'Emotional Comfort' : ''
  ].filter(Boolean);

  const purposeText = purposes.length ? purposes.slice(0, 2).join(' & ') : 'Relaxation & Quiet Focus';
  return `${mood} ${piano} Music for ${purposeText}`;
}

async function requestTitleFromKie(
  tracks: GeneratedTrackResult[],
  selectedModelId: GatewayModelId,
  routingMode: RoutingMode,
  onStatusUpdate: (message: string) => void
): Promise<YouTubeTitleResponse | YouTubeTitleErrorResponse> {
  const keyManager = ApiKeyManager.getInstance();
  const activeKeys = keyManager.getActiveKeys();
  if (!activeKeys.length) {
    return { success: false, errorType: 'API_KEY_ERROR', errorMessage: 'Tidak ada Kunci KIE Aktif.', debugInfo: {
      selectedModel: getModelUIName(selectedModelId), gatewayModelId: selectedModelId, errorType: 'API_KEY_ERROR', errorMessage: 'Tidak ada Kunci KIE Aktif.', time: new Date().toLocaleTimeString()
    }};
  }

  const models = routingMode === 'AUTO'
    ? Array.from(new Set([selectedModelId, ...AUTO_FALLBACK_CHAIN]))
    : [selectedModelId];
  const key = routingMode === 'MANUAL'
    ? (keyManager.getManualSelectedKey() || activeKeys[0])
    : (keyManager.getNextActiveKey() || activeKeys[0]);
  const prompt = buildYouTubeTitlePrompt(tracks.slice(0, 25));

  let lastFailure: YouTubeTitleErrorResponse | null = null;

  for (const modelId of models) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      onStatusUpdate(`GENERATING YOUTUBE TITLE... (${attempt}/3)`);
      try {
        // Title generation is intentionally a lightweight, title-only request.
        // Do NOT request the full SEO package here; that was unnecessarily large and
        // was the source of avoidable KIE HTTP 500 failures.
        const payload = {
          model: modelId,
          stream: false,
          input: [{ role: 'user', content: [{ type: 'input_text', text: prompt }] }]
        };
        const res = await fetch('/api/kie/responses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key.rawKey}` },
          body: JSON.stringify(payload)
        });
        const parsed = await parseKieResponse(res);

        if (!res.ok) {
          const type = mapHttpStatusToErrorType(res.status);
          const message = parsed.assistantText || `KIE HTTP ${res.status}`;
          const failure: YouTubeTitleErrorResponse = {
            success: false,
            errorType: type,
            errorMessage: message,
            debugInfo: {
              selectedModel: getModelUIName(modelId),
              gatewayModelId: modelId,
              endpoint: 'https://api.kie.ai/codex/v1/responses',
              httpStatus: res.status,
              errorType: type,
              errorMessage: message,
              sanitizedResponseBody: sanitizeSafeBody(parsed.rawText || '', key.rawKey),
              time: new Date().toLocaleTimeString(),
              attempt
            }
          };
          lastFailure = failure;

          // Retry transient gateway failures, then allow AUTO routing to try the next model.
          if (res.status === 500 || res.status === 502 || res.status === 503 || res.status === 504 || res.status === 429) {
            if (attempt < 3) {
              await new Promise(resolve => setTimeout(resolve, 700 * attempt));
              continue;
            }
            if (routingMode === 'AUTO') break;
          }
          return failure;
        }

        const title = parseYouTubeTitle(parsed.assistantText);
        if (!title || title.length < 8 || title.length > 140) {
          lastFailure = {
            success: false,
            errorType: 'INVALID_STRUCTURE',
            errorMessage: 'Model menghasilkan judul YouTube yang kosong atau tidak valid.',
            debugInfo: {
              selectedModel: getModelUIName(modelId), gatewayModelId: modelId,
              endpoint: 'https://api.kie.ai/codex/v1/responses', httpStatus: res.status,
              errorType: 'INVALID_STRUCTURE', errorMessage: 'Judul tidak valid.',
              time: new Date().toLocaleTimeString(), attempt
            }
          };
          if (attempt < 3) continue;
          if (routingMode === 'AUTO') break;
          return lastFailure;
        }

        const coreTitle = cleanCoreTitle(title);
        if (!coreTitle) {
          return {
            success: false,
            errorType: 'INVALID_STRUCTURE',
            errorMessage: 'Judul YouTube tidak valid setelah pembersihan suffix.',
            debugInfo: {
              selectedModel: getModelUIName(modelId), gatewayModelId: modelId,
              endpoint: 'https://api.kie.ai/codex/v1/responses', httpStatus: res.status,
              errorType: 'INVALID_STRUCTURE', errorMessage: 'Judul kosong setelah pembersihan.',
              time: new Date().toLocaleTimeString(), attempt
            }
          };
        }

        keyManager.updateKeyStatus(key.id, 'ACTIVE');
        return {
          success: true,
          title: `${coreTitle} + Bamboo Water Sound`,
          modelUsed: getModelUIName(modelId),
          gatewayModelId: modelId
        };
      } catch (err: any) {
        lastFailure = {
          success: false,
          errorType: 'NETWORK_ERROR',
          errorMessage: err?.message || 'Koneksi gagal.',
          debugInfo: {
            selectedModel: getModelUIName(modelId), gatewayModelId: modelId,
            endpoint: 'https://api.kie.ai/codex/v1/responses', errorType: 'NETWORK_ERROR',
            errorMessage: err?.message || 'Koneksi gagal.', time: new Date().toLocaleTimeString(), attempt
          }
        };
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 700 * attempt));
          continue;
        }
        if (routingMode === 'AUTO') break;
      }
    }
  }


  return lastFailure || {
    success: false,
    errorType: 'GATEWAY_ERROR',
    errorMessage: 'KIE Gateway gagal membuat judul YouTube.',
    debugInfo: {
      selectedModel: getModelUIName(selectedModelId), gatewayModelId: selectedModelId,
      errorType: 'GATEWAY_ERROR', errorMessage: 'KIE Gateway gagal membuat judul YouTube.', time: new Date().toLocaleTimeString()
    }
  };
}

export async function generateYouTubeTitle(
  tracks: GeneratedTrackResult[], selectedModelId: GatewayModelId, routingMode: RoutingMode, onStatusUpdate: (message: string) => void = () => {}
): Promise<YouTubeTitleGenerationResponse> {
  if (tracks.length < 25) {
    return { success: false, errorType: 'INVALID_STRUCTURE', errorMessage: 'Judul hanya dapat dibuat setelah 25 Style Prompt berhasil.', debugInfo: {
      selectedModel: getModelUIName(selectedModelId), gatewayModelId: selectedModelId, errorType: 'INVALID_STRUCTURE', errorMessage: '25 Style Prompt belum lengkap.', time: new Date().toLocaleTimeString()
    }};
  }
  return requestTitleFromKie(tracks.slice(0, 25), selectedModelId, routingMode, onStatusUpdate);
}

export async function generateYouTubeSEO(
  tracks: GeneratedTrackResult[], selectedModelId: GatewayModelId, routingMode: RoutingMode, currentTitle?: string, onStatusUpdate: (message: string) => void = () => {}
): Promise<YouTubeSEOGenerationResponse> {
  if (tracks.length < 25) return { success: false, errorType: 'INVALID_STRUCTURE', errorMessage: 'SEO hanya dapat dibuat setelah 25 Style Prompt berhasil.', debugInfo: {
    selectedModel: getModelUIName(selectedModelId), gatewayModelId: selectedModelId, errorType: 'INVALID_STRUCTURE', errorMessage: '25 Style Prompt belum lengkap.', time: new Date().toLocaleTimeString()
  }};
  return requestSEOFromKie(buildYouTubeSEOContentPrompt(tracks.slice(0, 25), currentTitle), selectedModelId, routingMode, onStatusUpdate);
}


export interface YouTubeThumbnailResponse {
  success: true;
  thumbnailText: string;
  modelUsed: string;
  gatewayModelId: GatewayModelId;
  errorMessage?: string;
}

export interface YouTubeThumbnailErrorResponse {
  success: false;
  errorType: ErrorType;
  errorMessage: string;
  debugInfo: SafeDebugInfo;
}

export type YouTubeThumbnailGenerationResponse = YouTubeThumbnailResponse | YouTubeThumbnailErrorResponse;

function validateThumbnailText(text: string, title: string): string | null {
  const clean = String(text || '').trim().replace(/^['"“”]+|['"“”]+$/g, '');
  const words = clean.replace(/\n/g, ' ').split(/\s+/).filter(Boolean);
  if (!clean || words.length < 2 || words.length > 8) return null;
  if (clean.toLowerCase() === title.toLowerCase()) return null;
  if (/\b(?:bpm|beats per minute|key signature|style intensity|style prompt|track(?:s)?|song(?:s)?|piece(?:s)?|composition(?:s)?|ai|gpt)\b/i.test(clean)) return null;
  return clean;
}

export async function generateYouTubeThumbnailText(
  title: string,
  selectedModelId: GatewayModelId,
  routingMode: RoutingMode,
  onStatusUpdate: (message: string) => void = () => {}
): Promise<YouTubeThumbnailGenerationResponse> {
  const cleanTitle = cleanCoreTitle(title);
  if (!cleanTitle) return { success: false, errorType: 'INVALID_STRUCTURE', errorMessage: 'YouTube title tidak tersedia.', debugInfo: {
    selectedModel: getModelUIName(selectedModelId), gatewayModelId: selectedModelId, errorType: 'INVALID_STRUCTURE', errorMessage: 'YouTube title tidak tersedia.', time: new Date().toLocaleTimeString()
  }};
  const keyManager = ApiKeyManager.getInstance();
  const activeKeys = keyManager.getActiveKeys();
  if (!activeKeys.length) return { success: false, errorType: 'API_KEY_ERROR', errorMessage: 'Tidak ada Kunci KIE Aktif.', debugInfo: {
    selectedModel: getModelUIName(selectedModelId), gatewayModelId: selectedModelId, errorType: 'API_KEY_ERROR', errorMessage: 'Tidak ada Kunci KIE Aktif.', time: new Date().toLocaleTimeString()
  }};
  const models = routingMode === 'AUTO' ? Array.from(new Set([selectedModelId, ...AUTO_FALLBACK_CHAIN])) : [selectedModelId];
  const key = routingMode === 'MANUAL' ? (keyManager.getManualSelectedKey() || activeKeys[0]) : (keyManager.getNextActiveKey() || activeKeys[0]);
  const prompt = `You are a YouTube thumbnail copywriter for PETA PIANO AI.\n\nFINAL YOUTUBE TITLE:\n${cleanTitle}\n\nCreate exactly ONE short Text on Thumbnail based ONLY on the actual title above. Extract its strongest message. Do not copy the full title. Use 2-6 meaningful words when possible, maximum 8 meaningful words. It may use one or two lines separated by a newline. Do not use fixed phrases, templates, technical metadata, BPM, musical key, track count, Style Prompt, AI, model names, or generation-process language. Return ONLY valid JSON with this exact shape: {"thumbnailText":"..."}`;
  for (const modelId of models) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      onStatusUpdate(`GENERATING THUMBNAIL TEXT... (${attempt}/3)`);
      try {
        const payload = { model: modelId, stream: false, input: [{ role: 'user', content: [{ type: 'input_text', text: prompt }] }], reasoning: { effort: 'high' } };
        const res = await fetch('/api/kie/responses', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key.rawKey}` }, body: JSON.stringify(payload) });
        const parsed = await parseKieResponse(res);
        if (!res.ok) {
          const type = mapHttpStatusToErrorType(res.status);
          if (routingMode === 'AUTO' && res.status === 422) break;
          if (attempt === 3) return { success: false, errorType: type, errorMessage: parsed.assistantText || `KIE HTTP ${res.status}`, debugInfo: {
            selectedModel: getModelUIName(modelId), gatewayModelId: modelId, endpoint: 'https://api.kie.ai/codex/v1/responses', httpStatus: res.status, errorType: type, errorMessage: parsed.assistantText || `KIE HTTP ${res.status}`, sanitizedResponseBody: sanitizeSafeBody(parsed.rawText || '', key.rawKey), time: new Date().toLocaleTimeString(), attempt
          }};
          continue;
        }
        let data: any = null;
        try { data = JSON.parse(parsed.assistantText); } catch {}
        const thumbnailText = validateThumbnailText(data?.thumbnailText, cleanTitle);
        if (thumbnailText) {
          keyManager.updateKeyStatus(key.id, 'ACTIVE');
          return { success: true, thumbnailText, modelUsed: getModelUIName(modelId), gatewayModelId: modelId };
        }
      } catch (err: any) {
        if (attempt === 3) return { success: false, errorType: 'NETWORK_ERROR', errorMessage: err?.message || 'Koneksi gagal.', debugInfo: {
          selectedModel: getModelUIName(modelId), gatewayModelId: modelId, endpoint: 'https://api.kie.ai/codex/v1/responses', errorType: 'NETWORK_ERROR', errorMessage: err?.message || 'Koneksi gagal.', time: new Date().toLocaleTimeString(), attempt
        }};
      }
    }
  }
  return { success: false, errorType: 'INVALID_STRUCTURE', errorMessage: 'Text on Thumbnail tidak memenuhi validation.', debugInfo: {
    selectedModel: getModelUIName(selectedModelId), gatewayModelId: selectedModelId, errorType: 'INVALID_STRUCTURE', errorMessage: 'Text on Thumbnail tidak valid.', time: new Date().toLocaleTimeString()
  }};
}
