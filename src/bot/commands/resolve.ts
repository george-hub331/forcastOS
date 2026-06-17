import { getActiveMarket, updateMarket } from "../../store/sessions.js";
import type { BotContext } from "../context.js";

export async function handleResolve(
  ctx: BotContext,
  outcomeArg: string,
): Promise<void> {
  const market = getActiveMarket(ctx.chatId);
  if (!market) {
    await ctx.reply("No active market.");
    return;
  }

  const arg = outcomeArg?.toUpperCase();
  if (arg !== "YES" && arg !== "NO") {
    await ctx.reply("Usage: /resolve yes|no\n(Demo override when market isn't settled on Polymarket)");
    return;
  }

  updateMarket(market.id, market.chatId, {
    pendingOutcome: arg,
  });

  await ctx.reply(
    `Demo resolution set: *${arg}*\nRun /postmortem to score branches and merge lesson.`,
    { parse_mode: "Markdown" },
  );
}
