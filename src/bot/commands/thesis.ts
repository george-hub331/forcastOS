import { recallFacts } from "../../memfork/client.js";
import { getActiveMarket } from "../../store/sessions.js";
import { chatIdFrom } from "../context.js";
import type { Context } from "grammy";

export async function handleThesis(ctx: Context): Promise<void> {
  const market = getActiveMarket(chatIdFrom(ctx));
  if (!market) {
    await ctx.reply("No active market. Use /track <market-url> first.");
    return;
  }

  const [yesFacts, noFacts] = await Promise.all([
    recallFacts("current YES thesis confidence arguments", market.yesHead, 5),
    recallFacts("current NO thesis confidence arguments", market.noHead, 5),
  ]);

  const formatSide = (label: string, facts: Array<{ text: string }>, head: string) => {
    const body =
      facts.length > 0
        ? facts.map((f, i) => `${i + 1}. ${f.text}`).join("\n")
        : "(no facts recalled)";
    return `*${label}* (\`${head}\`)\n${body}`;
  };

  await ctx.reply(
    `*Thesis for:* ${market.question}\n\n` +
      formatSide("YES", yesFacts, market.yesHead) +
      "\n\n" +
      formatSide("NO", noFacts, market.noHead),
    { parse_mode: "Markdown" },
  );
}
