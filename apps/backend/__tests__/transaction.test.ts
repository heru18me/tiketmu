/* eslint-disable @typescript-eslint/no-explicit-any */
import { prismaMock } from '../__mocks__/prisma'
import * as transactionService from '../src/services/transaction.service'
import * as mailer from '../src/services/mailer.service'
import { makeCoupon, makeEvent, makeTicketType, makeTransaction, makeVoucher, future, past } from './fixtures'

const baseInput = { eventId: 'event-1', ticketTypeId: 'ticket-1', quantity: 2 }

/** Siapkan mock untuk jalur sukses createTransaction (harga tiket 100.000 × 2 = 200.000). */
const setupCreate = () => {
  prismaMock.event.findUnique.mockResolvedValue(makeEvent())
  prismaMock.ticketType.findUnique.mockResolvedValue(makeTicketType())
  prismaMock.event.updateMany.mockResolvedValue({ count: 1 })
  prismaMock.ticketType.updateMany.mockResolvedValue({ count: 1 })
  prismaMock.transaction.create.mockImplementation(((args: any) =>
    Promise.resolve({ id: 'tx-new', ...args.data })) as any)
}
const createdData = () => (prismaMock.transaction.create.mock.calls[0][0] as any).data

describe('TransactionService.createTransaction', () => {
  it('berhasil: total, kursi dikunci, deadline bayar 2 jam, detail dibuat', async () => {
    setupCreate()

    await transactionService.createTransaction('user-1', baseInput)

    const data = createdData()
    expect(data).toMatchObject({ userId: 'user-1', totalAmount: 200000, finalAmount: 200000, quantity: 2, pointsUsed: 0 })
    const ms = data.paymentDeadline.getTime() - Date.now()
    expect(ms).toBeGreaterThan(2 * 3600 * 1000 - 5000)
    expect(ms).toBeLessThanOrEqual(2 * 3600 * 1000)
    expect(data.details.create).toMatchObject({ ticketTypeId: 'ticket-1', quantity: 2, price: 100000, subtotal: 200000 })
    expect(prismaMock.event.updateMany).toHaveBeenCalledWith({
      where: { id: 'event-1', availableSeats: { gte: 2 } },
      data: { availableSeats: { decrement: 2 } },
    })
  })

  it('gagal (400) jika kursi tidak cukup', async () => {
    setupCreate()
    prismaMock.event.updateMany.mockResolvedValue({ count: 0 })

    await expect(transactionService.createTransaction('user-1', baseInput)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Not enough seats available',
    })
    expect(prismaMock.transaction.create).not.toHaveBeenCalled()
  })

  it('gagal (400) jika event tidak aktif', async () => {
    setupCreate()
    prismaMock.event.findUnique.mockResolvedValue(makeEvent({ status: 'CANCELLED' }))

    await expect(transactionService.createTransaction('user-1', baseInput)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Event is not active',
    })
    expect(prismaMock.event.updateMany).not.toHaveBeenCalled()
  })

  it('dengan voucher: diskon 10% diterapkan dan usedCount ditambah', async () => {
    setupCreate()
    prismaMock.voucher.findUnique.mockResolvedValue(makeVoucher())
    prismaMock.voucher.updateMany.mockResolvedValue({ count: 1 })

    await transactionService.createTransaction('user-1', { ...baseInput, voucherCode: 'DISC10' })

    expect(createdData()).toMatchObject({ voucherId: 'voucher-1', voucherDiscount: 20000, finalAmount: 180000 })
    expect(prismaMock.voucher.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { usedCount: { increment: 1 } } }),
    )
  })

  it('dengan voucher: gagal (400) jika kuota penuh', async () => {
    setupCreate()
    prismaMock.voucher.findUnique.mockResolvedValue(makeVoucher())
    prismaMock.voucher.updateMany.mockResolvedValue({ count: 0 })

    await expect(
      transactionService.createTransaction('user-1', { ...baseInput, voucherCode: 'DISC10' }),
    ).rejects.toMatchObject({ statusCode: 400, message: 'Voucher usage limit reached' })
  })

  it('dengan kupon: diskon dihitung setelah voucher dan kupon ditandai terpakai', async () => {
    setupCreate()
    prismaMock.voucher.findUnique.mockResolvedValue(makeVoucher()) // 10% → sisa 180.000
    prismaMock.voucher.updateMany.mockResolvedValue({ count: 1 })
    prismaMock.coupon.findUnique.mockResolvedValue(makeCoupon()) // 10% dari 180.000 = 18.000
    prismaMock.coupon.updateMany.mockResolvedValue({ count: 1 })

    await transactionService.createTransaction('user-1', {
      ...baseInput,
      voucherCode: 'DISC10',
      couponCode: 'REF-ABC',
    })

    expect(createdData()).toMatchObject({
      couponId: 'coupon-1',
      voucherDiscount: 20000,
      couponDiscount: 18000,
      finalAmount: 162000,
    })
    expect(prismaMock.coupon.updateMany).toHaveBeenCalledWith({
      where: { id: 'coupon-1', isUsed: false },
      data: { isUsed: true },
    })
  })

  it('dengan kupon: gagal jika milik user lain (404) atau sudah kedaluwarsa (400)', async () => {
    setupCreate()
    prismaMock.coupon.findUnique.mockResolvedValue(makeCoupon({ userId: 'user-lain' }))
    await expect(
      transactionService.createTransaction('user-1', { ...baseInput, couponCode: 'REF-ABC' }),
    ).rejects.toMatchObject({ statusCode: 404 })

    prismaMock.coupon.findUnique.mockResolvedValue(makeCoupon({ expiredAt: past() }))
    await expect(
      transactionService.createTransaction('user-1', { ...baseInput, couponCode: 'REF-ABC' }),
    ).rejects.toMatchObject({ statusCode: 400, message: 'Coupon has expired' })
  })

  it('dengan poin: dipotong FIFO dan tidak melebihi saldo', async () => {
    setupCreate()
    prismaMock.point.aggregate.mockResolvedValue({ _sum: { amount: 50000 } } as any)
    prismaMock.point.findMany.mockResolvedValue([
      { id: 'p1', amount: 20000, expiredAt: future(1000000) },
      { id: 'p2', amount: 30000, expiredAt: future(9000000) },
    ] as any)
    prismaMock.point.updateMany.mockResolvedValue({ count: 1 })

    // minta 100.000 tapi saldo hanya 50.000
    await transactionService.createTransaction('user-1', { ...baseInput, usePoints: 100000 })

    expect(createdData()).toMatchObject({ pointsUsed: 50000, finalAmount: 150000 })
    const calls = prismaMock.point.updateMany.mock.calls.map((c: any) => [c[0].where.id, c[0].data.amount.decrement])
    expect(calls).toEqual([['p1', 20000], ['p2', 30000]]) // record yang lebih cepat kedaluwarsa dulu
  })

  it('dengan poin: tidak melebihi sisa tagihan', async () => {
    setupCreate()
    prismaMock.point.aggregate.mockResolvedValue({ _sum: { amount: 500000 } } as any)
    prismaMock.point.findMany.mockResolvedValue([{ id: 'p1', amount: 500000, expiredAt: future() }] as any)
    prismaMock.point.updateMany.mockResolvedValue({ count: 1 })

    await transactionService.createTransaction('user-1', { ...baseInput, usePoints: 500000 })

    expect(createdData()).toMatchObject({ pointsUsed: 200000, finalAmount: 0 })
  })
})

