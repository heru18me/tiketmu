export type Role = 'CUSTOMER' | 'ORGANIZER'

export type EventStatus = 'ACTIVE' | 'CANCELLED' | 'COMPLETED'

export type TransactionStatus =
  | 'WAITING_PAYMENT'
  | 'WAITING_CONFIRMATION'
  | 'DONE'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELED'

export type DiscountType = 'PERCENTAGE' | 'FIXED'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  avatar: string | null
  referralCode: string
  totalActivePoints: number
  phoneNumber?: string | null
}

export interface Category {
  id: string
  name: string
}

export interface TicketType {
  id: string
  name: string
  price: number
  availableSeats: number
  totalSeats: number
  description: string | null
}

export interface Voucher {
  id: string
  code: string
  discount: number
  discountType: DiscountType
  endDate: string
}

export interface Coupon {
  id: string
  code: string
  discount: number
  discountType: DiscountType
  expiredAt: string
}

export interface Review {
  id: string
  rating: number
  comment: string | null
  createdAt: string
  user: { name: string; avatar: string | null }
}

export interface Event {
  id: string
  name: string
  description: string
  location: string
  city: string
  startDate: string
  endDate: string
  price: number
  isFree: boolean
  availableSeats: number
  totalSeats: number
  imageUrl: string | null
  status: EventStatus
  category: Category
  organizer: { id: string; name: string; avatar: string | null }
  avgRating: number
  reviewCount: number
}

export interface EventDetail extends Event {
  ticketTypes: TicketType[]
  activeVouchers: Voucher[]
  reviews: Review[]
  organizer: Event['organizer'] & {
    avgRating: number
    totalReviews: number
    totalEvents: number
  }
}

export interface Transaction {
  id: string
  status: TransactionStatus
  totalAmount: number
  finalAmount: number
  pointsUsed: number
  voucherDiscount: number
  couponDiscount: number
  quantity: number
  paymentDeadline: string
  confirmDeadline: string | null
  event: Pick<Event, 'id' | 'name' | 'startDate' | 'imageUrl'>
  details: { id: string; quantity: number; price: number; subtotal: number; ticketType: { id: string; name: string } }[]
  paymentProof: { imageUrl: string } | null
  user?: { id: string; name: string; email: string }
  createdAt: string
}

export interface Attendee {
  transactionId: string
  name: string
  email: string
  ticketType: string
  quantity: number
  totalPaid: number
  transactionDate: string
}

export interface DashboardStats {
  totalEvents: number
  totalRevenue: number
  totalAttendees: number
  totalTransactions: number
  year: number
  revenueByMonth: { month: string; revenue: number }[]
  attendeesByMonth: { month: string; attendees: number }[]
  revenueByDay: { day: number; revenue: number }[]
  topEvents: { id: string; name: string; startDate: string | null; revenue: number; attendees: number }[]
}

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: PaginationMeta
}
