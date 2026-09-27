import { GeneratedTrackResult } from '../types';

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
 * Analyzes the complete dataset of all 25 tracks in the batch.
 * Guarantees that analysis is built from the entire collection, not just Track #25.
 */
export function analyze25Tracks(tracks: GeneratedTrackResult[]): BatchMusicalAnalysis {
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
 * Strictly includes data from ALL 25 Style Prompts.
 */
export function buildYoutubeSeoPrompt(tracks: GeneratedTrackResult[]): string {
  const analysis = analyze25Tracks(tracks);

  const tracksFullListing = tracks
    .sort((a, b) => a.batchNumber - b.batchNumber)
    .map(
      (t) =>
        `[Style Prompt #${t.batchNumber}] ${t.metadata.pianoType} | ${t.bpm} BPM | Key: ${t.key} | Genre: ${t.metadata.genre} | Category: ${t.metadata.category} | Mood: ${t.metadata.mood} | Context: ${t.metadata.country}\n` +
        `Instruments: ${t.instruments.join(', ')}\n` +
        `Prompt: ${t.stylePrompt}\n` +
        `Intensity Profile: Ambient ${t.styleIntensity.ambient}%, Meditative ${t.styleIntensity.meditative}%, Sleep ${t.styleIntensity.sleepFriendly}%, Emotional ${t.styleIntensity.emotional}%`
    )
    .join('\n\n');

  return `
You are a senior YouTube Music Curator and SEO Copywriting Strategist specializing in relaxing instrumental piano music and nature-infused sleep soundscapes.

Below is the complete dataset of all 25 Style Prompts representing the musical identity of this project.

==================================================
INTERNAL MUSICAL IDENTITY DATA (FOR CONTEXT ONLY):
==================================================
- Primary Piano Architectures: ${analysis.dominantPianoTypes.join(', ')}
- Pacing Profile: ${analysis.bpmRange.min} - ${analysis.bpmRange.max} BPM (Average: ${analysis.bpmRange.avg} BPM)
- Dominant Genres: ${analysis.dominantGenres.join(', ')}
- Dominant Categories: ${analysis.dominantCategories.join(', ')}
- Dominant Moods: ${analysis.dominantMoods.join(', ')}
- Aesthetic Contexts: ${analysis.dominantCountries.join(', ')}
- Stylistic Tendencies: Ambient ${analysis.avgIntensity.ambient}%, Meditative ${analysis.avgIntensity.meditative}%, Sleep-Friendly ${analysis.avgIntensity.sleepFriendly}%
- Dominant Themes: ${analysis.dominantThemes.join(' | ')}

INTERNAL STYLE PROMPTS (#1 TO #${analysis.totalTracks}):
${tracksFullListing}

================================================================================
CRITICAL CORE DIRECTIVE — CONSUMER-FACING YOUTUBE COPY ONLY:
================================================================================
The SEO Description is written exclusively for the HUMAN VIEWER watching THIS SINGLE YOUTUBE VIDEO.
It is NOT a technical analysis report, musical critique, catalog audit, or AI generation log.

Use the internal data above ONLY to deeply understand the emotional essence, acoustic texture, and mood of the music.
NEVER reveal or recite internal technical parameters in the description!

================================================================================
FORBIDDEN TECHNICAL INFORMATION (STRICTLY PROHIBITED IN DESCRIPTION):
================================================================================
DO NOT mention any of the following:
- BPM, tempo numbers, BPM ranges, or average BPM (e.g., "40 to 68 BPM", "46 BPM", "average pace of 46 BPM", "beats per minute").
- Musical keys or key signatures (e.g., "Key of B minor", "in B minor", "open fifths", "key signature").
- Exact tempo, exact note density, or speed numbers.
- Style Intensity scores, Ambient scores, Minimalist scores, Meditative scores, Sleep scores, or Activity scores (e.g., "Style Intensity 8", "Musical Activity 2").
- Track numbers, track counts, prompt numbers (e.g., "Track #1", "#25", "25 tracks", "25-track", "25 songs", "25 pieces", "25 compositions", "25 Style Prompts", "Style Prompt #1").
- Technical metadata, generation parameters, or AI generation processes.

================================================================================
FORBIDDEN ALBUM / COLLECTION CATALOG LANGUAGE:
================================================================================
DO NOT use language that sounds like a music catalog or album review:
- FORBIDDEN WORDS: "album", "instrumental album", "collection", "music collection", "track collection", "across the collection", "each composition", "each track", "these tracks", "these 25 tracks".
- REPLACEMENTS:
  * "album" -> "music", "piano music", "this peaceful piano experience", "this relaxing soundscape", "this calming listening experience", "this peaceful atmosphere"
  * "collection" -> "music", "soundscape", "listening experience"
  * "composition" / "each composition" -> "piano piece", "piano music", "melody", "piano passage", "each gentle moment"
The description must feel like a natural description for ONE cohesive, continuous YouTube video that the listener is currently playing.

================================================================================
TRANSFORM TECHNICAL DATA INTO LISTENER EXPERIENCE:
================================================================================
- INSTEAD OF: "Tempos range from 40 to 68 BPM."
  USE: "The music moves at a slow, unhurried pace."
- INSTEAD OF: "The average BPM is 46."
  USE: "The gentle pacing leaves plenty of space between each piano phrase."
- INSTEAD OF: "The music uses B minor and open fifths."
  USE: "Warm, open harmonies create a spacious and peaceful atmosphere."
- INSTEAD OF: "Minimalist score 9 and Musical Activity 2."
  USE: "The sparse piano leaves generous space for quiet reflection."
- INSTEAD OF: "Felt upright piano and baby grand piano are used across the tracks."
  USE: "Soft, rounded piano tones create an intimate and comforting acoustic character."

================================================================================
YOUR DELIVERABLES:
================================================================================

1. YOUTUBE TITLE:
Create ONE compelling, natural, human-friendly title.
- Optimized for YouTube search intent and click-through rate.
- Reflects the peaceful musical identity (relaxation, deep sleep, stress relief, meditation, quiet focus).
- NO ALL CAPS. No clickbait or exaggerated hype.
- MANDATORY RULE: DO NOT include "Bamboo Water Sound" or "+ Bamboo Water Sound".
  The system automatically appends " + Bamboo Water Sound".
  Your output title must be the clean phrase BEFORE the suffix.

2. SEO OPTIMIZED DESCRIPTION (500–1,000 WORDS, TARGET 600–800 WORDS):
Write ONE cohesive, deeply relaxing, human-readable YouTube description structured into 6 paragraphs (separated by blank lines):

- PARAGRAPH 1 — MAIN ATMOSPHERE & INVITATION:
  Introduce this peaceful piano music and sanctuary of calm. Describe the gentle acoustic environment, the soothing mood, and the quiet space it creates to help slow down daily life and steady the breath. (No album/collection/track words).

- PARAGRAPH 2 — ACOUSTIC CHARACTER & GENTLE PACING:
  Describe the acoustic piano character (soft felt tones, intimate touch, lingering warm resonance, gentle unhurried pacing, and spacious pauses between melodies). Speak purely to how the music feels to the listener's ears. (Zero BPM numbers, zero keys, zero scores).

- PARAGRAPH 3 — LISTENING COMPANION & DAILY RHYTHMS:
  Explain how this calming piano music supports restorative daily moments (evening wind-down routines, falling into deep sleep, mindfulness meditation, quiet reading, studying, journaling, or soothing daily stress).

- PARAGRAPH 4 — NATURAL BAMBOO WATER SOUND:
  Naturally describe the organic Bamboo Water Sound flowing alongside the piano. Describe how the rhythmic trickle and soft acoustic knock of bamboo water provides an organic natural ambience that washes away tension and masks background noise. (Zero medical claims).

- PARAGRAPH 5 — CONTINUOUS UNINTERRUPTED FLOW:
  Explain how this music provides continuous, seamless listening with consistent volume and soothing harmony from beginning to end, making it ideal for hours of background listening, all-night sleep, or uninterrupted study sessions. (No track counts, no "each track", no "album").

- PARAGRAPH 6 — PEACEFUL CLOSING:
  Offer a gentle, welcoming closing message. Invite listeners to settle in, soften their breath, and find tranquil rest.

3. HIGH-VOLUME HASHTAGS (5 TO 15 HASHTAGS, TARGET 8–15):
Include broad music keywords (#RelaxingMusic, #PianoMusic, #SleepMusic, #MeditationMusic), niche keywords (#RelaxingPiano, #PeacefulPiano, #AmbientPiano, #SleepPiano), intent (#StressRelief, #DeepSleep), and channel identity (#BambooWaterSound). No duplicate hashtags.

4. YOUTUBE TAGS (15 TO 25 TAGS):
Relevant search queries (e.g., relaxing piano music, peaceful piano music, sleep piano music, piano music for sleep, bamboo water sound, piano and water sounds, calming piano, meditation piano, stress relief music, deep sleep music, background piano music, soft piano music). No duplicates.

5. STRICT JSON OUTPUT ONLY:
Return ONLY a valid JSON object matching the schema below. No markdown fences, no \`\`\`json, no explanations.

{
  "title": "Peaceful Piano Music for Relaxation, Sleep & Stress Relief",
  "description": "Six-paragraph description (500-1,000 words, target 600-800 words, strictly consumer-facing, zero technical metadata, zero album/collection words, natural Bamboo Water Sound mention)",
  "hashtags": [
    "#BambooWaterSound",
    "#RelaxingMusic",
    "#PianoMusic",
    "#SleepMusic",
    "#MeditationMusic",
    "#PeacefulPiano",
    "#AmbientPiano",
    "#SleepPiano",
    "#StressRelief",
    "#CalmingMusic",
    "#DeepSleep"
  ],
  "tags": [
    "relaxing piano music",
    "peaceful piano music",
    "sleep piano music",
    "piano music for sleep",
    "bamboo water sound",
    "piano and water sounds",
    "calming piano",
    "meditation piano",
    "stress relief music",
    "deep sleep music",
    "background piano music",
    "peaceful sleep music",
    "soft piano music",
    "soothing piano music",
    "piano for studying",
    "gentle piano melodies"
  ]
}
`.trim();
}
