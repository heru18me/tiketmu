import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/user.service';
import { updateProfileSchema, changePasswordSchema } from '../validators/user.validator';
import { sendSuccess } from '../utils/response';

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await userService.getProfile(req.user!.userId), 'Profile retrieved');
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateProfileSchema.parse(req.body);
    const user = await userService.updateProfile(req.user!.userId, data, req.file);
    sendSuccess(res, user, 'Profile updated');
  } catch (error) {
    // Validasi gagal sebelum service: buang file yang sudah terlanjur diupload
    if (req.file) fs.unlink(req.file.path, () => undefined);
    next(error);
  }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = changePasswordSchema.parse(req.body);
    await userService.changePassword(req.user!.userId, data);
    sendSuccess(res, null, 'Password changed');
  } catch (error) {
    next(error);
  }
};
