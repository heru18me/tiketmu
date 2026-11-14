import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../../lib/axios'
import { resolveImageUrl } from '../../lib/utils'
import { useScrollPosition } from '../../hooks/useScrollPosition'
import { useAuthStore } from '../../stores/authStore'
import Button from '../ui/Button'
import ConfirmDialog from '../ui/ConfirmDialog'

interface NavbarProps {
  /** Transparan saat di puncak halaman (untuk halaman dengan hero), solid setelah scroll */
  transparentAtTop?: boolean
}

interface NavItem {
  to: string
  label: string
}

const SCROLL_THRESHOLD = 20

export default function Navbar({ transparentAtTop = false }: NavbarProps) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const scrollY = useScrollPosition()

  // Menu "terbuka untuk path X": otomatis tertutup saat pindah halaman tanpa effect
  const [mobileOpenFor, setMobileOpenFor] = useState<string | null>(null)
  const [dropdownOpenFor, setDropdownOpenFor] = useState<string | null>(null)
  const mobileOpen = mobileOpenFor === location.pathname
  const dropdownOpen = dropdownOpenFor === location.pathname
  const setMobileOpen = (update: boolean | ((o: boolean) => boolean)) => {
    const next = typeof update === 'function' ? update(mobileOpen) : update
    setMobileOpenFor(next ? location.pathname : null)
  }
  const setDropdownOpen = (update: boolean | ((o: boolean) => boolean)) => {
    const next = typeof update === 'function' ? update(dropdownOpen) : update
    setDropdownOpenFor(next ? location.pathname : null)
  }
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const transparent = transparentAtTop && scrollY < SCROLL_THRESHOLD && !mobileOpen

  // Tutup dropdown saat klik di luar atau tekan Esc
  useEffect(() => {
    if (!dropdownOpen) return
    const onClick = (e: MouseEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node)) setDropdownOpenFor(null)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDropdownOpenFor(null)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [dropdownOpen])

  const menuItems: NavItem[] = !user
    ? []
    : user.role === 'ORGANIZER'
      ? [
          { to: '/organizer/dashboard', label: 'Dashboard' },
          { to: '/organizer/events', label: 'Event Saya' },
          { to: '/organizer/transactions', label: 'Transaksi' },
        ]
      : [
          { to: '/customer/transactions', label: 'Transaksi' },
          { to: '/customer/profile', label: 'Profil' },
        ]

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await api.post('/auth/logout')
    } catch {
      // Gagal menghubungi server tidak boleh menahan user di sesi lokal
    } finally {
      logout()
      setIsLoggingOut(false)
      setConfirmLogout(false)
      navigate('/')
    }
  }

  const textColor = transparent ? 'text-white' : 'text-gray-700'
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors ${
      transparent
        ? 'text-white/90 hover:text-white'
        : isActive
          ? 'text-primary-600'
          : 'text-gray-600 hover:text-primary-600'
    }`

  const avatarUrl = resolveImageUrl(user?.avatar)

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-40 transition-colors duration-200 ${
          transparent ? 'bg-transparent' : 'bg-white shadow-sm'
        }`}
      >
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link
              to="/"
              className={`text-2xl font-extrabold tracking-tight ${transparent ? 'text-white' : 'text-primary-600'}`}
            >
              Tiketmu
            </Link>
            <div className="hidden items-center gap-6 md:flex">
              <NavLink to="/events" className={linkClass}>
                Events
              </NavLink>
              {menuItems.map((item) => (
                <NavLink key={item.to} to={item.to} className={linkClass}>
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>

          {/* Desktop: auth area */}
          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen((o) => !o)}
                  aria-haspopup="menu"
                  aria-expanded={dropdownOpen}
                  className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-3 transition-colors ${
                    transparent ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                  }`}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-sm font-semibold text-white">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className={`max-w-32 truncate text-sm font-medium ${textColor}`}>{user.name}</span>
                </button>

                {dropdownOpen && (
                  <div
                    role="menu"
                    className="animate-fade-in absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-lg"
                  >
                    <div className="border-b border-gray-100 px-4 py-2">
                      <p className="truncate text-sm font-medium text-gray-900">{user.name}</p>
                      <p className="truncate text-xs text-gray-500">{user.email}</p>
                    </div>
                    {menuItems.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        role="menuitem"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        {item.label}
                      </Link>
                    ))}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setDropdownOpen(false)
                        setConfirmLogout(true)
                      }}
                      className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login">
                  <Button variant={transparent ? 'ghost' : 'outline'} size="sm" className={transparent ? '!text-white hover:!bg-white/10' : ''}>
                    Login
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" className={transparent ? '!bg-white !text-primary-600 hover:!bg-gray-100' : ''}>
                    Register
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile: hamburger */}
          <button
            type="button"
            className={`rounded-lg p-2 md:hidden ${textColor}`}
            aria-label={mobileOpen ? 'Tutup menu' : 'Buka menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((o) => !o)}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </nav>

        {/* Mobile panel */}
        {mobileOpen && (
          <div className="animate-fade-in border-t border-gray-100 bg-white px-4 pb-4 pt-2 md:hidden">
            <NavLink to="/events" className="block py-2 text-sm font-medium text-gray-700">
              Events
            </NavLink>
            {menuItems.map((item) => (
              <NavLink key={item.to} to={item.to} className="block py-2 text-sm font-medium text-gray-700">
                {item.label}
              </NavLink>
            ))}
            <div className="mt-2 border-t border-gray-100 pt-3">
              {user ? (
                <>
                  <p className="mb-2 truncate text-sm text-gray-500">{user.name}</p>
                  <Button variant="danger" size="sm" className="w-full" onClick={() => setConfirmLogout(true)}>
                    Logout
                  </Button>
                </>
              ) : (
                <div className="flex gap-2">
                  <Link to="/login" className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      Login
                    </Button>
                  </Link>
                  <Link to="/register" className="flex-1">
                    <Button size="sm" className="w-full">
                      Register
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <ConfirmDialog
        isOpen={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        onConfirm={handleLogout}
        isLoading={isLoggingOut}
        title="Logout"
        message="Apakah kamu yakin ingin keluar dari akun?"
        confirmText="Ya, Logout"
      />
    </>
  )
}
