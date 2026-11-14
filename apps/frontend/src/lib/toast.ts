import { useToastStore } from '../stores/toastStore'

/** Pemakaian: `toast.success('Tersimpan')`. Bisa dipanggil dari mana saja (komponen maupun non-komponen). */
export const toast = {
  success: (message: string) => useToastStore.getState().show('success', message),
  error: (message: string) => useToastStore.getState().show('error', message, 6000),
  info: (message: string) => useToastStore.getState().show('info', message),
}
