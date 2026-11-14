import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface AuthLayoutProps {
  title: string
  subtitle?: string
  children: ReactNode
}

export default function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50 px-4 py-10">
      <Link to="/" className="mb-6 text-3xl font-extrabold tracking-tight text-primary-600">
        Tiketmu
      </Link>
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  )
}
