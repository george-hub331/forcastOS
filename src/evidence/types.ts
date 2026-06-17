export interface Evidence {
  headline: string;
  summary: string;
  source?: string;
  kind: "news" | "price";
}

export type EvidenceNotifyFn = (chatId: number, message: string) => Promise<void>;
