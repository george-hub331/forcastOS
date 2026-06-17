import { processEvidence } from "../../evidence/process.js";
import { getActiveMarket } from "../../store/sessions.js";
import type { BotContext } from "../context.js";

export async function handleInject(
  ctx: BotContext,
  text: string,
): Promise<void> {
  const market = getActiveMarket(ctx.chatId);
  if (!market) {
    await ctx.reply("No active market. Use /track first.");
    return;
  }
  if (!text?.trim()) {
    await ctx.reply("Usage: /inject <evidence text>\nExample: /inject Reuters reports the event was excluded per resolution criteria.");
    return;
  }

  const notify = async (chatId: number, message: string) => {
    await ctx.api.sendMessage(chatId, message);
  };

  const result = await processEvidence(
    market,
    {
      headline: text.slice(0, 80),
      summary: text,
      source: "manual-inject",
      kind: "news",
    },
    notify,
  );

  await ctx.reply(`Evidence processed:\n${result}`);
}
