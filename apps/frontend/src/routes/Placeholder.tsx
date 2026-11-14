import { Link } from 'react-router-dom'

// TODO: hapus file ini setelah semua halaman fase 7–10 selesai.
export const Placeholder = ({ name }: { name: string }) => (
  <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
    <h1 className="text-2xl font-bold text-primary-600">{name}</h1>
    <p className="text-gray-500">Halaman ini belum dibuat.</p>
    <Link to="/" className="text-primary-600 underline">
      Kembali ke beranda
    </Link>
  </div>
)
