import type { Context } from "grammy";
import { isSponsorRateLimitError } from "../memfork/pacing.js";

export function formatUserErrorMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);

  if (msg.startsWith("Market not found:")) {
    return "Couldn't find that Polymarket. Check the URL or slug and try again.";
  }
  if (msg.startsWith("Polymarket API error:")) {
    return "Polymarket is temporarily unavailable. Please try again in a moment.";
  }
  if (isSponsorRateLimitError(error)) {
    return "MemForks sponsor rate limit hit — wait about a minute and try /track again.";
  }

  return "Something went wrong. Please try again.";
}

export async function replyWithError(ctx: Context, error: unknown): Promise<void> {
  const text = formatUserErrorMessage(error);
  await ctx.reply(`${text}`);
}
