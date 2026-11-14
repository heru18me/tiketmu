interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

/** Daftar halaman dengan ellipsis, mis. [1, '…', 4, 5, 6, '…', 10] */
const getPages = (current: number, total: number): (number | '…')[] => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = new Set([1, total, current - 1, current, current + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  const result: (number | '…')[] = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) result.push('…')
    result.push(p)
  })
  return result
}

const base =
  'min-w-9 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50'

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <nav aria-label="Paginasi" className="flex flex-wrap items-center justify-center gap-1.5">
      <button
        type="button"
        className={`${base} border-gray-300 bg-white text-gray-700 hover:bg-gray-50`}
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        Sebelumnya
      </button>

      {getPages(currentPage, totalPages).map((p, i) =>
        p === '…' ? (
          <span key={`gap-${i}`} className="px-1 text-gray-400">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            aria-current={p === currentPage ? 'page' : undefined}
            className={`${base} ${
              p === currentPage
                ? 'border-primary-600 bg-primary-600 text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ),
      )}

      <button
        type="button"
        className={`${base} border-gray-300 bg-white text-gray-700 hover:bg-gray-50`}
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Berikutnya
      </button>
    </nav>
  )
}
