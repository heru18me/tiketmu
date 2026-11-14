/* eslint-disable @typescript-eslint/no-explicit-any */
import { prismaMock } from '../__mocks__/prisma'
import * as eventService from '../src/services/event.service'
import { createEventSchema, filterEventSchema } from '../src/validators/event.validator'
import { makeEvent } from './fixtures'

const defaultFilters = filterEventSchema.parse({})

describe('EventService.getEvents', () => {
  beforeEach(() => {
    prismaMock.event.count.mockResolvedValue(0)
    prismaMock.event.findMany.mockResolvedValue([])
    ;(prismaMock.review.groupBy as any).mockResolvedValue([])
  })

  it('tanpa filter: hanya event ACTIVE, urut terbaru, halaman 1 (12 per halaman)', async () => {
    await eventService.getEvents(defaultFilters)

    const args = prismaMock.event.findMany.mock.calls[0][0] as any
    expect(args.where).toEqual({ status: 'ACTIVE' })
    expect(args.orderBy).toEqual({ createdAt: 'desc' })
    expect(args).toMatchObject({ skip: 0, take: 12 })
  })

  it('dengan filter: search, kategori, kota, rentang harga, tanggal, dan sort diterapkan', async () => {
    const startDate = new Date('2030-01-01')
    await eventService.getEvents({
      ...defaultFilters,
      search: 'workshop',
      category: 'teknologi',
      city: 'jakarta',
      minPrice: 1000,
      maxPrice: 500000,
      startDate,
      sort: 'price_asc',
    })

    const args = prismaMock.event.findMany.mock.calls[0][0] as any
    expect(args.where).toMatchObject({
      status: 'ACTIVE',
      OR: [
        { name: { contains: 'workshop', mode: 'insensitive' } },
        { description: { contains: 'workshop', mode: 'insensitive' } },
      ],
      category: { name: { equals: 'teknologi', mode: 'insensitive' } },
      city: { contains: 'jakarta', mode: 'insensitive' },
      price: { gte: 1000, lte: 500000 },
      startDate: { gte: startDate },
    })
    expect(args.orderBy).toEqual({ price: 'asc' })
  })

  it('pagination: skip/take sesuai halaman dan meta dihitung dari total', async () => {
    prismaMock.event.count.mockResolvedValue(23)

    const { meta } = await eventService.getEvents({ ...defaultFilters, page: 3, limit: 5 })

    expect(prismaMock.event.findMany.mock.calls[0][0]).toMatchObject({ skip: 10, take: 5 })
    expect(meta).toEqual({ total: 23, page: 3, limit: 5, totalPages: 5 })
  })

  it('menyertakan avgRating & reviewCount dari data review', async () => {
    prismaMock.event.findMany.mockResolvedValue([makeEvent({ id: 'e1' }), makeEvent({ id: 'e2' })])
    ;(prismaMock.review.groupBy as any).mockResolvedValue([
      { eventId: 'e1', _avg: { rating: 4.25 }, _count: { rating: 8 } },
    ])

    const { events } = await eventService.getEvents(defaultFilters)

    expect(events[0]).toMatchObject({ id: 'e1', avgRating: 4.3, reviewCount: 8 })
    expect(events[1]).toMatchObject({ id: 'e2', avgRating: 0, reviewCount: 0 })
  })
})

