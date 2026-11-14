import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/axios'
import { calcSummary } from '../../lib/pricing'
import { formatIDR, getErrorMessage } from '../../lib/utils'
import type { ApiResponse, Coupon, DiscountType, EventDetail, Transaction, User } from '../../types'
import Button from '../ui/Button'
import ConfirmDialog from '../ui/ConfirmDialog'
import Modal from '../ui/Modal'
import Spinner from '../ui/Spinner'

interface CheckoutModalProps {
  event: EventDetail
  onClose: () => void
}

type Profile = User & { coupons: Coupon[] }
interface AppliedVoucher {
  code: string
  discount: number
  discountType: DiscountType
}

const MAX_QTY = 10

const discountLabel = (d: { discount: number; discountType: DiscountType }) =>
  d.discountType === 'PERCENTAGE' ? `${d.discount}%` : formatIDR(d.discount)

export default function CheckoutModal({ event, onClose }: CheckoutModalProps) {
  const navigate = useNavigate()

  const firstAvailable = event.ticketTypes.find((t) => t.availableSeats > 0)
  const [ticketTypeId, setTicketTypeId] = useState(firstAvailable?.id ?? '')
  const [quantity, setQuantity] = useState(1)

  const [voucherInput, setVoucherInput] = useState('')
  const [voucher, setVoucher] = useState<AppliedVoucher | null>(null)
  const [voucherError, setVoucherError] = useState('')
  const [voucherLoading, setVoucherLoading] = useState(false)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileError, setProfileError] = useState(false)
  const [couponId, setCouponId] = useState('')
  const [usePoints, setUsePoints] = useState(false)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Kupon & saldo poin terbaru milik user
  useEffect(() => {
    let cancelled = false
    api
      .get<ApiResponse<Profile>>('/users/me')
      .then((res) => !cancelled && setProfile(res.data.data))
      .catch(() => !cancelled && setProfileError(true))
    return () => {
      cancelled = true
    }
  }, [])

  const ticket = event.ticketTypes.find((t) => t.id === ticketTypeId)
  const maxQty = ticket ? Math.min(MAX_QTY, ticket.availableSeats) : 1
  const coupon = profile?.coupons.find((c) => c.id === couponId) ?? null
  const pointsBalance = profile?.totalActivePoints ?? 0

  const summary = calcSummary({
    price: ticket?.price ?? 0,
    quantity,
    voucher,
    coupon,
    usePoints,
    pointsBalance,
  })

  const selectTicket = (id: string) => {
    const t = event.ticketTypes.find((x) => x.id === id)
    setTicketTypeId(id)
    if (t) setQuantity((q) => Math.min(q, Math.min(MAX_QTY, t.availableSeats)))
  }

  const applyVoucher = async () => {
    const code = voucherInput.trim().toUpperCase()
    if (!code) return
    setVoucherLoading(true)
    setVoucherError('')
    try {
      const res = await api.get<ApiResponse<AppliedVoucher>>('/vouchers/validate', {
        params: { code, eventId: event.id, amount: summary.subtotal },
      })
      const { discount, discountType } = res.data.data
      setVoucher({ code, discount, discountType })
    } catch (error) {
      setVoucher(null)
      setVoucherError(getErrorMessage(error, 'Voucher tidak valid'))
    } finally {
      setVoucherLoading(false)
    }
  }

  const removeVoucher = () => {
    setVoucher(null)
    setVoucherInput('')
    setVoucherError('')
  }

  const submit = async () => {
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await api.post<ApiResponse<Transaction>>('/transactions', {
        eventId: event.id,
        ticketTypeId,
        quantity,
        ...(voucher && { voucherCode: voucher.code }),
        ...(coupon && { couponCode: coupon.code }),
        ...(summary.pointsUsed > 0 && { usePoints: summary.pointsUsed }),
      })
      navigate(`/customer/transactions/${res.data.data.id}`)
    } catch (error) {
      setConfirmOpen(false)
      setSubmitError(getErrorMessage(error, 'Gagal membuat transaksi'))
      setSubmitting(false)
    }
  }

  const row = 'flex justify-between text-sm'

  return (
    <>
      <Modal isOpen onClose={submitting ? () => undefined : onClose} title="Beli Tiket" size="md">
        <div className="space-y-6">
          <p className="text-sm font-medium text-gray-900">{event.name}</p>

          {/* Ticket type */}
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-gray-900">Pilih Tiket</legend>
            <div className="space-y-2">
              {event.ticketTypes.map((t) => {
                const soldOut = t.availableSeats <= 0
                return (
                  <label
                    key={t.id}
                    className={`flex items-center justify-between rounded-lg border p-3 text-sm ${
                      ticketTypeId === t.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                    } ${soldOut ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="ticketType"
                        checked={ticketTypeId === t.id}
                        disabled={soldOut}
                        onChange={() => selectTicket(t.id)}
                        className="accent-primary-600"
                      />
                      <span>
                        <span className="block font-medium text-gray-900">{t.name}</span>
                        <span className="text-xs text-gray-500">
                          {soldOut ? 'Habis' : `${t.availableSeats} tersedia`}
                        </span>
                      </span>
                    </span>
                    <span className="font-semibold text-gray-900">
                      {t.price === 0 ? 'GRATIS' : formatIDR(t.price)}
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          {/* Quantity */}
          <div>
            <p className="mb-2 text-sm font-semibold text-gray-900">Jumlah</p>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                aria-label="Kurangi jumlah"
                disabled={quantity <= 1}
                onClick={() => setQuantity((q) => q - 1)}
              >
                −
              </Button>
              <input
                type="number"
                min={1}
                max={maxQty}
                value={quantity}
                aria-label="Jumlah tiket"
                onChange={(e) => {
                  const n = Math.floor(Number(e.target.value))
                  if (Number.isFinite(n)) setQuantity(Math.min(Math.max(n, 1), maxQty))
                }}
                className="w-16 rounded-lg border border-gray-300 py-1.5 text-center text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
              />
              <Button
                variant="outline"
                size="sm"
                aria-label="Tambah jumlah"
                disabled={quantity >= maxQty}
                onClick={() => setQuantity((q) => q + 1)}
              >
                +
              </Button>
              <span className="text-xs text-gray-500">Maks. {maxQty} tiket</span>
            </div>
          </div>

          {/* Voucher */}
          <div>
            <p className="mb-2 text-sm font-semibold text-gray-900">Kode Voucher</p>
            {voucher ? (
              <div className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
                <span>
                  <strong>{voucher.code}</strong> terpasang (diskon {discountLabel(voucher)})
                </span>
                <button type="button" onClick={removeVoucher} className="text-xs font-medium underline">
                  Hapus
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={voucherInput}
                  onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                  placeholder="Masukkan kode"
                  aria-label="Kode voucher"
                  className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                />
                <Button
                  variant="outline"
                  onClick={applyVoucher}
                  isLoading={voucherLoading}
                  disabled={!voucherInput.trim()}
                >
                  Pakai
                </Button>
              </div>
            )}
            {voucherError && <p className="mt-1 text-sm text-red-600">{voucherError}</p>}
          </div>

          {/* Kupon & poin */}
          {!profile && !profileError ? (
            <div className="flex justify-center py-2">
              <Spinner size="sm" />
            </div>
          ) : profileError ? (
            <p className="text-sm text-gray-500">Kupon dan poin tidak dapat dimuat.</p>
          ) : (
            profile && (
              <>
                {profile.coupons.length > 0 && (
                  <fieldset>
                    <legend className="mb-2 text-sm font-semibold text-gray-900">Kupon Kamu</legend>
                    <div className="space-y-2">
                      <label className="flex cursor-pointer items-center gap-3 text-sm text-gray-700">
                        <input
                          type="radio"
                          name="coupon"
                          checked={couponId === ''}
                          onChange={() => setCouponId('')}
                          className="accent-primary-600"
                        />
                        Tanpa kupon
                      </label>
                      {profile.coupons.map((c) => (
                        <label
                          key={c.id}
                          className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-3 text-sm"
                        >
                          <input
                            type="radio"
                            name="coupon"
                            checked={couponId === c.id}
                            onChange={() => setCouponId(c.id)}
                            className="accent-primary-600"
                          />
                          <span>
                            <span className="block font-medium text-gray-900">
                              {c.code} · diskon {discountLabel(c)}
                            </span>
                            <span className="text-xs text-gray-500">
                              Berlaku s.d. {new Date(c.expiredAt).toLocaleDateString('id-ID')}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}

                <label
                  className={`flex items-center justify-between rounded-lg border border-gray-200 p-3 text-sm ${
                    pointsBalance > 0 ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                  }`}
                >
                  <span>
                    <span className="block font-medium text-gray-900">Gunakan Poin</span>
                    <span className="text-xs text-gray-500">Saldo aktif: {formatIDR(pointsBalance)}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={usePoints}
                    disabled={pointsBalance <= 0}
                    onChange={(e) => setUsePoints(e.target.checked)}
                    className="h-4 w-4 accent-primary-600"
                  />
                </label>
              </>
            )
          )}

          {/* Ringkasan */}
          <div className="space-y-2 rounded-lg bg-gray-50 p-4">
            <div className={row}>
              <span className="text-gray-600">
                Subtotal ({quantity} × {formatIDR(ticket?.price ?? 0)})
              </span>
              <span>{formatIDR(summary.subtotal)}</span>
            </div>
            {summary.voucherDiscount > 0 && (
              <div className={`${row} text-green-700`}>
                <span>Diskon voucher</span>
                <span>−{formatIDR(summary.voucherDiscount)}</span>
              </div>
            )}
            {summary.couponDiscount > 0 && (
              <div className={`${row} text-green-700`}>
                <span>Diskon kupon</span>
                <span>−{formatIDR(summary.couponDiscount)}</span>
              </div>
            )}
            {summary.pointsUsed > 0 && (
              <div className={`${row} text-green-700`}>
                <span>Poin dipakai</span>
                <span>−{formatIDR(summary.pointsUsed)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold text-gray-900">
              <span>TOTAL</span>
              <span>{summary.total === 0 ? 'GRATIS' : formatIDR(summary.total)}</span>
            </div>
          </div>

          {submitError && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {submitError}
            </p>
          )}

          <Button className="w-full" size="lg" disabled={!ticket} onClick={() => setConfirmOpen(true)}>
            Konfirmasi Pembelian
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={submit}
        isLoading={submitting}
        title="Konfirmasi Pembelian"
        message={`Beli ${quantity} tiket ${ticket?.name ?? ''} dengan total ${formatIDR(summary.total)}? Kamu punya 2 jam untuk mengunggah bukti pembayaran.`}
        confirmText="Ya, Beli"
      />
    </>
  )
}
