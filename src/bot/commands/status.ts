import { polymarketProvider } from "../../markets/polymarket.js";
import { getAllMarketsForChat } from "../../store/sessions.js";
import { chatIdFrom } from "../context.js";
import type { Context } from "grammy";

export async function handleStatus(ctx: Context): Promise<void> {
  const markets = getAllMarketsForChat(chatIdFrom(ctx));

  if (markets.length === 0) {
    await ctx.reply("No tracked markets. Use /track <polymarket-url>.");
    return;
  }

  const lines: string[] = [];
  for (const m of markets) {
    let priceStr = "price unavailable";
    try {
      const p = await polymarketProvider.getPrice(m.id);
      priceStr = `YES ${(p.yes * 100).toFixed(1)}% / NO ${(p.no * 100).toFixed(1)}%`;
    } catch {
      // ignore
    }
    const status = m.resolved
      ? `resolved ${m.resolved.outcome}${m.resolved.demo ? " (demo)" : ""}`
      : "active";
    lines.push(`• ${m.question.slice(0, 60)}…\n  id: \`${m.id.slice(0, 18)}…\` | ${status}\n  ${priceStr}`);
  }

  await ctx.reply(`*Tracked markets*\n\n${lines.join("\n\n")}`, {
    parse_mode: "Markdown",
  });
}
