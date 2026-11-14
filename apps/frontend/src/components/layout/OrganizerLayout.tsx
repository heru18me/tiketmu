import type { ReactNode } from 'react'
import Navbar from './Navbar'
import Sidebar from './Sidebar'

export default function OrganizerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Sidebar />
      {/* Offset: tinggi navbar (pt-16) dan lebar sidebar (pl-16 mobile / pl-56 desktop) */}
      <main className="min-h-screen pl-16 pt-16 md:pl-56">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  )
}
