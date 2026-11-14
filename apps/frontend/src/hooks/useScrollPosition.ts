import { useEffect, useState } from 'react'

/** Posisi scroll vertikal (px) halaman saat ini. */
export function useScrollPosition(): number {
  const [scrollY, setScrollY] = useState(() => window.scrollY)

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return scrollY
}
