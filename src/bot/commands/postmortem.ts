import { getMemForksClient } from "../../memfork/client.js";
import { recallFacts } from "../../memfork/client.js";
import { safeMerge } from "../../memfork/merge.js";
import {
  branchPath,
  CALIBRATION_BRANCH,
  isBranchExistsError,
  lessonBranch,
} from "../../memfork/branches.js";
import { pacedBranch } from "../../memfork/pacing.js";
import { extractPostmortemLesson } from "../../ai/postmortem.js";
import { polymarketProvider } from "../../markets/polymarket.js";
import { getActiveMarket, updateMarket } from "../../store/sessions.js";
import { chatIdFrom } from "../context.js";
import type { Context } from "grammy";

export async function handlePostmortem(ctx: Context): Promise<void> {
  const market = getActiveMarket(chatIdFrom(ctx));
  if (!market) {
    await ctx.reply("No active market.");
    return;
  }

  await ctx.reply("Running postmortem…");

  let outcome: "YES" | "NO";
  let demo = false;

  if (market.pendingOutcome) {
    outcome = market.pendingOutcome;
    demo = true;
  } else {
    const resolution = await polymarketProvider.getResolution(market.id);
    if (!resolution.resolved || !resolution.outcome) {
      await ctx.reply(
        "Market not resolved on Polymarket yet.\n" +
          "Use /resolve yes|no for demo, then /postmortem again.",
      );
      return;
    }
    outcome = resolution.outcome;
  }

  const [yesFacts, noFacts, newsFacts] = await Promise.all([
    recallFacts("final YES thesis confidence", market.yesHead, 8),
    recallFacts("final NO thesis confidence", market.noHead, 8),
    recallFacts("source evidence claims", branchPath(market.id, "sources/news"), 10),
  ]);

  const yesText = yesFacts.map((f) => f.text).join("\n");
  const noText = noFacts.map((f) => f.text).join("\n");
  const newsText = newsFacts.map((f) => f.text).join("\n");

  const result = await extractPostmortemLesson(
    market.question,
    outcome,
    yesText,
    noText,
    newsText,
  );

  const winner = result.winner;
  const loser = winner === "yes" ? "no" : "yes";
  const winnerHead = winner === "yes" ? market.yesHead : market.noHead;

  const client = await getMemForksClient();
  const lessonBr = lessonBranch(market.id);

  try {
    await pacedBranch(client, lessonBr, { from: winnerHead });
  } catch (err) {
    if (!isBranchExistsError(err)) throw err;
  }

  await client.commit(lessonBr, {
    facts: [
      `LESSON: ${result.lessonPattern}`,
      `Evidence: market ${market.id} resolved ${outcome}, ${winner} thesis was correct.`,
      `Source reliability update: ${JSON.stringify(result.sourceScores)}`,
      result.summary,
    ],
    message: `Postmortem lesson for market ${market.id}`,
  });

  const { mergedCount, blobId } = await safeMerge(client, lessonBr, CALIBRATION_BRANCH, {
    recallQueries: [
      "validated reasoning lessons and calibration patterns",
      "source reliability scores",
    ],
  });

  updateMarket(market.id, chatIdFrom(ctx), {
    resolved: { outcome, at: Date.now(), demo },
    pendingOutcome: undefined,
  });

  await ctx.reply(
    `*Postmortem complete*\n\n` +
      `Outcome: *${outcome}*${demo ? " (demo)" : ""}\n` +
      `Winner: *${winner.toUpperCase()}* thesis\n` +
      `Loser preserved: \`market/${market.id}/thesis/${loser}\` (not merged)\n\n` +
      `*Lesson merged to calibration/main:*\n${result.lessonPattern}\n\n` +
      `Merged ${mergedCount} fact(s)` +
      (blobId ? ` · blob \`${blobId.slice(0, 16)}…\`` : "") +
      `\n\nTrack a similar market — /thesis should now cite this lesson.`,
    { parse_mode: "Markdown" },
  );
}
