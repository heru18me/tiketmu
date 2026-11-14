import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { api } from '../../lib/axios'
import { toast } from '../../lib/toast'
import { buildEventFormData, normalizeTickets, valuesFromEvent, type EventFormValues } from '../../lib/eventForm'
import { getEventStatusLabel } from '../../lib/utils'
import { useAuthStore } from '../../stores/authStore'
import type { ApiResponse, EventDetail } from '../../types'
import OrganizerLayout from '../../components/layout/OrganizerLayout'
import EventForm from '../../components/event/EventForm'
import EmptyState from '../../components/ui/EmptyState'
import Spinner from '../../components/ui/Spinner'

interface Result {
  id: string
  event: EventDetail | null
  notFound: boolean
}

export default function OrganizerEventEditPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const userId = useAuthStore((s) => s.user?.id)
  const [result, setResult] = useState<Result | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .get<ApiResponse<EventDetail>>(`/events/${id}`)
      .then((res) => !cancelled && setResult({ id, event: res.data.data, notFound: false }))
      .catch((error) => {
        if (!cancelled) setResult({ id, event: null, notFound: isAxiosError(error) && error.response?.status === 404 })
      })
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

  const event = result.event
  // Backend juga memeriksa kepemilikan; ini hanya untuk pesan yang jelas
  if (!event || event.organizer.id !== userId) {
    return (
      <OrganizerLayout>
        <EmptyState
          title={!event && !result.notFound ? 'Gagal memuat event' : 'Event tidak ditemukan'}
          subtitle="Event tidak ada atau bukan milikmu."
          actionLabel="Kembali ke Event Saya"
          onAction={() => navigate('/organizer/events')}
        />
      </OrganizerLayout>
    )
  }

  const initial = valuesFromEvent(event)
  const editable = event.status === 'ACTIVE'

  const handleSubmit = async (values: EventFormValues, image: File | null) => {
    // Ticket types hanya dikirim jika berubah: backend menolak penggantian jika event sudah punya transaksi
    const ticketsChanged =
      values.totalSeats !== initial.totalSeats ||
      values.isFree !== initial.isFree ||
      JSON.stringify(normalizeTickets(values)) !== JSON.stringify(normalizeTickets(initial))

    await api.put(`/events/${event.id}`, buildEventFormData(values, image, { includeTickets: ticketsChanged }))
    toast.success('Event berhasil diperbarui')
    navigate('/organizer/events')
  }

  return (
    <OrganizerLayout>
      <Link to="/organizer/events" className="text-sm text-primary-600 hover:underline">
        ← Kembali ke daftar event
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">Edit Event</h1>

      {!editable && (
        <p role="alert" className="mb-6 rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          Event berstatus “{getEventStatusLabel(event.status)}” sehingga tidak dapat diubah.
        </p>
      )}

      <EventForm
        initialValues={initial}
        initialImageUrl={event.imageUrl}
        submitLabel="Update"
        confirmTitle="Update Event"
        confirmMessage="Simpan perubahan pada event ini?"
        onSubmit={handleSubmit}
        disabled={!editable}
      />
    </OrganizerLayout>
  )
}
