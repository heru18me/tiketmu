import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { api } from '../../lib/axios'
import { formatDate, formatIDR, getStatusLabel, resolveImageUrl } from '../../lib/utils'
import { useCountdown } from '../../hooks/useCountdown'
import type { ApiResponse, Transaction, TransactionStatus } from '../../types'
import CustomerLayout from '../../components/layout/CustomerLayout'
import ReviewForm from '../../components/event/ReviewForm'
import PaymentProofUpload from '../../components/transaction/PaymentProofUpload'
import StatusTimeline from '../../components/transaction/StatusTimeline'
import Badge from '../../components/ui/Badge'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import Spinner from '../../components/ui/Spinner'

interface Result {
  id: string
  transaction: Transaction | null
  notFound: boolean
}

const Row = ({ label, value, className = '' }: { label: string; value: string; className?: string }) => (
  <div className={`flex justify-between text-sm ${className}`}>
    <span className="text-gray-600">{label}</span>
    <span className="font-medium text-gray-900">{value}</span>
  </div>
)

function PaymentCountdownPanel({ transaction, onUploaded }: { transaction: Transaction; onUploaded: (t: Transaction) => void }) {
  const { timeLeft, isExpired } = useCountdown(transaction.paymentDeadline)
  const urgent = !isExpired && timeLeft.startsWith('00:0')

  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold text-gray-900">Pembayaran</h2>
      <div
        className={`mt-3 rounded-lg px-4 py-3 text-center ${isExpired || urgent ? 'bg-red-50' : 'bg-yellow-50'}`}
      >
        <p className="text-xs text-gray-600">{isExpired ? 'Batas waktu pembayaran telah lewat' : 'Sisa waktu pembayaran'}</p>
        <p className={`font-mono text-3xl font-bold tabular-nums ${isExpired || urgent ? 'text-red-600' : 'text-yellow-700'}`}>
          {timeLeft}
        </p>
      </div>
      <p className="mt-3 text-sm text-gray-600">
        Transfer sebesar <strong>{formatIDR(transaction.finalAmount)}</strong> lalu unggah bukti pembayaran sebelum waktu habis.
        Transaksi yang tidak dibayar akan otomatis kadaluarsa.
      </p>
      <div className="mt-4">
        <PaymentProofUpload transactionId={transaction.id} disabled={isExpired} onUploaded={onUploaded} />
      </div>
    </Card>
  )
}

const failureInfo = (t: Transaction): { title: string; text: string } => {
  switch (t.status) {
    case 'REJECTED':
      return { title: 'Transaksi ditolak', text: 'Organizer menolak pembayaranmu.' }
    case 'EXPIRED':
      return { title: 'Transaksi kadaluarsa', text: 'Pembayaran tidak diterima sebelum batas waktu.' }
    default:
      return { title: 'Transaksi dibatalkan', text: 'Organizer tidak mengonfirmasi dalam batas waktu 3 hari.' }
  }
}

