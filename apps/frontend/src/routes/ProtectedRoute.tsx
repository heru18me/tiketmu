import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import type { Role } from '../types'

interface Props {
  children: ReactNode
  role?: Role
}

export const ProtectedRoute = ({ children, role }: Props) => {
  const { user, accessToken } = useAuthStore()
  const location = useLocation()

  // Simpan halaman asal agar LoginPage bisa redirect balik setelah login
  if (!accessToken || !user) return <Navigate to="/login" replace state={{ from: location }} />
  if (role && user.role !== role) return <Navigate to="/" replace />

  return <>{children}</>
}
