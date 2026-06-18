import "dotenv/config";
import { ensureCalibrationBranch } from "../memfork/branches.js";

async function main() {
  await ensureCalibrationBranch();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
