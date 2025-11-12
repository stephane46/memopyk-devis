import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { and, eq, isNull } from 'drizzle-orm';

import { parseLineCreate, parseLineUpdate } from '../../api/validators/lines';
import {
  parseQuoteCreate,
  parseQuoteListQuery,
  parseQuoteUpdate,
} from '../../api/validators/quotes';
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
import {
  createVersionWithLinesTx,
  duplicateVersionTx,
  listVersionsTx,
  setCurrentVersionTx,
} from '../../repositories/versions.repo';
import { HttpError } from '../../utils/http-error';

const router = Router();

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

    res.json({ data: aggregate });
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
      return createLineTx(tx, versionId, payload);
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
      return updateLineTx(tx, lineId, payload);
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
    });

    res.status(204).send();
  }),
);

export default router;
