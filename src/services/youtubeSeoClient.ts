import { GatewayModelId, GeneratedTrackResult, YoutubeContent, RoutingMode, ErrorType, SafeDebugInfo } from '../types';
import { ApiKeyManager } from './apiKeyManager';
import { BatchManager } from './batchManager';
import { analyze25Tracks, buildYoutubeSeoPrompt } from './youtubeSeoAnalyzer';
import { validateAndSanitizeYoutubeSeo } from './youtubeSeoValidator';
import { parseKieResponse, extractKieText } from './kieClient';
import { parseModelJSON, INVALID_JSON } from './jsonParser';
import { sanitizeSafeBody } from './kieConnectionTester';
import { AUTO_FALLBACK_CHAIN } from '../config/models';

export interface YoutubeSeoGenerateOptions {
  tracks: GeneratedTrackResult[];
  selectedModelId?: GatewayModelId;
  routingMode?: RoutingMode;
  isRegeneration?: boolean;
  onStatusUpdate?: (message: string) => void;
}

export interface YoutubeSeoResult {
  success: boolean;
  content?: YoutubeContent;
  errorMessage?: string;
  errorType?: ErrorType;
  debugInfo?: SafeDebugInfo;
}

/**
 * High-craft deterministic generator built strictly from the full 25-track analysis.
 * Used during offline testing, when no API key is set, or as fallback.
 * CRITICAL: The 25 tracks are INTERNAL ONLY and never mentioned in the description.
 */
