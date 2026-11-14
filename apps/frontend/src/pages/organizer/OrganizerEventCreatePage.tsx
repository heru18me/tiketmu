import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../lib/axios'
import { toast } from '../../lib/toast'
import { buildEventFormData, type EventFormValues } from '../../lib/eventForm'
import OrganizerLayout from '../../components/layout/OrganizerLayout'
import EventForm from '../../components/event/EventForm'

export default function OrganizerEventCreatePage() {
  const navigate = useNavigate()

  const handleSubmit = async (values: EventFormValues, image: File | null) => {
    await api.post('/events', buildEventFormData(values, image))
    toast.success('Event berhasil dibuat')
    navigate('/organizer/events')
  }

  return (
    <OrganizerLayout>
      <Link to="/organizer/events" className="text-sm text-primary-600 hover:underline">
        ← Kembali ke daftar event
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">Buat Event Baru</h1>
      <EventForm
        submitLabel="Buat Event"
        confirmTitle="Buat Event"
        confirmMessage="Event akan langsung dipublikasikan dan bisa dibeli oleh customer. Lanjutkan?"
        onSubmit={handleSubmit}
      />
    </OrganizerLayout>
  )
}
