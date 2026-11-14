import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '../../lib/axios'
import { getErrorMessage } from '../../lib/utils'
import AuthLayout from '../../components/layout/AuthLayout'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

const schema = z
  .object({
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
type FormValues = z.infer<typeof schema>

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async ({ newPassword }: FormValues) => {
    setError('')
    try {
      await api.post('/auth/reset-password', { token, newPassword })
      navigate('/login', { replace: true, state: { notice: 'Password berhasil direset. Silakan masuk dengan password baru.' } })
    } catch (err) {
      setError(getErrorMessage(err, 'Link reset tidak valid atau sudah kedaluwarsa.'))
    }
  }

  if (!token) {
    return (
      <AuthLayout title="Link tidak valid">
        <p className="text-sm text-gray-600">Link reset password tidak lengkap atau sudah tidak berlaku.</p>
        <Link to="/forgot-password" className="mt-6 block text-center text-sm font-medium text-primary-600 hover:underline">
          Minta link baru
        </Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Reset password" subtitle="Buat password baru untuk akunmu.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Password baru"
          type="password"
          autoComplete="new-password"
          register={register('newPassword')}
          error={errors.newPassword?.message}
        />
        <Input
          label="Konfirmasi password baru"
          type="password"
          autoComplete="new-password"
          register={register('confirmPassword')}
          error={errors.confirmPassword?.message}
        />
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}{' '}
            <Link to="/forgot-password" className="font-medium underline">
              Minta link baru
            </Link>
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" isLoading={isSubmitting}>
          Reset Password
        </Button>
      </form>
    </AuthLayout>
  )
}
