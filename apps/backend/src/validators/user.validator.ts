import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').optional(),
  phoneNumber: z
    .string()
    .trim()
    .regex(/^(\+62|62|0)8[0-9]{7,12}$/, 'Invalid Indonesian phone number')
    .optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: 'New password must be different from the current password',
    path: ['newPassword'],
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
