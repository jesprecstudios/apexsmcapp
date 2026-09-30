/**
 * Extracts the first complete JSON object from a model response.
 *
 * Gemini with responseMimeType: "application/json" usually returns clean JSON,
 * but it can still append prose, emit a second object, or wrap the payload in
 * a ```json fence. A bare JSON.parse throws on all of those, which previously
 * surfaced to the user as a broken analysis tab.
 *
 * Returns undefined when no decodable object is present.
 */
export function extractJsonObject(text: string): unknown | undefined {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return undefined;

  // 1. Fast path: the whole response is one object.
  const direct = tryParse(trimmed);
  if (direct !== undefined) return direct;

  // 2. Strip a markdown fence, in case the model wrapped its answer.
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    const fromFence = tryParse(fenced[1].trim());
    if (fromFence !== undefined) return fromFence;
  }

  // 3. Scan for the first balanced {...} block, respecting string literals and
  //    escapes so a brace inside a string does not end the object early.
  const start = trimmed.indexOf("{");
  if (start === -1) return undefined;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < trimmed.length; i++) {
    const ch = trimmed[i];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return tryParse(trimmed.slice(start, i + 1));
      }
    }
  }

  return undefined;
}

function tryParse(candidate: string): unknown | undefined {
  try {
    const parsed = JSON.parse(candidate);
    // Arrays and null are technically objects, but neither is a valid analysis
    // payload, so reject them here rather than letting the schema fail later.
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return undefined;
    }
    return parsed;
  } catch {
    return undefined;
  }
}
