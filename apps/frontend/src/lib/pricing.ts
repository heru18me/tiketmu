import type { DiscountType } from '../types'

interface Discount {
  discount: number
  discountType: DiscountType
}

/** Sama dengan logika backend (voucher.service.calculateDiscount). */
export const calcDiscount = ({ discount, discountType }: Discount, amount: number): number =>
  discountType === 'PERCENTAGE' ? Math.floor((amount * discount) / 100) : Math.min(discount, amount)

interface SummaryInput {
  price: number
  quantity: number
  voucher: Discount | null
  coupon: Discount | null
  usePoints: boolean
  pointsBalance: number
}

/** Urutan sama dengan backend: voucher → kupon → poin, masing-masing atas sisa tagihan. */
export const calcSummary = ({ price, quantity, voucher, coupon, usePoints, pointsBalance }: SummaryInput) => {
  const subtotal = price * quantity
  const voucherDiscount = voucher ? calcDiscount(voucher, subtotal) : 0
  const afterVoucher = subtotal - voucherDiscount
  const couponDiscount = coupon ? calcDiscount(coupon, afterVoucher) : 0
  const afterCoupon = afterVoucher - couponDiscount
  const pointsUsed = usePoints ? Math.min(pointsBalance, afterCoupon) : 0
  return { subtotal, voucherDiscount, couponDiscount, pointsUsed, total: afterCoupon - pointsUsed }
}
