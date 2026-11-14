import fs from 'fs';
import path from 'path';
import { Prisma, Transaction } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import { calculateDiscount } from './voucher.service';
import { sendTransactionAcceptedEmail, sendTransactionRejectedEmail } from './mailer.service';
import type {
  CreateTransactionInput,
  TransactionFilterInput,
  TransactionAction,
} from '../validators/transaction.validator';

type Tx = Prisma.TransactionClient;

const PAYMENT_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 jam
const CONFIRM_WINDOW_MS = 3 * 24 * 60 * 60 * 1000; // 3 hari
const POINT_LIFETIME_MONTHS = 3;
const PROOF_URL_PREFIX = '/uploads/payments/';

const detailInclude = {
  event: {
    select: {
      id: true,
      name: true,
      imageUrl: true,
      startDate: true,
      endDate: true,
      location: true,
      city: true,
      organizerId: true,
    },
  },
  details: { include: { ticketType: { select: { id: true, name: true } } } },
  paymentProof: true,
} satisfies Prisma.TransactionInclude;

/**
 * Kurangi poin user secara FIFO (yang paling cepat kedaluwarsa dulu).
 * Mengembalikan jumlah poin yang benar-benar terpakai.
 */
const consumePoints = async (tx: Tx, userId: string, wanted: number): Promise<number> => {
  if (wanted <= 0) return 0;

  const points = await tx.point.findMany({
    where: { userId, isExpired: false, expiredAt: { gt: new Date() }, amount: { gt: 0 } },
    orderBy: { expiredAt: 'asc' },
  });

  let remaining = wanted;
  for (const point of points) {
    if (remaining <= 0) break;
    const take = Math.min(point.amount, remaining);
    // Guard atomik: gagal jika saldo record ini sudah berubah oleh request lain
    const res = await tx.point.updateMany({
      where: { id: point.id, amount: { gte: take } },
      data: { amount: { decrement: take } },
    });
    if (res.count === 0) throw new AppError('Points balance changed, please retry', 409);
    remaining -= take;
  }
  return wanted - remaining;
};

/**
 * Kembalikan semua yang dipakai transaksi: kursi (event + ticket type), voucher,
 * kupon, dan poin. Dipakai oleh REJECT dan oleh cron job (expire/cancel).
 * Harus dipanggil di dalam prisma.$transaction().
 */
export const rollbackTransaction = async (
  tx: Tx,
  transaction: Pick<
    Transaction,
    'id' | 'eventId' | 'userId' | 'voucherId' | 'couponId' | 'pointsUsed' | 'quantity'
  >
): Promise<void> => {
  const details = await tx.transactionDetail.findMany({
    where: { transactionId: transaction.id },
  });

  await tx.event.update({
    where: { id: transaction.eventId },
    data: { availableSeats: { increment: transaction.quantity } },
  });
  for (const d of details) {
    await tx.ticketType.update({
      where: { id: d.ticketTypeId },
      data: { availableSeats: { increment: d.quantity } },
    });
  }

  if (transaction.voucherId) {
    await tx.voucher.updateMany({
      where: { id: transaction.voucherId, usedCount: { gt: 0 } },
      data: { usedCount: { decrement: 1 } },
    });
  }

  if (transaction.couponId) {
    await tx.coupon.update({
      where: { id: transaction.couponId },
      data: { isUsed: false },
    });
  }

  if (transaction.pointsUsed > 0) {
    // Record asal tidak dilacak per transaksi, jadi poin dikembalikan sebagai record baru
    const expiredAt = new Date();
    expiredAt.setMonth(expiredAt.getMonth() + POINT_LIFETIME_MONTHS);
    await tx.point.create({
      data: { userId: transaction.userId, amount: transaction.pointsUsed, expiredAt },
    });
  }
};

