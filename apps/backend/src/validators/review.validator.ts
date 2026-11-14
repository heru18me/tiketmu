import { z } from 'zod';

export const createReviewSchema = z.object({
  eventId: z.string().min(1, 'eventId is required'),
  rating: z.coerce.number().int().min(1, 'Rating must be 1-5').max(5, 'Rating must be 1-5'),
  comment: z.string().trim().max(1000, 'Comment is too long').optional(),
});

export const reviewListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type ReviewListQuery = z.infer<typeof reviewListQuerySchema>;
