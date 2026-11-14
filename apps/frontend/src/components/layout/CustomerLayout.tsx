import type { ReactNode } from 'react'
import Navbar from './Navbar'

export default function CustomerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 pb-12 pt-24 sm:px-6 lg:px-8">{children}</main>
    </div>
  )
}
