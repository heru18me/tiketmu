import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

// Pengelompokan bulan/hari memakai WIB (UTC+7), bukan zona waktu server
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Awal bulan (1 = Januari) pada tahun tertentu, dalam WIB, sebagai instant UTC. */
const wibMonthStart = (year: number, monthIndex: number): Date =>
  new Date(Date.UTC(year, monthIndex, 1) - WIB_OFFSET_MS);

/** Komponen tanggal WIB dari sebuah instant. */
const toWib = (d: Date) => new Date(d.getTime() + WIB_OFFSET_MS);

export const getDashboardStats = async (organizerId: string, year: number) => {
  const eventScope = { event: { organizerId } };
  const doneScope = { ...eventScope, status: 'DONE' as const };

  const now = toWib(new Date());
  const curYear = now.getUTCFullYear();
  const curMonth = now.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(curYear, curMonth + 1, 0)).getUTCDate();

  const [totalEvents, totalTransactions, doneTotals, yearTx, monthTx, topGroups] =
    await Promise.all([
      prisma.event.count({ where: { organizerId } }),
      prisma.transaction.count({ where: eventScope }),
      prisma.transaction.aggregate({
        where: doneScope,
        _sum: { finalAmount: true, quantity: true },
      }),
      prisma.transaction.findMany({
        where: {
          ...doneScope,
          createdAt: { gte: wibMonthStart(year, 0), lt: wibMonthStart(year + 1, 0) },
        },
        select: { createdAt: true, finalAmount: true, quantity: true },
      }),
      prisma.transaction.findMany({
        where: {
          ...doneScope,
          createdAt: {
            gte: wibMonthStart(curYear, curMonth),
            lt: wibMonthStart(curYear, curMonth + 1),
          },
        },
        select: { createdAt: true, finalAmount: true },
      }),
      prisma.transaction.groupBy({
        by: ['eventId'],
        where: doneScope,
        _sum: { finalAmount: true, quantity: true },
        orderBy: { _sum: { finalAmount: 'desc' } },
        take: 5,
      }),
    ]);

  // 12 bulan, 0 jika kosong
  const revenueByMonth = MONTHS.map((month) => ({ month, revenue: 0 }));
  const attendeesByMonth = MONTHS.map((month) => ({ month, attendees: 0 }));
  for (const t of yearTx) {
    const m = toWib(t.createdAt).getUTCMonth();
    revenueByMonth[m].revenue += t.finalAmount;
    attendeesByMonth[m].attendees += t.quantity;
  }

  // Semua hari di bulan ini, 0 jika kosong
  const revenueByDay = Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    revenue: 0,
  }));
  for (const t of monthTx) {
    revenueByDay[toWib(t.createdAt).getUTCDate() - 1].revenue += t.finalAmount;
  }

  const events = await prisma.event.findMany({
    where: { id: { in: topGroups.map((g) => g.eventId) } },
    select: { id: true, name: true, startDate: true },
  });
  const byId = new Map(events.map((e) => [e.id, e]));
  const topEvents = topGroups.map((g) => ({
    id: g.eventId,
    name: byId.get(g.eventId)?.name ?? '',
    startDate: byId.get(g.eventId)?.startDate ?? null,
    revenue: g._sum.finalAmount ?? 0,
    attendees: g._sum.quantity ?? 0,
  }));

  return {
    totalEvents,
    totalRevenue: doneTotals._sum.finalAmount ?? 0,
    totalAttendees: doneTotals._sum.quantity ?? 0,
    totalTransactions,
    year,
    revenueByMonth,
    attendeesByMonth,
    revenueByDay,
    topEvents,
  };
};

export const getAttendeeList = async (eventId: string, organizerId: string) => {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new AppError('Event not found', 404);
  if (event.organizerId !== organizerId) {
    throw new AppError('Forbidden: you do not own this event', 403);
  }

  const transactions = await prisma.transaction.findMany({
    where: { eventId, status: 'DONE' },
    include: {
      user: { select: { name: true, email: true } },
      details: { include: { ticketType: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return transactions.map((t) => ({
    transactionId: t.id,
    name: t.user.name,
    email: t.user.email,
    ticketType: t.details.map((d) => d.ticketType.name).join(', '),
    quantity: t.quantity,
    totalPaid: t.finalAmount,
    transactionDate: t.createdAt,
  }));
};
