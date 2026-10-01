import {
  GatewayModelId,
  RoutingMode,
  SafeDebugInfo,
  ErrorType
} from '../types';
import { AUTO_FALLBACK_CHAIN, getModelUIName } from '../config/models';
import { ApiKeyManager } from './apiKeyManager';
import { parseKieResponse, mapHttpStatusToErrorType, ParsedKieResponse } from './kieClient';
import { parseModelJSON, INVALID_JSON } from './jsonParser';
import { sanitizeSafeBody } from './kieConnectionTester';
import { sanitizeConsumerFacingDescription, containsForbiddenSeoContent } from './youtubeSeoValidator';

export interface SeoFromTitleResult {
  title: string;
  description: string;
  hashtags: string[];
  tags: string[];
}

export interface SeoFromTitleSuccessResponse {
  success: true;
  data: SeoFromTitleResult;
  modelUsed: string;
  gatewayModelId: GatewayModelId;
  errorMessage?: undefined;
  debugInfo?: SafeDebugInfo;
}

export interface SeoFromTitleErrorResponse {
  success: false;
  errorType: ErrorType;
  errorMessage: string;
  debugInfo: SafeDebugInfo;
}

export type SeoFromTitleResponse = SeoFromTitleSuccessResponse | SeoFromTitleErrorResponse;

/**
 * Builds the focused prompt for generating an SEO package from a user-entered title.
 */
export function buildSeoFromTitlePrompt(userTitle: string): string {
  return `
You are the YouTube Content & SEO Specialist for PETA PIANO AI.
The user has provided a YouTube video title.
Your task is to generate a comprehensive, highly relevant, and engaging YouTube SEO package (SEO Description, Hashtags, YouTube Tags) based SOLELY on this user-entered title.

USER ENTERED TITLE:
"${userTitle.trim()}"

==================================================
REQUIREMENTS:
==================================================

1. SEO DESCRIPTION:
- Length: Minimum 500 words, Target around 600–750 words, Maximum 1000 words.
- Tone: Natural, warm, engaging, and consumer-facing.
- Based DIRECTLY on the user-entered title and its implied musical, emotional, or atmospheric context (such as relaxing acoustic piano, calming water sounds, peaceful sleep, deep meditation, stress relief, focus/study, serene nature, rainy evening, coffee shop ambience, or gentle quiet solitude).
- EMOTICONS: Naturally and tastefully incorporate relevant emoticons throughout the description to enhance readability and viewer engagement (e.g. 🎹, ✨, 🌙, 🌿, 🎧, 🕊️, ☕, 💫, 🌊, 🌧️).
- Do NOT overuse emoticons; place them organically at section headings, key highlights, or atmospheric notes.
- Structure: Write multiple cohesive paragraphs detailing the musical atmosphere, listening setting, relaxation benefits, and welcoming message for the listener.
- Do NOT make medical or therapeutic claims (e.g., cures depression, treats insomnia); focus on peaceful listening and restful relaxation.
- Zero keyword stuffing, robotic lists, or fake technical claims.
- Do NOT mention AI generation, prompts, model names, or technical metadata (BPM, musical keys, track counts).

2. HASHTAGS:
- Generate 8–15 relevant hashtags based on the entered title.
- Standard YouTube hashtag format starting with '#' (e.g., #RelaxingPiano, #SleepMusic, #DeepRelaxation).
- Do not use unrelated hashtags. Do not claim numerical search volume.

3. YOUTUBE TAGS:
- Generate 15–25 relevant YouTube tags based on the entered title.
- Comma-separated search phrases that real listeners type (e.g. "relaxing piano music", "peaceful piano", "piano for sleep").
- Relevant to the entered title; no misleading or unrelated tags.

==================================================
OUTPUT FORMAT (STRICT JSON ONLY):
==================================================
Return ONLY one valid JSON object. No markdown fences, no explanation:
{
  "description": "500-1000 word description with tasteful emoticons (target around 600-750 words)",
  "hashtags": ["#Hashtag1", "#Hashtag2"],
  "tags": ["tag 1", "tag 2", "tag 3"]
}
`.trim();
}

/**
 * Validates and sanitizes the model output for Title-Based SEO.
 * Preserves the user's title untouched under all circumstances.
 */
