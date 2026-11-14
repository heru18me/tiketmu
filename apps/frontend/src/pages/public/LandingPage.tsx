import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../lib/axios'
import type { Category, Event, PaginatedResponse, ApiResponse } from '../../types'
import MainLayout from '../../components/layout/MainLayout'
import EventCard, { EventCardSkeleton } from '../../components/event/EventCard'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'

const categoryIcon = (name: string): string => {
  const n = name.toLowerCase()
  if (n.includes('musik') || n.includes('konser')) return '🎵'
  if (n.includes('tekno')) return '💻'
  if (n.includes('olahraga')) return '⚽'
  if (n.includes('seminar') || n.includes('konferensi')) return '🎤'
  if (n.includes('workshop')) return '🛠️'
  if (n.includes('seni') || n.includes('budaya')) return '🎨'
  if (n.includes('kuliner') || n.includes('makan')) return '🍜'
  return '🎫'
}

const stats = [
  { value: '1000+', label: 'Event' },
  { value: '50+', label: 'Kota' },
  { value: '10000+', label: 'Tiket Terjual' },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const [events, setEvents] = useState<Event[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [eventsError, setEventsError] = useState(false)

  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    let cancelled = false

    // Hanya event yang belum lewat: urut startDate naik tanpa filter akan menampilkan event lama dulu
    api
      .get<PaginatedResponse<Event>>('/events', {
        params: { limit: 6, sort: 'startDate_asc', startDate: new Date().toISOString() },
      })
      .then((res) => !cancelled && setEvents(res.data.data))
      .catch(() => !cancelled && setEventsError(true))
      .finally(() => !cancelled && setEventsLoading(false))

    api
      .get<ApiResponse<Category[]>>('/events/categories')
      .then((res) => !cancelled && setCategories(res.data.data))
      .catch(() => undefined) // section kategori cukup disembunyikan jika gagal

    return () => {
      cancelled = true
    }
  }, [])

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    navigate(q ? `/events?${new URLSearchParams({ search: q })}` : '/events')
  }

  return (
    <MainLayout heroTransparent>
      {/* 1. Hero */}
      <section className="bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-600 px-4 pb-20 pt-32 text-white sm:pb-28 sm:pt-40">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Temukan Event Terbaik di Indonesia
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-white/85">
            Ribuan event menanti. Konser, seminar, workshop, olahraga, dan lebih banyak lagi.
          </p>

          <form onSubmit={handleSearch} className="mx-auto mt-8 flex max-w-xl gap-2" role="search">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari event..."
              aria-label="Cari event"
              className="min-w-0 flex-1 rounded-lg border-0 px-4 py-3 text-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white/60"
            />
            <Button type="submit" size="lg" variant="secondary" className="shrink-0">
              Cari
            </Button>
          </form>

          <Link to="/events" className="mt-6 inline-block">
            <Button size="lg" className="!bg-white !text-primary-700 hover:!bg-gray-100">
              Jelajahi Semua Event
            </Button>
          </Link>
        </div>
      </section>

      {/* 2. Featured events */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Event Mendatang</h2>
        <p className="mt-1 text-gray-500">Jangan sampai kehabisan tiketnya.</p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {eventsLoading ? (
            Array.from({ length: 6 }, (_, i) => <EventCardSkeleton key={i} />)
          ) : (
            events.map((event) => <EventCard key={event.id} event={event} />)
          )}
        </div>

        {!eventsLoading && events.length === 0 && (
          <EmptyState
            title={eventsError ? 'Gagal memuat event' : 'Belum ada event mendatang'}
            subtitle={
              eventsError
                ? 'Terjadi kesalahan saat mengambil data. Coba muat ulang halaman.'
                : 'Event baru akan segera hadir. Cek lagi nanti ya!'
            }
          />
        )}

        <div className="mt-10 text-center">
          <Link to="/events">
            <Button variant="outline" size="lg">
              Lihat Semua Event
            </Button>
          </Link>
        </div>
      </section>

      {/* 3. Kategori */}
      {categories.length > 0 && (
        <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Jelajahi Kategori</h2>
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  to={`/events?${new URLSearchParams({ category: c.name })}`}
                  className="flex flex-col items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-6 text-center transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:bg-primary-50 hover:shadow-sm"
                >
                  <span className="text-3xl" aria-hidden="true">
                    {categoryIcon(c.name)}
                  </span>
                  <span className="text-sm font-medium text-gray-800">{c.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 4. Stats */}
      <section className="bg-gray-900 px-4 py-16 text-white">
        <dl className="mx-auto grid max-w-4xl gap-8 text-center sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col">
              <dt className="order-2 mt-1 text-gray-400">{s.label}</dt>
              <dd className="text-4xl font-extrabold text-white sm:text-5xl">{s.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* 5. CTA organizer */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-2xl bg-gradient-to-r from-secondary-600 to-primary-600 px-6 py-12 text-center text-white sm:px-12">
          <h2 className="text-2xl font-bold sm:text-3xl">Punya Event? Jadilah Organizer</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/85">
            Buat event, jual tiket, dan pantau penjualanmu dalam satu dashboard.
          </p>
          <Link to="/register?role=ORGANIZER" className="mt-8 inline-block">
            <Button size="lg" className="!bg-white !text-secondary-700 hover:!bg-gray-100">
              Daftar sebagai Organizer
            </Button>
          </Link>
        </div>
      </section>
    </MainLayout>
  )
}
