import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate, requireRole('ORGANIZER'));

router.get('/stats', dashboardController.getDashboardStats);
router.get('/attendees/:eventId', dashboardController.getAttendeeList);

export default router;
