import { DiscountType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import type { CreateVoucherInput } from '../validators/voucher.validator';

export const calculateDiscount = (
  type: DiscountType,
  discount: number,
  amount: number
): number =>
  type === 'PERCENTAGE'
    ? Math.floor((amount * discount) / 100)
    : Math.min(discount, amount);

export const createVoucher = async (organizerId: string, data: CreateVoucherInput) => {
  const event = await prisma.event.findUnique({ where: { id: data.eventId } });
  if (!event) throw new AppError('Event not found', 404);
  if (event.organizerId !== organizerId) {
    throw new AppError('Forbidden: you do not own this event', 403);
  }
  if (event.status !== 'ACTIVE') {
    throw new AppError('Cannot create voucher for a non-active event', 400);
  }

  // code bersifat unik global (@unique), jadi cek terhadap semua event
  const existing = await prisma.voucher.findUnique({ where: { code: data.code } });
  if (existing) throw new AppError('Voucher code already in use', 409);

  return prisma.voucher.create({ data });
};

export const validateVoucher = async (code: string, eventId: string, amount = 0) => {
  const voucher = await prisma.voucher.findUnique({ where: { code } });
  if (!voucher || voucher.eventId !== eventId) {
    throw new AppError('Voucher not found for this event', 404);
  }

  const now = new Date();
  if (now < voucher.startDate) throw new AppError('Voucher is not active yet', 400);
  if (now > voucher.endDate) throw new AppError('Voucher has expired', 400);
  if (voucher.usedCount >= voucher.maxUsage) {
    throw new AppError('Voucher usage limit reached', 400);
  }

  return {
    id: voucher.id,
    code: voucher.code,
    discount: voucher.discount,
    discountType: voucher.discountType,
    discountAmount: calculateDiscount(voucher.discountType, voucher.discount, amount),
    isValid: true,
  };
};

export const validateCoupon = async (userId: string, code: string, amount = 0) => {
  const coupon = await prisma.coupon.findUnique({ where: { code } });
  // Samakan pesan agar tidak membocorkan keberadaan kupon milik user lain
  if (!coupon || coupon.userId !== userId) throw new AppError('Coupon not found', 404);
  if (coupon.isUsed) throw new AppError('Coupon has already been used', 400);
  if (coupon.expiredAt < new Date()) throw new AppError('Coupon has expired', 400);

  return {
    id: coupon.id,
    code: coupon.code,
    discount: coupon.discount,
    discountType: coupon.discountType,
    discountAmount: calculateDiscount(coupon.discountType, coupon.discount, amount),
    expiredAt: coupon.expiredAt,
    isValid: true,
  };
};

export const getEventVouchers = async (eventId: string, organizerId: string) => {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new AppError('Event not found', 404);
  if (event.organizerId !== organizerId) {
    throw new AppError('Forbidden: you do not own this event', 403);
  }

  return prisma.voucher.findMany({
    where: { eventId },
    orderBy: { createdAt: 'desc' },
  });
};
