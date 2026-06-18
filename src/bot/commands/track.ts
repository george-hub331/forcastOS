import { polymarketProvider } from "../../markets/polymarket.js";
import { registerMarketPoller } from "../../evidence/loop.js";
import { getMemForksClient } from "../../memfork/client.js";
import {
  branchPath,
  createMarketSubtree,
  ensureCalibrationBranch,
  marketBase,
  SUB_BRANCHES,
} from "../../memfork/branches.js";
import { commitTheses, generateInitialTheses } from "../../ai/theses.js";
import { addMarket } from "../../store/sessions.js";
import { chatIdFrom } from "../context.js";
import type { Context } from "grammy";

export async function handleTrack(ctx: Context, marketRef: string): Promise<void> {
  if (!marketRef?.trim()) {
    await ctx.reply("Usage: /track <polymarket-url-or-slug>");
    return;
  }

  await ctx.reply("Fetching market and creating branch tree…");

  await ensureCalibrationBranch();
  const market = await polymarketProvider.getMarket(marketRef);
  const base = marketBase(market.id);

  await createMarketSubtree(market.id);

  const client = await getMemForksClient();
  await client.commit(branchPath(market.id, "resolution-risk"), {
    facts: [`Resolution criteria: ${market.resolutionCriteria}`],
    message: "Seed resolution criteria",
  });

  const theses = await generateInitialTheses(market);
  await commitTheses(market.id, theses.yes, theses.no);

  const yesHead = branchPath(market.id, "thesis/yes");
  const noHead = branchPath(market.id, "thesis/no");

  const tracked = {
    id: market.id,
    question: market.question,
    chatId: chatIdFrom(ctx),
    yesHead,
    noHead,
    createdAt: Date.now(),
  };

  addMarket(tracked);

  registerMarketPoller(tracked);

  const tree = SUB_BRANCHES.map((s) => `  • ${base}/${s}`).join("\n");

  await ctx.reply(
    `Tracking: ${market.question}\n\n` +
      `Branch tree (forked from calibration/main):\n${tree}\n\n` +
      `YES confidence: ${theses.yesConfidence}%\n` +
      `NO confidence: ${theses.noConfidence}%\n\n` +
      `Use /thesis to view arguments.`,
  );
}
