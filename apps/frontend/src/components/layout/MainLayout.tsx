import type { ReactNode } from 'react'
import Navbar from './Navbar'
import Footer from './Footer'

interface MainLayoutProps {
  children: ReactNode
  /** Untuk halaman dengan hero (mis. landing): navbar transparan di puncak, konten mulai dari paling atas */
  heroTransparent?: boolean
}

export default function MainLayout({ children, heroTransparent = false }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar transparentAtTop={heroTransparent} />
      {/* Navbar fixed (h-16): beri ruang kecuali hero yang memang berada di bawah navbar */}
      <main className={`flex-1 ${heroTransparent ? '' : 'pt-16'}`}>{children}</main>
      <Footer />
    </div>
  )
}
