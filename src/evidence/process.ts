import { getMemForksClient } from "../memfork/client.js";
import { branchPath } from "../memfork/branches.js";
import { classifyEvidence } from "../ai/classifier.js";
import type { TrackedMarket } from "../store/sessions.js";
import type { Evidence, EvidenceNotifyFn } from "./types.js";
import {
  confirmThesisWithConfidence,
  forkThesisWithConfidence,
} from "./thesis-update.js";

export async function processEvidence(
  market: TrackedMarket,
  evidence: Evidence,
  notify: EvidenceNotifyFn,
): Promise<string> {
  const client = await getMemForksClient();

  if (evidence.kind === "price") {
    await client.commit(branchPath(market.id, "sources/microstructure"), {
      facts: [evidence.summary],
      message: `Price observation: ${evidence.headline}`,
    });
    return "Logged price move to microstructure (no thesis change).";
  }

  const yesHead = market.yesHead;
  const noHead = market.noHead;

  const [yesVerdict, noVerdict] = await Promise.all([
    classifyEvidence(yesHead, evidence.summary, market.question),
    classifyEvidence(noHead, evidence.summary, market.question),
  ]);

  const verdict =
    yesVerdict.kind === "changes-view"
      ? { ...yesVerdict, side: "yes" as const }
      : noVerdict.kind === "changes-view"
        ? { ...noVerdict, side: "no" as const }
        : yesVerdict.kind === "confirms"
          ? { ...yesVerdict, side: "yes" as const }
          : noVerdict.kind === "confirms"
            ? { ...noVerdict, side: "no" as const }
            : yesVerdict;

  if (verdict.kind === "noise") {
    await client.commit(branchPath(market.id, "sources/microstructure"), {
      facts: [evidence.summary],
      message: `Unsubstantiated signal: ${evidence.headline}`,
    });
    return "Logged as noise — no thesis change.";
  }

  const evidenceFacts = [
    evidence.summary,
    ...(evidence.source ? [`Source: ${evidence.source}`] : []),
  ];

  if (verdict.kind === "confirms") {
    await client.commit(branchPath(market.id, "sources/news"), {
      facts: evidenceFacts,
      message: `Confirming evidence: ${evidence.headline}`,
    });

    const { confidence, rationale } = await confirmThesisWithConfidence(
      market,
      verdict.side,
      evidence.summary,
      [`Confirming evidence: ${evidence.headline}`],
      `Confirming evidence: ${evidence.headline}`,
    );

    return (
      `Evidence confirms ${verdict.side.toUpperCase()} thesis.\n` +
      `Updated confidence: ${confidence}% — ${rationale}`
    );
  }

  const side = verdict.side;
  const confidenceKind =
    verdict.reason.toLowerCase().includes("weaken") ? "weaken" : "fork";

  const { confidence, rationale } = await forkThesisWithConfidence(
    market,
    side,
    evidence.summary,
    [
      `${side.toUpperCase()} thesis changed: ${verdict.reason}`,
      `Triggering evidence: ${evidence.summary}`,
      ...(evidence.source ? [`Source: ${evidence.source}`] : []),
    ],
    `View change: ${verdict.reason}`,
    confidenceKind,
  );

  const msg =
    `🔀 ${side.toUpperCase()} thesis forked: ${verdict.reason}\n` +
    `Updated confidence: ${confidence}% — ${rationale}`;
  await notify(market.chatId, msg);
  return msg;
}

export async function processPriceTick(
  market: TrackedMarket,
  yes: number,
  no: number,
  prevYes?: number,
): Promise<void> {
  const client = await getMemForksClient();
  const moved =
    prevYes != null && Math.abs(yes - prevYes) >= 0.02;

  const summary = `YES=${(yes * 100).toFixed(1)}% NO=${(no * 100).toFixed(1)}% at ${new Date().toISOString()}`;
  await client.commit(branchPath(market.id, "sources/microstructure"), {
    facts: [summary],
    message: moved ? "Notable price move" : "Price tick",
  });
}
