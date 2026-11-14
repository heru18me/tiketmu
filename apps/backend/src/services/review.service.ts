import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import type { CreateReviewInput, ReviewListQuery } from '../validators/review.validator';

const reviewSelect = {
  id: true,
  rating: true,
  comment: true,
  createdAt: true,
  user: { select: { name: true, avatar: true } },
} as const;

export const createReview = async (userId: string, data: CreateReviewInput) => {
  const { eventId, rating, comment } = data;

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new AppError('Event not found', 404);

  // 1. Harus punya transaksi DONE untuk event ini
  const purchased = await prisma.transaction.findFirst({
    where: { userId, eventId, status: 'DONE' },
    select: { id: true },
  });
  if (!purchased) {
    throw new AppError('You can only review events you have a completed transaction for', 403);
  }

  // 2. Belum pernah review (@@unique([userId, eventId]) menjaga race condition)
  const existing = await prisma.review.findUnique({
    where: { userId_eventId: { userId, eventId } },
    select: { id: true },
  });
  if (existing) throw new AppError('You have already reviewed this event', 409);

  // 3. Buat review
  return prisma.review.create({
    data: { userId, eventId, rating, comment },
    select: reviewSelect,
  });
};

export const getEventReviews = async (eventId: string, query: ReviewListQuery) => {
  const { page, limit } = query;

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
  if (!event) throw new AppError('Event not found', 404);

  const [total, reviews] = await Promise.all([
    prisma.review.count({ where: { eventId } }),
    prisma.review.findMany({
      where: { eventId },
      select: reviewSelect,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return { reviews, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
};
