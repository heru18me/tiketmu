import { Router } from 'express';
import * as reviewController from '../controllers/review.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.post('/', authenticate, requireRole('CUSTOMER'), reviewController.createReview);
router.get('/event/:eventId', reviewController.getEventReviews);

export default router;