export function generateDeterministicYoutubeSeo(
  tracks: GeneratedTrackResult[],
  seedModifier: number = 0
): YoutubeContent {
  const analysis = analyze25Tracks(tracks);

  const primaryPiano = analysis.dominantPianoTypes[0] || 'Felt Piano';
  const primaryGenre = analysis.dominantGenres[0] || 'Ambient Piano';
  const primaryMood = analysis.dominantMoods[0] || 'Peaceful';
  const primaryCategory = analysis.dominantCategories[0] || 'Deep Relaxation';

  // Dynamic natural title based on batch's dominant traits (WITHOUT suffix)
  const titleTemplates = [
    `Peaceful ${primaryPiano} Music for ${primaryCategory}, Relaxation & Stress Relief`,
    `Calming ${primaryPiano} Melodies for Deep Relaxation & Peaceful Sleep`,
    `Soothing ${primaryMood} Piano Music for Relaxation, Meditation & Quiet Focus`,
    `Gentle ${primaryPiano} Soundscapes for Deep Sleep, Stress Relief & Inner Peace`,
    `Serene ${primaryPiano} Atmosphere for Deep Rest, Mindfulness & Quiet Study`,
    `Soft ${primaryMood} Piano Harmonies for Peaceful Sleep & Calm Relaxation`,
  ];

  // Pick deterministic index based on batch tracks count, tempos, and optional seed
  const hash = tracks.reduce((acc, t) => acc + t.bpm + t.stylePrompt.length, seedModifier);
  const baseTitle = titleTemplates[Math.abs(hash) % titleTemplates.length];
  const finalTitle = `${baseTitle} + Bamboo Water Sound`;

  // Dynamic 6-paragraph SEO description strictly based on all 25 tracks (500–1,000 words, target 600–800 words)
  // ZERO mention of technical metadata (BPM, keys, scores) or catalog language ("album", "collection", track counts)
  const paragraph1 = `Welcome to this peaceful piano soundscape, an immersive acoustic experience thoughtfully created to offer a sanctuary of stillness, emotional balance, and restorative calm. This gentle piano music unites soothing acoustic harmonies, crafted with deliberate negative space, tender phrasing, and an organic aesthetic. Rather than demanding active focus, the music unfolds as a soothing background atmosphere designed to slow the rapid pace of daily life, steady the breath, and establish a tranquil haven within your personal space. From the very first gentle chord to the final lingering resonance, this peaceful piano experience serves as a dependable refuge for anyone seeking calming music, deep mental quietude, and a comforting shelter from digital overstimulation.`;

  const paragraph2 = `At the heart of this soundscape lies the tender acoustic warmth of ${primaryPiano.toLowerCase()} instrumentation, characterized by intimate felt hammers, delicate mechanical nuances, and spacious pedaling that emphasizes resonance over speed. Flowing at a slow, unhurried pace, the gentle pacing leaves plenty of space between each piano phrase. The melodic progressions are intentionally minimalist, avoiding jarring dynamic shifts, sudden volume spikes, or intense crescendos. Each phrase is granted ample room to breathe, allowing the natural acoustic decay of each note to drift softly into the surrounding silence. The overarching character blends subtle ${primaryMood.toLowerCase()} sensibilities with soothing harmonic warmth, creating an ambient piano atmosphere that feels personal, tender, and deeply comforting throughout every single moment.`;

  const paragraph3 = `This peaceful piano music is created specifically to complement the quietest, most contemplative moments of your daily rhythm. Many listeners turn to this calming music during evening wind-down rituals to ease the transition into deep sleep, while others utilize its quiet acoustic character for mindfulness meditation, reflective journaling, or gentle morning stretching. The unobtrusive nature of the soft piano melodies also makes it an exceptional companion for deep work, immersive reading, creative writing, and quiet academic study, as it masks distracting background noise without interrupting cognitive focus. Whatever your personal sanctuary requires—whether unwinding from a demanding day, soothing restless thoughts, or simply cultivating a serene atmosphere at home—this music offers a dependable space for ${primaryCategory.toLowerCase()}.`;

  const paragraph4 = `Complementing the delicate acoustic piano is the organic accompaniment of an authentic Bamboo Water Sound, interwoven throughout the music with natural acoustic balance. The cyclical, rhythmic pouring and gentle resonant knock of water moving through natural bamboo wood creates a grounded ambient presence that transports the listener into a quiet garden or forest retreat. Far from an artificial novelty, this soft flowing water and gentle bamboo water ambience interacts harmoniously with the piano frequencies, providing an organic natural white-noise blanket that gently washes away room echoes and intrusive background sounds. The soothing synergy of piano and water sounds enriches the entire auditory environment, creating a natural water atmosphere that feels timeless, grounded, and profoundly peaceful.`;

  const paragraph5 = `Arranged specifically for extended, uninterrupted listening, this continuous musical flow is structured to ensure effortless transitions and absolute acoustic consistency from beginning to end. With harmonious acoustics, matching dynamic levels, and compatible reverberant spaces, you will never be startled by sudden volume spikes or abrupt stylistic changes. You can press play and let this soothing soundscape stream continuously in the background during long sleep sessions, extended reading afternoons, or all-night relaxation routines without ever needing to adjust your volume or skip forward. It is a seamless, peaceful haven designed to accompany you through hours of undisturbed quietude.`;

  const paragraph6 = `We invite you to make yourself comfortable, dim the lights, and let this peaceful sanctuary surround your environment. Take a slow, measured breath in, soften your shoulders, and allow the gentle combination of acoustic piano harmonies and peaceful water ambience to guide you into a state of quiet equilibrium. Thank you for listening and sharing this serene sonic space with us. If this tranquil music brought calm to your day or helped you find restful sleep, we hope it continues to serve as a beloved companion whenever you need quiet background music and pure relaxation.`;

  const description = [
    paragraph1,
    paragraph2,
    paragraph3,
    paragraph4,
    paragraph5,
    paragraph6,
  ].join('\n\n');

  // Hashtags matching batch analysis (5 to 15, Target 8-15)
  const baseHashtags = [
    '#BambooWaterSound',
    '#RelaxingMusic',
    '#PianoMusic',
    '#SleepMusic',
    '#MeditationMusic',
    '#PeacefulPiano',
    '#AmbientPiano',
    '#SleepPiano',
    '#StressRelief',
    '#CalmingMusic',
    '#DeepSleep',
    '#BackgroundMusic',
    '#StudyMusic',
    '#SoftPiano',
  ];

  // Rotate hashtags slightly if seed is provided
  const shift = Math.abs(seedModifier) % 3;
  const hashtags = [...baseHashtags.slice(shift), ...baseHashtags.slice(0, shift)].slice(0, 13);

  // Tags matching batch analysis (15 to 25)
  const tags = [
    `${primaryPiano.toLowerCase()} music`,
    'relaxing piano music',
    'peaceful piano music',
    'sleep piano music',
    'piano music for sleep',
    'bamboo water sound',
    'piano and water sounds',
    `calming ${primaryMood.toLowerCase()} piano`,
    'meditation piano music',
    'stress relief music',
    'deep sleep music',
    'background piano music',
    'soft piano music',
    'peaceful sleep music',
    'soothing piano melodies',
    'ambient piano soundscape',
    'study background piano',
    'gentle piano for relaxation',
    'pure instrumental piano',
    'water sounds for sleep',
  ];

  return {
    title: finalTitle,
    thumbnailText: `${primaryMood.toUpperCase()} PIANO\nDEEP SLEEP`,
    description,
    hashtags,
    tags,
    generatedAt: Date.now(),
  };
}

/**
 * Primary executor for YouTube Title & SEO Generation and Regeneration.
 * Strictly active ONLY IF Batch Progress = 25/25 and all 25 prompts are stored.
 * On regeneration failure, old result is KEPT intact and safe diagnostic error is returned.
 */
