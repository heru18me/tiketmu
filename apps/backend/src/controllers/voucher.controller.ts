import { Request, Response, NextFunction } from 'express';
import * as voucherService from '../services/voucher.service';
import {
  createVoucherSchema,
  validateVoucherQuerySchema,
  validateCouponQuerySchema,
} from '../validators/voucher.validator';
import { sendSuccess } from '../utils/response';

export const createVoucher = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createVoucherSchema.parse(req.body);
    const voucher = await voucherService.createVoucher(req.user!.userId, data);
    sendSuccess(res, voucher, 'Voucher created', 201);
  } catch (error) {
    next(error);
  }
};

export const validateVoucher = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, eventId, amount } = validateVoucherQuerySchema.parse(req.query);
    sendSuccess(res, await voucherService.validateVoucher(code, eventId, amount), 'Voucher is valid');
  } catch (error) {
    next(error);
  }
};

export const validateCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, amount } = validateCouponQuerySchema.parse(req.query);
    sendSuccess(
      res,
      await voucherService.validateCoupon(req.user!.userId, code, amount),
      'Coupon is valid'
    );
  } catch (error) {
    next(error);
  }
};

export const getEventVouchers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(
      res,
      await voucherService.getEventVouchers(req.params.eventId, req.user!.userId),
      'Vouchers retrieved'
    );
  } catch (error) {
    next(error);
  }
};
