import type { PrismaClient } from '@prisma/client'
import { mockDeep, mockReset, type DeepMockProxy } from 'jest-mock-extended'

export const prismaMock: DeepMockProxy<PrismaClient> = mockDeep<PrismaClient>()

/**
 * Atur ulang semua mock dan buat `$transaction(callback)` menjalankan callback
 * dengan mock yang sama sebagai `tx`, sehingga assertion bisa ditulis langsung pada prismaMock.
 */
export const resetPrismaMock = () => {
  mockReset(prismaMock)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(prismaMock.$transaction as any).mockImplementation(async (arg: unknown) =>
    typeof arg === 'function' ? (arg as (tx: unknown) => unknown)(prismaMock) : Promise.all(arg as unknown[]),
  )
}
