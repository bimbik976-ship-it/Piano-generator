import { YoutubeContent } from '../types';

export interface YoutubeSeoValidationResult {
  isValid: boolean;
  sanitizedContent?: YoutubeContent;
  errors: string[];
}

export interface YoutubeSeoValidationContext {
  dominantPiano?: string;
  dominantMood?: string;
  dominantCategory?: string;
  minBpm?: number;
  maxBpm?: number;
  avgBpm?: number;
  previousTitle?: string;
}

export function cleanCoreTitle(rawTitle: string): string {
  return String(rawTitle || '')
    .replace(/\s*\+\s*Bamboo\s+Water\s+Sound\s*$/i, '')
    .replace(/\s*-\s*Bamboo\s+Water\s+Sound\s*$/i, '')
    .replace(/\s*\|\s*Bamboo\s+Water\s+Sound\s*$/i, '')
    .replace(/\bBamboo\s+Water\s+Sound\b/gi, '')
    .replace(/["“”]/g, '')
    .replace(/[\s\+\-\|:,]+$/, '')
    .trim();
}

export function isTitleMeaningfullyDifferent(newTitle: string, previousTitle?: string): boolean {
  if (!previousTitle) return true;
  const cleanNew = cleanCoreTitle(newTitle).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const cleanPrev = cleanCoreTitle(previousTitle).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

  if (!cleanPrev) return true;
  if (cleanNew === cleanPrev) return false;

  const wordsNew = cleanNew.split(' ').filter(Boolean);
  const wordsPrev = cleanPrev.split(' ').filter(Boolean);

  const setPrev = new Set(wordsPrev);
  const setNew = new Set(wordsNew);
  if (wordsNew.length === wordsPrev.length && wordsNew.every((w) => setPrev.has(w))) {
    return false;
  }

  const synonymPairs: [string, string][] = [
    ['peaceful', 'calm'],
    ['peaceful', 'serene'],
    ['peaceful', 'quiet'],
    ['peaceful', 'gentle'],
    ['relaxing', 'soothing'],
    ['relaxing', 'calming'],
    ['relaxing', 'peaceful'],
    ['quiet', 'gentle'],
    ['quiet', 'soft'],
    ['sleep', 'deep sleep'],
    ['sleep', 'rest'],
    ['meditation', 'mindfulness'],
  ];

  const diffInNew = wordsNew.filter((w) => !setPrev.has(w));
  const diffInPrev = wordsPrev.filter((w) => !setNew.has(w));
  if (diffInNew.length <= 1 && diffInPrev.length <= 1) {
    if (diffInNew.length === 0 && diffInPrev.length === 0) return false;
    const wNew = diffInNew[0] || '';
    const wPrev = diffInPrev[0] || '';
    const isSyn = synonymPairs.some(([a, b]) => (a === wNew && b === wPrev) || (b === wNew && a === wPrev));
    if (isSyn) return false;
  }

  const common = wordsNew.filter((w) => setPrev.has(w)).length;
  const union = new Set([...wordsNew, ...wordsPrev]).size;
  if (union > 0 && common / union > 0.82 && Math.abs(wordsNew.length - wordsPrev.length) <= 1) {
    return false;
  }

  return true;
}

// Strictly forbidden technical information patterns (BPM, keys, scores, metadata, AI processes, track numbers/counts)
export const FORBIDDEN_TECHNICAL_PATTERNS = [
  /\b\d+\s*(?:to|-)\s*\d+\s*bpm\b/gi,
  /\b\d+\s*bpm\b/gi,
  /\bbpm\b/gi,
  /\bbeats\s+per\s+minute\b/gi,
  /\b(?:average\s+)?tempo\s+of\s+\d+\b/gi,
  /\bpace\s+of\s+\d+\s*bpm\b/gi,
  /\b(?:in\s+the\s+)?key\s+of\s+[A-G](?:\s*(?:major|minor|maj|min|#|b))?\b/gi,
  /\b[A-G]\s+(?:major|minor)\s+key\b/gi,
  /\bkey\s+signature\b/gi,
  /\bopen\s+fifths\b/gi,
  /\bstyle\s+intensity(?:\s*score)?(?:\s*:\s*|\s+)\d+/gi,
  /\b(?:ambient|minimalist|meditative|sleep[- ]friendly|emotional|cinematic|musical\s+activity)\s+(?:score|intensity)\b/gi,
  /\bactivity\s+score\b/gi,
  /\bnote\s+density\b/gi,
  /\btechnical\s+metadata\b/gi,
  /\bgeneration\s+settings\b/gi,
  /\b(ai|artificial\s+intelligence)\s+(generation|process|model)\b/gi,
  /\bsynthesized\s+from\s+\d+\b/gi,
  /\bstyle\s+prompts?\s*#?\s*\d+\b/gi,
  /\bprompt\s*#?\s*\d+\b/gi,
  /\b25[\s-]*tracks?\b/gi,
  /\b25[\s-]*track\b/gi,
  /\b25\s+track\b/gi,
  /\b25[\s-]*piano\s+tracks?\b/gi,
  /\b25[\s-]*songs?\b/gi,
  /\b25[\s-]*pieces?\b/gi,
  /\b25[\s-]*compositions?\b/gi,
  /\b25[\s-]*style\s+prompts?\b/gi,
  /\ball\s+25\s+tracks?\b/gi,
  /\bthese\s+25\s+tracks?\b/gi,
  /\btwenty[- ]five\s+(?:tracks?|songs?|pieces?|compositions?|style\s+prompts?)\b/gi,
  /\b20[\s-]*tracks?\b/gi,
  /\b20[\s-]*track\b/gi,
  /\b20\s+track\b/gi,
  /\b20[\s-]*piano\s+tracks?\b/gi,
  /\b20[\s-]*songs?\b/gi,
  /\b20[\s-]*pieces?\b/gi,
  /\b20[\s-]*compositions?\b/gi,
  /\b20[\s-]*style\s+prompts?\b/gi,
  /\ball\s+20\s+tracks?\b/gi,
  /\bthese\s+20\s+tracks?\b/gi,
  /\btwenty\s+(?:tracks?|songs?|pieces?|compositions?|style\s+prompts?)\b/gi,
  /\btrack\s*#?\s*\d+\b/gi,
];

// Strictly forbidden album/collection catalog language
export const FORBIDDEN_ALBUM_PATTERNS = [
  /\binstrumental\s+album\s+collection\b/gi,
  /\binstrumental\s+album\b/gi,
  /\balbum\s+collection\b/gi,
  /\bmusic\s+collection\b/gi,
  /\btrack\s+collection\b/gi,
  /\bacross\s+the\s+collection\b/gi,
  /\bacross\s+the\s+album\b/gi,
  /\bthroughout\s+the\s+collection\b/gi,
  /\bthroughout\s+the\s+album\b/gi,
  /\bthe\s+collection\b/gi,
  /\bthis\s+collection\b/gi,
  /\bthis\s+album\b/gi,
  /\bthe\s+album\b/gi,
  /\ban\s+album\b/gi,
  /\balbums?\b/gi,
  /\beach\s+composition\b/gi,
  /\beach\s+track\b/gi,
  /\bthese\s+tracks\b/gi,
  /\bindividual\s+tracks\b/gi,
  /\btracklist\b/gi,
];

// Legacy alias for backwards compatibility
export const FORBIDDEN_25_TRACK_PATTERNS = FORBIDDEN_TECHNICAL_PATTERNS;

const MEDICAL_CLAIM_PATTERNS = [
  /\bcures?\s+(anxiety|depression|depressive|insomnia|disease|illness|pain|sickness|disorder)\b/gi,
  /\b(cure|curing|treat|treating|treats)\s+(for\s+)?(depression|depressive|anxiety|insomnia)\b/gi,
  /\b(replaces?|substitutes?)\s+(for\s+)?(therapy|medication|medicine|antidepressants?)\b/gi,
  /\bmedical(ly)?\s+(proven|tested|approved|treatment|cure|therapy|solution)\b/gi,
  /\bheals?\s+(all\s+)?(illness|disease|trauma|anxiety|depression|insomnia)\b/gi,
  /\btreats?\s+(clinical\s+)?(depression|anxiety|disorders|illness|insomnia)\b/gi,
  /\bclinically\s+(proven|tested|verified)\b/gi,
  /\bproven\s+to\s+(cure|treat|heal)\s+depression\b/gi,
];

const BAMBOO_WATER_SUFFIX = ' + Bamboo Water Sound';

/**
 * Transforms technical information and catalog vocabulary into natural consumer-facing listener copy.
 */
export function sanitizeConsumerFacingDescription(text: string): string {
  let cleaned = text;

  // 1. Transform BPM and Tempo numbers into natural listener language
  cleaned = cleaned.replace(
    /\b(?:flowing\s+at\s+a\s+)?(?:gentle,?\s+)?unhurried\s+tempo\s+ranging\s+between\s+\d+\s+and\s+\d+\s+beats?\s+per\s+minute\s*(?:\([^)]*\))?/gi,
    'Flowing at a slow, unhurried pace'
  );
  cleaned = cleaned.replace(
    /\b(?:tempos?|tempo)\s+(?:range|ranges)\s+(?:from|between)\s+\d+\s*(?:to|-|and)\s*\d+\s*(?:bpm|beats?\s+per\s+minute)?/gi,
    'The music moves at a slow, unhurried pace'
  );
  cleaned = cleaned.replace(
    /\b(?:the\s+)?average\s+(?:bpm|tempo)\s+(?:is|of)\s+\d+(?:\s*bpm)?/gi,
    'The gentle pacing leaves plenty of space between each piano phrase'
  );
  cleaned = cleaned.replace(/\b(?:average\s+)?tempo\s+of\s+\d+\b/gi, 'gentle, unhurried pace');
  cleaned = cleaned.replace(/\baverage\s+pace\s+of\s+\d+\s*bpm/gi, 'a peaceful, unhurried pace');
  cleaned = cleaned.replace(/\baveraging\s+\d+\s*bpm/gi, 'with spacious pacing');
  cleaned = cleaned.replace(/\b\d+\s*(?:to|-)\s*\d+\s*bpm\b/gi, 'slow, soothing pace');
  cleaned = cleaned.replace(/\b\d+\s*bpm\b/gi, 'gentle acoustic pace');
  cleaned = cleaned.replace(/\b\d+\s*beats?\s+per\s+minute\b/gi, 'calm pacing');
  cleaned = cleaned.replace(/\bbpm\b/gi, 'tempo');

  // 2. Transform Musical keys & harmony jargon into listener experience
  cleaned = cleaned.replace(
    /\bthe\s+music\s+uses\s+[A-G](?:\s*(?:major|minor|maj|min))?\s+and\s+open\s+fifths\b/gi,
    'Warm, open harmonies create a spacious and peaceful atmosphere'
  );
  cleaned = cleaned.replace(/\b(?:in\s+the\s+)?key\s+of\s+[A-G](?:\s*(?:major|minor|maj|min|#|b))?\b/gi, 'warm harmonic resonances');
  cleaned = cleaned.replace(/\b[A-G]\s+(?:major|minor)\s+key\b/gi, 'soothing acoustic harmonies');
  cleaned = cleaned.replace(/\bopen\s+fifths\b/gi, 'open, resonant intervals');
  cleaned = cleaned.replace(/\bkey\s+signature\b/gi, 'harmonic atmosphere');

  // 3. Transform Intensity & score jargon
  cleaned = cleaned.replace(
    /\bminimalist\s+score\s+\d+\s+and\s+musical\s+activity\s+\d+\b/gi,
    'The sparse piano leaves generous space for quiet reflection'
  );
  cleaned = cleaned.replace(/\bstyle\s+intensity(?:\s*score)?(?:\s*:\s*|\s+)\d+/gi, 'gentle ambient presence');
  cleaned = cleaned.replace(
    /\b(?:ambient|minimalist|meditative|sleep[- ]friendly|emotional|cinematic|musical\s+activity)\s+(?:score|intensity)\b/gi,
    'soothing musical depth'
  );
  cleaned = cleaned.replace(/\bactivity\s+score\b/gi, 'peaceful movement');
  cleaned = cleaned.replace(/\bnote\s+density\b/gi, 'melodic spacing');

  // 4. Transform 25-track & technical metadata mentions
  cleaned = cleaned.replace(/\b25[\s-]*track\s+collection\b/gi, 'peaceful piano soundscape');
  cleaned = cleaned.replace(/\b25[\s-]*track\s+album\b/gi, 'peaceful piano soundscape');
  cleaned = cleaned.replace(/\b25[\s-]*track\s+journey\b/gi, 'calming musical experience');
  cleaned = cleaned.replace(/\ball\s+25\s+tracks?\b/gi, 'the entire soundscape');
  cleaned = cleaned.replace(/\bthese\s+25\s+tracks?\b/gi, 'these melodies');
  cleaned = cleaned.replace(/\b25[\s-]*piano\s+tracks?\b/gi, 'peaceful piano music');
  cleaned = cleaned.replace(/\b25[\s-]*tracks?\b/gi, 'soothing piano music');
  cleaned = cleaned.replace(/\b25\s+track\b/gi, 'soothing piano music');
  cleaned = cleaned.replace(/\b25[\s-]*songs?\b/gi, 'gentle piano melodies');
  cleaned = cleaned.replace(/\b25[\s-]*pieces?\b/gi, 'acoustic melodies');
  cleaned = cleaned.replace(/\b25[\s-]*compositions?\b/gi, 'harmonious melodies');
  cleaned = cleaned.replace(/\b25[\s-]*style\s+prompts?\b/gi, 'musical arrangements');
  cleaned = cleaned.replace(/\btwenty[- ]five\s+distinct\s+piano\s+compositions\b/gi, 'distinct acoustic piano melodies');
  cleaned = cleaned.replace(/\btwenty[- ]five\s+(?:tracks?|songs?|pieces?|compositions?)\b/gi, 'soothing melodies');
  cleaned = cleaned.replace(/\b20[\s-]*track\s+collection\b/gi, 'peaceful piano soundscape');
  cleaned = cleaned.replace(/\b20[\s-]*track\s+album\b/gi, 'peaceful piano soundscape');
  cleaned = cleaned.replace(/\b20[\s-]*track\s+journey\b/gi, 'calming musical experience');
  cleaned = cleaned.replace(/\ball\s+20\s+tracks?\b/gi, 'the entire soundscape');
  cleaned = cleaned.replace(/\bthese\s+20\s+tracks?\b/gi, 'these melodies');
  cleaned = cleaned.replace(/\b20[\s-]*piano\s+tracks?\b/gi, 'peaceful piano music');
  cleaned = cleaned.replace(/\b20[\s-]*tracks?\b/gi, 'soothing piano music');
  cleaned = cleaned.replace(/\b20\s+track\b/gi, 'soothing piano music');
  cleaned = cleaned.replace(/\b20[\s-]*songs?\b/gi, 'gentle piano melodies');
  cleaned = cleaned.replace(/\b20[\s-]*pieces?\b/gi, 'acoustic melodies');
  cleaned = cleaned.replace(/\b20[\s-]*compositions?\b/gi, 'harmonious melodies');
  cleaned = cleaned.replace(/\b20[\s-]*style\s+prompts?\b/gi, 'musical arrangements');
  cleaned = cleaned.replace(/\btwenty\s+(?:tracks?|songs?|pieces?|compositions?)\b/gi, 'soothing melodies');
  cleaned = cleaned.replace(/\bstyle\s+prompt\s*#?\s*\d+\b/gi, 'piano passage');
  cleaned = cleaned.replace(/\btrack\s*#?\s*\d+\b/gi, 'melody');
  cleaned = cleaned.replace(/\bprompt\s*#?\s*\d+\b/gi, 'passage');

  // 5. Transform Album & Collection catalog language into natural single-video copy
  cleaned = cleaned.replace(/\bthis\s+instrumental\s+album\s+collection\b/gi, 'this peaceful piano experience');
  cleaned = cleaned.replace(/\binstrumental\s+album\s+collection\b/gi, 'peaceful piano soundscape');
  cleaned = cleaned.replace(/\bthis\s+comprehensive\s+album\b/gi, 'this peaceful soundscape');
  cleaned = cleaned.replace(/\bthis\s+long[- ]form\s+album\b/gi, 'this continuous soundscape');
  cleaned = cleaned.replace(/\bthis\s+peaceful\s+album\b/gi, 'this peaceful piano experience');
  cleaned = cleaned.replace(/\bthis\s+instrumental\s+album\b/gi, 'this relaxing soundscape');
  cleaned = cleaned.replace(/\binstrumental\s+album\b/gi, 'peaceful piano experience');
  cleaned = cleaned.replace(/\bmusic\s+collection\b/gi, 'calming soundscape');
  cleaned = cleaned.replace(/\btrack\s+collection\b/gi, 'peaceful music');
  cleaned = cleaned.replace(/\balbum\s+collection\b/gi, 'peaceful soundscape');
  cleaned = cleaned.replace(/\bacross\s+the\s+collection\b/gi, 'throughout this soundscape');
  cleaned = cleaned.replace(/\bacross\s+the\s+album\b/gi, 'throughout this soundscape');
  cleaned = cleaned.replace(/\bthroughout\s+the\s+album\b/gi, 'throughout this peaceful experience');
  cleaned = cleaned.replace(/\bthroughout\s+the\s+collection\b/gi, 'throughout this relaxing soundscape');
  cleaned = cleaned.replace(/\bthe\s+entire\s+collection\b/gi, 'the entire soundscape');
  cleaned = cleaned.replace(/\bthis\s+entire\s+collection\b/gi, 'this entire soundscape');
  cleaned = cleaned.replace(/\bthe\s+entire\s+album\b/gi, 'this entire soundscape');
  cleaned = cleaned.replace(/\bthis\s+album\b/gi, 'this music');
  cleaned = cleaned.replace(/\bthe\s+album\b/gi, 'the music');
  cleaned = cleaned.replace(/\ban\s+album\b/gi, 'a peaceful soundscape');
  cleaned = cleaned.replace(/\bthis\s+collection\b/gi, 'this listening experience');
  cleaned = cleaned.replace(/\bthe\s+collection\b/gi, 'this peaceful music');
  cleaned = cleaned.replace(/\beach\s+of\s+the\s+compositions\b/gi, 'each gentle melody');
  cleaned = cleaned.replace(/\beach\s+composition\b/gi, 'each gentle melody');
  cleaned = cleaned.replace(/\beach\s+track\b/gi, 'each peaceful moment');
  cleaned = cleaned.replace(/\bthese\s+compositions\b/gi, 'these gentle melodies');
  cleaned = cleaned.replace(/\bthese\s+tracks\b/gi, 'these melodies');
  cleaned = cleaned.replace(/\bindividual\s+tracks\b/gi, 'peaceful moments');
  cleaned = cleaned.replace(/\btracklist\b/gi, 'music');

  // Purge any remaining stray "album" or "collection" word occurrences
  cleaned = cleaned.replace(/\balbums?\b/gi, 'music');
  cleaned = cleaned.replace(/\bcollections?\b/gi, 'soundscape');

  return cleaned;
}

export const sanitize25TrackMentions = sanitizeConsumerFacingDescription;

/**
 * Builds a pristine, 100% compliant 6-paragraph consumer-facing YouTube description
 * with ZERO technical metadata and ZERO album/collection language (~600–750 words).
 */
export function regenerateDescriptionOnly(context?: YoutubeSeoValidationContext): string {
  const pPiano = context?.dominantPiano || 'Felt Piano';
  const pMood = context?.dominantMood || 'Peaceful';
  const pCategory = context?.dominantCategory || 'Deep Relaxation';

  const p1 = `Welcome to this peaceful piano soundscape, an immersive acoustic experience thoughtfully created to offer a sanctuary of stillness, emotional balance, and restorative calm. This gentle piano music unites soothing acoustic harmonies, crafted with deliberate negative space, tender phrasing, and an organic aesthetic. Rather than demanding active focus, the music unfolds as a soothing background atmosphere designed to slow the rapid pace of daily life, steady the breath, and establish a tranquil haven within your personal space. From the very first gentle chord to the final lingering resonance, this peaceful piano experience serves as a dependable refuge for anyone seeking calming music, deep mental quietude, and a comforting shelter from digital overstimulation.`;

  const p2 = `At the heart of this soundscape lies the tender acoustic warmth of ${pPiano.toLowerCase()} instrumentation, characterized by intimate felt hammers, delicate mechanical nuances, and spacious pedaling that emphasizes resonance over speed. Flowing at a slow, unhurried pace, the gentle pacing leaves plenty of space between each piano phrase. The melodic progressions are intentionally minimalist, avoiding jarring dynamic shifts, sudden volume spikes, or intense crescendos. Each phrase is granted ample room to breathe, allowing the natural acoustic decay of each note to drift softly into the surrounding silence. The overarching character blends subtle ${pMood.toLowerCase()} sensibilities with soothing harmonic warmth, creating an ambient piano atmosphere that feels personal, tender, and deeply comforting throughout every single moment.`;

  const p3 = `This peaceful piano music is created specifically to complement the quietest, most contemplative moments of your daily rhythm. Many listeners turn to this calming music during evening wind-down rituals to ease the transition into deep sleep, while others utilize its quiet acoustic character for mindfulness meditation, reflective journaling, or gentle morning stretching. The unobtrusive nature of the soft piano melodies also makes it an exceptional companion for deep work, immersive reading, creative writing, and quiet academic study, as it masks distracting background noise without interrupting cognitive focus. Whatever your personal sanctuary requires—whether unwinding from a demanding day, soothing restless thoughts, or simply cultivating a serene atmosphere at home—this music offers a dependable space for ${pCategory.toLowerCase()}.`;

  const p4 = `Complementing the delicate acoustic piano is the organic accompaniment of an authentic Bamboo Water Sound, interwoven throughout the music with natural acoustic balance. The cyclical, rhythmic pouring and gentle resonant knock of water moving through natural bamboo wood creates a grounded ambient presence that transports the listener into a quiet garden or forest retreat. Far from an artificial novelty, this soft flowing water and gentle bamboo water ambience interacts harmoniously with the piano frequencies, providing an organic natural white-noise blanket that gently washes away room echoes and intrusive background sounds. The soothing synergy of piano and water sounds enriches the entire auditory environment, creating a natural water atmosphere that feels timeless, grounded, and profoundly peaceful.`;

  const p5 = `Arranged specifically for extended, uninterrupted listening, this continuous musical flow is structured to ensure effortless transitions and absolute acoustic consistency from beginning to end. With harmonious acoustics, matching dynamic levels, and compatible reverberant spaces, you will never be startled by sudden volume spikes or abrupt stylistic changes. You can press play and let this soothing soundscape stream continuously in the background during long sleep sessions, extended reading afternoons, or all-night relaxation routines without ever needing to adjust your volume or skip forward. It is a seamless, peaceful haven designed to accompany you through hours of undisturbed quietude.`;

  const p6 = `We invite you to make yourself comfortable, dim the lights, and let this peaceful sanctuary surround your environment. Take a slow, measured breath in, soften your shoulders, and allow the gentle combination of acoustic piano harmonies and peaceful water ambience to guide you into a state of quiet equilibrium. Thank you for listening and sharing this serene sonic space with us. If this tranquil music brought calm to your day or helped you find restful sleep, we hope it continues to serve as a beloved companion whenever you need quiet background music and pure relaxation.`;

  return [p1, p2, p3, p4, p5, p6].join('\n\n');
}

/**
 * Checks whether a description contains any forbidden technical metadata or catalog language.
 */
export function containsForbiddenSeoContent(description: string): boolean {
  for (const pattern of FORBIDDEN_TECHNICAL_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(description)) return true;
  }
  for (const pattern of FORBIDDEN_ALBUM_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(description)) return true;
  }
  return false;
}

/**
 * Validates and sanitizes YouTube Title & SEO content strictly per consumer-facing specifications.
 */
export function validateAndSanitizeYoutubeSeo(
  raw: any,
  fallbackContext?: YoutubeSeoValidationContext
): YoutubeSeoValidationResult {
  const errors: string[] = [];

  if (!raw || typeof raw !== 'object') {
    return {
      isValid: false,
      errors: ['Output bukan JSON object yang valid.'],
    };
  }

  // 1. Title Validation & Suffix Handling
  let rawTitle = typeof raw.title === 'string' ? raw.title.trim() : '';
  rawTitle = rawTitle.replace(/^["']|["']$/g, '').trim();

  let baseTitle = cleanCoreTitle(rawTitle);

  if (!baseTitle) {
    errors.push('Title YouTube tidak boleh kosong.');
  } else if (baseTitle.length < 8 || baseTitle.length > 140) {
    errors.push(`Title harus 8–140 karakter (saat ini ${baseTitle.length}).`);
  }

  // Check if title is meaningfully different from previous title
  if (fallbackContext?.previousTitle && baseTitle) {
    if (!isTitleMeaningfullyDifferent(baseTitle, fallbackContext.previousTitle)) {
      errors.push('Title baru tidak boleh identik atau hanya menukar sinonim sederhana dari title sebelumnya.');
    }
  }

  // Check ALL CAPS
  const lettersOnly = baseTitle.replace(/[^a-zA-Z]/g, '');
  if (lettersOnly.length > 5 && lettersOnly === lettersOnly.toUpperCase()) {
    baseTitle = baseTitle
      .toLowerCase()
      .split(' ')
      .map((w) => (w.length > 2 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
      .join(' ');
  }

  // Mandate: Final title must be baseTitle + " + Bamboo Water Sound"
  const finalTitle = `${baseTitle}${BAMBOO_WATER_SUFFIX}`;

  // Ensure suffix appears only ONCE
  const suffixMatches = finalTitle.match(/\+\s*Bamboo\s+Water\s+Sound/gi);
  if (suffixMatches && suffixMatches.length > 1) {
    errors.push('Suffix "+ Bamboo Water Sound" terdeteksi duplikat.');
  }

  // 2. Description Validation (500–1,000 WORDS, TARGET 600–750 WORDS)
  let description = typeof raw.description === 'string' ? raw.description.trim() : '';
  if (!description) {
    errors.push('Description YouTube tidak boleh kosong.');
  }

  // Remove any prohibited keyword lists or SEO dumps
  description = description.replace(/(?:SEO\s+)?Keywords\s*:.*$/gim, '').trim();
  description = description.replace(/Search\s+Keywords\s*:.*$/gim, '').trim();

  // CONSUMER-FACING SANITIZATION:
  // Clean all technical metadata (BPM, keys, scores, 20-tracks) and album catalog words
  description = sanitizeConsumerFacingDescription(description);

  if (containsForbiddenSeoContent(description)) {
    errors.push('Description mengandung istilah teknis atau katalog terlarang.');
  }

  // Medical claim check & neutralization
  for (const pattern of MEDICAL_CLAIM_PATTERNS) {
    if (pattern.test(description)) {
      description = description.replace(pattern, 'supports peaceful calm and deep relaxation');
    }
  }

  // Ensure bamboo water sound is mentioned naturally
  if (!/bamboo\s+water\s+sound/i.test(description)) {
    const paragraphs = description.split(/\n\s*\n/);
    const naturalMention =
      'Throughout this soundscape, the soft acoustic piano melodies are naturally interwoven with the organic, gentle rhythm of a Bamboo Water Sound, creating a peaceful water ambience that grounds the listening experience.';
    if (paragraphs.length >= 2) {
      paragraphs.splice(paragraphs.length - 1, 0, naturalMention);
      description = paragraphs.join('\n\n');
    } else {
      description += `\n\n${naturalMention}`;
    }
  }

  // Check and enforce word count limits: 500 - 1,000 words (Target 600 - 750 words)
  let words = description.split(/\s+/).filter(Boolean);

  // If words > 1000, truncate cleanly to under 1000 words at a sentence boundary if close
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

  if (words.length < 500) {
    errors.push(`Description kurang dari 500 kata (${words.length} kata, minimum 500 kata, target sekitar 600–750 kata).`);
  } else if (words.length > 1000) {
    errors.push(`Description melebihi 1.000 kata (${words.length} kata, maksimum 1.000 kata).`);
  }

  // 3. Hashtags Validation (MINIMUM 5, MAXIMUM 15, TARGET 8–15)
  let rawHashtags: any[] = Array.isArray(raw.hashtags) ? raw.hashtags : [];
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
    if (!seenHashtags.has(lower) && clean.length > 1) {
      seenHashtags.add(lower);
      hashtags.push(clean);
    }
  }

  const defaultHashtagPool = [
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
    '#InstrumentalMusic',
  ];

  for (const defTag of defaultHashtagPool) {
    if (hashtags.length >= 12) break;
    if (!seenHashtags.has(defTag.toLowerCase())) {
      seenHashtags.add(defTag.toLowerCase());
      hashtags.push(defTag);
    }
  }

  if (hashtags.length > 15) {
    hashtags = hashtags.slice(0, 15);
  }

  // Hashtag repetition is intentionally non-blocking. The generator may reuse relevant hashtags across batches.
  if (hashtags.length < 5) {
    // This should normally be impossible because the default pool fills missing values.
    // Keep a minimal safe fallback without failing the SEO regeneration.
    hashtags = [...hashtags, '#PianoMusic', '#RelaxingMusic', '#AmbientPiano', '#SleepMusic', '#BambooWaterSound']
      .filter((v, i, a) => a.findIndex(x => x.toLowerCase() === v.toLowerCase()) === i)
      .slice(0, 15);
  }

  // 4. Tags Validation
  let rawTags: any[] = Array.isArray(raw.tags) ? raw.tags : [];
  let tags: string[] = [];
  const seenTags = new Set<string>();

  for (const t of rawTags) {
    if (typeof t !== 'string') continue;
    const clean = t.trim().toLowerCase().replace(/^["']|["']$/g, '');
    if (clean && !seenTags.has(clean)) {
      seenTags.add(clean);
      tags.push(clean);
    }
  }

  const defaultTagPool = [
    'relaxing piano music',
    'peaceful piano music',
    'sleep piano music',
    'piano music for sleep',
    'bamboo water sound',
    'piano and water sounds',
    'calming piano',
    'meditation piano',
    'stress relief music',
    'deep sleep music',
    'background piano music',
    'peaceful sleep music',
    'soft piano music',
    'soothing piano music',
    'sleep aid piano',
    'piano for studying',
    'instrumental piano relaxation',
    'gentle piano melodies',
    'healing piano music',
    'zen piano ambient',
  ];

  for (const defTag of defaultTagPool) {
    if (tags.length >= 25) break;
    if (!seenTags.has(defTag.toLowerCase())) {
      seenTags.add(defTag.toLowerCase());
      tags.push(defTag);
    }
  }

  if (tags.length > 25) {
    tags = tags.slice(0, 25);
  }

  // Tag repetition is intentionally non-blocking. Relevant repeated tags are acceptable.
  if (tags.length < 15) {
    const emergencyTags = [
      'piano music', 'relaxing piano music', 'ambient piano', 'sleep piano',
      'meditation piano', 'peaceful piano', 'bamboo water sound', 'calm piano',
      'background piano music', 'soft piano music', 'deep sleep music',
      'study piano music', 'relaxation music', 'instrumental piano', 'soothing piano'
    ];
    for (const tag of emergencyTags) {
      if (tags.length >= 15) break;
      if (!tags.includes(tag)) tags.push(tag);
    }
  }

  const rawThumbnailText = typeof raw?.thumbnailText === 'string'
    ? raw.thumbnailText.trim()
    : (typeof raw?.thumbnail_text === 'string' ? raw.thumbnail_text.trim() : '');

  const sanitizedContent: YoutubeContent = {
    title: finalTitle,
    thumbnailText: rawThumbnailText || 'CALM PIANO\nDEEP SLEEP',
    description,
    hashtags,
    tags,
    generatedAt: Date.now(),
  };

  return {
    isValid: errors.length === 0,
    sanitizedContent,
    errors,
  };
}
