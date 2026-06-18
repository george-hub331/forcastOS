import type {
  MarketInfo,
  MarketPrice,
  MarketProvider,
  MarketResolution,
} from "./provider.js";

interface GammaMarket {
  id?: string;
  conditionId?: string;
  question?: string;
  description?: string;
  slug?: string;
  closed?: boolean;
  active?: boolean;
  outcomePrices?: string;
  outcomes?: string;
  umaResolutionStatus?: string;
  resolvedBy?: string;
}

const GAMMA_BASE = "https://gamma-api.polymarket.com";

function parseRef(ref: string): { slug?: string; conditionId?: string; id?: string } {
  const trimmed = ref.trim();

  const urlMatch = trimmed.match(
    /polymarket\.com\/(?:event|market)\/([a-zA-Z0-9-]+)/i,
  );
  if (urlMatch) {
    return { slug: urlMatch[1] };
  }

  if (trimmed.startsWith("0x") && trimmed.length > 10) {
    return { conditionId: trimmed };
  }

  if (/^\d+$/.test(trimmed)) {
    return { id: trimmed };
  }

  return { slug: trimmed };
}

async function fetchMarkets(params: Record<string, string>): Promise<GammaMarket[]> {
  const qs = new URLSearchParams(params);
  const res = await fetch(`${GAMMA_BASE}/markets?${qs}`);
  if (!res.ok) {
    throw new Error(`Polymarket API error: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as GammaMarket | GammaMarket[];
  return Array.isArray(data) ? data : [data];
}

function normalizeMarket(m: GammaMarket): MarketInfo {
  const id = m.conditionId ?? m.id ?? m.slug ?? "unknown";
  return {
    id: String(id),
    question: m.question ?? "Unknown market",
    resolutionCriteria: m.description ?? m.question ?? "No resolution criteria available.",
    slug: m.slug,
  };
}

function parsePrices(m: GammaMarket): MarketPrice {
  let yes = 0.5;
  let no = 0.5;
  try {
    const prices = JSON.parse(m.outcomePrices ?? "[0.5,0.5]") as number[];
    const outcomes = JSON.parse(m.outcomes ?? '["Yes","No"]') as string[];
    const yesIdx = outcomes.findIndex((o) => o.toLowerCase() === "yes");
    const noIdx = outcomes.findIndex((o) => o.toLowerCase() === "no");
    if (yesIdx >= 0 && prices[yesIdx] != null) yes = Number(prices[yesIdx]);
    if (noIdx >= 0 && prices[noIdx] != null) no = Number(prices[noIdx]);
    if (yesIdx < 0 && prices[0] != null) yes = Number(prices[0]);
    if (noIdx < 0 && prices[1] != null) no = Number(prices[1]);
  } catch {}
  return { yes, no, ts: Date.now() };
}

function parseResolution(m: GammaMarket): MarketResolution {
  if (!m.closed) {
    return { resolved: false };
  }

  const status = (m.umaResolutionStatus ?? "").toLowerCase();
  if (status.includes("resolved") || m.resolvedBy) {
    try {
      const prices = JSON.parse(m.outcomePrices ?? "[]") as number[];
      const outcomes = JSON.parse(m.outcomes ?? "[]") as string[];
      const winnerIdx = prices.findIndex((p) => Number(p) >= 0.99);
      if (winnerIdx >= 0) {
        const winner = outcomes[winnerIdx]?.toLowerCase();
        if (winner === "yes") return { resolved: true, outcome: "YES" };
        if (winner === "no") return { resolved: true, outcome: "NO" };
      }
    } catch {}
    return { resolved: true };
  }

  return { resolved: m.closed === true };
}

export const polymarketProvider: MarketProvider = {
  async getMarket(ref: string): Promise<MarketInfo> {
    const parsed = parseRef(ref);
    let markets: GammaMarket[] = [];

    if (parsed.conditionId) {
      markets = await fetchMarkets({ condition_id: parsed.conditionId });
    } else if (parsed.id) {
      markets = await fetchMarkets({ id: parsed.id });
    } else if (parsed.slug) {
      markets = await fetchMarkets({ slug: parsed.slug });
    }

    if (markets.length === 0) {
      throw new Error(`Market not found: ${ref}`);
    }

    return normalizeMarket(markets[0]);
  },

  async getPrice(id: string): Promise<MarketPrice> {
    const markets = await fetchMarkets({ condition_id: id });
    if (markets.length === 0) {
      const byId = await fetchMarkets({ id });
      if (byId.length === 0) throw new Error(`Market not found: ${id}`);
      return parsePrices(byId[0]);
    }
    return parsePrices(markets[0]);
  },

  async getResolution(id: string): Promise<MarketResolution> {
    const markets = await fetchMarkets({ condition_id: id });
    const m = markets[0] ?? (await fetchMarkets({ id }))[0];
    if (!m) throw new Error(`Market not found: ${id}`);
    return parseResolution(m);
  },
};
