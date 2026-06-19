import type { MemForksClient } from "@memfork/core";

const MIN_SPONSOR_TX_INTERVAL_MS = 6500;
const RATE_LIMIT_RETRY_MS = 61_000;

let lastSponsorTxAt = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function isSponsorRateLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  return lower.includes("429") || lower.includes("rate limit exceeded");
}

async function waitForPacing(): Promise<void> {
  const elapsed = Date.now() - lastSponsorTxAt;
  const wait = MIN_SPONSOR_TX_INTERVAL_MS - elapsed;
  if (wait > 0) await sleep(wait);
}

export async function pacedBranch(
  client: MemForksClient,
  name: string,
  opts: { from: string },
): Promise<string> {
  const attempt = async (): Promise<string> => {
    await waitForPacing();
    const digest = await client.branch(name, opts);
    lastSponsorTxAt = Date.now();
    return digest;
  };

  try {
    return await attempt();
  } catch (err) {
    if (isSponsorRateLimitError(err)) {
      await sleep(RATE_LIMIT_RETRY_MS);
      return attempt();
    }
    throw err;
  }
}
