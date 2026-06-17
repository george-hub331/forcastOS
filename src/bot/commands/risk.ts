import { recallFacts } from "../../memfork/client.js";
import { branchPath } from "../../memfork/branches.js";
import { getActiveMarket } from "../../store/sessions.js";
import type { BotContext } from "../context.js";

export async function handleRisk(ctx: BotContext): Promise<void> {
  const market = getActiveMarket(ctx.chatId);
  if (!market) {
    await ctx.reply("No active market. Use /track first.");
    return;
  }

  const facts = await recallFacts(
    "resolution ambiguity liquidity contradiction risk",
    branchPath(market.id, "resolution-risk"),
    8,
  );

  const body =
    facts.length > 0
      ? facts.map((f, i) => `${i + 1}. ${f.text}`).join("\n")
      : "(no risk facts recalled)";

  await ctx.reply(`*Resolution risk:* ${market.question}\n\n${body}`, {
    parse_mode: "Markdown",
  });
}
