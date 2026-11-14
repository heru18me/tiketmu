import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { ZodError } from 'zod';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // AppError (known errors)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as unknown as { code: string; meta?: { target?: string[] } };
    if (prismaError.code === 'P2002') {
      res.status(409).json({
        success: false,
        message: `${prismaError.meta?.target?.[0] || 'Field'} already exists`,
      });
      return;
    }
    if (prismaError.code === 'P2025') {
      res.status(404).json({
        success: false,
        message: 'Record not found',
      });
      return;
    }
  }

  // Generic error
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};
