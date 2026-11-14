import type { TransactionStatus } from '../../types'
import { getStatusLabel } from '../../lib/utils'

const STEPS = ['Menunggu Pembayaran', 'Menunggu Konfirmasi', 'Selesai']

/** Tahap mana yang sudah dicapai, dan apakah proses berhenti gagal di tahap tersebut. */
const resolve = (status: TransactionStatus): { reached: number; failed: boolean } => {
  switch (status) {
    case 'WAITING_PAYMENT':
      return { reached: 0, failed: false }
    case 'WAITING_CONFIRMATION':
      return { reached: 1, failed: false }
    case 'DONE':
      return { reached: 2, failed: false }
    case 'EXPIRED': // gagal di tahap pembayaran
      return { reached: 0, failed: true }
    case 'REJECTED': // gagal di tahap konfirmasi
    case 'CANCELED':
      return { reached: 1, failed: true }
  }
}

export default function StatusTimeline({ status }: { status: TransactionStatus }) {
  const { reached, failed } = resolve(status)

  return (
    <ol className="flex items-start" aria-label="Status transaksi">
      {STEPS.map((label, i) => {
        const isFailedStep = failed && i === reached
        const done = i < reached || (i === reached && !failed && status === 'DONE')
        const current = i === reached && !failed && status !== 'DONE'
        const text = isFailedStep ? getStatusLabel(status) : label

        const circle = isFailedStep
          ? 'bg-red-600 text-white'
          : done
            ? 'bg-green-600 text-white'
            : current
              ? 'bg-primary-600 text-white ring-4 ring-primary-100'
              : 'bg-gray-200 text-gray-500'

        return (
          <li key={label} className="relative flex flex-1 flex-col items-center text-center">
            {i > 0 && (
              <span
                aria-hidden="true"
                className={`absolute right-1/2 top-4 -z-0 h-0.5 w-full ${i <= reached && !(failed && i === reached) ? 'bg-green-600' : 'bg-gray-200'}`}
              />
            )}
            <span className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${circle}`}>
              {isFailedStep ? '✕' : done ? '✓' : i + 1}
            </span>
            <span
              className={`mt-2 text-xs font-medium sm:text-sm ${isFailedStep ? 'text-red-600' : done || current ? 'text-gray-900' : 'text-gray-400'}`}
            >
              {text}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
