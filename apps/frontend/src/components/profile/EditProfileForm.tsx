import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '../../lib/axios'
import { toast } from '../../lib/toast'
import { getErrorMessage } from '../../lib/utils'
import type { ApiResponse, User } from '../../types'
import Button from '../ui/Button'
import Card from '../ui/Card'
import ConfirmDialog from '../ui/ConfirmDialog'
import Input from '../ui/Input'

const schema = z.object({
  name: z.string().trim().min(2, 'Nama minimal 2 karakter'),
  phoneNumber: z
    .string()
    .trim()
    .refine((v) => v === '' || /^(\+62|62|0)8[0-9]{7,12}$/.test(v), 'Nomor HP tidak valid (contoh: 08123456789)'),
})
type FormValues = z.infer<typeof schema>

interface EditProfileFormProps {
  name: string
  phoneNumber: string | null | undefined
  onSaved: (user: Partial<User>) => void
}

export default function EditProfileForm({ name, phoneNumber, onSaved }: EditProfileFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name, phoneNumber: phoneNumber ?? '' },
  })

  const [pending, setPending] = useState<FormValues | null>(null)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!pending) return
    setSaving(true)
    try {
      // Backend belum mendukung menghapus nomor HP, jadi hanya dikirim jika terisi
      const res = await api.put<ApiResponse<User>>('/users/me', {
        name: pending.name,
        ...(pending.phoneNumber && { phoneNumber: pending.phoneNumber }),
      })
      onSaved(res.data.data)
      reset({ name: res.data.data.name, phoneNumber: res.data.data.phoneNumber ?? '' })
      toast.success('Profil berhasil diperbarui')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Gagal memperbarui profil'))
    } finally {
      setSaving(false)
      setPending(null)
    }
  }

  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold text-gray-900">Edit Profil</h2>
      <form onSubmit={handleSubmit((values) => setPending(values))} className="mt-4 space-y-4" noValidate>
        <Input label="Nama" register={register('name')} error={errors.name?.message} autoComplete="name" />
        <Input
          label="Nomor HP"
          type="tel"
          placeholder="08123456789"
          register={register('phoneNumber')}
          error={errors.phoneNumber?.message}
          autoComplete="tel"
        />
        <Button type="submit" disabled={!isDirty}>
          Simpan Perubahan
        </Button>
      </form>

      <ConfirmDialog
        isOpen={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={save}
        isLoading={saving}
        title="Simpan Perubahan"
        message="Simpan perubahan pada profilmu?"
        confirmText="Ya, Simpan"
      />
    </Card>
  )
}
