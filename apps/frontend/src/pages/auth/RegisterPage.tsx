import { useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
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

const schema = z
  .object({
    name: z.string().trim().min(2, 'Nama minimal 2 karakter'),
    email: z.string().trim().min(1, 'Email wajib diisi').email('Format email tidak valid'),
    password: z
      .string()
      .min(8, 'Password minimal 8 karakter')
      .regex(/[A-Z]/, 'Harus mengandung huruf besar')
      .regex(/[0-9]/, 'Harus mengandung angka'),
    confirmPassword: z.string().min(1, 'Konfirmasi password wajib diisi'),
    role: z.enum(['CUSTOMER', 'ORGANIZER']),
    referralCode: z.string().trim().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Konfirmasi password tidak cocok',
    path: ['confirmPassword'],
  })
type FormValues = z.infer<typeof schema>

export default function RegisterPage() {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      role: searchParams.get('role') === 'ORGANIZER' ? 'ORGANIZER' : 'CUSTOMER',
      referralCode: '',
    },
  })

  const onSubmit = async (values: FormValues) => {
    setError('')
    try {
      const res = await api.post<ApiResponse<{ accessToken: string }>>('/auth/register', {
        name: values.name,
        email: values.email,
        password: values.password,
        role: values.role,
        ...(values.referralCode && { referralCode: values.referralCode.toUpperCase() }),
      })
      // Auto-login; GuestRoute mengarahkan ke halaman asal atau beranda
      const user = await establishSession(res.data.data.accessToken)
      toast.success(`Akun berhasil dibuat. Selamat datang, ${user.name}`)
    } catch (err) {
      setError(
        isAxiosError(err) && err.response?.status === 409
          ? 'Email sudah terdaftar'
          : getErrorMessage(err, 'Gagal mendaftar. Coba lagi.'),
      )
    }
  }

  return (
    <AuthLayout title="Daftar" subtitle="Buat akun Tiketmu-mu sekarang.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input label="Nama" autoComplete="name" register={register('name')} error={errors.name?.message} />
        <Input label="Email" type="email" autoComplete="email" register={register('email')} error={errors.email?.message} />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          register={register('password')}
          error={errors.password?.message}
        />
        <Input
          label="Konfirmasi password"
          type="password"
          autoComplete="new-password"
          register={register('confirmPassword')}
          error={errors.confirmPassword?.message}
        />

        <div>
          <label htmlFor="role" className="mb-1 block text-sm font-medium text-gray-700">
            Daftar sebagai
          </label>
          <select
            id="role"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            {...register('role')}
          >
            <option value="CUSTOMER">Customer (beli tiket)</option>
            <option value="ORGANIZER">Organizer (buat event)</option>
          </select>
        </div>

        <Input
          label="Kode referral (opsional)"
          placeholder="Punya kode dari teman?"
          autoCapitalize="characters"
          register={register('referralCode')}
          error={errors.referralCode?.message}
        />

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" isLoading={isSubmitting}>
          Daftar
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-gray-600">
        Sudah punya akun?{' '}
        <Link to="/login" state={location.state} className="font-medium text-primary-600 hover:underline">
          Masuk
        </Link>
      </p>
    </AuthLayout>
  )
}
