import { Router } from 'express';
import * as voucherController from '../controllers/voucher.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.post('/', authenticate, requireRole('ORGANIZER'), voucherController.createVoucher);
router.get('/validate', authenticate, requireRole('CUSTOMER'), voucherController.validateVoucher);
router.get(
  '/coupon/validate',
  authenticate,
  requireRole('CUSTOMER'),
  voucherController.validateCoupon
);
router.get(
  '/event/:eventId',
  authenticate,
  requireRole('ORGANIZER'),
  voucherController.getEventVouchers
);

export default router;
