import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '../../lib/axios'
import { getErrorMessage } from '../../lib/utils'
import AuthLayout from '../../components/layout/AuthLayout'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

const schema = z.object({
  email: z.string().trim().min(1, 'Email wajib diisi').email('Format email tidak valid'),
})
type FormValues = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async ({ email }: FormValues) => {
    setError('')
    try {
      await api.post('/auth/forgot-password', { email })
      setSentTo(email)
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal mengirim link reset. Coba lagi.'))
    }
  }

  if (sentTo) {
    return (
      <AuthLayout title="Cek email kamu">
        <p className="text-sm text-gray-600">
          Jika <strong className="break-all text-gray-900">{sentTo}</strong> terdaftar, kami sudah mengirim link untuk
          mereset password. Periksa juga folder spam.
        </p>
        <Link to="/login" className="mt-6 block text-center text-sm font-medium text-primary-600 hover:underline">
          Kembali ke halaman masuk
        </Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Lupa password?" subtitle="Masukkan email akunmu dan kami kirimkan link untuk mereset password.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input label="Email" type="email" autoComplete="email" register={register('email')} error={errors.email?.message} />
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" isLoading={isSubmitting}>
          Kirim Link Reset
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-gray-600">
        Ingat password?{' '}
        <Link to="/login" className="font-medium text-primary-600 hover:underline">
          Masuk
        </Link>
      </p>
    </AuthLayout>
  )
}