export const createTransaction = async (userId: string, data: CreateTransactionInput) => {
  const { eventId, ticketTypeId, quantity, voucherCode, couponCode, usePoints } = data;

  return prisma.$transaction(async (tx) => {
    const now = new Date();

    // 1. Event & ticket type
    const event = await tx.event.findUnique({ where: { id: eventId } });
    if (!event) throw new AppError('Event not found', 404);
    if (event.status !== 'ACTIVE') throw new AppError('Event is not active', 400);
    if (event.endDate <= now) throw new AppError('Event has already ended', 400);
    if (event.organizerId === userId) {
      throw new AppError('You cannot buy tickets for your own event', 400);
    }

    const ticketType = await tx.ticketType.findUnique({ where: { id: ticketTypeId } });
    if (!ticketType || ticketType.eventId !== eventId) {
      throw new AppError('Ticket type not found for this event', 404);
    }

    // 8. Kunci kursi secara atomik (event + ticket type)
    const eventSeats = await tx.event.updateMany({
      where: { id: eventId, availableSeats: { gte: quantity } },
      data: { availableSeats: { decrement: quantity } },
    });
    const ticketSeats = await tx.ticketType.updateMany({
      where: { id: ticketTypeId, availableSeats: { gte: quantity } },
      data: { availableSeats: { decrement: quantity } },
    });
    if (eventSeats.count === 0 || ticketSeats.count === 0) {
      throw new AppError('Not enough seats available', 400);
    }

    // 2. Harga
    const totalAmount = ticketType.price * quantity;
    let remaining = totalAmount;

    // 3. Voucher
    let voucherId: string | undefined;
    let voucherDiscount = 0;
    if (voucherCode) {
      const voucher = await tx.voucher.findUnique({ where: { code: voucherCode } });
      if (!voucher || voucher.eventId !== eventId) {
        throw new AppError('Voucher not found for this event', 404);
      }
      if (now < voucher.startDate) throw new AppError('Voucher is not active yet', 400);
      if (now > voucher.endDate) throw new AppError('Voucher has expired', 400);

      const claimed = await tx.voucher.updateMany({
        where: { id: voucher.id, usedCount: { lt: voucher.maxUsage } },
        data: { usedCount: { increment: 1 } },
      });
      if (claimed.count === 0) throw new AppError('Voucher usage limit reached', 400);

      voucherId = voucher.id;
      voucherDiscount = calculateDiscount(voucher.discountType, voucher.discount, remaining);
      remaining -= voucherDiscount;
    }

    // 4. Kupon
    let couponId: string | undefined;
    let couponDiscount = 0;
    if (couponCode) {
      const coupon = await tx.coupon.findUnique({ where: { code: couponCode } });
      if (!coupon || coupon.userId !== userId) throw new AppError('Coupon not found', 404);
      if (coupon.isUsed) throw new AppError('Coupon has already been used', 400);
      if (coupon.expiredAt < now) throw new AppError('Coupon has expired', 400);

      const claimed = await tx.coupon.updateMany({
        where: { id: coupon.id, isUsed: false },
        data: { isUsed: true },
      });
      if (claimed.count === 0) throw new AppError('Coupon has already been used', 400);

      couponId = coupon.id;
      couponDiscount = calculateDiscount(coupon.discountType, coupon.discount, remaining);
      remaining -= couponDiscount;
    }

    // 5. Poin (FIFO), tidak boleh melebihi sisa tagihan
    let pointsUsed = 0;
    if (usePoints && usePoints > 0) {
      const available = await tx.point.aggregate({
        where: { userId, isExpired: false, expiredAt: { gt: now } },
        _sum: { amount: true },
      });
      const wanted = Math.min(usePoints, available._sum.amount ?? 0, remaining);
      pointsUsed = await consumePoints(tx, userId, wanted);
      remaining -= pointsUsed;
    }

    // 6-7. Total akhir
    const finalAmount = remaining;
    if (finalAmount < 0) throw new AppError('Invalid final amount', 400);

    // 9-10. Transaksi + detail
    return tx.transaction.create({
      data: {
        userId,
        eventId,
        voucherId,
        couponId,
        totalAmount,
        voucherDiscount,
        couponDiscount,
        pointsUsed,
        finalAmount,
        quantity,
        paymentDeadline: new Date(now.getTime() + PAYMENT_WINDOW_MS),
        details: {
          create: {
            ticketTypeId,
            quantity,
            price: ticketType.price,
            subtotal: totalAmount,
          },
        },
      },
      include: detailInclude,
    });
  });
};

