import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../../lib/axios'
import {
  SORT_OPTIONS,
  countActiveFilters,
  parseFilters,
  serializeFilters,
  toApiParams,
} from '../../lib/eventFilters'
import { useEventStore } from '../../stores/eventStore'
import type { ApiResponse, Category, Event, PaginatedResponse, PaginationMeta } from '../../types'
import MainLayout from '../../components/layout/MainLayout'
import EventCard, { EventCardSkeleton } from '../../components/event/EventCard'
import EventFilter from '../../components/event/EventFilter'
import SearchBar from '../../components/event/SearchBar'
import BottomSheet from '../../components/ui/BottomSheet'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import Pagination from '../../components/ui/Pagination'

const PAGE_SIZE = 12

interface Result {
  key: string
  events: Event[]
  meta: PaginationMeta | null
  error: boolean
}

export default function EventListPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Isi store dari URL SEBELUM render pertama membaca store (mis. datang dari link kategori di landing page)
  useState(() => {
    useEventStore.setState({ filters: parseFilters(searchParams) })
    return true
  })

  const filters = useEventStore((s) => s.filters)
  const setFilters = useEventStore((s) => s.setFilters)
  const resetFilters = useEventStore((s) => s.resetFilters)

  const [categories, setCategories] = useState<Category[]>([])
  const [sheetOpen, setSheetOpen] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const filtersKey = serializeFilters(filters).toString()

  // Store → URL (replace agar tombol back tidak penuh riwayat filter)
  useEffect(() => {
    if (searchParams.toString() !== filtersKey) setSearchParams(new URLSearchParams(filtersKey), { replace: true })
  }, [filtersKey, searchParams, setSearchParams])

  // URL → store, hanya untuk perubahan dari luar (mis. klik link /events di navbar)
  const urlKey = searchParams.toString()
  useEffect(() => {
    const fromUrl = parseFilters(new URLSearchParams(urlKey))
    if (serializeFilters(fromUrl).toString() !== filtersKey) {
      useEventStore.setState({ filters: fromUrl })
    }
    // Sengaja hanya bereaksi pada perubahan URL
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlKey])

  useEffect(() => {
    let cancelled = false
    api
      .get<ApiResponse<Category[]>>('/events/categories')
      .then((res) => !cancelled && setCategories(res.data.data))
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  // Fetch events. "loading" diturunkan dari key hasil terakhir, bukan setState sinkron di effect.
  useEffect(() => {
    let cancelled = false
    api
      .get<PaginatedResponse<Event>>('/events', { params: toApiParams(filters, PAGE_SIZE) })
      .then((res) => {
        if (!cancelled) setResult({ key: filtersKey, events: res.data.data, meta: res.data.meta, error: false })
      })
      .catch(() => {
        if (!cancelled) setResult({ key: filtersKey, events: [], meta: null, error: true })
      })
    return () => {
      cancelled = true
    }
    // filtersKey adalah serialisasi lengkap dari filters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, retryCount])

  const loading = result?.key !== filtersKey
  const handleSearch = useCallback((search: string) => setFilters({ search }), [setFilters])

  const handlePageChange = (page: number) => {
    setFilters({ page })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const activeCount = countActiveFilters(filters)
  const hasAnyFilter = activeCount > 0 || filters.search !== ''

  const filterPanel = (
    <EventFilter filters={filters} categories={categories} onChange={setFilters} onReset={resetFilters} />
  )

  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Jelajahi Event</h1>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <SearchBar value={filters.search} onSearch={handleSearch} />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="lg:hidden" onClick={() => setSheetOpen(true)}>
              Filter{activeCount > 0 && ` (${activeCount})`}
            </Button>
            <select
              aria-label="Urutkan"
              value={filters.sort}
              onChange={(e) => setFilters({ sort: e.target.value })}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 sm:flex-none"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-8 flex gap-8">
          <aside className="hidden w-64 shrink-0 lg:block">
            <div className="sticky top-24 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-gray-900">Filter</h2>
              {filterPanel}
            </div>
          </aside>

          <section className="min-w-0 flex-1" aria-live="polite">
            {!loading && result?.meta && (
              <p className="mb-4 text-sm text-gray-500">{result.meta.total} event ditemukan</p>
            )}

            {loading ? (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }, (_, i) => (
                  <EventCardSkeleton key={i} />
                ))}
              </div>
            ) : result?.error ? (
              <EmptyState
                title="Gagal memuat event"
                subtitle="Terjadi kesalahan saat mengambil data. Coba lagi."
                actionLabel="Coba Lagi"
                onAction={() => {
                  setResult(null)
                  setRetryCount((c) => c + 1)
                }}
              />
            ) : result && result.events.length === 0 ? (
              <EmptyState
                title="Tidak ada event ditemukan"
                subtitle="Coba ubah kata kunci atau filter pencarianmu."
                actionLabel={hasAnyFilter ? 'Reset Filter' : undefined}
                onAction={hasAnyFilter ? resetFilters : undefined}
              />
            ) : (
              <>
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {result?.events.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
                <div className="mt-10">
                  <Pagination
                    currentPage={result?.meta?.page ?? 1}
                    totalPages={result?.meta?.totalPages ?? 1}
                    onPageChange={handlePageChange}
                  />
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      <BottomSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)} title="Filter">
        {filterPanel}
        <Button className="mt-4 w-full" onClick={() => setSheetOpen(false)}>
          Lihat Hasil
        </Button>
      </BottomSheet>
    </MainLayout>
  )
}
