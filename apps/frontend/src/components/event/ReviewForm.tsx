import { useState, type FormEvent } from 'react'
import { isAxiosError } from 'axios'
import { api } from '../../lib/axios'
import { toast } from '../../lib/toast'
import { getErrorMessage } from '../../lib/utils'
import type { ApiResponse, Review } from '../../types'
import Button from '../ui/Button'
import Card from '../ui/Card'
import StarRating from '../ui/StarRating'

interface ReviewFormProps {
  eventId: string
  onSubmitted?: (review: Review) => void
}

export default function ReviewForm({ eventId, onSubmitted }: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<'submitted' | 'duplicate' | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (rating < 1) {
      setError('Pilih rating terlebih dahulu')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await api.post<ApiResponse<Review>>('/reviews', {
        eventId,
        rating,
        ...(comment.trim() && { comment: comment.trim() }),
      })
      setDone('submitted')
      toast.success('Ulasanmu sudah terkirim')
      onSubmitted?.(res.data.data)
    } catch (err) {
      // 409 = sudah pernah review event ini
      if (isAxiosError(err) && err.response?.status === 409) setDone('duplicate')
      else setError(getErrorMessage(err, 'Gagal mengirim review'))
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
        {done === 'submitted' ? 'Terima kasih! Ulasanmu sudah terkirim.' : 'Kamu sudah memberi ulasan untuk event ini.'}
      </p>
    )
  }

  return (
    <Card className="p-5">
      <form onSubmit={submit} className="space-y-3">
        <h3 className="font-semibold text-gray-900">Tulis ulasanmu</h3>
        <StarRating rating={rating} size="lg" onChange={setRating} />
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="Ceritakan pengalamanmu (opsional)"
          aria-label="Komentar"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" isLoading={submitting}>
          Kirim Ulasan
        </Button>
      </form>
    </Card>
  )
}
