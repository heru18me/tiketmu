import { useId, useState } from 'react'

interface StarRatingProps {
  /** Nilai 0–5 (boleh desimal, mis. 4.5) */
  rating: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  showValue?: boolean
  /** Jika diisi, bintang bisa diklik (untuk form review) */
  onChange?: (rating: number) => void
}

const sizes = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-7 w-7' }
const STAR_PATH =
  'M10 1.5l2.6 5.3 5.9.9-4.25 4.15 1 5.85L10 14.9l-5.25 2.8 1-5.85L1.5 7.7l5.9-.9L10 1.5z'

function Star({ fill, className, clipId }: { fill: number; className: string; clipId: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y="0" width={20 * fill} height="20" />
        </clipPath>
      </defs>
      <path d={STAR_PATH} className="fill-gray-200" />
      <path d={STAR_PATH} className="fill-yellow-400" clipPath={`url(#${clipId})`} />
    </svg>
  )
}

export default function StarRating({
  rating,
  max = 5,
  size = 'md',
  showValue = false,
  onChange,
}: StarRatingProps) {
  const uid = useId()
  const [hover, setHover] = useState<number | null>(null)
  const value = hover ?? Math.min(Math.max(rating, 0), max)
  const interactive = !!onChange

  return (
    <div
      className="inline-flex items-center gap-0.5"
      role={interactive ? 'radiogroup' : 'img'}
      aria-label={`Rating ${rating} dari ${max}`}
      onMouseLeave={() => setHover(null)}
    >
      {Array.from({ length: max }, (_, i) => {
        const star = (
          <Star
            fill={Math.min(Math.max(value - i, 0), 1)}
            className={sizes[size]}
            clipId={`${uid}-${i}`}
          />
        )
        return interactive ? (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={Math.round(rating) === i + 1}
            aria-label={`${i + 1} bintang`}
            className="rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            onMouseEnter={() => setHover(i + 1)}
            onClick={() => onChange(i + 1)}
          >
            {star}
          </button>
        ) : (
          <span key={i}>{star}</span>
        )
      })}
      {showValue && <span className="ml-1.5 text-sm font-medium text-gray-700">{rating.toFixed(1)}</span>}
    </div>
  )
}
