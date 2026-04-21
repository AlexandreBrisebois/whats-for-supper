export const CONFIG = {
  ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT ?? 'development',
  MAX_IMAGE_SIZE_BYTES: 20_000_000,
  MAX_IMAGES_PER_RECIPE: 10,
  SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
} as const;

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/backend';
export const API_INTERNAL_URL = process.env.API_INTERNAL_URL ?? 'http://api:9001';
