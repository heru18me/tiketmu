import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '../../lib/axios'
import { toast } from '../../lib/toast'
import { getErrorMessage } from '../../lib/utils'
import Button from '../ui/Button'
import Card from '../ui/Card'
import ConfirmDialog from '../ui/ConfirmDialog'
import Input from '../ui/Input'

// Aturan password sama dengan backend (register & change password)
const schema = z
  .object({
    currentPassword: z.string().min(1, 'Password saat ini wajib diisi'),
    newPassword: z
      .string()
      .min(8, 'Password minimal 8 karakter')
      .regex(/[A-Z]/, 'Harus mengandung huruf besar')
      .regex(/[0-9]/, 'Harus mengandung angka'),
    confirmPassword: z.string().min(1, 'Konfirmasi password wajib diisi'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Konfirmasi password tidak cocok',
    path: ['confirmPassword'],
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: 'Password baru harus berbeda dari password saat ini',
    path: ['newPassword'],
  })
type FormValues = z.infer<typeof schema>

export default function ChangePasswordForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const [pending, setPending] = useState<FormValues | null>(null)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!pending) return
    setSaving(true)
    try {
      await api.put('/users/me/password', {
        currentPassword: pending.currentPassword,
        newPassword: pending.newPassword,
      })
      reset()
      toast.success('Password berhasil diganti')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Gagal mengganti password'))
    } finally {
      setSaving(false)
      setPending(null)
    }
  }

  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold text-gray-900">Ganti Password</h2>
      <form onSubmit={handleSubmit((values) => setPending(values))} className="mt-4 space-y-4" noValidate>
        <Input
          label="Password saat ini"
          type="password"
          register={register('currentPassword')}
          error={errors.currentPassword?.message}
          autoComplete="current-password"
        />
        <Input
          label="Password baru"
          type="password"
          register={register('newPassword')}
          error={errors.newPassword?.message}
          autoComplete="new-password"
        />
        <Input
          label="Konfirmasi password baru"
          type="password"
          register={register('confirmPassword')}
          error={errors.confirmPassword?.message}
          autoComplete="new-password"
        />
        <Button type="submit">Ganti Password</Button>
      </form>

      <ConfirmDialog
        isOpen={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={save}
        isLoading={saving}
        title="Ganti Password"
        message="Yakin ingin mengganti password akunmu?"
        confirmText="Ya, Ganti"
      />
    </Card>
  )
}
