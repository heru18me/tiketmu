import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../../lib/axios'
import { formatDateTime, formatIDR, getErrorMessage, getStatusLabel, resolveImageUrl } from '../../lib/utils'
import type {
  ApiResponse,
  Event,
  PaginatedResponse,
  PaginationMeta,
  Transaction,
  TransactionStatus,
} from '../../types'
import OrganizerLayout from '../../components/layout/OrganizerLayout'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import Pagination from '../../components/ui/Pagination'

const PAGE_SIZE = 10
const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Semua Status' },
  { value: 'WAITING_CONFIRMATION', label: 'Menunggu Konfirmasi' },
  { value: 'DONE', label: 'Selesai' },
  { value: 'REJECTED', label: 'Ditolak' },
  { value: 'CANCELED', label: 'Dibatalkan' },
]

interface Result {
  key: string
  items: Transaction[]
  meta: PaginationMeta | null
  error: boolean
}

interface PendingAction {
  transaction: Transaction
  action: 'ACCEPT' | 'REJECT'
}

const selectClass =
  'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200'

export default function OrganizerTransactionListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status = searchParams.get('status') ?? ''
  const eventId = searchParams.get('eventId') ?? ''
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const requestKey = `${status}:${eventId}:${page}`

  const [events, setEvents] = useState<Pick<Event, 'id' | 'name'>[]>([])
  const [result, setResult] = useState<Result | null>(null)
  const [reloadCount, setReloadCount] = useState(0)

  const [proof, setProof] = useState<Transaction | null>(null)
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [processing, setProcessing] = useState(false)
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Dropdown event milik organizer
  useEffect(() => {
    let cancelled = false
    api
      .get<PaginatedResponse<Event>>('/events/organizer/my-events', { params: { limit: 100 } })
      .then((res) => !cancelled && setEvents(res.data.data))
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    api
      .get<PaginatedResponse<Transaction>>('/transactions/organizer', {
        params: { page, limit: PAGE_SIZE, ...(status && { status }), ...(eventId && { eventId }) },
      })
      .then((res) => !cancelled && setResult({ key: requestKey, items: res.data.data, meta: res.data.meta, error: false }))
      .catch(() => !cancelled && setResult({ key: requestKey, items: [], meta: null, error: true }))
    return () => {
      cancelled = true
    }
    // requestKey mencakup status, eventId & page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey, reloadCount])

  const loading = result?.key !== requestKey

  const setFilter = (next: { status?: string; eventId?: string; page?: number }) => {
    const s = next.status ?? status
    const e = next.eventId ?? eventId
    const p = next.page ?? 1
    setSearchParams({ ...(s && { status: s }), ...(e && { eventId: e }), ...(p > 1 && { page: String(p) }) })
  }

  const runAction = async () => {
    if (!pending) return
    setProcessing(true)
    setActionMessage(null)
    const { transaction, action } = pending
    try {
      await api.put<ApiResponse<Transaction>>(`/transactions/${transaction.id}/status`, { action })
      setActionMessage({
        type: 'success',
        text: action === 'ACCEPT' ? 'Transaksi diterima.' : 'Transaksi ditolak dan pesanan dikembalikan.',
      })
      setPending(null)
      // Jika baris terakhir pada halaman >1 berpindah keluar dari filter, mundur satu halaman
      if (result?.items.length === 1 && page > 1 && status) setFilter({ page: page - 1 })
      else setReloadCount((c) => c + 1)
    } catch (error) {
      setActionMessage({ type: 'error', text: getErrorMessage(error, 'Gagal memproses transaksi') })
      setPending(null)
      setReloadCount((c) => c + 1) // status mungkin sudah berubah (mis. dibatalkan otomatis)
    } finally {
      setProcessing(false)
    }
  }

  const proofUrl = resolveImageUrl(proof?.paymentProof?.imageUrl)

  return (
    <OrganizerLayout>
      <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Transaksi</h1>

      <div className="mt-6 flex flex-wrap gap-3">
        <select aria-label="Filter status" value={status} onChange={(e) => setFilter({ status: e.target.value })} className={selectClass}>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter event"
          value={eventId}
          onChange={(e) => setFilter({ eventId: e.target.value })}
          className={`${selectClass} max-w-xs`}
        >
          <option value="">Semua Event</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </div>

      {actionMessage && (
        <p
          role={actionMessage.type === 'error' ? 'alert' : 'status'}
          className={`mt-4 rounded-lg px-4 py-3 text-sm ${actionMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}
        >
          {actionMessage.text}
        </p>
      )}

      <Card className="mt-4 overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-5" aria-hidden="true">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="h-14 animate-pulse rounded bg-gray-100" />
            ))}
          </div>
        ) : result?.error ? (
          <EmptyState
            title="Gagal memuat transaksi"
            subtitle="Terjadi kesalahan saat mengambil data."
            actionLabel="Coba Lagi"
            onAction={() => {
              setResult(null)
              setReloadCount((c) => c + 1)
            }}
          />
        ) : result && result.items.length === 0 ? (
          <EmptyState
            title="Tidak ada transaksi"
            subtitle={status || eventId ? 'Coba ubah filter yang dipilih.' : 'Transaksi dari customer akan muncul di sini.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Tiket</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Total Bayar</th>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {result?.items.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-3">
                      <span className="block font-medium text-gray-900">{t.user?.name ?? '-'}</span>
                      <span className="block text-xs text-gray-500">{t.user?.email}</span>
                    </td>
                    <td className="min-w-40 px-4 py-3 text-gray-700">{t.event.name}</td>
                    <td className="px-4 py-3 text-gray-700">{t.details[0]?.ticketType.name ?? '-'}</td>
                    <td className="px-4 py-3 text-right">{t.quantity}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium">
                      {t.finalAmount === 0 ? 'GRATIS' : formatIDR(t.finalAmount)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">{formatDateTime(t.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={t.status as TransactionStatus}>{getStatusLabel(t.status)}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {t.status === 'WAITING_CONFIRMATION' ? (
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => setProof(t)}>
                            Lihat Bukti
                          </Button>
                          <Button
                            size="sm"
                            className="!bg-green-600 hover:!bg-green-700 focus-visible:!ring-green-500"
                            onClick={() => setPending({ transaction: t, action: 'ACCEPT' })}
                          >
                            Terima
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => setPending({ transaction: t, action: 'REJECT' })}>
                            Tolak
                          </Button>
                        </div>
                      ) : (
                        <span className="text-gray-400">–</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {!loading && result?.meta && (
        <div className="mt-6">
          <Pagination currentPage={result.meta.page} totalPages={result.meta.totalPages} onPageChange={(p) => setFilter({ page: p })} />
        </div>
      )}

      {/* Lightbox bukti bayar */}
      <Modal isOpen={proof !== null} onClose={() => setProof(null)} title="Bukti Pembayaran" size="lg">
        {proofUrl ? (
          <img src={proofUrl} alt="Bukti pembayaran" className="mx-auto max-h-[70vh] rounded-lg object-contain" />
        ) : (
          <p className="py-8 text-center text-sm text-gray-500">Bukti pembayaran tidak tersedia.</p>
        )}
        {proof && (
          <p className="mt-3 text-center text-sm text-gray-500">
            {proof.user?.name} · {formatIDR(proof.finalAmount)}
          </p>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={runAction}
        isLoading={processing}
        title={pending?.action === 'ACCEPT' ? 'Terima Transaksi' : 'Tolak Transaksi'}
        message={
          pending?.action === 'ACCEPT'
            ? `Terima pembayaran ${pending.transaction.user?.name ?? 'customer'} sebesar ${formatIDR(pending.transaction.finalAmount)}? Customer akan diberi tahu lewat email.`
            : `Tolak transaksi ${pending?.transaction.user?.name ?? 'customer'}? Kursi, poin, kupon, dan voucher akan dikembalikan, dan customer diberi tahu lewat email.`
        }
        confirmText={pending?.action === 'ACCEPT' ? 'Ya, Terima' : 'Ya, Tolak'}
      />
    </OrganizerLayout>
  )
}
