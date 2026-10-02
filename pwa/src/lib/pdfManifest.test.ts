import { describe, it, expect } from 'vitest';
import { pdfManifest } from './pdfManifest';
describe('deployment-selected manifest', () => {
  it.each([undefined, '', 'off', 'invalid'])('keeps GET link sharing when %s', (mode) => {
    const manifest = pdfManifest(mode);
    expect(manifest.share_target.method).toBe('GET');
    expect(manifest.share_target.action).toBe('/capture');
  });
  it.each(['opt-in', 'on', ' ON '])('advertises compatible multipart sharing when %s', (mode) => {
    const manifest = pdfManifest(mode);
    expect(manifest.id).toBe('/');
    expect(manifest.share_target.method).toBe('POST');
    expect(manifest.share_target.action).toBe('/share-target');
    expect(manifest.share_target).toMatchObject({ enctype: 'multipart/form-data', params: { title: 'title', text: 'text', url: 'url', files: [{ name: 'files', accept: ['application/pdf', '.pdf'] }] } });
  });
});
