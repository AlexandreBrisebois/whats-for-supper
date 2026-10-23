import base from './baseManifest.json';

export function pdfManifest() {
  return {
    ...base,
    share_target: {
      action: '/share-target',
      method: 'POST',
      enctype: 'multipart/form-data',
      params: {
        title: 'title',
        text: 'text',
        url: 'url',
        files: [{ name: 'files', accept: ['application/pdf', '.pdf'] }],
      },
    },
  };
}
