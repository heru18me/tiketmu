/* eslint-disable @typescript-eslint/no-explicit-any */
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { prismaMock } from '../__mocks__/prisma'
import * as authService from '../src/services/auth.service'
import * as mailer from '../src/services/mailer.service'
import { AppError } from '../src/utils/AppError'
import { makeUser } from './fixtures'

const registerInput = {
  name: 'Budi',
  email: 'budi@example.com',
  password: 'Password1',
  role: 'CUSTOMER' as const,
}

describe('AuthService.register', () => {
  it('berhasil tanpa referral: password di-hash, token dibuat, tanpa kupon/poin', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)
    prismaMock.user.create.mockImplementation(((args: any) => Promise.resolve(makeUser(args.data))) as any)

    const result = await authService.register(registerInput)

    const created = (prismaMock.user.create.mock.calls[0][0] as any).data
    expect(created.password).not.toBe('Password1')
    expect(await bcrypt.compare('Password1', created.password)).toBe(true)
    expect(created.referralCode).toMatch(/^[A-Z0-9]{8}$/)
    expect(result.accessToken).toEqual(expect.any(String))
    expect(result.refreshToken).toEqual(expect.any(String))
    expect(prismaMock.referral.create).not.toHaveBeenCalled()
    expect(prismaMock.coupon.create).not.toHaveBeenCalled()
    expect(prismaMock.point.create).not.toHaveBeenCalled()
  })

  it('berhasil dengan referral: kupon 10% untuk penerima & 10.000 poin untuk pemberi', async () => {
    const giver = makeUser({ id: 'giver-1', email: 'giver@example.com', referralCode: 'GIVER123' })
    prismaMock.user.findUnique.mockImplementation(((args: any) =>
      Promise.resolve(args.where.referralCode === 'GIVER123' ? giver : null)) as any)
    prismaMock.user.create.mockImplementation(((args: any) =>
      Promise.resolve(makeUser({ ...args.data, id: 'new-1' }))) as any)

    await authService.register({ ...registerInput, referralCode: 'GIVER123' })

    expect(prismaMock.referral.create).toHaveBeenCalledWith({
      data: { giverId: 'giver-1', receiverId: 'new-1' },
    })
    const coupon = (prismaMock.coupon.create.mock.calls[0][0] as any).data
    expect(coupon).toMatchObject({ userId: 'new-1', discount: 10, discountType: 'PERCENTAGE' })
    expect(coupon.code).toMatch(/^REF-/)
    expect(coupon.expiredAt.getTime()).toBeGreaterThan(Date.now() + 80 * 24 * 3600 * 1000) // ~3 bulan

    const point = (prismaMock.point.create.mock.calls[0][0] as any).data
    expect(point).toMatchObject({ userId: 'giver-1', amount: 10000, sourceType: 'REFERRAL' })
  })

  it('gagal (409) jika email sudah terdaftar', async () => {
    prismaMock.user.findUnique.mockResolvedValue(makeUser())

    await expect(authService.register(registerInput)).rejects.toMatchObject({ statusCode: 409 })
    expect(prismaMock.user.create).not.toHaveBeenCalled()
  })

  it('gagal (400) jika kode referral tidak valid', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)

    await expect(authService.register({ ...registerInput, referralCode: 'NOPE' })).rejects.toMatchObject({
      statusCode: 400,
    })
    expect(prismaMock.user.create).not.toHaveBeenCalled()
  })
})

describe('AuthService.login', () => {
  let hashed: string
  beforeAll(async () => {
    hashed = await bcrypt.hash('Password1', 4)
  })

  it('berhasil dengan kredensial benar', async () => {
    prismaMock.user.findUnique.mockResolvedValue(makeUser({ password: hashed }))

    const result = await authService.login({ email: 'budi@example.com', password: 'Password1' })

    expect(result.user.id).toBe('user-1')
    const decoded = jwt.verify(result.accessToken, process.env.JWT_ACCESS_SECRET!) as any
    expect(decoded).toMatchObject({ userId: 'user-1', email: 'budi@example.com', role: 'CUSTOMER' })
  })

  it('gagal (401) jika email tidak ada', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)

    await expect(authService.login({ email: 'x@example.com', password: 'Password1' })).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('gagal (401) jika password salah', async () => {
    prismaMock.user.findUnique.mockResolvedValue(makeUser({ password: hashed }))

    const err = await authService.login({ email: 'budi@example.com', password: 'Salah123' }).catch((e) => e)
    expect(err).toBeInstanceOf(AppError)
    expect(err.statusCode).toBe(401)
  })
})

describe('AuthService reset password', () => {
  it('email tidak terdaftar: diam-diam tidak mengirim email', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)

    await expect(authService.requestPasswordReset('x@example.com')).resolves.toBeUndefined()
    expect(mailer.sendPasswordResetEmail).not.toHaveBeenCalled()
  })

  it('token dari email bisa dipakai sekali untuk mengganti password', async () => {
    const user = makeUser({ password: 'old-hash' })
    prismaMock.user.findUnique.mockResolvedValue(user)
    prismaMock.user.updateMany.mockResolvedValue({ count: 1 })

    await authService.requestPasswordReset(user.email)
    const link = (mailer.sendPasswordResetEmail as jest.Mock).mock.calls[0][2] as string
    const token = new URL(link).searchParams.get('token')!

    await authService.resetPassword(token, 'NewPass123')

    const call = prismaMock.user.updateMany.mock.calls[0][0] as any
    expect(call.where).toEqual({ id: 'user-1', password: 'old-hash' })
    expect(await bcrypt.compare('NewPass123', call.data.password)).toBe(true)

    // Setelah password berubah, hash lama tak cocok lagi → token yang sama ditolak
    prismaMock.user.findUnique.mockResolvedValue({ ...user, password: call.data.password })
    await expect(authService.resetPassword(token, 'Another123')).rejects.toMatchObject({ statusCode: 400 })
  })
})
