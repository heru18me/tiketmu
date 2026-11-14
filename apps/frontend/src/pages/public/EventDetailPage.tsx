import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { api } from '../../lib/axios'
import { formatDate, formatIDR, resolveImageUrl } from '../../lib/utils'
import { useAuthStore } from '../../stores/authStore'
import type { ApiResponse, EventDetail } from '../../types'
import MainLayout from '../../components/layout/MainLayout'
import CheckoutModal from '../../components/event/CheckoutModal'
import ReviewSection from '../../components/event/ReviewSection'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import Spinner from '../../components/ui/Spinner'
import StarRating from '../../components/ui/StarRating'

interface Result {
  id: string
  event: EventDetail | null
  notFound: boolean
  ended: boolean
}

const DESCRIPTION_LIMIT = 400

const statusStyle: Record<string, string> = {
  ACTIVE: '!bg-green-100 !text-green-800',
  CANCELLED: '!bg-red-100 !text-red-800',
  COMPLETED: '!bg-gray-200 !text-gray-700',
}
const statusLabel: Record<string, string> = { ACTIVE: 'Aktif', CANCELLED: 'Dibatalkan', COMPLETED: 'Selesai' }

export default function EventDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)

  const [result, setResult] = useState<Result | null>(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let cancelled = false
    api
      .get<ApiResponse<EventDetail>>(`/events/${id}`)
      .then((res) => {
        if (cancelled) return
        const event = res.data.data
        setResult({ id, event, notFound: false, ended: new Date(event.endDate).getTime() < Date.now() })
      })
      .catch((error) => {
        if (!cancelled) {
          setResult({ id, event: null, notFound: isAxiosError(error) && error.response?.status === 404, ended: false })
        }
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const loading = result?.id !== id

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center py-32">
          <Spinner size="lg" />
        </div>
      </MainLayout>
    )
  }

  if (!result?.event) {
    return (
      <MainLayout>
        <EmptyState
          title={result?.notFound ? 'Event tidak ditemukan' : 'Gagal memuat event'}
          subtitle={result?.notFound ? 'Event ini tidak ada atau sudah dihapus.' : 'Terjadi kesalahan. Coba muat ulang halaman.'}
          actionLabel="Lihat Semua Event"
          onAction={() => navigate('/events')}
        />
      </MainLayout>
    )
  }

  const { event, ended } = result
  const image = resolveImageUrl(event.imageUrl)
  const organizerAvatar = resolveImageUrl(event.organizer.avatar)
  const soldOut = event.availableSeats <= 0
  const startingPrice = event.ticketTypes.length
    ? Math.min(...event.ticketTypes.map((t) => t.price))
    : event.price
  const longDescription = event.description.length > DESCRIPTION_LIMIT

  // Alasan tombol beli tidak aktif (null = boleh beli)
  const isOrganizer = user?.role === 'ORGANIZER'
  const blockedReason = isOrganizer
    ? 'Organizer tidak bisa membeli tiket'
    : event.status !== 'ACTIVE'
      ? 'Event tidak tersedia'
      : ended
        ? 'Event telah berakhir'
        : soldOut
          ? 'Tiket habis'
          : null

  const handleBuy = () => {
    if (!user) {
      navigate('/login', { state: { from: location } })
      return
    }
    setCheckoutOpen(true)
  }

  const buyBox = (
    <div className="space-y-3">
      <div>
        <p className="text-xs text-gray-500">Harga tiket mulai dari</p>
        <p className={`text-2xl font-extrabold ${event.isFree ? 'text-green-600' : 'text-primary-600'}`}>
          {event.isFree || startingPrice === 0 ? 'GRATIS' : formatIDR(startingPrice)}
        </p>
      </div>
      <Button
        size="lg"
        className="w-full"
        disabled={!!blockedReason && !!user}
        title={blockedReason && user ? blockedReason : undefined}
        onClick={handleBuy}
      >
        {blockedReason && user && !isOrganizer ? blockedReason : 'Beli Tiket'}
      </Button>
      {isOrganizer && <p className="text-center text-xs text-gray-500">{blockedReason}</p>}
    </div>
  )

  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 pb-32 sm:px-6 lg:px-8 lg:pb-8">
        <div className="aspect-video overflow-hidden rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-500">
          {image && <img src={image} alt={event.name} className="h-full w-full object-cover" />}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <div className="space-y-10 lg:col-span-2">
            {/* Info */}
            <section>
              <div className="flex flex-wrap gap-2">
                <Badge>{event.category.name}</Badge>
                <Badge className={statusStyle[event.status]}>{statusLabel[event.status]}</Badge>
              </div>
              <h1 className="mt-3 text-3xl font-extrabold text-gray-900">{event.name}</h1>
              {event.reviewCount > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <StarRating rating={event.avgRating} showValue />
                  <span className="text-sm text-gray-500">({event.reviewCount} ulasan)</span>
                </div>
              )}

              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium uppercase text-gray-400">Tanggal & Waktu</dt>
                  <dd className="mt-1 text-sm text-gray-800">
                    {formatDate(event.startDate)}
                    <br />
                    <span className="text-gray-500">s.d. {formatDate(event.endDate)}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-gray-400">Lokasi</dt>
                  <dd className="mt-1 flex gap-1.5 text-sm text-gray-800">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
                      <circle cx="12" cy="10" r="2.5" />
                    </svg>
                    <span>
                      {event.location}, {event.city}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-gray-400">Harga</dt>
                  <dd className="mt-1 text-sm font-semibold text-gray-800">
                    {event.isFree ? 'GRATIS' : formatIDR(event.price)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-gray-400">Kursi</dt>
                  <dd className="mt-1 text-sm text-gray-800">
                    {event.availableSeats} tersisa dari {event.totalSeats}
                  </dd>
                </div>
              </dl>
            </section>

            {/* Ticket types */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">Tipe Tiket</h2>
              <Card className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Tipe</th>
                      <th className="px-4 py-3">Harga</th>
                      <th className="px-4 py-3 text-right">Tersedia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {event.ticketTypes.map((t) => (
                      <tr key={t.id}>
                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-900">{t.name}</span>
                          {t.description && <span className="block text-xs text-gray-500">{t.description}</span>}
                        </td>
                        <td className="px-4 py-3">{t.price === 0 ? 'GRATIS' : formatIDR(t.price)}</td>
                        <td className="px-4 py-3 text-right">
                          {t.availableSeats > 0 ? t.availableSeats : <span className="text-red-600">Habis</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </section>

            {/* Deskripsi */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">Deskripsi</h2>
              <p className="mt-3 whitespace-pre-line break-words text-gray-600">
                {longDescription && !expanded
                  ? `${event.description.slice(0, DESCRIPTION_LIMIT).trimEnd()}…`
                  : event.description}
              </p>
              {longDescription && (
                <button
                  type="button"
                  onClick={() => setExpanded((e) => !e)}
                  className="mt-2 text-sm font-medium text-primary-600 hover:underline"
                >
                  {expanded ? 'Tampilkan lebih sedikit' : 'Baca selengkapnya'}
                </button>
              )}
            </section>

            {/* Organizer */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">Penyelenggara</h2>
              <Card className="mt-4 flex items-center gap-4 p-5">
                {organizerAvatar ? (
                  <img src={organizerAvatar} alt="" className="h-14 w-14 rounded-full object-cover" />
                ) : (
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary-100 text-xl font-bold text-secondary-700">
                    {event.organizer.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <div>
                  <p className="font-semibold text-gray-900">{event.organizer.name}</p>
                  <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                    <StarRating rating={event.organizer.avgRating} size="sm" />
                    <span>
                      {event.organizer.totalReviews > 0 ? event.organizer.avgRating.toFixed(1) : 'Belum ada rating'}
                    </span>
                    <span>·</span>
                    <span>{event.organizer.totalEvents} event</span>
                  </div>
                </div>
              </Card>
            </section>

            {/* Voucher */}
            {event.activeVouchers.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900">Voucher Aktif</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {event.activeVouchers.map((v) => (
                    <div key={v.id} className="rounded-xl border-2 border-dashed border-secondary-300 bg-secondary-50 p-4">
                      <p className="font-mono text-lg font-bold text-secondary-700">{v.code}</p>
                      <p className="text-sm text-gray-700">
                        Diskon {v.discountType === 'PERCENTAGE' ? `${v.discount}%` : formatIDR(v.discount)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Berlaku s.d. {new Date(v.endDate).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <ReviewSection
              eventId={event.id}
              avgRating={event.avgRating}
              reviewCount={event.reviewCount}
              initialReviews={event.reviews}
            />
          </div>

          {/* Sticky buy box (desktop) */}
          <aside className="hidden lg:block">
            <Card className="sticky top-24 p-6">{buyBox}</Card>
          </aside>
        </div>
      </div>

      {/* Buy bar (mobile) */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white p-4 shadow-lg lg:hidden">
        {buyBox}
      </div>

      {checkoutOpen && <CheckoutModal event={event} onClose={() => setCheckoutOpen(false)} />}
    </MainLayout>
  )
}
