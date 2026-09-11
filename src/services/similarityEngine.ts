import { GeneratedTrackResult } from '../types';

export interface UniquenessCheckResult {
  isUnique: boolean;
  duplicateTrackNumber?: number;
  similarityScore: number; // 0 to 1
  reason?: string;
  repetitionInstruction?: string;
}

export const SUBSTANTIAL_DIFFERENCE_INSTRUCTION =
  'Create a substantially different musical concept. Change at least four musical dimensions such as register, harmonic language, rhythmic activity, voicing, texture, dynamics, ambience, instrumentation, or tempo.';

/**
 * Checks musical fingerprint uniqueness of candidate track against previous tracks in batch.
 */
export function checkMusicalUniqueness(
  candidate: Pick<GeneratedTrackResult, 'stylePrompt' | 'bpm' | 'key' | 'instruments' | 'styleIntensity'>,
  previousTracks: GeneratedTrackResult[]
): UniquenessCheckResult {
  if (!previousTracks || previousTracks.length === 0) {
    return { isUnique: true, similarityScore: 0 };
  }

  for (const prev of previousTracks) {
    let score = 0;
    const matchedAspects: string[] = [];

    // 1. BPM Comparison (±3 BPM difference is very high musical similarity)
    const bpmDiff = Math.abs(candidate.bpm - prev.bpm);
    if (bpmDiff === 0) {
      score += 0.25;
      matchedAspects.push(`identical BPM (${candidate.bpm})`);
    } else if (bpmDiff <= 3) {
      score += 0.15;
      matchedAspects.push(`near BPM (${candidate.bpm} vs ${prev.bpm})`);
    }

    // 2. Musical Key
    const cleanCandKey = candidate.key.toLowerCase().trim();
    const cleanPrevKey = prev.key.toLowerCase().trim();
    if (cleanCandKey === cleanPrevKey) {
      score += 0.25;
      matchedAspects.push(`same tonality/key (${candidate.key})`);
    }

    // 3. Instruments Overlap (Jaccard Index)
    const candInsts = new Set(candidate.instruments.map(i => i.toLowerCase().trim()));
    const prevInsts = new Set(prev.instruments.map(i => i.toLowerCase().trim()));
    let sharedCount = 0;
    for (const inst of candInsts) {
      if (prevInsts.has(inst)) sharedCount++;
    }
    const unionCount = new Set([...candInsts, ...prevInsts]).size;
    const jaccard = unionCount > 0 ? sharedCount / unionCount : 0;
    if (jaccard > 0.6) {
      score += 0.2;
      matchedAspects.push('heavy instrument overlap');
    } else if (jaccard > 0.3) {
      score += 0.1;
    }

    // 4. Style Intensity Distance
    const keys = ['ambient', 'minimalist', 'meditative', 'sleepFriendly', 'emotional', 'cinematic', 'musicalActivity'] as const;
    let totalIntensityDiff = 0;
    for (const k of keys) {
      totalIntensityDiff += Math.abs((candidate.styleIntensity[k] || 0) - (prev.styleIntensity[k] || 0));
    }
    const avgIntensityDiff = totalIntensityDiff / keys.length;
    if (avgIntensityDiff < 8) {
      score += 0.2;
      matchedAspects.push(`near identical style intensity profile (diff: ${avgIntensityDiff.toFixed(1)}%)`);
    }

    // 5. Prompt Musical Token Overlap (Extract key musical adjectives, registers, articulations)
    const candTokens = extractMusicalTokens(candidate.stylePrompt);
    const prevTokens = extractMusicalTokens(prev.stylePrompt);
    let tokenMatches = 0;
    for (const t of candTokens) {
      if (prevTokens.has(t)) tokenMatches++;
    }
    const tokenUnion = new Set([...candTokens, ...prevTokens]).size;
    const tokenSimilarity = tokenUnion > 0 ? tokenMatches / tokenUnion : 0;
    if (tokenSimilarity > 0.5) {
      score += 0.25;
      matchedAspects.push('high musical texture & terminology overlap');
    }

    // Check threshold: If score is 0.70 or higher, it represents musical concept duplication
    if (score >= 0.70) {
      return {
        isUnique: false,
        duplicateTrackNumber: prev.batchNumber,
        similarityScore: Math.min(score, 1.0),
        reason: `Musical fingerprint too similar to Track #${prev.batchNumber}: ${matchedAspects.join(', ')}`,
        repetitionInstruction: SUBSTANTIAL_DIFFERENCE_INSTRUCTION,
      };
    }
  }

  return { isUnique: true, similarityScore: 0 };
}

/**
 * Extracts musical terms (voicing, register, articulation, texture, tempo)
 */
function extractMusicalTokens(prompt: string): Set<string> {
  const musicalKeywords = [
    'arpeggio', 'rubato', 'staccato', 'legato', 'sustain', 'felt', 'damped',
    'intimate', 'upright', 'grand', 'reverb', 'hall', 'cathedral', 'tape',
    'warmth', 'harmonic', 'seventh', 'ninth', 'pentatonic', 'modal',
    'ostinato', 'syncopated', 'minimalist', 'space', 'decay', 'soft pedal',
    'una corda', 'lower register', 'upper register', 'octave', 'subtle',
    'ambient pad', 'cello', 'drone', 'shimmer', 'vinyl', 'analog'
  ];

  const lower = prompt.toLowerCase();
  const tokens = new Set<string>();
  for (const kw of musicalKeywords) {
    if (lower.includes(kw)) {
      tokens.add(kw);
    }
  }
  return tokens;
}
