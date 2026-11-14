import { useState } from 'react'
import type { Category } from '../../types'
import type { EventFilters } from '../../stores/eventStore'
import { POPULAR_CITIES } from '../../lib/eventFilters'
import { formatIDR } from '../../lib/utils'
import Button from '../ui/Button'

interface EventFilterProps {
  filters: EventFilters
  categories: Category[]
  onChange: (patch: Partial<EventFilters>) => void
  onReset: () => void
}

const SLIDER_MAX = 2_000_000
const SLIDER_STEP = 50_000

type PriceMode = 'all' | 'free' | 'paid'

const getPriceMode = (f: EventFilters): PriceMode => {
  if (f.maxPrice === 0) return 'free'
  if (f.minPrice !== null || f.maxPrice !== null) return 'paid'
  return 'all'
}

const sectionTitle = 'mb-2 text-sm font-semibold text-gray-900'
const fieldClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200'

export default function EventFilter({ filters, categories, onChange, onReset }: EventFilterProps) {
  const mode = getPriceMode(filters)
  const committedMax = filters.maxPrice && filters.maxPrice > 0 ? filters.maxPrice : SLIDER_MAX

  // Slider lokal agar halus saat digeser; filter baru diterapkan saat dilepas
  const [sliderValue, setSliderValue] = useState(committedMax)
  const [lastCommitted, setLastCommitted] = useState(committedMax)
  if (committedMax !== lastCommitted) {
    setLastCommitted(committedMax)
    setSliderValue(committedMax)
  }

  const setMode = (next: PriceMode) => {
    if (next === 'all') onChange({ minPrice: null, maxPrice: null })
    if (next === 'free') onChange({ minPrice: 0, maxPrice: 0 })
    if (next === 'paid') onChange({ minPrice: 1, maxPrice: null })
  }

  const commitSlider = () =>
    onChange({ minPrice: 1, maxPrice: sliderValue >= SLIDER_MAX ? null : sliderValue })

  const cities = POPULAR_CITIES.includes(filters.city) || !filters.city
    ? POPULAR_CITIES
    : [filters.city, ...POPULAR_CITIES]

  return (
    <div className="space-y-6">
      {/* Kategori */}
      <fieldset>
        <legend className={sectionTitle}>Kategori</legend>
        <div className="space-y-1.5">
          {[{ id: '', name: 'Semua Kategori' }, ...categories].map((c) => (
            <label key={c.id || 'all'} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="category"
                checked={filters.category.toLowerCase() === (c.id ? c.name.toLowerCase() : '')}
                onChange={() => onChange({ category: c.id ? c.name : '' })}
                className="h-4 w-4 accent-primary-600"
              />
              {c.name}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Kota */}
      <div>
        <label htmlFor="filter-city" className={sectionTitle}>
          Kota
        </label>
        <select
          id="filter-city"
          value={filters.city}
          onChange={(e) => onChange({ city: e.target.value })}
          className={fieldClass}
        >
          <option value="">Semua Kota</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Harga */}
      <div>
        <p className={sectionTitle}>Harga</p>
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-gray-100 p-1" role="group" aria-label="Jenis harga">
          {(
            [
              ['all', 'Semua'],
              ['free', 'Gratis'],
              ['paid', 'Berbayar'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              className={`rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
                mode === value ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === 'paid' && (
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-xs text-gray-500">
              <span>Harga maksimal</span>
              <span className="font-medium text-gray-700">
                {sliderValue >= SLIDER_MAX ? 'Tanpa batas' : formatIDR(sliderValue)}
              </span>
            </div>
            <input
              type="range"
              min={SLIDER_STEP}
              max={SLIDER_MAX}
              step={SLIDER_STEP}
              value={sliderValue}
              aria-label="Harga maksimal"
              onChange={(e) => setSliderValue(Number(e.target.value))}
              onMouseUp={commitSlider}
              onTouchEnd={commitSlider}
              onKeyUp={commitSlider}
              className="w-full accent-primary-600"
            />
          </div>
        )}
      </div>

      {/* Tanggal mulai minimal */}
      <div>
        <label htmlFor="filter-start" className={sectionTitle}>
          Tanggal mulai minimal
        </label>
        <input
          id="filter-start"
          type="date"
          value={filters.startDate}
          onChange={(e) => onChange({ startDate: e.target.value })}
          className={fieldClass}
        />
      </div>

      <Button variant="outline" className="w-full" onClick={onReset}>
        Reset Filter
      </Button>
    </div>
  )
}
