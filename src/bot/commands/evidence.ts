import { recallFacts } from "../../memfork/client.js";
import { branchPath } from "../../memfork/branches.js";
import { getActiveMarket } from "../../store/sessions.js";
import type { BotContext } from "../context.js";

export async function handleEvidence(ctx: BotContext): Promise<void> {
  const market = getActiveMarket(ctx.chatId);
  if (!market) {
    await ctx.reply("No active market. Use /track first.");
    return;
  }

  const [news, micro] = await Promise.all([
    recallFacts("source-backed evidence claims", branchPath(market.id, "sources/news"), 8),
    recallFacts("price liquidity observations", branchPath(market.id, "sources/microstructure"), 5),
  ]);

  const fmt = (items: Array<{ text: string }>) =>
    items.length
      ? items.map((f, i) => `${i + 1}. ${f.text}`).join("\n")
      : "(none)";

  await ctx.reply(
    `*Evidence for:* ${market.question}\n\n` +
      `*News / sources:*\n${fmt(news)}\n\n` +
      `*Microstructure:*\n${fmt(micro)}`,
    { parse_mode: "Markdown" },
  );
}
