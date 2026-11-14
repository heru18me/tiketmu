import { Link } from 'react-router-dom'
import MainLayout from '../components/layout/MainLayout'
import Button from '../components/ui/Button'

export default function NotFoundPage() {
  return (
    <MainLayout>
      <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
        <p className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-8xl font-extrabold text-transparent">
          404
        </p>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">Halaman tidak ditemukan</h1>
        <p className="mt-2 text-gray-500">Halaman yang kamu cari tidak ada atau sudah dipindahkan.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/">
            <Button>Ke Beranda</Button>
          </Link>
          <Link to="/events">
            <Button variant="outline">Jelajahi Event</Button>
          </Link>
        </div>
      </div>
    </MainLayout>
  )
}
