import "dotenv/config";
import { createBot } from "./bot/index.js";
import { ensureCalibrationBranch } from "./memfork/branches.js";
import { startEvidencePoller } from "./evidence/loop.js";

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("Missing TELEGRAM_BOT_TOKEN in .env");
    process.exit(1);
  }

  const required = [
    "MEMFORK_TREE_ID",
    "MEMFORK_PRIVATE_KEY",
    "MEMFORK_MEMWAL_ACCOUNT",
    "MEMFORK_MEMWAL_KEY",
    "OPENAI_API_KEY",
  ];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(`Missing env vars: ${missing.join(", ")}`);
    console.error("Run: memfork init --quick && memfork doctor --env");
    process.exit(1);
  }

  console.log("[forecastos] ensuring calibration/main…");
  await ensureCalibrationBranch();

  const bot = createBot(token);

  startEvidencePoller(async (chatId, message) => {
    await bot.api.sendMessage(chatId, message);
  });

  console.log("[forecastos] starting Telegram bot…");
  await bot.start({
    onStart: () => console.log("[forecastos] bot is running"),
  });
}

main().catch((err) => {
  console.error("[forecastos] fatal:", err);
  process.exit(1);
});
