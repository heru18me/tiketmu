import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '../stores/authStore'

const baseURL = import.meta.env.VITE_API_BASE_URL

export const api = axios.create({
  baseURL,
  withCredentials: true, // httpOnly cookie refresh token
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean }

// Satu refresh untuk semua request yang 401 bersamaan
let refreshPromise: Promise<string> | null = null

const refreshAccessToken = (): Promise<string> => {
  refreshPromise ??= axios
    .post(`${baseURL}/auth/refresh`, {}, { withCredentials: true })
    .then(({ data }) => data.data.accessToken as string)
    .finally(() => {
      refreshPromise = null
    })
  return refreshPromise
}

// Endpoint auth tidak boleh memicu refresh (mis. salah password di /auth/login = 401 biasa)
const isAuthEndpoint = (url?: string) => !!url && /\/auth\/(login|register|refresh)/.test(url)

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined

    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !isAuthEndpoint(original.url)
    ) {
      original._retry = true
      try {
        const token = await refreshAccessToken()
        useAuthStore.getState().setToken(token)
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      } catch {
        useAuthStore.getState().logout()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)
