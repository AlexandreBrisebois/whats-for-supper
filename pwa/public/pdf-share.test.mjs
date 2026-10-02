import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

function helper(stage = async () => 'opaque') {
  const context = vm.createContext({ URL, URLSearchParams, Request, Response, File, crypto, Date, console,
    location: { origin: 'https://supper.example' } });
  vm.runInContext(fs.readFileSync(new URL('./pdf-share.js', import.meta.url), 'utf8'), context);
  context.WfsPdfShare.stage = stage;
  return context.WfsPdfShare;
}
function request(file, extra = false) {
  const form = new FormData();
  if (file) form.append('files', file);
  if (extra) form.append('files', new File(['pdf'], 'second.pdf', { type: 'application/pdf' }));
  return new Request('https://supper.example/share-target', { method: 'POST', body: form });
}
test('only exact same-origin share-target POST is handled', () => {
  const share = helper();
  assert.equal(share.matches(request()), true);
  assert.equal(share.matches(new Request('https://elsewhere.example/share-target', { method: 'POST' })), false);
  assert.equal(share.matches(new Request('https://supper.example/api/stream')), false);
  assert.equal(share.matches(new Request('https://supper.example/share-target')), false);
});
test('PDF stage precedes 303 handoff without API upload', async () => {
  let staged;
  const share = helper(async (file) => { staged = file; return 'opaque-token'; });
  const result = await share.handle(request(new File(['bad PDF'], 'supper.pdf', { type: 'application/pdf' })));
  assert.equal(staged.name, 'supper.pdf');
  assert.equal(result.status, 303);
  assert.equal(result.headers.get('Location'), '/capture?share=opaque-token');
});
test('invalid count/type/bytes and staging failure require restart', async () => {
  for (const req of [request(new File(['x'], 'x.txt', { type: 'text/plain' })), request(new File(['x'], 'x.pdf', { type: 'application/pdf' }), true), request(new File([new Uint8Array(20971521)], 'x.pdf', { type: 'application/pdf' }))]) {
    const share = helper(async () => { throw new Error('must not stage'); });
    assert.equal((await share.handle(req)).headers.get('Location'), '/capture?pdfShareError=restart');
  }
  const share = helper(async () => { throw new Error('IndexedDB unavailable'); });
  assert.equal((await share.handle(request(new File(['x'], 'x.pdf', { type: 'application/pdf' })))).headers.get('Location'), '/capture?pdfShareError=restart');
});
test('text-only POST keeps link review', async () => {
  const form = new FormData();
  form.append('text', 'https://recipes.example/supper');
  const result = await helper().handle(new Request('https://supper.example/share-target', { method: 'POST', body: form }));
  assert.equal(result.status, 303);
  assert.equal(new URL(result.headers.get('Location'), 'https://supper.example').searchParams.get('text'), 'https://recipes.example/supper');
});