function validateAndSanitizeSeoFromTitle(
  raw: any,
  userTitle: string
): { success: boolean; data?: SeoFromTitleResult; error?: string } {
  if (!raw || typeof raw !== 'object') {
    return { success: false, error: 'Model tidak mengembalikan objek data yang valid.' };
  }

  // 1. Description
  let description = typeof raw.description === 'string' ? raw.description.trim() : '';
  if (!description) {
    return { success: false, error: 'SEO Description kosong atau tidak ditemukan.' };
  }

  description = sanitizeConsumerFacingDescription(description);

  if (containsForbiddenSeoContent(description)) {
    return { success: false, error: 'Description mengandung istilah teknis atau katalog terlarang.' };
  }

  // Neutralize medical claims
  const medicalClaims = /\b(cures?|treating|treats)\s+(depression|anxiety|insomnia)\b|\bmedical(ly)?\s+proven\b|\bclinically\s+proven\b/i;
  if (medicalClaims.test(description)) {
    description = description.replace(medicalClaims, 'supports peaceful calm and deep relaxation');
  }

  let words = description.split(/\s+/).filter(Boolean);

  // If words > 1000 and <= 1050, truncate cleanly at sentence boundary
  if (words.length > 1000 && words.length <= 1050) {
    const truncatedText = words.slice(0, 980).join(' ');
    const lastSentenceEnd = Math.max(
      truncatedText.lastIndexOf('.'),
      truncatedText.lastIndexOf('!'),
      truncatedText.lastIndexOf('?')
    );
    if (lastSentenceEnd > 200) {
      description = truncatedText.slice(0, lastSentenceEnd + 1);
    }
    words = description.split(/\s+/).filter(Boolean);
  }

  // Word count enforcement (500–1000 words, target 600–750)
  if (words.length < 500) {
    return {
      success: false,
      error: `Description terlalu pendek (${words.length} kata, minimum 500 kata, target sekitar 600–750 kata).`
    };
  }
  if (words.length > 1000) {
    return {
      success: false,
      error: `Description melebihi 1.000 kata (${words.length} kata, maksimum 1.000 kata).`
    };
  }

  // 2. Hashtags (8-15)
  let rawHashtags = Array.isArray(raw.hashtags) ? raw.hashtags : [];
  let hashtags: string[] = [];
  const seenHashtags = new Set<string>();

  for (const h of rawHashtags) {
    if (typeof h !== 'string') continue;
    let clean = h.trim();
    if (!clean.startsWith('#')) {
      clean = '#' + clean.replace(/\s+/g, '');
    } else {
      clean = '#' + clean.slice(1).replace(/\s+/g, '');
    }
    const lower = clean.toLowerCase();
    if (clean.length > 1 && !seenHashtags.has(lower)) {
      seenHashtags.add(lower);
      hashtags.push(clean);
    }
  }

  if (hashtags.length < 5) {
    // Generate context-derived fallback hashtags
    const titleWords = userTitle.replace(/[^A-Za-z0-9 ]/g, '').split(/\s+/).filter(w => w.length > 3);
    for (const w of titleWords) {
      const tag = `#${w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()}`;
      if (!seenHashtags.has(tag.toLowerCase())) {
        seenHashtags.add(tag.toLowerCase());
        hashtags.push(tag);
      }
    }
    const defaults = ['#RelaxingPiano', '#PeacefulPiano', '#CalmMusic', '#DeepSleep', '#MeditationPiano'];
    for (const d of defaults) {
      if (hashtags.length < 8 && !seenHashtags.has(d.toLowerCase())) {
        seenHashtags.add(d.toLowerCase());
        hashtags.push(d);
      }
    }
  }
  hashtags = hashtags.slice(0, 15);

  // 3. YouTube Tags (15-25)
  let rawTags = Array.isArray(raw.tags)
    ? raw.tags
    : (typeof raw.tags === 'string' ? raw.tags.split(',') : []);

  let tags: string[] = [];
  const seenTags = new Set<string>();

  for (const t of rawTags) {
    if (typeof t !== 'string') continue;
    const clean = t.trim().replace(/^["']|["']$/g, '').toLowerCase();
    if (clean.length >= 2 && !seenTags.has(clean)) {
      seenTags.add(clean);
      tags.push(clean);
    }
  }

  if (tags.length < 15) {
    const baseTags = [
      'relaxing piano music',
      'peaceful piano',
      'calm piano music',
      'deep sleep piano',
      'meditation piano music',
      'study piano music',
      'soothing piano melodies',
      'piano for stress relief',
      'gentle background piano',
      'instrumental piano music',
      'healing piano music',
      'sleep music piano',
      'quiet piano music',
      'soft piano music',
      'relaxing music for sleep'
    ];
    for (const bt of baseTags) {
      if (tags.length < 20 && !seenTags.has(bt)) {
        seenTags.add(bt);
        tags.push(bt);
      }
    }
  }
  tags = tags.slice(0, 25);

  return {
    success: true,
    data: {
      title: userTitle.trim(), // Strictly unchanged!
      description,
      hashtags,
      tags
    }
  };
}

/**
 * Generates an SEO package based ONLY on the user-entered YouTube title.
 * Uses the existing centralized AI Chat Model infrastructure.
 */
export async function generateSeoFromTitle(
  enteredTitle: string,
  selectedModelId: GatewayModelId,
  routingMode: RoutingMode,
  onStatusUpdate: (message: string) => void = () => {}
): Promise<SeoFromTitleResponse> {
  const trimmedTitle = enteredTitle.trim();
  if (!trimmedTitle || trimmedTitle.length < 3) {
    return {
      success: false,
      errorType: 'TITLE_INVALID',
      errorMessage: 'Judul YouTube tidak boleh kosong (minimal 3 karakter).',
      debugInfo: {
        selectedModel: getModelUIName(selectedModelId),
        gatewayModelId: selectedModelId,
        errorType: 'TITLE_INVALID',
        errorMessage: 'Judul YouTube tidak valid.',
        time: new Date().toLocaleTimeString()
      }
    };
  }

  const keyManager = ApiKeyManager.getInstance();
  const activeKeys = keyManager.getActiveKeys();
  if (!activeKeys.length) {
    return {
      success: false,
      errorType: 'API_KEY_ERROR',
      errorMessage: 'Tidak ada Kunci KIE Aktif.',
      debugInfo: {
        selectedModel: getModelUIName(selectedModelId),
        gatewayModelId: selectedModelId,
        errorType: 'API_KEY_ERROR',
        errorMessage: 'Tidak ada Kunci KIE Aktif.',
        time: new Date().toLocaleTimeString()
      }
    };
  }

  const models = routingMode === 'AUTO'
    ? Array.from(new Set([selectedModelId, ...AUTO_FALLBACK_CHAIN]))
    : [selectedModelId];
  let key = routingMode === 'MANUAL'
    ? (keyManager.getManualSelectedKey() || activeKeys[0])
    : (keyManager.getNextActiveKey() || activeKeys[0]);

  const basePrompt = buildSeoFromTitlePrompt(trimmedTitle);
  let currentPrompt = basePrompt;
  let lastFailure: { errorType: ErrorType; errorMessage: string } | null = null;

  for (const modelId of models) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      onStatusUpdate(`GENERATING SEO FROM TITLE... (${attempt}/3)`);
      try {
        const seoJsonSchema = {
          type: 'object',
          properties: {
            description: { type: 'string' },
            hashtags: { type: 'array', items: { type: 'string' } },
            tags: { type: 'array', items: { type: 'string' } }
          },
          required: ['description', 'hashtags', 'tags'],
          additionalProperties: false
        };

        const structuredTextFormat = {
          type: 'json_schema',
          name: 'youtube_seo_from_title',
          strict: true,
          schema: seoJsonSchema
        };

        const basePayload = {
          model: modelId,
          stream: false,
          input: [{ role: 'user', content: [{ type: 'input_text', text: currentPrompt }] }],
          reasoning: { effort: 'high' },
          text: { format: structuredTextFormat }
        };

        let res: Response;
        let parsed: ParsedKieResponse;
        let usedRecoveryRequest = false;

        const sendRequest = async (payload: Record<string, any>) => {
          const response = await fetch('/api/kie/responses', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${key.rawKey}`
            },
            body: JSON.stringify(payload)
          });
          const parsedResponse = await parseKieResponse(response);
          return { response, parsedResponse };
        };

        // KIE contract ladder
        const plainPayload = { ...basePayload };
        delete (plainPayload as any).text;
        const noReasoningStructured = { ...basePayload };
        delete (noReasoningStructured as any).reasoning;
        const noReasoningPlain = { ...plainPayload };
        const requestVariants: Record<string, any>[] = [
          basePayload,
          noReasoningStructured,
          noReasoningPlain,
          { ...noReasoningPlain, stream: true }
        ];

        ({ response: res, parsedResponse: parsed } = await sendRequest(requestVariants[0]));

        if ([500, 502, 503, 504].includes(res.status)) {
          usedRecoveryRequest = true;
          for (let variantIndex = 1; variantIndex < requestVariants.length; variantIndex++) {
            await new Promise((resolve) => setTimeout(resolve, 900 * variantIndex));
            ({ response: res, parsedResponse: parsed } = await sendRequest(requestVariants[variantIndex]));
            if (![500, 502, 503, 504].includes(res.status)) break;
          }
        }

        if (!res.ok) {
          const type = mapHttpStatusToErrorType(res.status);
          const message = parsed.assistantText || `KIE HTTP ${res.status}`;
          lastFailure = { errorType: type, errorMessage: message };

          if (res.status === 401 || res.status === 403) {
            keyManager.updateKeyStatus(key.id, 'INVALID', message);
            return {
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
          }

          if ([429, 500, 502, 503, 504].includes(res.status)) {
            if (attempt < 3) {
              await new Promise((resolve) => setTimeout(resolve, usedRecoveryRequest ? 1400 * attempt : 900 * attempt));
              continue;
            }
            if (routingMode === 'AUTO') break;
            continue;
          }

          return {
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
        }

        if (!parsed.assistantText || !parsed.assistantText.trim()) {
          lastFailure = { errorType: 'MODEL_EMPTY_RESPONSE', errorMessage: 'Model mengembalikan respons kosong.' };
          if (attempt < 3) {
            currentPrompt = `${basePrompt}\n\nFOCUSED RETRY: Respons sebelumnya kosong. Kembalikan HANYA JSON object valid: {"description":"...","hashtags":[],"tags":[]}.`;
            continue;
          }
          if (routingMode === 'AUTO') break;
          continue;
        }

        const parsedModel = parseModelJSON(parsed.assistantText);
        if (parsedModel === INVALID_JSON) {
          lastFailure = { errorType: 'INVALID_JSON', errorMessage: 'Model menghasilkan output yang tidak dapat diparse sebagai JSON.' };
          if (attempt < 3) {
            currentPrompt = `${basePrompt}\n\nFOCUSED RETRY (INVALID_JSON): Output sebelumnya bukan JSON valid. Kembalikan HANYA JSON: {"description":"...","hashtags":[],"tags":[]}. Tanpa markdown, tanpa teks lain.`;
            continue;
          }
          if (routingMode === 'AUTO') break;
          continue;
        }

        const validation = validateAndSanitizeSeoFromTitle(parsedModel, trimmedTitle);
        if (validation.success && validation.data) {
          keyManager.updateKeyStatus(key.id, 'ACTIVE');
          return {
            success: true,
            data: validation.data,
            modelUsed: getModelUIName(modelId),
            gatewayModelId: modelId
          };
        }

        lastFailure = { errorType: 'DESCRIPTION_TOO_SHORT', errorMessage: validation.error || 'Validasi SEO gagal.' };
        if (attempt < 3) {
          currentPrompt = `${basePrompt}\n\nFOCUSED RETRY: ${validation.error}\nTulis ulang description berdasarkan judul: "${trimmedTitle}". Minimum 500 kata, target sekitar 600–750 kata, maksimum 1000 kata. Tambahkan emoticon yang relevan dan natural. Return ONLY valid JSON.`;
          continue;
        }
        if (routingMode === 'AUTO') break;
      } catch (err: any) {
        lastFailure = { errorType: 'NETWORK_ERROR', errorMessage: err?.message || 'Koneksi gagal.' };
        if (attempt === 3 && routingMode === 'AUTO') break;
        if (attempt === 3) {
          return {
            success: false,
            errorType: 'NETWORK_ERROR',
            errorMessage: err?.message || 'Koneksi gagal.',
            debugInfo: {
              selectedModel: getModelUIName(modelId),
              gatewayModelId: modelId,
              endpoint: 'https://api.kie.ai/codex/v1/responses',
              errorType: 'NETWORK_ERROR',
              errorMessage: err?.message || 'Koneksi gagal.',
              time: new Date().toLocaleTimeString(),
              attempt
            }
          };
        }
        await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
      }
    }
  }

  return {
    success: false,
    errorType: lastFailure?.errorType || 'GATEWAY_ERROR',
    errorMessage: lastFailure?.errorMessage || 'KIE Gateway gagal membuat SEO dari judul.',
    debugInfo: {
      selectedModel: getModelUIName(selectedModelId),
      gatewayModelId: selectedModelId,
      endpoint: 'https://api.kie.ai/codex/v1/responses',
      errorType: lastFailure?.errorType || 'GATEWAY_ERROR',
      errorMessage: lastFailure?.errorMessage || 'KIE Gateway gagal membuat SEO dari judul.',
      time: new Date().toLocaleTimeString()
    }
  };
}
