import { Bot } from "grammy";
import { replyWithError } from "./errors.js";
import { handleTrack } from "./commands/track.js";
import { handleThesis } from "./commands/thesis.js";
import { handleEvidence } from "./commands/evidence.js";
import { handleRisk } from "./commands/risk.js";
import { handleStatus } from "./commands/status.js";
import { handleFork } from "./commands/fork.js";
import { handleMergeLesson } from "./commands/merge-lesson.js";
import { handlePostmortem } from "./commands/postmortem.js";
import { handleInject } from "./commands/inject-evidence.js";
import { handleResolve } from "./commands/resolve.js";
import { handleRecallCalibration } from "./commands/recall-calibration.js";

export function createBot(token: string): Bot {
  const bot = new Bot(token);

  bot.command("start", async (ctx) => {
    await ctx.reply(
      "ForecastOS — version-controlled prediction market memory.\n\n" +
        "Commands:\n" +
        "/track <url> — track a Polymarket\n" +
        "/thesis — YES vs NO arguments\n" +
        "/evidence — source-backed evidence\n" +
        "/risk — resolution risk\n" +
        "/inject <text> — add evidence (demo)\n" +
        "/fork yes|no <reason> — manual thesis fork\n" +
        "/resolve yes|no — demo resolution\n" +
        "/postmortem — score & merge lesson\n" +
        "/recall-calibration — view durable lessons\n" +
        "/merge <branch> — promote branch to calibration/main\n" +
        "/status — tracked markets",
    );
  });

  bot.command("track", async (ctx) => {
    await handleTrack(ctx, ctx.match?.trim() ?? "");
  });

  bot.command("thesis", async (ctx) => {
    await handleThesis(ctx);
  });

  bot.command("evidence", async (ctx) => {
    await handleEvidence(ctx);
  });

  bot.command("risk", async (ctx) => {
    await handleRisk(ctx);
  });

  bot.command("status", async (ctx) => {
    await handleStatus(ctx);
  });

  bot.command("fork", async (ctx) => {
    const match = (ctx.match ?? "").trim();
    const [side, ...rest] = match.split(/\s+/);
    await handleFork(ctx, side, rest.join(" "));
  });

  bot.command("merge", async (ctx) => {
    await handleMergeLesson(ctx, ctx.match?.trim() ?? "");
  });

  bot.command("postmortem", async (ctx) => {
    await handlePostmortem(ctx);
  });

  bot.command("inject", async (ctx) => {
    await handleInject(ctx, ctx.match?.trim() ?? "");
  });

  bot.command("resolve", async (ctx) => {
    await handleResolve(ctx, ctx.match?.trim() ?? "");
  });

  bot.command("recall_calibration", async (ctx) => {
    await handleRecallCalibration(ctx);
  });

  bot.command("recall-calibration", async (ctx) => {
    await handleRecallCalibration(ctx);
  });

  bot.catch(async (err) => {
    console.error("[bot] error:", err.error);
    await replyWithError(err.ctx, err.error);
  });

  return bot;
}
