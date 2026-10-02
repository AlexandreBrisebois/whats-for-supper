import base from './baseManifest.json';

export function pdfManifest(mode: string | undefined) {
  const normalized = mode?.trim().toLowerCase();
  const enabled = normalized === 'opt-in' || normalized === 'on';
  return {
    ...base,
    share_target: enabled ? {
      action: '/share-target', method: 'POST', enctype: 'multipart/form-data',
      params: { title: 'title', text: 'text', url: 'url', files: [{ name: 'files', accept: ['application/pdf', '.pdf'] }] },
    } : base.share_target,
  };
}
