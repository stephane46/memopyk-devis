import { Router } from 'express';

import quotesRouter from './quotes';
import publicRouter from './public';
import pdfRouter from './pdf';
import syncRouter from './sync';
import adminRouter from './admin';

const router = Router();

router.use('/quotes', quotesRouter);
router.use('/public', publicRouter);
router.use('/sync', syncRouter);
router.use('/admin', adminRouter);
router.use('/', pdfRouter);

export { router };
export default router;
