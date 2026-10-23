import { describe, it, expect } from 'vitest';
import { pdfManifest } from './pdfManifest';
describe('always-on PDF share manifest', () => {
  it('advertises compatible multipart sharing without deployment configuration', () => {
    const manifest = pdfManifest();
    expect(manifest.id).toBe('/');
    expect(manifest.share_target.method).toBe('POST');
    expect(manifest.share_target.action).toBe('/share-target');
    expect(manifest.share_target).toMatchObject({
      enctype: 'multipart/form-data',
      params: {
        title: 'title',
        text: 'text',
        url: 'url',
        files: [{ name: 'files', accept: ['application/pdf', '.pdf'] }],
      },
    });
  });
});
