import { defaultFilters, type EventFilters } from '../stores/eventStore'

export const SORT_OPTIONS = [
  { value: 'createdAt_desc', label: 'Terbaru' },
  { value: 'startDate_asc', label: 'Terdekat' },
  { value: 'price_asc', label: 'Harga Terendah' },
  { value: 'price_desc', label: 'Harga Tertinggi' },
] as const

export const POPULAR_CITIES = [
  'Jakarta',
  'Bandung',
  'Surabaya',
  'Yogyakarta',
  'Semarang',
  'Malang',
  'Medan',
  'Makassar',
  'Denpasar',
]

const toNumber = (v: string | null): number | null => {
  if (v === null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null
}

/** URL query → filter (nilai tak valid jatuh ke default). */
export const parseFilters = (sp: URLSearchParams): EventFilters => {
  const sort = sp.get('sort')
  const page = toNumber(sp.get('page'))
  const startDate = sp.get('startDate') ?? ''
  return {
    search: sp.get('search') ?? '',
    category: sp.get('category') ?? '',
    city: sp.get('city') ?? '',
    minPrice: toNumber(sp.get('minPrice')),
    maxPrice: toNumber(sp.get('maxPrice')),
    startDate: /^\d{4}-\d{2}-\d{2}$/.test(startDate) ? startDate : '',
    sort: SORT_OPTIONS.some((o) => o.value === sort) ? (sort as string) : defaultFilters.sort,
    page: page && page > 0 ? page : 1,
  }
}

/** Filter → URL query. Nilai default tidak ditulis agar URL tetap bersih. */
export const serializeFilters = (f: EventFilters): URLSearchParams => {
  const sp = new URLSearchParams()
  if (f.search) sp.set('search', f.search)
  if (f.category) sp.set('category', f.category)
  if (f.city) sp.set('city', f.city)
  if (f.minPrice !== null) sp.set('minPrice', String(f.minPrice))
  if (f.maxPrice !== null) sp.set('maxPrice', String(f.maxPrice))
  if (f.startDate) sp.set('startDate', f.startDate)
  if (f.sort !== defaultFilters.sort) sp.set('sort', f.sort)
  if (f.page > 1) sp.set('page', String(f.page))
  return sp
}

/** Filter → query params untuk GET /events. */
export const toApiParams = (f: EventFilters, limit: number) => ({
  page: f.page,
  limit,
  sort: f.sort,
  ...(f.search && { search: f.search }),
  ...(f.category && { category: f.category }),
  ...(f.city && { city: f.city }),
  ...(f.minPrice !== null && { minPrice: f.minPrice }),
  ...(f.maxPrice !== null && { maxPrice: f.maxPrice }),
  ...(f.startDate && { startDate: f.startDate }),
})

/** Jumlah filter aktif (selain search & sort), untuk badge tombol filter mobile. */
export const countActiveFilters = (f: EventFilters): number =>
  [f.category, f.city, f.startDate].filter(Boolean).length +
  (f.minPrice !== null || f.maxPrice !== null ? 1 : 0)
