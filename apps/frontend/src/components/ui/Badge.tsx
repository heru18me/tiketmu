import type { ReactNode } from 'react'
import type { TransactionStatus } from '../../types'
import { getStatusBadgeColor } from '../../lib/utils'

type BadgeVariant = TransactionStatus | 'default' | 'organizer'

interface BadgeProps {
  children: ReactNode
  /** Status transaksi dipetakan ke warna; 'organizer' = ungu; default = abu-abu */
  variant?: BadgeVariant
  className?: string
}

export default function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const color =
    variant === 'organizer'
      ? 'bg-secondary-100 text-secondary-700'
      : variant === 'default'
        ? 'bg-gray-100 text-gray-800'
        : getStatusBadgeColor(variant)

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color} ${className}`}
    >
      {children}
    </span>
  )
}
