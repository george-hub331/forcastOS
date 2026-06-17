import "dotenv/config";
import { ensureCalibrationBranch } from "../memfork/branches.js";

async function main() {
  console.log("Bootstrapping ForecastOS MemForks branches…");
  await ensureCalibrationBranch();
  console.log("calibration/main ready (forked from main if needed)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
