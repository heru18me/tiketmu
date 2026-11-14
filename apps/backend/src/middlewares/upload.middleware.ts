import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AppError } from '../utils/AppError';

const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const createStorage = (folder: string) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(process.cwd(), 'uploads', folder);
      ensureDir(dir);
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
    },
  });

const imageFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = /jpeg|jpg|png|webp/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) {
    cb(null, true);
  } else {
    cb(new AppError('Only image files are allowed (jpeg, jpg, png, webp)', 400));
  }
};

export const uploadAvatar = multer({
  storage: createStorage('avatars'),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: imageFilter,
});

export const uploadEventImage = multer({
  storage: createStorage('events'),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: imageFilter,
});

export const uploadPaymentProof = multer({
  storage: createStorage('payments'),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: imageFilter,
});
