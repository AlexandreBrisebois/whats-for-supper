export const PDF_MAX_BYTES = 20 * 1024 * 1024;

export function validatePdfSelection(file: File): 'type' | 'size' | 'empty' | null {
  if (!file.name.toLowerCase().endsWith('.pdf') || file.type.toLowerCase() !== 'application/pdf')
    return 'type';
  if (file.size > PDF_MAX_BYTES) return 'size';
  if (file.size === 0) return 'empty';
  return null;
}

export function pdfCaptureForm(file: File, rating: number, notes: string): FormData {
  if (!Number.isInteger(rating) || rating < 0 || rating > 3) throw new Error('Invalid rating.');
  const form = new FormData();
  form.append('file', file);
  form.append('rating', String(rating));
  if (notes.trim()) form.append('notes', notes.trim());
  return form;
}
