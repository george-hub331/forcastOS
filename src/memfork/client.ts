import { MemForksClient } from "@memfork/core";
import { extractFactText } from "./extract.js";

let clientPromise: Promise<MemForksClient> | null = null;

export async function getMemForksClient(): Promise<MemForksClient> {
  if (!clientPromise) {
    clientPromise = MemForksClient.connect();
  }
  return clientPromise;
}

export async function recallFacts(
  query: string,
  branch: string,
  limit = 5,
): Promise<Array<{ text: string; distance?: number }>> {
  const client = await getMemForksClient();
  const facts = await client.recall(query, { branch, limit });
  return facts.map((f) => ({
    text: extractFactText(String(f.text ?? "")),
    distance: f.distance,
  }));
}

export function formatRecalledContext(
  branch: string,
  facts: Array<{ text: string }>,
): string {
  if (facts.length === 0) return "";
  return [
    `--- MemForks memory (branch: ${branch}) ---`,
    ...facts.map((f, i) => `[${i + 1}] ${f.text}`),
    "--- end of recalled context ---",
  ].join("\n");
}
