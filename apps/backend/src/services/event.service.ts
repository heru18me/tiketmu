import fs from 'fs';
import path from 'path';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import type {
  CreateEventInput,
  UpdateEventInput,
  FilterEventInput,
  OrganizerEventFilterInput,
} from '../validators/event.validator';

const IMAGE_URL_PREFIX = '/uploads/events/';

const toImageUrl = (file?: Express.Multer.File): string | undefined =>
  file ? `${IMAGE_URL_PREFIX}${file.filename}` : undefined;

const removeImageFile = (imageUrl?: string | null): void => {
  if (!imageUrl || !imageUrl.startsWith(IMAGE_URL_PREFIX)) return;
  const filePath = path.join(process.cwd(), 'uploads', 'events', path.basename(imageUrl));
  fs.unlink(filePath, () => undefined);
};

const SORT_MAP: Record<FilterEventInput['sort'], Prisma.EventOrderByWithRelationInput> = {
  startDate_asc: { startDate: 'asc' },
  startDate_desc: { startDate: 'desc' },
  price_asc: { price: 'asc' },
  price_desc: { price: 'desc' },
  createdAt_desc: { createdAt: 'desc' },
};

const ratingsByEvent = async (eventIds: string[]) => {
  if (eventIds.length === 0) return new Map<string, { avg: number; count: number }>();
  const groups = await prisma.review.groupBy({
    by: ['eventId'],
    where: { eventId: { in: eventIds } },
    _avg: { rating: true },
    _count: { rating: true },
  });
  return new Map(
    groups.map((g) => [
      g.eventId,
      { avg: Math.round((g._avg.rating ?? 0) * 10) / 10, count: g._count.rating },
    ])
  );
};

const withRatings = async <T extends { id: string }>(events: T[]) => {
  const ratings = await ratingsByEvent(events.map((e) => e.id));
  return events.map((e) => ({
    ...e,
    avgRating: ratings.get(e.id)?.avg ?? 0,
    reviewCount: ratings.get(e.id)?.count ?? 0,
  }));
};

const listInclude = {
  category: true,
  organizer: { select: { id: true, name: true, avatar: true } },
} satisfies Prisma.EventInclude;

export const getEvents = async (filters: FilterEventInput) => {
  const { page, limit, search, category, city, minPrice, maxPrice, startDate, sort } = filters;

  const where: Prisma.EventWhereInput = { status: 'ACTIVE' };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (category) {
    where.category = { name: { equals: category, mode: 'insensitive' } };
  }
  if (city) where.city = { contains: city, mode: 'insensitive' };
  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = { gte: minPrice, lte: maxPrice };
  }
  if (startDate) where.startDate = { gte: startDate };

  const [total, events] = await Promise.all([
    prisma.event.count({ where }),
    prisma.event.findMany({
      where,
      include: listInclude,
      orderBy: SORT_MAP[sort],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    events: await withRatings(events),
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

export const getEventById = async (id: string) => {
  const now = new Date();

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      category: true,
      organizer: { select: { id: true, name: true, avatar: true } },
      ticketTypes: { orderBy: { price: 'asc' } },
      vouchers: {
        where: { startDate: { lte: now }, endDate: { gte: now } },
        select: { id: true, code: true, discount: true, discountType: true, endDate: true, maxUsage: true, usedCount: true },
      },
      reviews: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          user: { select: { name: true, avatar: true } },
        },
      },
    },
  });

  if (!event) throw new AppError('Event not found', 404);

  const [eventRating, organizerRating, organizerTotalEvents] = await Promise.all([
    prisma.review.aggregate({
      where: { eventId: id },
      _avg: { rating: true },
      _count: { rating: true },
    }),
    prisma.review.aggregate({
      where: { event: { organizerId: event.organizerId } },
      _avg: { rating: true },
      _count: { rating: true },
    }),
    prisma.event.count({ where: { organizerId: event.organizerId } }),
  ]);

  const { vouchers, ...rest } = event;

  return {
    ...rest,
    activeVouchers: vouchers
      .filter((v) => v.usedCount < v.maxUsage)
      .map(({ maxUsage, usedCount, ...v }) => v),
    avgRating: Math.round((eventRating._avg.rating ?? 0) * 10) / 10,
    reviewCount: eventRating._count.rating,
    organizer: {
      ...event.organizer,
      avgRating: Math.round((organizerRating._avg.rating ?? 0) * 10) / 10,
      totalReviews: organizerRating._count.rating,
      totalEvents: organizerTotalEvents,
    },
  };
};

export const getCategories = () =>
  prisma.eventCategory.findMany({ orderBy: { name: 'asc' } });

