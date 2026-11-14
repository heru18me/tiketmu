import { useEffect, useRef, useState } from 'react'
import { api } from '../../lib/axios'
import { toast } from '../../lib/toast'
import { formatIDR, getErrorMessage, resolveImageUrl } from '../../lib/utils'
import { useAuthStore } from '../../stores/authStore'
import type { ApiResponse, Coupon, User } from '../../types'
import CustomerLayout from '../../components/layout/CustomerLayout'
import ChangePasswordForm from '../../components/profile/ChangePasswordForm'
import CopyReferral from '../../components/profile/CopyReferral'
import EditProfileForm from '../../components/profile/EditProfileForm'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import Spinner from '../../components/ui/Spinner'

type Profile = User & { coupons: Coupon[] }

const AVATAR_MAX = 2 * 1024 * 1024
const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export default function CustomerProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  const fileRef = useRef<HTMLInputElement>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)

  useEffect(() => {
    let cancelled = false
    api
      .get<ApiResponse<Profile>>('/users/me')
      .then((res) => !cancelled && setProfile(res.data.data))
      .catch(() => !cancelled && setLoadError(true))
    return () => {
      cancelled = true
    }
  }, [retryCount])

  // Sinkronkan perubahan ke auth store agar navbar ikut diperbarui
  const syncAuth = (patch: Partial<User>) => {
    const { user, accessToken, setAuth } = useAuthStore.getState()
    if (user && accessToken) setAuth({ ...user, ...patch }, accessToken)
  }

  const handleSaved = (patch: Partial<User>) => {
    setProfile((p) => (p ? { ...p, ...patch } : p))
    syncAuth({ name: patch.name, phoneNumber: patch.phoneNumber })
  }

  const changeAvatar = async (file: File | undefined) => {
    if (!file) return
    if (!AVATAR_TYPES.includes(file.type)) return toast.error('Format foto harus JPG, PNG, atau WebP')
    if (file.size > AVATAR_MAX) return toast.error('Ukuran foto maksimal 2MB')

    setAvatarUploading(true)
    try {
      const body = new FormData()
      body.append('avatar', file)
      const res = await api.put<ApiResponse<User>>('/users/me', body)
      setProfile((p) => (p ? { ...p, avatar: res.data.data.avatar } : p))
      syncAuth({ avatar: res.data.data.avatar })
      toast.success('Foto profil diperbarui')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Gagal mengunggah foto'))
    } finally {
      setAvatarUploading(false)
    }
  }

  if (!profile) {
    return (
      <CustomerLayout>
        {loadError ? (
          <EmptyState
            title="Gagal memuat profil"
            subtitle="Terjadi kesalahan saat mengambil data."
            actionLabel="Coba Lagi"
            onAction={() => {
              setLoadError(false)
              setRetryCount((c) => c + 1)
            }}
          />
        ) : (
          <div className="flex justify-center py-24">
            <Spinner size="lg" />
          </div>
        )}
      </CustomerLayout>
    )
  }

  const avatarUrl = resolveImageUrl(profile.avatar)

  return (
    <CustomerLayout>
      <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Profil Saya</h1>

      <div className="mt-6 space-y-6">
        {/* 1. Profile card */}
        <Card className="flex flex-col items-center gap-5 p-6 sm:flex-row sm:items-start">
          <div className="flex flex-col items-center gap-2">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Foto profil" className="h-24 w-24 rounded-full object-cover" />
            ) : (
              <span className="flex h-24 w-24 items-center justify-center rounded-full bg-primary-600 text-3xl font-bold text-white">
                {profile.name.charAt(0).toUpperCase()}
              </span>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              aria-label="Pilih foto profil"
              onChange={(e) => {
                changeAvatar(e.target.files?.[0])
                e.target.value = ''
              }}
            />
            <Button size="sm" variant="outline" isLoading={avatarUploading} onClick={() => fileRef.current?.click()}>
              Ubah Foto
            </Button>
          </div>

          <div className="min-w-0 flex-1 space-y-3 text-center sm:text-left">
            <div>
              <p className="break-words text-xl font-bold text-gray-900">{profile.name}</p>
              <p className="break-all text-sm text-gray-500">{profile.email}</p>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase text-gray-400">Kode referral</p>
              <div className="flex justify-center sm:justify-start">
                <CopyReferral code={profile.referralCode} />
              </div>
            </div>
            <div className="inline-block rounded-lg bg-primary-50 px-4 py-2">
              <p className="text-xs text-primary-700">Total poin aktif</p>
              <p className="text-xl font-bold text-primary-700">
                {profile.totalActivePoints.toLocaleString('id-ID')} poin
              </p>
            </div>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* 2. Edit profil */}
          <EditProfileForm name={profile.name} phoneNumber={profile.phoneNumber} onSaved={handleSaved} />
          {/* 3. Ganti password */}
          <ChangePasswordForm />
        </div>

        {/* 4. Kupon */}
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-gray-900">Kupon Aktif</h2>
          {profile.coupons.length === 0 ? (
            <EmptyState title="Belum ada kupon aktif" subtitle="Daftar dengan kode referral teman untuk mendapat kupon diskon." />
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {profile.coupons.map((c) => (
                <li key={c.id} className="rounded-xl border-2 border-dashed border-secondary-300 bg-secondary-50 p-4">
                  <p className="font-mono font-bold text-secondary-700">{c.code}</p>
                  <p className="text-sm text-gray-700">
                    Diskon {c.discountType === 'PERCENTAGE' ? `${c.discount}%` : formatIDR(c.discount)}
                  </p>
                  <Badge variant="organizer" className="mt-2">
                    Berlaku s.d. {new Date(c.expiredAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* 5. Referral */}
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-gray-900">Ajak Teman</h2>
          <p className="mt-2 text-sm text-gray-600">
            Bagikan kode ini dan dapatkan 10.000 poin untuk setiap referral yang berhasil!
          </p>
          <div className="mt-4">
            <CopyReferral code={profile.referralCode} />
          </div>
        </Card>
      </div>
    </CustomerLayout>
  )
}
