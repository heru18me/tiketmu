import { useEffect, useRef, useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { api } from '../../lib/axios'
import { defaultEventValues, eventFormSchema, type EventFormValues } from '../../lib/eventForm'
import { getErrorMessage, resolveImageUrl } from '../../lib/utils'
import type { ApiResponse, Category } from '../../types'
import Button from '../ui/Button'
import Card from '../ui/Card'
import ConfirmDialog from '../ui/ConfirmDialog'
import Input from '../ui/Input'

interface EventFormProps {
  initialValues?: EventFormValues
  initialImageUrl?: string | null
  submitLabel: string
  confirmTitle: string
  confirmMessage: string
  /** Lempar error (Error) agar pesannya tampil di form; resolve = sukses (pemanggil yang navigate). */
  onSubmit: (values: EventFormValues, image: File | null) => Promise<void>
  disabled?: boolean
}

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const IMAGE_MAX = 5 * 1024 * 1024

const fieldClass =
  'block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 disabled:bg-gray-100 disabled:text-gray-500'
const labelClass = 'mb-1 block text-sm font-medium text-gray-700'

export default function EventForm({
  initialValues = defaultEventValues,
  initialImageUrl = null,
  submitLabel,
  confirmTitle,
  confirmMessage,
  onSubmit,
  disabled = false,
}: EventFormProps) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: initialValues,
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'ticketTypes' })

  const isFree = useWatch({ control, name: 'isFree' })
  const totalSeats = useWatch({ control, name: 'totalSeats' })
  const tickets = useWatch({ control, name: 'ticketTypes' })
  const ticketSeatSum = (tickets ?? []).reduce((s, t) => s + (Number.isFinite(t?.totalSeats) ? t.totalSeats : 0), 0)

  const [categories, setCategories] = useState<Category[]>([])
  useEffect(() => {
    let cancelled = false
    api
      .get<ApiResponse<Category[]>>('/events/categories')
      .then((res) => !cancelled && setCategories(res.data.data))
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  // Gambar
  const fileRef = useRef<HTMLInputElement>(null)
  const [picked, setPicked] = useState<{ file: File; url: string } | null>(null)
  const [imageError, setImageError] = useState('')
  const previewUrl = picked?.url
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])
  const shownImage = picked?.url ?? resolveImageUrl(initialImageUrl)

  const pickImage = (f: File | undefined) => {
    if (!f) return
    if (!IMAGE_TYPES.includes(f.type)) return setImageError('Format gambar harus JPG, PNG, atau WebP')
    if (f.size > IMAGE_MAX) return setImageError('Ukuran gambar maksimal 5MB')
    setImageError('')
    setPicked({ file: f, url: URL.createObjectURL(f) })
  }

  // Submit → konfirmasi → kirim
  const [pending, setPending] = useState<EventFormValues | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const confirm = async () => {
    if (!pending) return
    setSubmitting(true)
    setSubmitError('')
    try {
      await onSubmit(pending, picked?.file ?? null)
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'Gagal menyimpan event'))
      setPending(null)
    } finally {
      setSubmitting(false)
    }
  }

  const toggleFree = (checked: boolean) => {
    if (!checked) return
    // Event gratis: semua harga jadi 0 (juga membersihkan nilai NaN agar validasi tidak tersangkut)
    setValue('price', 0)
    getValues('ticketTypes').forEach((_, i) => setValue(`ticketTypes.${i}.price`, 0))
  }

  const seatsMatch = ticketSeatSum === totalSeats

  return (
    <form onSubmit={handleSubmit((values) => setPending(values))} className="space-y-6" noValidate>
      <Card className="space-y-4 p-5">
        <h2 className="text-lg font-semibold text-gray-900">Informasi Event</h2>

        <Input label="Nama event" register={register('name')} error={errors.name?.message} disabled={disabled} />

        <div>
          <label htmlFor="categoryId" className={labelClass}>
            Kategori
          </label>
          <select id="categoryId" className={fieldClass} disabled={disabled} {...register('categoryId')}>
            <option value="">Pilih kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {errors.categoryId && <p className="mt-1 text-sm text-red-600">{errors.categoryId.message}</p>}
        </div>

        <div>
          <label htmlFor="description" className={labelClass}>
            Deskripsi
          </label>
          <textarea id="description" rows={5} className={fieldClass} disabled={disabled} {...register('description')} />
          {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Lokasi" register={register('location')} error={errors.location?.message} disabled={disabled} />
          <Input label="Kota" register={register('city')} error={errors.city?.message} disabled={disabled} />
          <Input
            label="Tanggal mulai"
            type="datetime-local"
            register={register('startDate')}
            error={errors.startDate?.message}
            disabled={disabled}
          />
          <Input
            label="Tanggal selesai"
            type="datetime-local"
            register={register('endDate')}
            error={errors.endDate?.message}
            disabled={disabled}
          />
        </div>

        {/* Gambar */}
        <div>
          <p className={labelClass}>Gambar event</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="aspect-video w-full overflow-hidden rounded-lg bg-gradient-to-br from-primary-500 to-secondary-500 sm:w-64">
              {shownImage && <img src={shownImage} alt="Preview gambar event" className="h-full w-full object-cover" />}
            </div>
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                aria-label="Pilih gambar event"
                onChange={(e) => {
                  pickImage(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
              <Button variant="outline" size="sm" disabled={disabled} onClick={() => fileRef.current?.click()}>
                {shownImage ? 'Ganti Gambar' : 'Pilih Gambar'}
              </Button>
              <p className="mt-1 text-xs text-gray-500">JPG, PNG, atau WebP, maksimal 5MB</p>
              {imageError && <p role="alert" className="mt-1 text-sm text-red-600">{imageError}</p>}
            </div>
          </div>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="text-lg font-semibold text-gray-900">Kursi & Harga</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Total seats"
            type="number"
            min={1}
            register={register('totalSeats', { valueAsNumber: true })}
            error={errors.totalSeats?.message}
            disabled={disabled}
          />
          <Input
            label="Harga event (Rp)"
            type="number"
            min={0}
            register={register('price', { valueAsNumber: true })}
            error={errors.price?.message}
            disabled={disabled || isFree}
          />
        </div>

        <label className="flex cursor-pointer items-center gap-3 text-sm text-gray-700">
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary-600"
            disabled={disabled}
            {...register('isFree', { onChange: (e) => toggleFree(e.target.checked) })}
          />
          Event gratis
        </label>
      </Card>

      <Card className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Tipe Tiket</h2>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => append({ name: '', price: 0, totalSeats: 1, description: '' })}
          >
            + Tambah Tipe
          </Button>
        </div>

        <div className="space-y-4">
          {fields.map((field, i) => {
            const rowErrors = errors.ticketTypes?.[i]
            return (
              <div key={field.id} className="rounded-lg border border-gray-200 p-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Input
                    label="Nama tiket"
                    register={register(`ticketTypes.${i}.name`)}
                    error={rowErrors?.name?.message}
                    disabled={disabled}
                  />
                  <Input
                    label="Harga (Rp)"
                    type="number"
                    min={0}
                    register={register(`ticketTypes.${i}.price`, { valueAsNumber: true })}
                    error={rowErrors?.price?.message}
                    disabled={disabled || isFree}
                  />
                  <Input
                    label="Total seats"
                    type="number"
                    min={1}
                    register={register(`ticketTypes.${i}.totalSeats`, { valueAsNumber: true })}
                    error={rowErrors?.totalSeats?.message}
                    disabled={disabled}
                  />
                </div>
                <div className="mt-3">
                  <Input
                    label="Deskripsi (opsional)"
                    register={register(`ticketTypes.${i}.description`)}
                    disabled={disabled}
                  />
                </div>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    disabled={disabled}
                    className="mt-3 text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
                  >
                    Hapus tipe ini
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <p className={`text-sm ${seatsMatch ? 'text-gray-500' : 'text-red-600'}`}>
          Total kursi tiket: {ticketSeatSum} / {Number.isFinite(totalSeats) ? totalSeats : 0}
        </p>
        {(errors.ticketTypes?.root?.message || errors.ticketTypes?.message) && (
          <p role="alert" className="text-sm text-red-600">
            {errors.ticketTypes?.root?.message ?? errors.ticketTypes?.message}
          </p>
        )}
      </Card>

      {submitError && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {submitError}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={disabled}>
          {submitLabel}
        </Button>
      </div>

      <ConfirmDialog
        isOpen={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={confirm}
        isLoading={submitting}
        title={confirmTitle}
        message={confirmMessage}
        confirmText="Ya, Lanjutkan"
      />
    </form>
  )
}
