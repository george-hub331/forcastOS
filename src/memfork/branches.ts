import { getMemForksClient } from "./client.js";

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

export async function ensureCalibrationBranch(): Promise<void> {
  const client = await getMemForksClient();
  try {
    await client.branch(CALIBRATION_BRANCH, { from: "main" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.toLowerCase().includes("exist") && !msg.toLowerCase().includes("already")) {
      throw err;
    }
  }
}

export async function createMarketSubtree(marketId: string): Promise<string[]> {
  const client = await getMemForksClient();
  const base = marketBase(marketId);
  const created: string[] = [];

  for (const sub of SUB_BRANCHES) {
    const name = `${base}/${sub}`;
    try {
      await client.branch(name, { from: CALIBRATION_BRANCH });
      created.push(name);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes("exist") || msg.toLowerCase().includes("already")) {
        created.push(name);
        continue;
      }
      throw err;
    }
  }

  return created;
}
