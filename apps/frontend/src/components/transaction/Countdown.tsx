import { useCountdown } from '../../hooks/useCountdown'

interface CountdownProps {
  deadline: string
  className?: string
}

/** Sisa waktu pembayaran; berubah merah saat < 10 menit dan "Waktu habis" saat lewat. */
export default function Countdown({ deadline, className = '' }: CountdownProps) {
  const { timeLeft, isExpired } = useCountdown(deadline)
  const urgent = !isExpired && timeLeft.startsWith('00:0')

  return (
    <span
      className={`font-mono font-semibold tabular-nums ${isExpired || urgent ? 'text-red-600' : 'text-yellow-700'} ${className}`}
    >
      {isExpired ? 'Waktu habis' : timeLeft}
    </span>
  )
}
