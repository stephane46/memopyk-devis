import { randomBytes } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { and, eq, isNull } from 'drizzle-orm';

import { parseLineCreate, parseLineUpdate } from '../../api/validators/lines';
import { parseAdminPublicLinkUpdate } from '../../api/validators/public-links';
import {
  parseQuoteCreate,
  parseQuoteListQuery,
  parseQuoteUpdate,
} from '../../api/validators/quotes';
import { parseAdminPaperAcceptance } from '../../api/validators/acceptance';
import { parseVersionCreate } from '../../api/validators/versions';
import { db, type TransactionClient } from '../../db/client';
import { quoteLines, quoteVersions, quotes } from '../../db/schema';
import {
  createLineTx,
  softDeleteLineTx,
  updateLineTx,
} from '../../repositories/lines.repo';
import {
  createQuote,
  getById as getQuoteById,
  list as listQuotes,
  restore as restoreQuote,
  softDelete as softDeleteQuote,
  updateMeta as updateQuoteMeta,
} from '../../repositories/quotes.repo';
import { acceptQuoteOnPaper, undoAcceptance } from '../../repositories/acceptance.repo';
import {
  createVersionWithLinesTx,
  duplicateVersionTx,
  listVersionsTx,
  setCurrentVersionTx,
} from '../../repositories/versions.repo';
import { HttpError } from '../../utils/http-error';
import { logActivity, logActivityTx } from '../../repositories/activities.repo';
import { upsertPublicLinkTx, deletePublicLinkByQuoteIdTx } from '../../repositories/public-links.repo';
import { hashPin } from '../../services/pin-hash.service';
import { computeVersionDiffTx } from '../../services/version-diff.service';

const router = Router();

router.get(
  '/:quoteId/versions/:fromVersionId/diff/:toVersionId',
  asyncHandler(async (req, res) => {
    const { quoteId, fromVersionId, toVersionId } = req.params;

    const diff = await db.transaction(async (tx) => {
      await assertVersionOwnership(tx, quoteId, fromVersionId);
      await assertVersionOwnership(tx, quoteId, toVersionId);

      return computeVersionDiffTx(tx, fromVersionId, toVersionId);
    });

    res.json({ data: diff });
  }),
);

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

function asyncHandler(handler: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

async function ensureQuoteExists(quoteId: string): Promise<void> {
  const existing = await db.query.quotes.findFirst({
    where: (quote, { eq: equals, isNull: nullCheck }) =>
      equals(quote.id, quoteId) && nullCheck(quote.deletedAt),
  });

  if (!existing) {
    throw new HttpError(404, 'quote_not_found', 'Quote not found.');
  }
}

async function assertQuoteExistsTx(tx: TransactionClient, quoteId: string): Promise<void> {
  const [existing] = await tx
    .select({ id: quotes.id })
    .from(quotes)
    .where(and(eq(quotes.id, quoteId), isNull(quotes.deletedAt)))
    .limit(1);

  if (!existing) {
    throw new HttpError(404, 'quote_not_found', 'Quote not found.');
  }
}

async function assertVersionOwnership(
  tx: TransactionClient,
  quoteId: string,
  versionId: string,
) {
  const [version] = await tx
    .select()
    .from(quoteVersions)
    .where(
      and(
        eq(quoteVersions.id, versionId),
        eq(quoteVersions.quoteId, quoteId),
        isNull(quoteVersions.deletedAt),
      ),
    )
    .limit(1);

  if (!version) {
    throw new HttpError(404, 'version_not_found', 'Version not found.');
  }

  return version;
}

async function assertLineOwnership(
  tx: TransactionClient,
  quoteId: string,
  versionId: string,
  lineId: string,
) {
  const [line] = await tx
    .select()
    .from(quoteLines)
    .where(and(eq(quoteLines.id, lineId), isNull(quoteLines.deletedAt)))
    .limit(1);

  if (!line || line.versionId !== versionId) {
    throw new HttpError(404, 'line_not_found', 'Line not found.');
  }

  await assertVersionOwnership(tx, quoteId, versionId);

  return line;
}

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = parseQuoteCreate(req.body);
    const { id } = await createQuote(payload);

    const aggregate = await getQuoteById(id);
    if (!aggregate) {
      throw new HttpError(500, 'quote_load_failed', 'Unable to load created quote.');
    }

    res.status(201).json({ data: aggregate });
  }),
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filters = parseQuoteListQuery(req.query as Record<string, unknown>);
    const quotesList = await listQuotes(filters);

    res.json({ data: quotesList });
  }),
);

