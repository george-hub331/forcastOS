export interface MarketInfo {
  id: string;
  question: string;
  resolutionCriteria: string;
  slug?: string;
}

export interface MarketPrice {
  yes: number;
  no: number;
  ts: number;
}

export interface MarketResolution {
  resolved: boolean;
  outcome?: "YES" | "NO";
}

export interface MarketProvider {
  getMarket(ref: string): Promise<MarketInfo>;
  getPrice(id: string): Promise<MarketPrice>;
  getResolution(id: string): Promise<MarketResolution>;
}
