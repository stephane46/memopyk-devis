import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';

import { parsePublicAcceptance } from '../../api/validators/acceptance';
import { parsePublicPinSubmit } from '../../api/validators/public-links';
import { acceptQuoteOnlineByToken } from '../../repositories/acceptance.repo';
import {
  getPublicQuoteViewByToken,
  verifyPublicPinByToken,
} from '../../repositories/public-access.repo';

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

function asyncHandler(handler: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

const router = Router();

router.get(
  '/quotes/:publicToken',
  asyncHandler(async (req, res) => {
    const { publicToken } = req.params;

    const view = await getPublicQuoteViewByToken(publicToken);

    res.json({ data: view });
  }),
);

router.post(
  '/quotes/:publicToken/accept',
  asyncHandler(async (req, res) => {
    const { publicToken } = req.params;
    const payload = parsePublicAcceptance(req.body);

    const aggregate = await acceptQuoteOnlineByToken(publicToken, payload);

    res.json({ data: aggregate });
  }),
);

router.post(
  '/quotes/:publicToken/pin',
  asyncHandler(async (req, res) => {
    const { publicToken } = req.params;
    const payload = parsePublicPinSubmit(req.body);

    const result = await verifyPublicPinByToken(publicToken, payload);

    res.json({ data: result });
  }),
);

export { router };
export default router;
