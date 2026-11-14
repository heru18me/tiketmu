import { Response } from 'express';

export const sendSuccess = (
  res: Response,
  data: unknown,
  message = 'Success',
  statusCode = 200
) => {
  res.status(statusCode).json({ success: true, message, data });
};

export const sendPaginated = (
  res: Response,
  data: unknown,
  message = 'Success',
  meta: { total: number; page: number; limit: number; totalPages: number }
) => {
  res.status(200).json({ success: true, message, data, meta });
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 400
) => {
  res.status(statusCode).json({ success: false, message });
};
