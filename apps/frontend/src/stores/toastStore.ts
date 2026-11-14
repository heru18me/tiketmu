import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  type: ToastType
  message: string
}

interface ToastStore {
  toasts: Toast[]
  show: (type: ToastType, message: string, durationMs?: number) => void
  dismiss: (id: number) => void
}

const MAX_VISIBLE = 4
let nextId = 1

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  show: (type, message, durationMs = 4000) => {
    const id = nextId++
    // Batasi jumlah toast agar layar tidak penuh; yang paling lama dibuang
    set((s) => ({ toasts: [...s.toasts, { id, type, message }].slice(-MAX_VISIBLE) }))
    setTimeout(() => get().dismiss(id), durationMs)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
