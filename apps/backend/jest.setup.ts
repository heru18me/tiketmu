// Env harus terisi SEBELUM modul aplikasi diimpor (src/config/env.ts memanggil process.exit jika kosong)
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.JWT_ACCESS_SECRET = 'test-access-secret'
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret'
process.env.JWT_ACCESS_EXPIRES = '1h'
process.env.JWT_REFRESH_EXPIRES = '7d'
process.env.SMTP_HOST = 'localhost'
process.env.SMTP_PORT = '587'
process.env.SMTP_USER = 'test@example.com'
process.env.SMTP_PASS = 'test'
process.env.BASE_URL = 'http://localhost:5001'
process.env.FRONTEND_URL = 'http://localhost:3000'

import { resetPrismaMock } from './__mocks__/prisma'

// Semua service memakai prismaMock, bukan database sungguhan
jest.mock('./src/lib/prisma', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  prisma: require('./__mocks__/prisma').prismaMock,
}))

// Jangan pernah mengirim email sungguhan dari test
jest.mock('./src/services/mailer.service')

beforeEach(() => {
  resetPrismaMock()
})
