import { useEffect, useState } from 'react'
import { RouterProvider } from 'react-router-dom'
import { bootstrapSession } from './lib/authSession'
import { router } from './routes'
import Spinner from './components/ui/Spinner'

export default function App() {
  const [ready, setReady] = useState(false)

  // Pulihkan sesi dari cookie refresh token sebelum route diproteksi dirender,
  // agar reload halaman tidak melempar user ke /login.
  useEffect(() => {
    let cancelled = false
    bootstrapSession().finally(() => !cancelled && setReady(true))
    return () => {
      cancelled = true
    }
  }, [])

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return <RouterProvider router={router} />
}
