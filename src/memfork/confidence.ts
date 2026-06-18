const CONFIDENCE_RE = /confidence:\s*(\d+(?:\.\d+)?)\s*%/i;

export function parseConfidence(text: string): number | null {
  const match = text.match(CONFIDENCE_RE);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? Math.round(n) : null;
}

/** First confidence value found in recall result order. */
export function firstConfidence(facts: string[]): number | null {
  for (const text of facts) {
    const n = parseConfidence(text);
    if (n != null) return n;
  }
  return null;
}

/** @deprecated Use session-stored confidence; fallback only. */
export function latestConfidence(facts: string[]): number | null {
  return firstConfidence(facts);
}

export function formatConfidence(confidence: number): string {
  return `Confidence: ${Math.round(confidence)}%`;
}