describe('EventService.createEvent', () => {
  const input = createEventSchema.parse({
    name: 'Tech Workshop',
    description: 'Workshop React',
    location: 'Jl. Sudirman',
    city: 'Jakarta',
    categoryId: 'cat-1',
    startDate: '2030-12-01T09:00:00Z',
    endDate: '2030-12-01T17:00:00Z',
    totalSeats: 100,
    price: 150000,
    isFree: 'false',
    ticketTypes: JSON.stringify([
      { name: 'Regular', price: 150000, totalSeats: 80 },
      { name: 'VIP', price: 300000, totalSeats: 20 },
    ]),
  })

  it('berhasil: availableSeats = totalSeats dan ticket types ikut dibuat', async () => {
    prismaMock.eventCategory.findUnique.mockResolvedValue({ id: 'cat-1', name: 'Teknologi' })
    prismaMock.event.create.mockResolvedValue(makeEvent())

    await eventService.createEvent('org-1', input)

    const data = (prismaMock.event.create.mock.calls[0][0] as any).data
    expect(data).toMatchObject({ organizerId: 'org-1', totalSeats: 100, availableSeats: 100, price: 150000 })
    expect(data.ticketTypes.create).toEqual([
      expect.objectContaining({ name: 'Regular', totalSeats: 80, availableSeats: 80 }),
      expect.objectContaining({ name: 'VIP', totalSeats: 20, availableSeats: 20 }),
    ])
  })

  it('event gratis: harga event & tiket dipaksa 0', async () => {
    prismaMock.eventCategory.findUnique.mockResolvedValue({ id: 'cat-1', name: 'Teknologi' })
    prismaMock.event.create.mockResolvedValue(makeEvent())

    await eventService.createEvent('org-1', { ...input, isFree: true })

    const data = (prismaMock.event.create.mock.calls[0][0] as any).data
    expect(data.price).toBe(0)
    expect(data.ticketTypes.create.every((t: any) => t.price === 0)).toBe(true)
  })

  it('gagal (404) jika kategori tidak ditemukan', async () => {
    prismaMock.eventCategory.findUnique.mockResolvedValue(null)

    await expect(eventService.createEvent('org-1', input)).rejects.toMatchObject({ statusCode: 404 })
    expect(prismaMock.event.create).not.toHaveBeenCalled()
  })

  it('validasi: totalSeats tidak valid atau tidak sama dengan jumlah kursi tiket ditolak', () => {
    const base = {
      name: 'x', description: 'x', location: 'x', city: 'x', categoryId: 'c',
      startDate: '2030-12-01T09:00:00Z', endDate: '2030-12-01T17:00:00Z', price: 0, isFree: false,
    }
    const tickets = [{ name: 'Regular', price: 0, totalSeats: 10 }]

    expect(createEventSchema.safeParse({ ...base, totalSeats: 0, ticketTypes: tickets }).success).toBe(false)
    expect(createEventSchema.safeParse({ ...base, totalSeats: 50, ticketTypes: tickets }).success).toBe(false)
    expect(createEventSchema.safeParse({ ...base, totalSeats: 10, ticketTypes: tickets }).success).toBe(true)
  })
})

describe('EventService.updateEvent', () => {
  it('berhasil: pemilik event mengubah nama', async () => {
    prismaMock.event.findUnique.mockResolvedValue(makeEvent())
    prismaMock.event.update.mockResolvedValue(makeEvent({ name: 'Nama Baru' }))

    const result = await eventService.updateEvent('event-1', 'org-1', { name: 'Nama Baru' })

    expect(prismaMock.event.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'event-1' }, data: expect.objectContaining({ name: 'Nama Baru' }) }),
    )
    expect(result.name).toBe('Nama Baru')
    expect(prismaMock.ticketType.deleteMany).not.toHaveBeenCalled()
  })

  it('gagal (403) jika bukan milik organizer tersebut', async () => {
    prismaMock.event.findUnique.mockResolvedValue(makeEvent({ organizerId: 'org-lain' }))

    await expect(eventService.updateEvent('event-1', 'org-1', { name: 'X' })).rejects.toMatchObject({
      statusCode: 403,
    })
    expect(prismaMock.event.update).not.toHaveBeenCalled()
  })

  it('gagal (404) jika event tidak ada', async () => {
    prismaMock.event.findUnique.mockResolvedValue(null)

    await expect(eventService.updateEvent('nope', 'org-1', { name: 'X' })).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it('gagal (409) mengganti ticket types jika event sudah punya transaksi', async () => {
    prismaMock.event.findUnique.mockResolvedValue(makeEvent())
    prismaMock.transaction.count.mockResolvedValue(3)

    await expect(
      eventService.updateEvent('event-1', 'org-1', {
        ticketTypes: [{ name: 'Baru', price: 1000, totalSeats: 100 }],
      }),
    ).rejects.toMatchObject({ statusCode: 409 })
    expect(prismaMock.ticketType.deleteMany).not.toHaveBeenCalled()
  })
})
