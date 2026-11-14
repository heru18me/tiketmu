import { Router } from 'express';
import * as transactionController from '../controllers/transaction.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import { uploadPaymentProof } from '../middlewares/upload.middleware';

const router = Router();

router.use(authenticate);

router.post('/', requireRole('CUSTOMER'), transactionController.createTransaction);
router.get('/', transactionController.getUserTransactions);
// Route statis HARUS sebelum '/:id'
router.get('/organizer', requireRole('ORGANIZER'), transactionController.getOrganizerTransactions);
router.get('/:id', transactionController.getTransactionById);
router.post(
  '/:id/payment-proof',
  requireRole('CUSTOMER'),
  uploadPaymentProof.single('paymentProof'),
  transactionController.uploadPaymentProof
);
router.put('/:id/status', requireRole('ORGANIZER'), transactionController.updateTransactionStatus);

export default router;
