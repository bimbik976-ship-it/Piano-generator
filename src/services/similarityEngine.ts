import { GeneratedTrackResult } from '../types';

export interface UniquenessCheckResult {
  isUnique: boolean;
  duplicateTrackNumber?: number;
  similarityScore: number; // 0 to 1
  reason?: string;
  repetitionInstruction?: string;
  isBlocking: false; // 100% NON-BLOCKING
  status: 'ACCEPTED';
  decision: 'ACCEPTED — NON-BLOCKING';
  sharedMetadata?: {
    bpm?: number;
    key?: string;
    styleProfile?: string;
  };
  musicalDna?: string;
}

export const SUBSTANTIAL_DIFFERENCE_INSTRUCTION =
  'Create a substantially different musical concept. Change at least four musical dimensions such as register, harmonic language, rhythmic activity, voicing, texture, dynamics, ambience, instrumentation, or tempo.';

/**
 * PETA PIANO AI — DUPLICATE DETECTOR V2 (ULTRA-LENIENT / MUSICAL-DNA-ONLY / 100% NON-BLOCKING)
 *
 * CRITICAL REQUIREMENTS:
 * 1. ZERO METADATA REJECTION: BPM, Key, Tonality, Style Intensity, Genre, Mood, Category,
 *    Piano type, and Instruments MUST NEVER be used to calculate duplication or reject generation.
 *    Same BPM, Same Key, Same Intensity is completely normal and expected.
 * 2. MUSICAL DNA ONLY: Compares deep harmonic architecture, chord progression movement,
 *    voicing patterns, register distribution, phrasing, and counterpoint.
 * 3. GENERIC AMBIENT SLEEP PIANO VOCABULARY IS EXCLUDED: Shared aesthetic terms (peaceful, soft,
 *    ambient, minimalist, meditative, sleep, sparse, sustain, etc.) are intentional characteristics
 *    of PETA PIANO AI and are completely ignored.
 * 4. 100% NON-BLOCKING: Never throws, never rejects, never triggers generation retry.
 *    Decision is ALWAYS "ACCEPTED — NON-BLOCKING".
 */
export function checkMusicalUniqueness(
  candidate: {
    stylePrompt: string;
    bpm?: number;
    key?: string;
    instruments?: string[];
    styleIntensity?: any;
  },
  previousTracks: GeneratedTrackResult[]
): UniquenessCheckResult {
  if (!previousTracks || previousTracks.length === 0 || !candidate.stylePrompt) {
    return {
      isUnique: true,
      similarityScore: 0,
      isBlocking: false,
      status: 'ACCEPTED',
      decision: 'ACCEPTED — NON-BLOCKING',
      musicalDna: 'Unique musical architecture.',
    };
  }

  const candDnaTokens = extractMusicalDnaArchitecture(candidate.stylePrompt);

  for (const prev of previousTracks) {
    if (!prev.stylePrompt) continue;

    const prevDnaTokens = extractMusicalDnaArchitecture(prev.stylePrompt);

    // Calculate Jaccard similarity strictly on Musical DNA Architecture tokens
    let matches = 0;
    for (const token of candDnaTokens) {
      if (prevDnaTokens.has(token)) {
        matches++;
      }
    }

    const unionCount = new Set([...candDnaTokens, ...prevDnaTokens]).size;
    const dnaSimilarity = unionCount > 0 ? matches / unionCount : 0;

    // Check for verbatim sentence replication (ignoring generic stop words)
    const normalizedCandSentence = normalizeForVerbatimComparison(candidate.stylePrompt);
    const normalizedPrevSentence = normalizeForVerbatimComparison(prev.stylePrompt);
    const isVerbatimNearMatch =
      normalizedCandSentence.length > 30 &&
      normalizedPrevSentence.length > 30 &&
      (normalizedCandSentence.includes(normalizedPrevSentence) ||
        normalizedPrevSentence.includes(normalizedCandSentence));

    // ULTRA-HIGH THRESHOLD: Only an exceptionally strong structural match (>0.85 DNA overlap or verbatim replication)
    // receives an informational similarity advisory notice.
    // AND EVEN THEN: IT IS STRICTLY NON-BLOCKING (Status: ACCEPTED).
    if (dnaSimilarity >= 0.85 || isVerbatimNearMatch) {
      const score = Math.max(dnaSimilarity, isVerbatimNearMatch ? 0.95 : 0.85);

      return {
        isUnique: false,
        duplicateTrackNumber: prev.batchNumber,
        similarityScore: Math.min(score, 0.99),
        reason: `Similarity detected with Track #${prev.batchNumber}.`,
        repetitionInstruction: SUBSTANTIAL_DIFFERENCE_INSTRUCTION,
        isBlocking: false,
        status: 'ACCEPTED',
        decision: 'ACCEPTED — NON-BLOCKING',
        sharedMetadata: {
          bpm: candidate.bpm,
          key: candidate.key,
          styleProfile: 'similar',
        },
        musicalDna: 'Not proven identical.',
      };
    }
  }

  return {
    isUnique: true,
    similarityScore: 0,
    isBlocking: false,
    status: 'ACCEPTED',
    decision: 'ACCEPTED — NON-BLOCKING',
    musicalDna: 'Unique musical architecture.',
  };
}

