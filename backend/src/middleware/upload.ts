import multer from 'multer';
import { config, maxImageSizeMb } from '../config.js';
import { HttpError } from '../errors.js';

/**
 * Image upload handling.
 *
 * Files are kept in memory because we only need them for the lifetime of a
 * single request: they are base64-encoded and forwarded to Groq, never written
 * to disk. Size and MIME type are enforced here, before any buffer is built.
 */

export const ALLOWED_IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.limits.maxImageSizeBytes,
    files: 1,
    fields: 10,
    fieldSize: 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    if (!(ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
      callback(
        new HttpError(
          415,
          `Unsupported file type "${file.mimetype || 'unknown'}". Allowed types: PNG, JPEG, WebP.`,
        ),
      );
      return;
    }
    callback(null, true);
  },
}).single('image');

export const imageLimitHint = `Maximum image size is ${maxImageSizeMb} MB.`;
