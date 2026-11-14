import { create } from 'zustand'

export interface EventFilters {
  search: string
  category: string
  city: string
  minPrice: number | null
  maxPrice: number | null
  startDate: string // YYYY-MM-DD, kosong = tanpa filter
  sort: string
  page: number
}

interface EventStore {
  filters: EventFilters
  setFilters: (filters: Partial<EventFilters>) => void
  resetFilters: () => void
}

export const defaultFilters: EventFilters = {
  search: '',
  category: '',
  city: '',
  minPrice: null,
  maxPrice: null,
  startDate: '',
  sort: 'startDate_asc',
  page: 1,
}

export const useEventStore = create<EventStore>((set) => ({
  filters: defaultFilters,
  // Ubah filter apa pun → kembali ke halaman 1, kecuali page sendiri yang diubah
  setFilters: (filters) =>
    set((s) => ({ filters: { ...s.filters, page: 1, ...filters } })),
  resetFilters: () => set({ filters: defaultFilters }),
}))