describe('TransactionService.uploadPaymentProof', () => {
  const file = { filename: 'bukti.png' } as Express.Multer.File

  it('berhasil: status jadi WAITING_CONFIRMATION dengan confirmDeadline 3 hari', async () => {
    prismaMock.transaction.findUnique.mockResolvedValue(makeTransaction())
    prismaMock.transaction.updateMany.mockResolvedValue({ count: 1 })
    prismaMock.transaction.findUniqueOrThrow.mockResolvedValue(makeTransaction({ status: 'WAITING_CONFIRMATION' }))

    const result = await transactionService.uploadPaymentProof('tx-1', 'user-1', file)

    const update = prismaMock.transaction.updateMany.mock.calls[0][0] as any
    expect(update.data.status).toBe('WAITING_CONFIRMATION')
    const ms = update.data.confirmDeadline.getTime() - Date.now()
    expect(ms).toBeGreaterThan(3 * 24 * 3600 * 1000 - 5000)
    expect(prismaMock.paymentProof.create).toHaveBeenCalledWith({
      data: { transactionId: 'tx-1', imageUrl: '/uploads/payments/bukti.png' },
    })
    expect(result.status).toBe('WAITING_CONFIRMATION')
  })

  it('gagal (404) jika transaksi bukan milik user', async () => {
    prismaMock.transaction.findUnique.mockResolvedValue(makeTransaction({ userId: 'user-lain' }))

    await expect(transactionService.uploadPaymentProof('tx-1', 'user-1', file)).rejects.toMatchObject({
      statusCode: 404,
    })
    expect(prismaMock.paymentProof.create).not.toHaveBeenCalled()
  })

  it('gagal (400) jika batas waktu pembayaran sudah lewat', async () => {
    prismaMock.transaction.findUnique.mockResolvedValue(makeTransaction({ paymentDeadline: past(60000) }))

    await expect(transactionService.uploadPaymentProof('tx-1', 'user-1', file)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Payment deadline has passed',
    })
  })

  it('gagal (400) jika status bukan WAITING_PAYMENT atau tanpa file', async () => {
    prismaMock.transaction.findUnique.mockResolvedValue(makeTransaction({ status: 'DONE' }))
    await expect(transactionService.uploadPaymentProof('tx-1', 'user-1', file)).rejects.toMatchObject({ statusCode: 400 })
    await expect(transactionService.uploadPaymentProof('tx-1', 'user-1', undefined)).rejects.toMatchObject({ statusCode: 400 })
  })
})

