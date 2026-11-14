import { useEffect, useState } from 'react'

const pad = (n: number) => String(n).padStart(2, '0')

export function useCountdown(deadline: string | null) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!deadline) return
    const target = new Date(deadline).getTime()
    const interval = setInterval(() => {
      const current = Date.now()
      setNow(current)
      if (current >= target) clearInterval(interval)
    }, 1000)
    return () => clearInterval(interval)
  }, [deadline])

  if (!deadline) return { timeLeft: '--:--:--', isExpired: false }

  const diff = new Date(deadline).getTime() - now
  if (diff <= 0) return { timeLeft: '00:00:00', isExpired: true }

  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  const s = Math.floor((diff % 60_000) / 1000)
  return { timeLeft: `${pad(h)}:${pad(m)}:${pad(s)}`, isExpired: false }
}
