import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { z } from 'zod'
import { api } from '../../lib/axios'
import { establishSession } from '../../lib/authSession'
import { toast } from '../../lib/toast'
import { getErrorMessage } from '../../lib/utils'
import type { ApiResponse } from '../../types'
import AuthLayout from '../../components/layout/AuthLayout'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

const schema = z.object({
  email: z.string().trim().min(1, 'Email wajib diisi').email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
})
type FormValues = z.infer<typeof schema>

export default function LoginPage() {
  const location = useLocation()
  const notice = (location.state as { notice?: string } | null)?.notice
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormValues) => {
    setError('')
    try {
      const res = await api.post<ApiResponse<{ accessToken: string }>>('/auth/login', values)
      // Setelah sesi terbentuk, GuestRoute mengarahkan ke halaman asal (atau beranda)
      const user = await establishSession(res.data.data.accessToken)
      toast.success(`Selamat datang, ${user.name}`)
    } catch (err) {
      setError(
        isAxiosError(err) && err.response?.status === 401
          ? 'Email atau password salah'
          : getErrorMessage(err, 'Gagal login. Coba lagi.'),
      )
    }
  }

  return (
    <AuthLayout title="Masuk" subtitle="Selamat datang kembali di Tiketmu.">
      {notice && (
        <p role="status" className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          {notice}
        </p>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input label="Email" type="email" autoComplete="email" register={register('email')} error={errors.email?.message} />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          register={register('password')}
          error={errors.password?.message}
        />
        <div className="text-right">
          <Link to="/forgot-password" className="text-sm text-primary-600 hover:underline">
            Lupa password?
          </Link>
        </div>
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" isLoading={isSubmitting}>
          Masuk
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-gray-600">
        Belum punya akun?{' '}
        <Link to="/register" state={location.state} className="font-medium text-primary-600 hover:underline">
          Daftar
        </Link>
      </p>
    </AuthLayout>
  )
}
