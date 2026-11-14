import { useEffect, useRef, useState } from 'react'
import { useDebounce } from '../../hooks/useDebounce'

interface SearchBarProps {
  /** Nilai search saat ini di store/URL */
  value: string
  /** Dipanggil setelah user berhenti mengetik (debounce) */
  onSearch: (value: string) => void
  delay?: number
  placeholder?: string
}

export default function SearchBar({
  value,
  onSearch,
  delay = 300,
  placeholder = 'Cari event...',
}: SearchBarProps) {
  const [text, setText] = useState(value)
  const debounced = useDebounce(text, delay)

  // Perubahan dari luar (reset filter / URL berubah): samakan input.
  // Perubahan yang berasal dari ketikan sendiri (value === debounced) diabaikan agar tidak menimpa ketikan.
  const [lastValue, setLastValue] = useState(value)
  if (value !== lastValue) {
    setLastValue(value)
    if (value !== debounced) setText(value)
  }

  const prevDebounced = useRef(debounced)
  useEffect(() => {
    if (prevDebounced.current !== debounced) {
      prevDebounced.current = debounced
      onSearch(debounced)
    }
  }, [debounced, onSearch])

  return (
    <div className="relative">
      <svg
        className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />
      </svg>
      <input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        aria-label="Cari event"
        className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm shadow-sm placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
      />
    </div>
  )
}
