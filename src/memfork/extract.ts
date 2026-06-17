export function extractFactText(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as {
      delta?: { facts?: string[] };
      facts?: string[];
    };
    if (parsed.delta?.facts?.length) {
      return parsed.delta.facts.join("\n");
    }
    if (parsed.facts?.length) {
      return parsed.facts.join("\n");
    }
  } catch {
    // not JSON — return as-is
  }
  return raw;
}
