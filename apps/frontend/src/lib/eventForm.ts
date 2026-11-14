import { format } from 'date-fns'
import { z } from 'zod'
import type { EventDetail } from '../types'

const ticketSchema = z.object({
  name: z.string().trim().min(1, 'Nama tiket wajib diisi'),
  // optional: field harga dinonaktifkan saat event gratis
  price: z.number({ error: 'Harga tidak valid' }).min(0, 'Harga minimal 0').optional(),
  totalSeats: z.number({ error: 'Jumlah kursi tidak valid' }).int('Harus bilangan bulat').min(1, 'Minimal 1 kursi'),
  description: z.string().trim().optional(),
})

export const eventFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Nama event wajib diisi'),
    categoryId: z.string().min(1, 'Pilih kategori'),
    description: z.string().trim().min(1, 'Deskripsi wajib diisi'),
    location: z.string().trim().min(1, 'Lokasi wajib diisi'),
    city: z.string().trim().min(1, 'Kota wajib diisi'),
    startDate: z.string().min(1, 'Tanggal mulai wajib diisi'),
    endDate: z.string().min(1, 'Tanggal selesai wajib diisi'),
    totalSeats: z.number({ error: 'Jumlah kursi tidak valid' }).int('Harus bilangan bulat').min(1, 'Minimal 1 kursi'),
    isFree: z.boolean(),
    price: z.number({ error: 'Harga tidak valid' }).min(0, 'Harga minimal 0').optional(),
    ticketTypes: z.array(ticketSchema).min(1, 'Minimal 1 tipe tiket'),
  })
  .refine((d) => !d.startDate || !d.endDate || new Date(d.endDate) > new Date(d.startDate), {
    message: 'Tanggal selesai harus setelah tanggal mulai',
    path: ['endDate'],
  })
  .refine((d) => d.ticketTypes.reduce((s, t) => s + (t.totalSeats || 0), 0) === d.totalSeats, {
    message: 'Total kursi semua tipe tiket harus sama dengan Total Seats',
    path: ['ticketTypes'],
  })

export type EventFormValues = z.infer<typeof eventFormSchema>

/** ISO (UTC) → nilai input datetime-local (waktu lokal). */
export const toLocalInput = (iso: string): string => format(new Date(iso), "yyyy-MM-dd'T'HH:mm")

export const defaultEventValues: EventFormValues = {
  name: '',
  categoryId: '',
  description: '',
  location: '',
  city: '',
  startDate: '',
  endDate: '',
  totalSeats: 100,
  isFree: false,
  price: 0,
  ticketTypes: [{ name: 'Regular', price: 0, totalSeats: 100, description: '' }],
}

export const valuesFromEvent = (e: EventDetail): EventFormValues => ({
  name: e.name,
  categoryId: e.category.id,
  description: e.description,
  location: e.location,
  city: e.city,
  startDate: toLocalInput(e.startDate),
  endDate: toLocalInput(e.endDate),
  totalSeats: e.totalSeats,
  isFree: e.isFree,
  price: e.price,
  ticketTypes: e.ticketTypes.map((t) => ({
    name: t.name,
    price: t.price,
    totalSeats: t.totalSeats,
    description: t.description ?? '',
  })),
})

/** Bentuk ticket type yang dibandingkan/dikirim ke API (harga 0 jika event gratis). */
export const normalizeTickets = (v: EventFormValues) =>
  v.ticketTypes.map((t) => ({
    name: t.name.trim(),
    price: v.isFree ? 0 : (t.price ?? 0),
    totalSeats: t.totalSeats,
    ...(t.description?.trim() && { description: t.description.trim() }),
  }))

interface BuildOptions {
  /** false = jangan kirim ticketTypes & totalSeats (backend menolak mengganti ticket types jika sudah ada transaksi) */
  includeTickets?: boolean
}

export const buildEventFormData = (v: EventFormValues, image: File | null, { includeTickets = true }: BuildOptions = {}) => {
  const body = new FormData()
  body.append('name', v.name.trim())
  body.append('categoryId', v.categoryId)
  body.append('description', v.description.trim())
  body.append('location', v.location.trim())
  body.append('city', v.city.trim())
  body.append('startDate', new Date(v.startDate).toISOString())
  body.append('endDate', new Date(v.endDate).toISOString())
  body.append('isFree', String(v.isFree))
  body.append('price', String(v.isFree ? 0 : (v.price ?? 0)))
  if (includeTickets) {
    body.append('totalSeats', String(v.totalSeats))
    body.append('ticketTypes', JSON.stringify(normalizeTickets(v)))
  }
  if (image) body.append('image', image)
  return body
}
