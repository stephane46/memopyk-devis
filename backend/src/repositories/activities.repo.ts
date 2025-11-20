import type { TransactionClient } from '../db/client';
import { db } from '../db/client';
import { activities, type Activity } from '../db/schema';

export type ActivityType = Activity['type'];

export interface LogActivityInput {
  quoteId: string;
  versionId?: string | null;
  type: ActivityType;
  actor?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function logActivityTx(
  tx: TransactionClient,
  input: LogActivityInput,
): Promise<void> {
  const now = new Date();

  await tx.insert(activities).values({
    quoteId: input.quoteId,
    versionId: input.versionId ?? null,
    type: input.type,
    actor: input.actor ?? null,
    metadata: input.metadata ?? null,
    createdAt: now,
  });
}

export async function logActivity(input: LogActivityInput): Promise<void> {
  await db.transaction(async (tx) => {
    await logActivityTx(tx, input);
  });
}
