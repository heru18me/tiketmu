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

function SectionHeading({ label, title }: { label: string; title: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-blue-600">{label}</p>
        <h2 className="mt-1 text-3xl font-bold text-gray-900">{title}</h2>
      </div>
      <Link to="/events" className="shrink-0 text-sm font-medium text-blue-600 hover:text-blue-700">
        Lihat semua →
      </Link>
    </div>
  )
}

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
      .catch((err) => {
        console.error('Gagal memuat event:', err)
        if (!cancelled) setEventsError(true)
      })
      .finally(() => !cancelled && setEventsLoading(false))

    api
      .get<ApiResponse<Category[]>>('/events/categories')
      .then((res) => !cancelled && setCategories(res.data.data))
      .catch((err) => console.error('Gagal memuat kategori:', err)) // section kategori cukup disembunyikan jika gagal

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
      <section className="relative min-h-[600px] overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1400"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 flex min-h-[600px] items-center px-4 pb-16 pt-28">
          <div className="mx-auto w-full max-w-3xl text-center text-white">
            <span className="inline-block rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-sm font-medium backdrop-blur">
              ✨ Ribuan momen menunggu
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
              Temukan Event Terbaik di Indonesia
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-white/85">
              Ribuan event menanti. Konser, seminar, workshop, olahraga, dan lebih banyak lagi.
            </p>

            <form
              onSubmit={handleSearch}
              role="search"
              className="mx-auto mt-8 flex max-w-xl items-center gap-2 rounded-full border border-white/30 bg-white p-1.5 shadow-lg"
            >
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari event..."
                aria-label="Cari event"
                className="min-w-0 flex-1 bg-transparent px-4 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none"
              />
              <Button type="submit" className="shrink-0 !rounded-full !px-6">
                Cari
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* 2. Featured events */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <SectionHeading label="Pilihan Minggu Ini" title="Event Mendatang" />

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
      </section>

      {/* 3. Kategori */}
      {categories.length > 0 && (
        <section className="bg-white px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeading label="Temukan Minatmu" title="Jelajahi Kategori" />
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  to={`/events?${new URLSearchParams({ category: c.name })}`}
                  className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white p-6 text-center transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:shadow-sm"
                >
                  <span className="text-3xl" aria-hidden="true">
                    {categoryIcon(c.name)}
                  </span>
                  <span className="text-sm font-medium text-gray-700">{c.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 4. Stats */}
      <section className="bg-gray-900 px-4 py-16 text-white sm:py-20">
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
