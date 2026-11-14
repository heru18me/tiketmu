import { Router } from 'express';
import * as eventController from '../controllers/event.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import { uploadEventImage } from '../middlewares/upload.middleware';

const router = Router();

// Route statis HARUS sebelum '/:id'
router.get('/', eventController.getEvents);
router.get('/categories', eventController.getCategories);
router.get(
  '/organizer/my-events',
  authenticate,
  requireRole('ORGANIZER'),
  eventController.getOrganizerEvents
);
router.get('/:id', eventController.getEventById);

router.post(
  '/',
  authenticate,
  requireRole('ORGANIZER'),
  uploadEventImage.single('image'),
  eventController.createEvent
);
router.put(
  '/:id',
  authenticate,
  requireRole('ORGANIZER'),
  uploadEventImage.single('image'),
  eventController.updateEvent
);
router.delete('/:id', authenticate, requireRole('ORGANIZER'), eventController.deleteEvent);

export default router;
