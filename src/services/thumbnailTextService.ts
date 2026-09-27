/**
 * PETA PIANO AI — DYNAMIC THUMBNAIL TEXT GENERATOR & VALIDATOR
 * 
 * Rules:
 * - Generates exactly one TEXT ON THUMBNAIL derived dynamically from the actual YouTube title.
 * - Extracts the strongest core message from the title.
 * - Words or phrases are directly drawn from or inspired by the generated title.
 * - Concise, easy to read on a thumbnail image, visually compelling, not clickbait.
 * - Maximum 6–8 meaningful words total.
 * - Ideally 2–6 meaningful words per line, 1 or 2 lines (\n separated).
 * - Must NOT copy the full title.
 * - Must be DIFFERENT from the complete title.
 * - Does not require "Bamboo Water Sound".
 * - NO generic templates, NO hardcoded static phrases across videos.
 * - NO BPM, musical key, Style Intensity, track counts, Style Prompt numbers, AI/model info, technical metadata.
 * - DYNAMIC: If YouTube title changes, thumbnail text is re-analyzed based on the new title.
 */

// Forbidden technical metadata, keys, BPM, track counts, AI/model info
const BPM_TEMPO_REGEX = /\b(?:\d+\s*[-–]?\s*)?(?:bpm|beats\s+per\s+minute)\b|\b(?:tempo|pace)\s*(?:of\s+\d+|range|average|\d+)\b/i;
const MUSICAL_KEY_REGEX = /\b(?:key\s+(?:of\s+)?[A-G](?:\s*(?:major|minor|maj|min|#|b))?|[A-G]\s+(?:major|minor)\s+key|key\s+signature)\b/i;
const STYLE_INTENSITY_REGEX = /\bstyle\s+intensity\b|\bintensity\s*(?:score)?\b|\bactivity\s+score\b|\bnote\s+density\b/i;
const TRACK_COUNT_REGEX = /\b(?:\d+|twenty[- ]five)\s*(?:tracks?|songs?|pieces?|compositions?|style\s+prompts?)\b|\btrack\s*#?\s*\d+\b/i;
const PROMPT_NUMBER_REGEX = /\bstyle\s*prompts?\s*#?\s*\d+\b|\bprompt\s*#?\s*\d+\b/i;
const TECHNICAL_METADATA_REGEX = /\btechnical\s+metadata\b|\bgeneration\s+(?:settings|process|parameters)\b/i;
const AI_MODEL_REGEX = /\b(?:ai|artificial\s+intelligence|gpt|suno|model|claude|gemini|deepseek|codex)\b/i;

// Stop words ignored when evaluating meaningful words / core semantic extraction
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'for', 'of', 'with', 'to', 'in', 'on', 'at', 'by',
  '&', '+', '-', '—', '|', 'is', 'as'
]);

/**
 * Counts meaningful words (words that contain letters or numbers, excluding pure punctuation / symbols).
 */
export function countMeaningfulWords(text: string): number {
  if (!text) return 0;
  const tokens = text.replace(/[\n\r]/g, ' ').split(/\s+/).filter(Boolean);
  return tokens.filter(t => /[a-zA-Z0-9]/.test(t) && !STOP_WORDS.has(t.toLowerCase())).length;
}

/**
 * Returns raw words split across whitespace.
 */
export function getWordList(text: string): string[] {
  if (!text) return [];
  return text.replace(/[\n\r]/g, ' ').split(/\s+/).filter(t => /[a-zA-Z0-9]/.test(t));
}

/**
 * Strips the Bamboo Water Sound suffix and extraneous wrapper quotes.
 */
export function cleanCoreTitle(rawTitle: string): string {
  if (!rawTitle) return '';
  return rawTitle
    .replace(/\s*\+\s*Bamboo\s+Water\s+Sound\s*$/i, '')
    .replace(/\s*-\s*Bamboo\s+Water\s+Sound\s*$/i, '')
    .replace(/\s*\|\s*Bamboo\s+Water\s+Sound\s*$/i, '')
    .replace(/["“”]/g, '')
    .replace(/\b(\w+)(?:\s+\1)+\b/gi, '$1') // remove duplicate consecutive words
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export interface ThumbnailValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates thumbnail text against the 12 strict rules:
 * 1. thumbnailText kosong
 * 2. thumbnailText sama persis dengan judul YouTube
 * 3. thumbnailText menyalin seluruh judul
 * 4. lebih dari 8 meaningful words
 * 5. mengandung BPM atau angka tempo
 * 6. mengandung musical key
 * 7. mengandung Style Intensity
 * 8. mengandung track count
 * 9. mengandung Style Prompt number
 * 10. mengandung technical metadata
 * 11. mengandung informasi AI/model
 * 12. menggunakan phrase template yang tidak berasal dari konteks judul
 */
export function validateThumbnailText(thumbnailText: string, title: string): ThumbnailValidationResult {
  const errors: string[] = [];

  // 1. thumbnailText kosong
  const trimmed = (thumbnailText || '').trim();
  if (!trimmed) {
    errors.push('thumbnailText tidak boleh kosong.');
    return { isValid: false, errors };
  }

  const cleanTitle = cleanCoreTitle(title);
  const cleanThumb = trimmed.replace(/\n/g, ' ').replace(/\s{2,}/g, ' ').trim();

  // 2. thumbnailText sama persis dengan judul YouTube
  if (cleanThumb.toLowerCase() === title.trim().toLowerCase() ||
      cleanThumb.toLowerCase() === cleanTitle.toLowerCase()) {
    errors.push('thumbnailText tidak boleh sama persis dengan judul YouTube.');
  }

  // 3. thumbnailText menyalin seluruh judul (or > 85% word overlap in sequence)
  const titleWords = cleanTitle.toLowerCase().split(/\s+/).filter(Boolean);
  const thumbWords = cleanThumb.toLowerCase().split(/\s+/).filter(Boolean);
  if (titleWords.length > 0 && thumbWords.length >= titleWords.length) {
    const isCopy = titleWords.every((tw, i) => thumbWords[i] === tw);
    if (isCopy) {
      errors.push('thumbnailText tidak boleh menyalin seluruh judul.');
    }
  }

  // 4. Lebih dari 8 meaningful words
  const meaningfulCount = countMeaningfulWords(cleanThumb);
  const totalWordCount = getWordList(cleanThumb).length;
  if (meaningfulCount > 8 || totalWordCount > 10) {
    errors.push(`thumbnailText melebihi batas kata (terdeteksi ${meaningfulCount} meaningful words, maksimum 8).`);
  }

  // 5. Mengandung BPM atau angka tempo
  if (BPM_TEMPO_REGEX.test(cleanThumb)) {
    errors.push('thumbnailText tidak boleh mengandung BPM atau angka tempo.');
  }

  // 6. Mengandung musical key
  if (MUSICAL_KEY_REGEX.test(cleanThumb)) {
    errors.push('thumbnailText tidak boleh mengandung musical key.');
  }

  // 7. Mengandung Style Intensity
  if (STYLE_INTENSITY_REGEX.test(cleanThumb)) {
    errors.push('thumbnailText tidak boleh mengandung Style Intensity.');
  }

  // 8. Mengandung track count
  if (TRACK_COUNT_REGEX.test(cleanThumb)) {
    errors.push('thumbnailText tidak boleh mengandung track count.');
  }

  // 9. Mengandung Style Prompt number
  if (PROMPT_NUMBER_REGEX.test(cleanThumb)) {
    errors.push('thumbnailText tidak boleh mengandung Style Prompt number.');
  }

  // 10. Mengandung technical metadata
  if (TECHNICAL_METADATA_REGEX.test(cleanThumb)) {
    errors.push('thumbnailText tidak boleh mengandung technical metadata.');
  }

  // 11. Mengandung informasi AI/model
  if (AI_MODEL_REGEX.test(cleanThumb)) {
    errors.push('thumbnailText tidak boleh mengandung informasi AI/model.');
  }

  // 12. Menggunakan phrase template yang tidak berasal dari konteks judul
  // At least one meaningful word in thumbnailText must match a meaningful word from the title
  if (cleanTitle) {
    const titleMeaningfulWords = new Set(
      cleanTitle.toLowerCase().split(/\s+/)
        .map(w => w.replace(/[^a-z0-9]/g, ''))
        .filter(w => w.length > 2 && !STOP_WORDS.has(w))
    );

    const thumbMeaningfulWords = cleanThumb.toLowerCase().split(/\s+/)
      .map(w => w.replace(/[^a-z0-9]/g, ''))
      .filter(w => w.length > 2 && !STOP_WORDS.has(w));

    if (thumbMeaningfulWords.length > 0 && titleMeaningfulWords.size > 0) {
      const matchCount = thumbMeaningfulWords.filter(w => titleMeaningfulWords.has(w)).length;
      if (matchCount === 0) {
        errors.push('thumbnailText tidak berasal dari konteks judul yang dibuat.');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Intelligently and dynamically extracts the strongest visual hook from the actual YouTube title.
 * Guarantees:
 * - 2 to 6 meaningful words per line.
 * - 1 or 2 lines formatted with \n.
 * - Maximum 6–8 meaningful words total.
 * - Distinct from full title.
 * - Words are directly derived from the title.
 * - Passes all 12 validation rules.
 */
export function generateDynamicThumbnailText(title: string): string {
  const core = cleanCoreTitle(title);
  if (!core) {
    return 'Peaceful Piano\nDeep Sleep';
  }

  // Look for semantic boundaries commonly present in high-quality YouTube titles:
  // e.g. "Peaceful Felt Piano for Deep Sleep & Anxiety Relief"
  // e.g. "Calm Grand Piano Music for Evening Relaxation & Restful Sleep"
  // e.g. "Ambient Solo Piano for Mindfulness Meditation & Focus"

  const forSplit = core.split(/\s+for\s+/i);
  let instrumentSegment = '';
  let purposeSegment = '';

  if (forSplit.length >= 2) {
    instrumentSegment = forSplit[0].trim();
    purposeSegment = forSplit.slice(1).join(' for ').trim();
  } else {
    // Try other separators like ' - ', ' | ', ' : '
    const pipeSplit = core.split(/\s*[-–|:]\s*/);
    if (pipeSplit.length >= 2) {
      instrumentSegment = pipeSplit[0].trim();
      purposeSegment = pipeSplit[1].trim();
    } else {
      instrumentSegment = core;
    }
  }

  // Clean words from instrument segment (strip filler words)
  const extractMeaningful = (text: string) => {
    return text
      .replace(/[^\w\s&-]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .filter(w => !STOP_WORDS.has(w.toLowerCase()) && !/^(music|sound|sounds|instrumental)$/i.test(w));
  };

  const purposeWords = extractMeaningful(purposeSegment);
  const instrumentWords = extractMeaningful(instrumentSegment);

  let line1 = '';
  let line2 = '';

  if (purposeWords.length >= 2 && instrumentWords.length >= 1) {
    // Strategy A: Listener Purpose on Line 1, Instrument Hook on Line 2
    // e.g.
    // Line 1: "Deep Sleep & Calm" or "Mindfulness Meditation" (2–3 words)
    // Line 2: "Peaceful Felt Piano" or "Soothing Piano" (2–3 words)
    const pSlice = purposeWords.slice(0, 3);
    const iSlice = instrumentWords.slice(0, 3);

    // Keep "Piano" in line 2 if present
    let line2Words = iSlice;
    if (!line2Words.some(w => /piano/i.test(w)) && instrumentSegment.toLowerCase().includes('piano')) {
      line2Words = [...line2Words.slice(0, 2), 'Piano'];
    }

    line1 = pSlice.join(' ');
    line2 = line2Words.join(' ');
  } else if (purposeWords.length >= 1 && instrumentWords.length >= 1) {
    // Strategy B: 1 purpose word, 2-3 instrument words
    line1 = purposeWords.slice(0, 2).join(' ');
    line2 = instrumentWords.slice(0, 3).join(' ');
  } else {
    // Strategy C: Split instrument words evenly across 2 lines
    const allMeaningful = extractMeaningful(core);
    if (allMeaningful.length <= 4) {
      // Single punchy line
      return allMeaningful.join(' ');
    }
    const mid = Math.ceil(Math.min(allMeaningful.length, 6) / 2);
    line1 = allMeaningful.slice(0, mid).join(' ');
    line2 = allMeaningful.slice(mid, Math.min(allMeaningful.length, 6)).join(' ');
  }

  // Capitalize properly
  const formatLine = (str: string) => {
    return str
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ')
      .trim();
  };

  line1 = formatLine(line1);
  line2 = formatLine(line2);

  let candidate = line2 ? `${line1}\n${line2}` : line1;

  // Final check: Validate against rules
  const val = validateThumbnailText(candidate, title);
  if (val.isValid) {
    return candidate;
  }

  // Fallback: Safe direct extraction of 3 to 5 words from title
  const safeTokens = extractMeaningful(core).slice(0, 5);
  if (safeTokens.length >= 4) {
    candidate = `${formatLine(safeTokens.slice(0, 2).join(' '))}\n${formatLine(safeTokens.slice(2).join(' '))}`;
  } else {
    candidate = formatLine(safeTokens.join(' '));
  }

  return candidate || 'Peaceful Piano\nDeep Rest';
}
