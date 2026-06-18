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

  await ensureCalibrationBranch();

  const bot = createBot(token);

  startEvidencePoller(async (chatId, message) => {
    await bot.api.sendMessage(chatId, message);
  });

  await bot.start();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
