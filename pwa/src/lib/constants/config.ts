export const CONFIG = {
  ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT ?? 'development',
  MAX_IMAGE_SIZE_BYTES: 20_000_000,
  MAX_IMAGES_PER_RECIPE: 10,
  SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
} as const;
