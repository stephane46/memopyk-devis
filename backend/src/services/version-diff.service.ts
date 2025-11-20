import { and, asc, eq, isNull } from 'drizzle-orm';

import type { TransactionClient } from '../db/client';
import { quoteLines, quoteVersions, type QuoteLine, type QuoteVersion } from '../db/schema';
import { HttpError } from '../utils/http-error';

export type VersionMetaField = 'label' | 'validityDate' | 'depositPct' | 'currencyCode';

export interface VersionMetaDiff {
  field: VersionMetaField;
  before: string | null;
  after: string | null;
}

export type VersionLineDiffKind = 'added' | 'removed' | 'changed';

export interface VersionLineSnapshot {
  position: number;
  label: string;
  description: string | null;
  quantity: string;
  unitPriceCents: number;
  taxRatePct: string;
  netAmountCents: number;
  taxAmountCents: number;
  grossAmountCents: number;
}

export interface VersionLineDiff {
  kind: VersionLineDiffKind;
  before?: VersionLineSnapshot;
  after?: VersionLineSnapshot;
}

export interface VersionDiff {
  meta: VersionMetaDiff[];
  lines: VersionLineDiff[];
}

function toMetaValue(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

function diffMeta(from: QuoteVersion, to: QuoteVersion): VersionMetaDiff[] {
  const result: VersionMetaDiff[] = [];

  const fields: Array<{ field: VersionMetaField; get: (v: QuoteVersion) => unknown }> = [
    { field: 'label', get: (v) => v.label },
    { field: 'validityDate', get: (v) => v.validityDate },
    { field: 'depositPct', get: (v) => v.depositPct },
    { field: 'currencyCode', get: (v) => v.currencyCode },
  ];

  for (const entry of fields) {
    const before = toMetaValue(entry.get(from));
    const after = toMetaValue(entry.get(to));
    if (before !== after) {
      result.push({ field: entry.field, before, after });
    }
  }

  return result;
}

function toLineSnapshot(line: QuoteLine): VersionLineSnapshot {
  return {
    position: line.position,
    label: line.label,
    description: line.description ?? null,
    quantity: line.quantity.toString(),
    unitPriceCents: line.unitPriceCents,
    taxRatePct: line.taxRatePct.toString(),
    netAmountCents: line.netAmountCents,
    taxAmountCents: line.taxAmountCents,
    grossAmountCents: line.grossAmountCents,
  };
}

function diffLines(from: QuoteLine[], to: QuoteLine[]): VersionLineDiff[] {
  const diffs: VersionLineDiff[] = [];
  const maxLen = Math.max(from.length, to.length);

  for (let index = 0; index < maxLen; index += 1) {
    const before = from[index];
    const after = to[index];

    if (before && !after) {
      diffs.push({
        kind: 'removed',
        before: toLineSnapshot(before),
      });
      continue;
    }

    if (!before && after) {
      diffs.push({
        kind: 'added',
        after: toLineSnapshot(after),
      });
      continue;
    }

    if (!before || !after) {
      continue;
    }

    const beforeSnap = toLineSnapshot(before);
    const afterSnap = toLineSnapshot(after);

    if (
      beforeSnap.label !== afterSnap.label ||
      beforeSnap.description !== afterSnap.description ||
      beforeSnap.quantity !== afterSnap.quantity ||
      beforeSnap.unitPriceCents !== afterSnap.unitPriceCents ||
      beforeSnap.taxRatePct !== afterSnap.taxRatePct ||
      beforeSnap.netAmountCents !== afterSnap.netAmountCents ||
      beforeSnap.taxAmountCents !== afterSnap.taxAmountCents ||
      beforeSnap.grossAmountCents !== afterSnap.grossAmountCents
    ) {
      diffs.push({
        kind: 'changed',
        before: beforeSnap,
        after: afterSnap,
      });
    }
  }

  return diffs;
}

async function loadVersionWithLinesTx(
  tx: TransactionClient,
  versionId: string,
): Promise<{ version: QuoteVersion; lines: QuoteLine[] }> {
  const [version] = await tx
    .select()
    .from(quoteVersions)
    .where(and(eq(quoteVersions.id, versionId), isNull(quoteVersions.deletedAt)))
    .limit(1);

  if (!version) {
    throw new HttpError(404, 'version_not_found', 'Version not found.');
  }

  const lines = await tx
    .select()
    .from(quoteLines)
    .where(and(eq(quoteLines.versionId, versionId), isNull(quoteLines.deletedAt)))
    .orderBy(asc(quoteLines.position));

  return { version, lines };
}

export async function computeVersionDiffTx(
  tx: TransactionClient,
  fromVersionId: string,
  toVersionId: string,
): Promise<VersionDiff> {
  const from = await loadVersionWithLinesTx(tx, fromVersionId);
  const to = await loadVersionWithLinesTx(tx, toVersionId);

  return {
    meta: diffMeta(from.version, to.version),
    lines: diffLines(from.lines, to.lines),
  };
}
