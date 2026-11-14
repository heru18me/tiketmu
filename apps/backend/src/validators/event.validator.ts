import { z } from 'zod';

// multipart/form-data mengirim semua field sebagai string,
// jadi boolean dan array perlu di-parse manual.
const booleanFromForm = z.preprocess((v) => {
  if (typeof v === 'string') {
    if (v === 'true') return true;
    if (v === 'false') return false;
  }
  return v;
}, z.boolean());

const jsonArrayFromForm = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => {
    if (typeof v === 'string') {
      try {
        return JSON.parse(v);
      } catch {
        return v; // biarkan Zod menolak sebagai bukan array
      }
    }
    return v;
  }, schema);

export const ticketTypeSchema = z.object({
  name: z.string().trim().min(1, 'Ticket name is required'),
  price: z.coerce.number().int().min(0, 'Price must be >= 0'),
  totalSeats: z.coerce.number().int().positive('Total seats must be positive'),
  description: z.string().trim().optional(),
});

const eventBaseSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  description: z.string().trim().min(1, 'Description is required'),
  location: z.string().trim().min(1, 'Location is required'),
  city: z.string().trim().min(1, 'City is required'),
  categoryId: z.string().min(1, 'Category is required'),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  totalSeats: z.coerce.number().int().positive('Total seats must be positive'),
  price: z.coerce.number().int().min(0, 'Price must be >= 0'),
  isFree: booleanFromForm,
  ticketTypes: jsonArrayFromForm(z.array(ticketTypeSchema).min(1, 'At least one ticket type is required')),
});

export const createEventSchema = eventBaseSchema
  .refine((d) => d.endDate > d.startDate, {
    message: 'endDate must be after startDate',
    path: ['endDate'],
  })
  .refine((d) => d.ticketTypes.reduce((s, t) => s + t.totalSeats, 0) === d.totalSeats, {
    message: 'Sum of ticket type seats must equal totalSeats',
    path: ['ticketTypes'],
  });

// Update: semua field opsional. Validasi lintas-field dilakukan di service
// karena butuh data event yang sudah ada.
export const updateEventSchema = eventBaseSchema.partial();

export const filterEventSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
  city: z.string().trim().optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  startDate: z.coerce.date().optional(),
  sort: z
    .enum(['startDate_asc', 'startDate_desc', 'price_asc', 'price_desc', 'createdAt_desc'])
    .default('createdAt_desc'),
});

export const organizerEventFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(['ACTIVE', 'CANCELLED', 'COMPLETED']).optional(),
  search: z.string().trim().optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type FilterEventInput = z.infer<typeof filterEventSchema>;
export type OrganizerEventFilterInput = z.infer<typeof organizerEventFilterSchema>;
