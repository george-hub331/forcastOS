import type { Context } from "grammy";

export function formatUserErrorMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);

  if (msg.startsWith("Market not found:")) {
    return "Couldn't find that Polymarket. Check the URL or slug and try again.";
  }
  if (msg.startsWith("Polymarket API error:")) {
    return "Polymarket is temporarily unavailable. Please try again in a moment.";
  }

  return "Something went wrong. Please try again.";
}

export async function replyWithError(ctx: Context, error: unknown): Promise<void> {
  const text = formatUserErrorMessage(error);
  try {
    await ctx.reply(`${text}`);
  } catch (replyErr) {
    console.error("[bot] failed to send error reply:", replyErr);
  }
}