export const createEvent = async (
  organizerId: string,
  data: CreateEventInput,
  imageFile?: Express.Multer.File
) => {
  const category = await prisma.eventCategory.findUnique({ where: { id: data.categoryId } });
  if (!category) throw new AppError('Category not found', 404);

  const { ticketTypes, isFree, price, ...rest } = data;

  try {
    return await prisma.$transaction(async (tx) => {
      return tx.event.create({
        data: {
          ...rest,
          organizerId,
          isFree,
          price: isFree ? 0 : price,
          availableSeats: data.totalSeats,
          imageUrl: toImageUrl(imageFile),
          ticketTypes: {
            create: ticketTypes.map((t) => ({
              name: t.name,
              price: isFree ? 0 : t.price,
              totalSeats: t.totalSeats,
              availableSeats: t.totalSeats,
              description: t.description,
            })),
          },
        },
        include: { ticketTypes: true, category: true },
      });
    });
  } catch (error) {
    // Jangan tinggalkan file yatim jika DB gagal
    removeImageFile(toImageUrl(imageFile));
    throw error;
  }
};

export const updateEvent = async (
  eventId: string,
  organizerId: string,
  data: UpdateEventInput,
  imageFile?: Express.Multer.File
) => {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new AppError('Event not found', 404);
  if (event.organizerId !== organizerId) {
    throw new AppError('Forbidden: you do not own this event', 403);
  }
  if (event.status !== 'ACTIVE') {
    throw new AppError(`Cannot update a ${event.status.toLowerCase()} event`, 400);
  }

  const newImageUrl = toImageUrl(imageFile);

  try {
    if (data.categoryId) {
      const category = await prisma.eventCategory.findUnique({ where: { id: data.categoryId } });
      if (!category) throw new AppError('Category not found', 404);
    }

    const startDate = data.startDate ?? event.startDate;
    const endDate = data.endDate ?? event.endDate;
    if (endDate <= startDate) throw new AppError('endDate must be after startDate', 400);

    const { ticketTypes, ...fields } = data;
    const sold = event.totalSeats - event.availableSeats;
    const totalSeats = data.totalSeats ?? event.totalSeats;
    const isFree = data.isFree ?? event.isFree;

    if (ticketTypes) {
      const sum = ticketTypes.reduce((s, t) => s + t.totalSeats, 0);
      if (sum !== totalSeats) {
        throw new AppError('Sum of ticket type seats must equal totalSeats', 400);
      }
      const txCount = await prisma.transaction.count({ where: { eventId } });
      if (txCount > 0) {
        throw new AppError('Ticket types cannot be replaced once the event has transactions', 409);
      }
    } else if (data.totalSeats !== undefined && data.totalSeats !== event.totalSeats) {
      throw new AppError('Provide ticketTypes when changing totalSeats', 400);
    }
    if (totalSeats < sold) {
      throw new AppError(`totalSeats cannot be lower than seats already sold (${sold})`, 400);
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (ticketTypes) {
        await tx.ticketType.deleteMany({ where: { eventId } });
        await tx.ticketType.createMany({
          data: ticketTypes.map((t) => ({
            eventId,
            name: t.name,
            price: isFree ? 0 : t.price,
            totalSeats: t.totalSeats,
            availableSeats: t.totalSeats,
            description: t.description,
          })),
        });
      }

      return tx.event.update({
        where: { id: eventId },
        data: {
          ...fields,
          ...(data.totalSeats !== undefined && { availableSeats: totalSeats - sold }),
          ...(isFree && { price: 0 }),
          ...(newImageUrl && { imageUrl: newImageUrl }),
        },
        include: { ticketTypes: true, category: true },
      });
    });

    if (newImageUrl) removeImageFile(event.imageUrl);
    return updated;
  } catch (error) {
    removeImageFile(newImageUrl);
    throw error;
  }
};

export const deleteEvent = async (eventId: string, organizerId: string) => {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new AppError('Event not found', 404);
  if (event.organizerId !== organizerId) {
    throw new AppError('Forbidden: you do not own this event', 403);
  }
  if (event.status === 'CANCELLED') throw new AppError('Event already cancelled', 400);

  const activeTx = await prisma.transaction.count({
    where: {
      eventId,
      status: { in: ['WAITING_PAYMENT', 'WAITING_CONFIRMATION'] },
    },
  });
  if (activeTx > 0) {
    throw new AppError('Cannot cancel event with active transactions', 409);
  }

  return prisma.event.update({
    where: { id: eventId },
    data: { status: 'CANCELLED' },
  });
};

export const getOrganizerEvents = async (
  organizerId: string,
  filters: OrganizerEventFilterInput
) => {
  const { page, limit, status, search } = filters;

  const where: Prisma.EventWhereInput = { organizerId };
  if (status) where.status = status;
  if (search) where.name = { contains: search, mode: 'insensitive' };

  const [total, events] = await Promise.all([
    prisma.event.count({ where }),
    prisma.event.findMany({
      where,
      include: listInclude,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    events: await withRatings(events),
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};
