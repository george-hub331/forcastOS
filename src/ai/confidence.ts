import { openai } from "@ai-sdk/openai";
import { withMemForks } from "@memfork/vercel-ai";
import { generateObject } from "ai";
import { z } from "zod";
import { recallFacts } from "../memfork/client.js";
import { latestConfidence } from "../memfork/confidence.js";

const revisionSchema = z.object({
  confidence: z.number().min(0).max(100).describe("Updated confidence 0-100 for this thesis side"),
  rationale: z.string().describe("One sentence explaining the confidence change"),
});

export type ConfidenceUpdateKind = "fork" | "confirm" | "weaken";

export async function reviseConfidence(params: {
  thesisHead: string;
  marketQuestion: string;
  side: "yes" | "no";
  kind: ConfidenceUpdateKind;
  trigger: string;
}): Promise<{ confidence: number; rationale: string }> {
  const recalled = await recallFacts(
    "current thesis confidence arguments",
    params.thesisHead,
    8,
  );
  const prior = latestConfidence(recalled.map((f) => f.text));
  const priorLine =
    prior != null ? `Prior confidence on this branch: ${prior}%` : "No prior confidence recorded.";

  const kindGuide: Record<ConfidenceUpdateKind, string> = {
    fork: "The thesis was forked due to a material view change. Set confidence reflecting the new position.",
    confirm: "Evidence confirms the current thesis. Increase confidence modestly unless already very high.",
    weaken: "Evidence weakens this side. Decrease confidence; opposing case may be stronger.",
  };

  const model = withMemForks(openai("gpt-4o-mini"), {
    branch: params.thesisHead,
    recallLimit: 5,
    autoCommit: false,
  });

  const { object } = await generateObject({
    model,
    schema: revisionSchema,
    system:
      "You are ForecastOS. Output an updated confidence percentage for one thesis side (YES or NO) " +
      "given new information. Stay calibrated — large moves need strong justification.",
    prompt:
      `Market: ${params.marketQuestion}\n` +
      `Side: ${params.side.toUpperCase()}\n` +
      `${priorLine}\n` +
      `Update type: ${params.kind} — ${kindGuide[params.kind]}\n\n` +
      `Trigger:\n${params.trigger}`,
  });

  return object;
}
