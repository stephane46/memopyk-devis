import { describe, expect, it } from 'vitest';

import { computeVersionDiffTx } from '../../src/services/version-diff.service';
import { quoteLines, quoteVersions, type QuoteLine, type QuoteVersion } from '../../src/db/schema';
import { HttpError } from '../../src/utils/http-error';

function createTxMock(
  fromVersion: QuoteVersion,
  toVersion: QuoteVersion,
  fromLines: QuoteLine[],
  toLines: QuoteLine[],
): any {
  const versions = [fromVersion, toVersion];
  const linesList = [fromLines, toLines];
  let versionCallIndex = 0;
  let lineCallIndex = 0;

  return {
    select: () => ({
      from: (table: unknown) => {
        if (table === quoteVersions) {
          return {
            where: () => ({
              limit: async () => {
                const version = versions[versionCallIndex];
                versionCallIndex += 1;
                return [version];
              },
            }),
          };
        }

        if (table === quoteLines) {
          return {
            where: () => ({
              orderBy: async () => {
                const lines = linesList[lineCallIndex];
                lineCallIndex += 1;
                return lines;
              },
            }),
          };
        }

        throw new Error('Unexpected table requested');
      },
    }),
  };
}

describe('computeVersionDiffTx', () => {
  it('computes meta diffs and changed line diffs', async () => {
    const fromVersion = {
      id: 'v1',
      quoteId: 'q1',
      versionNumber: 1,
      label: null,
      title: 'Version 1',
      intro: null,
      notes: null,
      currencyCode: 'EUR',
      validityDate: new Date('2024-01-01T00:00:00.000Z'),
      depositPct: '0.1000',
      totalsNetCents: 0,
      totalsTaxCents: 0,
      totalsGrossCents: 0,
      totalsDepositCents: 0,
      totalsBalanceCents: 0,
      isLocked: false,
      deletedAt: null,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    } as unknown as QuoteVersion;

    const toVersion = {
      id: 'v2',
      quoteId: 'q1',
      versionNumber: 2,
      label: 'New label',
      title: 'Version 2',
      intro: null,
      notes: null,
      currencyCode: 'USD',
      validityDate: new Date('2024-02-01T00:00:00.000Z'),
      depositPct: '0.2000',
      totalsNetCents: 0,
      totalsTaxCents: 0,
      totalsGrossCents: 0,
      totalsDepositCents: 0,
      totalsBalanceCents: 0,
      isLocked: false,
      deletedAt: null,
      createdAt: new Date('2024-02-01T00:00:00.000Z'),
      updatedAt: new Date('2024-02-01T00:00:00.000Z'),
    } as unknown as QuoteVersion;

    const fromLines: QuoteLine[] = [
      {
        id: 'l1',
        versionId: 'v1',
        kind: 'service',
        refId: null,
        label: 'Old line',
        description: 'Old',
        quantity: '1',
        unitPriceCents: 1000,
        taxRatePct: '20.0000',
        discountPct: '0',
        optional: false,
        position: 1,
        netAmountCents: 1000,
        taxAmountCents: 200,
        grossAmountCents: 1200,
        metadata: null,
        deletedAt: null,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      } as unknown as QuoteLine,
    ];

    const toLines: QuoteLine[] = [
      {
        id: 'l1',
        versionId: 'v2',
        kind: 'service',
        refId: null,
        label: 'New line',
        description: 'New',
        quantity: '2',
        unitPriceCents: 2000,
        taxRatePct: '20.0000',
        discountPct: '0',
        optional: false,
        position: 1,
        netAmountCents: 2000,
        taxAmountCents: 400,
        grossAmountCents: 2400,
        metadata: null,
        deletedAt: null,
        createdAt: new Date('2024-02-01T00:00:00.000Z'),
        updatedAt: new Date('2024-02-01T00:00:00.000Z'),
      } as unknown as QuoteLine,
    ];

    const tx = createTxMock(fromVersion, toVersion, fromLines, toLines);

    const diff = await computeVersionDiffTx(tx as any, 'v1', 'v2');

    expect(diff.meta).toEqual([
      { field: 'label', before: null, after: 'New label' },
      {
        field: 'validityDate',
        before: '2024-01-01T00:00:00.000Z',
        after: '2024-02-01T00:00:00.000Z',
      },
      { field: 'depositPct', before: '0.1000', after: '0.2000' },
      { field: 'currencyCode', before: 'EUR', after: 'USD' },
    ]);

    expect(diff.lines).toEqual([
      {
        kind: 'changed',
        before: {
          position: 1,
          label: 'Old line',
          description: 'Old',
          quantity: '1',
          unitPriceCents: 1000,
          taxRatePct: '20.0000',
          netAmountCents: 1000,
          taxAmountCents: 200,
          grossAmountCents: 1200,
        },
        after: {
          position: 1,
          label: 'New line',
          description: 'New',
          quantity: '2',
          unitPriceCents: 2000,
          taxRatePct: '20.0000',
          netAmountCents: 2000,
          taxAmountCents: 400,
          grossAmountCents: 2400,
        },
      },
    ]);
  });

  it('marks added lines when only present in target version', async () => {
    const baseVersion = {
      id: 'v1',
      quoteId: 'q1',
      versionNumber: 1,
      label: null,
      title: 'v1',
      intro: null,
      notes: null,
      currencyCode: 'EUR',
      validityDate: null,
      depositPct: '0',
      totalsNetCents: 0,
      totalsTaxCents: 0,
      totalsGrossCents: 0,
      totalsDepositCents: 0,
      totalsBalanceCents: 0,
      isLocked: false,
      deletedAt: null,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    } as unknown as QuoteVersion;

    const addedLine: QuoteLine = {
      id: 'l-added',
      versionId: 'v2',
      kind: 'service',
      refId: null,
      label: 'Added',
      description: 'Added',
      quantity: '1',
      unitPriceCents: 5000,
      taxRatePct: '10.0000',
      discountPct: '0',
      optional: false,
      position: 1,
      netAmountCents: 5000,
      taxAmountCents: 500,
      grossAmountCents: 5500,
      metadata: null,
      deletedAt: null,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    } as unknown as QuoteLine;

    const tx = createTxMock(baseVersion, baseVersion, [], [addedLine]);

    const diff = await computeVersionDiffTx(tx as any, 'v1', 'v2');

    expect(diff.lines).toEqual([
      {
        kind: 'added',
        after: {
          position: 1,
          label: 'Added',
          description: 'Added',
          quantity: '1',
          unitPriceCents: 5000,
          taxRatePct: '10.0000',
          netAmountCents: 5000,
          taxAmountCents: 500,
          grossAmountCents: 5500,
        },
      },
    ]);
  });

  it('marks removed lines when only present in source version', async () => {
    const baseVersion = {
      id: 'v1',
      quoteId: 'q1',
      versionNumber: 1,
      label: null,
      title: 'v1',
      intro: null,
      notes: null,
      currencyCode: 'EUR',
      validityDate: null,
      depositPct: '0',
      totalsNetCents: 0,
      totalsTaxCents: 0,
      totalsGrossCents: 0,
      totalsDepositCents: 0,
      totalsBalanceCents: 0,
      isLocked: false,
      deletedAt: null,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    } as unknown as QuoteVersion;

    const removedLine: QuoteLine = {
      id: 'l-removed',
      versionId: 'v1',
      kind: 'service',
      refId: null,
      label: 'Removed',
      description: 'Removed',
      quantity: '1',
      unitPriceCents: 5000,
      taxRatePct: '10.0000',
      discountPct: '0',
      optional: false,
      position: 1,
      netAmountCents: 5000,
      taxAmountCents: 500,
      grossAmountCents: 5500,
      metadata: null,
      deletedAt: null,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    } as unknown as QuoteLine;

    const tx = createTxMock(baseVersion, baseVersion, [removedLine], []);

    const diff = await computeVersionDiffTx(tx as any, 'v1', 'v2');

    expect(diff.lines).toEqual([
      {
        kind: 'removed',
        before: {
          position: 1,
          label: 'Removed',
          description: 'Removed',
          quantity: '1',
          unitPriceCents: 5000,
          taxRatePct: '10.0000',
          netAmountCents: 5000,
          taxAmountCents: 500,
          grossAmountCents: 5500,
        },
      },
    ]);
  });

  it('throws HttpError when a version is not found', async () => {
    const tx = {
      select: () => ({
        from: (table: unknown) => {
          if (table === quoteVersions) {
            return {
              where: () => ({
                limit: async () => [],
              }),
            };
          }

          return {
            where: () => ({
              orderBy: async () => [],
            }),
          };
        },
      }),
    };

    await expect(computeVersionDiffTx(tx as any, 'missing', 'v2')).rejects.toBeInstanceOf(HttpError);
  });
});
