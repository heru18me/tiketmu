import cron, { ScheduledTask } from 'node-cron';
import { prisma } from '../lib/prisma';
import { rollbackTransaction } from '../services/transaction.service';
import { sendTransactionCancelledEmail } from '../services/mailer.service';

const log = (job: string, message: string) =>
  // eslint-disable-next-line no-console
  console.log(`[cron:${job}] ${new Date().toISOString()} ${message}`);

const logError = (job: string, message: string, error: unknown) =>
  // eslint-disable-next-line no-console
  console.error(`[cron:${job}] ${new Date().toISOString()} ${message}`, error);

/** JOB 1 — WAITING_PAYMENT yang lewat paymentDeadline → EXPIRED. */
export const expireUnpaidTransactions = async (): Promise<number> => {
  const job = 'expire';
  const overdue = await prisma.transaction.findMany({
    where: { status: 'WAITING_PAYMENT', paymentDeadline: { lt: new Date() } },
  });
  log(job, `found ${overdue.length} overdue transaction(s)`);

  let processed = 0;
  for (const transaction of overdue) {
    try {
      await prisma.$transaction(async (tx) => {
        // Guard: lewati jika customer sudah upload bukti di antara query dan sekarang
        const claimed = await tx.transaction.updateMany({
          where: { id: transaction.id, status: 'WAITING_PAYMENT' },
          data: { status: 'EXPIRED' },
        });
        if (claimed.count === 0) return;
        await rollbackTransaction(tx, transaction);
        processed += 1;
      });
    } catch (error) {
      // Satu transaksi gagal tidak boleh menghentikan yang lain
      logError(job, `failed for transaction ${transaction.id}`, error);
    }
  }

  log(job, `expired ${processed} transaction(s)`);
  return processed;
};

/** JOB 2 — WAITING_CONFIRMATION yang lewat confirmDeadline → CANCELED + email. */
export const cancelUnconfirmedTransactions = async (): Promise<number> => {
  const job = 'cancel';
  const overdue = await prisma.transaction.findMany({
    where: { status: 'WAITING_CONFIRMATION', confirmDeadline: { lt: new Date() } },
    include: {
      user: { select: { name: true, email: true } },
      event: { select: { name: true } },
    },
  });
  log(job, `found ${overdue.length} overdue transaction(s)`);

  let processed = 0;
  for (const transaction of overdue) {
    try {
      const done = await prisma.$transaction(async (tx) => {
        // Guard: lewati jika organizer baru saja accept/reject
        const claimed = await tx.transaction.updateMany({
          where: { id: transaction.id, status: 'WAITING_CONFIRMATION' },
          data: { status: 'CANCELED' },
        });
        if (claimed.count === 0) return false;
        await rollbackTransaction(tx, transaction);
        return true;
      });

      if (done) {
        processed += 1;
        // Di luar DB transaction; mailer menelan error sendiri
        void sendTransactionCancelledEmail(
          transaction.user.email,
          transaction.user.name,
          transaction.event.name
        );
      }
    } catch (error) {
      logError(job, `failed for transaction ${transaction.id}`, error);
    }
  }

  log(job, `canceled ${processed} transaction(s)`);
  return processed;
};

/** JOB 3 — Tandai poin yang sudah lewat expiredAt sebagai kedaluwarsa. */
export const expirePoints = async (): Promise<number> => {
  const job = 'points';
  const result = await prisma.point.updateMany({
    where: { expiredAt: { lt: new Date() }, isExpired: false },
    data: { isExpired: true },
  });
  log(job, `marked ${result.count} point record(s) as expired`);
  return result.count;
};

// Bungkus agar error tak terduga (mis. DB mati) tidak menjadi unhandled rejection
const safely = (name: string, fn: () => Promise<number>) => async () => {
  try {
    await fn();
  } catch (error) {
    logError(name, 'job run failed', error);
  }
};

let tasks: ScheduledTask[] = [];

export const startTransactionJobs = (): void => {
  if (tasks.length > 0) return; // cegah double-start
  tasks = [
    cron.schedule('*/5 * * * *', safely('expire', expireUnpaidTransactions)),
    cron.schedule('0 * * * *', safely('cancel', cancelUnconfirmedTransactions)),
    cron.schedule('0 0 * * *', safely('points', expirePoints)),
  ];
  log('init', `started ${tasks.length} job(s)`);
};

export const stopTransactionJobs = (): void => {
  tasks.forEach((t) => t.stop());
  tasks = [];
};