export async function executeYoutubeSeoGeneration(
  options: YoutubeSeoGenerateOptions
): Promise<YoutubeSeoResult> {
  const {
    tracks,
    selectedModelId = 'gpt-6-astra',
    routingMode = 'AUTO',
    isRegeneration = false,
    onStatusUpdate,
  } = options;

  // RULE CHECK: Active ONLY IF 25/25 tracks exist in batch
  if (!tracks || tracks.length < 25) {
    return {
      success: false,
      errorType: 'UNKNOWN_ERROR',
      errorMessage: `Fitur YouTube Title & SEO hanya aktif jika BATCH PROGRESS = 25/25 (saat ini ${tracks?.length || 0}/25).`,
    };
  }

  onStatusUpdate?.('MENGANALISIS SELURUH 25 STYLE PROMPT...');

  const keyManager = ApiKeyManager.getInstance();
  const activeKeys = keyManager.getActiveKeys();

  // Validate API key presence
  if (activeKeys.length === 0) {
    const debugInfo: SafeDebugInfo = {
      selectedModel: selectedModelId,
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

  const currentKey =
    routingMode === 'MANUAL'
      ? (keyManager.getManualSelectedKey() || activeKeys[0])
      : (keyManager.getNextActiveKey() || activeKeys[0]);

  if (!currentKey || !currentKey.rawKey) {
    const debugInfo: SafeDebugInfo = {
      selectedModel: selectedModelId,
      gatewayModelId: selectedModelId,
      errorType: 'API_KEY_ERROR',
      errorMessage: 'Kunci KIE yang dipilih tidak memiliki raw key valid.',
      time: new Date().toLocaleTimeString(),
    };
    return {
      success: false,
      errorType: 'API_KEY_ERROR',
      errorMessage: 'Kunci KIE tidak valid. Periksa konfigurasi di tab API.',
      debugInfo,
    };
  }

  // Model fallback chain:
  // In AUTO mode: selectedModelId first, then remaining supported chat models
  // In MANUAL mode: strictly selectedModelId
  const candidateModels: GatewayModelId[] =
    routingMode === 'AUTO'
      ? Array.from(new Set([selectedModelId, 'gpt-6-astra', 'gpt-5-6-luna', 'gpt-5-5']))
      : [selectedModelId];

  const analysis = analyze25Tracks(tracks);

  let lastErrorType: ErrorType = 'UNKNOWN_ERROR';
  let lastErrorMessage = '';
  let lastDebugInfo: SafeDebugInfo | undefined;

  for (let i = 0; i < candidateModels.length; i++) {
    const model = candidateModels[i];
    const MAX_ATTEMPTS = 2;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      onStatusUpdate?.(
        attempt > 1
          ? `MENCOBA KEMBALI YOUTUBE TITLE & SEO VIA ${model.toUpperCase()} (Percobaan ${attempt}/${MAX_ATTEMPTS})...`
          : candidateModels.length > 1
            ? `MEMBUAT YOUTUBE TITLE & SEO VIA ${model.toUpperCase()} (Model ${i + 1}/${candidateModels.length})...`
            : `MEMBUAT YOUTUBE TITLE & SEO VIA ${model.toUpperCase()}...`
      );

      const basePrompt = buildYoutubeSeoPrompt(tracks);
      const promptText =
        attempt > 1
          ? `${basePrompt}\n\nRETRY INSTRUCTION: Output sebelumnya tidak valid atau mengandung metadata teknis/katalog terlarang. Kembalikan HANYA single JSON object tanpa markdown, tanpa code fences (\`\`\`json), dan tanpa teks pengantar. Deskripsi harus 100% CONSUMER-FACING untuk penonton SATU video YouTube (500-1000 kata): DILARANG menyebut BPM, angka tempo, nada dasar/key, Style Intensity, track count/number (25-track), dan DILARANG memakai kata 'album' atau 'collection'.`
          : basePrompt;

      const payload = {
        model,
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

      const abortCtrl = new AbortController();
      const timeoutId = setTimeout(() => {
        try {
          abortCtrl.abort();
        } catch {}
      }, 85000);

      try {
        const res = await fetch('/api/kie/responses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentKey.rawKey}`,
          },
          body: JSON.stringify(payload),
          signal: abortCtrl.signal,
        });

        clearTimeout(timeoutId);

        const parsedRes = await parseKieResponse(res);

        if (parsedRes.httpStatus >= 400) {
          if (parsedRes.httpStatus === 401 || parsedRes.httpStatus === 403) {
            lastErrorType = 'API_KEY_ERROR';
            lastErrorMessage = `API Key tidak valid atau unauthorized (HTTP ${parsedRes.httpStatus})`;
          } else if (parsedRes.httpStatus === 429) {
            lastErrorType = 'RATE_LIMIT';
            lastErrorMessage = 'Rate limit tercapai pada Gateway AI';
          } else if (parsedRes.httpStatus === 404 || parsedRes.httpStatus === 400) {
            lastErrorType = 'MODEL_NOT_SUPPORTED';
            lastErrorMessage = `Model ${model} tidak didukung atau endpoint salah (HTTP ${parsedRes.httpStatus})`;
          } else {
            lastErrorType = 'GATEWAY_ERROR';
            lastErrorMessage = `Gateway mengembalikan status HTTP ${parsedRes.httpStatus}`;
          }

          lastDebugInfo = {
            selectedModel: model,
            gatewayModelId: model,
            errorType: lastErrorType,
            errorMessage: lastErrorMessage,
            time: new Date().toLocaleTimeString(),
            httpStatus: parsedRes.httpStatus,
            endpoint: '/api/kie/responses',
            sanitizedResponseBody: sanitizeSafeBody(parsedRes.rawText),
          };

          // On HTTP error (auth, rate limit, etc), break out of retry loop for this model
          break;
        }

        const assistantText = parsedRes.assistantText || parsedRes.rawText;
        const parsedJSON = parseModelJSON(assistantText);

        if (parsedJSON === INVALID_JSON) {
          lastErrorType = 'INVALID_JSON';
          lastErrorMessage = 'Model tidak mengembalikan format JSON yang valid.';
          lastDebugInfo = {
            selectedModel: model,
            gatewayModelId: model,
            errorType: 'INVALID_JSON',
            errorMessage: lastErrorMessage,
            time: new Date().toLocaleTimeString(),
            httpStatus: parsedRes.httpStatus,
            endpoint: '/api/kie/responses',
            sanitizedResponseBody: sanitizeSafeBody(assistantText),
          };
          // Try attempt 2
          continue;
        }

        // Validate and sanitize strictly according to YouTube SEO specifications
        const validation = validateAndSanitizeYoutubeSeo(parsedJSON, {
          dominantPiano: analysis.dominantPianoTypes[0],
          dominantMood: analysis.dominantMoods[0],
          dominantCategory: analysis.dominantCategories[0],
          minBpm: analysis.bpmRange.min,
          maxBpm: analysis.bpmRange.max,
          avgBpm: analysis.bpmRange.avg,
        });

        if (validation.sanitizedContent) {
          // Success: persist to active batch
          BatchManager.getInstance().setYoutubeContent(validation.sanitizedContent);
          return {
            success: true,
            content: validation.sanitizedContent,
          };
        } else {
          lastErrorType = 'INVALID_STRUCTURE';
          lastErrorMessage = `Struktur konten SEO tidak memenuhi spesifikasi: ${validation.errors.join(', ')}`;
          lastDebugInfo = {
            selectedModel: model,
            gatewayModelId: model,
            errorType: 'INVALID_STRUCTURE',
            errorMessage: lastErrorMessage,
            time: new Date().toLocaleTimeString(),
            httpStatus: parsedRes.httpStatus,
            endpoint: '/api/kie/responses',
          };
          // Try attempt 2
          continue;
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        const isAbort = err.name === 'AbortError';
        lastErrorType = isAbort ? 'GATEWAY_ERROR' : 'NETWORK_ERROR';
        lastErrorMessage = isAbort
          ? 'Request timeout setelah 85 detik'
          : err.message || 'Gagal tersambung ke Gateway';
        lastDebugInfo = {
          selectedModel: model,
          gatewayModelId: model,
          errorType: lastErrorType,
          errorMessage: lastErrorMessage,
          time: new Date().toLocaleTimeString(),
          endpoint: '/api/kie/responses',
        };
        // Break out of retry loop on network/abort error
        break;
      }
    }

    // If in AUTO routing and another model is available, continue fallback
    if (routingMode === 'AUTO' && i < candidateModels.length - 1) {
      continue;
    }
  }

  // If we reach here, the API request failed.
  // CRITICAL RULE (SECTION 17 & 26):
  // "Jangan menghapus SEO lama ketika regeneration dimulai.
  //  Hasil lama tetap ditampilkan sampai hasil baru berhasil divalidasi.
  //  Jika generation gagal: pertahankan hasil lama, tampilkan error, aktifkan kembali tombol."
  return {
    success: false,
    errorType: lastErrorType,
    errorMessage: `SEO REGENERATION FAILED: ${lastErrorMessage}`,
    debugInfo: lastDebugInfo,
  };
}
