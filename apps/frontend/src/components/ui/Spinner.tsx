interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = { sm: 'h-4 w-4 border-2', md: 'h-8 w-8 border-[3px]', lg: 'h-12 w-12 border-4' }

export default function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Memuat"
      className={`inline-block animate-spin rounded-full border-current border-t-transparent text-primary-600 ${sizes[size]} ${className}`}
    />
  )
}
