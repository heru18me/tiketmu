import { z } from 'zod';

export const createTransactionSchema = z.object({
  eventId: z.string().min(1, 'eventId is required'),
  ticketTypeId: z.string().min(1, 'ticketTypeId is required'),
  quantity: z.coerce.number().int().min(1, 'Minimum 1 ticket').max(10, 'Maximum 10 tickets per transaction'),
  voucherCode: z.string().trim().toUpperCase().min(1).optional(),
  couponCode: z.string().trim().toUpperCase().min(1).optional(),
  usePoints: z.coerce.number().int().min(0).optional(),
});

export const updateTransactionStatusSchema = z.object({
  action: z.enum(['ACCEPT', 'REJECT']),
  reason: z.string().trim().max(500).optional(),
});

const statusEnum = z.enum([
  'WAITING_PAYMENT',
  'WAITING_CONFIRMATION',
  'DONE',
  'REJECTED',
  'EXPIRED',
  'CANCELED',
]);

export const transactionFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: statusEnum.optional(),
  eventId: z.string().optional(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type TransactionFilterInput = z.infer<typeof transactionFilterSchema>;
export type TransactionAction = z.infer<typeof updateTransactionStatusSchema>['action'];
