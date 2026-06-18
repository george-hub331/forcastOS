import { getActiveMarket, updateMarket } from "../../store/sessions.js";
import { chatIdFrom } from "../context.js";
import type { Context } from "grammy";

export async function handleResolve(
  ctx: Context,
  outcomeArg: string,
): Promise<void> {
  const market = getActiveMarket(chatIdFrom(ctx));
  if (!market) {
    await ctx.reply("No active market.");
    return;
  }

  const arg = outcomeArg?.toUpperCase();
  if (arg !== "YES" && arg !== "NO") {
    await ctx.reply("Usage: /resolve yes|no\n(Demo override when market isn't settled on Polymarket)");
    return;
  }

  updateMarket(market.id, chatIdFrom(ctx), {
    pendingOutcome: arg,
  });

  await ctx.reply(
    `Demo resolution set: *${arg}*\nRun /postmortem to score branches and merge lesson.`,
    { parse_mode: "Markdown" },
  );
}
