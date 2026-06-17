import { openai } from "@ai-sdk/openai";
import { withMemForks } from "@memfork/vercel-ai";
import { generateObject, type LanguageModel } from "ai";
import { z } from "zod";
import { getMemForksClient } from "../memfork/client.js";
import { branchPath, CALIBRATION_BRANCH } from "../memfork/branches.js";
import type { MarketInfo } from "../markets/provider.js";

const thesisSchema = z.object({
  yesFacts: z.array(z.string()).describe("3-5 bullet facts supporting YES"),
  noFacts: z.array(z.string()).describe("3-5 bullet facts supporting NO"),
  yesConfidence: z.number().min(0).max(100),
  noConfidence: z.number().min(0).max(100),
});

export async function generateInitialTheses(
  market: MarketInfo,
): Promise<{
  yes: string[];
  no: string[];
  yesConfidence: number;
  noConfidence: number;
}> {
  const client = await getMemForksClient();
  const calibrationFacts = await client.recall(
    "calibration lessons reasoning patterns source reliability",
    { branch: CALIBRATION_BRANCH, limit: 5 },
  );
  const lessonContext =
    calibrationFacts.length > 0
      ? `\nPrior calibration lessons:\n${calibrationFacts.map((f) => String(f.text)).join("\n")}`
      : "";

  const model = withMemForks(openai("gpt-4o-mini") as never, {
    branch: CALIBRATION_BRANCH,
    recallLimit: 3,
    autoCommit: false,
  }) as unknown as LanguageModel;

  const { object } = await generateObject({
    model,
    schema: thesisSchema,
    system:
      "You are ForecastOS, a prediction market analyst. Generate initial YES and NO theses " +
      "for the market. Each fact should be a clear, source-style claim. Include confidence 0-100. " +
      "If calibration lessons are provided, cite relevant ones in your reasoning.",
    prompt:
      `Market: ${market.question}\n\n` +
      `Resolution criteria:\n${market.resolutionCriteria}` +
      lessonContext,
  });

  const yes = [
    ...object.yesFacts,
    `Confidence: ${object.yesConfidence}%`,
  ];
  const no = [
    ...object.noFacts,
    `Confidence: ${object.noConfidence}%`,
  ];

  return {
    yes,
    no,
    yesConfidence: object.yesConfidence,
    noConfidence: object.noConfidence,
  };
}

export async function commitTheses(
  marketId: string,
  yes: string[],
  no: string[],
): Promise<void> {
  const client = await getMemForksClient();
  await client.commit(branchPath(marketId, "thesis/yes"), {
    facts: yes,
    message: "Initial YES thesis",
  });
  await client.commit(branchPath(marketId, "thesis/no"), {
    facts: no,
    message: "Initial NO thesis",
  });
}
