import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import type { UpdateProfileInput, ChangePasswordInput } from '../validators/user.validator';

const AVATAR_URL_PREFIX = '/uploads/avatars/';

const removeAvatarFile = (avatarUrl?: string | null): void => {
  if (!avatarUrl || !avatarUrl.startsWith(AVATAR_URL_PREFIX)) return;
  fs.unlink(path.join(process.cwd(), 'uploads', 'avatars', path.basename(avatarUrl)), () => undefined);
};

// password sengaja tidak pernah ikut dikembalikan
const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  avatar: true,
  phoneNumber: true,
  referralCode: true,
  createdAt: true,
} as const;

export const getActivePoints = async (userId: string): Promise<number> => {
  const result = await prisma.point.aggregate({
    where: { userId, isExpired: false, expiredAt: { gt: new Date() } },
    _sum: { amount: true },
  });
  return result._sum.amount ?? 0;
};

export const getProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...publicUserSelect,
      coupons: {
        where: { isUsed: false, expiredAt: { gt: new Date() } },
        orderBy: { expiredAt: 'asc' },
        select: { id: true, code: true, discount: true, discountType: true, expiredAt: true },
      },
    },
  });
  if (!user) throw new AppError('User not found', 404);

  const { coupons, ...rest } = user;
  return { ...rest, totalActivePoints: await getActivePoints(userId), coupons };
};

export const updateProfile = async (
  userId: string,
  data: UpdateProfileInput,
  avatarFile?: Express.Multer.File
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    removeAvatarFile(avatarFile && AVATAR_URL_PREFIX + avatarFile.filename);
    throw new AppError('User not found', 404);
  }

  const newAvatar = avatarFile ? `${AVATAR_URL_PREFIX}${avatarFile.filename}` : undefined;

  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.phoneNumber !== undefined && { phoneNumber: data.phoneNumber }),
        ...(newAvatar && { avatar: newAvatar }),
      },
      select: publicUserSelect,
    });
    if (newAvatar) removeAvatarFile(user.avatar);
    return updated;
  } catch (error) {
    removeAvatarFile(newAvatar);
    throw error;
  }
};

export const changePassword = async (userId: string, data: ChangePasswordInput) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found', 404);

  const valid = await bcrypt.compare(data.currentPassword, user.password);
  if (!valid) throw new AppError('Current password is incorrect', 400);

  await prisma.user.update({
    where: { id: userId },
    data: { password: await bcrypt.hash(data.newPassword, 10) },
  });
};
