import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/axios'
import { toast } from '../../lib/toast'
import {
  formatDateShort,
  getErrorMessage,
  getEventStatusBadgeColor,
  getEventStatusLabel,
  resolveImageUrl,
} from '../../lib/utils'
import type { Event, PaginatedResponse, PaginationMeta } from '../../types'
import OrganizerLayout from '../../components/layout/OrganizerLayout'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import EmptyState from '../../components/ui/EmptyState'
import Pagination from '../../components/ui/Pagination'

const PAGE_SIZE = 10
const STATUS_OPTIONS = [
  { value: '', label: 'Semua Status' },
  { value: 'ACTIVE', label: 'Aktif' },
  { value: 'COMPLETED', label: 'Selesai' },
  { value: 'CANCELLED', label: 'Dibatalkan' },
]

interface Result {
  key: string
  events: Event[]
  meta: PaginationMeta | null
  error: boolean
}

const iconBtn =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900'

const Icon = ({ d }: { d: string }) => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
)
const ICON_EDIT = 'M16.9 3.6a2 2 0 0 1 2.8 2.8L8 18l-4 1 1-4L16.9 3.6Z'
const ICON_USERS = 'M17 20h5v-2a4 4 0 0 0-3-3.9M9 20H4v-2a4 4 0 0 1 3-3.9m5-1.1a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm6 0a3 3 0 1 0 0-6m-12 6a3 3 0 1 1 0-6'
const ICON_TRASH = 'M6 7h12m-9 0V4h6v3m-8 0 1 13h8l1-13M10 11v6m4-6v6'

export default function OrganizerEventListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const status = searchParams.get('status') ?? ''
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const requestKey = `${status}:${page}`

  const [result, setResult] = useState<Result | null>(null)
  const [reloadCount, setReloadCount] = useState(0)

  const [toDelete, setToDelete] = useState<Event | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false
    api
      .get<PaginatedResponse<Event>>('/events/organizer/my-events', {
        params: { page, limit: PAGE_SIZE, ...(status && { status }) },
      })
      .then((res) => !cancelled && setResult({ key: requestKey, events: res.data.data, meta: res.data.meta, error: false }))
      .catch(() => !cancelled && setResult({ key: requestKey, events: [], meta: null, error: true }))
    return () => {
      cancelled = true
    }
    // requestKey mencakup status & page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey, reloadCount])

  const loading = result?.key !== requestKey

  const setFilter = (next: { status?: string; page?: number }) => {
    const s = next.status ?? status
    const p = next.page ?? 1
    setSearchParams({ ...(s && { status: s }), ...(p > 1 && { page: String(p) }) })
  }

  const handleDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await api.delete(`/events/${toDelete.id}`)
      toast.success('Event dibatalkan')
      setToDelete(null)
      // Jika baris terakhir di halaman ini dibatalkan & difilter, mundur satu halaman agar tidak kosong
      if (result?.events.length === 1 && page > 1 && status) setFilter({ page: page - 1 })
      else setReloadCount((c) => c + 1)
    } catch (error) {
      setToDelete(null)
      toast.error(getErrorMessage(error, 'Gagal menghapus event'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <OrganizerLayout>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Event Saya</h1>
        <Link to="/organizer/events/create">
          <Button>+ Buat Event Baru</Button>
        </Link>
      </div>

      <div className="mt-6">
        <select
          aria-label="Filter status"
          value={status}
          onChange={(e) => setFilter({ status: e.target.value })}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <Card className="mt-4 overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-5" aria-hidden="true">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="h-14 animate-pulse rounded bg-gray-100" />
            ))}
          </div>
        ) : result?.error ? (
          <EmptyState
            title="Gagal memuat event"
            subtitle="Terjadi kesalahan saat mengambil data."
            actionLabel="Coba Lagi"
            onAction={() => {
              setResult(null)
              setReloadCount((c) => c + 1)
            }}
          />
        ) : result && result.events.length === 0 ? (
          <EmptyState
            title={status ? 'Tidak ada event dengan status ini' : 'Belum ada event'}
            subtitle={status ? 'Coba pilih status lain.' : 'Buat event pertamamu dan mulai jual tiket.'}
            actionLabel={status ? undefined : 'Buat Event Baru'}
            onAction={status ? undefined : () => navigate('/organizer/events/create')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Seats</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {result?.events.map((e) => {
                  const image = resolveImageUrl(e.imageUrl)
                  const cancelled = e.status === 'CANCELLED'
                  return (
                    <tr key={e.id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-16 shrink-0 overflow-hidden rounded bg-gradient-to-br from-primary-500 to-secondary-500">
                            {image && <img src={image} alt="" className="h-full w-full object-cover" />}
                          </div>
                          <span className="min-w-40 font-medium text-gray-900">{e.name}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">{formatDateShort(e.startDate)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                        {e.availableSeats} / {e.totalSeats}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={getEventStatusBadgeColor(e.status)}>{getEventStatusLabel(e.status)}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Link to={`/organizer/events/${e.id}/edit`} className={iconBtn} title="Edit" aria-label={`Edit ${e.name}`}>
                            <Icon d={ICON_EDIT} />
                          </Link>
                          <Link
                            to={`/organizer/events/${e.id}/attendees`}
                            className={iconBtn}
                            title="Lihat attendee"
                            aria-label={`Lihat attendee ${e.name}`}
                          >
                            <Icon d={ICON_USERS} />
                          </Link>
                          <button
                            type="button"
                            className={`${iconBtn} !text-red-600 hover:!bg-red-50 disabled:cursor-not-allowed disabled:opacity-40`}
                            title={cancelled ? 'Event sudah dibatalkan' : 'Hapus'}
                            aria-label={`Hapus ${e.name}`}
                            disabled={cancelled}
                            onClick={() => {
                              setToDelete(e)
                            }}
                          >
                            <Icon d={ICON_TRASH} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {!loading && result?.meta && (
        <div className="mt-6">
          <Pagination
            currentPage={result.meta.page}
            totalPages={result.meta.totalPages}
            onPageChange={(p) => setFilter({ page: p })}
          />
        </div>
      )}

      <ConfirmDialog
        isOpen={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
        isLoading={deleting}
        title="Hapus Event"
        message={`Event “${toDelete?.name ?? ''}” akan dibatalkan dan tidak bisa dibeli lagi. Event dengan transaksi yang masih berjalan tidak dapat dihapus.`}
        confirmText="Ya, Hapus"
      />
    </OrganizerLayout>
  )
}
