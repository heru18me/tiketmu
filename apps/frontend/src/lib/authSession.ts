import axios from 'axios'
import { api } from './axios'
import { useAuthStore } from '../stores/authStore'
import type { ApiResponse, Coupon, User } from '../types'

/**
 * Simpan access token lalu ambil profil lengkap (referralCode, poin, dll.) dari /users/me.
 * Respons login/register dari backend hanya berisi data dasar user.
 */
export async function establishSession(accessToken: string): Promise<User> {
  const { setToken, setAuth, logout } = useAuthStore.getState()
  setToken(accessToken)
  try {
    const res = await api.get<ApiResponse<User & { coupons?: Coupon[] }>>('/users/me')
    const { coupons: _coupons, ...user } = res.data.data
    void _coupons
    setAuth(user, accessToken)
    return user
  } catch (error) {
    logout()
    throw error
  }
}

/** Pulihkan sesi saat aplikasi dibuka, memakai cookie refresh token. Gagal = tetap logout (tanpa error). */
export async function bootstrapSession(): Promise<void> {
  if (useAuthStore.getState().accessToken) return
  try {
    // axios polos (bukan `api`) agar kegagalan refresh tidak memicu redirect ke /login
    const res = await axios.post(
      `${import.meta.env.VITE_API_BASE_URL}/auth/refresh`,
      {},
      { withCredentials: true },
    )
    await establishSession(res.data.data.accessToken)
  } catch {
    // tidak ada sesi yang bisa dipulihkan
  }
}
