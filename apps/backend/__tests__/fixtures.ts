/* eslint-disable @typescript-eslint/no-explicit-any */
// Pabrik data uji. Hasilnya di-cast karena test hanya mengisi field yang relevan.

const future = (ms = 24 * 3600 * 1000) => new Date(Date.now() + ms)
const past = (ms = 24 * 3600 * 1000) => new Date(Date.now() - ms)

export const makeUser = (o: Record<string, unknown> = {}): any => ({
  id: 'user-1',
  email: 'budi@example.com',
  name: 'Budi',
  password: 'hashed',
  role: 'CUSTOMER',
  avatar: null,
  referralCode: 'ABCD1234',
  phoneNumber: null,
  ...o,
})

export const makeEvent = (o: Record<string, unknown> = {}): any => ({
  id: 'event-1',
  organizerId: 'org-1',
  categoryId: 'cat-1',
  name: 'Tech Workshop',
  description: 'Deskripsi',
  location: 'Jl. Sudirman',
  city: 'Jakarta',
  startDate: future(),
  endDate: future(48 * 3600 * 1000),
  availableSeats: 100,
  totalSeats: 100,
  price: 100000,
  isFree: false,
  imageUrl: null,
  status: 'ACTIVE',
  ...o,
})

export const makeTicketType = (o: Record<string, unknown> = {}): any => ({
  id: 'ticket-1',
  eventId: 'event-1',
  name: 'Regular',
  price: 100000,
  availableSeats: 100,
  totalSeats: 100,
  description: null,
  ...o,
})

export const makeVoucher = (o: Record<string, unknown> = {}): any => ({
  id: 'voucher-1',
  eventId: 'event-1',
  code: 'DISC10',
  discount: 10,
  discountType: 'PERCENTAGE',
  maxUsage: 10,
  usedCount: 0,
  startDate: past(),
  endDate: future(),
  ...o,
})

export const makeCoupon = (o: Record<string, unknown> = {}): any => ({
  id: 'coupon-1',
  userId: 'user-1',
  code: 'REF-ABC',
  discount: 10,
  discountType: 'PERCENTAGE',
  expiredAt: future(),
  isUsed: false,
  ...o,
})

export const makeTransaction = (o: Record<string, unknown> = {}): any => ({
  id: 'tx-1',
  userId: 'user-1',
  eventId: 'event-1',
  voucherId: null,
  couponId: null,
  status: 'WAITING_PAYMENT',
  totalAmount: 200000,
  finalAmount: 200000,
  pointsUsed: 0,
  voucherDiscount: 0,
  couponDiscount: 0,
  quantity: 2,
  paymentDeadline: future(2 * 3600 * 1000),
  confirmDeadline: null,
  ...o,
})

export { future, past }
