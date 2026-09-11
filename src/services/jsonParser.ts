/**
 * PETA PIANO AI - JSON REPAIR & PARSER
 * Strictly follows the 10-step sequence specified in Section 5.
 */

export const INVALID_JSON = 'INVALID_JSON';
export type InvalidJsonSentinel = typeof INVALID_JSON;

export function parseModelJSON(rawText: string): Record<string, unknown> | InvalidJsonSentinel {
  if (!rawText || typeof rawText !== 'string') {
    return INVALID_JSON;
  }

  // 1. Trim text
  let text = rawText.trim();
  if (!text) {
    return INVALID_JSON;
  }

  // 2. Coba JSON.parse(text)
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Continue to step 3
  }

  // 3. Jika gagal, hapus ```json
  // 4. Hapus ```
  let cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();

  // 5. Coba JSON.parse kembali
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Continue to step 6
  }

  // 6. Jika gagal, cari karakter { pertama
  const firstBrace = cleaned.indexOf('{');
  // 7. Cari karakter } terakhir
  const lastBrace = cleaned.lastIndexOf('}');

  // 8. Ekstrak object
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const extracted = cleaned.substring(firstBrace, lastBrace + 1).trim();

    // 9. Coba JSON.parse kembali
    try {
      const parsed = JSON.parse(extracted);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // Optional minor cleanup: sanitize unescaped newlines or trailing commas if needed
      try {
        const sanitized = extracted
          .replace(/,\s*([}\]])/g, '$1') // remove trailing commas
          .replace(/[\u0000-\u001F]+/g, (match) => (match === '\n' || match === '\r' || match === '\t' ? match : ' '));
        const parsed2 = JSON.parse(sanitized);
        if (parsed2 && typeof parsed2 === 'object' && !Array.isArray(parsed2)) {
          return parsed2 as Record<string, unknown>;
        }
      } catch {
        // Fall through to step 10
      }
    }
  }

  // 10. Jika tetap gagal, return INVALID_JSON
  return INVALID_JSON;
}