export default function CustomerTransactionDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [result, setResult] = useState<Result | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .get<ApiResponse<Transaction>>(`/transactions/${id}`)
      .then((res) => !cancelled && setResult({ id, transaction: res.data.data, notFound: false }))
      .catch((error) => {
        if (!cancelled) setResult({ id, transaction: null, notFound: isAxiosError(error) && error.response?.status === 404 })
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const updateTransaction = (transaction: Transaction) => setResult({ id, transaction, notFound: false })

  if (result?.id !== id) {
    return (
      <CustomerLayout>
        <div className="flex justify-center py-24">
          <Spinner size="lg" />
        </div>
      </CustomerLayout>
    )
  }

  const t = result.transaction
  if (!t) {
    return (
      <CustomerLayout>
        <EmptyState
          title={result.notFound ? 'Transaksi tidak ditemukan' : 'Gagal memuat transaksi'}
          subtitle={result.notFound ? 'Transaksi ini tidak ada atau bukan milikmu.' : 'Terjadi kesalahan. Coba muat ulang halaman.'}
          actionLabel="Kembali ke Transaksi"
          onAction={() => navigate('/customer/transactions')}
        />
      </CustomerLayout>
    )
  }

  const image = resolveImageUrl(t.event.imageUrl)
  const proof = resolveImageUrl(t.paymentProof?.imageUrl)
  const ticket = t.details[0]
  const failed = t.status === 'REJECTED' || t.status === 'EXPIRED' || t.status === 'CANCELED'

  const rollbacks = [
    'Kursi dikembalikan ke event',
    ...(t.pointsUsed > 0 ? [`${formatIDR(t.pointsUsed)} poin dikembalikan ke akunmu`] : []),
    ...(t.couponDiscount > 0 ? ['Kupon dapat dipakai kembali'] : []),
    ...(t.voucherDiscount > 0 ? ['Kuota voucher dikembalikan'] : []),
  ]

  return (
    <CustomerLayout>
      <Link to="/customer/transactions" className="text-sm text-primary-600 hover:underline">
        ← Semua transaksi
      </Link>

      {/* Header */}
      <Card className="mt-4 flex flex-col gap-4 overflow-hidden sm:flex-row">
        <div className="h-40 w-full shrink-0 bg-gradient-to-br from-primary-500 to-secondary-500 sm:h-auto sm:w-56">
          {image && <img src={image} alt="" className="h-full w-full object-cover" />}
        </div>
        <div className="flex-1 p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h1 className="text-xl font-bold text-gray-900">{t.event.name}</h1>
            <Badge variant={t.status as TransactionStatus}>{getStatusLabel(t.status)}</Badge>
          </div>
          <p className="mt-2 text-sm text-gray-600">{formatDate(t.event.startDate)}</p>
          <p className="mt-1 text-xs text-gray-400">ID transaksi: {t.id}</p>
          <Link to={`/events/${t.event.id}`} className="mt-3 inline-block text-sm text-primary-600 hover:underline">
            Lihat halaman event
          </Link>
        </div>
      </Card>

      {/* Timeline */}
      <Card className="mt-6 p-5">
        <StatusTimeline status={t.status} />
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Ringkasan */}
        <Card className="space-y-2 p-5">
          <h2 className="mb-2 text-lg font-semibold text-gray-900">Ringkasan</h2>
          <Row label="Tipe tiket" value={ticket?.ticketType.name ?? '-'} />
          <Row label="Jumlah" value={`${t.quantity} tiket`} />
          <Row label="Subtotal" value={formatIDR(t.totalAmount)} />
          {t.voucherDiscount > 0 && <Row label="Diskon voucher" value={`−${formatIDR(t.voucherDiscount)}`} className="[&_span:last-child]:!text-green-700" />}
          {t.couponDiscount > 0 && <Row label="Diskon kupon" value={`−${formatIDR(t.couponDiscount)}`} className="[&_span:last-child]:!text-green-700" />}
          {t.pointsUsed > 0 && <Row label="Poin dipakai" value={`−${formatIDR(t.pointsUsed)}`} className="[&_span:last-child]:!text-green-700" />}
          <div className="flex justify-between border-t border-gray-200 pt-3 text-base font-bold text-gray-900">
            <span>Total</span>
            <span>{t.finalAmount === 0 ? 'GRATIS' : formatIDR(t.finalAmount)}</span>
          </div>
        </Card>

        {/* Panel sesuai status */}
        <div className="space-y-6">
          {t.status === 'WAITING_PAYMENT' && <PaymentCountdownPanel transaction={t} onUploaded={updateTransaction} />}

          {t.status === 'WAITING_CONFIRMATION' && (
            <Card className="p-5">
              <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">
                Menunggu konfirmasi organizer (maks 3 hari).
              </p>
              {proof && (
                <>
                  <h3 className="mb-2 mt-4 text-sm font-semibold text-gray-900">Bukti pembayaran</h3>
                  <img src={proof} alt="Bukti pembayaran" className="max-h-80 rounded-lg border border-gray-200 object-contain" />
                </>
              )}
            </Card>
          )}

          {t.status === 'DONE' && (
            <>
              <Card className="p-5">
                <p className="rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
                  Pembayaranmu telah dikonfirmasi. Sampai jumpa di acara!
                </p>
                {proof && (
                  <>
                    <h3 className="mb-2 mt-4 text-sm font-semibold text-gray-900">Bukti pembayaran</h3>
                    <img src={proof} alt="Bukti pembayaran" className="max-h-80 rounded-lg border border-gray-200 object-contain" />
                  </>
                )}
              </Card>
              <ReviewForm eventId={t.event.id} />
            </>
          )}

          {failed && (
            <Card className={`p-5 ${t.status === 'REJECTED' ? 'border-red-200' : ''}`}>
              <div
                className={`rounded-lg px-4 py-3 ${t.status === 'REJECTED' ? 'bg-red-50 text-red-800' : 'bg-gray-100 text-gray-700'}`}
              >
                <p className="font-semibold">{failureInfo(t).title}</p>
                <p className="text-sm">{failureInfo(t).text}</p>
              </div>
              <h3 className="mb-2 mt-4 text-sm font-semibold text-gray-900">Yang dikembalikan</h3>
              <ul className="list-inside list-disc space-y-1 text-sm text-gray-600">
                {rollbacks.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              {proof && (
                <>
                  <h3 className="mb-2 mt-4 text-sm font-semibold text-gray-900">Bukti pembayaran</h3>
                  <img src={proof} alt="Bukti pembayaran" className="max-h-60 rounded-lg border border-gray-200 object-contain" />
                </>
              )}
            </Card>
          )}
        </div>
      </div>
    </CustomerLayout>
  )
}
