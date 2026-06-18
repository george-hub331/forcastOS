import {
  MemForksClient,
  branchNamespace,
  resolvers,
} from "@memfork/core";

let lwwResolverId: string | undefined;

async function proposalObjectIdFromDigest(
  client: MemForksClient,
  digest: string,
): Promise<string> {
  const result = await client.suiClient.waitForTransaction({
    digest,
    options: { showObjectChanges: true },
  });
  const created = result.objectChanges?.find(
    (c) =>
      c.type === "created" &&
      "objectType" in c &&
      c.objectType.includes("MergeProposal"),
  );
  if (!created || created.type !== "created") {
    throw new Error(
      `proposeMerge tx ${digest}: MergeProposal not found in objectChanges`,
    );
  }
  return created.objectId;
}

async function getLwwResolverId(client: MemForksClient): Promise<string> {
  if (lwwResolverId) return lwwResolverId;
  const created = await client.createResolver(resolvers.lastWriteWins());
  lwwResolverId = created.resolverId;
  return lwwResolverId;
}

export interface SafeMergeResult {
  digest: string;
  mergedCount: number;
  blobId: string;
  proposalId?: string;
}

export async function safeMerge(
  client: MemForksClient,
  from: string,
  into: string,
  opts?: {
    resolverId?: string;
    recallQueries?: string[];
    recallLimit?: number;
    timeoutMs?: number;
  },
): Promise<SafeMergeResult> {
  const queries = opts?.recallQueries ?? [
    "facts about this project and conversation",
    "user preferences decisions and technical choices",
    "user background goals context and identity",
  ];
  const limit = opts?.recallLimit ?? 10;

  const sweepResults = await Promise.all(
    queries.map((q) => client.recall(q, { branch: from, limit }).catch(() => [])),
  );
  const seen = new Set<string>();
  const facts: string[] = [];
  for (const batch of sweepResults) {
    for (const r of batch) {
      const key = r.text.trim().slice(0, 120);
      if (!seen.has(key)) {
        seen.add(key);
        facts.push(r.text);
      }
    }
  }

  if (facts.length === 0) {
    return { digest: "", mergedCount: 0, blobId: "" };
  }

  const { blobId } = await client.commit(into, {
    facts,
    message: `Merge from ${from}`,
  });

  const governedResolverId = opts?.resolverId ?? client.defaultResolverId;
  if (governedResolverId) {
    const proposalDigest = await client.proposeMerge({
      fromBranch: from,
      intoBranch: into,
      resolverId: governedResolverId,
    });
    const proposalId = await proposalObjectIdFromDigest(client, proposalDigest);
    const { status, proposal } = await client.waitForFinalization(proposalId, {
      timeoutMs: opts?.timeoutMs ?? 300_000,
    });
    if (status !== "finalized") {
      throw new Error(
        `Merge proposal ${proposalId} ended with status "${status}"`,
      );
    }
    const resolvedBlobId = proposal.resolved_memwal_blob_id ?? blobId;
    return {
      digest: "",
      mergedCount: facts.length,
      blobId: resolvedBlobId,
      proposalId,
    };
  }

  const resolverId = await getLwwResolverId(client);
  const proposalDigest = await client.proposeMerge({
    fromBranch: from,
    intoBranch: into,
    resolverId,
  });
  const proposalId = await proposalObjectIdFromDigest(client, proposalDigest);
  const digest = await client.finalizeMerge({
    proposalId,
    resolverId,
    resolvedNamespace: branchNamespace(client.treeId, into),
    resolvedBlobId: blobId,
    intoBranch: into,
  });

  return { digest, mergedCount: facts.length, blobId, proposalId };
}
