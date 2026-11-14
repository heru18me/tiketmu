import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { customAlphabet } from 'nanoid';
import { addMonths } from 'date-fns';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { sendPasswordResetEmail } from './mailer.service';
import { RegisterInput, LoginInput } from '../validators/auth.validator';

const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 8);

export const generateTokens = (userId: string, email: string, role: string) => {
  const accessToken = jwt.sign(
    { userId, email, role },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES as jwt.SignOptions['expiresIn'] }
  );
  const refreshToken = jwt.sign(
    { userId, email, role },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES as jwt.SignOptions['expiresIn'] }
  );
  return { accessToken, refreshToken };
};

export const register = async (data: RegisterInput) => {
  // Cek email sudah ada
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new AppError('Email already registered', 409);

  const hashedPassword = await bcrypt.hash(data.password, 10);
  const referralCode = nanoid();
  const now = new Date();
  const threeMonthsLater = addMonths(now, 3);

  let user;

  if (data.referralCode) {
    // Cari giver berdasarkan referralCode
    const giver = await prisma.user.findUnique({
      where: { referralCode: data.referralCode },
    });
    if (!giver) throw new AppError('Invalid referral code', 400);

    // Buat semua dalam transaction
    user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          password: hashedPassword,
          role: data.role,
          referralCode,
        },
      });

      // Buat referral record
      await tx.referral.create({
        data: { giverId: giver.id, receiverId: newUser.id },
      });

      // Coupon 10% untuk receiver (3 bulan)
      await tx.coupon.create({
        data: {
          userId: newUser.id,
          code: `REF-${nanoid()}`,
          discount: 10,
          discountType: 'PERCENTAGE',
          expiredAt: threeMonthsLater,
        },
      });

      // 10.000 points untuk giver (3 bulan)
      await tx.point.create({
        data: {
          userId: giver.id,
          amount: 10000,
          expiredAt: threeMonthsLater,
          sourceType: 'REFERRAL',
        },
      });

      return newUser;
    });
  } else {
    user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: data.role,
        referralCode,
      },
    });
  }

  const tokens = generateTokens(user.id, user.email, user.role);
  return { user, ...tokens };
};

export const login = async (data: LoginInput) => {
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) throw new AppError('Invalid email or password', 401);

  const isValid = await bcrypt.compare(data.password, user.password);
  if (!isValid) throw new AppError('Invalid email or password', 401);

  const tokens = generateTokens(user.id, user.email, user.role);
  return { user, ...tokens };
};

export const refreshAccessToken = (refreshToken: string) => {
  try {
    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as {
      userId: string;
      email: string;
      role: string;
    };
    const accessToken = jwt.sign(
      { userId: decoded.userId, email: decoded.email, role: decoded.role },
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRES as jwt.SignOptions['expiresIn'] }
    );
    return accessToken;
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }
};

// ---------------------------------------------------------------------------
// Reset password (stateless, tanpa tabel baru)
//
// Token = JWT 15 menit yang berisi userId. Dua hal menjaga keamanannya:
// 1. Secret penandatangan DIBEDAKAN dari access/refresh token dan DIGABUNG dengan hash
//    password user saat ini. Efeknya: token reset tidak bisa dipakai sebagai access token,
//    dan otomatis tidak berlaku lagi begitu password berubah (sekali pakai).
// 2. Klaim `aud` khusus agar token jenis lain tidak lolos verifikasi di sini.
// ---------------------------------------------------------------------------
const RESET_TOKEN_EXPIRES = '15m';
const RESET_AUDIENCE = 'password-reset';

const resetSecret = (passwordHash: string) =>
  `${env.JWT_REFRESH_SECRET}:${RESET_AUDIENCE}:${passwordHash}`;

export const requestPasswordReset = async (email: string): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { email } });
  // Email tidak terdaftar: diam saja. Controller tetap membalas sukses (anti user-enumeration).
  if (!user) return;

  const token = jwt.sign({ userId: user.id }, resetSecret(user.password), {
    expiresIn: RESET_TOKEN_EXPIRES,
    audience: RESET_AUDIENCE,
    algorithm: 'HS256',
  });
  const resetLink = `${env.FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`;

  // Tidak di-await: waktu respons tidak boleh membedakan email terdaftar vs tidak.
  // mailer sudah menelan & mencatat error-nya sendiri.
  void sendPasswordResetEmail(user.email, user.name, resetLink);
};

export const resetPassword = async (token: string, newPassword: string): Promise<void> => {
  const invalid = () => new AppError('Invalid or expired reset token', 400);

  // Ambil userId dulu (belum terverifikasi) hanya untuk mencari secret milik user tersebut
  const unverified = jwt.decode(token);
  if (!unverified || typeof unverified === 'string' || typeof unverified.userId !== 'string') {
    throw invalid();
  }

  const user = await prisma.user.findUnique({ where: { id: unverified.userId } });
  if (!user) throw invalid();

  try {
    jwt.verify(token, resetSecret(user.password), {
      audience: RESET_AUDIENCE,
      algorithms: ['HS256'],
    });
  } catch {
    throw invalid();
  }

  const hashed = await bcrypt.hash(newPassword, 10);

  // Cocokkan juga hash lama: jika dua request memakai token yang sama bersamaan, hanya satu yang menang
  const updated = await prisma.user.updateMany({
    where: { id: user.id, password: user.password },
    data: { password: hashed },
  });
  if (updated.count === 0) throw invalid();
};
