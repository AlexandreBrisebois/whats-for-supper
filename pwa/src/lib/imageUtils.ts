const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const MAX_IMAGE_COUNT = 20;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function getMimeType(file: File): string {
  return file.type;
}

export function validateImage(file: File): ValidationResult {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `"${file.name}" is not a supported image type. Please use JPEG, PNG, or WebP.`,
    };
  }
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `"${file.name}" is ${sizeMB} MB — images must be under 20 MB.`,
    };
  }
  return { valid: true };
}

export function validateImageCount(count: number): ValidationResult {
  if (count < 1) {
    return { valid: false, error: 'Add at least one photo to continue.' };
  }
  if (count > MAX_IMAGE_COUNT) {
    return { valid: false, error: `You can add up to ${MAX_IMAGE_COUNT} photos per recipe.` };
  }
  return { valid: true };
}
