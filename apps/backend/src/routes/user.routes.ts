import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { uploadAvatar } from '../middlewares/upload.middleware';

const router = Router();

router.use(authenticate);

router.get('/me', userController.getProfile);
router.put('/me', uploadAvatar.single('avatar'), userController.updateProfile);
router.put('/me/password', userController.changePassword);

export default router;
