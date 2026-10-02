import { describe, it, expect } from 'vitest';
import { validatePdfSelection, pdfCaptureForm } from './pdfCapture';

describe('PDF capture transport', () => {
  it('accepts PDF MIME/extension, rejects mixed formats and the byte boundary without parsing content', () => {
    expect(validatePdfSelection(new File(['corrupt'], 'recipe.PDF', { type: 'application/pdf' }))).toBeNull();
    expect(validatePdfSelection(new File(['x'], 'recipe.pdf', { type: 'text/plain' }))).toBe('type');
    expect(validatePdfSelection(new File(['x'], 'recipe.txt', { type: 'application/pdf' }))).toBe('type');
    expect(validatePdfSelection(new File([], 'recipe.pdf', { type: 'application/pdf' }))).toBe('empty');
    expect(validatePdfSelection(new File([new Uint8Array(20971520)], 'recipe.pdf', { type: 'application/pdf' }))).toBeNull();
    expect(validatePdfSelection(new File([new Uint8Array(20971521)], 'recipe.pdf', { type: 'application/pdf' }))).toBe('size');
  });
  it('serializes photo metadata defaults and trimmed notes without a dish image', () => {
    const file = new File(['pdf'], 'recipe.pdf', { type: 'application/pdf' });
    const form = pdfCaptureForm(file, 3, '  less salt  ');
    expect(form.getAll('file')).toEqual([file]);
    expect(form.get('rating')).toBe('3');
    expect(form.get('notes')).toBe('less salt');
    expect(form.has('finishedDishImageIndex')).toBe(false);
    expect(pdfCaptureForm(file, 0, '  ').has('notes')).toBe(false);
    expect(() => pdfCaptureForm(file, 4, '')).toThrow();
  });
});

