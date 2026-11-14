import { create } from 'zustand'
import type { User } from '../types'

interface AuthStore {
  user: User | null
  accessToken: string | null
  setAuth: (user: User, token: string) => void
  setToken: (token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  accessToken: null,
  setAuth: (user, accessToken) => set({ user, accessToken }),
  setToken: (accessToken) => set({ accessToken }),
  logout: () => set({ user: null, accessToken: null }),
}))