router.get(
  '/:quoteId',
  asyncHandler(async (req, res) => {
    const { quoteId } = req.params;
    const aggregate = await getQuoteById(quoteId);

    if (!aggregate) {
      throw new HttpError(404, 'quote_not_found', 'Quote not found.');
    }

    await logActivity({
      quoteId,
      versionId: aggregate.currentVersion?.id ?? null,
      type: 'view',
      metadata: { source: 'v1/quotes/:quoteId' },
    });

    res.json({ data: aggregate });
  }),
);

router.post(
  '/:quoteId/accept-paper',
  asyncHandler(async (req, res) => {
    const { quoteId } = req.params;
    const payload = parseAdminPaperAcceptance(req.body);

    const aggregate = await acceptQuoteOnPaper(quoteId, payload);

    res.json({ data: aggregate });
  }),
);

router.post(
  '/:quoteId/acceptance/undo',
  asyncHandler(async (req, res) => {
    const { quoteId } = req.params;

    const aggregate = await undoAcceptance(quoteId);

    res.json({ data: aggregate });
  }),
);

router.get(
  '/:quoteId/acceptance-summary',
  asyncHandler(async (req, res) => {
    const { quoteId } = req.params;
    const aggregate = await getQuoteById(quoteId);

    if (!aggregate) {
      throw new HttpError(404, 'quote_not_found', 'Quote not found.');
    }

    const { quote } = aggregate;

    res.json({
      data: {
        status: quote.status,
        acceptance_mode: quote.acceptanceMode ?? null,
        accepted_at: quote.acceptedAt ?? null,
        accepted_by_name: quote.acceptedByName ?? null,
      },
    });
  }),
);

router.post(
  '/:quoteId/public-link',
  asyncHandler(async (req, res) => {
    const { quoteId } = req.params;
    const payload = parseAdminPublicLinkUpdate(req.body);

    const result = await db.transaction(async (tx) => {
      await assertQuoteExistsTx(tx, quoteId);

      if (!payload.enabled) {
        await deletePublicLinkByQuoteIdTx(tx, quoteId);

        await logActivityTx(tx, {
          quoteId,
          versionId: null,
          type: 'public_link_updated',
          metadata: {
            enabled: false,
          },
        });

        return {
          enabled: false,
          token: null,
          pin_protected: false,
        } as const;
      }

      const token = randomBytes(32).toString('hex');
      const pinHash = typeof payload.pin === 'string' ? hashPin(payload.pin) : null;

      const link = await upsertPublicLinkTx(tx, {
        quoteId,
        token,
        pinHash,
      });

      await logActivityTx(tx, {
        quoteId,
        versionId: null,
        type: 'public_link_updated',
        metadata: {
          enabled: true,
          pin_protected: !!pinHash,
          rotated: true,
        },
      });

      return {
        enabled: true,
        token: link.token,
        pin_protected: !!link.pinHash,
      } as const;
    });

    res.json({ data: result });
  }),
);

router.patch(
  '/:quoteId',
  asyncHandler(async (req, res) => {
    const { quoteId } = req.params;
    const patch = parseQuoteUpdate(req.body);

    await updateQuoteMeta(quoteId, patch);

    const aggregate = await getQuoteById(quoteId);
    if (!aggregate) {
      throw new HttpError(404, 'quote_not_found', 'Quote not found.');
    }

    res.json({ data: aggregate });
  }),
);

