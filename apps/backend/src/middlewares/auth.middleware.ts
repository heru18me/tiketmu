import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { Role } from '@prisma/client';

export interface AuthPayload {
  userId: string;
  email: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Unauthorized', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthPayload;
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    next(new AppError('Invalid or expired token', 401));
  }
};

export const requireRole = (role: Role) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Unauthorized', 401));
      return;
    }
    if (req.user.role !== role) {
      next(new AppError('Forbidden: insufficient permissions', 403));
      return;
    }
    next();
  };
};
