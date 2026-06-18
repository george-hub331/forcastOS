import { getMemForksClient } from "../../memfork/client.js";
import { thesisForkName } from "../../memfork/branches.js";
import { getActiveMarket, updateMarket } from "../../store/sessions.js";
import { chatIdFrom } from "../context.js";
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

  const client = await getMemForksClient();
  const currentHead = side === "yes" ? market.yesHead : market.noHead;
  const forkName = thesisForkName(market.id, side);

  await client.branch(forkName, { from: currentHead });
  await client.commit(forkName, {
    facts: [
      `${side.toUpperCase()} thesis manually forked: ${reason}`,
    ],
    message: `Manual fork: ${reason}`,
  });

  updateMarket(market.id, chatIdFrom(ctx), {
    ...(side === "yes" ? { yesHead: forkName } : { noHead: forkName }),
  });

  await ctx.reply(`${side.toUpperCase()} thesis forked to \`${forkName}\`\n${reason}`, {
    parse_mode: "Markdown",
  });
}