router.delete(
  '/:quoteId',
  asyncHandler(async (req, res) => {
    const { quoteId } = req.params;
    await softDeleteQuote(quoteId);
    res.status(204).send();
  }),
);

router.post(
  '/:quoteId/restore',
  asyncHandler(async (req, res) => {
    const { quoteId } = req.params;
    await restoreQuote(quoteId);
    res.status(204).send();
  }),
);

router.get(
  '/:quoteId/versions',
  asyncHandler(async (req, res) => {
    const { quoteId } = req.params;
    await ensureQuoteExists(quoteId);

    const versions = await db.transaction(async (tx) => listVersionsTx(tx, quoteId));

    res.json({ data: versions });
  }),
);

router.post(
  '/:quoteId/versions',
  asyncHandler(async (req, res) => {
    const { quoteId } = req.params;
    const payload = parseVersionCreate({ ...req.body, quote_id: quoteId });

    const version = await db.transaction(async (tx) => {
      await assertQuoteExistsTx(tx, quoteId);

      if (payload.from_version_id) {
        const duplicated = await duplicateVersionTx(tx, payload.from_version_id);
        if (duplicated.quoteId !== quoteId) {
          throw new HttpError(404, 'version_not_found', 'Base version not found for quote.');
        }

        return duplicated;
      }

      return createVersionWithLinesTx(tx, quoteId, { version: {}, lines: [] });
    });

    res.status(201).json({ data: version });
  }),
);

router.post(
  '/:quoteId/versions/:versionId/publish',
  asyncHandler(async (req, res) => {
    const { quoteId, versionId } = req.params;

    await db.transaction(async (tx) => {
      await assertVersionOwnership(tx, quoteId, versionId);
      await setCurrentVersionTx(tx, versionId);

      await logActivityTx(tx, {
        quoteId,
        versionId,
        type: 'version_published',
        metadata: { source: 'v1/quotes:publish' },
      });
    });

    res.status(204).send();
  }),
);

router.post(
  '/:quoteId/versions/:versionId/lines',
  asyncHandler(async (req, res) => {
    const { quoteId, versionId } = req.params;
    const payload = parseLineCreate(req.body);

    const line = await db.transaction(async (tx) => {
      await assertVersionOwnership(tx, quoteId, versionId);
      const created = await createLineTx(tx, versionId, payload);

      await logActivityTx(tx, {
        quoteId,
        versionId,
        type: 'line_changed',
        metadata: { operation: 'create', lineId: created.id },
      });

      return created;
    });

    res.status(201).json({ data: line });
  }),
);

router.patch(
  '/:quoteId/versions/:versionId/lines/:lineId',
  asyncHandler(async (req, res) => {
    const { quoteId, versionId, lineId } = req.params;
    const payload = parseLineUpdate(req.body);

    const line = await db.transaction(async (tx) => {
      await assertLineOwnership(tx, quoteId, versionId, lineId);
      const updated = await updateLineTx(tx, lineId, payload);

      await logActivityTx(tx, {
        quoteId,
        versionId,
        type: 'line_changed',
        metadata: { operation: 'update', lineId },
      });

      return updated;
    });

    res.json({ data: line });
  }),
);

router.delete(
  '/:quoteId/versions/:versionId/lines/:lineId',
  asyncHandler(async (req, res) => {
    const { quoteId, versionId, lineId } = req.params;

    await db.transaction(async (tx) => {
      await assertLineOwnership(tx, quoteId, versionId, lineId);
      await softDeleteLineTx(tx, lineId);

      await logActivityTx(tx, {
        quoteId,
        versionId,
        type: 'line_changed',
        metadata: { operation: 'delete', lineId },
      });
    });

    res.status(204).send();
  }),
);

export default router;