export const uploadPaymentProof = async (
  transactionId: string,
  userId: string,
  imageFile?: Express.Multer.File
) => {
  if (!imageFile) throw new AppError('Payment proof image is required', 400);

  const transaction = await prisma.transaction.findUnique({ where: { id: transactionId } });
  if (!transaction || transaction.userId !== userId) {
    throw new AppError('Transaction not found', 404);
  }
  if (transaction.status !== 'WAITING_PAYMENT') {
    throw new AppError('Payment proof can only be uploaded while waiting for payment', 400);
  }
  if (transaction.paymentDeadline < new Date()) {
    throw new AppError('Payment deadline has passed', 400);
  }

  const imageUrl = `${PROOF_URL_PREFIX}${imageFile.filename}`;

  return prisma.$transaction(async (tx) => {
    // Guard atomik terhadap upload ganda / race dengan cron expire
    const moved = await tx.transaction.updateMany({
      where: {
        id: transactionId,
        status: 'WAITING_PAYMENT',
        paymentDeadline: { gte: new Date() },
      },
      data: {
        status: 'WAITING_CONFIRMATION',
        confirmDeadline: new Date(Date.now() + CONFIRM_WINDOW_MS),
      },
    });
    if (moved.count === 0) throw new AppError('Transaction is no longer awaiting payment', 409);

    await tx.paymentProof.create({ data: { transactionId, imageUrl } });

    return tx.transaction.findUniqueOrThrow({
      where: { id: transactionId },
      include: detailInclude,
    });
  });
};

export const updateTransactionStatus = async (
  transactionId: string,
  organizerId: string,
  action: TransactionAction,
  reason?: string
) => {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      event: { select: { name: true, organizerId: true } },
      user: { select: { name: true, email: true } },
    },
  });
  if (!transaction || transaction.event.organizerId !== organizerId) {
    throw new AppError('Transaction not found', 404);
  }
  if (transaction.status !== 'WAITING_CONFIRMATION') {
    throw new AppError('Transaction is not awaiting confirmation', 400);
  }

  const updated = await prisma.$transaction(async (tx) => {
    // Guard atomik agar tidak diproses dua kali (organizer vs cron cancel)
    const claimed = await tx.transaction.updateMany({
      where: { id: transactionId, status: 'WAITING_CONFIRMATION' },
      data: { status: action === 'ACCEPT' ? 'DONE' : 'REJECTED' },
    });
    if (claimed.count === 0) throw new AppError('Transaction is not awaiting confirmation', 409);

    if (action === 'REJECT') await rollbackTransaction(tx, transaction);

    return tx.transaction.findUniqueOrThrow({
      where: { id: transactionId },
      include: detailInclude,
    });
  });

  // Email di luar DB transaction & non-blocking; mailer sudah menelan error sendiri
  const { user, event } = transaction;
  if (action === 'ACCEPT') {
    void sendTransactionAcceptedEmail(user.email, user.name, event.name, transactionId);
  } else {
    void sendTransactionRejectedEmail(user.email, user.name, event.name, reason);
  }

  return updated;
};

const paginate = (total: number, page: number, limit: number) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
});

export const getUserTransactions = async (userId: string, filters: TransactionFilterInput) => {
  const { page, limit, status, eventId } = filters;
  const where: Prisma.TransactionWhereInput = {
    userId,
    ...(status && { status }),
    ...(eventId && { eventId }),
  };

  const [total, transactions] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      include: detailInclude,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return { transactions, meta: paginate(total, page, limit) };
};

export const getOrganizerTransactions = async (
  organizerId: string,
  filters: TransactionFilterInput
) => {
  const { page, limit, status, eventId } = filters;
  const where: Prisma.TransactionWhereInput = {
    event: { organizerId },
    ...(status && { status }),
    ...(eventId && { eventId }),
  };

  const [total, transactions] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      include: { ...detailInclude, user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return { transactions, meta: paginate(total, page, limit) };
};

export const getTransactionById = async (transactionId: string, userId: string) => {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { ...detailInclude, user: { select: { id: true, name: true, email: true } } },
  });
  // 404 untuk transaksi orang lain agar ID tidak bisa di-enumerasi
  if (
    !transaction ||
    (transaction.userId !== userId && transaction.event.organizerId !== userId)
  ) {
    throw new AppError('Transaction not found', 404);
  }
  return transaction;
};

export const removeProofFile = (file?: Express.Multer.File): void => {
  if (!file) return;
  fs.unlink(path.join(process.cwd(), 'uploads', 'payments', file.filename), () => undefined);
};
