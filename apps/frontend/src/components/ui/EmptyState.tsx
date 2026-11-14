import type { ReactNode } from 'react'
import Button from './Button'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  subtitle?: string
  actionLabel?: string
  onAction?: () => void
}

const DefaultIcon = () => (
  <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6m16 0v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4m16 0h-4.5a1 1 0 0 0-.9.55l-.7 1.4a1 1 0 0 1-.9.55h-3a1 1 0 0 1-.9-.55l-.7-1.4a1 1 0 0 0-.9-.55H4" />
  </svg>
)

export default function EmptyState({ icon, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-4 text-gray-300">{icon ?? <DefaultIcon />}</div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {subtitle && <p className="mt-1 max-w-sm text-sm text-gray-500">{subtitle}</p>}
      {actionLabel && onAction && (
        <Button className="mt-6" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
