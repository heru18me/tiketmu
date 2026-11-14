import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

interface FromLocation {
  pathname: string
  search?: string
}

/** Halaman khusus tamu (login, register, dst.): jika sudah login, arahkan ke halaman asal atau beranda. */
export const GuestRoute = ({ children }: { children: ReactNode }) => {
  const user = useAuthStore((s) => s.user)
  const location = useLocation()

  if (user) {
    const from = (location.state as { from?: FromLocation } | null)?.from
    return <Navigate to={from ? `${from.pathname}${from.search ?? ''}` : '/'} replace />
  }
  return <>{children}</>
}
