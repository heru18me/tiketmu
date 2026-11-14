import { useEffect, useState } from 'react'
import { api } from '../../lib/axios'
import { formatDateShort, resolveImageUrl } from '../../lib/utils'
import { useAuthStore } from '../../stores/authStore'
import type { PaginatedResponse, Review } from '../../types'
import Button from '../ui/Button'
import EmptyState from '../ui/EmptyState'
import StarRating from '../ui/StarRating'
import ReviewForm from './ReviewForm'

interface ReviewSectionProps {
  eventId: string
  avgRating: number
  reviewCount: number
  initialReviews: Review[] // 10 review terbaru dari detail event
}

const VISIBLE_STEP = 5
const SERVER_PAGE = 10

export default function ReviewSection({ eventId, avgRating, reviewCount, initialReviews }: ReviewSectionProps) {
  const user = useAuthStore((s) => s.user)
  const [reviews, setReviews] = useState(initialReviews)
  const [total, setTotal] = useState(reviewCount)
  const [visible, setVisible] = useState(VISIBLE_STEP)
  const [loadingMore, setLoadingMore] = useState(false)

  const [canReview, setCanReview] = useState(false)

  const isCustomer = user?.role === 'CUSTOMER'

  // Form review hanya untuk customer yang punya transaksi DONE untuk event ini
  useEffect(() => {
    if (!isCustomer) return
    let cancelled = false
    api
      .get<PaginatedResponse<unknown>>('/transactions', { params: { status: 'DONE', eventId, limit: 1 } })
      .then((res) => !cancelled && setCanReview(res.data.data.length > 0))
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [isCustomer, eventId])

  const loadMore = async () => {
    const next = visible + VISIBLE_STEP
    if (next > reviews.length && reviews.length < total) {
      setLoadingMore(true)
      try {
        const page = Math.floor(reviews.length / SERVER_PAGE) + 1
        const res = await api.get<PaginatedResponse<Review>>(`/reviews/event/${eventId}`, {
          params: { page, limit: SERVER_PAGE },
        })
        setReviews((prev) => [...prev, ...res.data.data.filter((r) => !prev.some((p) => p.id === r.id))])
      } catch {
        // biarkan tombol bisa dicoba lagi
      } finally {
        setLoadingMore(false)
      }
    }
    setVisible(next)
  }

  const handleSubmitted = (review: Review) => {
    setReviews((prev) => [review, ...prev])
    setTotal((t) => t + 1)
  }

  const shown = reviews.slice(0, visible)
  const hasMore = visible < reviews.length || reviews.length < total

  return (
    <section aria-labelledby="reviews-title">
      <h2 id="reviews-title" className="text-xl font-bold text-gray-900">
        Ulasan
      </h2>

      <div className="mt-3 flex items-center gap-3">
        <span className="text-3xl font-extrabold text-gray-900">{total > 0 ? avgRating.toFixed(1) : '–'}</span>
        <div>
          <StarRating rating={avgRating} />
          <p className="text-sm text-gray-500">{total} ulasan</p>
        </div>
      </div>

      {canReview && (
        <div className="mt-6">
          <ReviewForm eventId={eventId} onSubmitted={handleSubmitted} />
        </div>
      )}

      {reviews.length === 0 ? (
        <EmptyState title="Belum ada ulasan" subtitle="Jadilah yang pertama memberi ulasan untuk event ini." />
      ) : (
        <ul className="mt-6 space-y-4">
          {shown.map((r) => {
            const avatar = resolveImageUrl(r.user.avatar)
            return (
              <li key={r.id} className="flex gap-3 border-b border-gray-100 pb-4">
                {avatar ? (
                  <img src={avatar} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 font-semibold text-primary-700">
                    {r.user.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3">
                    <span className="font-medium text-gray-900">{r.user.name}</span>
                    <StarRating rating={r.rating} size="sm" />
                    <span className="text-xs text-gray-400">{formatDateShort(r.createdAt)}</span>
                  </div>
                  {r.comment && <p className="mt-1 break-words text-sm text-gray-600">{r.comment}</p>}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {hasMore && reviews.length > 0 && (
        <div className="mt-4 text-center">
          <Button variant="outline" onClick={loadMore} isLoading={loadingMore}>
            Muat Lebih Banyak
          </Button>
        </div>
      )}
    </section>
  )
}
