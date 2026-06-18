import { recallFacts } from "../../memfork/client.js";
import { CALIBRATION_BRANCH } from "../../memfork/branches.js";
import type { Context } from "grammy";

export async function handleRecallCalibration(ctx: Context): Promise<void> {
  const facts = await recallFacts(
    "validated reasoning lessons calibration patterns source reliability",
    CALIBRATION_BRANCH,
    10,
  );

  const body =
    facts.length > 0
      ? facts.map((f, i) => `${i + 1}. ${f.text}`).join("\n")
      : "(calibration/main is empty — lessons appear after postmortem)";

  await ctx.reply(`*calibration/main*\n\n${body}`, { parse_mode: "Markdown" });
}
