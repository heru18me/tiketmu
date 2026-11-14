import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../lib/axios'
import { downloadCsv, formatDateTime, formatIDR } from '../../lib/utils'
import type { ApiResponse, Attendee, EventDetail } from '../../types'
import OrganizerLayout from '../../components/layout/OrganizerLayout'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import Spinner from '../../components/ui/Spinner'

interface Result {
  id: string
  eventName: string
  attendees: Attendee[]
  error: boolean
}

export default function OrganizerAttendeeListPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [result, setResult] = useState<Result | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      api.get<ApiResponse<EventDetail>>(`/events/${id}`),
      api.get<ApiResponse<Attendee[]>>(`/dashboard/attendees/${id}`),
    ])
      .then(([event, attendees]) => {
        if (!cancelled) setResult({ id, eventName: event.data.data.name, attendees: attendees.data.data, error: false })
      })
      .catch(() => !cancelled && setResult({ id, eventName: '', attendees: [], error: true }))
    return () => {
      cancelled = true
    }
  }, [id])

  if (result?.id !== id) {
    return (
      <OrganizerLayout>
        <div className="flex justify-center py-24">
          <Spinner size="lg" />
        </div>
      </OrganizerLayout>
    )
  }

  if (result.error) {
    return (
      <OrganizerLayout>
        <EmptyState
          title="Gagal memuat daftar attendee"
          subtitle="Event tidak ditemukan, bukan milikmu, atau terjadi kesalahan."
          actionLabel="Kembali ke Event Saya"
          onAction={() => navigate('/organizer/events')}
        />
      </OrganizerLayout>
    )
  }

  const { eventName, attendees } = result
  const totalAttendees = attendees.reduce((sum, a) => sum + a.quantity, 0)

  const exportCsv = () =>
    downloadCsv(`attendee-${eventName.replace(/[^\w-]+/g, '_').slice(0, 40) || id}.csv`, [
      ['Nama', 'Email', 'Tipe Tiket', 'Jumlah', 'Total Bayar', 'Tanggal Transaksi'],
      ...attendees.map((a) => [a.name, a.email, a.ticketType, a.quantity, a.totalPaid, new Date(a.transactionDate).toISOString()]),
    ])

  return (
    <OrganizerLayout>
      <Link to="/organizer/events" className="text-sm text-primary-600 hover:underline">
        ← Kembali ke daftar event
      </Link>

      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Attendee</h1>
          <p className="mt-1 text-gray-600">{eventName}</p>
          <p className="text-sm text-gray-500">
            <strong className="text-gray-900">{totalAttendees}</strong> attendee dari {attendees.length} transaksi
          </p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={attendees.length === 0}>
          Export CSV
        </Button>
      </div>

      <Card className="mt-6 overflow-hidden">
        {attendees.length === 0 ? (
          <EmptyState title="Belum ada attendee" subtitle="Customer yang pembayarannya sudah dikonfirmasi akan muncul di sini." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Tipe Tiket</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Total Bayar</th>
                  <th className="px-4 py-3">Tanggal Transaksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {attendees.map((a) => (
                  <tr key={a.transactionId}>
                    <td className="px-4 py-3 font-medium text-gray-900">{a.name}</td>
                    <td className="px-4 py-3 text-gray-600">{a.email}</td>
                    <td className="px-4 py-3 text-gray-700">{a.ticketType}</td>
                    <td className="px-4 py-3 text-right">{a.quantity}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">{a.totalPaid === 0 ? 'GRATIS' : formatIDR(a.totalPaid)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">{formatDateTime(a.transactionDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </OrganizerLayout>
  )
}
