import { getMemForksClient } from "./client.js";
import { pacedBranch } from "./pacing.js";

export const CALIBRATION_BRANCH = "calibration/main";

export const SUB_BRANCHES = [
  "thesis/yes",
  "thesis/no",
  "resolution-risk",
  "sources/news",
  "sources/microstructure",
  "trade-plan/paper",
] as const;

export function marketBase(marketId: string): string {
  return `market/${marketId}`;
}

export function branchPath(marketId: string, sub: string): string {
  return `${marketBase(marketId)}/${sub}`;
}

export function thesisForkName(marketId: string, side: "yes" | "no"): string {
  return `${marketBase(marketId)}/thesis/${side}@${Date.now()}`;
}

export function lessonBranch(marketId: string): string {
  return `${marketBase(marketId)}/lesson`;
}

export function isBranchExistsError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  return (
    lower.includes("e_branch_exists") ||
    /},\s*7\)/.test(msg) ||
    lower.includes("exist") ||
    lower.includes("already")
  );
}

export async function ensureCalibrationBranch(): Promise<void> {
  const client = await getMemForksClient();
  try {
    await pacedBranch(client, CALIBRATION_BRANCH, { from: "main" });
  } catch (err) {
    if (!isBranchExistsError(err)) throw err;
  }
}

export async function createMarketSubtree(marketId: string): Promise<string[]> {
  const client = await getMemForksClient();
  const base = marketBase(marketId);
  const created: string[] = [];

  for (const sub of SUB_BRANCHES) {
    const name = `${base}/${sub}`;
    try {
      await pacedBranch(client, name, { from: CALIBRATION_BRANCH });
      created.push(name);
    } catch (err) {
      if (isBranchExistsError(err)) {
        created.push(name);
        continue;
      }
      throw err;
    }
  }

  return created;
}
