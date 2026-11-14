import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/axios'
import { formatDateShort, formatIDR, getStatusLabel, resolveImageUrl } from '../../lib/utils'
import type { PaginatedResponse, PaginationMeta, Transaction, TransactionStatus } from '../../types'
import CustomerLayout from '../../components/layout/CustomerLayout'
import Countdown from '../../components/transaction/Countdown'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import Pagination from '../../components/ui/Pagination'

const PAGE_SIZE = 10

interface Tab {
  key: string
  label: string
  status?: string // dikirim ke API (boleh beberapa, dipisah koma)
  empty: string
}

const TABS: Tab[] = [
  { key: 'all', label: 'Semua', empty: 'Kamu belum punya transaksi.' },
  { key: 'waiting-payment', label: 'Menunggu Bayar', status: 'WAITING_PAYMENT', empty: 'Tidak ada transaksi yang menunggu pembayaran.' },
  { key: 'waiting-confirmation', label: 'Menunggu Konfirmasi', status: 'WAITING_CONFIRMATION', empty: 'Tidak ada transaksi yang menunggu konfirmasi.' },
  { key: 'done', label: 'Selesai', status: 'DONE', empty: 'Belum ada transaksi yang selesai.' },
  { key: 'rejected', label: 'Ditolak', status: 'REJECTED', empty: 'Tidak ada transaksi yang ditolak.' },
  { key: 'other', label: 'Lainnya', status: 'EXPIRED,CANCELED', empty: 'Tidak ada transaksi kadaluarsa atau dibatalkan.' },
]

interface Result {
  key: string
  items: Transaction[]
  meta: PaginationMeta | null
  error: boolean
}

export default function CustomerTransactionListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const tab = TABS.find((t) => t.key === searchParams.get('tab')) ?? TABS[0]
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const requestKey = `${tab.key}:${page}`

  const [result, setResult] = useState<Result | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    api
      .get<PaginatedResponse<Transaction>>('/transactions', {
        params: { page, limit: PAGE_SIZE, ...(tab.status && { status: tab.status }) },
      })
      .then((res) => !cancelled && setResult({ key: requestKey, items: res.data.data, meta: res.data.meta, error: false }))
      .catch(() => !cancelled && setResult({ key: requestKey, items: [], meta: null, error: true }))
    return () => {
      cancelled = true
    }
    // requestKey mencakup tab & page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey, retryCount])

  const loading = result?.key !== requestKey

  const selectTab = (key: string) => {
    setSearchParams(key === 'all' ? {} : { tab: key })
  }
  const changePage = (p: number) => {
    setSearchParams({ ...(tab.key !== 'all' && { tab: tab.key }), ...(p > 1 && { page: String(p) }) })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <CustomerLayout>
      <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Transaksi Saya</h1>

      <div className="-mx-4 mt-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-2 border-b border-gray-200" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={t.key === tab.key}
              onClick={() => selectTab(t.key)}
              className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                t.key === tab.key
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-4" aria-live="polite">
        {loading ? (
          Array.from({ length: 3 }, (_, i) => (
            <Card key={i} className="flex gap-4 p-4" aria-hidden="true">
              <div className="h-24 w-32 animate-pulse rounded-lg bg-gray-200" />
              <div className="flex-1 space-y-3">
                <div className="h-5 w-2/3 animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-1/3 animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-1/4 animate-pulse rounded bg-gray-200" />
              </div>
            </Card>
          ))
        ) : result?.error ? (
          <EmptyState
            title="Gagal memuat transaksi"
            subtitle="Terjadi kesalahan saat mengambil data."
            actionLabel="Coba Lagi"
            onAction={() => {
              setResult(null)
              setRetryCount((c) => c + 1)
            }}
          />
        ) : result && result.items.length === 0 ? (
          <EmptyState
            title="Belum ada transaksi"
            subtitle={tab.empty}
            actionLabel="Jelajahi Event"
            onAction={() => navigate('/events')}
          />
        ) : (
          result?.items.map((t) => {
            const image = resolveImageUrl(t.event.imageUrl)
            return (
              <Card key={t.id} className="flex flex-col gap-4 p-4 sm:flex-row">
                <div className="h-32 w-full shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-primary-500 to-secondary-500 sm:h-24 sm:w-36">
                  {image && <img src={image} alt="" className="h-full w-full object-cover" />}
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="min-w-0 break-words font-semibold text-gray-900">{t.event.name}</h2>
                    <Badge variant={t.status as TransactionStatus}>{getStatusLabel(t.status)}</Badge>
                  </div>
                  <p className="text-sm text-gray-500">
                    Event: {formatDateShort(t.event.startDate)} · {t.quantity} tiket
                  </p>
                  {t.status === 'WAITING_PAYMENT' && (
                    <p className="text-sm text-gray-600">
                      Bayar dalam <Countdown deadline={t.paymentDeadline} />
                    </p>
                  )}
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
                    <span className="text-lg font-bold text-gray-900">
                      {t.finalAmount === 0 ? 'GRATIS' : formatIDR(t.finalAmount)}
                    </span>
                    <Link to={`/customer/transactions/${t.id}`}>
                      <Button size="sm" variant="outline">
                        Detail
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            )
          })
        )}
      </div>

      {!loading && result?.meta && (
        <div className="mt-8">
          <Pagination currentPage={result.meta.page} totalPages={result.meta.totalPages} onPageChange={changePage} />
        </div>
      )}
    </CustomerLayout>
  )
}
