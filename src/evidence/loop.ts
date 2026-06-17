import { polymarketProvider } from "../markets/polymarket.js";
import { getAllMarkets, updateMarket } from "../store/sessions.js";
import { processPriceTick } from "./process.js";
import type { EvidenceNotifyFn } from "./types.js";

const pollTimers = new Map<string, ReturnType<typeof setInterval>>();

export function startEvidencePoller(_notify: EvidenceNotifyFn): void {
  const intervalMs = Number(process.env.EVIDENCE_POLL_MS ?? 180_000);

  setInterval(async () => {
    try {
      const markets = getAllMarkets().filter((m) => !m.resolved);
      for (const market of markets) {
        await pollMarket(market);
      }
    } catch (err) {
      console.error("[poller] error:", err);
    }
  }, intervalMs);

  console.log(`[poller] started (interval ${intervalMs}ms)`);
}

export function registerMarketPoller(market: { chatId: number; id: string }): void {
  const key = `${market.chatId}:${market.id}`;
  if (pollTimers.has(key)) return;

  const intervalMs = Number(process.env.EVIDENCE_POLL_MS ?? 180_000);
  const timer = setInterval(() => {
    const m = getAllMarkets().find(
      (x) => x.chatId === market.chatId && x.id === market.id && !x.resolved,
    );
    if (m) pollMarket(m).catch((err) => console.error(`[poller] ${key}:`, err));
  }, intervalMs);
  pollTimers.set(key, timer);
}

async function pollMarket(market: import("../store/sessions.js").TrackedMarket): Promise<void> {
  const price = await polymarketProvider.getPrice(market.id);
  const prevYes = market.lastPrice?.yes;
  await processPriceTick(market, price.yes, price.no, prevYes);
  updateMarket(market.id, market.chatId, { lastPrice: price });
}
