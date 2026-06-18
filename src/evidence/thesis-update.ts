import { getMemForksClient } from "../memfork/client.js";
import { formatConfidence } from "../memfork/confidence.js";
import { thesisForkName } from "../memfork/branches.js";
import {
  reviseConfidence,
  type ConfidenceUpdateKind,
} from "../ai/confidence.js";
import type { TrackedMarket } from "../store/sessions.js";
import { updateMarket } from "../store/sessions.js";

export interface ForkThesisResult {
  forkName: string;
  confidence: number;
  rationale: string;
}

export async function forkThesisWithConfidence(
  market: TrackedMarket,
  side: "yes" | "no",
  trigger: string,
  extraFacts: string[],
  message: string,
  confidenceKind: ConfidenceUpdateKind = "fork",
): Promise<ForkThesisResult> {
  const client = await getMemForksClient();
  const currentHead = side === "yes" ? market.yesHead : market.noHead;
  const forkName = thesisForkName(market.id, side);

  await client.branch(forkName, { from: currentHead });

  const { confidence, rationale } = await reviseConfidence({
    thesisHead: forkName,
    marketQuestion: market.question,
    side,
    kind: confidenceKind,
    trigger,
  });

  await client.commit(forkName, {
    facts: [
      ...extraFacts,
      formatConfidence(confidence),
      `Confidence rationale: ${rationale}`,
    ],
    message,
  });

  updateMarket(market.id, market.chatId, {
    ...(side === "yes"
      ? { yesHead: forkName, yesConfidence: confidence }
      : { noHead: forkName, noConfidence: confidence }),
  });

  return { forkName, confidence, rationale };
}

export async function confirmThesisWithConfidence(
  market: TrackedMarket,
  side: "yes" | "no",
  trigger: string,
  extraFacts: string[],
  message: string,
): Promise<{ confidence: number; rationale: string }> {
  const client = await getMemForksClient();
  const head = side === "yes" ? market.yesHead : market.noHead;

  const { confidence, rationale } = await reviseConfidence({
    thesisHead: head,
    marketQuestion: market.question,
    side,
    kind: "confirm",
    trigger,
  });

  await client.commit(head, {
    facts: [
      ...extraFacts,
      formatConfidence(confidence),
      `Confidence rationale: ${rationale}`,
    ],
    message,
  });

  updateMarket(market.id, market.chatId, {
    ...(side === "yes" ? { yesConfidence: confidence } : { noConfidence: confidence }),
  });

  return { confidence, rationale };
}
