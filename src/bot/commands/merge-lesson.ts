import { getMemForksClient } from "../../memfork/client.js";
import { CALIBRATION_BRANCH } from "../../memfork/branches.js";
import type { BotContext } from "../context.js";

export async function handleMergeLesson(
  ctx: BotContext,
  sourceBranch: string,
): Promise<void> {
  if (!sourceBranch?.trim()) {
    await ctx.reply("Usage: /merge <source-branch>\nExample: /merge market/abc/lesson");
    return;
  }

  await ctx.reply("Merging lesson into calibration/main…");

  const client = await getMemForksClient();
  const { mergedCount, blobId } = await client.merge(sourceBranch, CALIBRATION_BRANCH, {
    recallQueries: [
      "validated reasoning lessons and calibration patterns",
      "source reliability scores",
    ],
  });

  await ctx.reply(
    `Merged ${mergedCount} fact(s) into \`${CALIBRATION_BRANCH}\`\n` +
      (blobId ? `blob: \`${blobId.slice(0, 20)}…\`` : ""),
    { parse_mode: "Markdown" },
  );
}
