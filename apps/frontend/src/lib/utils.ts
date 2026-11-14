import { isAxiosError } from 'axios'

export const formatIDR = (amount: number): string =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)

export const formatDate = (date: string): string =>
  new Date(date).toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

export const getStatusBadgeColor = (status: string): string => {
  const colors: Record<string, string> = {
    WAITING_PAYMENT: 'bg-yellow-100 text-yellow-800',
    WAITING_CONFIRMATION: 'bg-blue-100 text-blue-800',
    DONE: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    EXPIRED: 'bg-gray-100 text-gray-800',
    CANCELED: 'bg-gray-100 text-gray-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

export const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    WAITING_PAYMENT: 'Menunggu Pembayaran',
    WAITING_CONFIRMATION: 'Menunggu Konfirmasi',
    DONE: 'Selesai',
    REJECTED: 'Ditolak',
    EXPIRED: 'Kadaluarsa',
    CANCELED: 'Dibatalkan',
  }
  return labels[status] || status
}

/** Backend menyimpan gambar sebagai path relatif (/uploads/...). Tambahkan origin API. */
export const resolveImageUrl = (path: string | null | undefined): string | null => {
  if (!path) return null
  if (/^https?:\/\//.test(path)) return path
  const origin = String(import.meta.env.VITE_API_BASE_URL).replace(/\/api\/?$/, '')
  return `${origin}${path}`
}

export const formatDateShort = (date: string): string =>
  new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

/** Ambil pesan error dari respons API (atau fallback). */
export const getErrorMessage = (error: unknown, fallback = 'Terjadi kesalahan. Coba lagi.'): string => {
  if (isAxiosError(error)) {
    const data = error.response?.data as { message?: string; errors?: { message: string }[] } | undefined
    return data?.errors?.[0]?.message ?? data?.message ?? fallback
  }
  return fallback
}

/** Angka singkat untuk sumbu grafik: 1500000 → "1.5M", 500000 → "500K". */
export const formatCompact = (n: number): string => {
  const abs = Math.abs(n)
  const fmt = (v: number, suffix: string) => `${Number.isInteger(v) ? v : v.toFixed(1)}${suffix}`
  if (abs >= 1_000_000_000) return fmt(n / 1_000_000_000, 'B')
  if (abs >= 1_000_000) return fmt(n / 1_000_000, 'M')
  if (abs >= 1_000) return fmt(n / 1_000, 'K')
  return String(n)
}
