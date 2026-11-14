import { Link } from 'react-router-dom'

// TODO: arahkan ke halaman nyata jika halaman Tentang/Kontak/Kebijakan Privasi dibuat
const links = [
  { to: '#', label: 'Tentang' },
  { to: '#', label: 'Kontak' },
  { to: '#', label: 'Kebijakan Privasi' },
]

const YEAR = new Date().getFullYear()

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="max-w-sm">
          <Link to="/" className="text-2xl font-extrabold tracking-tight text-primary-600">
            Tiketmu
          </Link>
          <p className="mt-2 text-sm text-gray-500">
            Platform tiket event terpercaya di Indonesia. Temukan, pesan, dan nikmati event favoritmu.
          </p>
        </div>
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {links.map((l) => (
            <li key={l.label}>
              <Link to={l.to} className="text-sm text-gray-600 hover:text-primary-600">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="border-t border-gray-100 py-4 text-center text-xs text-gray-400">
        © {YEAR} Tiketmu. Hak cipta dilindungi.
      </div>
    </footer>
  )
}
