import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Event } from '../../types'
import { formatDateShort, formatIDR, resolveImageUrl } from '../../lib/utils'
import Badge from '../ui/Badge'
import Card from '../ui/Card'

// Foto fallback (Unsplash) untuk event tanpa gambar; dipilih deterministik dari id event
const FALLBACK_PHOTOS = [
  'photo-1540575467063-178a50c2df87',
  'photo-1492684223066-81342ee5ff30',
  'photo-1501281668745-f7f57925c3b4',
  'photo-1514525253161-7a46d19cd819',
  'photo-1505373877841-8d25f7d46678',
  'photo-1523580494863-6f3031224c94',
  'photo-1475721027785-f74eccf877e2',
  'photo-1511578314322-379afb476865',
]

const fallbackImage = (id: string): string => {
  const hash = [...id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
  return `https://images.unsplash.com/${FALLBACK_PHOTOS[hash % FALLBACK_PHOTOS.length]}?w=400&h=250&fit=crop`
}

export default function EventCard({ event }: { event: Event }) {
  const [failed, setFailed] = useState(false)
  const image = resolveImageUrl(event.imageUrl) ?? fallbackImage(event.id)
  const soldOut = event.availableSeats <= 0

  return (
    <Link to={`/events/${event.id}`} className="group block h-full">
      <Card className="flex h-full flex-col overflow-hidden rounded-xl transition-all duration-300 group-hover:-translate-y-1 group-hover:scale-[1.02] group-hover:shadow-lg">
        <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-primary-500 to-secondary-500">
          {!failed && (
            <img
              src={image}
              alt={event.name}
              loading="lazy"
              onError={() => setFailed(true)}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          )}
          <Badge className="absolute left-3 top-3 !bg-white/90 !text-gray-800">{event.category.name}</Badge>
          <button
            type="button"
            aria-label="Simpan ke wishlist"
            onClick={(e) => e.preventDefault()}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-500 shadow-sm transition-colors hover:text-red-500"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 flex-col p-4">
          <h3 className="line-clamp-2 text-base font-semibold text-gray-900 group-hover:text-blue-600">
            {event.name}
          </h3>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-500">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
            <span className="line-clamp-1">{event.location}, {event.city}</span>
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M4 11h16M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
            </svg>
            {formatDateShort(event.startDate)}
          </p>

          <div className="mt-auto flex items-center justify-between gap-2 border-t border-gray-100 pt-4">
            {event.isFree ? (
              <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold tracking-wide text-green-700">GRATIS</span>
            ) : (
              <span className="text-lg font-bold text-blue-600">{formatIDR(event.price)}</span>
            )}
            {soldOut ? (
              <span className="text-xs font-medium text-red-600">Habis</span>
            ) : event.reviewCount > 0 ? (
              <span className="flex items-center gap-1 text-sm font-medium text-gray-700">
                <svg className="h-4 w-4 text-yellow-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M10 1.5l2.6 5.3 5.9.9-4.25 4.1 1 5.8L10 14.9 4.75 17.6l1-5.8L1.5 7.7l5.9-.9L10 1.5Z" />
                </svg>
                {event.avgRating.toFixed(1)}
                <span className="text-xs font-normal text-gray-400">({event.reviewCount})</span>
              </span>
            ) : (
              <span className="text-xs text-gray-400">Belum ada ulasan</span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  )
}

export function EventCardSkeleton() {
  return (
    <Card className="overflow-hidden" aria-hidden="true">
      <div className="aspect-video animate-pulse bg-gray-200" />
      <div className="space-y-3 p-4">
        <div className="h-5 w-3/4 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200" />
        <div className="h-6 w-1/3 animate-pulse rounded bg-gray-200" />
      </div>
    </Card>
  )
}
