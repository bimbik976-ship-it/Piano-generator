/**
 * KIE RESPONSE PARSER - WAJIB
 * 
 * Extracts assistant text from KIE /codex/v1/responses.
 * NEVER assumes raw HTTP response is the style prompt.
 */

export function extractKieText(response: unknown): string {
  if (!response) {
    return '';
  }

  // Case 1: If response is already a string
  if (typeof response === 'string') {
    const trimmed = response.trim();
    // Check if it is an SSE formatted stream string
    if (trimmed.startsWith('data:') || trimmed.includes('\nevent:') || trimmed.includes('\ndata:')) {
      return parseSSEString(trimmed);
    }
    // Attempt parsing as JSON object in case string contains serialized response
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === 'object' && parsed !== null) {
        return extractFromObject(parsed);
      }
    } catch {
      // It's raw text
      return trimmed;
    }
    return trimmed;
  }

  // Case 2: Response is a parsed JSON object
  if (typeof response === 'object' && response !== null) {
    return extractFromObject(response as Record<string, unknown>);
  }

  return '';
}

/**
 * Parses KIE JSON response structure with priority:
 * 1. output[].content[].text OR output[].content[].output_text
 * 2. output[].output_text OR output[].text
 * 3. top-level output_text
 * 4. top-level text
 * 5. non-array output structure
 * 6. message / choices fallback
 */
function extractFromObject(obj: Record<string, unknown>): string {
  const collectedTexts: string[] = [];

  // Priority 1: Check response.output array
  const output = obj.output;
  if (Array.isArray(output)) {
    for (const item of output) {
      if (!item || typeof item !== 'object') continue;
      const itemRecord = item as Record<string, unknown>;

      // Check contents inside item
      if (Array.isArray(itemRecord.content)) {
        for (const c of itemRecord.content) {
          if (!c || typeof c !== 'object') continue;
          const cRecord = c as Record<string, unknown>;
          if (typeof cRecord.text === 'string' && cRecord.text) {
            collectedTexts.push(cRecord.text);
          } else if (typeof cRecord.output_text === 'string' && cRecord.output_text) {
            collectedTexts.push(cRecord.output_text);
          }
        }
      }

      // Check direct text or output_text on the output item itself
      if (typeof itemRecord.output_text === 'string' && itemRecord.output_text) {
        collectedTexts.push(itemRecord.output_text);
      } else if (typeof itemRecord.text === 'string' && itemRecord.text) {
        collectedTexts.push(itemRecord.text);
      }
    }
  }

  if (collectedTexts.length > 0) {
    return collectedTexts.join('');
  }

  // Priority 2: Check top-level output_text
  if (typeof obj.output_text === 'string' && obj.output_text) {
    return obj.output_text;
  }

  // Priority 3: Check top-level text or assistantText
  if (typeof obj.text === 'string' && obj.text) {
    return obj.text;
  }
  if (typeof obj.assistantText === 'string' && obj.assistantText) {
    return obj.assistantText;
  }

  // Priority 4: Non-array output object or output string
  if (typeof obj.output === 'string') {
    return obj.output;
  }
  if (obj.output && typeof obj.output === 'object' && !Array.isArray(obj.output)) {
    const outObj = obj.output as Record<string, unknown>;
    if (typeof outObj.output_text === 'string' && outObj.output_text) {
      return outObj.output_text;
    }
    if (typeof outObj.text === 'string' && outObj.text) {
      return outObj.text;
    }
    if (outObj.message && typeof outObj.message === 'object') {
      const msgObj = outObj.message as Record<string, unknown>;
      if (Array.isArray(msgObj.content)) {
        for (const c of msgObj.content) {
          if (c && typeof c === 'object') {
            const cRec = c as Record<string, unknown>;
            if (typeof cRec.text === 'string') {
              collectedTexts.push(cRec.text);
            } else if (typeof cRec.output_text === 'string') {
              collectedTexts.push(cRec.output_text);
            }
          }
        }
      } else if (typeof msgObj.content === 'string') {
        collectedTexts.push(msgObj.content);
      }
    } else if (Array.isArray(outObj.content)) {
      for (const c of outObj.content) {
        if (c && typeof c === 'object') {
          const cRec = c as Record<string, unknown>;
          if (typeof cRec.text === 'string') {
            collectedTexts.push(cRec.text);
          } else if (typeof cRec.output_text === 'string') {
            collectedTexts.push(cRec.output_text);
          }
        }
      }
    }
  }

  if (collectedTexts.length > 0) {
    return collectedTexts.join('');
  }

  // Priority 5: Direct message property
  if (obj.message && typeof obj.message === 'object') {
    const msgObj = obj.message as Record<string, unknown>;
    if (Array.isArray(msgObj.content)) {
      for (const c of msgObj.content) {
        if (c && typeof c === 'object') {
          const cRec = c as Record<string, unknown>;
          if (typeof cRec.text === 'string') {
            collectedTexts.push(cRec.text);
          } else if (typeof cRec.output_text === 'string') {
            collectedTexts.push(cRec.output_text);
          }
        }
      }
    } else if (typeof msgObj.content === 'string') {
      collectedTexts.push(msgObj.content);
    }
  }

  if (collectedTexts.length > 0) {
    return collectedTexts.join('');
  }

  // Fallback: Check choices array if OpenAI format is bridged
  if (Array.isArray(obj.choices) && obj.choices.length > 0) {
    const firstChoice = obj.choices[0] as Record<string, unknown>;
    if (firstChoice && typeof firstChoice === 'object') {
      const msg = firstChoice.message as Record<string, unknown> | undefined;
      if (msg && typeof msg.content === 'string') {
        return msg.content;
      }
      if (typeof firstChoice.text === 'string') {
        return firstChoice.text;
      }
    }
  }

  // Fallback: Check if obj is somehow already the generated output schema
  if (typeof obj.stylePrompt === 'string') {
    return JSON.stringify(obj);
  }

  return '';
}

/**
 * Parses SSE stream string event by event
 */
export function parseSSEString(sseText: string): string {
  const lines = sseText.split('\n');
  const textParts: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) continue;

    const dataPayload = trimmed.replace(/^data:\s*/, '');
    if (dataPayload === '[DONE]') continue;

    try {
      const parsedData = JSON.parse(dataPayload);
      const extracted = extractKieText(parsedData);
      if (extracted) {
        textParts.push(extracted);
      } else if (typeof parsedData.text === 'string') {
        textParts.push(parsedData.text);
      } else if (typeof parsedData.delta?.content === 'string') {
        textParts.push(parsedData.delta.content);
      }
    } catch {
      // Raw string payload on data line
      if (dataPayload && !dataPayload.startsWith('{')) {
        textParts.push(dataPayload);
      }
    }
  }

  return textParts.join('');
}
