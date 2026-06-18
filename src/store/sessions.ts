import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export interface TrackedMarket {
  id: string;
  question: string;
  chatId: number;
  yesHead: string;
  noHead: string;
  yesConfidence?: number;
  noConfidence?: number;
  createdAt: number;
  lastPrice?: { yes: number; no: number; ts: number };
  /** Demo override — set via /resolve before /postmortem */
  pendingOutcome?: "YES" | "NO";
  resolved?: { outcome: "YES" | "NO"; at: number; demo?: boolean };
}

interface SessionStore {
  markets: TrackedMarket[];
  activeMarketId: Record<string, string>; // chatId -> marketId
}

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../data");
const STORE_PATH = join(DATA_DIR, "sessions.json");

function load(): SessionStore {
  if (!existsSync(STORE_PATH)) {
    return { markets: [], activeMarketId: {} };
  }
  try {
    return JSON.parse(readFileSync(STORE_PATH, "utf-8")) as SessionStore;
  } catch {
    return { markets: [], activeMarketId: {} };
  }
}

function save(store: SessionStore): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

export function getMarketsForChat(chatId: number): TrackedMarket[] {
  const store = load();
  return store.markets.filter((m) => m.chatId === chatId && !m.resolved);
}

export function getAllMarketsForChat(chatId: number): TrackedMarket[] {
  const store = load();
  return store.markets.filter((m) => m.chatId === chatId);
}

export function getActiveMarket(chatId: number): TrackedMarket | undefined {
  const store = load();
  const activeId = store.activeMarketId[String(chatId)];
  if (!activeId) {
    const unresolved = store.markets.filter((m) => m.chatId === chatId && !m.resolved);
    return unresolved[unresolved.length - 1];
  }
  return store.markets.find((m) => m.id === activeId && m.chatId === chatId);
}

export function setActiveMarket(chatId: number, marketId: string): void {
  const store = load();
  store.activeMarketId[String(chatId)] = marketId;
  save(store);
}

export function addMarket(market: TrackedMarket): void {
  const store = load();
  store.markets.push(market);
  store.activeMarketId[String(market.chatId)] = market.id;
  save(store);
}

export function updateMarket(
  marketId: string,
  chatId: number,
  patch: Partial<TrackedMarket>,
): TrackedMarket | undefined {
  const store = load();
  const idx = store.markets.findIndex((m) => m.id === marketId && m.chatId === chatId);
  if (idx === -1) return undefined;
  store.markets[idx] = { ...store.markets[idx], ...patch };
  save(store);
  return store.markets[idx];
}

export function getMarketById(marketId: string, chatId: number): TrackedMarket | undefined {
  const store = load();
  return store.markets.find((m) => m.id === marketId && m.chatId === chatId);
}

export function getAllMarkets(): TrackedMarket[] {
  return load().markets;
}