describe('TransactionService.updateTransactionStatus', () => {
  const waiting = () =>
    makeTransaction({
      status: 'WAITING_CONFIRMATION',
      voucherId: 'voucher-1',
      couponId: 'coupon-1',
      pointsUsed: 5000,
      event: { name: 'Tech Workshop', organizerId: 'org-1' },
      user: { name: 'Budi', email: 'budi@example.com' },
    })

  beforeEach(() => {
    prismaMock.transaction.findUnique.mockResolvedValue(waiting())
    prismaMock.transaction.updateMany.mockResolvedValue({ count: 1 })
    prismaMock.transaction.findUniqueOrThrow.mockResolvedValue(makeTransaction())
    prismaMock.transactionDetail.findMany.mockResolvedValue([{ ticketTypeId: 'ticket-1', quantity: 2 }] as any)
  })

  it('ACCEPT: status DONE, email diterima terkirim, tanpa rollback', async () => {
    await transactionService.updateTransactionStatus('tx-1', 'org-1', 'ACCEPT')

    expect(prismaMock.transaction.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'DONE' } }),
    )
    expect(mailer.sendTransactionAcceptedEmail).toHaveBeenCalledWith(
      'budi@example.com', 'Budi', 'Tech Workshop', 'tx-1',
    )
    expect(mailer.sendTransactionRejectedEmail).not.toHaveBeenCalled()
    expect(prismaMock.event.update).not.toHaveBeenCalled()
  })

  it('REJECT: status REJECTED + rollback kursi, voucher, kupon, dan poin', async () => {
    await transactionService.updateTransactionStatus('tx-1', 'org-1', 'REJECT', 'Bukti tidak jelas')

    expect(prismaMock.transaction.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'REJECTED' } }),
    )
    // kursi kembali (event & ticket type)
    expect(prismaMock.event.update).toHaveBeenCalledWith({
      where: { id: 'event-1' },
      data: { availableSeats: { increment: 2 } },
    })
    expect(prismaMock.ticketType.update).toHaveBeenCalledWith({
      where: { id: 'ticket-1' },
      data: { availableSeats: { increment: 2 } },
    })
    // voucher usedCount berkurang, kupon bisa dipakai lagi
    expect(prismaMock.voucher.updateMany).toHaveBeenCalledWith({
      where: { id: 'voucher-1', usedCount: { gt: 0 } },
      data: { usedCount: { decrement: 1 } },
    })
    expect(prismaMock.coupon.update).toHaveBeenCalledWith({
      where: { id: 'coupon-1' },
      data: { isUsed: false },
    })
    // poin dikembalikan sebagai record baru
    expect((prismaMock.point.create.mock.calls[0][0] as any).data).toMatchObject({ userId: 'user-1', amount: 5000 })
    expect(mailer.sendTransactionRejectedEmail).toHaveBeenCalledWith(
      'budi@example.com', 'Budi', 'Tech Workshop', 'Bukti tidak jelas',
    )
  })

  it('gagal (404) jika event transaksi bukan milik organizer', async () => {
    await expect(transactionService.updateTransactionStatus('tx-1', 'org-lain', 'ACCEPT')).rejects.toMatchObject({
      statusCode: 404,
    })
    expect(prismaMock.transaction.updateMany).not.toHaveBeenCalled()
  })

  it('gagal (400) jika status bukan WAITING_CONFIRMATION', async () => {
    prismaMock.transaction.findUnique.mockResolvedValue({ ...waiting(), status: 'DONE' })

    await expect(transactionService.updateTransactionStatus('tx-1', 'org-1', 'REJECT')).rejects.toMatchObject({
      statusCode: 400,
    })
    expect(prismaMock.event.update).not.toHaveBeenCalled()
  })
})
