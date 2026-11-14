import { z } from 'zod';

export const createVoucherSchema = z
  .object({
    eventId: z.string().min(1, 'eventId is required'),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(4, 'Code must be at least 4 characters')
      .regex(/^[A-Z0-9_-]+$/, 'Code may only contain letters, numbers, - and _'),
    discount: z.coerce.number().int().positive('Discount must be positive'),
    discountType: z.enum(['PERCENTAGE', 'FIXED']),
    maxUsage: z.coerce.number().int().positive('maxUsage must be positive'),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .refine((d) => d.endDate > d.startDate, {
    message: 'endDate must be after startDate',
    path: ['endDate'],
  })
  .refine((d) => d.discountType !== 'PERCENTAGE' || d.discount <= 100, {
    message: 'Percentage discount cannot exceed 100',
    path: ['discount'],
  });

export const validateVoucherQuerySchema = z.object({
  code: z.string().trim().toUpperCase().min(1, 'code is required'),
  eventId: z.string().min(1, 'eventId is required'),
  amount: z.coerce.number().int().min(0).optional(),
});

export const validateCouponQuerySchema = z.object({
  code: z.string().trim().toUpperCase().min(1, 'code is required'),
  amount: z.coerce.number().int().min(0).optional(),
});

export type CreateVoucherInput = z.infer<typeof createVoucherSchema>;
