import { recallFacts } from "../../memfork/client.js";
import { firstConfidence } from "../../memfork/confidence.js";
import { getActiveMarket, updateMarket } from "../../store/sessions.js";
import { chatIdFrom } from "../context.js";
import type { Context } from "grammy";

async function resolveConfidence(
  marketId: string,
  chatId: number,
  side: "yes" | "no",
  head: string,
  stored: number | undefined,
  recalled: Array<{ text: string }>,
): Promise<number | null> {
  if (stored != null) return stored;

  let fromRecall = firstConfidence(recalled.map((f) => f.text));
  if (fromRecall == null) {
    const confFacts = await recallFacts(
      "updated confidence percentage rationale",
      head,
      5,
    );
    fromRecall = firstConfidence(confFacts.map((f) => f.text));
  }
  if (fromRecall != null) {
    updateMarket(marketId, chatId, {
      ...(side === "yes" ? { yesConfidence: fromRecall } : { noConfidence: fromRecall }),
    });
  }
  return fromRecall;
}

export async function handleThesis(ctx: Context): Promise<void> {
  const market = getActiveMarket(chatIdFrom(ctx));
  if (!market) {
    await ctx.reply("No active market. Use /track <market-url> first.");
    return;
  }

  const chatId = chatIdFrom(ctx);

  const [yesFacts, noFacts] = await Promise.all([
    recallFacts("current YES thesis arguments", market.yesHead, 8),
    recallFacts("current NO thesis arguments", market.noHead, 8),
  ]);

  const [yesConfidence, noConfidence] = await Promise.all([
    resolveConfidence(
      market.id,
      chatId,
      "yes",
      market.yesHead,
      market.yesConfidence,
      yesFacts,
    ),
    resolveConfidence(
      market.id,
      chatId,
      "no",
      market.noHead,
      market.noConfidence,
      noFacts,
    ),
  ]);

  const formatSide = (
    label: string,
    facts: Array<{ text: string }>,
    head: string,
    confidence: number | null,
  ) => {
    const confLine =
      confidence != null ? `*Confidence: ${confidence}%*\n` : "";
    const body =
      facts.length > 0
        ? facts.map((f, i) => `${i + 1}. ${f.text}`).join("\n")
        : "(no facts recalled)";
    return `*${label}* (\`${head}\`)\n${confLine}${body}`;
  };

  await ctx.reply(
    `*Thesis for:* ${market.question}\n\n` +
      formatSide("YES", yesFacts, market.yesHead, yesConfidence) +
      "\n\n" +
      formatSide("NO", noFacts, market.noHead, noConfidence),
    { parse_mode: "Markdown" },
  );
}
