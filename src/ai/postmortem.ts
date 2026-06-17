import { openai } from "@ai-sdk/openai";
import { withMemForks } from "@memfork/vercel-ai";
import { generateObject, type LanguageModel } from "ai";
import { z } from "zod";
import { CALIBRATION_BRANCH } from "../memfork/branches.js";

const postmortemSchema = z.object({
  winner: z.enum(["yes", "no"]),
  lessonPattern: z.string().describe("One generalizable reasoning lesson"),
  sourceScores: z.record(z.string(), z.number()).describe("source name -> reliability 0-1"),
  summary: z.string(),
});

export type PostmortemResult = z.infer<typeof postmortemSchema>;

export async function extractPostmortemLesson(
  marketQuestion: string,
  outcome: "YES" | "NO",
  yesThesis: string,
  noThesis: string,
  newsEvidence: string,
): Promise<PostmortemResult> {
  const model = withMemForks(openai("gpt-4o-mini") as never, {
    branch: CALIBRATION_BRANCH,
    recallLimit: 3,
    autoCommit: false,
  }) as unknown as LanguageModel;

  const { object } = await generateObject({
    model,
    schema: postmortemSchema,
    system:
      "You are ForecastOS postmortem analyst. Given a resolved market, determine which thesis " +
      "was better supported, extract ONE durable lesson for future markets, and score source reliability.",
    prompt:
      `Market: ${marketQuestion}\n` +
      `Resolved outcome: ${outcome}\n\n` +
      `Final YES thesis:\n${yesThesis}\n\n` +
      `Final NO thesis:\n${noThesis}\n\n` +
      `News evidence collected:\n${newsEvidence}`,
  });

  return object;
}
