import { GeneratedTrackResult } from '../types';
import { BATCH_SIZE } from '../config/batch';

export interface BatchMusicalAnalysis {
  totalTracks: number;
  bpmRange: { min: number; max: number; avg: number };
  dominantPianoTypes: string[];
  dominantGenres: string[];
  dominantCategories: string[];
  dominantMoods: string[];
  dominantCountries: string[];
  avgIntensity: {
    ambient: number;
    meditative: number;
    sleepFriendly: number;
    emotional: number;
    cinematic: number;
    musicalActivity: number;
  };
  dominantThemes: string[];
  trackBreakdown: Array<{
    batchNumber: number;
    pianoType: string;
    bpm: number;
    key: string;
    genre: string;
    category: string;
    mood: string;
    country: string;
    promptExcerpt: string;
    instruments: string[];
  }>;
}

/**
 * Analyzes the complete dataset of all 20 tracks in the batch.
 * Guarantees that analysis is built from the entire collection, not just Track #25.
 */
export function analyzeBatchTracks(tracks: GeneratedTrackResult[]): BatchMusicalAnalysis {
  // Sort tracks by batchNumber ascending (1 to 25)
  const sorted = [...tracks].sort((a, b) => a.batchNumber - b.batchNumber);

  const bpms = sorted.map((t) => t.bpm).filter((b) => typeof b === 'number' && !isNaN(b));
  const minBpm = bpms.length > 0 ? Math.min(...bpms) : 60;
  const maxBpm = bpms.length > 0 ? Math.max(...bpms) : 60;
  const avgBpm = bpms.length > 0 ? Math.round(bpms.reduce((acc, v) => acc + v, 0) / bpms.length) : 60;

  // Frequency counting helpers
  const countFrequency = (items: string[]) => {
    const map = new Map<string, number>();
    for (const item of items) {
      if (!item) continue;
      const normalized = item.trim();
      map.set(normalized, (map.get(normalized) || 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([val]) => val);
  };

  const pianoTypes = countFrequency(sorted.map((t) => t.metadata.pianoType));
  const genres = countFrequency(sorted.map((t) => t.metadata.genre));
  const categories = countFrequency(sorted.map((t) => t.metadata.category));
  const moods = countFrequency(sorted.map((t) => t.metadata.mood));
  const countries = countFrequency(sorted.map((t) => t.metadata.country));

  // Calculate average style intensity
  const total = sorted.length || 1;
  const avgIntensity = {
    ambient: Math.round(sorted.reduce((acc, t) => acc + (t.styleIntensity?.ambient || 80), 0) / total),
    meditative: Math.round(sorted.reduce((acc, t) => acc + (t.styleIntensity?.meditative || 80), 0) / total),
    sleepFriendly: Math.round(sorted.reduce((acc, t) => acc + (t.styleIntensity?.sleepFriendly || 85), 0) / total),
    emotional: Math.round(sorted.reduce((acc, t) => acc + (t.styleIntensity?.emotional || 50), 0) / total),
    cinematic: Math.round(sorted.reduce((acc, t) => acc + (t.styleIntensity?.cinematic || 30), 0) / total),
    musicalActivity: Math.round(sorted.reduce((acc, t) => acc + (t.styleIntensity?.musicalActivity || 20), 0) / total),
  };

  // Identify dominant themes
  const dominantThemes: string[] = [];
  if (avgIntensity.sleepFriendly >= 75) dominantThemes.push('Deep Sleep & Nighttime Rest');
  if (avgIntensity.meditative >= 75) dominantThemes.push('Mindfulness Meditation & Inner Peace');
  if (avgIntensity.ambient >= 75) dominantThemes.push('Ambient Soundscape & Gentle Atmosphere');
  if (categories.includes('Stress Relief') || categories.includes('Relaxation')) dominantThemes.push('Stress Relief & Calming');
  if (categories.includes('Anxiety Relief')) dominantThemes.push('Anxiety Relief & Soothing Calm');
  if (categories.includes('Depression Relief')) dominantThemes.push('Emotional Comfort & Supportive Relaxation');
  if (categories.includes('Study') || categories.includes('Deep Focus')) dominantThemes.push('Quiet Study & Reading');

  const trackBreakdown = sorted.map((t) => ({
    batchNumber: t.batchNumber,
    pianoType: t.metadata.pianoType || 'Piano',
    bpm: t.bpm,
    key: t.key || 'C Major',
    genre: t.metadata.genre || 'Ambient Piano',
    category: t.metadata.category || 'Relaxation',
    mood: t.metadata.mood || 'Peaceful',
    country: t.metadata.country || 'Global',
    promptExcerpt: t.stylePrompt.slice(0, 120) + (t.stylePrompt.length > 120 ? '...' : ''),
    instruments: t.instruments || ['piano'],
  }));

  return {
    totalTracks: sorted.length,
    bpmRange: { min: minBpm, max: maxBpm, avg: avgBpm },
    dominantPianoTypes: pianoTypes.slice(0, 3),
    dominantGenres: genres.slice(0, 3),
    dominantCategories: categories.slice(0, 4),
    dominantMoods: moods.slice(0, 4),
    dominantCountries: countries.slice(0, 3),
    avgIntensity,
    dominantThemes,
    trackBreakdown,
  };
}

/**
 * Builds the comprehensive prompt for KIE Gateway AI to generate YouTube Title and SEO Content.
 * Strictly includes data from ALL 20 Style Prompts.
 */
export function buildYoutubeSeoPrompt(
  tracks: GeneratedTrackResult[],
  options?: { isRegeneration?: boolean; previousTitle?: string }
): string {
  const analysis = analyzeBatchTracks(tracks);
  const isRegeneration = Boolean(options?.isRegeneration);
  const previousTitle = (options?.previousTitle || '').trim();

  // IMPORTANT: include all 20 prompts, but never send the full raw prompt bodies to KIE.
  // Full 20-prompt payloads can become very large and have caused upstream HTTP 500s.
  // Keep an information-dense semantic fingerprint from every prompt instead.
  const tracksFullListing = [...tracks]
    .sort((a, b) => a.batchNumber - b.batchNumber)
    .slice(0, 20)
    .map((t) => {
      const excerpt = String(t.stylePrompt || '')
        .replace(/\s+/g, ' ')
        .replace(/\b\d+(?:\.\d+)?\s*BPM\b/gi, '')
        .replace(/\b(?:key|musical key|key signature)\s*[:=]?\s*[A-G][#b]?\s*(?:major|minor)?\b/gi, '')
        .trim()
        .slice(0, 420);

      const intensity = t.styleIntensity
        ? `Ambient ${t.styleIntensity.ambient ?? 0}% | Meditative ${t.styleIntensity.meditative ?? 0}% | Sleep ${t.styleIntensity.sleepFriendly ?? 0}% | Emotional ${t.styleIntensity.emotional ?? 0}%`
        : '';

      return [
        `#${t.batchNumber} | Piano: ${t.metadata.pianoType} | Genre: ${t.metadata.genre} | Category: ${t.metadata.category} | Mood: ${t.metadata.mood} | Aesthetic: ${t.metadata.country}`,
        `Instruments: ${t.instruments.join(', ')}`,
        `Musical fingerprint: ${excerpt}`,
        intensity ? `Character profile: ${intensity}` : ''
      ].filter(Boolean).join('\n');
    })
    .join('\n\n---\n\n');

  const regenerationDirective = isRegeneration
    ? `
REGENERATION MODE:
This is a genuine REGENERATE SEO request. You MUST create a genuinely new TITLE and a genuinely new SEO DESCRIPTION from the musical identity below.
The previous title is supplied only as a reference to avoid repeating it:
"${previousTitle || '[no previous title available]'}"

Do NOT make a cosmetic edit of the previous title. Do NOT merely replace one adjective.
Change the title architecture, wording, and descriptive angle while remaining faithful to the actual music.
The description must also be newly written, not copied or lightly paraphrased from the previous package.
`
    : `
INITIAL GENERATION MODE:
Create the title and description from the musical identity below. Do not use a fixed title or paragraph template.
`;

  return `
You are the YouTube Content Engine for PETA PIANO AI.
Your task is to create a consumer-facing YouTube CONTENT PACKAGE from the complete musical identity represented by ALL 20 Style Prompts.

${regenerationDirective}

==================================================
INTERNAL MUSICAL DATA — ANALYZE, DO NOT EXPOSE
==================================================
Primary Piano Types: ${analysis.dominantPianoTypes.join(', ')}
Dominant Genres: ${analysis.dominantGenres.join(', ')}
Dominant Categories: ${analysis.dominantCategories.join(', ')}
Dominant Moods: ${analysis.dominantMoods.join(', ')}
Aesthetic Contexts: ${analysis.dominantCountries.join(', ')}
Dominant Themes: ${analysis.dominantThemes.join(' | ')}
Pacing range: ${analysis.bpmRange.min}-${analysis.bpmRange.max} BPM; average ${analysis.bpmRange.avg} BPM

COMPLETE STYLE PROMPTS:
${tracksFullListing}

==================================================
CORE RULE — MUSICAL-DNA-DRIVEN COPY
==================================================
Do NOT fill a generic SEO template.
Do NOT write the same title architecture, paragraph sequence, or vocabulary pattern for every batch.
Do NOT simply swap synonyms such as Peaceful → Calm → Serene.

First, internally determine the batch's distinctive musical identity:
- piano character and playing approach
- harmonic feel and movement
- register and voicing character
- note spacing and activity
- sustain and resonance
- dynamic restraint
- acoustic space
- emotional atmosphere
- strongest listening contexts
- distinctive sonic imagery

Then turn that identity into a unique content concept.
The content concept is internal and MUST NOT be returned.

VARIATION MUST COME FROM MUSICAL IDENTITY, NOT RANDOMNESS.
If two batches differ musically, their title angle and description structure should be able to differ substantially.

==================================================
TITLE — HIGHEST PRIORITY
==================================================
Create exactly ONE fresh base title.

The title must:
- accurately reflect the actual musical identity
- sound natural to a human YouTube viewer
- be concise and readable
- contain relevant search intent naturally
- use a title architecture chosen specifically for this batch
- NOT be a fixed template

Avoid repeatedly starting titles with:
- Peaceful Piano
- Relaxing Piano
- Calm Piano
- Ambient Piano
- Gentle Piano
- Sleep Piano

These words may be used when genuinely appropriate, but they must NOT become a recurring formula.

The model MUST NOT include:
"+ Bamboo Water Sound"
"Bamboo Water Sound"

The application adds the suffix automatically after validation.

For REGENERATE SEO, the new title MUST be meaningfully different from the previous title in wording AND structure.
A cosmetic one-word synonym change is insufficient.

==================================================
SEO DESCRIPTION — HIGHEST PRIORITY
==================================================
Write ONE completely new consumer-facing YouTube description.
Target: sekitar 600–750 words. Minimum: 500 words. Maximum: 1000 words.
Quality and musical relevance are more important than padding word count. Do NOT add generic paragraphs to force word count.

There is NO mandatory six-paragraph template.
Choose the number and order of paragraphs naturally according to the musical identity.
Do not repeat a fixed opening, fixed paragraph sequence, or fixed closing.

The description should naturally communicate the qualities actually supported by the musical data, such as:
- piano touch and tone
- spaciousness or intimacy
- harmonic atmosphere
- movement and restraint
- resonance and sustain
- listening environment
- mood
- relaxation, sleep, meditation, study, reading, focus, quiet evenings, or other relevant contexts when supported
- Bamboo Water Sound as a natural companion

Do NOT invent musical characteristics merely to make the copy sound different.

The description must be written specifically for ONE YouTube video.
It must NOT sound like an album review, catalog, track list, technical report, or AI-generation report.

Do NOT mention:
- BPM or tempo numbers
- musical key or key signature
- intensity scores
- technical metadata
- Style Prompt numbers
- 20 tracks / 20 prompts / track counts
- AI generation process
- album
- collection
- tracklist

No medical claims such as curing, treating, replacing therapy, replacing medication, or clinically proven effects.

Bamboo Water Sound should be mentioned naturally, but its position and wording should vary rather than using a fixed paragraph.

==================================================
HASHTAGS
==================================================
Generate 5–15 relevant hashtags.
Repetition with previous batches is acceptable.
Do NOT allow hashtag similarity to cause generation failure.

==================================================
YOUTUBE TAGS
==================================================
Generate 15–25 relevant comma-separated tags.
Repetition with previous batches is acceptable.
Do NOT allow tag similarity to cause generation failure.

==================================================
THUMBNAIL TEXT
==================================================
Create short thumbnail text derived from the NEW title.
Do not copy the complete title.
Use a short readable phrase, maximum 6–8 meaningful words.
Do not use technical metadata.

==================================================
STRICT JSON ONLY
==================================================
Return ONLY one valid JSON object. No markdown fences. No explanation.

{
  "title": "fresh base title without Bamboo Water Sound",
  "description": "600–750 word consumer-facing description (min 500, max 1000 words)",
  "hashtags": ["#..."],
  "tags": ["..."],
  "thumbnailText": "short text"
}
`.trim();
}
