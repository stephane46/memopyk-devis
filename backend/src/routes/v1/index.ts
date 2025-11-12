import { Router } from 'express';

import quotesRouter from './quotes';

const router = Router();

router.use('/quotes', quotesRouter);

export { router };
export default router;
