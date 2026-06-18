import { getActiveMarket } from "../../store/sessions.js";
import { chatIdFrom } from "../context.js";
import { forkThesisWithConfidence } from "../../evidence/thesis-update.js";
import type { Context } from "grammy";

export async function handleFork(
  ctx: Context,
  sideArg: string,
  reason: string,
): Promise<void> {
  const market = getActiveMarket(chatIdFrom(ctx));
  if (!market) {
    await ctx.reply("No active market.");
    return;
  }

  const side = sideArg?.toLowerCase();
  if (side !== "yes" && side !== "no") {
    await ctx.reply("Usage: /fork yes|no <reason>");
    return;
  }
  if (!reason?.trim()) {
    await ctx.reply("Provide a reason for the fork.");
    return;
  }

  const { forkName, confidence, rationale } = await forkThesisWithConfidence(
    market,
    side,
    reason,
    [`${side.toUpperCase()} thesis manually forked: ${reason}`],
    `Manual fork: ${reason}`,
    "fork",
  );

  await ctx.reply(
    `🔀 ${side.toUpperCase()} thesis forked to \`${forkName}\`\n` +
      `${reason}\n\n` +
      `Updated confidence: *${confidence}%*\n_${rationale}_`,
    { parse_mode: "Markdown" },
  );
}
