import { openai } from "@ai-sdk/openai";
import { withMemForks } from "@memfork/vercel-ai";
import { generateObject, type LanguageModel } from "ai";
import { z } from "zod";

export const verdictSchema = z.object({
  kind: z.enum(["confirms", "changes-view", "noise"]),
  side: z.enum(["yes", "no"]),
  reason: z.string(),
});

export type EvidenceVerdict = z.infer<typeof verdictSchema>;

export async function classifyEvidence(
  thesisHead: string,
  evidenceSummary: string,
  marketQuestion: string,
): Promise<EvidenceVerdict> {
  const model = withMemForks(openai("gpt-4o-mini") as never, {
    branch: thesisHead,
    recallLimit: 5,
    autoCommit: false,
  }) as unknown as LanguageModel;

  const { object } = await generateObject({
    model,
    schema: verdictSchema,
    system:
      "Classify how new evidence affects the standing thesis on this branch. " +
      "'confirms' = supports current view without changing it. " +
      "'changes-view' = contradicts or materially weakens/strengthens the thesis. " +
      "'noise' = price movement or rumor without source-backed substance — log only, do not change thesis.",
    prompt:
      `Market: ${marketQuestion}\n\n` +
      `New evidence:\n${evidenceSummary}\n\n` +
      `Classify its effect on the standing thesis (recalled context above).`,
  });

  return object;
}