/**
 * Extracts pure Musical DNA Architecture terms.
 * Explicitly ignores generic ambient/sleep aesthetic adjectives.
 */
function extractMusicalDnaArchitecture(prompt: string): Set<string> {
  const lower = prompt.toLowerCase();
  const dnaTerms = new Set<string>();

  // Deep musical architecture vocabulary:
  // Harmony, chords, voicings, inversions, registers, counterpoint, intervals, cadences
  const musicalDnaPatterns = [
    // Harmonic movement & modal colors
    'dorian', 'lydian', 'mixolydian', 'phrygian', 'aeolian', 'pentatonic',
    'modal mixture', 'chromatic mediant', 'diminished', 'augmented', 'secondary dominant',
    'tritone substitution', 'plagal cadence', 'authentic cadence', 'deceptive cadence',
    'half cadence', 'picardy third', 'tonic pedal', 'dominant pedal', 'pedal point',
    // Chord structures & extensions
    'major seventh', 'minor seventh', 'major ninth', 'minor ninth', 'add9', 'sus2', 'sus4',
    'eleventh chord', 'thirteenth chord', 'altered chord', 'neapolitan chord', 'quartal harmony',
    'quintal harmony', 'cluster chord', 'rootless voicing', 'open tenth', 'drop-2', 'drop 2',
    'open voicing', 'closed voicing',
    // Inversions & Voice leading
    'first inversion', 'second inversion', 'third inversion', 'voice leading', 'contrary motion',
    'parallel tenths', 'parallel sixths', 'oblique motion', 'counterpoint', 'two-part counterpoint',
    'inner voice movement', 'tenor line',
    // Bass movement & Registers
    'walking bass', 'arpeggiated bass', 'pedal register', 'sub-bass register', 'chime register',
    'upper bell register', 'contratone register', 'two-octave separation', 'isolated high droplet',
    // Phrasing & Rhythmic architecture
    'rubato phrasing', 'hemiola', 'syncopated breath', 'asymmetric phrase', 'five-bar phrase',
    'call and response', 'ostinato motif', 'polyrhythm', 'metric modulation', 'caesura',
    // Articulation & Textural dynamics
    'staccatissimo', 'una corda shift', 'tenuto touch', 'half-pedaling', 'sympathetic resonance'
  ];

  for (const term of musicalDnaPatterns) {
    if (lower.includes(term)) {
      dnaTerms.add(term);
    }
  }

  return dnaTerms;
}

/**
 * Normalizes prompt string by stripping generic ambient sleep piano shared aesthetic vocabulary
 * to allow accurate structural comparison.
 */
function normalizeForVerbatimComparison(prompt: string): string {
  // Generic terms that are common to all Ambient Sleep Piano prompts and MUST be stripped
  const genericTerms = [
    /\bambient\b/gi,
    /\bpiano\b/gi,
    /\bfelt\b/gi,
    /\bgrand\b/gi,
    /\bsoft\b/gi,
    /\bpeaceful\b/gi,
    /\bcalm\b/gi,
    /\bsoothing\b/gi,
    /\bmeditative\b/gi,
    /\bminimalist\b/gi,
    /\bsleep\b/gi,
    /\bsleep-friendly\b/gi,
    /\brelaxation\b/gi,
    /\bsparse\b/gi,
    /\bnotes\b/gi,
    /\blong sustain\b/gi,
    /\bsustain\b/gi,
    /\bpedal\b/gi,
    /\breverb\b/gi,
    /\bdelay\b/gi,
    /\btape\b/gi,
    /\bwarmth\b/gi,
    /\bgentle\b/gi,
    /\batmosphere\b/gi,
    /\bsilence\b/gi,
    /\bspace\b/gi,
    /\bquiet\b/gi,
    /\bintimate\b/gi,
    /\bslow\b/gi,
    /\bdynamics\b/gi,
    /\bsuno\b/gi,
    /\bprompt\b/gi,
    /\bstyle\b/gi,
    /[,\.\-\(\)\:\;]/g,
  ];

  let cleaned = prompt;
  for (const regex of genericTerms) {
    cleaned = cleaned.replace(regex, ' ');
  }

  return cleaned.replace(/\s+/g, ' ').trim().toLowerCase();
}
