import { Link } from 'react-router-dom'
import type { Event } from '../../types'
import { formatDateShort, formatIDR, resolveImageUrl } from '../../lib/utils'
import Badge from '../ui/Badge'
import Card from '../ui/Card'
import StarRating from '../ui/StarRating'

export default function EventCard({ event }: { event: Event }) {
  const image = resolveImageUrl(event.imageUrl)
  const soldOut = event.availableSeats <= 0

  return (
    <Link to={`/events/${event.id}`} className="group block h-full">
      <Card className="flex h-full flex-col overflow-hidden transition-shadow group-hover:shadow-md">
        <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-primary-500 to-secondary-500">
          {image && (
            <img
              src={image}
              alt={event.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          )}
          <Badge className="absolute left-3 top-3 !bg-white/90 !text-gray-800">{event.category.name}</Badge>
        </div>

        <div className="flex flex-1 flex-col p-4">
          <h3 className="line-clamp-2 text-base font-semibold text-gray-900 group-hover:text-primary-600">
            {event.name}
          </h3>
          <p className="mt-2 text-sm text-gray-500">{formatDateShort(event.startDate)}</p>
          <p className="mt-0.5 line-clamp-1 text-sm text-gray-500">
            {event.location}, {event.city}
          </p>
          {event.reviewCount > 0 && (
            <div className="mt-2 flex items-center gap-1.5">
              <StarRating rating={event.avgRating} size="sm" />
              <span className="text-xs text-gray-500">({event.reviewCount})</span>
            </div>
          )}

          <div className="mt-auto flex items-end justify-between pt-4">
            <span className={`text-lg font-bold ${event.isFree ? 'text-green-600' : 'text-primary-600'}`}>
              {event.isFree ? 'GRATIS' : formatIDR(event.price)}
            </span>
            <span className={`text-xs font-medium ${soldOut ? 'text-red-600' : 'text-gray-500'}`}>
              {soldOut ? 'Habis' : `${event.availableSeats} kursi tersisa`}
            </span>
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
